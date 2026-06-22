# Task

Show how an engineered agent loop asks AgentClutch to confirm a checkout action before clicking the checkout button.

The example should produce:

- `ActionProposal.sourceMode = "loop_native"`
- Explicit `loopId` and `stepId`
- An Action Card for `browser.checkout`
- A `LoopResumeContext` consumed by the host loop
