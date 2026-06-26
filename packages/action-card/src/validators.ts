import type { ZodIssue } from "zod";
import { ActionCardSchema } from "./schema.js";
import type { ActionCard } from "./types.js";

export class ActionCardValidationError extends Error {
  public readonly issues: ZodIssue[];

  constructor(message: string, issues: ZodIssue[]) {
    super(message);
    this.name = "ActionCardValidationError";
    this.issues = issues;
  }
}

export interface ActionCardValidationSuccess {
  success: true;
  data: ActionCard;
}

export interface ActionCardValidationFailure {
  success: false;
  issues: ZodIssue[];
}

export type ActionCardValidationResult =
  | ActionCardValidationSuccess
  | ActionCardValidationFailure;

export function parseActionCard(value: unknown): ActionCard {
  const result = ActionCardSchema.safeParse(value);

  if (!result.success) {
    throw new ActionCardValidationError(
      "Invalid AgentClutch Action Card",
      result.error.issues
    );
  }

  return result.data as ActionCard;
}

export function validateActionCard(value: unknown): ActionCardValidationResult {
  const result = ActionCardSchema.safeParse(value);

  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues
    };
  }

  return {
    success: true,
    data: result.data as ActionCard
  };
}

export function isActionCard(value: unknown): value is ActionCard {
  return ActionCardSchema.safeParse(value).success;
}
