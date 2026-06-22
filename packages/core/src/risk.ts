import type {
  ConsequenceDescriptor,
  RiskDescriptor
} from "@agentclutch/action-card";

export function riskFromConsequence(
  consequence: ConsequenceDescriptor
): RiskDescriptor {
  const reasons: string[] = [];
  let score = 10;

  if (consequence.requires_confirmation) {
    score += 20;
    reasons.push("This action requires explicit confirmation.");
  }

  switch (consequence.reversibility) {
    case "cleanly_reversible":
      score += 0;
      break;
    case "compensable":
      score += 10;
      reasons.push("This action may need a compensating action to undo.");
      break;
    case "residue_remains":
      score += 25;
      reasons.push("This action may leave residue even after correction.");
      break;
    case "not_cleanly_reversible":
      score += 30;
      reasons.push("This action is not cleanly reversible.");
      break;
    case "irreversible":
      score += 45;
      reasons.push("This action may be irreversible.");
      break;
    case "unknown":
      score += 20;
      reasons.push("Reversibility is unknown.");
      break;
  }

  switch (consequence.blast_radius) {
    case "single_user":
      score += 10;
      break;
    case "single_customer":
      score += 20;
      break;
    case "team":
      score += 25;
      break;
    case "organization":
    case "production":
    case "public":
      score += 40;
      break;
    case "unknown":
      score += 15;
      break;
    case "none":
    case "single_page":
    case "single_local_file":
    case "workspace":
      score += 0;
      break;
  }

  const normalized = Math.min(100, Math.max(0, score));

  return {
    level:
      normalized >= 85
        ? "critical"
        : normalized >= 65
          ? "high"
          : normalized >= 35
            ? "medium"
            : "low",
    score: normalized,
    reasons
  };
}
