import {
  buildActionCard,
  parseActionCard,
  type ActionCard as ActionCardModel,
  type ChangedField,
  type RunStory,
} from "@agentclutch/action-card";
import {
  generateRunStory,
  generateRunStoryFromJsonl,
  parseRecorderEventsJsonl,
} from "@agentclutch/core";
import {
  ActionCard,
  RunStoryTimeline,
  type ActionCardDecisionType,
} from "@agentclutch/react";
import "@agentclutch/react/styles.css";
import "./styles.css";
import { renderElement } from "./renderElement.js";
import { sampleActionCard, sampleRecorderEventsJsonl } from "./sample.js";

interface ViewerState {
  rawInput: string;
  card: ActionCardModel | null;
  story: RunStory | null;
  lessons: ViewerLesson[];
  error: string | null;
  decisionLog: Array<{
    decision: ActionCardDecisionType;
    editedFields?: ChangedField[];
    timestamp: string;
  }>;
}

interface ViewerLesson {
  id: string;
  field: string;
  original_value: unknown;
  corrected_value: unknown;
  source?: string;
  event?: string;
}

const state: ViewerState = {
  rawInput: sampleRecorderEventsJsonl,
  card: sampleActionCard,
  story: generateRunStoryFromJsonl(sampleRecorderEventsJsonl),
  lessons: lessonsFromEvents(parseRecorderEventsJsonl(sampleRecorderEventsJsonl)),
  error: null,
  decisionLog: [],
};

const root = document.querySelector<HTMLDivElement>("#root");

if (root === null) {
  throw new Error("Missing #root element.");
}

const appRoot = root;

render();

function render(): void {
  appRoot.replaceChildren(view());
}

function view(): HTMLElement {
  const shell = document.createElement("main");
  shell.className = "viewer-shell";
  shell.append(
    header(),
    editorPanel(),
    previewPanel(),
    lessonsPanel(),
    timelinePanel(),
  );
  return shell;
}

function header(): HTMLElement {
  const element = document.createElement("header");
  element.className = "viewer-header";
  element.innerHTML = `
    <div>
      <p class="viewer-eyebrow">AgentClutch</p>
      <h1>Action Card Viewer</h1>
    </div>
    <p>Paste an Action Card JSON object or recorder event JSONL and render it locally.</p>
  `;
  return element;
}

function editorPanel(): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "viewer-panel viewer-editor";

  const title = document.createElement("h2");
  title.textContent = "Action Card JSON or Event JSONL";

  const textarea = document.createElement("textarea");
  textarea.value = state.rawInput;
  textarea.spellcheck = false;
  textarea.placeholder =
    "Paste .agentclutch/runs/<run_id>/events.jsonl contents or an Action Card JSON object";
  textarea.setAttribute("aria-label", "Action Card JSON or event JSONL");
  textarea.addEventListener("input", () => {
    state.rawInput = textarea.value;
  });

  const actions = document.createElement("div");
  actions.className = "viewer-actions";

  const renderButton = document.createElement("button");
  renderButton.type = "button";
  renderButton.textContent = "Render input";
  renderButton.addEventListener("click", loadInput);

  const sampleEventsButton = document.createElement("button");
  sampleEventsButton.type = "button";
  sampleEventsButton.textContent = "Load sample events";
  sampleEventsButton.addEventListener("click", () => {
    state.rawInput = sampleRecorderEventsJsonl;
    state.card = sampleActionCard;
    state.story = generateRunStoryFromJsonl(sampleRecorderEventsJsonl);
    state.lessons = lessonsFromEvents(
      parseRecorderEventsJsonl(sampleRecorderEventsJsonl),
    );
    state.error = null;
    render();
  });

  const sampleCardButton = document.createElement("button");
  sampleCardButton.type = "button";
  sampleCardButton.textContent = "Load sample card";
  sampleCardButton.addEventListener("click", () => {
    state.rawInput = JSON.stringify(sampleActionCard, null, 2);
    state.card = sampleActionCard;
    state.story = generateRunStory(sampleActionCard.run_id, [sampleActionCard]);
    state.lessons = lessonsFromCard(sampleActionCard);
    state.error = null;
    render();
  });

  actions.append(renderButton, sampleEventsButton, sampleCardButton);
  panel.append(title, textarea, actions);

  if (state.error !== null) {
    const error = document.createElement("pre");
    error.className = "viewer-error";
    error.textContent = state.error;
    panel.append(error);
  }

  return panel;
}

function lessonsPanel(): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "viewer-panel viewer-lessons";

  const title = document.createElement("h2");
  title.textContent = "Lessons";
  panel.append(title);

  if (state.lessons.length === 0) {
    const empty = document.createElement("p");
    empty.className = "viewer-muted";
    empty.textContent = "No lessons found in the current input.";
    panel.append(empty);
    return panel;
  }

  const list = document.createElement("ul");
  for (const lesson of state.lessons) {
    const item = document.createElement("li");
    const source = lesson.source ?? lesson.event ?? "lesson";
    item.textContent = `${lesson.field}: ${formatUnknownValue(lesson.original_value)} -> ${formatUnknownValue(lesson.corrected_value)} (${source})`;
    list.append(item);
  }

  panel.append(list);
  return panel;
}

function previewPanel(): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "viewer-panel viewer-preview";

  const title = document.createElement("h2");
  title.textContent = "Rendered Action Card";
  panel.append(title);

  if (state.card === null) {
    const empty = document.createElement("p");
    empty.className = "viewer-muted";
    empty.textContent = "No valid Action Card loaded.";
    panel.append(empty);
    return panel;
  }

  panel.append(
    renderElement(
      ActionCard({
        card: state.card,
        onDecision: (decision, editedFields) => {
          state.decisionLog = [
            {
              decision,
              ...(editedFields === undefined ? {} : { editedFields }),
              timestamp: new Date().toISOString(),
            },
            ...state.decisionLog,
          ];
          render();
        },
      }),
    ),
    decisionLog(),
  );

  return panel;
}

function decisionLog(): HTMLElement {
  const section = document.createElement("section");
  section.className = "viewer-decision-log";

  const title = document.createElement("h3");
  title.textContent = "Decision callbacks";
  section.append(title);

  if (state.decisionLog.length === 0) {
    const empty = document.createElement("p");
    empty.className = "viewer-muted";
    empty.textContent = "Click a decision button to see callback output.";
    section.append(empty);
    return section;
  }

  const list = document.createElement("ol");
  for (const item of state.decisionLog) {
    const row = document.createElement("li");
    row.textContent = `${item.decision} at ${new Date(item.timestamp).toLocaleString()}${formatEditedFields(item.editedFields)}`;
    list.append(row);
  }
  section.append(list);
  return section;
}

function formatEditedFields(fields: ChangedField[] | undefined): string {
  if (fields === undefined || fields.length === 0) return "";

  return `; edits: ${fields
    .map(
      (field) =>
        `${field.field} ${formatFieldValue(field.before)} -> ${formatFieldValue(field.after)}`,
    )
    .join(", ")}`;
}

function formatFieldValue(
  value: ChangedField["after"] | ChangedField["before"],
): string {
  if (value === undefined) return "unset";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function timelinePanel(): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "viewer-panel";
  panel.append(
    renderElement(
      RunStoryTimeline({
        ...(state.story === null ? {} : { story: state.story }),
        emptyText: "Paste recorder JSONL to generate a run story.",
      }),
    ),
  );
  return panel;
}

function loadInput(): void {
  try {
    const parsed = parseActionCard(JSON.parse(state.rawInput));
    state.card = parsed;
    state.story = generateRunStory(parsed.run_id, [parsed]);
    state.lessons = lessonsFromCard(parsed);
    state.error = null;
  } catch (cardError) {
    try {
      const events = parseRecorderEventsJsonl(state.rawInput);
      state.story = generateRunStoryFromJsonl(state.rawInput);
      state.card = findFirstActionCard(events);
      state.lessons = lessonsFromEvents(events);
      state.error = null;
    } catch (eventsError) {
      state.card = null;
      state.story = null;
      state.lessons = [];
      state.error = validationMessage(cardError, eventsError);
    }
  }

  render();
}

function findFirstActionCard(events: unknown[]): ActionCardModel | null {
  for (const event of events) {
    const card = tryParseActionCard(event);

    if (card !== null) {
      return card;
    }

    if (isRecord(event)) {
      const payloadCard = tryParseActionCard(event.payload);

      if (payloadCard !== null) {
        return payloadCard;
      }
    }
  }

  return null;
}

function tryParseActionCard(value: unknown): ActionCardModel | null {
  try {
    return parseActionCard(value);
  } catch {
    return null;
  }
}

function validationMessage(cardError: unknown, eventsError: unknown): string {
  const cardMessage =
    cardError instanceof Error ? cardError.message : String(cardError);
  const eventsMessage =
    eventsError instanceof Error ? eventsError.message : String(eventsError);

  return `Could not render as an Action Card or recorder JSONL.\n\nAction Card: ${cardMessage}\nRecorder JSONL: ${eventsMessage}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function lessonsFromEvents(events: unknown[]): ViewerLesson[] {
  const lessons: ViewerLesson[] = [];

  for (const event of events) {
    if (isRecord(event)) {
      const payload = event["payload"];
      const lesson = lessonFromPayload(payload, String(event["eventType"] ?? ""));

      if (lesson !== null) {
        lessons.push(lesson);
      }

      const card = tryParseActionCard(event);
      if (card !== null) {
        lessons.push(...lessonsFromCard(card));
      }

      if (isRecord(payload)) {
        const payloadCard = tryParseActionCard(payload);
        if (payloadCard !== null) {
          lessons.push(...lessonsFromCard(payloadCard));
        }
      }
    }
  }

  return dedupeLessons(lessons);
}

function lessonsFromCard(card: ActionCardModel): ViewerLesson[] {
  const value = card.metadata?.["applied_lessons"];

  if (!Array.isArray(value)) return [];

  const lessons: ViewerLesson[] = [];

  for (const item of value) {
    const lesson = lessonFromPayload({ lesson: item }, "applied_lesson");
    if (lesson !== null) lessons.push(lesson);
  }

  return lessons;
}

function lessonFromPayload(payload: unknown, event: string): ViewerLesson | null {
  if (!isRecord(payload)) return null;

  const lesson = payload["lesson"];
  if (!isRecord(lesson)) return null;

  if (
    typeof lesson["id"] !== "string" ||
    typeof lesson["field"] !== "string" ||
    !("original_value" in lesson) ||
    !("corrected_value" in lesson)
  ) {
    return null;
  }

  return {
    id: lesson["id"],
    field: lesson["field"],
    original_value: lesson["original_value"],
    corrected_value: lesson["corrected_value"],
    ...(typeof lesson["source"] === "string"
      ? { source: lesson["source"] }
      : {}),
    ...(event.length === 0 ? {} : { event }),
  };
}

function dedupeLessons(lessons: ViewerLesson[]): ViewerLesson[] {
  const seen = new Set<string>();
  const deduped: ViewerLesson[] = [];

  for (const lesson of lessons) {
    const key = `${lesson.id}:${lesson.event ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(lesson);
  }

  return deduped;
}

function formatUnknownValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function createViewerSampleCard(): ActionCardModel {
  return buildActionCard({
    ...sampleActionCard,
    id: "acard_viewer_copy",
    created_at: new Date().toISOString(),
  });
}
