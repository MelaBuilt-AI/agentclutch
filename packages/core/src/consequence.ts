import type { ConsequenceDescriptor } from "@agentclutch/action-card";

export interface ConsequenceInput {
  kind: string;
  label?: string;
  url?: string;
  buttonText?: string;
}

export interface ConsequenceRegistryMatch {
  includesAll?: string[];
  includesAny?: string[];
}

export interface ConsequenceRegistryEntry {
  id: string;
  description: string;
  match: ConsequenceRegistryMatch;
  consequence: ConsequenceDescriptor;
}

export const DEFAULT_CONSEQUENCE_REGISTRY: readonly ConsequenceRegistryEntry[] = [
  {
    id: "payment_or_purchase",
    description: "Browser checkout, buying, and purchase actions.",
    match: {
      includesAny: ["checkout", "buy", "purchase"]
    },
    consequence: {
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
    }
  },
  {
    id: "external_message_send",
    description: "Email or message sends to another person or channel.",
    match: {
      includesAll: ["send"],
      includesAny: ["email", "message"]
    },
    consequence: {
      class: "external_message_send",
      label: "External message send",
      description: "This action may send content to another person or channel.",
      reversibility: "residue_remains",
      blast_radius: "team",
      requires_confirmation: true,
      possible_residue: ["Recipient may read or forward the message"],
      compensation_hint: "Send a follow-up correction if needed."
    }
  },
  {
    id: "external_business_submission",
    description: "Form submits and business record submissions.",
    match: {
      includesAny: ["submit"]
    },
    consequence: {
      class: "external_business_submission",
      label: "External business submission",
      description:
        "This action may submit information to an external or business system.",
      reversibility: "not_cleanly_reversible",
      blast_radius: "single_user",
      requires_confirmation: true,
      possible_residue: ["A submitted record may remain in the target system"]
    }
  },
  {
    id: "local_file_delete",
    description: "Delete and remove actions that may destroy data.",
    match: {
      includesAny: ["delete", "remove"]
    },
    consequence: {
      class: "local_file_delete",
      label: "Delete or remove",
      description: "This action may delete information or remove an object.",
      reversibility: "unknown",
      blast_radius: "workspace",
      requires_confirmation: true,
      possible_residue: ["Deleted data may not be recoverable"]
    }
  },
  {
    id: "production_change",
    description: "Repository, deployment, and production state changes.",
    match: {
      includesAny: ["merge", "deploy", "production"]
    },
    consequence: {
      class: "production_change",
      label: "Production or repository change",
      description: "This action may alter code, deployment, or production state.",
      reversibility: "compensable",
      blast_radius: "production",
      requires_confirmation: true,
      compensation_hint:
        "Revert commit, rollback deployment, or restore previous config."
    }
  }
];

export function classifyConsequence(
  input: ConsequenceInput,
  registry: readonly ConsequenceRegistryEntry[] = DEFAULT_CONSEQUENCE_REGISTRY
): ConsequenceDescriptor {
  const entry = findConsequenceRegistryEntry(input, registry);

  return entry === undefined
    ? unknownConsequence()
    : cloneConsequence(entry.consequence);
}

export function findConsequenceRegistryEntry(
  input: ConsequenceInput,
  registry: readonly ConsequenceRegistryEntry[] = DEFAULT_CONSEQUENCE_REGISTRY
): ConsequenceRegistryEntry | undefined {
  const haystack = [
    input.kind,
    input.label ?? "",
    input.buttonText ?? "",
    input.url ?? ""
  ]
    .join(" ")
    .toLowerCase();

  return registry.find((entry) => registryEntryMatches(entry, haystack));
}

function registryEntryMatches(
  entry: ConsequenceRegistryEntry,
  haystack: string
): boolean {
  const includesAll = entry.match.includesAll ?? [];
  const includesAny = entry.match.includesAny ?? [];

  if (!includesAll.every((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return false;
  }

  if (
    includesAny.length > 0 &&
    !includesAny.some((keyword) => haystack.includes(keyword.toLowerCase()))
  ) {
    return false;
  }

  return true;
}

function cloneConsequence(
  consequence: ConsequenceDescriptor
): ConsequenceDescriptor {
  return {
    ...consequence,
    ...(consequence.possible_residue === undefined
      ? {}
      : { possible_residue: [...consequence.possible_residue] })
  };
}

function unknownConsequence(): ConsequenceDescriptor {
  return {
    class: "unknown",
    label: "Unknown consequence",
    description: "AgentClutch could not confidently classify this action.",
    reversibility: "unknown",
    blast_radius: "unknown",
    requires_confirmation: true
  };
}
