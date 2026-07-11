# @agentclutch/react

React-compatible components for AgentClutch Action Cards and takeover UX.

This package is part of [AgentClutch](https://github.com/MelaBuilt-AI/agentclutch): the local-first Action Card and takeover UX layer for consequential AI agent actions.

## Status

`0.7.3-alpha.2` is the latest published npm alpha version. Prefer installing with the explicit `@alpha` tag until AgentClutch is stable.

## Install

```bash
pnpm add @agentclutch/react@alpha
```

If you use the bundled styles, import:

```ts
import "@agentclutch/react/styles.css";
```

## Minimal usage

```ts
import type { ActionCard as ActionCardModel } from "@agentclutch/action-card";
import { ActionCard } from "@agentclutch/react";

export function renderCard(card: ActionCardModel) {
  return ActionCard({
    card,
    onDecision(decision, editedFields) {
      console.log({ decision, editedFields });
    },
  });
}
```

## Package role

Use this package when you want reusable Action Card and Run Story UI primitives. The current alpha exposes React-compatible element objects without requiring a specific app framework.

Links: [root README](../../README.md), [quickstart](../../docs/quickstart.md), [known limitations](../../docs/limitations.md), [React component docs](../../docs/react-components.md).
