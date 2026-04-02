import { describe, it, expect } from "vitest"
import { runMatch } from "../services/match-runner.js"
import { compileTypeScript } from "@repo/engine"
import { SNAKE_STARTER_AGENT_SOURCE } from "@repo/shared"

// Append export so esbuild preserves the move function (matches real user upload flow)
const STARTER_WITH_EXPORT = SNAKE_STARTER_AGENT_SOURCE + "\nexport { move }"

const CRASHING_AGENT_SOURCE = `
function move(state: unknown) {
  throw new Error("Agent crash!")
}
export { move }
`

describe("runMatch", () => {
  it("executes a full Snake game with starter agent and returns MatchResult", async () => {
    const compiled = await compileTypeScript(STARTER_WITH_EXPORT)

    const result = await runMatch(compiled, {
      gridWidth: 10,
      gridHeight: 10,
      maxTicks: 50,
      initialLength: 3,
      seed: "test-match-1",
      tickRate: 5,
    })

    expect(result).toBeTruthy()
    expect(result.matchId).toBeTruthy()
    expect(result.frames).toBeInstanceOf(Array)
    expect(result.frames.length).toBeGreaterThan(0)
    expect(result.finalScore).toBeGreaterThanOrEqual(0)
    expect(result.ticksPlayed).toBeGreaterThan(0)
    expect(result.terminationReason).toBeTruthy()
  }, 30000)

  it("MatchResult contains frames array with tick count matching engine ticks", async () => {
    const compiled = await compileTypeScript(STARTER_WITH_EXPORT)

    const result = await runMatch(compiled, {
      gridWidth: 10,
      gridHeight: 10,
      maxTicks: 20,
      initialLength: 3,
      seed: "test-match-2",
      tickRate: 5,
    })

    expect(result.frames.length).toBe(result.ticksPlayed)

    // Verify frames have sequential ticks
    for (let i = 0; i < result.frames.length; i++) {
      expect(result.frames[i].tick).toBe(i + 1)
    }
  }, 30000)

  it("MatchResult has finalScore, ticksPlayed, terminationReason", async () => {
    const compiled = await compileTypeScript(STARTER_WITH_EXPORT)

    const result = await runMatch(compiled, {
      gridWidth: 10,
      gridHeight: 10,
      maxTicks: 30,
      initialLength: 3,
      seed: "test-match-3",
      tickRate: 5,
    })

    expect(typeof result.finalScore).toBe("number")
    expect(typeof result.ticksPlayed).toBe("number")
    expect(["completed", "death", "timeout", "crash"]).toContain(
      result.terminationReason
    )
  }, 30000)

  it("match with crashing agent terminates with reason 'crash'", async () => {
    const compiled = await compileTypeScript(CRASHING_AGENT_SOURCE)

    const result = await runMatch(compiled, {
      gridWidth: 10,
      gridHeight: 10,
      maxTicks: 100,
      initialLength: 3,
      seed: "test-crash",
      tickRate: 5,
    })

    expect(result.terminationReason).toBe("crash")
    expect(result.ticksPlayed).toBe(0)
    expect(result.frames.length).toBe(0)
  }, 30000)
})
