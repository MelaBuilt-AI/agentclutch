import type { ConsequenceDescriptor } from "@agentclutch/action-card";

export interface ConsequenceInput {
  kind: string;
  label?: string;
  url?: string;
  buttonText?: string;
}

export function classifyConsequence(
  input: ConsequenceInput
): ConsequenceDescriptor {
  const haystack = [
    input.kind,
    input.label ?? "",
    input.buttonText ?? "",
    input.url ?? ""
  ]
    .join(" ")
    .toLowerCase();

  if (
    haystack.includes("checkout") ||
    haystack.includes("buy") ||
    haystack.includes("purchase")
  ) {
    return {
      class: "payment_or_purchase",
      label: "Payment or purchase",
      description: "This action may spend money or place an order.",
      reversibility: "compensable",
      blast_radius: "single_user",
      requires_confirmation: true,
      possible_residue: [
        "Order record may be created",
        "Payment authorization may be captured"
      ],
      compensation_hint: "Cancel order or request refund if available."
    };
  }

  if (
    haystack.includes("send") &&
    (haystack.includes("email") || haystack.includes("message"))
  ) {
    return {
      class: "external_message_send",
      label: "External message send",
      description: "This action may send content to another person or channel.",
      reversibility: "residue_remains",
      blast_radius: "team",
      requires_confirmation: true,
      possible_residue: ["Recipient may read or forward the message"],
      compensation_hint: "Send a follow-up correction if needed."
    };
  }

  if (haystack.includes("submit")) {
    return {
      class: "external_business_submission",
      label: "External business submission",
      description:
        "This action may submit information to an external or business system.",
      reversibility: "not_cleanly_reversible",
      blast_radius: "single_user",
      requires_confirmation: true,
      possible_residue: [
        "A submitted record may remain in the target system"
      ]
    };
  }

  if (haystack.includes("delete") || haystack.includes("remove")) {
    return {
      class: "local_file_delete",
      label: "Delete or remove",
      description: "This action may delete information or remove an object.",
      reversibility: "unknown",
      blast_radius: "workspace",
      requires_confirmation: true,
      possible_residue: ["Deleted data may not be recoverable"]
    };
  }

  if (
    haystack.includes("merge") ||
    haystack.includes("deploy") ||
    haystack.includes("production")
  ) {
    return {
      class: "production_change",
      label: "Production or repository change",
      description: "This action may alter code, deployment, or production state.",
      reversibility: "compensable",
      blast_radius: "production",
      requires_confirmation: true,
      compensation_hint:
        "Revert commit, rollback deployment, or restore previous config."
    };
  }

  return {
    class: "unknown",
    label: "Unknown consequence",
    description: "AgentClutch could not confidently classify this action.",
    reversibility: "unknown",
    blast_radius: "unknown",
    requires_confirmation: true
  };
}
