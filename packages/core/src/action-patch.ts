import type { ChangedField } from "@agentclutch/action-card";
import type { ActionPatch } from "@agentclutch/loop";

export function buildActionPatchesFromEditedFields(
  editedFields: readonly ChangedField[],
): ActionPatch[] {
  return editedFields.map((field) => ({
    op: "replace",
    path: `/changed_fields/${escapeJsonPointerSegment(field.field)}/after`,
    ...(field.before === undefined ? {} : { from: field.before }),
    value: field.after,
    reason: `User edited ${field.field}.`,
  }));
}

function escapeJsonPointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
