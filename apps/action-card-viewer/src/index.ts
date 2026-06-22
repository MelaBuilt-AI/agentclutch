import {
  buildActionCard,
  parseActionCard,
  type ActionCard as ActionCardModel,
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
  error: string | null;
  decisionLog: Array<{ decision: ActionCardDecisionType; timestamp: string }>;
}

const state: ViewerState = {
  rawInput: sampleRecorderEventsJsonl,
  card: sampleActionCard,
  story: generateRunStoryFromJsonl(sampleRecorderEventsJsonl),
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
  shell.append(header(), editorPanel(), previewPanel(), timelinePanel());
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
        onDecision: (decision) => {
          state.decisionLog = [
            {
              decision,
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
    row.textContent = `${item.decision} at ${new Date(item.timestamp).toLocaleString()}`;
    list.append(row);
  }
  section.append(list);
  return section;
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
    state.error = null;
  } catch (cardError) {
    try {
      const events = parseRecorderEventsJsonl(state.rawInput);
      state.story = generateRunStoryFromJsonl(state.rawInput);
      state.card = findFirstActionCard(events);
      state.error = null;
    } catch (eventsError) {
      state.card = null;
      state.story = null;
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

export function createViewerSampleCard(): ActionCardModel {
  return buildActionCard({
    ...sampleActionCard,
    id: "acard_viewer_copy",
    created_at: new Date().toISOString(),
  });
}
