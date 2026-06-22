# Examples

The examples show the three supported adoption paths. They are intentionally small and policy-focused so readers can see how each path produces the same AgentClutch artifacts.

## `prompt-guard-send-email`

Path: `prompt_guard`

Use this when a prompt-based app is about to execute one consequential action, such as sending an email.

Files:

- [README.md](prompt-guard-send-email/README.md)
- [policy.json](prompt-guard-send-email/policy.json)
- [task.md](prompt-guard-send-email/task.md)

What it demonstrates:

- Creating an Action Proposal from a prompt and proposed email send.
- Showing recipient, subject, consequence, risk, and evidence.
- Executing only after `approve_once`.
- Returning `LoopResumeContext` after the decision.

## `tool-wrapper-file-delete`

Path: `tool_wrapper`

Use this when an app or agent has a function that can affect user data, such as deleting a local file.

Files:

- [README.md](tool-wrapper-file-delete/README.md)
- [policy.json](tool-wrapper-file-delete/policy.json)
- [task.md](tool-wrapper-file-delete/task.md)

What it demonstrates:

- Wrapping a destructive tool.
- Showing the proposed file delete before execution.
- Preventing the underlying delete unless the user approves once.
- Recording the decision and resume context.

## `loop-native-checkout`

Path: `loop_native`

Use this when an engineered observe-plan-act loop already has loop IDs, step IDs, state, and resume behavior.

Files:

- [README.md](loop-native-checkout/README.md)
- [policy.json](loop-native-checkout/policy.json)
- [task.md](loop-native-checkout/task.md)

What it demonstrates:

- Explicit `loopId` and `stepId`.
- A checkout Action Proposal before clicking `#checkout`.
- Consuming `LoopResumeContext` after the Clutch Decision.
- Resuming the host loop from the corrected or blocked state.

## Shared Model

All examples map into the same chain:

```text
Action Proposal -> Action Card -> Clutch Decision -> Resume Context -> Run Story
```

Rules in example policy files control whether matching actions should be allowed, blocked, or require AgentClutch approval. Future Teach Mode will remember corrections and preferences separately; it is not part of these examples.
