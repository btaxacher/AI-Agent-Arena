import * as esbuild from "esbuild"

export async function compileAgentCode(tsCode: string): Promise<string> {
  try {
    const result = await esbuild.build({
      stdin: {
        contents: tsCode,
        loader: "ts",
      },
      bundle: true,
      write: false,
      format: "esm",
      target: "es2022",
      platform: "neutral",
    })

    if (result.outputFiles.length === 0) {
      throw new Error("Compilation produced no output")
    }

    return result.outputFiles[0].text
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Agent compilation failed: ${error.message}`)
    }
    throw new Error("Agent compilation failed: unknown error")
  }
}
