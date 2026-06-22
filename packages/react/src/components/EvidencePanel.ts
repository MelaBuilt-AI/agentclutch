import type { EvidenceItem } from "@agentclutch/action-card";
import { h, type ReactElement } from "../element.js";

export interface EvidencePanelProps {
  evidence: EvidenceItem[];
  title?: string;
}

export function EvidencePanel({
  evidence,
  title = "Evidence"
}: EvidencePanelProps): ReactElement {
  return h(
    "section",
    { className: "ac-section ac-evidence-panel", "aria-label": title },
    h("h3", {}, title),
    evidence.length === 0
      ? h("p", { className: "ac-muted" }, "No evidence attached.")
      : h(
          "ul",
          { className: "ac-evidence-list" },
          evidence.map((item) =>
            h(
              "li",
              { key: item.id },
              h("strong", {}, item.label),
              item.summary === undefined
                ? null
                : h("span", { className: "ac-evidence-summary" }, item.summary),
              item.source_ref === undefined
                ? null
                : h("span", { className: "ac-muted" }, `Source: ${item.source_ref}`),
              item.quote === undefined
                ? null
                : h("blockquote", {}, item.quote)
            )
          )
        )
  );
}
