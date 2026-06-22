import {
  buildActionCard,
  type ActionCard as ActionCardModel,
} from "@agentclutch/action-card";
import { describe, expect, it } from "vitest";
import {
  ActionCard,
  DecisionBar,
  EvidencePanel,
  RiskBadge,
  RunStoryTimeline,
  TakeoverModal,
  type ActionCardDecisionType,
  type ReactElement,
  type ReactNode,
  type TakeoverChoice,
} from "../src/index.js";

const createdAt = "2026-06-22T04:00:00.000Z";

describe("ActionCard", () => {
  it("renders the action card fields and decision buttons", () => {
    const decisions: ActionCardDecisionType[] = [];
    const tree = ActionCard({
      card: cardFixture(),
      onDecision: (decision) => decisions.push(decision),
    });

    const text = textContent(tree);

    expect(text).toContain("Complete checkout");
    expect(text).toContain("browser.checkout");
    expect(text).toContain("FakeStore");
    expect(text).toContain("Payment or purchase");
    expect(text).toContain("compensable");
    expect(text).toContain("Selected product");
    expect(text).toContain("#checkout");
    expect(text).toContain("Approve once");
    expect(text).toContain("Block");

    clickButton(tree, "Approve once");
    expect(decisions).toEqual(["approve_once"]);
  });

  it("turns approval into an edit decision when editable fields changed", () => {
    const decisions: Array<{
      decision: ActionCardDecisionType;
      editedFields: unknown;
    }> = [];
    const tree = ActionCard({
      card: cardFixture(),
      onDecision: (decision, editedFields) =>
        decisions.push({ decision, editedFields }),
    });

    inputValue(tree, "Edit quantity", "3");
    clickButton(tree, "Approve once");

    expect(decisions).toEqual([
      {
        decision: "edit_fields",
        editedFields: [
          {
            field: "quantity",
            before: 1,
            after: 3,
            editable: true,
          },
        ],
      },
    ]);
  });

  it("renders applied lessons and lesson decisions", () => {
    const decisions: ActionCardDecisionType[] = [];
    const tree = ActionCard({
      card: cardFixture({
        metadata: {
          applied_lessons: [
            {
              id: "lesson_quantity",
              action_kind: "browser.checkout",
              target_app: "FakeStore",
              field: "quantity",
              original_value: 1,
              corrected_value: 3,
              confidence: 0.8,
              source: "learned from prior correction",
            },
          ],
        },
        user_options: [
          "accept_lesson",
          "reject_lesson",
          "disable_lesson",
          "approve_once",
          "block",
        ],
      }),
      onDecision: (decision) => decisions.push(decision),
    });

    const text = textContent(tree);

    expect(text).toContain("Applied Lesson");
    expect(text).toContain("quantity: 1 -> 3");
    expect(text).toContain("Source: learned from prior correction");

    clickButton(tree, "Accept lesson");
    clickButton(tree, "Reject lesson");
    clickButton(tree, "Disable lesson");

    expect(decisions).toEqual([
      "accept_lesson",
      "reject_lesson",
      "disable_lesson",
    ]);
  });
});

describe("DecisionBar", () => {
  it("calls typed decision callbacks", () => {
    const decisions: ActionCardDecisionType[] = [];
    const tree = DecisionBar({
      onDecision: (decision) => decisions.push(decision),
      allowLessonActions: true,
    });

    clickButton(tree, "Approve once");
    clickButton(tree, "Edit fields");
    clickButton(tree, "Accept lesson");
    clickButton(tree, "Reject lesson");
    clickButton(tree, "Disable lesson");
    clickButton(tree, "Take wheel");
    clickButton(tree, "Block");
    clickButton(tree, "Create rule");

    expect(decisions).toEqual([
      "approve_once",
      "edit_fields",
      "accept_lesson",
      "reject_lesson",
      "disable_lesson",
      "take_wheel",
      "block",
      "create_rule",
    ]);
  });
});

describe("RiskBadge", () => {
  it("visually differentiates risk levels", () => {
    expect(RiskBadge({ level: "low" }).props["className"]).toContain(
      "ac-risk-low",
    );
    expect(RiskBadge({ level: "medium" }).props["className"]).toContain(
      "ac-risk-medium",
    );
    expect(RiskBadge({ level: "high" }).props["className"]).toContain(
      "ac-risk-high",
    );
    expect(RiskBadge({ level: "critical" }).props["className"]).toContain(
      "ac-risk-critical",
    );
  });
});

describe("EvidencePanel", () => {
  it("handles empty evidence gracefully", () => {
    const tree = EvidencePanel({ evidence: [] });

    expect(textContent(tree)).toContain("No evidence attached.");
  });
});

describe("TakeoverModal", () => {
  it("opens, closes, and submits takeover choices", () => {
    let closed = false;
    const choices: TakeoverChoice[] = [];
    const tree = TakeoverModal({
      open: true,
      onClose: () => {
        closed = true;
      },
      onSubmit: (choice) => choices.push(choice),
    });

    expect(tree).not.toBeNull();
    if (tree === null) throw new Error("Expected takeover modal");

    clickButton(tree, "x");
    clickButton(tree, "Resume from current state");

    expect(closed).toBe(true);
    expect(choices).toEqual([{ resumeMode: "resume_from_current_state" }]);
    expect(
      TakeoverModal({
        open: false,
        onClose: () => undefined,
        onSubmit: () => undefined,
      }),
    ).toBeNull();
  });
});

describe("RunStoryTimeline", () => {
  it("renders ordered story steps", () => {
    const tree = RunStoryTimeline({
      steps: [
        {
          timestamp: "2026-06-22T04:02:00.000Z",
          actor: "user",
          text: "The user approved checkout.",
        },
        {
          timestamp: "2026-06-22T04:01:00.000Z",
          actor: "agent",
          text: "The agent proposed checkout.",
        },
      ],
    });
    const listText = textContent(tree);

    expect(listText.indexOf("The agent proposed checkout.")).toBeLessThan(
      listText.indexOf("The user approved checkout."),
    );
  });
});

function cardFixture(
  overrides: Partial<Parameters<typeof buildActionCard>[0]> = {},
): ActionCardModel {
  return buildActionCard({
    id: "acard_test",
    run_id: "run_test",
    created_at: createdAt,
    agent: {
      name: "demo-agent",
      runtime: "playwright",
    },
    proposed_action: {
      id: "act_test",
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
      },
    },
    consequence: {
      class: "payment_or_purchase",
      label: "Payment or purchase",
      reversibility: "compensable",
      blast_radius: "single_user",
      requires_confirmation: true,
    },
    risk: {
      level: "high",
      score: 72,
      reasons: ["This action may spend money."],
    },
    evidence: [
      {
        id: "ev_product",
        label: "Selected product",
        source_type: "dom",
        source_ref: "#product-title",
        summary: "Wireless Headphones Pro is selected.",
      },
    ],
    user_options: [
      "approve_once",
      "edit_fields",
      "accept_lesson",
      "reject_lesson",
      "disable_lesson",
      "take_wheel",
      "block",
      "create_rule",
    ],
    ...overrides,
  });
}

function textContent(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean")
    return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join(" ");
  return textContent(node.props.children);
}

function clickButton(tree: ReactElement, label: string): void {
  const button = findButton(tree, label);

  if (button === undefined) {
    throw new Error(`Button not found: ${label}`);
  }

  const onClick = button.props["onClick"];

  if (typeof onClick !== "function") {
    throw new Error(`Button has no onClick handler: ${label}`);
  }

  onClick();
}

function findButton(node: ReactNode, label: string): ReactElement | undefined {
  if (node === null || node === undefined || typeof node !== "object")
    return undefined;

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButton(child, label);
      if (found !== undefined) return found;
    }

    return undefined;
  }

  if (node.type === "button" && textContent(node).includes(label)) {
    return node;
  }

  return findButton(node.props.children, label);
}

function inputValue(tree: ReactElement, label: string, value: string): void {
  const input = findInput(tree, label);

  if (input === undefined) {
    throw new Error(`Input not found: ${label}`);
  }

  const onInput = input.props["onInput"];

  if (typeof onInput !== "function") {
    throw new Error(`Input has no onInput handler: ${label}`);
  }

  onInput({
    currentTarget: {
      value,
    },
  });
}

function findInput(node: ReactNode, label: string): ReactElement | undefined {
  if (node === null || node === undefined || typeof node !== "object")
    return undefined;

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findInput(child, label);
      if (found !== undefined) return found;
    }

    return undefined;
  }

  if (node.type === "input" && node.props["aria-label"] === label) {
    return node;
  }

  return findInput(node.props.children, label);
}
