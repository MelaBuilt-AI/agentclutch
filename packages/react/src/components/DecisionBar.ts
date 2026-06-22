import type { UserDecisionType } from "@agentclutch/action-card";
import { h, type ReactElement } from "../element.js";

export type ActionCardDecisionType = Extract<
  UserDecisionType,
  "approve_once" | "edit_fields" | "take_wheel" | "block" | "create_rule"
>;

export interface DecisionBarProps {
  onDecision: (decision: ActionCardDecisionType) => void;
  allowEdit?: boolean;
  allowCreateRule?: boolean;
  disabled?: boolean;
}

export function DecisionBar({
  onDecision,
  allowEdit = true,
  allowCreateRule = true,
  disabled = false
}: DecisionBarProps): ReactElement {
  return h(
    "div",
    { className: "ac-decision-bar", role: "group", "aria-label": "Action decision" },
    decisionButton("Approve once", "approve_once", onDecision, {
      className: "ac-btn ac-btn-primary",
      disabled
    }),
    allowEdit
      ? decisionButton("Edit fields", "edit_fields", onDecision, {
          className: "ac-btn",
          disabled
        })
      : null,
    decisionButton("Take wheel", "take_wheel", onDecision, {
      className: "ac-btn",
      disabled
    }),
    decisionButton("Block", "block", onDecision, {
      className: "ac-btn ac-btn-danger",
      disabled
    }),
    allowCreateRule
      ? decisionButton("Create rule", "create_rule", onDecision, {
          className: "ac-btn",
          disabled
        })
      : null
  );
}

function decisionButton(
  label: string,
  decision: ActionCardDecisionType,
  onDecision: (decision: ActionCardDecisionType) => void,
  props: { className: string; disabled: boolean }
): ReactElement {
  return h(
    "button",
    {
      type: "button",
      className: props.className,
      disabled: props.disabled,
      "data-decision": decision,
      onClick: () => onDecision(decision)
    },
    label
  );
}
