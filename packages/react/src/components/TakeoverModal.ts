import type { ClutchDecision } from "@agentclutch/loop";
import { h, type ReactElement } from "../element.js";

export type TakeoverResumeMode = Extract<
  ClutchDecision,
  { type: "takeover" }
>["resumeMode"];

export interface TakeoverChoice {
  resumeMode: TakeoverResumeMode;
  note?: string;
}

export interface TakeoverModalProps {
  open: boolean;
  title?: string;
  note?: string;
  onClose: () => void;
  onSubmit: (choice: TakeoverChoice) => void;
}

const MODES: Array<{ mode: TakeoverResumeMode; label: string; description: string }> = [
  {
    mode: "resume_from_current_state",
    label: "Resume from current state",
    description: "The agent should observe the browser after the human finishes."
  },
  {
    mode: "resume_with_new_instruction",
    label: "Resume with new instruction",
    description: "The human will provide direction before the agent continues."
  },
  {
    mode: "stop_after_takeover",
    label: "Stop after takeover",
    description: "The human takes over and ends this loop."
  }
];

export function TakeoverModal({
  open,
  title = "Take the wheel",
  note,
  onClose,
  onSubmit
}: TakeoverModalProps): ReactElement | null {
  if (!open) return null;

  return h(
    "div",
    { className: "ac-modal-backdrop", role: "presentation" },
    h(
      "section",
      {
        className: "ac-modal ac-takeover-modal",
        role: "dialog",
        "aria-modal": true,
        "aria-labelledby": "ac-takeover-title"
      },
      h(
        "header",
        { className: "ac-modal-header" },
        h("div", {}, h("p", { className: "ac-eyebrow" }, "AgentClutch"), h("h2", { id: "ac-takeover-title" }, title)),
        h(
          "button",
          {
            type: "button",
            className: "ac-icon-btn",
            "aria-label": "Close takeover modal",
            onClick: onClose
          },
          "x"
        )
      ),
      note === undefined ? null : h("p", { className: "ac-muted" }, note),
      h(
        "div",
        { className: "ac-takeover-options" },
        MODES.map((item) =>
          h(
            "button",
            {
              type: "button",
              key: item.mode,
              className: "ac-takeover-option",
              "data-resume-mode": item.mode,
              onClick: () =>
                onSubmit({
                  resumeMode: item.mode,
                  ...(note === undefined ? {} : { note })
                })
            },
            h("strong", {}, item.label),
            h("span", {}, item.description)
          )
        )
      )
    )
  );
}
