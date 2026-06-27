# Playwright Adapter

`@agentclutch/playwright` provides an explicit wrapper for browser actions.

## Attach

```ts
import { attachClutch } from "@agentclutch/playwright";

const clutch = await attachClutch(page, {
  runId: "run_001",
  agentName: "browser-agent",
  recorder
});
```

## Click

```ts
await clutch.click("#checkout", {
  kind: "browser.checkout",
  label: "Complete checkout"
});
```

## Submit

```ts
await clutch.submit("form#payment", {
  kind: "browser.form_submit",
  label: "Submit payment form"
});
```

## Behavior

The adapter:

1. Converts the browser action into `ActionProposalInput`.
2. Sets `sourceMode` to `tool_wrapper`.
3. Normalizes the proposal with `@agentclutch/loop`.
4. Builds an Action Card.
5. Shows the browser overlay.
6. Builds `LoopResumeContext`.
7. Executes only on `approve_once`.

`block`, `edit_fields`, `take_wheel`, and `create_rule` do not execute the original browser action in the MVP.

## No Monkey Patching

The MVP does not monkey-patch Playwright. Call `clutch.click` or `clutch.submit` explicitly.
