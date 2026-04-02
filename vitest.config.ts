import { defineConfig } from "vitest/config"
import { loadEnv } from "vite"

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.ts"],
    fileParallelism: false,
    env: loadEnv("test", process.cwd(), ""),
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts", "apps/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.d.ts"],
    },
  },
})
