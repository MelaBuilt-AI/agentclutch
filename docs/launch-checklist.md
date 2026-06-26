# Launch Checklist

Use this checklist before sharing the repository with a new GitHub visitor.

## Positioning

- [ ] README tagline is visible in the first viewport.
- [ ] A new visitor can explain AgentClutch in under 30 seconds.
- [ ] README states the core chain: Action Proposal -> Action Card -> Clutch Decision -> Resume Context -> Run Story.
- [ ] README says AgentClutch is not a generic agent framework, chat UI, browser agent, observability dashboard, or hosted approval product.
- [ ] Rules are described as explicit `allow`, `block`, and `require_clutch` control policy.
- [ ] Future Teach Mode is described only as future preference and correction memory, with no current behavior implied.

## Demo

- [ ] `pnpm install` completes.
- [ ] `pnpm build` completes.
- [ ] `pnpm exec playwright install chromium` completes.
- [ ] `pnpm demo:checkout --clear-rules` opens the fake store.
- [ ] The Action Card highlights `#checkout`.
- [ ] `approve_once` completes checkout.
- [ ] Editing quantity records a patch and completes edited checkout.
- [ ] `block` prevents checkout.
- [ ] `create_rule` writes a local `require_clutch` rule.
- [ ] `--seed-allow-rule` skips the overlay and completes checkout.
- [ ] `--seed-block-rule` skips the overlay and prevents checkout.
- [ ] `--seed-require-clutch-rule` shows the Action Card.

## Run Story

- [ ] Demo runs write `.agentclutch/runs/<run_id>/events.jsonl`.
- [ ] `pnpm --filter @agentclutch/action-card-viewer dev` starts the viewer.
- [ ] The viewer renders the sample Action Card.
- [ ] The viewer accepts recorder JSONL from a demo run.
- [ ] The Run Story timeline describes the proposed action, decision, and resume context.

## Docs

- [ ] `docs/demo-script.md` matches current CLI flags.
- [ ] `examples/README.md` summarizes all three adoption examples.
- [ ] README links to demo script, launch checklist, architecture, examples, and Run Story docs.
- [ ] README uses real local demo screenshot/GIF assets, not launch placeholders.
- [ ] Roadmap stays focused on local-first launch polish, examples, tests, and stable core artifacts.

## Quality

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] No launch doc claims product behavior that is not implemented.
- [ ] No secrets, real user data, or private URLs appear in screenshots, media assets, run files, or docs.
