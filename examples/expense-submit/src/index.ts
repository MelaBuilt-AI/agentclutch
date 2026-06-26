import { createClutch, type DecisionRenderer } from "@agentclutch/core";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const decidedAt = "2026-06-26T18:00:00.000Z";

export interface ExpenseDraft {
  merchant: string;
  amountUsd: number;
  category: string;
  memo: string;
  receiptId: string;
}

class MemoryRecorder {
  readonly events: unknown[] = [];

  async record(event: unknown): Promise<void> {
    this.events.push(event);
  }
}

const editExpenseRenderer: DecisionRenderer = {
  async decide() {
    return {
      type: "edit",
      approvedBy: "finance-reviewer",
      decidedAt,
      patch: [
        {
          op: "replace",
          path: "/amountUsd",
          from: 483.72,
          value: 438.72,
          reason: "Receipt total was $438.72; the OCR draft transposed digits.",
        },
      ],
      note: "Approved after correcting the amount.",
    };
  },
};

export async function runExpenseSubmitExample() {
  const recorder = new MemoryRecorder();
  const lessonsRootDir = await mkdtemp(
    join(tmpdir(), "agentclutch-expense-lessons-"),
  );
  const clutch = createClutch({
    runId: "run_expense_submit_example",
    renderer: editExpenseRenderer,
    recorder,
    lessonsRootDir,
  });
  const draft: ExpenseDraft = {
    merchant: "City Hotel",
    amountUsd: 483.72,
    category: "Travel",
    memo: "Client onsite - two nights",
    receiptId: "receipt_city_hotel_042",
  };

  try {
    const result = await clutch.confirmAction({
      userGoal: {
        original: "Submit my hotel receipt for reimbursement.",
        summary: "Submit a travel expense report",
      },
      proposedAction: {
        kind: "browser.form_submit",
        label: "Submit expense report",
        targetSurface: "browser",
        targetApp: "ExpensePortal",
        targetIdentifier: "#submit-expense",
        rawInput: {
          ...draft,
          changedFields: [
            { field: "merchant", after: draft.merchant, editable: true },
            {
              field: "amountUsd",
              before: null,
              after: draft.amountUsd,
              editable: true,
            },
            { field: "category", after: draft.category, editable: true },
            { field: "receiptId", after: draft.receiptId, editable: false },
          ],
        },
      },
      visibleContext: {
        pageTitle: "ExpensePortal - New Report",
        highlightedSelector: "#submit-expense",
        fields: {
          merchant: draft.merchant,
          amountUsd: draft.amountUsd,
          category: draft.category,
          memo: draft.memo,
        },
      },
      riskHints: {
        requiresApproval: true,
        reversibility: "not_reversible",
        blastRadius: "single_user",
      },
      evidence: [
        {
          label: "Receipt OCR",
          source: "receipt_city_hotel_042.pdf",
          summary:
            "OCR detected City Hotel and a total that needs human review.",
        },
        {
          label: "Company policy",
          source: "travel-policy",
          summary: "Hotel expenses over $250 require review before submission.",
        },
      ],
    });

    const submittedExpense =
      result.decision.type === "edit"
        ? applyExpensePatch(draft, result.decision.patch)
        : result.decision.type === "approve_once"
          ? draft
          : undefined;

    return {
      proposal: result.proposal,
      card: result.card,
      decision: result.decision,
      resumeContext: result.resumeContext,
      submittedExpense,
      recorderEvents: recorder.events,
      lessonsRootDir,
    };
  } finally {
    await rm(lessonsRootDir, { recursive: true, force: true });
  }
}

function applyExpensePatch(
  draft: ExpenseDraft,
  patch: Array<{ path: string; value?: unknown }>,
): ExpenseDraft {
  const next = { ...draft };

  for (const operation of patch) {
    if (
      operation.path === "/amountUsd" &&
      typeof operation.value === "number"
    ) {
      next.amountUsd = operation.value;
    }
    if (operation.path === "/category" && typeof operation.value === "string") {
      next.category = operation.value;
    }
    if (operation.path === "/memo" && typeof operation.value === "string") {
      next.memo = operation.value;
    }
  }

  return next;
}

function printExampleSummary(name: string, output: unknown): void {
  console.log(`${name} completed:`);
  console.log(JSON.stringify(output, null, 2));
}

function isMainModule(): boolean {
  return process.argv[1]?.endsWith("src/index.ts") ?? false;
}

if (isMainModule()) {
  runExpenseSubmitExample()
    .then((output) => printExampleSummary("expense-submit", output))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
