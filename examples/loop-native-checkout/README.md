# loop-native-checkout

This example documents the `loop_native` adoption path: an engineered browser-shopping loop explicitly proposes checkout and consumes a structured resume context.

## Scenario

The agent loop has already observed the page, selected a product, and prepared checkout. Before clicking the checkout button, it emits an Action Proposal and waits for AgentClutch.

## Shape

```ts
import { normalizeActionProposal } from "@agentclutch/loop";

const proposal = normalizeActionProposal({
  sourceMode: "loop_native",
  loopId: "loop_checkout_001",
  stepId: "step_checkout",
  agent: {
    runtime: "playwright",
    name: "shopping-agent"
  },
  userGoal: {
    summary: "Buy selected headphones"
  },
  proposedAction: {
    kind: "browser.checkout",
    label: "Complete checkout",
    targetSurface: "browser",
    targetApp: "FakeStore",
    targetIdentifier: "#checkout",
    rawInput: {
      selector: "#checkout"
    }
  },
  visibleContext: {
    pageTitle: "FakeStore Checkout Demo",
    highlightedSelector: "#checkout",
    fields: {
      product: "Wireless Headphones Pro",
      total: "$249.00"
    }
  },
  riskHints: {
    requiresApproval: true,
    reversibility: "compensable",
    blastRadius: "single_user"
  }
});

const { decision, resumeContext } = await clutch.onActionProposed(proposal);

await agentLoop.resume(resumeContext);
```

## Safety Notes

- The loop should execute checkout only after `approve_once`.
- `takeover` should let the human operate the browser and then force the agent to observe current state before continuing.
- `block` should re-plan without trying the same checkout action.
