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

Recorded JSONL events can be converted into a Run Story by a host app or future CLI inspection command.
