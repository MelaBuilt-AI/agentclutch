# Launch Checklist

Use this checklist before making the repository public and before publishing the first npm alpha.

## Positioning

- [ ] README tagline is visible in the first viewport.
- [ ] A new visitor can explain AgentClutch in under 30 seconds.
- [ ] README states the core chain: Action Proposal -> Action Card -> Clutch Decision -> Resume Context -> Run Story.
- [ ] README says AgentClutch is not a generic agent framework, chat UI, browser agent, observability dashboard, or hosted approval product.
- [ ] Rules are described as explicit `allow`, `block`, and `require_clutch` control policy.
- [ ] Lessons are described as correction memory that does not silently approve future actions.
- [ ] README and release notes make alpha maturity clear.

## Public GitHub readiness

- [ ] Repo description and topics are ready.
- [ ] License is visible and correct.
- [ ] README links to quickstart, npm publishing notes, demo script, architecture, examples, and Run Story docs.
- [ ] README uses real local demo/viewer assets, not launch placeholders.
- [ ] No docs imply npm packages are already published before they are actually published.
- [ ] No private tester workflow remains as a launch blocker.

## npm alpha readiness

- [ ] `@agentclutch` npm scope ownership/access is confirmed.
- [ ] Publishable packages are limited to `packages/*` SDK/CLI packages.
- [ ] Root package, apps, and examples remain unpublished.
- [ ] Publishable package versions are set to `0.7.3-alpha.0`.
- [ ] Publishable package metadata includes repository, homepage, bugs, engines, keywords, and `publishConfig`.
- [ ] Package README files exist for each publishable package.
- [ ] Publish dry-runs pass with `--tag alpha --access public`.
- [ ] Tarball smoke install passes from `/tmp` before real publish.

## Demo

- [ ] `pnpm install --frozen-lockfile` completes.
- [ ] `pnpm build` completes.
- [ ] `pnpm exec playwright install chromium` completes.
- [ ] `pnpm demo:checkout --clear-rules` opens the fake store in a GUI environment.
- [ ] The Action Card highlights `#checkout`.
- [ ] `approve_once` completes checkout.
- [ ] Editing quantity records a patch and completes edited checkout.
- [ ] `block` prevents checkout.
- [ ] `create_rule` writes a local `require_clutch` rule.
- [ ] `xvfb-run -a pnpm demo:checkout --seed-allow-rule` passes in WSL/headless automation.
- [ ] `xvfb-run -a pnpm demo:checkout --seed-block-rule` passes in WSL/headless automation.
- [ ] `--seed-require-clutch-rule` shows the Action Card in a GUI/human run or is documented as interactive.

## Run Story

- [ ] Demo runs write `.agentclutch/runs/<run_id>/events.jsonl`.
- [ ] `pnpm --filter @agentclutch/action-card-viewer dev` starts the viewer.
- [ ] The viewer renders the sample Action Card.
- [ ] The viewer accepts recorder JSONL from a demo run.
- [ ] The Run Story timeline describes the proposed action, decision, and resume context.

## Docs

- [ ] `docs/quickstart.md` works from a clean clone.
- [ ] `docs/npm-publishing.md` matches package metadata and publish order.
- [ ] `docs/demo-script.md` matches current CLI flags.
- [ ] `examples/README.md` summarizes all adoption examples.
- [ ] `RELEASE_NOTES-v0.7.3-alpha.md` is accurate and marked as draft until public release approval.
- [ ] Roadmap stays focused on local-first launch polish, examples, tests, stable core artifacts, and npm alpha readiness.

## Quality

- [ ] `pnpm build` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes.
- [ ] `git diff --check` passes.
- [ ] GitHub Actions Build/Test pass on Ubuntu and Windows.
- [ ] No launch doc claims product behavior that is not implemented.
- [ ] No secrets, real user data, private URLs, local run logs, or sensitive generated files appear in screenshots, media assets, package tarballs, or docs.

## Approval gates

- [ ] User explicitly approves making the GitHub repo public.
- [ ] User explicitly approves publishing npm alpha packages.
- [ ] User explicitly approves any GitHub Release creation.
