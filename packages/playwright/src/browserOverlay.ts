import type { ActionCard, UserDecision } from "@agentclutch/action-card";

export function browserOverlayScript(): string {
  return `
(() => {
  if (window.__agentClutchInstalled) return;
  window.__agentClutchInstalled = true;

  const style = document.createElement("style");
  style.textContent = ${JSON.stringify(inlineCss())};
  document.documentElement.appendChild(style);

  function formatValue(value) {
    if (value === undefined || value === null || value === "") return "Unknown";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function inputValue(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function formatToken(value) {
    return formatValue(value).replaceAll("_", " ");
  }

  function removeExisting() {
    document.querySelectorAll("[data-agentclutch-root]").forEach((element) => element.remove());
    document.querySelectorAll("[data-agentclutch-highlight]").forEach((element) => element.remove());
  }

  function highlightTarget(card) {
    const selector = card && card.proposed_action && card.proposed_action.target && card.proposed_action.target.selector;
    if (!selector) return;

    let target;
    try {
      target = document.querySelector(selector);
    } catch {
      return;
    }

    if (!target) return;

    const rect = target.getBoundingClientRect();
    if (!rect.width && !rect.height) return;

    const highlight = document.createElement("div");
    highlight.setAttribute("data-agentclutch-highlight", "true");
    highlight.className = "ac-dom-highlight";
    highlight.style.left = rect.left + window.scrollX + "px";
    highlight.style.top = rect.top + window.scrollY + "px";
    highlight.style.width = rect.width + "px";
    highlight.style.height = rect.height + "px";
    document.body.appendChild(highlight);
  }

  window.__agentclutchShowActionCard = function(card) {
    removeExisting();
    highlightTarget(card);

    return new Promise((resolve) => {
      const root = document.createElement("div");
      root.setAttribute("data-agentclutch-root", "true");
      root.className = "ac-modal-backdrop";

      const target = card.proposed_action.target || {};
      const consequence = card.consequence || {};
      const risk = card.risk || {};
      const changedFields = card.proposed_action.changed_fields || [];
      const appliedLessons = appliedLessonsFromMetadata(card.metadata);
      const canEdit = changedFields.some((field) => field.editable);
      const changedRows = changedFields.map((field, index) => {
        const afterCell = field.editable
          ? "<input class=\\"ac-field-input\\" data-edit-field-index=\\"" + index + "\\" aria-label=\\"Edit " + escapeHtml(field.field) + "\\" value=\\"" + escapeHtml(inputValue(field.after)) + "\\" />"
          : escapeHtml(formatValue(field.after));

        return "<tr><td>" + escapeHtml(field.field) + "</td><td>" + escapeHtml(formatValue(field.before)) + "</td><td>" + afterCell + "</td></tr>";
      }).join("");
      const evidenceRows = (card.evidence || []).map((item) =>
        "<li><strong>" + escapeHtml(item.label) + "</strong>" +
        (item.summary ? "<span>" + escapeHtml(item.summary) + "</span>" : "") +
        "</li>"
      ).join("");
      const riskReasons = (risk.reasons || []).map((reason) =>
        "<li>" + escapeHtml(reason) + "</li>"
      ).join("");
      const consequenceRows = consequenceRowsHtml(consequence, risk);
      const lessonRows = appliedLessons.map((lesson) =>
        "<li><strong>" + escapeHtml(lesson.field) + ": " +
        escapeHtml(formatValue(lesson.original_value)) + " -> " +
        escapeHtml(formatValue(lesson.corrected_value)) +
        "</strong><span>Source: learned from prior correction</span></li>"
      ).join("");

      root.innerHTML =
        "<section class=\\"ac-modal\\" role=\\"dialog\\" aria-modal=\\"true\\" aria-label=\\"AgentClutch Action Card\\">" +
          "<header class=\\"ac-header\\">" +
            "<div><p class=\\"ac-eyebrow\\">AgentClutch Action Card</p><h2>" + escapeHtml(card.proposed_action.label) + "</h2></div>" +
            "<span class=\\"ac-risk-badge\\">" + escapeHtml(formatValue(risk.level).toUpperCase()) + (risk.score === undefined ? "" : " " + escapeHtml(risk.score) + "/100") + "</span>" +
          "</header>" +
          "<div class=\\"ac-section\\"><h3>Target</h3><dl>" +
            "<dt>Selector</dt><dd>" + escapeHtml(formatValue(target.selector)) + "</dd>" +
            "<dt>Button</dt><dd>" + escapeHtml(formatValue(target.button_text || target.aria_label)) + "</dd>" +
            "<dt>Page</dt><dd>" + escapeHtml(formatValue(target.page_title || document.title)) + "</dd>" +
            "<dt>URL</dt><dd>" + escapeHtml(formatValue(target.url || location.href)) + "</dd>" +
          "</dl></div>" +
          "<div class=\\"ac-section\\"><h3>Consequence</h3><dl>" + consequenceRows + "</dl></div>" +
          (changedRows ? "<div class=\\"ac-section\\"><h3>What will change</h3><table class=\\"ac-table\\"><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>" + changedRows + "</tbody></table></div>" : "") +
          (lessonRows ? "<div class=\\"ac-section ac-lesson\\"><h3>Applied Lesson</h3><ul>" + lessonRows + "</ul></div>" : "") +
          "<div class=\\"ac-section\\"><h3>Risk</h3><p>" + escapeHtml(formatValue(risk.level)) + "</p><ul>" + riskReasons + "</ul></div>" +
          "<div class=\\"ac-section\\"><h3>Evidence</h3><ul>" + (evidenceRows || "<li>No evidence attached.</li>") + "</ul></div>" +
          "<div class=\\"ac-actions\\">" +
            (lessonRows ? "<button type=\\"button\\" data-decision=\\"accept_lesson\\" class=\\"ac-btn ac-primary\\">Accept lesson</button>" : "") +
            (lessonRows ? "<button type=\\"button\\" data-decision=\\"reject_lesson\\" class=\\"ac-btn\\">Reject lesson</button>" : "") +
            (lessonRows ? "<button type=\\"button\\" data-decision=\\"disable_lesson\\" class=\\"ac-btn\\">Disable lesson</button>" : "") +
            "<button type=\\"button\\" data-decision=\\"approve_once\\" class=\\"ac-btn ac-primary\\">Approve once</button>" +
            (canEdit ? "<button type=\\"button\\" data-decision=\\"edit_fields\\" class=\\"ac-btn\\">Edit fields</button>" : "") +
            "<button type=\\"button\\" data-decision=\\"take_wheel\\" class=\\"ac-btn\\">Take wheel</button>" +
            "<button type=\\"button\\" data-decision=\\"block\\" class=\\"ac-btn ac-danger\\">Block</button>" +
            "<button type=\\"button\\" data-decision=\\"create_rule\\" class=\\"ac-btn\\">Create rule</button>" +
          "</div>" +
        "</section>";

      root.addEventListener("click", (event) => {
        const target = event.target;
        if (!target || !target.closest) return;
        const button = target.closest("[data-decision]");
        if (!button) return;

        const decision = button.getAttribute("data-decision");
        const editedFields = collectEditedFields(root, changedFields);
        const finalDecision = decision === "approve_once" && editedFields.length > 0
          ? "edit_fields"
          : decision;
        const userDecision = {
          type: "agentclutch.user_decision.v0",
          id: createBrowserId("decision"),
          action_card_id: card.id,
          run_id: card.run_id,
          decided_at: new Date().toISOString(),
          decision: finalDecision,
          actor: {
            display_name: "local-user"
          }
        };

        if (finalDecision === "edit_fields" && editedFields.length > 0) {
          userDecision.edited_fields = editedFields;
        }

        removeExisting();
        resolve(userDecision);
      });

      document.body.appendChild(root);
      const firstButton = root.querySelector("button");
      if (firstButton) firstButton.focus();
    });
  };

  function createBrowserId(prefix) {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return prefix + "_" + globalThis.crypto.randomUUID();
    }
    return prefix + "_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  function collectEditedFields(root, changedFields) {
    const editedFields = [];

    changedFields.forEach((field, index) => {
      if (!field.editable) return;

      const input = root.querySelector("[data-edit-field-index=\\"" + index + "\\"]");
      if (!input) return;

      const nextValue = parseEditedValue(input.value, field.after);
      if (jsonValueEquals(nextValue, field.after)) return;

      const editedField = {
        field: field.field,
        before: field.after,
        after: nextValue,
        editable: true
      };

      if (field.evidence_ids !== undefined) {
        editedField.evidence_ids = field.evidence_ids;
      }

      editedFields.push(editedField);
    });

    return editedFields;
  }

  function parseEditedValue(rawValue, original) {
    const trimmed = String(rawValue).trim();

    if (typeof original === "number") {
      const parsed = Number(trimmed);
      return trimmed.length > 0 && Number.isFinite(parsed) ? parsed : rawValue;
    }

    if (typeof original === "boolean") {
      if (trimmed.toLowerCase() === "true") return true;
      if (trimmed.toLowerCase() === "false") return false;
      return rawValue;
    }

    if (original === null || typeof original === "object") {
      try {
        const parsed = JSON.parse(rawValue);
        return isJsonValue(parsed) ? parsed : rawValue;
      } catch {
        return rawValue;
      }
    }

    return rawValue;
  }

  function isJsonValue(value) {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return true;
    }

    if (Array.isArray(value)) return value.every(isJsonValue);

    return typeof value === "object" && value !== null &&
      Object.values(value).every(isJsonValue);
  }

  function jsonValueEquals(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  function appliedLessonsFromMetadata(metadata) {
    const value = metadata && metadata.applied_lessons;
    if (!Array.isArray(value)) return [];

    return value.filter((lesson) =>
      lesson &&
      typeof lesson === "object" &&
      typeof lesson.field === "string" &&
      "original_value" in lesson &&
      "corrected_value" in lesson
    );
  }

  function consequenceRowsHtml(consequence, risk) {
    const rows = [
      ["Consequence", formatValue(consequence.label)],
      ["Risk", formatValue(risk.level)],
      ["Reversibility", formatToken(consequence.reversibility)],
      ["Blast radius", formatToken(consequence.blast_radius)]
    ];

    if (Array.isArray(consequence.possible_residue) && consequence.possible_residue.length > 0) {
      rows.push(["Possible residue", consequence.possible_residue.map(formatValue).join("; ")]);
    }

    if (typeof consequence.compensation_hint === "string" && consequence.compensation_hint.length > 0) {
      rows.push(["Compensation", consequence.compensation_hint]);
    }

    return rows.map((row) =>
      "<dt>" + escapeHtml(row[0]) + "</dt><dd>" + escapeHtml(row[1]) + "</dd>"
    ).join("");
  }
})();
`;
}

function inlineCss(): string {
  return `
.ac-modal-backdrop{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:rgba(4,8,16,.42);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#101828}.ac-modal{width:min(760px,calc(100vw - 32px));max-height:min(820px,calc(100vh - 32px));overflow:auto;background:#fff;border:1px solid #d0d5dd;border-radius:8px;box-shadow:0 24px 72px rgba(16,24,40,.28);padding:20px}.ac-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #eaecf0;padding-bottom:14px}.ac-eyebrow{margin:0;color:#475467;font-size:12px;font-weight:700;text-transform:uppercase}.ac-header h2{margin:4px 0 0;font-size:22px;line-height:1.25;letter-spacing:0}.ac-risk-badge{white-space:nowrap;border:1px solid #fedf89;background:#fffaeb;color:#93370d;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700}.ac-section{margin-top:14px}.ac-section h3{margin:0 0 8px;color:#344054;font-size:13px;letter-spacing:0}.ac-section p{margin:0 0 6px}.ac-muted{color:#667085}.ac-lesson{background:#f0f9ff;border:1px solid #b9e6fe;border-radius:8px;padding:12px}.ac-section dl{display:grid;grid-template-columns:92px minmax(0,1fr);gap:6px 10px;margin:0}.ac-section dt{color:#667085}.ac-section dd{margin:0;overflow-wrap:anywhere}.ac-section ul{margin:0;padding-left:18px}.ac-section li{margin:4px 0}.ac-section li span{display:block;color:#667085}.ac-table{width:100%;border-collapse:collapse;font-size:14px}.ac-table th,.ac-table td{border-bottom:1px solid #eaecf0;padding:8px;text-align:left}.ac-field-input{width:min(220px,100%);min-height:34px;border:1px solid #d0d5dd;border-radius:6px;padding:7px 9px;color:#101828;background:#fff;font:inherit}.ac-field-input:focus{outline:3px solid rgba(21,112,239,.16);outline-offset:1px}.ac-actions{position:sticky;bottom:0;display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;padding-top:14px;background:linear-gradient(rgba(255,255,255,0),#fff 28%)}.ac-btn{border:1px solid #d0d5dd;border-radius:6px;background:#fff;color:#101828;font-weight:700;font-size:14px;line-height:20px;padding:9px 12px;cursor:pointer}.ac-btn:focus{outline:3px solid rgba(21,112,239,.18);outline-offset:1px}.ac-primary{background:#1570ef;border-color:#1570ef;color:#fff}.ac-danger{background:#d92d20;border-color:#d92d20;color:#fff}.ac-dom-highlight{position:absolute;z-index:2147483645;pointer-events:none;border:3px solid #f79009;border-radius:6px;box-shadow:0 0 0 5px rgba(247,144,9,.22),0 8px 24px rgba(247,144,9,.28)}@media(max-width:640px){.ac-modal{padding:16px}.ac-header{display:block}.ac-risk-badge{display:inline-block;margin-top:10px}.ac-section dl{grid-template-columns:1fr}.ac-btn{flex:1 1 calc(50% - 8px);min-width:120px}}
`;
}

declare global {
  interface Window {
    __agentClutchInstalled?: boolean;
    __agentclutchShowActionCard?: (card: ActionCard) => Promise<UserDecision>;
  }
}
