import * as esbuild from "esbuild"

export async function compileTypeScript(tsCode: string): Promise<string> {
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
      throw new Error(`TypeScript compilation failed: ${error.message}`)
    }
    throw new Error("TypeScript compilation failed: unknown error")
  }
}
