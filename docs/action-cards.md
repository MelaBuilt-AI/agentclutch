# Action Cards

An Action Card is the visible review object shown before a consequential action executes.

## Purpose

Action Cards answer:

- What does the agent want to do?
- What target will it affect?
- What fields or state may change?
- What is the likely consequence?
- How reversible is it?
- What evidence supports the proposal?
- What decision can the user make?

## Current Shape

Action Cards are defined in `@agentclutch/action-card` and validated by `parseActionCard`.

Important fields:

- `proposed_action.label`
- `proposed_action.kind`
- `proposed_action.target`
- `proposed_action.changed_fields`
- `consequence`
- `risk`
- `evidence`
- `user_options`

## User Options

Current card options include:

- `approve_once`
- `edit_fields`
- `take_wheel`
- `block`
- `create_rule`
- `request_more_context`

Adapters map these UI decisions into loop-level `ClutchDecision` objects.

## Validation

Use:

```ts
import { parseActionCard } from "@agentclutch/action-card";

const card = parseActionCard(JSON.parse(raw));
```

Invalid JSON and schema failures should be shown to the user before rendering.

## Data Hygiene

Action Cards may contain sensitive context. Redact secrets before creating or recording cards.
