# Task

Show how a loop-native repository agent asks AgentClutch to confirm before creating a GitHub pull request.

The example should produce:

- `ActionProposal.sourceMode = "loop_native"`
- Explicit `loopId` and `stepId`
- An Action Card with repo, base/head branches, PR title, reviewers, changed files, consequence, and risk
- Simulated PR creation only after `approve_once`
- A recorded resume context after the decision
