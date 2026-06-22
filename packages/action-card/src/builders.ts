import type {
  ActionCard,
  AgentDescriptor,
  ConsequenceDescriptor,
  EvidenceItem,
  ISODateTime,
  JsonObject,
  ProposedAction,
  RiskDescriptor,
  UserOption
} from "./types";

export interface BuildActionCardInput {
  id: string;
  run_id: string;
  agent: AgentDescriptor;
  proposed_action: ProposedAction;
  consequence: ConsequenceDescriptor;
  risk: RiskDescriptor;
  evidence?: EvidenceItem[];
  user_options?: UserOption[];
  created_at?: ISODateTime;
  expires_at?: ISODateTime;
  metadata?: JsonObject;
}

export function buildActionCard(input: BuildActionCardInput): ActionCard {
  return {
    type: "agentclutch.action_card.v0",
    id: input.id,
    run_id: input.run_id,
    created_at: input.created_at ?? new Date().toISOString(),
    agent: input.agent,
    proposed_action: input.proposed_action,
    consequence: input.consequence,
    risk: input.risk,
    evidence: input.evidence ?? [],
    user_options: input.user_options ?? [
      "approve_once",
      "edit_fields",
      "take_wheel",
      "block"
    ],
    ...(input.expires_at === undefined ? {} : { expires_at: input.expires_at }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata })
  };
}
