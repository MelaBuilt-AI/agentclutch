import {
  buildActionCard,
  parseActionCard,
  type ActionCard as ActionCardModel,
  type RunStoryStep
} from "@agentclutch/action-card";
import {
  ActionCard,
  RunStoryTimeline,
  type ActionCardDecisionType
} from "@agentclutch/react";
import "@agentclutch/react/styles.css";
import "./styles.css";
import { renderElement } from "./renderElement.js";
import { sampleActionCard, sampleRunSteps } from "./sample.js";

interface ViewerState {
  rawJson: string;
  card: ActionCardModel | null;
  error: string | null;
  decisionLog: Array<{ decision: ActionCardDecisionType; timestamp: string }>;
}

const state: ViewerState = {
  rawJson: JSON.stringify(sampleActionCard, null, 2),
  card: sampleActionCard,
  error: null,
  decisionLog: []
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
  shell.append(header(), editorPanel(), previewPanel(), timelinePanel(sampleRunSteps));
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
    <p>Paste an AgentClutch Action Card JSON object and render it locally.</p>
  `;
  return element;
}

function editorPanel(): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "viewer-panel viewer-editor";

  const title = document.createElement("h2");
  title.textContent = "Action Card JSON";

  const textarea = document.createElement("textarea");
  textarea.value = state.rawJson;
  textarea.spellcheck = false;
  textarea.setAttribute("aria-label", "Action Card JSON");
  textarea.addEventListener("input", () => {
    state.rawJson = textarea.value;
  });

  const actions = document.createElement("div");
  actions.className = "viewer-actions";

  const renderButton = document.createElement("button");
  renderButton.type = "button";
  renderButton.textContent = "Render card";
  renderButton.addEventListener("click", loadCardFromInput);

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Load sample";
  resetButton.addEventListener("click", () => {
    state.rawJson = JSON.stringify(sampleActionCard, null, 2);
    state.card = sampleActionCard;
    state.error = null;
    render();
  });

  actions.append(renderButton, resetButton);
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
              timestamp: new Date().toISOString()
            },
            ...state.decisionLog
          ];
          render();
        }
      })
    ),
    decisionLog()
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

function timelinePanel(steps: RunStoryStep[]): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "viewer-panel";
  panel.append(
    renderElement(
      RunStoryTimeline({
        steps
      })
    )
  );
  return panel;
}

function loadCardFromInput(): void {
  try {
    const parsed = parseActionCard(JSON.parse(state.rawJson));
    state.card = parsed;
    state.error = null;
  } catch (error) {
    state.card = null;
    state.error = validationMessage(error);
  }

  render();
}

function validationMessage(error: unknown): string {
  if (error instanceof SyntaxError) {
    return `Invalid JSON: ${error.message}`;
  }

  if (error instanceof Error) {
    return `Invalid Action Card: ${error.message}`;
  }

  return `Invalid Action Card: ${String(error)}`;
}

export function createViewerSampleCard(): ActionCardModel {
  return buildActionCard({
    ...sampleActionCard,
    id: "acard_viewer_copy",
    created_at: new Date().toISOString()
  });
}
