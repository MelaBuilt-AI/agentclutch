# AgentClutch Status

Current milestone:
v0.7.2-alpha Private Prerelease Checkpoint

Completed:

- Scaffold
- Action Cards
- Loop Engine
- Core
- Recorder
- Playwright Adapter
- Browser Checkout Demo
- React UI
- Action Card Viewer
- Run Story
- Rules Engine
- Lesson Engine (Teach Mode)
- Consequence Registry
- Action Card Consequence Display
- Viewer Consequence Display
- Run Story Consequence Summaries

Verified Working:

- Approve Once
- Edit Quantity
- Block
- Create Rule
- Allow Rule
- Require Clutch Rule
- Lesson Creation
- Lesson Reuse
- Run Story Viewer
- Consequence Registry Lookup
- Custom Consequence Registry Entries
- Reversibility Metadata Display
- Compensation Metadata Display
- Residue Metadata Display
- Run Story Residue And Compensation Summaries
- Runnable prompt-guard email example
- Runnable tool-wrapper file-delete example
- Runnable expense-submit example with edit approval
- Runnable GitHub PR-create example

Current Architecture:

ActionProposal
→ ActionCard
→ ClutchDecision
→ LoopResumeContext
→ RunStory

Current Milestone Status:

v0.7.2-alpha is cut, pushed, and verified on the private repo. It adds runnable consequential-action examples, GitHub PR consequence classification, safer example isolation/cleanup, and a friendlier local CLI invocation while keeping AgentClutch private and pre-launch.

Completed v0.7 Goals:

- consequence registry
- reversibility metadata
- compensation metadata
- residue metadata
- Action Card consequence display
- Viewer consequence display
- Run Story consequence summaries

Next Planned Work:

- re-run full launch checklist before public launch decision
- private repo-only alpha remains the current package strategy until explicit approval for public GitHub and/or npm publishing
- add/record a real Action Card viewer screenshot or GIF if viewer remains launch positioning
- decide later whether the first public publishing slice is public GitHub-only or npm packages under `@agentclutch/*` plus an `agentclutch` CLI package

Do NOT build yet:

- MCP
- AG-UI
- CHAP
- cloud sync
- desktop overlay

Current Git Tag:

v0.7.2-alpha private annotated tag cut from verified `main` (`fe66b615f079127c9c55460a2d085fe3a873449a`)
