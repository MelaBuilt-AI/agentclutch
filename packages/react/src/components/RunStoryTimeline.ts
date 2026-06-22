import type {
  ActionCard as ActionCardModel,
  InterventionEvent,
  RunStory,
  RunStoryStep,
  UserDecision
} from "@agentclutch/action-card";
import { h, type ReactElement } from "../element.js";

export type RunStoryTimelineEvent =
  | ActionCardModel
  | UserDecision
  | InterventionEvent;

export interface RunStoryTimelineProps {
  story?: RunStory;
  steps?: RunStoryStep[];
  events?: RunStoryTimelineEvent[];
  emptyText?: string;
}

interface TimelineItem {
  id: string;
  timestamp: string;
  actor: string;
  text: string;
}

export function RunStoryTimeline({
  story,
  steps,
  events,
  emptyText = "No run story events yet."
}: RunStoryTimelineProps): ReactElement {
  const items = timelineItems({
    ...(story === undefined ? {} : { story }),
    ...(steps === undefined ? {} : { steps }),
    ...(events === undefined ? {} : { events })
  });

  return h(
    "section",
    { className: "ac-run-story", "aria-label": "Run story timeline" },
    h("h3", {}, story?.title ?? "Run story"),
    story?.summary === undefined
      ? null
      : h("p", { className: "ac-muted" }, story.summary),
    items.length === 0
      ? h("p", { className: "ac-muted" }, emptyText)
      : h(
          "ol",
          { className: "ac-run-story-list" },
          items.map((item) =>
            h(
              "li",
              { key: item.id },
              h("time", { dateTime: item.timestamp }, formatTimestamp(item.timestamp)),
              h("span", { className: `ac-actor ac-actor-${item.actor}` }, item.actor),
              h("p", {}, item.text)
            )
          )
        )
  );
}

function timelineItems({
  story,
  steps,
  events
}: Pick<RunStoryTimelineProps, "story" | "steps" | "events">): TimelineItem[] {
  const storySteps = steps ?? story?.steps;

  if (storySteps !== undefined) {
    return storySteps
      .map((step, index) => ({
        id: step.decision_id ?? step.action_card_id ?? `step_${index}`,
        timestamp: step.timestamp,
        actor: step.actor,
        text: step.text
      }))
      .sort(sortTimeline);
  }

  return (events ?? []).map(eventToItem).sort(sortTimeline);
}

function eventToItem(event: RunStoryTimelineEvent): TimelineItem {
  if (event.type === "agentclutch.action_card.v0") {
    return {
      id: event.id,
      timestamp: event.created_at,
      actor: "agent",
      text: `Proposed ${event.proposed_action.label}.`
    };
  }

  if (event.type === "agentclutch.user_decision.v0") {
    return {
      id: event.id,
      timestamp: event.decided_at,
      actor: "user",
      text: `Decision: ${event.decision.replaceAll("_", " ")}.`
    };
  }

  return {
    id: event.id,
    timestamp: event.timestamp,
    actor: "system",
    text: event.summary
  };
}

function sortTimeline(left: TimelineItem, right: TimelineItem): number {
  return left.timestamp.localeCompare(right.timestamp);
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
