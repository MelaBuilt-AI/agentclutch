# AgentClutch Status

Current milestone:
v0.7.3-alpha.3 Release Candidate Preparation

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

`v0.7.3-alpha.2` remains live as the latest public GitHub release and npm alpha. All eight release manifests (the private monorepo root plus seven public packages) are prepared at `0.7.3-alpha.3` for the next immutable candidate. The exact candidate must pass branch CI and the read-only Alpha Release Prep rehearsal before its tag is created or any package is staged; no `v0.7.3-alpha.3` tag, npm stage, approval, or publication exists yet.

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

- [x] Squash-merge PR [#8](https://github.com/MelaBuilt-AI/agentclutch/pull/8) with its hardened OIDC staged-publishing workflow and defense-in-depth checks.
- [x] Configure npm trusted publishing separately for all seven packages using `MelaBuilt-AI/agentclutch`, exact workflow filename `stage-alpha.yml`, blank environment, and the stage-only allowed action; retain no token/OTP fallback.
- [x] Prepare all eight release manifests at the next immutable version, `0.7.3-alpha.3`, in a separate version branch/PR.
- [ ] Require green branch CI plus a successful read-only Alpha Release Prep rehearsal, and inspect both Ubuntu and Windows packed artifacts before tagging.
- [ ] Merge the version PR, create exact tag `v0.7.3-alpha.3`, and prove the complete OIDC stage → npm 2FA approval → registry verification path; never republish immutable `0.7.3-alpha.2`.
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
