import {
  attachClutch,
  loadRules,
  saveRules,
  upsertRule,
  type LocalRule,
  type RuleDecision,
} from "@agentclutch/playwright";
import { RunStore } from "@agentclutch/recorder";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";

const CHECKOUT_UNIT_PRICE_CENTS = 24_900;
const RULES_ROOT_DIR = ".agentclutch";

export interface CheckoutEditApplication {
  quantity: number;
  total: string;
}

export interface CheckoutEditDecision {
  type: "edit";
  approvedBy?: string;
  decidedAt?: string;
  patch: Array<{
    op: string;
    path: string;
    from?: unknown;
    value?: unknown;
  }>;
}

export interface CheckoutDemoOptions {
  clearRules?: boolean;
  clearCheckoutRules?: boolean;
  seedRuleDecision?: RuleDecision;
}

export function parseCheckoutDemoArgs(args: string[]): CheckoutDemoOptions {
  const options: CheckoutDemoOptions = {};

  for (const arg of args) {
    switch (arg) {
      case "--":
        break;
      case "--clear-rules":
        options.clearRules = true;
        break;
      case "--seed-allow-rule":
        options.seedRuleDecision = "allow";
        break;
      case "--seed-block-rule":
        options.seedRuleDecision = "block";
        break;
      case "--seed-require-clutch-rule":
        options.seedRuleDecision = "require_clutch";
        break;
      default:
        throw new Error(`Unknown checkout demo flag: ${arg}`);
    }
  }

  return options;
}

export async function prepareCheckoutDemoRules(
  options: CheckoutDemoOptions,
  rootDir = RULES_ROOT_DIR,
  createdAt = new Date().toISOString(),
): Promise<LocalRule[]> {
  let rules = options.clearRules ? [] : await loadRules(rootDir);

  if (options.clearCheckoutRules === true) {
    rules = rules.filter((rule) => !isCheckoutDemoRule(rule));
  }

  if (options.seedRuleDecision !== undefined) {
    rules = upsertRule(
      rules,
      checkoutDemoRule(options.seedRuleDecision, createdAt),
    );
  }

  if (
    options.clearRules === true ||
    options.clearCheckoutRules === true ||
    options.seedRuleDecision !== undefined
  ) {
    await saveRules(rules, rootDir);
  }

  return rules;
}

export function checkoutDemoRule(
  decision: RuleDecision,
  createdAt = new Date().toISOString(),
): LocalRule {
  return {
    id: `rule_checkout_${decision}`,
    description: checkoutRuleDescription(decision),
    match: {
      action_kind: "browser.checkout",
      target_surface: "browser",
      target_app: "FakeStore",
      consequence_class: "payment_or_purchase",
    },
    decision,
    created_at: createdAt,
  };
}

export async function runCheckoutDemo(
  options: CheckoutDemoOptions = {},
): Promise<void> {
  await prepareCheckoutDemoRules(
    defaultCheckoutDemoRuleOptions(options),
    RULES_ROOT_DIR,
  );

  const runId = createRunId();
  const store = new RunStore(RULES_ROOT_DIR);
  const recorder = await store.createRecorder(runId);
  const browser = await chromium.launch({ headless: false });

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    const demoUrl = pathToFileURL(fakeStorePath()).toString();

    console.log("Launching AgentClutch checkout demo...");
    await page.goto(demoUrl);

    await simulateAgentPreparation(page);

    const clutch = await attachClutch(page, {
      runId,
      agentName: "demo-shopping-agent",
      recorder,
      rulesRootDir: RULES_ROOT_DIR,
    });

    const result = await clutch.click("#checkout", {
      kind: "browser.checkout",
      label: "Complete checkout",
      description: "Complete checkout for Wireless Headphones Pro",
      targetApp: "FakeStore",
      changedFields: [
        {
          field: "product",
          after: "Wireless Headphones Pro",
          editable: false,
        },
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

    const runPath = resolve(recorder.eventsPath);
    console.log(`AgentClutch run recorded: ${runPath}`);
    console.log(`Decision: ${result.decision.type}`);

    if (result.decision.type === "approve_once") {
      await page.locator("#checkout-result").waitFor({ state: "visible" });
      console.log("Checkout completed in the fake store.");
    } else if (result.decision.type === "edit") {
      const applied = await completeEditedCheckout(page, result.decision);

      console.log(JSON.stringify(result.decision.patch, null, 2));

      if (applied === undefined) {
        console.log(
          "Checkout was paused with edits that this demo cannot apply.",
        );
      } else {
        console.log(
          `Checkout completed with edited quantity ${applied.quantity} and total ${applied.total}.`,
        );
      }
    } else {
      console.log("Checkout was not executed.");
    }

    await waitForBrowserReview();
  } finally {
    await browser.close();
  }
}

function defaultCheckoutDemoRuleOptions(
  options: CheckoutDemoOptions,
): CheckoutDemoOptions {
  if (options.clearRules === true || options.seedRuleDecision !== undefined) {
    return options;
  }

  return {
    ...options,
    clearCheckoutRules: true,
  };
}

function checkoutRuleDescription(decision: RuleDecision): string {
  switch (decision) {
    case "allow":
      return "Allow FakeStore checkout without showing an Action Card.";
    case "block":
      return "Block FakeStore checkout without showing an Action Card.";
    case "require_clutch":
      return "Require AgentClutch approval for FakeStore checkout.";
  }
}

function isCheckoutDemoRule(rule: LocalRule): boolean {
  return (
    rule.match.action_kind === "browser.checkout" &&
    rule.match.target_surface === "browser" &&
    rule.match.target_app === "FakeStore" &&
    rule.match.consequence_class === "payment_or_purchase"
  );
}

export async function completeEditedCheckout(
  page: Pick<Page, "locator">,
  decision: CheckoutEditDecision,
): Promise<CheckoutEditApplication | undefined> {
  const applied = await applyCheckoutEditPatch(page, decision);

  if (applied === undefined) {
    return undefined;
  }

  await page.locator("#checkout").first().click();
  await page.locator("#checkout-result").waitFor({ state: "visible" });

  return applied;
}

export async function applyCheckoutEditPatch(
  page: Pick<Page, "locator">,
  decision: CheckoutEditDecision,
): Promise<CheckoutEditApplication | undefined> {
  const quantity = editedCheckoutQuantity(decision);

  if (quantity === undefined) {
    return undefined;
  }

  const total = `$${((CHECKOUT_UNIT_PRICE_CENTS * quantity) / 100).toFixed(2)}`;

  await page.locator("#cart-quantity").evaluate((element, nextQuantity) => {
    element.textContent = String(nextQuantity);
  }, quantity);
  await page.locator("#cart-total").evaluate((element, nextTotal) => {
    element.textContent = nextTotal;
  }, total);

  return {
    quantity,
    total,
  };
}

function editedCheckoutQuantity(
  decision: CheckoutEditDecision,
): number | undefined {
  const patch = decision.patch.find(
    (item) =>
      item.op === "replace" &&
      item.path === "/changed_fields/quantity/after" &&
      (typeof item.value === "number" || typeof item.value === "string"),
  );

  if (patch === undefined) return undefined;

  const quantity =
    typeof patch.value === "number" ? patch.value : Number(patch.value);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`Invalid edited checkout quantity: ${String(patch.value)}`);
  }

  return quantity;
}

async function simulateAgentPreparation(page: Page): Promise<void> {
  if (await page.locator("#search").count()) {
    await page.locator("#search").fill("noise cancelling headphones");
  }

  if (await page.locator("#search-button").count()) {
    await page.locator("#search-button").click();
  }

  if (await page.locator("#select-product").count()) {
    await page.locator("#select-product").click();
  }

  if (await page.locator("#cart-summary").count()) {
    await page.locator("#cart-summary").waitFor({ state: "visible" });
  }
}

async function waitForBrowserReview(): Promise<void> {
  if (!process.stdin.isTTY) return;

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    await readline.question("Press Enter to close the demo browser.");
  } finally {
    readline.close();
  }
}

function fakeStorePath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "../../../../apps/browser-demo/public/fake-store.html");
}

function createRunId(): string {
  const timestamp = new Date()
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(".", "_");
  return `run_checkout_${timestamp}`;
}
