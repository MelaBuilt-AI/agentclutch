import type {
  ActionCard,
  ConsequenceClass,
  JsonObject,
  UserDecision,
} from "@agentclutch/action-card";
import type { ClutchRule } from "@agentclutch/loop";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createId } from "@agentclutch/core";

export type RuleDecision = "allow" | "require_clutch" | "block";

export interface RuleMatch extends Record<string, unknown> {
  action_kind: string;
  target_surface: string;
  consequence_class: ConsequenceClass;
  target_app?: string;
}

export interface LocalRule extends Omit<ClutchRule, "match" | "decision"> {
  match: RuleMatch;
  decision: RuleDecision;
  created_at: string;
}

export type RuleEvaluation =
  | {
      matched: true;
      rule: LocalRule;
      decision: RuleDecision;
    }
  | {
      matched: false;
      decision: "require_clutch";
    };

export function rulesFilePath(rootDir = ".agentclutch"): string {
  return join(rootDir, "rules", "rules.json");
}

export async function loadRules(rootDir = ".agentclutch"): Promise<LocalRule[]> {
  let file: string;

  try {
    file = await readFile(rulesFilePath(rootDir), "utf8");
  } catch (error) {
    if (isNotFoundError(error)) return [];
    throw error;
  }

  if (file.trim() === "") return [];

  const parsed = JSON.parse(file) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("AgentClutch rules file must contain a JSON array.");
  }

  return parsed.map((item, index) => {
    if (!isLocalRule(item)) {
      throw new Error(`Invalid AgentClutch rule at index ${index}.`);
    }

    return item;
  });
}

export async function saveRules(
  rules: LocalRule[],
  rootDir = ".agentclutch",
): Promise<void> {
  const path = rulesFilePath(rootDir);
  await mkdir(join(rootDir, "rules"), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify(dedupeRules(rules), null, 2)}\n`,
    "utf8",
  );
}

export function upsertRule(rules: LocalRule[], rule: LocalRule): LocalRule[] {
  const existingIndex = rules.findIndex((item) =>
    rulesHaveSameMatch(item, rule),
  );

  if (existingIndex === -1) return [...rules, rule];

  return [
    ...rules.slice(0, existingIndex),
    rule,
    ...rules.slice(existingIndex + 1),
  ];
}

export function evaluateRules(
  rules: LocalRule[],
  card: ActionCard,
): RuleEvaluation {
  const rule = rules.find((item) => ruleMatchesActionCard(item, card));

  if (rule === undefined) {
    return {
      matched: false,
      decision: "require_clutch",
    };
  }

  return {
    matched: true,
    rule,
    decision: rule.decision,
  };
}

export function createRuleFromDecision(
  card: ActionCard,
  decision: UserDecision,
): LocalRule {
  const requested = normalizeRequestedRule(decision.rule);
  const ruleDecision = requested.decision ?? "require_clutch";

  return {
    id: requested.id ?? createId("rule"),
    description:
      requested.description ?? ruleDescription(ruleDecision, card),
    match: {
      action_kind: card.proposed_action.kind,
      target_surface: card.proposed_action.target.surface,
      ...(card.proposed_action.target.target_app === undefined
        ? {}
        : { target_app: card.proposed_action.target.target_app }),
      consequence_class: card.consequence.class,
    },
    decision: ruleDecision,
    created_at: decision.decided_at,
  };
}

function ruleMatchesActionCard(rule: LocalRule, card: ActionCard): boolean {
  if (rule.match.action_kind !== card.proposed_action.kind) return false;
  if (rule.match.target_surface !== card.proposed_action.target.surface) {
    return false;
  }
  if (rule.match.consequence_class !== card.consequence.class) return false;

  if (
    rule.match.target_app !== undefined &&
    rule.match.target_app !== card.proposed_action.target.target_app
  ) {
    return false;
  }

  return true;
}

function dedupeRules(rules: LocalRule[]): LocalRule[] {
  return rules.reduce<LocalRule[]>(
    (deduped, rule) => upsertRule(deduped, rule),
    [],
  );
}

function rulesHaveSameMatch(left: LocalRule, right: LocalRule): boolean {
  return (
    left.match.action_kind === right.match.action_kind &&
    left.match.target_surface === right.match.target_surface &&
    left.match.target_app === right.match.target_app &&
    left.match.consequence_class === right.match.consequence_class
  );
}

function ruleDescription(decision: RuleDecision, card: ActionCard): string {
  const target = card.proposed_action.target.target_app ?? "this target";

  switch (decision) {
    case "allow":
      return `Allow ${card.proposed_action.kind} on ${target}.`;
    case "block":
      return `Block ${card.proposed_action.kind} on ${target}.`;
    case "require_clutch":
      return `Require AgentClutch approval for ${card.proposed_action.kind} on ${target}.`;
  }
}

function normalizeRequestedRule(rule: JsonObject | undefined): {
  id?: string;
  description?: string;
  decision?: RuleDecision;
} {
  if (rule === undefined) return {};

  const id = typeof rule["id"] === "string" ? rule["id"] : undefined;
  const description =
    typeof rule["description"] === "string"
      ? rule["description"]
      : undefined;
  const decision = normalizeRuleDecision(rule["decision"]);

  return {
    ...(id === undefined ? {} : { id }),
    ...(description === undefined ? {} : { description }),
    ...(decision === undefined ? {} : { decision }),
  };
}

function normalizeRuleDecision(value: unknown): RuleDecision | undefined {
  if (value === "allow" || value === "block" || value === "require_clutch") {
    return value;
  }

  if (value === "require_action_card") return "require_clutch";

  return undefined;
}

function isLocalRule(value: unknown): value is LocalRule {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Record<string, unknown>;

  return (
    typeof record["id"] === "string" &&
    typeof record["description"] === "string" &&
    isRuleMatch(record["match"]) &&
    isRuleDecision(record["decision"]) &&
    typeof record["created_at"] === "string"
  );
}

function isRuleMatch(value: unknown): value is RuleMatch {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Record<string, unknown>;

  return (
    typeof record["action_kind"] === "string" &&
    typeof record["target_surface"] === "string" &&
    typeof record["consequence_class"] === "string" &&
    (record["target_app"] === undefined ||
      typeof record["target_app"] === "string")
  );
}

function isRuleDecision(value: unknown): value is RuleDecision {
  return value === "allow" || value === "require_clutch" || value === "block";
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
