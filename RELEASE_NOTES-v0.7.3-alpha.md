# AgentClutch v0.7.3-alpha.1 Release Notes

> Public prerelease notes for the AgentClutch GitHub + npm alpha line.

## Summary

AgentClutch is an open, local-first Action Card and takeover UX layer for consequential AI agent actions. It pauses proposed side effects before execution, shows a structured Action Card, records the human decision, and returns resume context to the host app or loop.

`v0.7.3-alpha.1` is the latest public GitHub prerelease and npm alpha for AgentClutch.

## What is included

- Action Proposal -> Action Card -> Clutch Decision -> Resume Context -> Run Story artifact chain.
- `prompt_guard`, `tool_wrapper`, and `loop_native` adoption paths.
- Local JSONL recorder and Run Story generation.
- Consequence classification, reversibility, compensation, residue, and risk metadata.
- Local rules for `allow`, `block`, and `require_clutch` decisions.
- Local lesson reuse for user corrections without silently approving future actions.
- Playwright adapter for guarded browser actions.
- React-compatible Action Card and Run Story UI components.
- CLI demo and run inspection commands.
- Registry-safe `agentclutch smoke` command for npm CLI install checks.
- Contributor-friendly issue templates.
- Alpha release-prep workflow and helper scripts that do dry-runs/packs without auto-publishing.
- Runnable examples for email prompt guard, file delete tool wrapper, expense submit, GitHub PR proposal, loop-native checkout, and a minimal npm consumer path.
- Real demo/viewer screenshots in the README.

## Published npm alpha packages

These packages are published at `0.7.3-alpha.1` and available through the `alpha` dist-tag:

- `@agentclutch/action-card`
- `@agentclutch/loop`
- `@agentclutch/core`
- `@agentclutch/recorder`
- `@agentclutch/playwright`
- `@agentclutch/react`
- `@agentclutch/cli`

The root monorepo remains private in npm terms (`private: true`) and should never be published.

## Install commands

```bash
pnpm add @agentclutch/core@alpha
pnpm add @agentclutch/react@alpha
pnpm add @agentclutch/playwright@alpha playwright
pnpm dlx @agentclutch/cli@alpha smoke
pnpm dlx @agentclutch/cli@alpha --help
```

## Demo

From a cloned repo:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm exec playwright install chromium
pnpm demo:checkout
```

In WSL/headless automation, use seeded flows:

```bash
xvfb-run -a pnpm demo:checkout --seed-allow-rule
pnpm agentclutch inspect latest
xvfb-run -a pnpm demo:checkout --seed-block-rule
pnpm agentclutch inspect latest
```

Registry-safe CLI smoke path:

```bash
pnpm dlx @agentclutch/cli@alpha smoke
```

The full FakeStore browser demo currently expects local demo assets from a source checkout.

## Known caveats

See [Known Limitations](docs/limitations.md) for the maintained caveat list. Highlights:

- Alpha-stage API and package boundaries may still change.
- Local-first by design; no hosted approval service, cloud sync, desktop overlay, MCP, AG-UI, or CHAP integration is included in this milestone.
- The interactive `require_clutch` browser demo needs a GUI/human decision; terminal-only automation should use seeded allow/block flows plus browser-backed tests.
- npm automatically created a `latest` dist-tag because this is the first version, but docs recommend the explicit `@alpha` install path until AgentClutch is stable.

## Verification performed before launch

The launch candidate was verified with:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm test
git diff --check
pnpm exec playwright install chromium
xvfb-run -a pnpm demo:checkout --seed-allow-rule
pnpm agentclutch inspect latest
xvfb-run -a pnpm demo:checkout --seed-block-rule
pnpm agentclutch inspect latest
```

Then perform package dry-runs and a clean install smoke test from packed tarballs before publishing.
