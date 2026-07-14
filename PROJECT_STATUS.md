# AgentClutch Status

Current milestone:
Post-v0.7.3-alpha.3 Public Alpha

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

`v0.7.3-alpha.3` is live as the current public GitHub prerelease and npm alpha. All seven packages were staged through the stage-only `stage-alpha.yml` GitHub Actions OIDC path, approved by a maintainer with npm 2FA, and published with npm SLSA provenance. The exact-tag registry verification and an independent clean installation/CLI smoke passed with zero audit vulnerabilities. The `alpha` dist-tag points to `0.7.3-alpha.3`; the legacy `latest` dist-tag remains unchanged at `0.7.3-alpha.0`.

Published npm alpha packages:

- `@agentclutch/action-card@0.7.3-alpha.3`
- `@agentclutch/loop@0.7.3-alpha.3`
- `@agentclutch/recorder@0.7.3-alpha.3`
- `@agentclutch/core@0.7.3-alpha.3`
- `@agentclutch/react@0.7.3-alpha.3`
- `@agentclutch/playwright@0.7.3-alpha.3`
- `@agentclutch/cli@0.7.3-alpha.3`

Completed v0.7 Goals:

- consequence registry
- reversibility metadata
- compensation metadata
- residue metadata
- Action Card consequence display
- Viewer consequence display
- Run Story consequence summaries

Next Up — Public Onboarding Sprint (execute in order):

1. [ ] **Close the npm security loop:** revoke obsolete npm automation tokens, if any remain; retain stage-only Trusted Publishing plus human 2FA approval; disallow traditional-token publishing where package settings permit it.
2. [ ] **Run the public stranger test — highest priority:** start from a disposable fresh clone and clean npm consumer project, follow only the public README, run the quickstart, install from npm `@alpha`, run CLI help/smoke, and complete one minimal integration path. Capture exact commands, timings, screenshots, and friction.
3. [ ] **Convert confirmed friction into a focused public issue batch:** create small actionable issues from stranger-test evidence, then consider the known candidates:
   - improve CLI npm UX and consider `agentclutch doctor`;
   - improve the npm CLI demo experience and decide whether FakeStore assets should ship, be fetched, or be generated;
   - add a minimal React/Vite consumer example using public npm packages;
   - document integration into an existing agent loop;
   - add security/data-redaction examples for Action Cards, JSONL, Run Stories, screenshots, and logs.
4. [ ] **Choose the next product milestone from evidence:** prioritize making AgentClutch easy to try from npm without cloning the repository; treat `agentclutch doctor` and an npm-native demo as hypotheses until the stranger test confirms the need.
5. [ ] **Publish a small public-alpha update:** link the quickstart, known limitations, npm packages, GitHub prerelease, and feedback/issues page.

Ongoing guardrails:

- [ ] Keep monitoring public feedback/issues.
- [ ] Keep future public releases and npm publishes behind explicit user approval.
- [ ] Keep release automation stage-only with human npm 2FA approval.
- [ ] Keep MCP, AG-UI, CHAP, hosted approval dashboards, Python/Rust adapters, cloud sync, and desktop overlays parked until the core public-alpha onboarding loop is stable.

Do NOT build yet:

- MCP
- AG-UI
- CHAP
- cloud sync
- desktop overlay

Current Git Tag:

`v0.7.3-alpha.3` is the current public prerelease tag and npm alpha checkpoint.
