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
      const evidenceRows = (card.evidence || []).map((item) =>
        "<li><strong>" + escapeHtml(item.label) + "</strong>" +
        (item.summary ? "<span>" + escapeHtml(item.summary) + "</span>" : "") +
        "</li>"
      ).join("");
      const riskReasons = (risk.reasons || []).map((reason) =>
        "<li>" + escapeHtml(reason) + "</li>"
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
          "<div class=\\"ac-section\\"><h3>Consequence</h3><p>" + escapeHtml(formatValue(consequence.label)) + "</p><p class=\\"ac-muted\\">" + escapeHtml(formatValue(consequence.description)) + "</p></div>" +
          "<div class=\\"ac-section\\"><h3>Risk</h3><p>" + escapeHtml(formatValue(risk.level)) + "</p><ul>" + riskReasons + "</ul></div>" +
          "<div class=\\"ac-section\\"><h3>Evidence</h3><ul>" + (evidenceRows || "<li>No evidence attached.</li>") + "</ul></div>" +
          "<div class=\\"ac-actions\\">" +
            "<button type=\\"button\\" data-decision=\\"approve_once\\" class=\\"ac-btn ac-primary\\">Approve once</button>" +
            "<button type=\\"button\\" data-decision=\\"edit_fields\\" class=\\"ac-btn\\">Edit fields</button>" +
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
        removeExisting();
        resolve({
          type: "agentclutch.user_decision.v0",
          id: createBrowserId("decision"),
          action_card_id: card.id,
          run_id: card.run_id,
          decided_at: new Date().toISOString(),
          decision,
          actor: {
            display_name: "local-user"
          }
        });
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

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\\"", "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
`;
}

function inlineCss(): string {
  return `
.ac-modal-backdrop{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:rgba(4,8,16,.42);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#101828}.ac-modal{width:min(760px,calc(100vw - 32px));max-height:min(820px,calc(100vh - 32px));overflow:auto;background:#fff;border:1px solid #d0d5dd;border-radius:8px;box-shadow:0 24px 72px rgba(16,24,40,.28);padding:20px}.ac-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #eaecf0;padding-bottom:14px}.ac-eyebrow{margin:0;color:#475467;font-size:12px;font-weight:700;text-transform:uppercase}.ac-header h2{margin:4px 0 0;font-size:22px;line-height:1.25;letter-spacing:0}.ac-risk-badge{white-space:nowrap;border:1px solid #fedf89;background:#fffaeb;color:#93370d;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700}.ac-section{margin-top:14px}.ac-section h3{margin:0 0 8px;color:#344054;font-size:13px;letter-spacing:0}.ac-section p{margin:0 0 6px}.ac-muted{color:#667085}.ac-section dl{display:grid;grid-template-columns:92px minmax(0,1fr);gap:6px 10px;margin:0}.ac-section dt{color:#667085}.ac-section dd{margin:0;overflow-wrap:anywhere}.ac-section ul{margin:0;padding-left:18px}.ac-section li{margin:4px 0}.ac-section li span{display:block;color:#667085}.ac-actions{position:sticky;bottom:-20px;display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;padding-top:14px;background:linear-gradient(rgba(255,255,255,0),#fff 28%)}.ac-btn{border:1px solid #d0d5dd;border-radius:6px;background:#fff;color:#101828;font-weight:700;font-size:14px;line-height:20px;padding:9px 12px;cursor:pointer}.ac-btn:focus{outline:3px solid rgba(21,112,239,.18);outline-offset:1px}.ac-primary{background:#1570ef;border-color:#1570ef;color:#fff}.ac-danger{background:#d92d20;border-color:#d92d20;color:#fff}.ac-dom-highlight{position:absolute;z-index:2147483645;pointer-events:none;border:3px solid #f79009;border-radius:6px;box-shadow:0 0 0 5px rgba(247,144,9,.22),0 8px 24px rgba(247,144,9,.28)}@media(max-width:640px){.ac-modal{padding:16px}.ac-header{display:block}.ac-risk-badge{display:inline-block;margin-top:10px}.ac-section dl{grid-template-columns:1fr}.ac-btn{flex:1 1 calc(50% - 8px);min-width:120px}}
`;
}

declare global {
  interface Window {
    __agentClutchInstalled?: boolean;
    __agentclutchShowActionCard?: (card: ActionCard) => Promise<UserDecision>;
  }
}
