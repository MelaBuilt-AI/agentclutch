export type ISODateTime = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type ActionSurface =
  | "browser"
  | "desktop"
  | "filesystem"
  | "shell"
  | "mcp"
  | "email"
  | "chat"
  | "github"
  | "calendar"
  | "payment"
  | "saas"
  | "endpoint"
  | "unknown";

export type ConsequenceClass =
  | "none"
  | "local_visual_change"
  | "local_file_write"
  | "local_file_delete"
  | "external_message_send"
  | "external_business_submission"
  | "payment_or_purchase"
  | "identity_or_permission_change"
  | "production_change"
  | "code_repository_change"
  | "endpoint_or_device_change"
  | "sensitive_data_access"
  | "unknown";

export type Reversibility =
  | "cleanly_reversible"
  | "compensable"
  | "residue_remains"
  | "not_cleanly_reversible"
  | "irreversible"
  | "unknown";

export type BlastRadius =
  | "none"
  | "single_page"
  | "single_local_file"
  | "workspace"
  | "single_user"
  | "single_customer"
  | "team"
  | "organization"
  | "public"
  | "production"
  | "unknown";

export type RiskLevel = "low" | "medium" | "high" | "critical" | "unknown";

export type UserOption =
  | "approve_once"
  | "approve_always_for_this_target"
  | "edit_fields"
  | "accept_lesson"
  | "reject_lesson"
  | "disable_lesson"
  | "take_wheel"
  | "block"
  | "create_rule"
  | "request_more_context";

export interface AgentDescriptor {
  id?: string;
  name: string;
  runtime?: string;
  version?: string;
  model?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisibleTarget {
  surface: ActionSurface;
  target_app?: string;
  url?: string;
  page_title?: string;
  selector?: string;
  selector_hash?: string;
  button_text?: string;
  aria_label?: string;
  bounding_box?: BoundingBox;
}

export type EvidenceSourceType =
  | "dom"
  | "user_instruction"
  | "file"
  | "screenshot"
  | "tool_output"
  | "api_response"
  | "memory"
  | "system_policy"
  | "unknown";

export interface EvidenceItem {
  id: string;
  label: string;
  source_type: EvidenceSourceType;
  source_ref?: string;
  summary?: string;
  quote?: string;
  confidence?: number;
  hash?: string;
}

export interface ChangedField {
  field: string;
  before?: JsonValue;
  after: JsonValue;
  evidence_ids?: string[];
  editable?: boolean;
}

export interface ConsequenceDescriptor {
  class: ConsequenceClass;
  label: string;
  description?: string;
  reversibility: Reversibility;
  blast_radius: BlastRadius;
  requires_confirmation: boolean;
  possible_residue?: string[];
  compensation_hint?: string;
}

export interface RiskDescriptor {
  level: RiskLevel;
  score?: number;
  reasons: string[];
  policy_ids?: string[];
}

export interface ProposedAction {
  id: string;
  kind: string;
  label: string;
  description?: string;
  surface: ActionSurface;
  target: VisibleTarget;
  changed_fields?: ChangedField[];
  raw?: JsonObject;
}

export interface ActionCard {
  type: "agentclutch.action_card.v0";
  id: string;
  run_id: string;
  created_at: ISODateTime;
  agent: AgentDescriptor;
  proposed_action: ProposedAction;
  consequence: ConsequenceDescriptor;
  risk: RiskDescriptor;
  evidence: EvidenceItem[];
  user_options: UserOption[];
  expires_at?: ISODateTime;
  metadata?: JsonObject;
}

export type UserDecisionType =
  | "approve_once"
  | "edit_fields"
  | "accept_lesson"
  | "reject_lesson"
  | "disable_lesson"
  | "take_wheel"
  | "block"
  | "create_rule"
  | "request_more_context"
  | "timeout";

export interface UserDecision {
  type: "agentclutch.user_decision.v0";
  id: string;
  action_card_id: string;
  run_id: string;
  decided_at: ISODateTime;
  decision: UserDecisionType;
  edited_fields?: ChangedField[];
  reason?: string;
  rule?: JsonObject;
  actor?: {
    id?: string;
    display_name?: string;
  };
}

export interface InterventionEvent {
  type: "agentclutch.intervention_event.v0";
  id: string;
  run_id: string;
  action_card_id?: string;
  timestamp: ISODateTime;
  event:
    | "pause"
    | "resume"
    | "approve"
    | "edit"
    | "take_wheel"
    | "block"
    | "rule_created"
    | "timeout";
  summary: string;
  data?: JsonObject;
}

export interface PerceptionElement {
  selector?: string;
  role?: string;
  label?: string;
  text?: string;
  clickable?: boolean;
  consequential_hint?: boolean;
  bounding_box?: BoundingBox;
}

export interface PerceptionFrame {
  type: "agentclutch.perception_frame.v0";
  id: string;
  run_id: string;
  timestamp: ISODateTime;
  surface: ActionSurface;
  visible_text?: string;
  url?: string;
  page_title?: string;
  elements?: PerceptionElement[];
}

export interface RunStoryStep {
  timestamp: ISODateTime;
  actor: "agent" | "user" | "system";
  text: string;
  action_card_id?: string;
  decision_id?: string;
}

export interface RunStory {
  type: "agentclutch.run_story.v0";
  id: string;
  run_id: string;
  created_at: ISODateTime;
  title: string;
  summary: string;
  steps: RunStoryStep[];
}
