# github-pr-create

Runnable `loop_native` example: an engineered repository-maintenance loop is about to create a GitHub pull request and asks AgentClutch for approval before changing repository state.

## Run

```bash
pnpm --filter @agentclutch/example-github-pr-create start
```

## Scenario

The loop has prepared a branch, title, reviewer list, and changed-file summary. Before creating the pull request, it emits a loop-native Action Proposal. AgentClutch classifies the proposal as a `code_repository_change`, records the decision, and the example simulates PR creation only after `approve_once`.

This example does **not** call GitHub. It returns a simulated PR URL so the flow is safe and deterministic.

## Safety Notes

- Show repo, base branch, head branch, title, reviewers, and changed-file count before creating a PR.
- PR creation may notify collaborators or expose branch metadata.
- Merge remains a higher-risk production/repository action and should require its own clutch point.
