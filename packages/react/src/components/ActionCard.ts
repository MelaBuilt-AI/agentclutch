import type {
  ActionCard as ActionCardModel,
  ChangedField,
  JsonObject,
  JsonValue,
} from "@agentclutch/action-card";
import { h, type ReactElement } from "../element.js";
import { DecisionBar, type ActionCardDecisionType } from "./DecisionBar.js";
import { EvidencePanel } from "./EvidencePanel.js";
import { RiskBadge } from "./RiskBadge.js";

export interface ActionCardProps {
  card: ActionCardModel;
  onDecision: (
    decision: ActionCardDecisionType,
    editedFields?: ChangedField[],
  ) => void;
  title?: string;
}

export function ActionCard({
  card,
  onDecision,
  title = "AgentClutch Action Card",
}: ActionCardProps): ReactElement {
  const action = card.proposed_action;
  const target = action.target;
  const changedFields = action.changed_fields ?? [];
  const appliedLessons = appliedLessonsFromMetadata(card.metadata);
  const allowEdit = changedFields.some((field) => field.editable);
  const editedDrafts = new Map(
    changedFields
      .filter((field) => field.editable)
      .map((field) => [field.field, inputValue(field.after)]),
  );

  function decide(decision: ActionCardDecisionType): void {
    const editedFields = collectEditedFields(changedFields, editedDrafts);

    if (decision === "approve_once" && editedFields.length > 0) {
      onDecision("edit_fields", editedFields);
      return;
    }

    if (decision === "edit_fields") {
      onDecision(decision, editedFields);
      return;
    }

    onDecision(decision);
  }

  return h(
    "section",
    {
      className: "ac-action-card",
      role: "dialog",
      "aria-labelledby": "ac-action-card-title",
    },
    h(
      "header",
      { className: "ac-modal-header" },
      h(
        "div",
        {},
        h("p", { className: "ac-eyebrow" }, title),
        h("h2", { id: "ac-action-card-title" }, action.label),
        h("p", { className: "ac-muted" }, action.kind),
      ),
      RiskBadge({
        level: card.risk.level,
        ...(card.risk.score === undefined ? {} : { score: card.risk.score }),
      }),
    ),
    h(
      "div",
      { className: "ac-section" },
      h("h3", {}, "The agent wants to"),
      h("p", { className: "ac-large" }, action.description ?? action.label),
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
          ["URL", target.url ?? "Unknown"],
        ]),
      ),
      h(
        "section",
        { className: "ac-section", "aria-label": "Consequence and risk" },
        h("h3", {}, "Consequence and risk"),
        definitionList([
          ["Consequence", card.consequence.label],
          ["Risk", card.risk.level],
          ["Reversibility", formatToken(card.consequence.reversibility)],
          ["Blast radius", formatToken(card.consequence.blast_radius)],
        ]),
      ),
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
              h(
                "tr",
                {},
                h("th", {}, "Field"),
                h("th", {}, "Before"),
                h("th", {}, "After"),
              ),
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
                  h(
                    "td",
                    {},
                    field.editable
                      ? editableFieldInput(field, editedDrafts)
                      : formatJsonValue(field.after),
                  ),
                ),
              ),
            ),
          ),
        ),
    appliedLessons.length === 0
      ? null
      : h(
          "section",
          {
            className: "ac-section ac-lesson-section",
            "aria-label": "Applied lesson",
          },
          h("h3", {}, "Applied Lesson"),
          h(
            "ul",
            { className: "ac-lesson-list" },
            appliedLessons.map((lesson) =>
              h(
                "li",
                { key: lesson.id },
                h(
                  "strong",
                  {},
                  `${lesson.field}: ${formatJsonValue(lesson.original_value)} -> ${formatJsonValue(lesson.corrected_value)}`,
                ),
                h("span", {}, "Source: learned from prior correction"),
              ),
            ),
          ),
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
            card.risk.reasons.map((reason) => h("li", { key: reason }, reason)),
          ),
    ),
    EvidencePanel({ evidence: card.evidence }),
    DecisionBar({
      onDecision: decide,
      allowEdit,
      allowCreateRule: card.user_options.includes("create_rule"),
      allowLessonActions: appliedLessons.length > 0,
    }),
  );
}

interface AppliedLessonMetadata {
  id: string;
  field: string;
  original_value: JsonValue;
  corrected_value: JsonValue;
}

function definitionList(rows: Array<[string, string]>): ReactElement {
  return h(
    "dl",
    { className: "ac-dl" },
    rows.flatMap(([label, value]) => [
      h("dt", { key: `${label}-term` }, label),
      h("dd", { key: `${label}-value` }, value),
    ]),
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

function appliedLessonsFromMetadata(
  metadata: JsonObject | undefined,
): AppliedLessonMetadata[] {
  const value = metadata?.["applied_lessons"];

  if (!Array.isArray(value)) return [];

  const lessons: AppliedLessonMetadata[] = [];

  for (const item of value) {
    if (isAppliedLessonMetadata(item)) lessons.push(item);
  }

  return lessons;
}

function isAppliedLessonMetadata(value: unknown): value is AppliedLessonMetadata {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record["id"] === "string" &&
    typeof record["field"] === "string" &&
    isJsonValue(record["original_value"]) &&
    isJsonValue(record["corrected_value"])
  );
}

function editableFieldInput(
  field: ChangedField,
  editedDrafts: Map<string, string>,
): ReactElement {
  return h("input", {
    className: "ac-field-input",
    name: `field-${field.field}`,
    "aria-label": `Edit ${field.field}`,
    value: inputValue(field.after),
    onInput: (event: Event) => {
      const input = event.currentTarget as HTMLInputElement | null;
      editedDrafts.set(field.field, input?.value ?? "");
    },
  });
}

function collectEditedFields(
  fields: readonly ChangedField[],
  editedDrafts: Map<string, string>,
): ChangedField[] {
  const editedFields: ChangedField[] = [];

  for (const field of fields) {
    if (!field.editable) continue;

    const rawValue = editedDrafts.get(field.field) ?? inputValue(field.after);
    const nextValue = parseEditedValue(rawValue, field.after);

    if (jsonValueEquals(nextValue, field.after)) continue;

    editedFields.push({
      field: field.field,
      before: field.after,
      after: nextValue,
      ...(field.evidence_ids === undefined
        ? {}
        : { evidence_ids: field.evidence_ids }),
      editable: true,
    });
  }

  return editedFields;
}

function inputValue(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function parseEditedValue(rawValue: string, original: JsonValue): JsonValue {
  const trimmed = rawValue.trim();

  if (typeof original === "number") {
    const parsed = Number(trimmed);
    return trimmed.length > 0 && Number.isFinite(parsed) ? parsed : rawValue;
  }

  if (typeof original === "boolean") {
    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;
    return rawValue;
  }

  if (original === null || typeof original === "object") {
    try {
      const parsed = JSON.parse(rawValue) as unknown;
      return isJsonValue(parsed) ? parsed : rawValue;
    } catch {
      return rawValue;
    }
  }

  return rawValue;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) return value.every(isJsonValue);

  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every(isJsonValue)
  );
}

function jsonValueEquals(left: JsonValue, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
