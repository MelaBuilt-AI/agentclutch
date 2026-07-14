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
2. [x] **Run the public stranger test:** completed from a disposable fresh clone plus clean pnpm/npm consumer projects. Source build/typecheck/lint/tests, seeded allow/block demos, registry CLI smoke/help, the no-build npm integration, dependency-tree validation, and audit passed; the temporary environment was removed and cleanup verified.
3. [x] **Resolve confirmed stranger-test friction:** fixed the public HTTPS clone path, stale alpha references, unsupported `pnpm pkg` command, pnpm 11 release-age/build-approval traps, non-runnable root Quick Start, and non-reproducible Zod tag. Added regressions and a no-build JavaScript consumer. No issues were opened for unconfirmed hypotheses such as `agentclutch doctor`, npm-native FakeStore assets, React/Vite examples, broader loop docs, or additional redaction examples.
4. [ ] **Choose the next product milestone from evidence:** prioritize making AgentClutch easy to try from npm without cloning the repository; treat `agentclutch doctor` and an npm-native demo as hypotheses until further onboarding evidence confirms the need.
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
