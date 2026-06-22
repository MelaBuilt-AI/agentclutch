# Task

Show how a wrapped file-delete tool asks AgentClutch to confirm before deleting a file.

The example should produce:

- `ActionProposal.sourceMode = "tool_wrapper"`
- An Action Card with path, consequence, reversibility, risk, and evidence
- No deletion unless the user decision is `approve_once`
- A recorded resume context after the decision
