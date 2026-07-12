# AgentClutch Status

Current milestone:
Post-v0.7.3-alpha.2 Release Automation

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
- OIDC trusted staged-publishing and post-approval verification workflow
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

`v0.7.3-alpha.2` is live as the latest public GitHub release and npm alpha. The repository is public, all seven npm packages are published under `@alpha`, GitHub Build/Test are green, and clean registry installation/smoke passed.

Published npm alpha packages:

- `@agentclutch/action-card@0.7.3-alpha.2`
- `@agentclutch/loop@0.7.3-alpha.2`
- `@agentclutch/recorder@0.7.3-alpha.2`
- `@agentclutch/core@0.7.3-alpha.2`
- `@agentclutch/react@0.7.3-alpha.2`
- `@agentclutch/playwright@0.7.3-alpha.2`
- `@agentclutch/cli@0.7.3-alpha.2`

Completed v0.7 Goals:

- consequence registry
- reversibility metadata
- compensation metadata
- residue metadata
- Action Card consequence display
- Viewer consequence display
- Run Story consequence summaries

Next Planned Work / TODO:

- [ ] Configure npm trusted publishing separately for all seven packages using `MelaBuilt-AI/agentclutch`, workflow `stage-alpha.yml`, and the stage-only allowed action.
- [ ] Run the read-only Alpha Release Prep workflow once and inspect its packed artifacts.
- [ ] Prove the complete OIDC stage → npm 2FA approval → registry verification path with the next explicitly approved alpha version; never republish immutable `0.7.3-alpha.2`.
- [ ] After OIDC succeeds, revoke obsolete npm automation tokens and disallow traditional-token publishing where package settings permit it.
- [ ] Run a stranger test of the public project: fresh clone, follow README only, run quickstart, install from npm `@alpha`, run CLI smoke, and try one minimal integration path.
- [ ] Convert stranger-test friction into small public GitHub issues.
- [ ] Seed the next public roadmap issue batch:
  - improve CLI npm UX and consider `agentclutch doctor`;
  - improve npm CLI demo experience and decide whether FakeStore demo assets should ship in the CLI package or be fetched/generated;
  - add a minimal React/Vite consumer example using public npm packages;
  - add docs for integrating AgentClutch into an existing agent loop;
  - keep release automation stage-only with human npm 2FA approval;
  - add security/data redaction examples for Action Cards, JSONL, Run Stories, screenshots, and logs.
- [ ] Draft and post a small public-alpha launch/update post linking the quickstart, limitations, npm packages, and feedback/issues.
- [ ] Make the next product milestone: make AgentClutch easy to try from npm without cloning the repo.
- [ ] Keep monitoring public feedback/issues.
- [ ] Keep future public releases and npm publishes behind explicit user approval.
- [ ] Keep MCP, AG-UI, CHAP, hosted approval dashboards, Python/Rust adapters, cloud sync, and desktop overlays parked until the core public-alpha onboarding loop is stable.

Do NOT build yet:

- MCP
- AG-UI
- CHAP
- cloud sync
- desktop overlay

Current Git Tag:

`v0.7.3-alpha.2` is the current public release tag and npm alpha checkpoint.
