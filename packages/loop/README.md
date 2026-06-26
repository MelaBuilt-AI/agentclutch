# @agentclutch/loop

Loop lifecycle contracts for AgentClutch action proposals, decisions, events, and resume context.

This package is part of [AgentClutch](https://github.com/MelaBuilt-AI/agentclutch): the local-first Action Card and takeover UX layer for consequential AI agent actions.

## Status

`0.7.3-alpha.1` is the latest published npm alpha version. Prefer installing with the explicit `@alpha` tag until AgentClutch is stable.

## Install

```bash
pnpm add @agentclutch/loop@alpha
```

## Minimal usage

```ts
import { buildResumeContext, normalizeActionProposal } from "@agentclutch/loop";

const proposal = normalizeActionProposal({
  sourceMode: "loop_native",
  loopId: "loop_checkout_001",
  stepId: "step_review_checkout",
  userGoal: { summary: "Buy headphones after review" },
  proposedAction: {
    kind: "browser.checkout",
    label: "Complete checkout",
    targetSurface: "browser",
    targetApp: "FakeStore",
    targetIdentifier: "#checkout",
  },
  riskHints: {
    requiresApproval: true,
    reversibility: "compensable",
    blastRadius: "single_user",
  },
});

const resumeContext = buildResumeContext(proposal, {
  type: "approve_once",
  approvedBy: "human-operator",
  decidedAt: new Date().toISOString(),
});
```

## Package role

Use this package when your host app already has an engineered loop and needs typed Action Proposals, Clutch Decisions, loop events, and Resume Context objects.

Links: [root README](../../README.md), [quickstart](../../docs/quickstart.md), [known limitations](../../docs/limitations.md), [examples](../../examples/README.md).
