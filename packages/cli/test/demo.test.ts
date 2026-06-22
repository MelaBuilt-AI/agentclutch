import type { Page } from "playwright";
import { describe, expect, it } from "vitest";
import {
  applyCheckoutEditPatch,
  type CheckoutEditDecision,
  completeEditedCheckout,
} from "../src/commands/demo.js";

describe("applyCheckoutEditPatch", () => {
  it("applies edited quantity and recalculates fake store total", async () => {
    const elements = new Map<string, { textContent: string | null }>([
      ["cart-quantity", { textContent: "1" }],
      ["cart-total", { textContent: "$249.00" }],
    ]);
    const evaluatedCallbacks: EvaluatedCallback[] = [];
    const page = fakeCheckoutPage(elements, evaluatedCallbacks);
    const decision: CheckoutEditDecision = {
      type: "edit",
      approvedBy: "tester",
      decidedAt: "2026-06-22T04:01:00.000Z",
      patch: [
        {
          op: "replace",
          path: "/changed_fields/quantity/after",
          from: 1,
          value: 3,
        },
      ],
    };

    await expect(applyCheckoutEditPatch(page, decision)).resolves.toEqual({
      quantity: 3,
      total: "$747.00",
    });
    expect(elements.get("cart-quantity")?.textContent).toBe("3");
    expect(elements.get("cart-total")?.textContent).toBe("$747.00");
    expect(evaluatedCallbacks.map((item) => item.selector)).toEqual([
      "#cart-quantity",
      "#cart-total",
    ]);
    for (const item of evaluatedCallbacks) {
      expect(item.source).not.toContain("__name");
      expect(item.source).not.toContain("CHECKOUT_UNIT_PRICE_CENTS");
      expect(item.source).not.toContain("formatUsdCents");
    }
  });

  it("does not apply unrelated edit patches", async () => {
    const evaluatedCallbacks: EvaluatedCallback[] = [];
    const page = fakeCheckoutPage(
      new Map<string, { textContent: string | null }>([
        ["cart-quantity", { textContent: "1" }],
        ["cart-total", { textContent: "$249.00" }],
      ]),
      evaluatedCallbacks,
    );
    const decision: CheckoutEditDecision = {
      type: "edit",
      approvedBy: "tester",
      decidedAt: "2026-06-22T04:01:00.000Z",
      patch: [
        {
          op: "replace",
          path: "/changed_fields/product/after",
          from: "A",
          value: "B",
        },
      ],
    };

    await expect(
      applyCheckoutEditPatch(page, decision),
    ).resolves.toBeUndefined();
    expect(evaluatedCallbacks).toEqual([]);
  });

  it("executes checkout after applying edited quantity", async () => {
    const elements = new Map<string, { textContent: string | null }>([
      ["cart-quantity", { textContent: "1" }],
      ["cart-total", { textContent: "$249.00" }],
      ["checkout-result", { textContent: "" }],
    ]);
    const page = fakeCheckoutPage(elements);
    const decision: CheckoutEditDecision = {
      type: "edit",
      approvedBy: "tester",
      decidedAt: "2026-06-22T04:01:00.000Z",
      patch: [
        {
          op: "replace",
          path: "/changed_fields/quantity/after",
          from: 1,
          value: 3,
        },
      ],
    };

    await expect(completeEditedCheckout(page, decision)).resolves.toEqual({
      quantity: 3,
      total: "$747.00",
    });
    expect(elements.get("checkout-result")?.textContent).toBe(
      "Checkout completed for 3 item(s). Total $747.00.",
    );
  });
});

interface EvaluatedCallback {
  selector: string;
  source: string;
}

function fakeCheckoutPage(
  elements: Map<string, { textContent: string | null }>,
  evaluatedCallbacks: EvaluatedCallback[] = [],
): Pick<Page, "locator"> {
  return {
    locator(selector: string) {
      return {
        first() {
          return this;
        },
        async evaluate(
          callback: (
            element: { textContent: string | null },
            arg: unknown,
          ) => unknown,
          arg: unknown,
        ) {
          evaluatedCallbacks.push({
            selector,
            source: String(callback),
          });

          const element = elements.get(selector.replace(/^#/, ""));

          if (element === undefined) {
            throw new Error(`Missing fake element for ${selector}.`);
          }

          return callback(element, arg);
        },
        async click() {
          if (selector !== "#checkout") return;

          const quantity = elements.get("cart-quantity")?.textContent;
          const total = elements.get("cart-total")?.textContent;
          const result = elements.get("checkout-result");

          if (result !== undefined) {
            result.textContent = `Checkout completed for ${quantity} item(s). Total ${total}.`;
          }
        },
        async waitFor() {
          return undefined;
        },
      };
    },
  } as unknown as Pick<Page, "locator">;
}
