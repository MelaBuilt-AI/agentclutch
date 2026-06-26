import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { runExpenseSubmitExample } from "../src/index.js";

describe("expense-submit runnable example", () => {
  it("creates an editable expense Action Card and submits the edited payload", async () => {
    const result = await runExpenseSubmitExample();

    expect(result.card.proposed_action.kind).toBe("browser.form_submit");
    expect(result.card.consequence.class).toBe("external_business_submission");
    expect(result.decision.type).toBe("edit");
    expect(result.submittedExpense).toMatchObject({
      merchant: "City Hotel",
      amountUsd: 438.72,
      category: "Travel",
    });
    expect(result.resumeContext.decision.type).toBe("edit");
  });

  it("uses an isolated temporary lessons root", async () => {
    const result = await runExpenseSubmitExample();

    expect(result.lessonsRootDir.startsWith(tmpdir())).toBe(true);
    await expect(access(result.lessonsRootDir)).rejects.toThrow();
  });
});
