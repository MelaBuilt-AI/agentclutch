# AgentClutch Quickstart

Use this guide to validate AgentClutch from a clean checkout before the first public GitHub + npm alpha launch.

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

## After npm alpha publish

The first npm alpha is prepared as `0.7.3-alpha.0` under the `alpha` dist-tag. Once published, install only the package you need:

```bash
pnpm add @agentclutch/core@alpha
pnpm add @agentclutch/react@alpha
pnpm add @agentclutch/playwright@alpha playwright
pnpm dlx @agentclutch/cli@alpha --help
```

Run the CLI demo after publish:

```bash
pnpm dlx @agentclutch/cli@alpha demo checkout --seed-allow-rule
```

## What success looks like

- Build, typecheck, lint, and tests pass.
- Seeded allow flow completes checkout without showing the overlay.
- Seeded block flow prevents checkout.
- `pnpm agentclutch inspect latest` summarizes the latest run.
- The viewer renders an Action Card and Run Story from sample or recorded JSONL.

## Current caveats

- AgentClutch is alpha-stage and local-first.
- It is not a generic agent framework, hosted approval service, browser agent, chat UI, or observability dashboard.
- Public GitHub launch and npm publishing require explicit approval before execution.
