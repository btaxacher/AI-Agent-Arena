import ivm from "isolated-vm"

export interface SandboxOptions {
  memoryLimitMb: number
  timeoutMs: number
}

export interface SandboxResult {
  result: unknown
  cpuTimeNs: bigint
  wallTimeNs: bigint
}

export class TimeoutError extends Error {
  constructor(message = "Agent execution timed out") {
    super(message)
    this.name = "TimeoutError"
  }
}

export class MemoryLimitError extends Error {
  constructor(message = "Agent exceeded memory limit") {
    super(message)
    this.name = "MemoryLimitError"
  }
}

const DEFAULT_OPTIONS: SandboxOptions = {
  memoryLimitMb: 64,
  timeoutMs: 1000,
}

export async function executeInSandbox(
  compiledJs: string,
  gameState: unknown,
  options: Partial<SandboxOptions> = {}
): Promise<SandboxResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const isolate = new ivm.Isolate({ memoryLimit: opts.memoryLimitMb })

  try {
    const context = await isolate.createContext()
    const jail = context.global

    // Remove any default globals that should not be accessible
    const cleanupScript = await isolate.compileScript(`
      delete globalThis.console;
      delete globalThis.setTimeout;
      delete globalThis.setInterval;
      delete globalThis.clearTimeout;
      delete globalThis.clearInterval;
    `)
    await cleanupScript.run(context, { timeout: opts.timeoutMs })

    // Inject gameState as a frozen copy -- no Node.js globals exposed
    await jail.set(
      "__gameState__",
      new ivm.ExternalCopy(gameState).copyInto()
    )

    // Strip ESM exports from esbuild output for isolated-vm compatibility.
    // esbuild produces `export { move }` -- isolated-vm needs plain scripts.
    const scriptCode = compiledJs
      .replace(/^export\s*\{[^}]*\};?\s*$/gm, "")
      .replace(/export\s+(function|const|let|var|class)\s+/g, "$1 ")

    const script = await isolate.compileScript(scriptCode)
    await script.run(context, { timeout: opts.timeoutMs })

    // Call the move function with gameState
    const callScript = await isolate.compileScript(
      "typeof move === 'function' ? move(__gameState__) : undefined"
    )
    const result = await callScript.run(context, { timeout: opts.timeoutMs })

    const cpuTimeNs = isolate.cpuTime
    const wallTimeNs = isolate.wallTime

    return {
      result: result !== undefined ? result : null,
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
  } finally {
    isolate.dispose()
  }
}
