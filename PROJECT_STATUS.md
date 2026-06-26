# AgentClutch Status

Current milestone:
v0.7.2-alpha Runnable Examples Candidate

Completed:

* Scaffold
* Action Cards
* Loop Engine
* Core
* Recorder
* Playwright Adapter
* Browser Checkout Demo
* React UI
* Action Card Viewer
* Run Story
* Rules Engine
* Lesson Engine (Teach Mode)
* Consequence Registry
* Action Card Consequence Display
* Viewer Consequence Display
* Run Story Consequence Summaries

Verified Working:

* Approve Once
* Edit Quantity
* Block
* Create Rule
* Allow Rule
* Require Clutch Rule
* Lesson Creation
* Lesson Reuse
* Run Story Viewer
* Consequence Registry Lookup
* Custom Consequence Registry Entries
* Reversibility Metadata Display
* Compensation Metadata Display
* Residue Metadata Display
* Run Story Residue And Compensation Summaries
* Runnable prompt-guard email example
* Runnable tool-wrapper file-delete example
* Runnable expense-submit example with edit approval
* Runnable GitHub PR-create example

Current Architecture:

ActionProposal
→ ActionCard
→ ClutchDecision
→ LoopResumeContext
→ RunStory

Current Milestone Status:

v0.7.2-alpha candidate adds runnable consequential-action examples, GitHub PR consequence classification, and a friendlier local CLI invocation while keeping the repo private and pre-launch

Completed v0.7 Goals:

* consequence registry
* reversibility metadata
* compensation metadata
* residue metadata
* Action Card consequence display
* Viewer consequence display
* Run Story consequence summaries

Next Planned Work:

* review design doc against current implementation
* re-run full launch checklist before public launch decision
* decide package publishing strategy: repo-only alpha vs npm packages under `@agentclutch/*` and/or an `agentclutch` CLI package
* add/record a real Action Card viewer screenshot or GIF if viewer remains launch positioning

Do NOT build yet:

* MCP
* AG-UI
* CHAP
* cloud sync
* desktop overlay

Current Git Tag:

v0.7.2-alpha candidate pending tag cut from current `main`
