# @agentclutch/playwright

Playwright adapter for AgentClutch Action Cards, rules, and takeover UX.

This package is part of [AgentClutch](https://github.com/MelaBuilt-AI/agentclutch): the local-first Action Card and takeover UX layer for consequential AI agent actions.

## Status

`0.7.3-alpha.0` is the first published npm alpha version. Prefer installing with the explicit `@alpha` tag until AgentClutch is stable.

## Install

```bash
pnpm add @agentclutch/playwright@alpha playwright
```

## Minimal usage

```ts
import { attachClutch } from "@agentclutch/playwright";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5173");

const clutch = await attachClutch(page, {
  runId: "run_checkout_001",
  agentName: "checkout-agent",
});

const result = await clutch.click("#checkout", {
  kind: "browser.checkout",
  label: "Complete checkout",
  targetApp: "FakeStore",
  changedFields: [
    { field: "product", after: "Wireless Headphones Pro", editable: false },
    { field: "quantity", after: 1, editable: true },
  ],
  riskHints: {
    requiresApproval: true,
    reversibility: "compensable",
    blastRadius: "single_user",
  },
});

console.log(result.decision.type, result.executed);
await browser.close();
```

## Package role

Use this package to guard explicit Playwright browser actions with Action Cards, local rules, and resume context.

Headless note: interactive `require_clutch` flows need a GUI/human decision. For CI and WSL automation, use seeded demo flows or tests that do not wait for a live overlay decision.

Links: [root README](../../README.md), [quickstart](../../docs/quickstart.md), [known limitations](../../docs/limitations.md), [Playwright docs](../../docs/playwright.md).
