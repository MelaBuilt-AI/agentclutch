# @agentclutch/action-card

TypeScript types, schemas, builders, and validation for AgentClutch Action Cards.

This package is part of [AgentClutch](https://github.com/MelaBuilt-AI/agentclutch): the local-first Action Card and takeover UX layer for consequential AI agent actions.

## Status

`0.7.3-alpha.2` is the latest published npm alpha version. Prefer installing with the explicit `@alpha` tag until AgentClutch is stable.

## Install

```bash
pnpm add @agentclutch/action-card@alpha
```

## Minimal usage

```ts
import { buildActionCard, validateActionCard } from "@agentclutch/action-card";

const card = buildActionCard({
  id: "card_send_email_001",
  run_id: "run_send_email_001",
  agent: { name: "example-agent", runtime: "custom" },
  proposed_action: {
    id: "action_send_email_001",
    kind: "email.send",
    label: "Send follow-up email",
    surface: "email",
    target: {
      surface: "email",
      target_app: "Example Mail",
    },
    changed_fields: [
      { field: "to", after: "customer@example.com", editable: true },
      { field: "subject", after: "Thanks for the call", editable: true },
    ],
  },
  consequence: {
    class: "external_message_send",
    label: "External message send",
    reversibility: "residue_remains",
    blast_radius: "team",
    requires_confirmation: true,
  },
  risk: {
    level: "medium",
    score: 55,
    reasons: ["The email may be read or forwarded by the recipient."],
  },
});

const result = validateActionCard(card);
if (!result.success) throw new Error("Invalid Action Card");
```

## Package role

Use this package when you need the standalone Action Card model: types, schema validation, builders, and low-level UI data contracts.

Links: [root README](../../README.md), [quickstart](../../docs/quickstart.md), [known limitations](../../docs/limitations.md), [security policy](../../SECURITY.md).
