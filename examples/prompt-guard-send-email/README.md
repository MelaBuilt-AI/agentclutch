# prompt-guard-send-email

This example documents the `prompt_guard` adoption path: a prompt-based app is about to send one consequential email and asks AgentClutch for approval before executing.

## Scenario

A user asks an app to send a follow-up email. The app prepares the message, creates an Action Proposal in `prompt_guard` mode, renders an Action Card, and only sends if the user approves.

## Shape

```ts
import { createClutch } from "@agentclutch/core";

const clutch = createClutch({ runId: "run_email_001", renderer });

const { decision, resumeContext } = await clutch.confirmAction({
  userGoal: {
    original: "Send a follow-up email to the client",
    summary: "Send follow-up email"
  },
  proposedAction: {
    kind: "email.send",
    label: "Send email",
    targetSurface: "email",
    targetApp: "Gmail",
    rawInput: {
      to: "client@example.com",
      subject: "Follow-up from today"
    }
  },
  visibleContext: {
    fields: {
      to: "client@example.com",
      subject: "Follow-up from today"
    }
  },
  riskHints: {
    requiresApproval: true,
    reversibility: "not_reversible",
    blastRadius: "external"
  }
});

if (decision.type === "approve_once") {
  await sendEmail();
}
```

## Safety Notes

- Do not include unredacted private email bodies unless the user explicitly expects them in the Action Card.
- Redact tokens, signatures, and hidden headers.
- A block decision should re-plan without sending the same message.
