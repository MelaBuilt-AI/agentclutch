# AgentClutch Quickstart

Use this guide to try AgentClutch from a clean checkout or a clean npm consumer project.

## Requirements

- Node.js 22+
- pnpm 11+ for a source checkout
- Linux, WSL2 Ubuntu, or native Windows
- Chromium installed through Playwright for browser demos/tests

## Clone and install

The repository is public, so HTTPS works without a configured GitHub SSH key:

```bash
git clone https://github.com/MelaBuilt-AI/agentclutch.git
cd agentclutch
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright install chromium
```

Maintainers who already have GitHub SSH authentication configured may use `git@github.com:MelaBuilt-AI/agentclutch.git` instead.

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

The current npm alpha is `0.7.3-alpha.3`. For an immediate, reproducible install—including during the first day after a release—use npm with the exact version:

```bash
npm install @agentclutch/core@0.7.3-alpha.3
npm install @agentclutch/react@0.7.3-alpha.3
npm install @agentclutch/playwright@0.7.3-alpha.3 playwright
npx -y @agentclutch/cli@0.7.3-alpha.3 smoke
npx -y @agentclutch/cli@0.7.3-alpha.3 --help
```

For normal alpha tracking after the package has aged through your package manager's safety window, use the `alpha` dist-tag:

```bash
pnpm add @agentclutch/core@alpha
pnpm add @agentclutch/react@alpha
pnpm add @agentclutch/playwright@alpha playwright
pnpm dlx @agentclutch/cli@alpha smoke
pnpm dlx @agentclutch/cli@alpha --help
```

### pnpm 11 release-age behavior

pnpm 11 defaults `minimumReleaseAge` to 1,440 minutes (24 hours). During that window, `pnpm add @agentclutch/core@alpha` can intentionally select the previous alpha even when `pnpm view @agentclutch/core@alpha version` reports the new one.

If your project deliberately needs a same-day AgentClutch release through pnpm, add a narrowly scoped exception to that project's `pnpm-workspace.yaml`:

```yaml
minimumReleaseAgeExclude:
  - "@agentclutch/*"
```

Keep the global safety delay enabled. Verify what was actually installed with `pnpm list @agentclutch/core`.

The CLI `smoke` command is intentionally lightweight. It confirms that the registry CLI entrypoint and Node runtime work without requiring local FakeStore assets. The full FakeStore browser demo currently requires a source checkout.

## Minimal npm consumer example

The smallest path uses npm and plain JavaScript, so it does not need `tsx`, TypeScript, or pnpm build-script approval:

```bash
mkdir agentclutch-npm-consumer-basic
cd agentclutch-npm-consumer-basic
npm init -y
npm pkg set type=module
npm install @agentclutch/core@0.7.3-alpha.3
mkdir -p src
cp /path/to/agentclutch/examples/npm-consumer-basic/src/index.mjs src/index.mjs
node src/index.mjs
```

From the source checkout, the same no-build example is:

```bash
pnpm --filter @agentclutch/example-npm-consumer-basic start
```

The example creates one email-send Action Card, approves it with a deterministic renderer, and prints the decision plus resume policy. See [`examples/npm-consumer-basic`](https://github.com/MelaBuilt-AI/agentclutch/blob/main/examples/npm-consumer-basic/README.md) for expected output and the optional TypeScript source.

## What success looks like

- Build, typecheck, lint, and tests pass.
- Seeded allow flow completes checkout without showing the overlay.
- Seeded block flow prevents checkout.
- `pnpm agentclutch inspect latest` summarizes the latest run.
- The viewer renders an Action Card and Run Story from sample or recorded JSONL.
- A clean npm consumer runs `src/index.mjs` and the registry CLI smoke command.

## Current caveats

- AgentClutch is alpha-stage and local-first.
- It is not a generic agent framework, hosted approval service, browser agent, chat UI, or observability dashboard.
- npm exposes `0.7.3-alpha.3` through the `alpha` dist-tag; use the exact version when release-day reproducibility matters.
- The registry CLI smoke command works without a checkout; the full FakeStore demo currently needs this repo's local demo assets.
- See [Known Limitations](limitations.md) for the full alpha caveat list.
