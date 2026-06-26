# Task

Show how a prompt-based or form-driven app asks AgentClutch to confirm before submitting an expense report.

The example should produce:

- `ActionProposal.sourceMode = "prompt_guard"`
- An Action Card with merchant, amount, category, memo, receipt evidence, consequence, and risk
- A structured `edit` decision that corrects a field before simulated submission
- A recorded resume context after the decision
