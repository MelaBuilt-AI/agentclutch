# @agentclutch/cli

CLI for AgentClutch demos and local run inspection.

This package is part of [AgentClutch](https://github.com/MelaBuilt-AI/agentclutch): the local-first Action Card and takeover UX layer for consequential AI agent actions.

## Status

`0.7.3-alpha.0` is the first published npm alpha version. Prefer running with the explicit `@alpha` tag until AgentClutch is stable.

## Run without installing

```bash
pnpm dlx @agentclutch/cli@alpha --help
```

## Minimal usage

Run a seeded local checkout demo from npm:

```bash
pnpm dlx @agentclutch/cli@alpha demo checkout --seed-allow-rule
```

Inspect the latest local run from a repo or project that has `.agentclutch/runs`:

```bash
pnpm dlx @agentclutch/cli@alpha inspect latest
```

From a cloned AgentClutch repo, the equivalent local scripts are:

```bash
pnpm demo:checkout --seed-allow-rule
pnpm agentclutch inspect latest
```

## Package role

Use this package to try demos and inspect local AgentClutch run records without wiring the TypeScript APIs into an app first.

Links: [root README](../../README.md), [quickstart](../../docs/quickstart.md), [known limitations](../../docs/limitations.md), [CLI demo docs](../../docs/demo-script.md).
