# Known Limitations and Non-Goals

AgentClutch `0.7.3-alpha.3` is an early public alpha. It is useful for trying the Action Proposal -> Action Card -> Clutch Decision -> Resume Context -> Run Story loop, but the package boundaries and APIs may still change.

## Current alpha scope

AgentClutch focuses on one control moment: before an AI agent performs a consequential action, show a human an inspectable card and return a structured decision to the host app or loop.

Included today:

- Local Action Card construction and validation.
- Consequence, reversibility, compensation, residue, and risk metadata.
- `prompt_guard`, `tool_wrapper`, and `loop_native` adoption paths.
- Local JSONL recorder and Run Story helpers.
- Local rules and lesson reuse for user corrections.
- Playwright browser adapter and local FakeStore demo.
- React-compatible Action Card and Run Story UI primitives.
- CLI demo and run inspection helpers.

## Product non-goals for this alpha

AgentClutch is not currently:

- A hosted approval product or SaaS dashboard.
- A cloud sync service.
- A desktop overlay.
- A generic browser agent, autonomous agent runtime, chat UI, or observability platform.
- A replacement for native browser, OS, enterprise, legal, compliance, or payment confirmation prompts.
- A policy engine that can guarantee every side effect is safe.

## Integration gaps

These integrations are not included yet:

- MCP tool-call bridge.
- AG-UI bridge.
- CHAP export or compatibility layer.
- Multi-agent orchestration integrations.
- Hosted identity, team policy, or audit storage.

## Demo and automation caveats

- The interactive browser demo needs a GUI and a human decision for `require_clutch` flows.
- The npm CLI package has a registry-safe `smoke` command, but the full FakeStore browser demo currently requires demo assets from a source checkout.
- In WSL, CI, or terminal-only automation, prefer seeded flows:

```bash
xvfb-run -a pnpm demo:checkout --seed-allow-rule
pnpm agentclutch inspect latest
xvfb-run -a pnpm demo:checkout --seed-block-rule
pnpm agentclutch inspect latest
```

- Seeded flows are verification aids. They do not replace testing the live Action Card decision flow in a GUI.

## npm alpha caveat

The current npm alpha is `0.7.3-alpha.3` under the `@agentclutch/*` scope. npm's `latest` dist-tag deliberately remains on `0.7.3-alpha.0`.

Until a stable release exists, prefer explicit `@alpha` installs:

```bash
pnpm add @agentclutch/core@alpha
pnpm add @agentclutch/react@alpha
pnpm add @agentclutch/playwright@alpha playwright
pnpm dlx @agentclutch/cli@alpha smoke
pnpm dlx @agentclutch/cli@alpha --help
```

pnpm 11's default 24-hour `minimumReleaseAge` can select the previous alpha immediately after a release. Use npm with the exact version for same-day reproducibility, or add only `@agentclutch/*` to a project's `minimumReleaseAgeExclude`; do not disable the global safety delay.

## Security and data handling limits

AgentClutch is local-first, but Action Cards, recorder JSONL, Run Stories, and screenshots can contain sensitive action metadata. Integrators should redact or avoid storing:

- secrets, API keys, cookies, tokens, passwords, and private keys;
- full email or chat bodies when a preview is enough;
- private file contents;
- regulated personal, customer, health, or financial data;
- unnecessary absolute local filesystem paths.

See [Security Policy](../SECURITY.md) for reporting and sensitive-data guidance.

## What to try next

- [Quickstart](quickstart.md)
- [Minimal npm consumer example](../examples/npm-consumer-basic/README.md)
- [Examples index](../examples/README.md)
- [Run Story docs](run-story.md)
