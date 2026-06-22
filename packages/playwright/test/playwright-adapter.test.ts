import type {
  ActionCard,
  ChangedField,
  JsonObject,
  UserDecision,
} from "@agentclutch/action-card";
import type { Page } from "playwright";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  attachClutch,
  createRuleFromDecision,
  evaluateRules,
  loadRules,
  rulesFilePath,
  saveRules,
  type ClutchRecorder,
  type LocalRule,
} from "../src/index.js";

let events: unknown[];
let tempDirs: string[];

class MemoryRecorder implements ClutchRecorder {
  async record(event: unknown): Promise<void> {
    events.push(event);
  }
}

beforeEach(() => {
  events = [];
  tempDirs = [];
});

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
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

  it("persists a local require_clutch rule from create_rule decisions", async () => {
    const rootDir = await tempRoot();
    const page = createFakePage("create_rule");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
      rulesRootDir: rootDir,
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
    });

    expect(result.decision.type).toBe("create_rule");
    expect(result.executed).toBe(false);
    expect(page.clicked).toBe(false);

    const rules = await loadRules(rootDir);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      description:
        "Require AgentClutch approval for browser.checkout on FakeStore.",
      match: {
        action_kind: "browser.checkout",
        target_app: "FakeStore",
        target_surface: "browser",
        consequence_class: "payment_or_purchase",
      },
      decision: "require_clutch",
      created_at: "2026-06-22T04:01:00.000Z",
    });
    expect(result.decision.rule).toMatchObject({
      id: rules[0]?.id,
      match: rules[0]?.match,
      decision: "require_clutch",
    });
  });

  it("creates missing rules directory and applies the saved rule to the next matching action", async () => {
    const rootDir = join(await tempRoot(), ".agentclutch");
    const firstPage = createFakePage("create_rule", undefined, {
      description: "Block repeat FakeStore checkout.",
      decision: "block",
    });
    const firstClutch = await attachClutch(firstPage, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
      rulesRootDir: rootDir,
    });

    const firstResult = await firstClutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
    });

    expect(firstResult.decision.type).toBe("create_rule");
    expect(firstPage.clicked).toBe(false);
    expect((await stat(join(rootDir, "rules"))).isDirectory()).toBe(true);

    const rulesJson = JSON.parse(
      await readFile(rulesFilePath(rootDir), "utf8"),
    ) as unknown;
    expect(rulesJson).toEqual([
      expect.objectContaining({
        description: "Block repeat FakeStore checkout.",
        match: {
          action_kind: "browser.checkout",
          target_app: "FakeStore",
          target_surface: "browser",
          consequence_class: "payment_or_purchase",
        },
        decision: "block",
        created_at: "2026-06-22T04:01:00.000Z",
      }),
    ]);

    const secondPage = createFakePage("approve_once");
    const secondClutch = await attachClutch(secondPage, {
      runId: "run_test_2",
      recorder: new MemoryRecorder(),
      rulesRootDir: rootDir,
    });

    const secondResult = await secondClutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
    });

    expect(secondResult.decision).toMatchObject({
      type: "block",
      blockedBy: "AgentClutch rule",
    });
    expect(secondResult.executed).toBe(false);
    expect(secondPage.clicked).toBe(false);
    expect(secondPage.shownActionCards).toBe(0);
  });

  it("applies matching allow rules without showing the overlay", async () => {
    const rootDir = await tempRoot();
    await saveRules([checkoutRule("allow")], rootDir);
    const page = createFakePage("block");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
      rulesRootDir: rootDir,
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
    });

    expect(result.decision).toMatchObject({
      type: "approve_once",
      approvedBy: "AgentClutch rule",
    });
    expect(result.executed).toBe(true);
    expect(page.clicked).toBe(true);
    expect(page.shownActionCards).toBe(0);
  });

  it("applies matching block rules without showing the overlay", async () => {
    const rootDir = await tempRoot();
    await saveRules([checkoutRule("block")], rootDir);
    const page = createFakePage("approve_once");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
      rulesRootDir: rootDir,
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
    });

    expect(result.decision).toMatchObject({
      type: "block",
      blockedBy: "AgentClutch rule",
    });
    expect(result.executed).toBe(false);
    expect(page.clicked).toBe(false);
    expect(page.shownActionCards).toBe(0);
  });
});

describe("local rules", () => {
  it("creates, saves, loads, and evaluates rules", async () => {
    const rootDir = await tempRoot();
    const card = checkoutActionCard();
    const decision: UserDecision = {
      type: "agentclutch.user_decision.v0",
      id: "decision_rule",
      action_card_id: card.id,
      run_id: card.run_id,
      decided_at: "2026-06-22T04:02:00.000Z",
      decision: "create_rule",
      rule: {
        description: "Block repeat FakeStore checkout.",
        decision: "block",
      },
    };

    const rule = createRuleFromDecision(card, decision);

    expect(rule).toMatchObject({
      description: "Block repeat FakeStore checkout.",
      match: {
        action_kind: "browser.checkout",
        target_app: "FakeStore",
        target_surface: "browser",
        consequence_class: "payment_or_purchase",
      },
      decision: "block",
      created_at: "2026-06-22T04:02:00.000Z",
    });

    await saveRules([rule], rootDir);

    const stored = JSON.parse(
      await readFile(rulesFilePath(rootDir), "utf8"),
    ) as unknown;
    expect(stored).toEqual([rule]);
    await expect(loadRules(rootDir)).resolves.toEqual([rule]);
    expect(evaluateRules([rule], card)).toEqual({
      matched: true,
      rule,
      decision: "block",
    });
    expect(
      evaluateRules([rule], {
        ...card,
        proposed_action: {
          ...card.proposed_action,
          kind: "email.send",
        },
      }),
    ).toEqual({
      matched: false,
      decision: "require_clutch",
    });
  });
});

type OverlayDecision = UserDecision["decision"];

interface FakePage extends Page {
  clicked: boolean;
  installedScripts: string[];
  shownActionCards: number;
}

function createFakePage(
  decision: OverlayDecision,
  editedFields?: ChangedField[],
  rule?: JsonObject,
): FakePage {
  const state = {
    clicked: false,
    installedScripts: [] as string[],
    shownActionCards: 0,
  };

  const page = {
    get clicked() {
      return state.clicked;
    },
    get installedScripts() {
      return state.installedScripts;
    },
    get shownActionCards() {
      return state.shownActionCards;
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
      state.shownActionCards += 1;
      globalThis.window = {
        __agentclutchShowActionCard: async (card: ActionCard) =>
          userDecision(card, decision, editedFields, rule),
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
  rule?: JsonObject,
): UserDecision {
  return {
    type: "agentclutch.user_decision.v0",
    id: "decision_test",
    action_card_id: card.id,
    run_id: card.run_id,
    decided_at: "2026-06-22T04:01:00.000Z",
    decision,
    ...(editedFields === undefined ? {} : { edited_fields: editedFields }),
    ...(rule === undefined ? {} : { rule }),
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

async function tempRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "agentclutch-rules-"));
  tempDirs.push(dir);
  return dir;
}

function checkoutRule(decision: LocalRule["decision"]): LocalRule {
  return {
    id: `rule_${decision}`,
    description: `${decision} checkout`,
    match: {
      action_kind: "browser.checkout",
      target_app: "FakeStore",
      target_surface: "browser",
      consequence_class: "payment_or_purchase",
    },
    decision,
    created_at: "2026-06-22T04:00:00.000Z",
  };
}

function checkoutActionCard(): ActionCard {
  return {
    type: "agentclutch.action_card.v0",
    id: "acard_rule",
    run_id: "run_rule",
    created_at: "2026-06-22T04:00:00.000Z",
    agent: { name: "test-agent", runtime: "playwright" },
    proposed_action: {
      id: "act_rule",
      kind: "browser.checkout",
      label: "Complete checkout",
      surface: "browser",
      target: {
        surface: "browser",
        target_app: "FakeStore",
      },
    },
    consequence: {
      class: "payment_or_purchase",
      label: "Payment or purchase",
      reversibility: "compensable",
      blast_radius: "single_customer",
      requires_confirmation: true,
    },
    risk: {
      level: "high",
      reasons: ["Checkout requires approval."],
    },
    evidence: [],
    user_options: ["approve_once", "block", "create_rule"],
  };
}
