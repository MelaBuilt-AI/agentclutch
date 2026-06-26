# AgentClutch Status

Current milestone:
v0.7.3-alpha Private Prerelease Checkpoint

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

v0.7.3-alpha is the current private launch-readiness checkpoint on the private repo. It includes the v0.7.2 runnable consequential-action examples plus design-doc/status sync, privacy-safe email Action Card docs/tests, safer example isolation/cleanup, a real viewer screenshot, cross-platform file-delete regression coverage, narrowed GitHub consequence classification, and `pnpm agentclutch --help` polish while keeping AgentClutch private and pre-launch.

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

v0.7.3-alpha private annotated tag cut from verified `main` (`c4fb7fb521a6e3715aa3454a868c95cf5cea95d5`)
