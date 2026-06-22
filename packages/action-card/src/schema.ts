import { z } from "zod";
import type { JsonObject, JsonValue } from "./types";

export const ActionSurfaceSchema = z.enum([
  "browser",
  "desktop",
  "filesystem",
  "shell",
  "mcp",
  "email",
  "chat",
  "github",
  "calendar",
  "payment",
  "saas",
  "endpoint",
  "unknown"
]);

export const ConsequenceClassSchema = z.enum([
  "none",
  "local_visual_change",
  "local_file_write",
  "local_file_delete",
  "external_message_send",
  "external_business_submission",
  "payment_or_purchase",
  "identity_or_permission_change",
  "production_change",
  "code_repository_change",
  "endpoint_or_device_change",
  "sensitive_data_access",
  "unknown"
]);

export const ReversibilitySchema = z.enum([
  "cleanly_reversible",
  "compensable",
  "residue_remains",
  "not_cleanly_reversible",
  "irreversible",
  "unknown"
]);

export const BlastRadiusSchema = z.enum([
  "none",
  "single_page",
  "single_local_file",
  "workspace",
  "single_user",
  "single_customer",
  "team",
  "organization",
  "public",
  "production",
  "unknown"
]);

export const RiskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
  "unknown"
]);

export const UserOptionSchema = z.enum([
  "approve_once",
  "approve_always_for_this_target",
  "edit_fields",
  "take_wheel",
  "block",
  "create_rule",
  "request_more_context"
]);

export const UserDecisionTypeSchema = z.enum([
  "approve_once",
  "edit_fields",
  "take_wheel",
  "block",
  "create_rule",
  "request_more_context",
  "timeout"
]);

export const EvidenceSourceTypeSchema = z.enum([
  "dom",
  "user_instruction",
  "file",
  "screenshot",
  "tool_output",
  "api_response",
  "memory",
  "system_policy",
  "unknown"
]);

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema)
  ])
);

export const JsonObjectSchema: z.ZodType<JsonObject> = z.record(
  z.string(),
  JsonValueSchema
);

export const AgentDescriptorSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    runtime: z.string().optional(),
    version: z.string().optional(),
    model: z.string().optional()
  })
  .strict();

export const BoundingBoxSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  })
  .strict();

export const VisibleTargetSchema = z
  .object({
    surface: ActionSurfaceSchema,
    target_app: z.string().optional(),
    url: z.string().optional(),
    page_title: z.string().optional(),
    selector: z.string().optional(),
    selector_hash: z.string().optional(),
    button_text: z.string().optional(),
    aria_label: z.string().optional(),
    bounding_box: BoundingBoxSchema.optional()
  })
  .strict();

export const EvidenceItemSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    source_type: EvidenceSourceTypeSchema,
    source_ref: z.string().optional(),
    summary: z.string().optional(),
    quote: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    hash: z.string().optional()
  })
  .strict();

export const ChangedFieldSchema = z
  .object({
    field: z.string().min(1),
    before: JsonValueSchema.optional(),
    after: JsonValueSchema,
    evidence_ids: z.array(z.string()).optional(),
    editable: z.boolean().optional()
  })
  .strict();

export const ConsequenceDescriptorSchema = z
  .object({
    class: ConsequenceClassSchema,
    label: z.string().min(1),
    description: z.string().optional(),
    reversibility: ReversibilitySchema,
    blast_radius: BlastRadiusSchema,
    requires_confirmation: z.boolean(),
    possible_residue: z.array(z.string()).optional(),
    compensation_hint: z.string().optional()
  })
  .strict();

export const RiskDescriptorSchema = z
  .object({
    level: RiskLevelSchema,
    score: z.number().min(0).max(100).optional(),
    reasons: z.array(z.string()),
    policy_ids: z.array(z.string()).optional()
  })
  .strict();

export const ProposedActionSchema = z
  .object({
    id: z.string().min(1),
    kind: z.string().min(1),
    label: z.string().min(1),
    description: z.string().optional(),
    surface: ActionSurfaceSchema,
    target: VisibleTargetSchema,
    changed_fields: z.array(ChangedFieldSchema).optional(),
    raw: JsonObjectSchema.optional()
  })
  .strict();

export const ActionCardSchema = z
  .object({
    type: z.literal("agentclutch.action_card.v0"),
    id: z.string().min(1),
    run_id: z.string().min(1),
    created_at: z.string().datetime(),
    agent: AgentDescriptorSchema,
    proposed_action: ProposedActionSchema,
    consequence: ConsequenceDescriptorSchema,
    risk: RiskDescriptorSchema,
    evidence: z.array(EvidenceItemSchema),
    user_options: z.array(UserOptionSchema),
    expires_at: z.string().datetime().optional(),
    metadata: JsonObjectSchema.optional()
  })
  .strict();

export const ActorDescriptorSchema = z
  .object({
    id: z.string().optional(),
    display_name: z.string().optional()
  })
  .strict();

export const UserDecisionSchema = z
  .object({
    type: z.literal("agentclutch.user_decision.v0"),
    id: z.string().min(1),
    action_card_id: z.string().min(1),
    run_id: z.string().min(1),
    decided_at: z.string().datetime(),
    decision: UserDecisionTypeSchema,
    edited_fields: z.array(ChangedFieldSchema).optional(),
    reason: z.string().optional(),
    rule: JsonObjectSchema.optional(),
    actor: ActorDescriptorSchema.optional()
  })
  .strict();

export const InterventionEventSchema = z
  .object({
    type: z.literal("agentclutch.intervention_event.v0"),
    id: z.string().min(1),
    run_id: z.string().min(1),
    action_card_id: z.string().optional(),
    timestamp: z.string().datetime(),
    event: z.enum([
      "pause",
      "resume",
      "approve",
      "edit",
      "take_wheel",
      "block",
      "rule_created",
      "timeout"
    ]),
    summary: z.string(),
    data: JsonObjectSchema.optional()
  })
  .strict();

export const PerceptionElementSchema = z
  .object({
    selector: z.string().optional(),
    role: z.string().optional(),
    label: z.string().optional(),
    text: z.string().optional(),
    clickable: z.boolean().optional(),
    consequential_hint: z.boolean().optional(),
    bounding_box: BoundingBoxSchema.optional()
  })
  .strict();

export const PerceptionFrameSchema = z
  .object({
    type: z.literal("agentclutch.perception_frame.v0"),
    id: z.string().min(1),
    run_id: z.string().min(1),
    timestamp: z.string().datetime(),
    surface: ActionSurfaceSchema,
    visible_text: z.string().optional(),
    url: z.string().optional(),
    page_title: z.string().optional(),
    elements: z.array(PerceptionElementSchema).optional()
  })
  .strict();

export const RunStoryStepSchema = z
  .object({
    timestamp: z.string().datetime(),
    actor: z.enum(["agent", "user", "system"]),
    text: z.string(),
    action_card_id: z.string().optional(),
    decision_id: z.string().optional()
  })
  .strict();

export const RunStorySchema = z
  .object({
    type: z.literal("agentclutch.run_story.v0"),
    id: z.string().min(1),
    run_id: z.string().min(1),
    created_at: z.string().datetime(),
    title: z.string(),
    summary: z.string(),
    steps: z.array(RunStoryStepSchema)
  })
  .strict();

export const ActionCardJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://agentclutch.dev/schemas/action-card.schema.json",
  title: "AgentClutch Action Card v0",
  type: "object",
  required: [
    "type",
    "id",
    "run_id",
    "created_at",
    "agent",
    "proposed_action",
    "consequence",
    "risk",
    "evidence",
    "user_options"
  ],
  properties: {
    type: { const: "agentclutch.action_card.v0" },
    id: { type: "string", minLength: 1 },
    run_id: { type: "string", minLength: 1 },
    created_at: { type: "string", format: "date-time" },
    agent: {
      type: "object",
      required: ["name"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        runtime: { type: "string" },
        version: { type: "string" },
        model: { type: "string" }
      },
      additionalProperties: false
    },
    proposed_action: {
      type: "object",
      required: ["id", "kind", "label", "surface", "target"],
      properties: {
        id: { type: "string" },
        kind: { type: "string" },
        label: { type: "string" },
        description: { type: "string" },
        surface: { type: "string" },
        target: {
          type: "object",
          required: ["surface"],
          properties: {
            surface: { type: "string" },
            target_app: { type: "string" },
            url: { type: "string" },
            page_title: { type: "string" },
            selector: { type: "string" },
            selector_hash: { type: "string" },
            button_text: { type: "string" },
            aria_label: { type: "string" },
            bounding_box: {
              type: "object",
              required: ["x", "y", "width", "height"],
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number" },
                height: { type: "number" }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        },
        changed_fields: {
          type: "array",
          items: {
            type: "object",
            required: ["field", "after"],
            properties: {
              field: { type: "string" },
              before: true,
              after: true,
              evidence_ids: {
                type: "array",
                items: { type: "string" }
              },
              editable: { type: "boolean" }
            },
            additionalProperties: false
          }
        },
        raw: { type: "object" }
      },
      additionalProperties: false
    },
    consequence: {
      type: "object",
      required: [
        "class",
        "label",
        "reversibility",
        "blast_radius",
        "requires_confirmation"
      ],
      properties: {
        class: { type: "string" },
        label: { type: "string" },
        description: { type: "string" },
        reversibility: { type: "string" },
        blast_radius: { type: "string" },
        requires_confirmation: { type: "boolean" },
        possible_residue: {
          type: "array",
          items: { type: "string" }
        },
        compensation_hint: { type: "string" }
      },
      additionalProperties: false
    },
    risk: {
      type: "object",
      required: ["level", "reasons"],
      properties: {
        level: { type: "string" },
        score: { type: "number", minimum: 0, maximum: 100 },
        reasons: {
          type: "array",
          items: { type: "string" }
        },
        policy_ids: {
          type: "array",
          items: { type: "string" }
        }
      },
      additionalProperties: false
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "label", "source_type"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          source_type: { type: "string" },
          source_ref: { type: "string" },
          summary: { type: "string" },
          quote: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          hash: { type: "string" }
        },
        additionalProperties: false
      }
    },
    user_options: {
      type: "array",
      items: { type: "string" }
    },
    expires_at: { type: "string", format: "date-time" },
    metadata: { type: "object" }
  },
  additionalProperties: false
} as const;

export type ActionCardFromSchema = z.infer<typeof ActionCardSchema>;
