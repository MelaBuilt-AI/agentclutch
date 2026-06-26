# AgentClutch Status

Current milestone:
v0.7.3-alpha Public GitHub + npm Alpha Launch Candidate

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

`v0.7.3-alpha` remains the verified private git checkpoint. The next launch target is a public GitHub + npm alpha launch candidate, with package versions prepared as `0.7.3-alpha.0` and npm publishing planned under the `alpha` dist-tag.

The project is still private until explicit approval. npm packages are prepared but must not be published until explicit approval.

Prepared npm alpha packages:

- `@agentclutch/action-card@0.7.3-alpha.0`
- `@agentclutch/loop@0.7.3-alpha.0`
- `@agentclutch/core@0.7.3-alpha.0`
- `@agentclutch/recorder@0.7.3-alpha.0`
- `@agentclutch/playwright@0.7.3-alpha.0`
- `@agentclutch/react@0.7.3-alpha.0`
- `@agentclutch/cli@0.7.3-alpha.0`

Completed v0.7 Goals:

- consequence registry
- reversibility metadata
- compensation metadata
- residue metadata
- Action Card consequence display
- Viewer consequence display
- Run Story consequence summaries

Next Planned Work:

- run package publish dry-runs for the prepared npm alpha packages
- run tarball install smoke test from `/tmp`
- re-run full launch checklist before public launch decision
- verify GitHub Actions after launch-prep commit
- ask for explicit approval before making the repo public
- ask for explicit approval before publishing npm packages

Do NOT build yet:

- MCP
- AG-UI
- CHAP
- cloud sync
- desktop overlay

Current Git Tag:

`v0.7.3-alpha` private annotated tag cut from verified `main` (`da47b1a6240c66063054681d281903a4cc845dc6`)
