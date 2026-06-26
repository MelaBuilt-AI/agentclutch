import type {
  ActionCard,
  ChangedField,
  JsonObject,
  UserDecision,
} from "@agentclutch/action-card";
import { chromium, type Page } from "playwright";
import {
  loadLessons,
  saveLessons,
  type Lesson,
} from "@agentclutch/core";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  attachClutch,
  browserOverlayScript,
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
  it("browser overlay renders consequence metadata fields", () => {
    const script = browserOverlayScript();

    expect(script).toContain("Possible residue");
    expect(script).toContain("possible_residue");
    expect(script).toContain("Compensation");
    expect(script).toContain("compensation_hint");
    expect(script).toContain("Reversibility");
    expect(script).toContain("Blast radius");
    expect(script).toContain(".ac-actions{position:sticky;bottom:0;");
  });

  it("browser overlay resolves a clicked decision in Chromium", async () => {
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.setContent(
        '<button id="checkout" type="button">Complete checkout</button>',
      );
      await page.addScriptTag({ content: browserOverlayScript() });

      const decisionPromise = page.evaluate((card) => {
        if (!window.__agentclutchShowActionCard) {
          throw new Error("AgentClutch browser overlay was not installed.");
        }

        return window.__agentclutchShowActionCard(card as ActionCard);
      }, checkoutActionCard());

      await page.getByRole("button", { name: "Approve once" }).click();

      await expect(decisionPromise).resolves.toMatchObject({
        decision: "approve_once",
      });
      await expect(page.locator("[data-agentclutch-root]").count()).resolves.toBe(
        0,
      );
    } finally {
      await browser.close();
    }
  });

  it("renders FakeStore consequence fields before completing checkout in Chromium", async () => {
    const rootDir = await tempRoot();
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.goto(fakeStoreDemoUrl());
      await page.locator("#search").fill("noise cancelling headphones");
      await page.locator("#search-button").click();
      await page.locator("#select-product").click();
      await page.locator("#cart-summary").waitFor({ state: "visible" });

      const clutch = await attachClutch(page, {
        runId: "run_fakestore_consequence_verify",
        recorder: new MemoryRecorder(),
        rulesRootDir: rootDir,
        lessonsRootDir: rootDir,
      });

      const resultPromise = clutch.click("#checkout", {
        kind: "browser.checkout",
        label: "Complete checkout",
        description: "Complete checkout for Wireless Headphones Pro",
        targetApp: "FakeStore",
        changedFields: [
          { field: "product", after: "Wireless Headphones Pro", editable: false },
          { field: "quantity", after: 1, editable: true },
          { field: "total", after: "$249.00", editable: false },
        ],
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
      });

      const overlay = page.locator("[data-agentclutch-root]");
      await overlay.waitFor({ state: "visible" });
      const overlayText = await overlay.innerText();

      expect(overlayText).toContain("AGENTCLUTCH ACTION CARD");
      expect(overlayText).toContain("Payment or purchase");
      expect(overlayText).toContain("Reversibility");
      expect(overlayText).toContain("compensable");
      expect(overlayText).toContain("Blast radius");
      expect(overlayText).toContain("single user");
      expect(overlayText).toContain("Possible residue");
      expect(overlayText).toContain("Order record may be created");
      expect(overlayText).toContain("Payment authorization may be captured");
      expect(overlayText).toContain("Compensation");
      expect(overlayText).toContain("Cancel order or request refund if available.");
      expect(overlayText).toContain("The cart total shown before checkout is $249.00.");

      await page.getByRole("button", { name: "Approve once" }).click();

      await expect(resultPromise).resolves.toMatchObject({
        decision: { type: "approve_once" },
        executed: true,
        card: {
          consequence: {
            class: "payment_or_purchase",
            reversibility: "compensable",
            blast_radius: "single_user",
          },
        },
      });
      await page.locator("#checkout-result.visible").waitFor({ state: "visible" });
    } finally {
      await browser.close();
    }
  });

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
    const rootDir = await tempRoot();
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
      lessonsRootDir: rootDir,
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
    expect(events.find((event) => eventType(event) === "lesson.captured")).toMatchObject({
      type: "agentclutch.loop_event.v0",
      eventType: "lesson.captured",
      payload: {
        lesson: {
          field: "quantity",
          original_value: 1,
          corrected_value: 3,
        },
      },
    });
    expect(events.find((event) => eventType(event) === "resume_context.created")).toMatchObject({
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
    await expect(loadLessons(rootDir)).resolves.toEqual([
      expect.objectContaining({
        field: "quantity",
        original_value: 1,
        corrected_value: 3,
      }),
    ]);
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

  it("shows the Action Card for matching require_clutch rules", async () => {
    const rootDir = await tempRoot();
    await saveRules([checkoutRule("require_clutch")], rootDir);
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
      type: "approve_once",
      approvedBy: "tester",
    });
    expect(result.executed).toBe(true);
    expect(page.clicked).toBe(true);
    expect(page.shownActionCards).toBe(1);
  });

  it("applies matching lessons before showing the Action Card and reinforces accepted lessons", async () => {
    const rootDir = await tempRoot();
    await saveLessons([checkoutLesson()], rootDir);
    const page = createFakePage("accept_lesson");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
      lessonsRootDir: rootDir,
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
      changedFields: [
        {
          field: "quantity",
          after: 1,
          editable: true,
        },
      ],
    });

    expect(result.decision).toMatchObject({
      type: "approve_once",
      approvedBy: "tester",
      note: "User accepted an applied lesson.",
    });
    expect(result.executed).toBe(true);
    expect(page.clicked).toBe(true);
    expect(page.shownActionCards).toBe(1);
    expect(result.appliedLessons).toEqual([
      expect.objectContaining({
        field: "quantity",
        original_value: 1,
        corrected_value: 3,
      }),
    ]);
    expect(result.card.proposed_action.changed_fields?.[0]).toMatchObject({
      field: "quantity",
      before: 1,
      after: 3,
    });
    expect(page.lastActionCard?.metadata?.["applied_lessons"]).toEqual([
      expect.objectContaining({
        field: "quantity",
        original_value: 1,
        corrected_value: 3,
      }),
    ]);
    expect(result.card.metadata?.["applied_lessons"]).toEqual([
      expect.objectContaining({
        field: "quantity",
        original_value: 1,
        corrected_value: 3,
      }),
    ]);
    expect(events.map(eventType)).toContain("lesson.applied");
    expect(events.map(eventType)).toContain("lesson.reinforced");

    await expect(loadLessons(rootDir)).resolves.toEqual([
      expect.objectContaining({
        confidence: 0.85,
        usage_count: 1,
      }),
    ]);
  });

  it("shows the Action Card for matching lessons and require_clutch rules", async () => {
    const rootDir = await tempRoot();
    await saveLessons([checkoutLesson()], rootDir);
    await saveRules([checkoutRule("require_clutch")], rootDir);
    const page = createFakePage("accept_lesson");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
      lessonsRootDir: rootDir,
      rulesRootDir: rootDir,
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
      changedFields: [
        {
          field: "quantity",
          after: 1,
          editable: true,
        },
      ],
    });

    expect(result.decision.type).toBe("approve_once");
    expect(page.shownActionCards).toBe(1);
    expect(result.card.metadata?.["applied_lessons"]).toEqual([
      expect.objectContaining({
        field: "quantity",
        original_value: 1,
        corrected_value: 3,
      }),
    ]);
  });

  it("lets allow rules skip the Action Card without auto-applying untrusted lessons", async () => {
    const rootDir = await tempRoot();
    await saveLessons([checkoutLesson()], rootDir);
    await saveRules([checkoutRule("allow")], rootDir);
    const page = createFakePage("block");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
      lessonsRootDir: rootDir,
      rulesRootDir: rootDir,
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
      changedFields: [
        {
          field: "quantity",
          after: 1,
          editable: true,
        },
      ],
    });

    expect(result.decision).toMatchObject({
      type: "approve_once",
      approvedBy: "AgentClutch rule",
    });
    expect(result.executed).toBe(true);
    expect(page.clicked).toBe(true);
    expect(page.shownActionCards).toBe(0);
    expect(result.appliedLessons).toEqual([]);
    expect(result.card.metadata?.["applied_lessons"]).toBeUndefined();
    expect(result.card.proposed_action.changed_fields?.[0]).toMatchObject({
      field: "quantity",
      after: 1,
    });
  });

  it("auto-applies trusted lessons only when an allow rule skips the Action Card", async () => {
    const rootDir = await tempRoot();
    await saveLessons([checkoutLesson({ auto_apply: true })], rootDir);
    await saveRules([checkoutRule("allow")], rootDir);
    const page = createFakePage("block");
    const clutch = await attachClutch(page, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
      lessonsRootDir: rootDir,
      rulesRootDir: rootDir,
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
      changedFields: [
        {
          field: "quantity",
          after: 1,
          editable: true,
        },
      ],
    });

    expect(result.decision.type).toBe("approve_once");
    expect(page.shownActionCards).toBe(0);
    expect(result.appliedLessons).toEqual([
      expect.objectContaining({
        field: "quantity",
        original_value: 1,
        corrected_value: 3,
      }),
    ]);
    expect(result.card.proposed_action.changed_fields?.[0]).toMatchObject({
      field: "quantity",
      before: 1,
      after: 3,
    });
  });

  it("rejects and disables applied lessons", async () => {
    const rejectRoot = await tempRoot();
    await saveLessons([checkoutLesson()], rejectRoot);
    const rejectPage = createFakePage("reject_lesson");
    const rejectClutch = await attachClutch(rejectPage, {
      runId: "run_reject",
      recorder: new MemoryRecorder(),
      lessonsRootDir: rejectRoot,
    });

    const rejected = await rejectClutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
      changedFields: [
        {
          field: "quantity",
          after: 1,
          editable: true,
        },
      ],
    });

    expect(rejected.decision).toMatchObject({
      type: "approve_once",
      note: "User rejected the applied lesson and used the original value.",
    });
    expect(rejected.executed).toBe(true);
    expect(rejectPage.clicked).toBe(true);
    expect(rejected.proposal.metadata?.["applied_lessons"]).toBeUndefined();
    expect(
      (rejected.proposal.metadata?.["changedFields"] as ChangedField[])[0],
    ).toMatchObject({
      field: "quantity",
      after: 1,
    });
    await expect(loadLessons(rejectRoot)).resolves.toEqual([
      expect.objectContaining({
        confidence: 0.6,
      }),
    ]);

    const disableRoot = await tempRoot();
    await saveLessons([checkoutLesson()], disableRoot);
    const disablePage = createFakePage("disable_lesson");
    const disableClutch = await attachClutch(disablePage, {
      runId: "run_disable",
      recorder: new MemoryRecorder(),
      lessonsRootDir: disableRoot,
    });

    const disabled = await disableClutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
      changedFields: [
        {
          field: "quantity",
          after: 1,
          editable: true,
        },
      ],
    });

    expect(disabled.decision).toMatchObject({
      type: "block",
      reason: "User disabled the applied lesson.",
    });
    await expect(loadLessons(disableRoot)).resolves.toEqual([
      expect.objectContaining({
        confidence: 0,
      }),
    ]);
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

  it("replaces duplicate matching rules when saving", async () => {
    const rootDir = await tempRoot();

    await saveRules(
      [
        {
          ...checkoutRule("allow"),
          id: "rule_first",
          description: "first rule",
        },
        {
          ...checkoutRule("block"),
          id: "rule_second",
          description: "second rule",
        },
      ],
      rootDir,
    );

    await expect(loadRules(rootDir)).resolves.toEqual([
      {
        ...checkoutRule("block"),
        id: "rule_second",
        description: "second rule",
      },
    ]);
  });

  it("replaces duplicate matching rules from repeated create_rule decisions", async () => {
    const rootDir = await tempRoot();
    const firstPage = createFakePage("create_rule", undefined, {
      description: "First require rule.",
      decision: "require_clutch",
    });
    const firstClutch = await attachClutch(firstPage, {
      runId: "run_test",
      recorder: new MemoryRecorder(),
      rulesRootDir: rootDir,
    });
    await firstClutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
    });

    const secondPage = createFakePage("create_rule", undefined, {
      description: "Second require rule.",
      decision: "require_clutch",
    });
    const secondClutch = await attachClutch(secondPage, {
      runId: "run_test_2",
      recorder: new MemoryRecorder(),
      rulesRootDir: rootDir,
    });
    await secondClutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetApp: "FakeStore",
    });

    const rules = await loadRules(rootDir);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      description: "Second require rule.",
      decision: "require_clutch",
      match: {
        action_kind: "browser.checkout",
        target_app: "FakeStore",
        target_surface: "browser",
        consequence_class: "payment_or_purchase",
      },
    });
  });
});

type OverlayDecision = UserDecision["decision"];

interface FakePage extends Page {
  clicked: boolean;
  installedScripts: string[];
  shownActionCards: number;
  lastActionCard?: ActionCard;
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
    lastActionCard: undefined as ActionCard | undefined,
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
    get lastActionCard() {
      return state.lastActionCard;
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
      state.lastActionCard = payload as ActionCard;
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
  const dir = await mkdtemp(join(tmpdir(), "agentclutch-local-"));
  tempDirs.push(dir);
  return dir;
}

function fakeStoreDemoUrl(): string {
  const testDir = dirname(fileURLToPath(import.meta.url));
  return pathToFileURL(
    join(testDir, "../../../apps/browser-demo/public/fake-store.html"),
  ).toString();
}

function checkoutLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "lesson_checkout_quantity",
    action_kind: "browser.checkout",
    target_app: "FakeStore",
    field: "quantity",
    original_value: 1,
    corrected_value: 3,
    confidence: 0.8,
    created_at: "2026-06-22T04:00:00.000Z",
    usage_count: 0,
    ...overrides,
  };
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
