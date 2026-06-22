import type {
  ActionCard,
  ChangedField,
  UserDecision,
} from "@agentclutch/action-card";
import type { Page } from "playwright";
import { beforeEach, describe, expect, it } from "vitest";
import { attachClutch, type ClutchRecorder } from "../src/index.js";

let events: unknown[];

class MemoryRecorder implements ClutchRecorder {
  async record(event: unknown): Promise<void> {
    events.push(event);
  }
}

beforeEach(() => {
  events = [];
});

describe("attachClutch", () => {
  it("approve_once executes click", async () => {
    const page = createFakePage("approve_once");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
    });

    expect(result.decision.type).toBe("approve_once");
    expect(result.executed).toBe(true);
    expect(page.clicked).toBe(true);
  });

  it("block prevents click", async () => {
    const page = createFakePage("block");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
    });

    expect(result.decision.type).toBe("block");
    expect(result.executed).toBe(false);
    expect(page.clicked).toBe(false);
  });

  it("take_wheel prevents click", async () => {
    const page = createFakePage("take_wheel");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
    });

    expect(result.decision.type).toBe("takeover");
    expect(result.executed).toBe(false);
    expect(page.clicked).toBe(false);
  });

  it("returns edit patch and resume correction for edited fields", async () => {
    const page = createFakePage("edit_fields", [
      {
        field: "quantity",
        before: 1,
        after: 3,
        editable: true,
      },
    ]);
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      changedFields: [
        {
          field: "quantity",
          after: 1,
          editable: true,
        },
      ],
    });

    expect(result.decision).toMatchObject({
      type: "edit",
      patch: [
        {
          op: "replace",
          path: "/changed_fields/quantity/after",
          from: 1,
          value: 3,
        },
      ],
    });
    expect(result.resumeContext.userCorrection).toEqual({
      before: {
        selector: "#checkout",
        action: "click",
        kind: "browser.checkout",
        label: "Complete checkout",
        changedFields: [
          {
            field: "quantity",
            after: 1,
            editable: true,
          },
        ],
      },
      after: result.decision.type === "edit" ? result.decision.patch : [],
      explanation: "User chose to edit fields before execution.",
    });
    expect(result.executed).toBe(false);
    expect(page.clicked).toBe(false);

    expect(events[2]).toMatchObject({
      type: "agentclutch.user_decision.v0",
      decision: "edit_fields",
      edited_fields: [
        {
          field: "quantity",
          before: 1,
          after: 3,
        },
      ],
    });
    expect(events[3]).toMatchObject({
      type: "agentclutch.loop_event.v0",
      eventType: "resume_context.created",
      payload: {
        decision: {
          type: "edit",
          patch: [
            {
              path: "/changed_fields/quantity/after",
              value: 3,
            },
          ],
        },
        userCorrection: {
          after: [
            {
              path: "/changed_fields/quantity/after",
              value: 3,
            },
          ],
        },
      },
    });
  });

  it("uses tool_wrapper source mode for browser actions", async () => {
    const page = createFakePage("block");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
    });

    expect(result.proposal.sourceMode).toBe("tool_wrapper");
    expect(result.proposal.agent.runtime).toBe("playwright");
  });

  it("creates resume context", async () => {
    const page = createFakePage("block");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
    });

    expect(result.resumeContext).toMatchObject({
      type: "agentclutch.loop_resume_context.v0",
      proposalId: result.proposal.id,
      sourceMode: "tool_wrapper",
      decision: {
        type: "block",
      },
    });
  });

  it("recorder receives expected events", async () => {
    const page = createFakePage("block");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
    });

    await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
    });

    expect(events).toHaveLength(4);
    expect(events.map(eventType)).toEqual([
      "action.proposed",
      "agentclutch.action_card.v0",
      "agentclutch.user_decision.v0",
      "resume_context.created",
    ]);
  });
});

type OverlayDecision = UserDecision["decision"];

interface FakePage extends Page {
  clicked: boolean;
  installedScripts: string[];
}

function createFakePage(
  decision: OverlayDecision,
  editedFields?: ChangedField[],
): FakePage {
  const state = {
    clicked: false,
    installedScripts: [] as string[],
  };

  const page = {
    get clicked() {
      return state.clicked;
    },
    get installedScripts() {
      return state.installedScripts;
    },
    async addInitScript(script: string) {
      state.installedScripts.push(script);
    },
    async evaluate(
      expression: string | ((payload: unknown) => unknown),
      payload?: unknown,
    ) {
      if (typeof expression === "string") {
        state.installedScripts.push(expression);
        return undefined;
      }

      const previousWindow = globalThis.window;
      globalThis.window = {
        __agentclutchShowActionCard: async (card: ActionCard) =>
          userDecision(card, decision, editedFields),
      } as Window & typeof globalThis;

      try {
        return await expression(payload);
      } finally {
        globalThis.window = previousWindow;
      }
    },
    title: async () => "Checkout Test",
    url: () => "https://example.test/checkout",
    locator: (selector: string) => fakeLocator(selector, state),
  };

  return page as FakePage;
}

function fakeLocator(selector: string, state: { clicked: boolean }) {
  return {
    first() {
      return this;
    },
    async click() {
      if (selector === "#checkout") {
        state.clicked = true;
      }
    },
    async evaluate(callback: (element: { tagName: string }) => unknown) {
      return callback({ tagName: "BUTTON" });
    },
    async innerText() {
      return "Complete checkout";
    },
    async getAttribute(name: string) {
      return name === "aria-label" ? null : undefined;
    },
    async boundingBox() {
      return { x: 10, y: 20, width: 120, height: 32 };
    },
  };
}

function userDecision(
  card: ActionCard,
  decision: OverlayDecision,
  editedFields?: ChangedField[],
): UserDecision {
  return {
    type: "agentclutch.user_decision.v0",
    id: "decision_test",
    action_card_id: card.id,
    run_id: card.run_id,
    decided_at: "2026-06-22T04:01:00.000Z",
    decision,
    ...(editedFields === undefined ? {} : { edited_fields: editedFields }),
    actor: {
      display_name: "tester",
    },
  };
}

function eventType(event: unknown): string | undefined {
  if (typeof event !== "object" || event === null) return undefined;

  const record = event as Record<string, unknown>;

  if (typeof record["eventType"] === "string") return record["eventType"];
  if (typeof record["type"] === "string") return record["type"];

  return undefined;
}
