import { describe, expect, it } from "vitest";
import {
  ActionCardJsonSchema,
  ActionCardValidationError,
  buildActionCard,
  isActionCard,
  parseActionCard,
  validateActionCard
} from "../src";

const card = buildActionCard({
  id: "acard_test_1",
  run_id: "run_test_1",
  created_at: "2026-06-22T04:00:00.000Z",
  agent: { name: "demo-agent", runtime: "playwright" },
  proposed_action: {
    id: "act_1",
    kind: "browser.form_submit",
    label: "Submit expense report",
    surface: "browser",
    target: {
      surface: "browser",
      target_app: "FakeExpense",
      page_title: "Expense Report",
      selector: "#submit-report",
      button_text: "Submit Report"
    },
    changed_fields: [
      { field: "amount", after: "$231.47", editable: true }
    ]
  },
  consequence: {
    class: "external_business_submission",
    label: "External business submission",
    reversibility: "not_cleanly_reversible",
    blast_radius: "single_user",
    requires_confirmation: true
  },
  risk: {
    level: "high",
    score: 82,
    reasons: ["The action submits a business record outside the local page."]
  }
});

describe("ActionCard", () => {
  it("builds a valid card with default evidence and user options", () => {
    expect(card).toMatchObject({
      type: "agentclutch.action_card.v0",
      evidence: [],
      user_options: ["approve_once", "edit_fields", "take_wheel", "block"]
    });
    expect(isActionCard(card)).toBe(true);
  });

  it("parses a valid card", () => {
    const parsed = parseActionCard(card);

    expect(parsed.id).toBe(card.id);
    expect(parsed.proposed_action.changed_fields?.[0]?.field).toBe("amount");
  });

  it("accepts lesson decision options", () => {
    const parsed = parseActionCard({
      ...card,
      user_options: [
        "accept_lesson",
        "reject_lesson",
        "disable_lesson",
        "block",
      ],
    });

    expect(parsed.user_options).toEqual([
      "accept_lesson",
      "reject_lesson",
      "disable_lesson",
      "block",
    ]);
  });

  it("returns validation issues without throwing", () => {
    const result = validateActionCard({
      ...card,
      risk: { ...card.risk, score: 101 }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues[0]?.path).toEqual(["risk", "score"]);
    }
  });

  it("throws a typed validation error for invalid cards", () => {
    expect(() =>
      parseActionCard({
        ...card,
        proposed_action: { ...card.proposed_action, surface: "printer" }
      })
    ).toThrow(ActionCardValidationError);
  });

  it("exports the canonical JSON schema metadata", () => {
    expect(ActionCardJsonSchema.$id).toBe(
      "https://agentclutch.dev/schemas/action-card.schema.json"
    );
    expect(ActionCardJsonSchema.properties.type.const).toBe(
      "agentclutch.action_card.v0"
    );
  });
});
