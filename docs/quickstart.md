# AgentClutch Quickstart

Use this guide to try AgentClutch from a clean checkout or npm alpha install.

## Requirements

- Node.js 22+
- pnpm 11+
- Linux, WSL2 Ubuntu, or native Windows
- Chromium installed through Playwright for browser demos/tests

## Clone and install

```bash
git clone git@github.com:MelaBuilt-AI/agentclutch.git
cd agentclutch
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
```

## Run the local checkout demo

Interactive GUI flow:

```bash
pnpm demo:checkout
```

In WSL/headless automation, run seeded flows through Xvfb:

```bash
xvfb-run -a pnpm demo:checkout --seed-allow-rule
pnpm agentclutch inspect latest
xvfb-run -a pnpm demo:checkout --seed-block-rule
pnpm agentclutch inspect latest
```

The `--seed-require-clutch-rule` path intentionally waits for a human decision. Use it in a GUI session when you want to verify the live Action Card decision flow.

## Inspect a run

```bash
pnpm agentclutch inspect latest
```

Expected result: a concise summary of the latest local JSONL run, including the proposed action, decision, and resume context.

## View Action Cards and Run Stories

Start the local viewer:

```bash
pnpm --filter @agentclutch/action-card-viewer dev
```

Open the Vite URL printed in the terminal, usually:

```text
http://127.0.0.1:5173/
```

The viewer can render sample Action Card JSON and recorder JSONL from `.agentclutch/runs/<run_id>/events.jsonl`.

## npm alpha install

The first npm alpha is published as `0.7.3-alpha.0`. Install only the package you need and prefer the explicit `@alpha` tag while the API is unstable:

```bash
pnpm add @agentclutch/core@alpha
pnpm add @agentclutch/react@alpha
pnpm add @agentclutch/playwright@alpha playwright
pnpm dlx @agentclutch/cli@alpha smoke
pnpm dlx @agentclutch/cli@alpha --help
```

Verify the npm-installed CLI without a source checkout, after the next npm alpha publish:

```bash
pnpm dlx @agentclutch/cli@alpha smoke
```

The smoke command is intentionally lightweight. It confirms that the registry CLI entrypoint and Node runtime work, and it does not require local FakeStore demo assets. Until the next npm alpha is published, use `pnpm dlx @agentclutch/cli@alpha --help` as the current registry sanity check.

Run the CLI demo from a source checkout:

```bash
pnpm demo:checkout --seed-allow-rule
```

Registry-based FakeStore demos are limited for now because the npm CLI package does not bundle the browser-demo app assets.

## Minimal npm consumer example

For the smallest external-consumer-style example, copy `examples/npm-consumer-basic` into a fresh project or run it from this repo after install/build:

```bash
pnpm --filter @agentclutch/example-npm-consumer-basic start
```

The example imports only from `@agentclutch/core`, creates one email-send Action Card, approves it with a deterministic renderer, and prints the decision plus resume policy.

## What success looks like

- Build, typecheck, lint, and tests pass.
- Seeded allow flow completes checkout without showing the overlay.
- Seeded block flow prevents checkout.
- `pnpm agentclutch inspect latest` summarizes the latest run.
- The viewer renders an Action Card and Run Story from sample or recorded JSONL.

## Current caveats

- AgentClutch is alpha-stage and local-first.
- It is not a generic agent framework, hosted approval service, browser agent, chat UI, or observability dashboard.
- npm currently exposes the first alpha as both `alpha` and `latest`; prefer explicit `@alpha` installs until stable.
- The registry CLI smoke command works without a checkout; the full FakeStore demo currently needs this repo's local demo assets.
- See [Known Limitations](limitations.md) for the full alpha caveat list.
