# Architecture

AgentClutch owns the human-control boundary before consequential side effects. It is loop-native internally and prompt-compatible at the SDK edge.

```mermaid
flowchart TD
  A[Host app or agent loop] --> B[ActionProposalInput]
  B --> C[@agentclutch/loop normalizeActionProposal]
  C --> D[ActionProposal]
  D --> E[ActionCard]
  E --> F[Human decision]
  F --> G[ClutchDecision]
  G --> H[LoopResumeContext]
  H --> A
  D --> R[@agentclutch/recorder JSONL]
  E --> R
  G --> R
  H --> R
  R --> S[Run Story]
```

## Core Objects

- `ActionProposalInput` is the adapter-facing input.
- `ActionProposal` is the normalized loop-native proposal.
- `ActionCard` is the user-facing review object.
- `ClutchDecision` captures approve, edit, block, takeover, or create-rule intent.
- `LoopResumeContext` tells the agent loop what happened and how to resume.
- `RunStory` turns recorded events into an ordered narrative.

## Packages

- `@agentclutch/action-card`: card schema, types, parser, and builder.
- `@agentclutch/loop`: proposal normalization, decisions, events, and resume context.
- `@agentclutch/core`: consequence/risk utilities, sessions, and Run Story generation.
- `@agentclutch/recorder`: local JSONL run persistence.
- `@agentclutch/playwright`: explicit browser action wrapper.
- `@agentclutch/react`: reusable Action Card UI components.
- `@agentclutch/cli`: local demos.

## Product Boundary

AgentClutch is not the planner, memory, tool runtime, browser agent, desktop agent, or policy engine. Host applications own execution and authorization. AgentClutch owns the clutch point before execution.
