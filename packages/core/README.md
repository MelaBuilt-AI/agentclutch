# @agentclutch/core

Core AgentClutch sessions, consequence metadata, risk utilities, lessons, facade APIs, and Run Story helpers.

This package is part of [AgentClutch](https://github.com/MelaBuilt-AI/agentclutch): the local-first Action Card and takeover UX layer for consequential AI agent actions.

## Status

`0.7.3-alpha.1` is the latest published npm alpha version. Prefer installing with the explicit `@alpha` tag until AgentClutch is stable.

## Install

```bash
pnpm add @agentclutch/core@alpha
```

## Minimal usage

```ts
import { createClutch, type DecisionRenderer } from "@agentclutch/core";

const renderer: DecisionRenderer = {
  async decide() {
    return {
      type: "approve_once",
      approvedBy: "local-user",
      decidedAt: new Date().toISOString(),
    };
  },
};

const clutch = createClutch({ runId: "run_email_001", renderer });

const result = await clutch.confirmAction({
  userGoal: { summary: "Send follow-up email" },
  proposedAction: {
    kind: "email.send",
    label: "Send follow-up email",
    targetSurface: "email",
    targetApp: "Example Mail",
    rawInput: {
      to: "customer@example.com",
      subject: "Thanks for the call",
      bodyPreview: "Thanks for meeting today...",
    },
  },
  riskHints: {
    requiresApproval: true,
    reversibility: "residue",
    blastRadius: "external",
  },
});

if (result.decision.type === "approve_once") {
  // Execute the real send here in your host app.
}
```

## Package role

Use this package for the easiest prompt-guard path: create a clutch facade, turn proposed side effects into Action Cards, collect a decision, and receive Resume Context.

See also: [minimal npm consumer example](../../examples/npm-consumer-basic/README.md), [quickstart](../../docs/quickstart.md), [known limitations](../../docs/limitations.md), [security policy](../../SECURITY.md).
