import type { RiskLevel } from "@agentclutch/action-card";
import { h, type ReactElement } from "../element.js";

export interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
}

export function RiskBadge({ level, score }: RiskBadgeProps): ReactElement {
  const label =
    score === undefined ? level.toUpperCase() : `${level.toUpperCase()} ${score}/100`;

  return h(
    "span",
    {
      className: `ac-risk-badge ac-risk-${level}`,
      "data-risk-level": level
    },
    label
  );
}
