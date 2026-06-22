import type { ActionCard, RunStory, UserDecision } from "@agentclutch/action-card";

export function generateRunStory(
  runId: string,
  events: Array<ActionCard | UserDecision>
): RunStory {
  const steps: RunStory["steps"] = [];

  for (const event of events) {
    if (event.type === "agentclutch.action_card.v0") {
      steps.push({
        timestamp: event.created_at,
        actor: "agent",
        action_card_id: event.id,
        text: `The agent proposed: ${event.proposed_action.label}. Consequence: ${event.consequence.label}.`
      });
    }

    if (event.type === "agentclutch.user_decision.v0") {
      steps.push({
        timestamp: event.decided_at,
        actor: "user",
        decision_id: event.id,
        action_card_id: event.action_card_id,
        text: decisionToText(event)
      });
    }
  }

  return {
    type: "agentclutch.run_story.v0",
    id: `story_${runId}`,
    run_id: runId,
    created_at: new Date().toISOString(),
    title: `Run ${runId}`,
    summary: summarize(steps),
    steps
  };
}

function decisionToText(decision: UserDecision): string {
  switch (decision.decision) {
    case "approve_once":
      return "The user approved the action once.";
    case "edit_fields":
      return "The user edited fields before allowing the agent to continue.";
    case "take_wheel":
      return "The user took the wheel and continued manually.";
    case "block":
      return "The user blocked the proposed action.";
    case "create_rule":
      return "The user created a reusable rule from this decision.";
    case "request_more_context":
      return "The user requested more context before deciding.";
    case "timeout":
      return "The action timed out without approval.";
  }
}

function summarize(steps: RunStory["steps"]): string {
  const proposed = steps.filter(
    (step) => step.action_card_id && step.actor === "agent"
  ).length;
  const userEvents = steps.filter((step) => step.actor === "user").length;
  return `The run included ${proposed} proposed consequential action(s) and ${userEvents} user decision event(s).`;
}
