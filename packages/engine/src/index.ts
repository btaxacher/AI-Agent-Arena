export { compileTypeScript } from "./compiler.js"
export {
  executeInSandbox,
  TimeoutError,
  MemoryLimitError,
  type SandboxOptions,
  type SandboxResult,
} from "./sandbox.js"

export { MatchSandbox } from "./match-sandbox.js"

export const ENGINE_VERSION = "0.1.0"

export { createSnakeEngine } from "./disciplines/snake/engine.js"
export type {
  SnakeGameConfig,
  SnakeFrame,
  SnakeEngine,
} from "./disciplines/snake/types.js"
export { DEFAULT_SNAKE_CONFIG } from "./disciplines/snake/rules.js"
