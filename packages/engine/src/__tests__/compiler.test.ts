import { describe, it, expect } from "vitest"
import { compileTypeScript } from "../compiler.js"

describe("compileTypeScript", () => {
  it("compiles valid TypeScript to JavaScript", async () => {
    const ts = "const x: number = 1; export function move() { return x; }"
    const js = await compileTypeScript(ts)

    expect(typeof js).toBe("string")
    expect(js.length).toBeGreaterThan(0)
    // Should not contain TypeScript type annotations
    expect(js).not.toContain(": number")
  })

  it("throws on invalid TypeScript", async () => {
    await expect(
      compileTypeScript("invalid {{{{ typescript")
    ).rejects.toThrow("compilation failed")
  })
})
