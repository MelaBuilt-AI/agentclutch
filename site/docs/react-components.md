# React Components

`@agentclutch/react` provides reusable UI components for Action Cards and Run Stories.

## Components

- `ActionCard`
- `RiskBadge`
- `EvidencePanel`
- `DecisionBar`
- `TakeoverModal`
- `RunStoryTimeline`

## Usage

```ts
import { ActionCard } from "@agentclutch/react";
import "@agentclutch/react/styles.css";

ActionCard({
  card,
  onDecision(decision) {
    console.log(decision);
  }
});
```

The current package exports React-compatible element objects and default CSS. It is designed so future apps can render the same Action Card UX without depending on Playwright.

## Decision Callbacks

`DecisionBar` emits:

- `approve_once`
- `edit_fields`
- `take_wheel`
- `block`
- `create_rule`

Host apps map those values to loop decisions and execution behavior.

## Viewer App

`apps/action-card-viewer` uses these components to render a pasted or sample Action Card locally.
