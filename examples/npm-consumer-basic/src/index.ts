import { createClutch, type DecisionRenderer } from "@agentclutch/core";

const approveRenderer: DecisionRenderer = {
  async decide() {
    return {
      type: "approve_once",
      approvedBy: "local-demo-user",
      decidedAt: "2026-06-26T18:00:00.000Z",
      note: "Reviewed recipient, subject, and body preview.",
    };
  },
};

const clutch = createClutch({
  runId: "run_npm_consumer_basic",
  renderer: approveRenderer,
});

const result = await clutch.confirmAction({
  userGoal: {
    original: "Send a short follow-up email after the product call.",
    summary: "Send follow-up email",
  },
  proposedAction: {
    kind: "email.send",
    label: "Send follow-up email",
    targetSurface: "email",
    targetApp: "Example Mail",
    targetIdentifier: "customer@example.com",
    rawInput: {
      to: "customer@example.com",
      subject: "Thanks for the product call",
      bodyPreview: "Thanks for meeting today. Here are the next steps...",
      changedFields: [
        { field: "to", after: "customer@example.com", editable: true },
        { field: "subject", after: "Thanks for the product call", editable: true },
        {
          field: "bodyPreview",
          after: "Thanks for meeting today. Here are the next steps...",
          editable: true,
        },
      ],
    },
  },
  visibleContext: {
    pageTitle: "Example Mail - Compose",
    fields: {
      to: "customer@example.com",
      subject: "Thanks for the product call",
      bodyPreview: "Thanks for meeting today. Here are the next steps...",
    },
  },
  riskHints: {
    requiresApproval: true,
    reversibility: "residue",
    blastRadius: "external",
  },
  evidence: [
    {
      label: "User instruction",
      source: "prompt",
      summary: "The user asked the agent to draft and send a follow-up email.",
    },
  ],
});

console.log(
  JSON.stringify(
    {
      cardType: result.card.type,
      action: result.card.proposed_action.label,
      consequence: result.card.consequence.class,
      decision: result.decision.type,
      resumePolicy: result.resumeContext.continuePolicy,
    },
    null,
    2,
  ),
);
