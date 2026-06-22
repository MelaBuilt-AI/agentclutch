# AgentClutch Build Instructions

AgentClutch.md is the authoritative design specification.

Build AgentClutch as a TypeScript pnpm monorepo.

Core principles:
- Loop-native internally, prompt-compatible at the SDK edge.
- Do not build a generic agent frontend or agent runtime.
- Own the consequential-action UX layer: Action Proposal -> Action Card -> Clutch Decision -> Resume Context -> Run Story.
- Support prompt_guard, tool_wrapper, and loop_native adoption paths.
- Keep MVP small, local-first, testable, and open-source friendly.

Before coding each task:
1. Read the relevant section of AgentClutch.md.
2. State the exact files you will create or modify.
3. Implement the smallest passing slice.
4. Add tests where applicable.
5. Run typecheck/tests before stopping.
