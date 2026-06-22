# Loops

AgentClutch is loop-native internally. It models the point where an agent loop proposes a consequential side effect and waits for human control.

## Lifecycle

The design lifecycle is:

```text
goal.received
perception.captured
state.updated
plan.created
action.proposed
clutch.required
action_card.created
user.decision
resume_context.created
action.executed
observation.received
loop.resumed
```

The MVP currently records the most important launch events: action proposal, Action Card, user decision, and resume context.

## Progressive Adoption Modes

### `prompt_guard`

For apps with one prompt and one risky action.

### `tool_wrapper`

For browser actions, shell commands, file writes, API writes, and wrapped tools. The Playwright adapter uses this mode.

### `loop_native`

For engineered loops that already track loop IDs, step IDs, plans, observations, and resume behavior.

## Resume Context

Every decision should produce a `LoopResumeContext`. It tells the host loop whether the same action can be retried, whether similar actions need approval, and what instruction the agent should follow next.
