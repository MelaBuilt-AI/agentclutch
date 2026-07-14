# npm Consumer Basic

This tiny example shows the public npm consumer path: install `@agentclutch/core`, create a deterministic renderer, confirm one proposed action, and read the Action Card, decision, and resume context.

It imports only from the npm package API. There are no workspace-only imports and the default JavaScript path needs no TypeScript runner or package build scripts.

## Copy into a fresh project

From a clone of this repository:

```bash
mkdir agentclutch-npm-consumer-basic
cd agentclutch-npm-consumer-basic
npm init -y
npm pkg set type=module
npm install @agentclutch/core@0.7.3-alpha.3
mkdir -p src
cp /path/to/agentclutch/examples/npm-consumer-basic/src/index.mjs src/index.mjs
node src/index.mjs
```

Replace `/path/to/agentclutch` with the HTTPS clone path on your machine. Using npm here is intentional: it avoids pnpm 11's 24-hour `minimumReleaseAge` selection window for a just-published alpha and avoids `tsx`/esbuild build-approval prompts.

## From this repo

After installing dependencies and building the workspace:

```bash
pnpm --filter @agentclutch/example-npm-consumer-basic start
```

The equivalent TypeScript source remains available at [`src/index.ts`](src/index.ts) for TypeScript-first integrations.

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

- `0.7.3-alpha.3` is the current npm alpha. Use exact versions when release-day reproducibility matters.
- After pnpm's release-age safety window has passed, `@agentclutch/core@alpha` tracks the current alpha dist-tag.
- Keep private message bodies, tokens, and customer data out of recorded `rawInput`; use previews and redacted metadata where possible.
- See the [Quickstart](../../docs/quickstart.md), [Known Limitations](../../docs/limitations.md), and [Security Policy](../../SECURITY.md).
