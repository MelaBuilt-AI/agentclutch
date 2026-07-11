# @agentclutch/recorder

Local JSONL recorder and run-store utilities for AgentClutch runs.

This package is part of [AgentClutch](https://github.com/MelaBuilt-AI/agentclutch): the local-first Action Card and takeover UX layer for consequential AI agent actions.

## Status

`0.7.3-alpha.2` is the latest published npm alpha version. Prefer installing with the explicit `@alpha` tag until AgentClutch is stable.

## Install

```bash
pnpm add @agentclutch/recorder@alpha
```

## Minimal usage

```ts
import { JsonlRecorder, RunStore } from "@agentclutch/recorder";

const recorder = new JsonlRecorder({
  rootDir: ".agentclutch",
  runId: "run_email_001",
});

await recorder.record({
  type: "example.event",
  message: "Record only redacted, reviewable metadata.",
});

const store = new RunStore(".agentclutch");
const latest = await store.readLatestRun();
console.log(latest?.runId, latest?.events.length ?? 0);
```

## Package role

Use this package when you want local-first JSONL records for Action Cards, decisions, loop events, and Run Story inputs.

Security note: recorder JSONL is local, but it can still contain sensitive values supplied by your host app. Redact secrets and private payloads before recording.

Links: [root README](../../README.md), [quickstart](../../docs/quickstart.md), [known limitations](../../docs/limitations.md), [security policy](../../SECURITY.md).
