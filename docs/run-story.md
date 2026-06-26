# Run Story

Run Story is a readable timeline generated from structured AgentClutch events.

## Purpose

Run Stories explain:

- What the agent proposed.
- What the user decided.
- Whether the loop resumed, stopped, or handed off.
- Which Action Cards were involved.

## Inputs

Run Story generation can use:

- Action Cards
- User decisions
- Intervention events
- Loop events

`@agentclutch/core` currently exposes `generateRunStory` for Action Card and decision event sequences.

## UI

`@agentclutch/react` includes `RunStoryTimeline`, which can render either `RunStory.steps` or sample event lists.

## Local Recording

Recorded JSONL events can be converted into a Run Story by a host app or local inspection flow.

The CLI includes a lightweight inspector for launch/debug flows:

```bash
node packages/cli/dist/index.js inspect latest
node packages/cli/dist/index.js inspect <run_id>
```

It summarizes the event count, latest Action Card, consequence, risk, user decision, and resume status when those events are present.
