import ivm from "isolated-vm"
import type { SandboxOptions, SandboxResult } from "./sandbox.js"
import { TimeoutError, MemoryLimitError } from "./sandbox.js"

/**
 * MatchSandbox creates a single isolated-vm isolate and reuses it across
 * multiple tick calls. This avoids the overhead of creating a new isolate
 * per tick (critical for performance in matches with 500+ ticks).
 */
export class MatchSandbox {
  private readonly code: string
  private readonly options: SandboxOptions
  private isolate: ivm.Isolate | null = null
  private context: ivm.Context | null = null
  private initialized = false

  constructor(compiledJs: string, options: SandboxOptions) {
    // Strip ESM exports from esbuild output for isolated-vm compatibility
    this.code = compiledJs
      .replace(/^export\s*\{[^}]*\};?\s*$/gm, "")
      .replace(/export\s+(function|const|let|var|class)\s+/g, "$1 ")
    this.options = options
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    this.isolate = new ivm.Isolate({ memoryLimit: this.options.memoryLimitMb })
    this.context = await this.isolate.createContext()

    // Clean globals -- no console, timers, etc.
    const cleanupScript = await this.isolate.compileScript(`
      delete globalThis.console;
      delete globalThis.setTimeout;
      delete globalThis.setInterval;
      delete globalThis.clearTimeout;
      delete globalThis.clearInterval;
    `)
    await cleanupScript.run(this.context, { timeout: this.options.timeoutMs })

    // Compile and run the agent script once (defines the move function)
    const agentScript = await this.isolate.compileScript(this.code)
    await agentScript.run(this.context, { timeout: this.options.timeoutMs })

    this.initialized = true
  }

  async callMove(state: unknown): Promise<SandboxResult> {
    if (!this.isolate || !this.context) {
      throw new Error("MatchSandbox not initialized. Call init() first.")
    }

    try {
      const jail = this.context.global

      // Inject the game state as a frozen copy
      await jail.set(
        "__gameState__",
        new ivm.ExternalCopy(state).copyInto()
      )

      // Call the move function and serialize result inside isolate
      // (isolated-vm can't transfer complex objects, only primitives and strings)
      const callScript = await this.isolate.compileScript(
        "typeof move === 'function' ? JSON.stringify(move(__gameState__)) : undefined"
      )
      const jsonResult = await callScript.run(this.context, {
        timeout: this.options.timeoutMs,
      })

      const cpuTimeNs = this.isolate.cpuTime
      const wallTimeNs = this.isolate.wallTime

      const result =
        typeof jsonResult === "string" ? JSON.parse(jsonResult) : null

      return {
        result,
        cpuTimeNs,
        wallTimeNs,
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        const message = error.message.toLowerCase()
        if (
          message.includes("script execution timed out") ||
          message.includes("timeout")
        ) {
          throw new TimeoutError()
        }
        if (
          message.includes("memory") ||
          message.includes("allocation failed") ||
          message.includes("isolate was disposed")
        ) {
          throw new MemoryLimitError()
        }
        throw error
      }
      throw new Error(`Sandbox execution failed: ${String(error)}`)
    }
  }

  dispose(): void {
    if (this.isolate) {
      this.isolate.dispose()
      this.isolate = null
      this.context = null
      this.initialized = false
    }
  }
}
