import type { ActionCard, UserDecision } from "@agentclutch/action-card";

export type ClutchRunState =
  | "idle"
  | "running"
  | "paused"
  | "action_pending"
  | "user_editing"
  | "takeover"
  | "completed"
  | "failed";

export interface ClutchSessionSnapshot {
  run_id: string;
  state: ClutchRunState;
  current_action_card?: ActionCard;
  decisions: UserDecision[];
}

export class ClutchSession {
  private state: ClutchRunState = "idle";
  private currentActionCard: ActionCard | undefined;
  private decisions: UserDecision[] = [];

  constructor(public readonly run_id: string) {}

  start(): void {
    this.state = "running";
  }

  proposeAction(card: ActionCard): void {
    this.currentActionCard = card;
    this.state = "action_pending";
  }

  decide(decision: UserDecision): void {
    this.decisions.push(decision);

    if (decision.decision === "take_wheel") {
      this.state = "takeover";
      return;
    }

    if (decision.decision === "edit_fields") {
      this.state = "user_editing";
      return;
    }

    this.currentActionCard = undefined;
    this.state = "running";
  }

  pause(): void {
    this.state = "paused";
  }

  resume(): void {
    this.state = "running";
  }

  complete(): void {
    this.state = "completed";
  }

  fail(): void {
    this.state = "failed";
  }

  snapshot(): ClutchSessionSnapshot {
    return {
      run_id: this.run_id,
      state: this.state,
      decisions: [...this.decisions],
      ...(this.currentActionCard === undefined
        ? {}
        : { current_action_card: this.currentActionCard })
    };
  }
}
