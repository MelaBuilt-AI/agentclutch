# Examples

The examples show the three supported adoption paths. They are intentionally small, local, and policy-focused so readers can see how each path produces the same AgentClutch artifacts without touching real email, GitHub, finance, or filesystem state outside generated temp files.

## Runnable examples

Run any example from the repo root after `pnpm install` and `pnpm build`:

```bash
pnpm --filter @agentclutch/example-prompt-guard-send-email start
pnpm --filter @agentclutch/example-tool-wrapper-file-delete start
pnpm --filter @agentclutch/example-expense-submit start
pnpm --filter @agentclutch/example-github-pr-create start
```

Each runnable example records the same chain in memory:

```text
Action Proposal -> Action Card -> Clutch Decision -> Resume Context
```

### `prompt-guard-send-email`

Path: `prompt_guard`

Use this when a prompt-based app is about to execute one consequential action, such as sending an email.

Files:

- [README.md](prompt-guard-send-email/README.md)
- [src/index.ts](prompt-guard-send-email/src/index.ts)
- [policy.json](prompt-guard-send-email/policy.json)
- [task.md](prompt-guard-send-email/task.md)

What it demonstrates:

- Creating an Action Proposal from a prompt and proposed email send.
- Showing recipient, CC, subject, body preview, consequence, risk, and evidence.
- Simulating send only after `approve_once`.
- Returning `LoopResumeContext` after the decision.

### `tool-wrapper-file-delete`

Path: `tool_wrapper`

Use this when an app or agent has a function that can affect user data, such as deleting a local file.

Files:

- [README.md](tool-wrapper-file-delete/README.md)
- [src/index.ts](tool-wrapper-file-delete/src/index.ts)
- [policy.json](tool-wrapper-file-delete/policy.json)
- [task.md](tool-wrapper-file-delete/task.md)

What it demonstrates:

- Wrapping a destructive tool.
- Creating a temp file owned by the example.
- Showing the proposed file delete before execution.
- Preventing the underlying delete unless the user approves once.

### `expense-submit`

Path: `prompt_guard`

Use this when a prompt-based or form-driven app is about to submit a business record.

Files:

- [README.md](expense-submit/README.md)
- [src/index.ts](expense-submit/src/index.ts)
- [policy.json](expense-submit/policy.json)
- [task.md](expense-submit/task.md)

What it demonstrates:

- An expense submission Action Card with merchant, amount, category, memo, and receipt evidence.
- A human `edit` decision correcting the amount before submission.
- Resume context that tells the host app how the loop should continue after the correction.

### `github-pr-create`

Path: `loop_native`

Use this when an engineered repository-maintenance loop is about to create a pull request.

Files:

- [README.md](github-pr-create/README.md)
- [src/index.ts](github-pr-create/src/index.ts)
- [policy.json](github-pr-create/policy.json)
- [task.md](github-pr-create/task.md)

What it demonstrates:

- Explicit loop IDs and step IDs.
- A GitHub repository write proposal before PR creation.
- Consequence classification as `code_repository_change`.
- Simulated PR creation only after approval.

### `loop-native-checkout`

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
