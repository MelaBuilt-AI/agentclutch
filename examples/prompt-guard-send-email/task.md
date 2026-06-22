# Task

Show how a prompt-based app asks AgentClutch to confirm a proposed email send before calling the email API.

The example should produce:

- `ActionProposal.sourceMode = "prompt_guard"`
- An Action Card with recipient, subject, consequence, risk, and evidence
- A `ClutchDecision`
- A `LoopResumeContext`
