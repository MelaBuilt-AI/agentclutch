import { buildActionCard, type ActionCard } from "@agentclutch/action-card";

export const sampleActionCard: ActionCard = buildActionCard({
  id: "acard_sample_checkout",
  run_id: "run_sample_checkout",
  created_at: "2026-06-22T04:00:00.000Z",
  agent: {
    name: "demo-shopping-agent",
    runtime: "playwright",
  },
  proposed_action: {
    id: "act_sample_checkout",
    kind: "browser.checkout",
    label: "Complete checkout",
    description: "Complete checkout for Wireless Headphones Pro",
    surface: "browser",
    target: {
      surface: "browser",
      target_app: "FakeStore",
      selector: "#checkout",
      button_text: "Complete checkout",
      page_title: "FakeStore Checkout Demo",
      url: "file:///fake-store.html",
    },
    changed_fields: [
      {
        field: "product",
        after: "Wireless Headphones Pro",
        editable: false,
      },
      {
        field: "quantity",
        after: 1,
        editable: true,
      },
      {
        field: "total",
        after: "$249.00",
        editable: false,
      },
    ],
    raw: {
      selector: "#checkout",
      action: "click",
    },
  },
  consequence: {
    class: "payment_or_purchase",
    label: "Payment or purchase",
    description: "This action may spend money or place an order.",
    reversibility: "compensable",
    blast_radius: "single_user",
    requires_confirmation: true,
    possible_residue: ["Order record may be created"],
    compensation_hint: "Cancel order or request refund if available.",
  },
  risk: {
    level: "high",
    score: 72,
    reasons: [
      "This action requires explicit confirmation.",
      "This action may need a compensating action to undo.",
    ],
  },
  evidence: [
    {
      id: "ev_product_page",
      label: "Selected product",
      source_type: "dom",
      source_ref: "#product-title",
      summary: "Wireless Headphones Pro is selected in the fake store.",
    },
    {
      id: "ev_cart_total",
      label: "Cart total",
      source_type: "dom",
      source_ref: "#cart-total",
      summary: "The cart total shown before checkout is $249.00.",
    },
  ],
  user_options: [
    "approve_once",
    "edit_fields",
    "take_wheel",
    "block",
    "create_rule",
  ],
});

const sampleProposal = {
  type: "agentclutch.action_proposal.v0",
  id: "sample_checkout",
  loopId: "loop_sample_checkout",
  stepId: "step_checkout",
  createdAt: "2026-06-22T04:00:00.000Z",
  sourceMode: "loop_native",
  agent: {
    name: "demo-shopping-agent",
    runtime: "playwright",
  },
  userGoal: {
    summary: "Buy the selected headphones from the demo store.",
  },
  proposedAction: {
    kind: "browser.checkout",
    label: "Complete checkout",
    targetSurface: "browser",
    targetApp: "FakeStore",
    targetIdentifier: "#checkout",
  },
  visibleContext: {
    pageTitle: "FakeStore Checkout Demo",
    url: "file:///fake-store.html",
    highlightedSelector: "#checkout",
    fields: {
      product: "Wireless Headphones Pro",
      quantity: 1,
      total: "$249.00",
      buttonText: "Complete checkout",
    },
  },
  loopContext: {
    previousStepIds: ["step_cart_review"],
    whyNow: "The selected cart is ready for checkout.",
    confidence: 0.86,
  },
  evidence: [
    {
      label: "Cart total",
      source: "#cart-total",
      summary: "The cart total shown before checkout is $249.00.",
    },
  ],
};

const sampleDecision = {
  type: "approve_once",
  approvedBy: "Demo User",
  decidedAt: "2026-06-22T04:00:20.000Z",
  note: "Looks correct for the demo.",
};

export const sampleRecorderEvents = [
  {
    type: "agentclutch.loop_event.v0",
    id: "evt_sample_action_proposed",
    loopId: "loop_sample_checkout",
    stepId: "step_checkout",
    eventType: "action.proposed",
    timestamp: "2026-06-22T04:00:00.000Z",
    payload: sampleProposal,
  },
  sampleActionCard,
  {
    type: "agentclutch.loop_event.v0",
    id: "evt_sample_user_decision",
    loopId: "loop_sample_checkout",
    stepId: "step_checkout",
    eventType: "user.decision",
    timestamp: "2026-06-22T04:00:20.000Z",
    payload: sampleDecision,
  },
  {
    type: "agentclutch.loop_event.v0",
    id: "evt_sample_resume_context",
    loopId: "loop_sample_checkout",
    stepId: "step_checkout",
    eventType: "resume_context.created",
    timestamp: "2026-06-22T04:00:21.000Z",
    payload: {
      type: "agentclutch.loop_resume_context.v0",
      loopId: "loop_sample_checkout",
      stepId: "step_checkout",
      proposalId: "sample_checkout",
      sourceMode: "loop_native",
      decision: sampleDecision,
      continuePolicy: {
        allowSameActionRetry: true,
        requireApprovalForSimilarActions: false,
        maxRetries: 1,
      },
    },
  },
  {
    type: "agentclutch.loop_event.v0",
    id: "evt_sample_action_executed",
    loopId: "loop_sample_checkout",
    stepId: "step_checkout",
    eventType: "action.executed",
    timestamp: "2026-06-22T04:00:30.000Z",
    payload: {
      summary: "Checkout completed in the demo store",
    },
  },
];

export const sampleRecorderEventsJsonl = `${sampleRecorderEvents
  .map((event) => JSON.stringify(event))
  .join("\n")}\n`;
