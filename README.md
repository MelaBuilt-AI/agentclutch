# AgentClutch

AgentClutch is the open Action Card and takeover UX for consequential AI agent actions.

This repository is currently at Task 1: TypeScript pnpm monorepo scaffold only. The package and app entrypoints are intentionally empty so later tasks can add product logic in small, testable slices.

## Packages

- `@agentclutch/loop`
- `@agentclutch/action-card`
- `@agentclutch/core`
- `@agentclutch/recorder`
- `@agentclutch/playwright`
- `@agentclutch/react`
- `@agentclutch/cli`

## Apps

- `apps/browser-demo`
- `apps/action-card-viewer`

## Examples

- `examples/prompt-guard-send-email`
- `examples/tool-wrapper-file-delete`
- `examples/loop-native-checkout`

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

`AgentClutch.md` is the authoritative design specification.
