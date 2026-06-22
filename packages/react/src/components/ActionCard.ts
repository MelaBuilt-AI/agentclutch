import type { ActionCard as ActionCardModel, JsonValue } from "@agentclutch/action-card";
import { h, type ReactElement } from "../element.js";
import { DecisionBar, type ActionCardDecisionType } from "./DecisionBar.js";
import { EvidencePanel } from "./EvidencePanel.js";
import { RiskBadge } from "./RiskBadge.js";

export interface ActionCardProps {
  card: ActionCardModel;
  onDecision: (decision: ActionCardDecisionType) => void;
  title?: string;
}

export function ActionCard({
  card,
  onDecision,
  title = "AgentClutch Action Card"
}: ActionCardProps): ReactElement {
  const action = card.proposed_action;
  const target = action.target;
  const changedFields = action.changed_fields ?? [];
  const allowEdit =
    changedFields.length === 0 || changedFields.some((field) => field.editable);

  return h(
    "section",
    {
      className: "ac-action-card",
      role: "dialog",
      "aria-labelledby": "ac-action-card-title"
    },
    h(
      "header",
      { className: "ac-modal-header" },
      h(
        "div",
        {},
        h("p", { className: "ac-eyebrow" }, title),
        h("h2", { id: "ac-action-card-title" }, action.label),
        h("p", { className: "ac-muted" }, action.kind)
      ),
      RiskBadge({
        level: card.risk.level,
        ...(card.risk.score === undefined ? {} : { score: card.risk.score })
      })
    ),
    h(
      "div",
      { className: "ac-section" },
      h("h3", {}, "The agent wants to"),
      h("p", { className: "ac-large" }, action.description ?? action.label)
    ),
    h(
      "div",
      { className: "ac-grid" },
      h(
        "section",
        { className: "ac-section", "aria-label": "Visible context" },
        h("h3", {}, "Visible context"),
        definitionList([
          ["Surface", target.surface],
          ["App", target.target_app ?? "Unknown"],
          ["Selector", target.selector ?? "Unknown"],
          ["Button", target.button_text ?? target.aria_label ?? "Unknown"],
          ["Page", target.page_title ?? "Unknown"],
          ["URL", target.url ?? "Unknown"]
        ])
      ),
      h(
        "section",
        { className: "ac-section", "aria-label": "Consequence and risk" },
        h("h3", {}, "Consequence and risk"),
        definitionList([
          ["Consequence", card.consequence.label],
          ["Risk", card.risk.level],
          ["Reversibility", formatToken(card.consequence.reversibility)],
          ["Blast radius", formatToken(card.consequence.blast_radius)]
        ])
      )
    ),
    changedFields.length === 0
      ? null
      : h(
          "section",
          { className: "ac-section", "aria-label": "Changed fields" },
          h("h3", {}, "What will change"),
          h(
            "table",
            { className: "ac-table" },
            h(
              "thead",
              {},
              h("tr", {}, h("th", {}, "Field"), h("th", {}, "Before"), h("th", {}, "After"))
            ),
            h(
              "tbody",
              {},
              changedFields.map((field) =>
                h(
                  "tr",
                  { key: field.field },
                  h("td", {}, field.field),
                  h("td", {}, formatJsonValue(field.before)),
                  h("td", {}, formatJsonValue(field.after))
                )
              )
            )
          )
        ),
    h(
      "section",
      { className: "ac-section", "aria-label": "Risk reasons" },
      h("h3", {}, "Why this is risky"),
      card.risk.reasons.length === 0
        ? h("p", { className: "ac-muted" }, "No risk reasons attached.")
        : h(
            "ul",
            {},
            card.risk.reasons.map((reason) => h("li", { key: reason }, reason))
          )
    ),
    EvidencePanel({ evidence: card.evidence }),
    DecisionBar({
      onDecision,
      allowEdit,
      allowCreateRule: card.user_options.includes("create_rule")
    })
  );
}

function definitionList(rows: Array<[string, string]>): ReactElement {
  return h(
    "dl",
    { className: "ac-dl" },
    rows.flatMap(([label, value]) => [
      h("dt", { key: `${label}-term` }, label),
      h("dd", { key: `${label}-value` }, value)
    ])
  );
}

function formatToken(value: string): string {
  return value.replaceAll("_", " ");
}

function formatJsonValue(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "Not set";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
