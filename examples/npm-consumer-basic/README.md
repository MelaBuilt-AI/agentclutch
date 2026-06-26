# npm Consumer Basic

This tiny example shows the public npm consumer path: install `@agentclutch/core@alpha`, create a deterministic renderer, confirm one proposed action, and read the Action Card / decision / resume context.

It intentionally imports only from the npm package API. There are no workspace-only imports.

## Copy into a fresh project

```bash
mkdir agentclutch-npm-consumer-basic
cd agentclutch-npm-consumer-basic
pnpm init
pnpm pkg set type=module
pnpm add @agentclutch/core@alpha
pnpm add -D tsx typescript @types/node
mkdir -p src
```

Copy [`src/index.ts`](src/index.ts), then run:

```bash
pnpm exec tsx src/index.ts
```

## From this repo

After installing dependencies and building the workspace:

```bash
pnpm --filter @agentclutch/example-npm-consumer-basic start
```

## Expected output

The exact generated IDs are intentionally omitted, but the important fields should look like:

```json
{
  "cardType": "agentclutch.action_card.v0",
  "action": "Send follow-up email",
  "consequence": "external_message_send",
  "decision": "approve_once",
  "resumePolicy": {
    "allowSameActionRetry": true,
    "requireApprovalForSimilarActions": false,
    "maxRetries": 1
  }
}
```

## Notes

- Use explicit `@alpha` installs while AgentClutch is alpha-stage.
- Keep private message bodies, tokens, and customer data out of recorded `rawInput`; use previews and redacted metadata where possible.
- See the [Quickstart](../../docs/quickstart.md), [Known Limitations](../../docs/limitations.md), and [Security Policy](../../SECURITY.md).
