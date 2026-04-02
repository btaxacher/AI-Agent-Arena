import { describe, it, expect } from "vitest"
import { executeInSandbox, TimeoutError, MemoryLimitError } from "../sandbox.js"

describe("executeInSandbox", () => {
  it("executes simple agent and returns result", async () => {
    const code = 'function move(state) { return "up"; }'
    const result = await executeInSandbox(code, {}, { timeoutMs: 1000 })

    expect(result.result).toBe("up")
  })

  it("reads gameState correctly and returns derived value", async () => {
    const code =
      'function move(state) { return state.x > 5 ? "left" : "right"; }'
    const result = await executeInSandbox(
      code,
      { x: 10 },
      { timeoutMs: 1000 }
    )

    expect(result.result).toBe("left")
  })

  it("terminates infinite loop by timeout", async () => {
    const code = 'function move(state) { while(true) {} return "up"; }'

    await expect(
      executeInSandbox(code, {}, { timeoutMs: 100 })
    ).rejects.toThrow(TimeoutError)
  }, 5000)

  it("terminates excessive memory allocation", async () => {
    const code =
      'function move(state) { const a = []; while(true) a.push(new Array(1000000)); return "up"; }'

    await expect(
      executeInSandbox(code, {}, { timeoutMs: 5000, memoryLimitMb: 8 })
    ).rejects.toThrow()
  }, 10000)

  it("agent cannot access Node.js globals (process)", async () => {
    const code = "function move(state) { return typeof process; }"
    const result = await executeInSandbox(code, {}, { timeoutMs: 1000 })

    expect(result.result).toBe("undefined")
  })

  it("agent cannot access require", async () => {
    const code = "function move(state) { return typeof require; }"
    const result = await executeInSandbox(code, {}, { timeoutMs: 1000 })

    expect(result.result).toBe("undefined")
  })

  it("agent cannot access console", async () => {
    const code = "function move(state) { return typeof console; }"
    const result = await executeInSandbox(code, {}, { timeoutMs: 1000 })

    expect(result.result).toBe("undefined")
  })

  it("returns cpuTime and wallTime metrics", async () => {
    const code = 'function move(state) { return "up"; }'
    const result = await executeInSandbox(code, {}, { timeoutMs: 1000 })

    expect(typeof result.cpuTimeNs).toBe("bigint")
    expect(typeof result.wallTimeNs).toBe("bigint")
    expect(result.cpuTimeNs).toBeGreaterThanOrEqual(0n)
    expect(result.wallTimeNs).toBeGreaterThanOrEqual(0n)
  })
})
