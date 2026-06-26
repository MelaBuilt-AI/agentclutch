# AgentClutch Status

Current milestone:
v0.7.3-alpha.1 Public GitHub + npm Alpha

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
- npm alpha metadata for the publishable SDK/CLI packages
- contributor-friendly GitHub issue templates
- alpha release-prep workflow and helper scripts
- registry-safe CLI smoke command

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
- Registry-safe CLI smoke command

Current Architecture:

ActionProposal
→ ActionCard
→ ClutchDecision
→ LoopResumeContext
→ RunStory

Current Milestone Status:

`v0.7.3-alpha.1` is live as the latest public GitHub prerelease and npm alpha. The repository is public, the npm packages are published, and registry install smoke tests passed.

Published npm alpha packages:

- `@agentclutch/action-card@0.7.3-alpha.1`
- `@agentclutch/loop@0.7.3-alpha.1`
- `@agentclutch/core@0.7.3-alpha.1`
- `@agentclutch/recorder@0.7.3-alpha.1`
- `@agentclutch/playwright@0.7.3-alpha.1`
- `@agentclutch/react@0.7.3-alpha.1`
- `@agentclutch/cli@0.7.3-alpha.1`

Completed v0.7 Goals:

- consequence registry
- reversibility metadata
- compensation metadata
- residue metadata
- Action Card consequence display
- Viewer consequence display
- Run Story consequence summaries

Next Planned Work:

- monitor public feedback/issues
- keep future public releases and npm publishes behind explicit approval
- evaluate MCP / AG-UI / CHAP only after the core alpha loop is stable

Do NOT build yet:

- MCP
- AG-UI
- CHAP
- cloud sync
- desktop overlay

Current Git Tag:

`v0.7.3-alpha.1` public prerelease tag is cut from verified `main` for the latest npm alpha.
