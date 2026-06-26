import { createClutch, type DecisionRenderer } from "@agentclutch/core";

const decidedAt = "2026-06-26T18:00:00.000Z";

export interface EmailDraft {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
}

class MemoryRecorder {
  readonly events: unknown[] = [];

  async record(event: unknown): Promise<void> {
    this.events.push(event);
  }
}

const approveRenderer: DecisionRenderer = {
  async decide() {
    return {
      type: "approve_once",
      approvedBy: "message-owner",
      decidedAt,
      note: "Recipient, subject, and body preview are approved."
    };
  }
};

export async function runPromptGuardSendEmailExample() {
  const recorder = new MemoryRecorder();
  const clutch = createClutch({
    runId: "run_prompt_guard_send_email_example",
    renderer: approveRenderer,
    recorder
  });
  const draft: EmailDraft = {
    to: ["client@example.com"],
    cc: ["account-team@example.com"],
    subject: "Next steps from today",
    body:
      "Hi Sam,\n\nThanks for the call today. Here are the next steps we discussed: confirm scope, share the launch checklist, and pick a review window.\n\nBest,\nAlex"
  };

  const result = await clutch.confirmAction({
    userGoal: {
      original: "Send a follow-up email to the client with the next steps.",
      summary: "Send client follow-up email"
    },
    proposedAction: {
      kind: "email.send",
      label: "Send client follow-up email",
      targetSurface: "email",
      targetApp: "Gmail",
      targetIdentifier: draft.to.join(", "),
      rawInput: {
        ...draft,
        changedFields: [
          { field: "to", after: draft.to, editable: true },
          { field: "cc", after: draft.cc, editable: true },
          { field: "subject", after: draft.subject, editable: true },
          { field: "bodyPreview", after: draft.body.slice(0, 120), editable: true }
        ]
      }
    },
    visibleContext: {
      pageTitle: "Gmail - Compose",
      fields: {
        to: draft.to.join(", "),
        cc: draft.cc.join(", "),
        subject: draft.subject,
        bodyPreview: draft.body.slice(0, 120)
      }
    },
    riskHints: {
      requiresApproval: true,
      reversibility: "residue",
      blastRadius: "external"
    },
    evidence: [
      {
        label: "User instruction",
        source: "prompt",
        summary: "The user asked for a follow-up email with next steps."
      },
      {
        label: "Visible compose fields",
        source: "gmail-compose",
        summary: "Recipient, CC, subject, and body preview are visible before sending."
      }
    ]
  });

  const sentEmail = result.decision.type === "approve_once" ? draft : undefined;

  return {
    proposal: result.proposal,
    card: result.card,
    decision: result.decision,
    resumeContext: result.resumeContext,
    sentEmail,
    recorderEvents: recorder.events
  };
}

function printExampleSummary(name: string, output: unknown): void {
  console.log(`${name} completed:`);
  console.log(JSON.stringify(output, null, 2));
}

function isMainModule(): boolean {
  return process.argv[1]?.endsWith("src/index.ts") ?? false;
}

if (isMainModule()) {
  runPromptGuardSendEmailExample()
    .then((output) => printExampleSummary("prompt-guard-send-email", output))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
