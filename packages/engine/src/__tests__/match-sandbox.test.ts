import { describe, it, expect } from "vitest"
import { MatchSandbox } from "../match-sandbox.js"

const SIMPLE_AGENT = `
function move(state) {
  return { direction: "up" }
}
`

describe("MatchSandbox", () => {
  it("compiles agent once and executes move() multiple times with different state", async () => {
    const sandbox = new MatchSandbox(SIMPLE_AGENT, {
      memoryLimitMb: 64,
      timeoutMs: 1000,
    })

    try {
      await sandbox.init()

      const result1 = await sandbox.callMove({ tick: 0, food: { x: 5, y: 5 } })
      expect(result1.result).toEqual({ direction: "up" })

      const result2 = await sandbox.callMove({ tick: 1, food: { x: 3, y: 3 } })
      expect(result2.result).toEqual({ direction: "up" })

      const result3 = await sandbox.callMove({ tick: 2, food: { x: 1, y: 1 } })
      expect(result3.result).toEqual({ direction: "up" })
    } finally {
      sandbox.dispose()
    }
  })

  it("dispose() cleans up isolate without error", async () => {
    const sandbox = new MatchSandbox(SIMPLE_AGENT, {
      memoryLimitMb: 64,
      timeoutMs: 1000,
    })

    await sandbox.init()
    expect(() => sandbox.dispose()).not.toThrow()
  })

  it("returns SandboxResult with cpuTimeNs for each call", async () => {
    const sandbox = new MatchSandbox(SIMPLE_AGENT, {
      memoryLimitMb: 64,
      timeoutMs: 1000,
    })

    try {
      await sandbox.init()

      const result = await sandbox.callMove({ tick: 0 })
      expect(result).toHaveProperty("cpuTimeNs")
      expect(result).toHaveProperty("wallTimeNs")
      expect(typeof result.cpuTimeNs).toBe("bigint")
      expect(typeof result.wallTimeNs).toBe("bigint")
    } finally {
      sandbox.dispose()
    }
  })
})
