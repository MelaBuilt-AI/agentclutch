# AgentClutch

**The open Action Card and takeover UX for consequential AI agent actions.**

**Tagline:** Approve, edit, or take the wheel before agents touch the real world.  
**Category:** Consequential-action UX for AI agents.  
**Primary repo name:** `agentclutch`  
**Primary package scope:** `@agentclutch/*`  
**Initial license:** Apache-2.0 or MIT. Recommended: Apache-2.0 for enterprise comfort and patent language.  
**Initial language:** TypeScript-first. Rust and Python are planned adapter/sidecar layers, not the MVP core.  
**Initial runtime:** Node.js 22+, pnpm workspaces, Playwright, React, Vite. First-class targets: Linux, WSL2 Ubuntu, and native Windows.  
**Document status:** Living design and launch-readiness specification. Current implementation is public as `v0.7.3-alpha.0` on GitHub and npm.

---

## 0. Executive Summary

AgentClutch is an embeddable front-end control layer for AI agents. It is **loop-native internally and prompt-compatible at the SDK edge**. It does **not** try to become another agent framework, another browser agent, another desktop agent, another human-agent protocol, or another generic dashboard. It owns one narrow, high-value moment:

> The moment before an AI agent performs a consequential action.

A consequential action is anything that can affect the external world, user data, money, identity, production systems, messages, files, permissions, code, or customer state.

Examples:

- Submit a form
- Send an email
- Post a Slack message
- Buy an item
- Book travel
- Delete a file
- Merge a pull request
- Deploy to production
- Approve OAuth
- Change permissions
- Run a shell command
- Touch an endpoint
- Write to a SaaS system
- Call a paid API

AgentClutch turns those proposed actions into clear, inspectable, editable **Action Cards** and gives the user a visible steering wheel:

- **Approve once**
- **Edit fields**
- **Take wheel**
- **Block**
- **Create rule**

The first visual wedge is small and local-first. Current private-repo command:

```bash
pnpm demo:checkout
```

Public npm alpha command:

```bash
pnpm dlx @agentclutch/cli@alpha demo checkout
```

The demo launches a browser-agent simulation. The agent tries to click a checkout/submit/send/delete action. AgentClutch freezes the action, highlights the target, explains what will change, shows reversibility and risk, and lets the human approve, edit, block, or take over.

---

## 0.5 Loop-First Design Commitment

AgentClutch is **loop-first**, not prompt-first.

The product is not designed around the old pattern:

```text
user prompt -> agent response -> maybe ask for approval
```

It is designed around engineered agent loops:

```text
goal -> perceive -> update state -> plan -> propose action -> clutch decision -> execute -> observe -> resume or stop
```

AgentClutch owns the **clutch point** inside that loop:

```text
Agent loop proposes a side-effecting action
        ↓
AgentClutch normalizes it into an Action Proposal
        ↓
AgentClutch compiles it into a user-facing Action Card
        ↓
Human approves / edits / blocks / takes wheel / creates rule
        ↓
AgentClutch emits an Intervention Event
        ↓
Agent loop resumes with structured Resume Context
```

This must be reflected in every core feature. AgentClutch should never be only a modal that appears after an agent has already decided everything. It must become a reusable **loop middleware layer** that receives proposed actions before execution and returns structured control data back to the agent loop.

### 0.5.1 Core loop lifecycle

```text
1. goal.received
2. perception.captured
3. state.updated
4. plan.created
5. action.proposed
6. clutch.required
7. user.decision
8. action.executed
9. observation.received
10. loop.resumed
11. loop.stopped | loop.handoff
12. lesson.captured
```

### 0.5.2 New first-class objects

AgentClutch has four loop-native objects:

```text
Action Proposal      Internal, adapter-facing proposed action object.
Action Card          User-facing consequence and decision object.
Intervention Event   Logged human decision and control event.
Resume Context       Structured payload returned to the agent loop.
```

### 0.5.3 Mandatory loop-first capabilities

The MVP and all future adapters must support these patterns:

- **Pre-action clutch:** pause before side effects, not after.
- **Mid-loop takeover:** user can take control without destroying the run.
- **Structured edit:** user corrections become an explicit action patch.
- **Resume context:** agent can continue from the corrected state.
- **Lesson capture:** recurring corrections can become rules or future training signals.
- **Run Story from loop events:** replay is generated from structured lifecycle events, not raw logs.

### 0.5.4 Product boundary

AgentClutch is not the loop engine. It is the clutch inside the loop.

Agent frameworks continue to own planning, memory, tools, delegation, execution, and orchestration. AgentClutch owns the human-control boundary before consequential side effects.

### 0.5.5 Loop-native, prompt-compatible

Loop-first architecture must **not** make AgentClutch hard to adopt.

The design rule is:

```text
AgentClutch is loop-native internally, but prompt-compatible at the SDK edge.
```

A builder should be able to start with one prompt and one risky action, then grow into full agent-loop engineering later. The beginner should not need to understand `AgentLoopAdapter`, `LoopResumeContext`, planners, state machines, or lifecycle events on day one.

The public developer experience must therefore support three progressive integration modes:

```text
prompt_guard  -> I have a prompt and I am about to execute one risky action.
tool_wrapper  -> I have tools, MCP calls, browser actions, shell commands, or API writes.
loop_native   -> I have an engineered observe-plan-act loop and want explicit clutch points.
```

All three modes produce the same core artifacts:

```text
Action Proposal
Action Card
Clutch Decision
Intervention Event
Resume Context
Run Story
```

In `prompt_guard` and `tool_wrapper` mode, AgentClutch creates an implicit loop session internally. In `loop_native` mode, the host agent runtime owns the loop and AgentClutch acts as the clutch point before side effects.

The product must never become a prompt builder. AgentClutch does not help users write better prompts. It controls what happens when a prompt, tool call, or loop step is about to touch the real world.

---

## 0.6 Progressive Adoption Model

AgentClutch must be useful to both casual prompt-based builders and advanced loop-engineering teams.

### 0.6.1 Level 1: `prompt_guard`

For prompt-based apps that are about to execute one side-effecting action.

A developer can write:

```ts
const emailDraft = {
  to: "client@example.com",
  subject: "Follow-up from today",
  body: "Thanks for the call today...",
};
const bodyPreview = emailDraft.body.slice(0, 120);

const { decision, resumeContext } = await clutch.confirmAction({
  userGoal: {
    original: userPrompt,
    summary: "Send a follow-up email to the client",
  },
  proposedAction: {
    kind: "email.send",
    label: "Send email",
    targetSurface: "email",
    targetApp: "Gmail",
    rawInput: {
      to: emailDraft.to,
      subject: emailDraft.subject,
      bodyPreview,
    },
  },
  visibleContext: {
    fields: {
      to: emailDraft.to,
      subject: emailDraft.subject,
      bodyPreview,
    },
  },
  riskHints: {
    reversibility: "not_reversible",
    blastRadius: "external",
    requiresApproval: true,
  },
});

if (decision.type === "approve_once") {
  await sendEmail(emailDraft);
}

if (decision.type === "edit") {
  await sendEmail(applyPatch(emailDraft, decision.patch));
}
```

For privacy-sensitive actions such as email sends, Action Card `rawInput` should contain reviewable metadata and previews, not full private bodies or secrets. Keep the full draft in local app state until the user approves.

AgentClutch internally creates:

```text
sourceMode = prompt_guard
loopId = implicit_loop_<id>
stepId = step_001
```

The builder gets Action Cards, decisions, local recording, and Run Stories without building a formal loop yet.

### 0.6.2 Level 2: `tool_wrapper`

For apps with tools, MCP calls, browser automation, API writes, shell commands, or file actions.

A developer can wrap a function:

```ts
const guardedSendEmail = clutch.wrapTool(sendEmail, {
  kind: "email.send",
  label: "Send email",
  targetSurface: "gmail",
  targetApp: "Gmail",
  riskHints: {
    reversibility: "not_reversible",
    blastRadius: "external",
    requiresApproval: true,
  },
});

await guardedSendEmail({
  to: "client@example.com",
  subject: "Follow-up",
  body: "Thanks for the call...",
});
```

Or use an adapter:

```ts
const page = await withClutch(browser.newPage(), {
  requireApprovalFor: [
    "browser.form_submit",
    "payment.checkout",
    "email.send",
    "file.delete",
    "github.write",
  ],
});
```

This is the middle lane for builders who have action surfaces but not a mature explicit agent loop.

### 0.6.3 Level 3: `loop_native`

For engineered agent loops that explicitly emit proposed actions and consume Resume Context.

```ts
const proposal = normalizeActionProposal({
  sourceMode: "loop_native",
  loopId,
  stepId,
  agent,
  userGoal,
  proposedAction,
  visibleContext,
  loopContext,
  evidence,
  riskHints,
});

const decision = await clutch.onActionProposed(proposal);
const resumeContext = buildResumeContext(proposal, decision);

await agentLoop.resume(resumeContext);
```

This is the long-term architecture. AgentClutch receives a structured action proposal before execution, compiles it into an Action Card, captures the human decision, and returns Resume Context back to the loop.

### 0.6.4 Adoption ladder

The project should feel simple even though the architecture is serious:

```text
Prompt app -> guarded tool app -> engineered agent loop
```

The marketing version:

> Start with one prompt and one risky action. Grow into full agent loop control when you are ready.

The technical version:

> AgentClutch normalizes prompt-driven actions, wrapped tool calls, and loop-native proposals into the same Action Proposal -> Action Card -> Decision -> Resume Context pipeline.

### 0.6.5 Backward-compatible promise

The loop-first architecture is an implementation advantage, not an adoption tax.

A beginner can start with:

```ts
await clutch.confirmAction({ proposedAction });
```

A tool builder can move to:

```ts
const guarded = clutch.wrapTool(sendEmail, metadata);
```

A mature agent runtime can later move to:

```ts
const proposal = normalizeActionProposal({
  sourceMode: "loop_native",
  loopId,
  stepId,
  proposedAction,
});
const result = await clutch.onActionProposed(proposal);
```

The artifact chain stays consistent across all three levels. That consistency is what lets AgentClutch serve prompt-based builders now while remaining loop-engineering-forward for where the market is going.

---

## 1. Strategic Positioning

### 1.1 What AgentClutch is

AgentClutch is:

- A reusable **Action Card schema** for proposed agent actions.
- A React **Action Card UI** and overlay system.
- A Playwright adapter that wraps browser actions.
- A browser/DOM overlay that highlights what the agent sees and intends to do.
- A local recorder for user decisions and intervention events.
- A future bridge to AG-UI, CHAP-style event exports, MCP tools, Chrome DevTools Protocol, browser-use, desktop overlays, and enterprise approval systems.

### 1.2 What AgentClutch is not

AgentClutch must avoid becoming a crowded, low-differentiation product.

Do **not** build AgentClutch as:

- A full browser agent.
- A full desktop agent.
- A general agent frontend protocol.
- A generic human-agent collaboration framework.
- A CopilotKit / AG-UI clone.
- A CHAP clone.
- A Magentic-UI clone.
- A chat UI.
- A workflow approval inbox.
- A trace/observability dashboard.
- A backend policy/governance platform.
- A generic agent OS.

### 1.3 The defendable category

The category is:

```text
Consequential-action UX for AI agents
```

The core primitive is:

```text
Action Card
```

The acquisition-shaped artifact is:

```text
AgentClutch Action Card
```

Not the app.  
Not the dashboard.  
Not the whole protocol.  
The card.

The closest analogy:

```text
OAuth consent screen for agent actions
```

OAuth consent screens made authorization visible to users. AgentClutch makes autonomous agent actions visible, inspectable, and controllable before they happen.

---

## 2. Product Thesis

### 2.1 User problem

Most agent products show users either:

```text
chat messages
```

or:

```text
raw execution logs
```

That is not enough when agents are about to perform consequential actions.

Casual users need to know:

- What is the agent about to do?
- Where will it happen?
- Why does it think this is correct?
- Can I stop it?
- Can I edit it without restarting?
- Can I take over?

Elite users and enterprises need to know:

- What action is proposed?
- What data supports it?
- What fields will change?
- Is it reversible?
- What blast radius does it have?
- Does it require approval?
- Who intervened?
- Can this UI be standardized across agents?

### 2.2 Product loop

AgentClutch creates a clear loop-control model:

```text
User Goal -> Perception Frame -> Action Proposal -> Action Card -> User Decision -> Intervention Event -> Resume Context -> Run Story
```

Definitions:

- **Perception Frame:** what the agent believes it sees at a moment in time.
- **Action Proposal:** the loop/internal object emitted before a side effect.
- **Action Card:** a structured, visible proposal for a consequential action.
- **User Decision:** approve, edit, take wheel, block, or create rule.
- **Intervention Event:** a logged user control event.
- **Resume Context:** structured information returned to the agent so the loop can continue correctly.
- **Run Story:** a human-readable replay of what the agent attempted and what the user changed.

### 2.3 The first viral moment

The first demo must be visually obvious.

Current private-repo command:

```bash
pnpm demo:checkout
```

Public npm alpha command:

```bash
pnpm dlx @agentclutch/cli@alpha demo checkout
```

The demo should show:

1. A fake shopping / booking / expense / email page.
2. An agent simulation navigating toward a consequential action.
3. AgentClutch freezing the final click.
4. The target button highlighted.
5. An Action Card explaining consequence, evidence, and reversibility.
6. Buttons: Approve, Edit, Take Wheel, Block.
7. A Run Story generated afterward.

The user reaction should be:

> “This is what agents need before I let them do real things.”

---

## 3. MVP Scope

### 3.1 MVP goal

Build an installable monorepo that provides:

1. `@agentclutch/action-card` — schema, TypeScript types, validators.
2. `@agentclutch/loop` — Action Proposal, Clutch Decision, Resume Context, adapter lifecycle contract, and progressive integration modes.
3. `@agentclutch/core` — event model, session model, risk/consequence utilities, `confirmAction`, and `wrapTool` facade APIs.
4. `@agentclutch/react` — Action Card modal, overlay, Clutch Button, Run Story viewer.
5. `@agentclutch/playwright` — Playwright wrapper for proposing actions before execution.
6. `@agentclutch/recorder` — local JSONL recorder for loop events, action cards, decisions, resume context, and run stories.
7. `@agentclutch/cli` — demo runner and local run-inspection commands.
8. `apps/browser-demo` — local FakeStore checkout demo.
9. `apps/action-card-viewer` — local viewer for Action Cards and recorder JSONL.
10. `examples/*` — runnable prompt-guard, tool-wrapper, expense-submit, and GitHub PR-create examples.

The MVP must expose all three progressive adoption modes:

```text
prompt_guard  -> clutch.confirmAction(...)
tool_wrapper  -> clutch.wrapTool(...) and Playwright wrapper actions
loop_native   -> normalizeActionProposal(...) + onActionProposed(...) + buildResumeContext(...)
```

### 3.2 MVP non-goals

The MVP does **not** need:

- Real model integration.
- A full autonomous agent.
- A browser extension.
- Desktop OS-level takeover.
- Enterprise SSO.
- Cloud service.
- MCP proxy.
- AG-UI bridge.
- CHAP export.
- Chrome DevTools Protocol implementation.
- Production-grade policy engine.

Those come later.

### 3.3 MVP acceptance criteria

The MVP is successful when a developer can run:

```bash
pnpm install
pnpm build
pnpm demo:checkout
```

And see:

- A browser page open.
- An agent simulation navigate to a consequential action.
- AgentClutch overlay freeze the action.
- Action Card appears with target, consequence, evidence, risk, and options.
- User can approve, edit, take wheel, or block.
- Decision is recorded to `.agentclutch/runs/<run_id>/events.jsonl`.
- Run Story is generated and viewable.

The MVP is also successful when a developer can exercise all three adoption levels:

```ts
await clutch.confirmAction(...);     // prompt_guard
await clutch.wrapTool(...)(...);     // tool_wrapper
await clutch.onActionProposed(...);  // loop_native
```

All three must create the same artifact chain: Action Proposal, Action Card, Clutch Decision, Intervention Event, Resume Context, and Run Story.

---

## 3.5 Cross-Platform Runtime, Development Environment, and Language Strategy

AgentClutch must work on:

```text
Linux native
WSL2 Ubuntu on Windows
Native Windows 11 / current Windows 10
```

The MVP must be designed so the same repository can run in all three environments with the same commands:

```bash
pnpm install
pnpm build
pnpm test
pnpm demo:checkout
```

### 3.5.1 Platform support matrix

| Target                 |      MVP support | Notes                                                                                                         |
| ---------------------- | ---------------: | ------------------------------------------------------------------------------------------------------------- |
| Linux native           |           Tier 1 | Best match for CI, containers, Playwright, and open-source contributors.                                      |
| WSL2 Ubuntu            |           Tier 1 | Recommended Windows development environment for Linux-like workflows. Keep repo under `~/code`, not `/mnt/c`. |
| Native Windows         |           Tier 1 | Must support PowerShell, Windows paths, Playwright Chromium, and Node.js.                                     |
| macOS                  | Tier 2 initially | Should work naturally from Node/Playwright, but not the first validation target.                              |
| Native desktop overlay |            Later | Needs OS-specific implementations. Browser overlay comes first.                                               |

### 3.5.2 What works everywhere in v0.1

The following features must be platform-neutral:

- TypeScript schemas and validators.
- `@agentclutch/loop` lifecycle contracts.
- `@agentclutch/action-card` models and JSON Schema.
- `@agentclutch/core` risk and consequence utilities.
- JSONL recording under `.agentclutch/runs`.
- React Action Card components.
- Playwright browser demos.
- CLI commands.
- CI tests.

### 3.5.3 Platform-sensitive design rules

Do not hard-code Unix-only assumptions.

Use Node APIs instead of shell-specific behavior:

```ts
import path from "node:path";
import os from "node:os";
import { mkdir, writeFile } from "node:fs/promises";

const runDir = path.join(process.cwd(), ".agentclutch", "runs", runId);
```

Avoid shell-specific command chains in library code:

```ts
// Avoid in core packages:
// exec("mkdir -p .agentclutch/runs && cat file")

// Prefer:
await mkdir(runDir, { recursive: true });
```

Use normalized file URLs and path helpers for browser demo assets:

```ts
import { pathToFileURL } from "node:url";
const url = pathToFileURL(path.join(demoRoot, "fake-store.html")).toString();
await page.goto(url);
```

### 3.5.4 Native desktop overlay boundary

The first public release must not depend on native desktop overlays. Native overlays create immediate platform-specific complexity:

- Windows: Win32, UI Automation, window z-order, UAC, multi-monitor, DPI scaling.
- Linux: X11 vs Wayland, compositor differences, portals, AT-SPI.
- WSL2: Linux processes cannot reliably overlay native Windows desktop apps.

Therefore:

```text
v0.1 = browser overlay + React components + Playwright adapter
v0.2 = MCP and framework adapters
v0.3 = optional native sidecar / desktop overlay exploration
```

### 3.5.5 Language strategy

AgentClutch is **TypeScript-first**.

Reason:

- The first viral wedge is visual and browser-based.
- Playwright, React, Vite, AG-UI-style integrations, and CDP are naturally TypeScript-friendly.
- npm distribution makes adoption easy for agent UI developers.
- JSON Schema and TypeScript types can become the standard artifact quickly.

Rust and Python are valuable, but not for the first MVP core.

#### TypeScript owns v0.1

```text
@agentclutch/action-card
@agentclutch/loop
@agentclutch/core
@agentclutch/react
@agentclutch/playwright
@agentclutch/recorder
@agentclutch/cli
```

#### Python comes next as adapters

Python should be introduced as a thin SDK for Python agent frameworks:

```text
agentclutch-python/
  agentclutch/
    action_proposal.py
    decision.py
    client.py
    langgraph.py
    openai_agents.py
    crewai.py
```

Python should emit Action Proposals and consume Clutch Decisions. It should not fork the core model.

#### Rust comes later as a native sidecar

Rust should be considered for:

```text
agentclutchd
native process supervision
local IPC
signed binaries
desktop overlay experiments
high-integrity local recorder
future Windows/Linux native hooks
```

Do not start with Rust unless the MVP becomes blocked by Node performance, process control, or native OS integration. For now, Rust adds unnecessary implementation friction.

### 3.5.6 Recommended development environment

For this project, the recommended day-one setup is:

```text
Primary: Codex CLI inside WSL2 Ubuntu + VS Code Remote WSL
Secondary: Codex Windows app / native PowerShell for Windows compatibility checks
```

Use WSL2 for the main repo because it aligns with Linux CI, Playwright tooling, shell scripts, and most open-source contributor workflows.

Keep the repository here:

```bash
~/code/agentclutch
```

Do **not** keep the main WSL repo here:

```bash
/mnt/c/Users/<you>/source/agentclutch
```

That path causes slower I/O and more permission/symlink issues.

Use a second native Windows clone or worktree only for compatibility tests:

```powershell
C:\code\agentclutch-windows
```

### 3.5.7 Local setup commands for WSL2

```bash
mkdir -p ~/code
cd ~/code
git clone https://github.com/<your-org>/agentclutch.git
cd agentclutch

corepack enable
corepack prepare pnpm@latest --activate
pnpm install
pnpm exec playwright install chromium
pnpm build
pnpm test
pnpm demo:checkout
```

### 3.5.8 Local setup commands for native Windows

```powershell
git clone https://github.com/<your-org>/agentclutch.git C:\code\agentclutch-windows
cd C:\code\agentclutch-windows
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
pnpm exec playwright install chromium
pnpm build
pnpm test
pnpm demo:checkout
```

### 3.5.9 CI requirement

Every PR must run at least:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [22]
```

macOS can be added after the first public release.

---

## 4. Repository Structure

Use a pnpm monorepo.

```text
agentclutch/
  README.md
  LICENSE
  SECURITY.md
  CONTRIBUTING.md
  CODE_OF_CONDUCT.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  .gitignore
  .npmrc
  .github/
    workflows/
      ci.yml
      release.yml

  docs/
    vision.md
    architecture.md
    action-cards.md
    progressive-adoption.md
    adapters.md
    security.md
    launch-plan.md
    comparison.md
    roadmap.md

  schemas/
    loop-event.schema.json
    action-proposal-input.schema.json
    action-proposal.schema.json
    clutch-decision.schema.json
    loop-resume-context.schema.json
    action-card.schema.json
    perception-frame.schema.json
    user-decision.schema.json
    intervention-event.schema.json
    action-diff.schema.json
    run-story.schema.json

  packages/
    action-card/
      package.json
      tsconfig.json
      src/
        index.ts
        types.ts
        schema.ts
        builders.ts
        validators.ts
      test/
        action-card.test.ts

    loop/
      package.json
      tsconfig.json
      src/
        index.ts
        types.ts
        events.ts
        adapter.ts
        normalize.ts
        decision.ts
        resume-context.ts
      test/
        loop.test.ts

    core/
      package.json
      tsconfig.json
      src/
        index.ts
        ids.ts
        time.ts
        events.ts
        session.ts
        consequence.ts
        policy.ts
        risk.ts
        facade.ts
        run-story.ts
      test/
        risk.test.ts
        session.test.ts

    recorder/
      package.json
      tsconfig.json
      src/
        index.ts
        jsonl-recorder.ts
        fs-store.ts
        run-store.ts
      test/
        recorder.test.ts

    react/
      package.json
      tsconfig.json
      src/
        index.ts
        AgentClutchProvider.tsx
        hooks.ts
        components/
          ActionCardModal.tsx
          AgentEyesOverlay.tsx
          ClutchButton.tsx
          RunStoryPanel.tsx
          DecisionBar.tsx
          RiskBadge.tsx
          EvidenceList.tsx
        styles.css
      test/
        ActionCardModal.test.tsx

    playwright/
      package.json
      tsconfig.json
      src/
        index.ts
        attachClutch.ts
        pageBridge.ts
        browserOverlay.ts
        classifyPlaywrightAction.ts
        selectors.ts
      test/
        playwright-adapter.test.ts

    cli/
      package.json
      tsconfig.json
      src/
        index.ts
        commands/
          demo.ts
          viewer.ts
          init.ts
          inspect.ts
        utils/
          paths.ts

    ag-ui-bridge/
      package.json
      tsconfig.json
      src/
        index.ts
        mapToAgUiEvents.ts

    chap-export/
      package.json
      tsconfig.json
      src/
        index.ts
        mapToChapEvents.ts

    mcp/
      package.json
      tsconfig.json
      src/
        index.ts
        actionCardForToolCall.ts

  apps/
    browser-demo/
      package.json
      index.html
      src/
        main.ts
        fakeStore.ts
        fakeEmail.ts
        fakeExpense.ts
      public/
        fake-store.html
        fake-email.html
        fake-expense.html

    action-card-viewer/
      package.json
      index.html
      src/
        main.tsx
        App.tsx

  examples/
    prompt-guard-send-email/
      README.md
      task.md
      policy.json
    tool-wrapper-file-delete/
      README.md
      task.md
      policy.json
    loop-native-checkout/
      README.md
      task.md
      policy.json
    browser-shopping/
      README.md
      task.md
      policy.json
    gmail-send-draft/
      README.md
      task.md
      policy.json
    github-pr-create/
      README.md
      task.md
      policy.json
    calendar-booking/
      README.md
      task.md
      policy.json
    expense-submit/
      README.md
      task.md
      policy.json
    file-delete/
      README.md
      task.md
      policy.json
```

---

## 5. Development Setup

### 5.1 Required tools

Install:

```bash
node --version   # Recommended: 22+
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

Install Playwright browser dependencies:

```bash
pnpm exec playwright install chromium
```

### 5.2 Initial scaffold commands

```bash
mkdir agentclutch
cd agentclutch
git init
corepack enable
pnpm init
```

Create workspace file:

```bash
cat > pnpm-workspace.yaml <<'EOF_PNPM'
packages:
  - "packages/*"
  - "apps/*"
EOF_PNPM
```

Install root dev dependencies:

```bash
pnpm add -D typescript tsx vitest @types/node eslint prettier turbo
pnpm add -D playwright @playwright/test
```

Root package file:

```json
{
  "name": "agentclutch-monorepo",
  "private": true,
  "version": "0.0.1",
  "description": "AgentClutch: the open Action Card and takeover UX for consequential AI agent actions.",
  "license": "Apache-2.0",
  "type": "module",
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev --parallel",
    "demo:checkout": "pnpm --filter @agentclutch/cli start demo checkout",
    "test:windows": "pnpm build && pnpm test && pnpm demo:checkout",
    "format": "prettier --write \"**/*.{ts,tsx,md,json,css}\""
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@types/node": "latest",
    "eslint": "latest",
    "playwright": "latest",
    "prettier": "latest",
    "tsx": "latest",
    "turbo": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

Root TypeScript config:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

Turbo config:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`.gitignore`:

```gitignore
node_modules/
dist/
.turbo/
.agentclutch/
.env
.env.*
!.env.example
.DS_Store
coverage/
playwright-report/
test-results/
```

---

## 6. Core Data Model

### 6.1 Action kind taxonomy

Action kind format:

```text
<surface>.<verb>[_qualifier]
```

Examples:

```text
browser.click
browser.form_submit
browser.oauth_approve
browser.checkout
email.send
slack.post
github.pr_create
github.merge
github.workflow_dispatch
filesystem.delete
filesystem.write
shell.exec
calendar.book
payment.charge
mcp.tool_call
saas.record_update
endpoint.restart_service
```

### 6.2 Consequence classes

Use consequence classes instead of vague risk labels.

```ts
export type ConsequenceClass =
  | "none"
  | "local_visual_change"
  | "local_file_write"
  | "local_file_delete"
  | "external_message_send"
  | "external_business_submission"
  | "payment_or_purchase"
  | "identity_or_permission_change"
  | "production_change"
  | "code_repository_change"
  | "endpoint_or_device_change"
  | "sensitive_data_access"
  | "unknown";
```

### 6.3 Reversibility model

Reversibility is not binary. It should express whether the result can be undone cleanly and whether residue remains.

```ts
export type Reversibility =
  | "cleanly_reversible"
  | "compensable"
  | "residue_remains"
  | "not_cleanly_reversible"
  | "irreversible"
  | "unknown";
```

Examples:

- Drafting an email: `cleanly_reversible`
- Sending an email: `residue_remains`
- Buying a product: `compensable`
- Deleting a file with no backup: `irreversible`
- Updating a SaaS record: `compensable` or `unknown`
- Restarting a service: `compensable`, but may cause user disruption

### 6.4 Action Card v0 TypeScript types

Create `packages/action-card/src/types.ts`:

```ts
export type ISODateTime = string;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type ActionSurface =
  | "browser"
  | "desktop"
  | "filesystem"
  | "shell"
  | "mcp"
  | "email"
  | "chat"
  | "github"
  | "calendar"
  | "payment"
  | "saas"
  | "endpoint"
  | "unknown";

export type ConsequenceClass =
  | "none"
  | "local_visual_change"
  | "local_file_write"
  | "local_file_delete"
  | "external_message_send"
  | "external_business_submission"
  | "payment_or_purchase"
  | "identity_or_permission_change"
  | "production_change"
  | "code_repository_change"
  | "endpoint_or_device_change"
  | "sensitive_data_access"
  | "unknown";

export type Reversibility =
  | "cleanly_reversible"
  | "compensable"
  | "residue_remains"
  | "not_cleanly_reversible"
  | "irreversible"
  | "unknown";

export type BlastRadius =
  | "none"
  | "single_page"
  | "single_local_file"
  | "workspace"
  | "single_user"
  | "single_customer"
  | "team"
  | "organization"
  | "public"
  | "production"
  | "unknown";

export type RiskLevel = "low" | "medium" | "high" | "critical" | "unknown";

export type UserOption =
  | "approve_once"
  | "approve_always_for_this_target"
  | "edit_fields"
  | "take_wheel"
  | "block"
  | "create_rule"
  | "request_more_context";

export interface AgentDescriptor {
  id?: string;
  name: string;
  runtime?: string;
  version?: string;
  model?: string;
}

export interface VisibleTarget {
  surface: ActionSurface;
  target_app?: string;
  url?: string;
  page_title?: string;
  selector?: string;
  selector_hash?: string;
  button_text?: string;
  aria_label?: string;
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface EvidenceItem {
  id: string;
  label: string;
  source_type:
    | "dom"
    | "user_instruction"
    | "file"
    | "screenshot"
    | "tool_output"
    | "api_response"
    | "memory"
    | "system_policy"
    | "unknown";
  source_ref?: string;
  summary?: string;
  quote?: string;
  confidence?: number;
  hash?: string;
}

export interface ChangedField {
  field: string;
  before?: JsonValue;
  after: JsonValue;
  evidence_ids?: string[];
  editable?: boolean;
}

export interface ConsequenceDescriptor {
  class: ConsequenceClass;
  label: string;
  description?: string;
  reversibility: Reversibility;
  blast_radius: BlastRadius;
  requires_confirmation: boolean;
  possible_residue?: string[];
  compensation_hint?: string;
}

export interface RiskDescriptor {
  level: RiskLevel;
  score?: number;
  reasons: string[];
  policy_ids?: string[];
}

export interface ProposedAction {
  id: string;
  kind: string;
  label: string;
  description?: string;
  surface: ActionSurface;
  target: VisibleTarget;
  changed_fields?: ChangedField[];
  raw?: JsonObject;
}

export interface ActionCard {
  type: "agentclutch.action_card.v0";
  id: string;
  run_id: string;
  created_at: ISODateTime;
  agent: AgentDescriptor;
  proposed_action: ProposedAction;
  consequence: ConsequenceDescriptor;
  risk: RiskDescriptor;
  evidence: EvidenceItem[];
  user_options: UserOption[];
  expires_at?: ISODateTime;
  metadata?: JsonObject;
}

export type UserDecisionType =
  | "approve_once"
  | "edit_fields"
  | "take_wheel"
  | "block"
  | "create_rule"
  | "request_more_context"
  | "timeout";

export interface UserDecision {
  type: "agentclutch.user_decision.v0";
  id: string;
  action_card_id: string;
  run_id: string;
  decided_at: ISODateTime;
  decision: UserDecisionType;
  edited_fields?: ChangedField[];
  reason?: string;
  rule?: JsonObject;
  actor?: {
    id?: string;
    display_name?: string;
  };
}

export interface InterventionEvent {
  type: "agentclutch.intervention_event.v0";
  id: string;
  run_id: string;
  action_card_id?: string;
  timestamp: ISODateTime;
  event:
    | "pause"
    | "resume"
    | "approve"
    | "edit"
    | "take_wheel"
    | "block"
    | "rule_created"
    | "timeout";
  summary: string;
  data?: JsonObject;
}

export interface PerceptionFrame {
  type: "agentclutch.perception_frame.v0";
  id: string;
  run_id: string;
  timestamp: ISODateTime;
  surface: ActionSurface;
  visible_text?: string;
  url?: string;
  page_title?: string;
  elements?: Array<{
    selector?: string;
    role?: string;
    label?: string;
    text?: string;
    clickable?: boolean;
    consequential_hint?: boolean;
    bounding_box?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

export interface RunStory {
  type: "agentclutch.run_story.v0";
  id: string;
  run_id: string;
  created_at: ISODateTime;
  title: string;
  summary: string;
  steps: Array<{
    timestamp: ISODateTime;
    actor: "agent" | "user" | "system";
    text: string;
    action_card_id?: string;
    decision_id?: string;
  }>;
}
```

### 6.5 JSON Schema: Action Card

Create `schemas/action-card.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://agentclutch.dev/schemas/action-card.schema.json",
  "title": "AgentClutch Action Card v0",
  "type": "object",
  "required": [
    "type",
    "id",
    "run_id",
    "created_at",
    "agent",
    "proposed_action",
    "consequence",
    "risk",
    "evidence",
    "user_options"
  ],
  "properties": {
    "type": { "const": "agentclutch.action_card.v0" },
    "id": { "type": "string", "minLength": 1 },
    "run_id": { "type": "string", "minLength": 1 },
    "created_at": { "type": "string", "format": "date-time" },
    "agent": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "runtime": { "type": "string" },
        "version": { "type": "string" },
        "model": { "type": "string" }
      },
      "additionalProperties": false
    },
    "proposed_action": {
      "type": "object",
      "required": ["id", "kind", "label", "surface", "target"],
      "properties": {
        "id": { "type": "string" },
        "kind": { "type": "string" },
        "label": { "type": "string" },
        "description": { "type": "string" },
        "surface": { "type": "string" },
        "target": {
          "type": "object",
          "required": ["surface"],
          "properties": {
            "surface": { "type": "string" },
            "target_app": { "type": "string" },
            "url": { "type": "string" },
            "page_title": { "type": "string" },
            "selector": { "type": "string" },
            "selector_hash": { "type": "string" },
            "button_text": { "type": "string" },
            "aria_label": { "type": "string" },
            "bounding_box": {
              "type": "object",
              "required": ["x", "y", "width", "height"],
              "properties": {
                "x": { "type": "number" },
                "y": { "type": "number" },
                "width": { "type": "number" },
                "height": { "type": "number" }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        },
        "changed_fields": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["field", "after"],
            "properties": {
              "field": { "type": "string" },
              "before": true,
              "after": true,
              "evidence_ids": {
                "type": "array",
                "items": { "type": "string" }
              },
              "editable": { "type": "boolean" }
            },
            "additionalProperties": false
          }
        },
        "raw": { "type": "object" }
      },
      "additionalProperties": false
    },
    "consequence": {
      "type": "object",
      "required": [
        "class",
        "label",
        "reversibility",
        "blast_radius",
        "requires_confirmation"
      ],
      "properties": {
        "class": { "type": "string" },
        "label": { "type": "string" },
        "description": { "type": "string" },
        "reversibility": { "type": "string" },
        "blast_radius": { "type": "string" },
        "requires_confirmation": { "type": "boolean" },
        "possible_residue": {
          "type": "array",
          "items": { "type": "string" }
        },
        "compensation_hint": { "type": "string" }
      },
      "additionalProperties": false
    },
    "risk": {
      "type": "object",
      "required": ["level", "reasons"],
      "properties": {
        "level": { "type": "string" },
        "score": { "type": "number", "minimum": 0, "maximum": 100 },
        "reasons": {
          "type": "array",
          "items": { "type": "string" }
        },
        "policy_ids": {
          "type": "array",
          "items": { "type": "string" }
        }
      },
      "additionalProperties": false
    },
    "evidence": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "label", "source_type"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "source_type": { "type": "string" },
          "source_ref": { "type": "string" },
          "summary": { "type": "string" },
          "quote": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "hash": { "type": "string" }
        },
        "additionalProperties": false
      }
    },
    "user_options": {
      "type": "array",
      "items": { "type": "string" }
    },
    "expires_at": { "type": "string", "format": "date-time" },
    "metadata": { "type": "object" }
  },
  "additionalProperties": false
}
```

---

## 6.5 Package: `@agentclutch/loop`

This package is the architectural spine of the project. It makes AgentClutch loop-engineering-forward while still remaining easy for prompt-based builders to adopt.

The rule:

```text
Loop-native internally. Prompt-compatible at the SDK edge.
```

### 6.5.1 Package goal

`@agentclutch/loop` normalizes proposed actions from any agent runtime into a common lifecycle model.

It must answer:

```text
What integration mode is this using?
What loop is running, explicit or implicit?
What step is the agent on?
What action is proposed?
What will happen if it executes?
What should the human decide?
How should the agent resume after the decision?
```

The package must support three integration modes:

```text
prompt_guard  -> one prompt and one risky action
tool_wrapper  -> wrapped tool calls, MCP calls, browser actions, API writes, shell commands
loop_native   -> engineered observe-plan-act loops
```

### 6.5.2 `package.json`

```json
{
  "name": "@agentclutch/loop",
  "version": "0.0.1",
  "description": "Loop lifecycle contracts for AgentClutch action proposals, progressive integration modes, decisions, and resume context.",
  "license": "Apache-2.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "zod": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

### 6.5.3 `src/types.ts`

`ActionProposalInput` is the developer-facing input. It permits partial loop metadata so prompt-based builders can start easily.

`ActionProposal` is the normalized internal object. It always has `id`, `loopId`, `stepId`, `createdAt`, and `loopContext`.

```ts
export type AgentClutchIntegrationMode =
  | "prompt_guard"
  | "tool_wrapper"
  | "loop_native";

export type AgentRuntime =
  | "playwright"
  | "browser-use"
  | "mcp"
  | "cli"
  | "desktop"
  | "openai-agents"
  | "langgraph"
  | "custom";

export type ProposedActionKind =
  | "browser.click"
  | "browser.form_submit"
  | "browser.checkout"
  | "mcp.tool_call"
  | "email.send"
  | "chat.post"
  | "file.write"
  | "file.delete"
  | "shell.exec"
  | "github.write"
  | "calendar.book"
  | "payment.checkout"
  | "saas.write"
  | "endpoint.change"
  | "custom";

export type Reversibility =
  | "clean"
  | "compensable"
  | "residue"
  | "not_reversible"
  | "unknown";

export type BlastRadius =
  | "none"
  | "single_user"
  | "team"
  | "customer"
  | "organization"
  | "external"
  | "public"
  | "production";

export interface AgentDescriptor {
  id?: string;
  name?: string;
  runtime: AgentRuntime;
  model?: string;
  version?: string;
}

export interface UserGoalDescriptor {
  summary?: string;
  original?: string;
}

export interface ProposedActionDescriptor {
  kind: ProposedActionKind | string;
  label: string;
  targetSurface: string;
  targetApp?: string;
  targetIdentifier?: string;
  rawInput?: unknown;
}

export interface VisibleContext {
  pageTitle?: string;
  url?: string;
  selectedText?: string;
  highlightedSelector?: string;
  fields?: Record<string, unknown>;
  screenshotRef?: string;
}

export interface LoopContextInput {
  previousStepIds?: string[];
  planSummary?: string;
  whyNow?: string;
  confidence?: number;
}

export interface LoopContext {
  previousStepIds: string[];
  planSummary?: string;
  whyNow?: string;
  confidence?: number;
}

export interface RiskHints {
  reversibility?: Reversibility;
  blastRadius?: BlastRadius;
  requiresApproval?: boolean;
}

export interface EvidenceItem {
  label: string;
  source: string;
  summary?: string;
  hash?: string;
}

export interface ActionProposalInput {
  type?: "agentclutch.action_proposal.v0";

  /**
   * Progressive adoption mode.
   * - prompt_guard: prompt-driven app about to execute one side effect
   * - tool_wrapper: wrapper around a tool/API/browser/shell/MCP action
   * - loop_native: explicit engineered agent loop
   */
  sourceMode: AgentClutchIntegrationMode;

  /**
   * Optional for prompt_guard and tool_wrapper.
   * Required by convention for loop_native, but normalized if omitted.
   */
  id?: string;
  loopId?: string;
  stepId?: string;
  createdAt?: string;

  agent?: AgentDescriptor;
  userGoal?: UserGoalDescriptor;
  proposedAction: ProposedActionDescriptor;
  visibleContext?: VisibleContext;
  loopContext?: LoopContextInput;
  riskHints?: RiskHints;
  evidence?: EvidenceItem[];
  metadata?: Record<string, unknown>;
}

export interface ActionProposal extends Omit<
  ActionProposalInput,
  | "type"
  | "id"
  | "loopId"
  | "stepId"
  | "createdAt"
  | "loopContext"
  | "agent"
  | "evidence"
> {
  type: "agentclutch.action_proposal.v0";
  id: string;
  loopId: string;
  stepId: string;
  createdAt: string;
  agent: AgentDescriptor;
  loopContext: LoopContext;
  evidence: EvidenceItem[];
}

export type ActionPatchOperation = "replace" | "add" | "remove";

export interface ActionPatch {
  op: ActionPatchOperation;
  path: string;
  from?: unknown;
  value?: unknown;
  reason?: string;
}

export type ClutchDecision =
  | {
      type: "approve_once";
      approvedBy: string;
      decidedAt: string;
      note?: string;
    }
  | {
      type: "edit";
      approvedBy: string;
      decidedAt: string;
      patch: ActionPatch[];
      note?: string;
    }
  | {
      type: "block";
      blockedBy: string;
      decidedAt: string;
      reason: string;
    }
  | {
      type: "takeover";
      operator: string;
      decidedAt: string;
      resumeMode:
        | "resume_from_current_state"
        | "resume_with_new_instruction"
        | "stop_after_takeover";
      note?: string;
    }
  | {
      type: "create_rule";
      approvedBy: string;
      decidedAt: string;
      rule: ClutchRule;
      note?: string;
    };

export interface ClutchRule {
  id: string;
  description: string;
  match: Record<string, unknown>;
  decision: "allow" | "require_clutch" | "block";
}

export interface LoopResumeContext {
  type: "agentclutch.loop_resume_context.v0";
  loopId: string;
  stepId: string;
  proposalId: string;
  sourceMode: AgentClutchIntegrationMode;
  decision: ClutchDecision;

  userCorrection?: {
    before: unknown;
    after: unknown;
    explanation?: string;
  };

  updatedConstraints?: string[];
  instructionForAgent?: string;

  continuePolicy: {
    allowSameActionRetry: boolean;
    requireApprovalForSimilarActions: boolean;
    maxRetries?: number;
  };
}
```

### 6.5.4 `src/normalize.ts`

```ts
import type {
  ActionProposal,
  ActionProposalInput,
  AgentRuntime,
} from "./types.js";

function id(prefix: string): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return `${prefix}_${cryptoObj.randomUUID()}`;
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function defaultRuntimeForSource(
  sourceMode: ActionProposalInput["sourceMode"],
): AgentRuntime {
  switch (sourceMode) {
    case "prompt_guard":
      return "custom";
    case "tool_wrapper":
      return "custom";
    case "loop_native":
      return "custom";
  }
}

export function normalizeActionProposal(
  input: ActionProposalInput,
): ActionProposal {
  const loopId = input.loopId ?? id("implicit_loop");
  const stepId = input.stepId ?? "step_001";

  return {
    type: "agentclutch.action_proposal.v0",
    id: input.id ?? id("aprop"),
    loopId,
    stepId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    sourceMode: input.sourceMode,
    agent: input.agent ?? {
      runtime: defaultRuntimeForSource(input.sourceMode),
      name: `${input.sourceMode}-agent`,
    },
    userGoal: input.userGoal,
    proposedAction: input.proposedAction,
    visibleContext: input.visibleContext,
    loopContext: {
      previousStepIds: input.loopContext?.previousStepIds ?? [],
      planSummary: input.loopContext?.planSummary,
      whyNow: input.loopContext?.whyNow,
      confidence: input.loopContext?.confidence,
    },
    riskHints: input.riskHints,
    evidence: input.evidence ?? [],
    metadata: input.metadata,
  };
}
```

### 6.5.5 `src/events.ts`

```ts
export type AgentLoopEventType =
  | "goal.received"
  | "perception.captured"
  | "state.updated"
  | "plan.created"
  | "action.proposed"
  | "clutch.required"
  | "action_card.created"
  | "user.decision"
  | "resume_context.created"
  | "action.executed"
  | "observation.received"
  | "loop.resumed"
  | "loop.stopped"
  | "loop.handoff"
  | "lesson.captured";

export interface AgentLoopEvent<TPayload = unknown> {
  type: "agentclutch.loop_event.v0";
  id: string;
  loopId: string;
  stepId?: string;
  eventType: AgentLoopEventType;
  timestamp: string;
  payload: TPayload;
}
```

### 6.5.6 `src/adapter.ts`

```ts
import type {
  ActionProposal,
  ClutchDecision,
  LoopResumeContext,
} from "./types.js";

export interface TakeoverSession {
  loopId: string;
  startedAt: string;
  operator: string;
  mode: "browser" | "desktop" | "terminal" | "custom";
}

export interface ClutchControls {
  requireClutch(proposal: ActionProposal): Promise<ClutchDecision>;
  buildResumeContext(
    proposal: ActionProposal,
    decision: ClutchDecision,
  ): LoopResumeContext;
}

export interface AgentLoopAdapter {
  runtime: string;

  onActionProposed(
    proposal: ActionProposal,
    controls: ClutchControls,
  ): Promise<ClutchDecision>;

  pause(loopId: string): Promise<void>;

  resume(loopId: string, resumeContext: LoopResumeContext): Promise<void>;

  takeover(loopId: string): Promise<TakeoverSession>;

  stop(loopId: string, reason?: string): Promise<void>;
}
```

### 6.5.7 `src/resume-context.ts`

```ts
import type {
  ActionProposal,
  ClutchDecision,
  LoopResumeContext,
} from "./types.js";

export function buildResumeContext(
  proposal: ActionProposal,
  decision: ClutchDecision,
): LoopResumeContext {
  const base: LoopResumeContext = {
    type: "agentclutch.loop_resume_context.v0",
    loopId: proposal.loopId,
    stepId: proposal.stepId,
    proposalId: proposal.id,
    sourceMode: proposal.sourceMode,
    decision,
    continuePolicy: {
      allowSameActionRetry:
        decision.type === "approve_once" || decision.type === "edit",
      requireApprovalForSimilarActions:
        decision.type === "edit" ||
        decision.type === "takeover" ||
        decision.type === "create_rule",
      maxRetries: 1,
    },
  };

  if (decision.type === "edit") {
    base.userCorrection = {
      before: proposal.proposedAction.rawInput ?? proposal.proposedAction,
      after: decision.patch,
      explanation: decision.note,
    };
    base.instructionForAgent =
      "Continue from the corrected action. Do not repeat the original unedited action unless the user explicitly approves it.";
  }

  if (decision.type === "block") {
    base.instructionForAgent = `The proposed action was blocked: ${decision.reason}. Re-plan without attempting the same side effect.`;
    base.continuePolicy.allowSameActionRetry = false;
    base.continuePolicy.requireApprovalForSimilarActions = true;
  }

  if (decision.type === "takeover") {
    base.instructionForAgent =
      decision.resumeMode === "stop_after_takeover"
        ? "The human took over and ended this loop."
        : "The human took over. Observe the current state before continuing.";
  }

  if (decision.type === "create_rule") {
    base.instructionForAgent =
      "A new rule was created from this decision. Apply the rule to similar future actions.";
  }

  return base;
}
```

### 6.5.8 `src/index.ts`

```ts
export * from "./types.js";
export * from "./normalize.js";
export * from "./events.js";
export * from "./adapter.js";
export * from "./resume-context.js";
```

### 6.5.9 Acceptance criteria

`@agentclutch/loop` is complete when:

- It exports `AgentClutchIntegrationMode`, `ActionProposalInput`, `ActionProposal`, `ClutchDecision`, `LoopResumeContext`, and `AgentLoopAdapter`.
- It supports `prompt_guard`, `tool_wrapper`, and `loop_native` modes.
- It can normalize partial prompt/tool inputs into fully identified loop proposals.
- It can build deterministic resume context for approve, edit, block, takeover, and create-rule decisions.
- Tests cover every decision branch and every adoption mode.
- `@agentclutch/playwright` uses `ActionProposal` before building an Action Card.
- Recorder stores loop events, not only UI decisions.

---

## 7. Package: `@agentclutch/action-card`

### 7.1 Package setup

`packages/action-card/package.json`:

```json
{
  "name": "@agentclutch/action-card",
  "version": "0.0.1",
  "description": "TypeScript types, builders, and validation for AgentClutch Action Cards.",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "zod": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "vitest": "latest"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

`packages/action-card/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### 7.2 Zod schema

`packages/action-card/src/schema.ts`:

```ts
import { z } from "zod";

export const ActionSurfaceSchema = z.enum([
  "browser",
  "desktop",
  "filesystem",
  "shell",
  "mcp",
  "email",
  "chat",
  "github",
  "calendar",
  "payment",
  "saas",
  "endpoint",
  "unknown",
]);

export const ConsequenceClassSchema = z.enum([
  "none",
  "local_visual_change",
  "local_file_write",
  "local_file_delete",
  "external_message_send",
  "external_business_submission",
  "payment_or_purchase",
  "identity_or_permission_change",
  "production_change",
  "code_repository_change",
  "endpoint_or_device_change",
  "sensitive_data_access",
  "unknown",
]);

export const ReversibilitySchema = z.enum([
  "cleanly_reversible",
  "compensable",
  "residue_remains",
  "not_cleanly_reversible",
  "irreversible",
  "unknown",
]);

export const BlastRadiusSchema = z.enum([
  "none",
  "single_page",
  "single_local_file",
  "workspace",
  "single_user",
  "single_customer",
  "team",
  "organization",
  "public",
  "production",
  "unknown",
]);

export const RiskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
  "unknown",
]);

export const UserOptionSchema = z.enum([
  "approve_once",
  "approve_always_for_this_target",
  "edit_fields",
  "take_wheel",
  "block",
  "create_rule",
  "request_more_context",
]);

export const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ]),
);

export const AgentDescriptorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  runtime: z.string().optional(),
  version: z.string().optional(),
  model: z.string().optional(),
});

export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const VisibleTargetSchema = z.object({
  surface: ActionSurfaceSchema,
  target_app: z.string().optional(),
  url: z.string().optional(),
  page_title: z.string().optional(),
  selector: z.string().optional(),
  selector_hash: z.string().optional(),
  button_text: z.string().optional(),
  aria_label: z.string().optional(),
  bounding_box: BoundingBoxSchema.optional(),
});

export const EvidenceItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  source_type: z.enum([
    "dom",
    "user_instruction",
    "file",
    "screenshot",
    "tool_output",
    "api_response",
    "memory",
    "system_policy",
    "unknown",
  ]),
  source_ref: z.string().optional(),
  summary: z.string().optional(),
  quote: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  hash: z.string().optional(),
});

export const ChangedFieldSchema = z.object({
  field: z.string().min(1),
  before: JsonValueSchema.optional(),
  after: JsonValueSchema,
  evidence_ids: z.array(z.string()).optional(),
  editable: z.boolean().optional(),
});

export const ConsequenceDescriptorSchema = z.object({
  class: ConsequenceClassSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  reversibility: ReversibilitySchema,
  blast_radius: BlastRadiusSchema,
  requires_confirmation: z.boolean(),
  possible_residue: z.array(z.string()).optional(),
  compensation_hint: z.string().optional(),
});

export const RiskDescriptorSchema = z.object({
  level: RiskLevelSchema,
  score: z.number().min(0).max(100).optional(),
  reasons: z.array(z.string()),
  policy_ids: z.array(z.string()).optional(),
});

export const ProposedActionSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  surface: ActionSurfaceSchema,
  target: VisibleTargetSchema,
  changed_fields: z.array(ChangedFieldSchema).optional(),
  raw: z.record(JsonValueSchema).optional(),
});

export const ActionCardSchema = z.object({
  type: z.literal("agentclutch.action_card.v0"),
  id: z.string().min(1),
  run_id: z.string().min(1),
  created_at: z.string().datetime(),
  agent: AgentDescriptorSchema,
  proposed_action: ProposedActionSchema,
  consequence: ConsequenceDescriptorSchema,
  risk: RiskDescriptorSchema,
  evidence: z.array(EvidenceItemSchema),
  user_options: z.array(UserOptionSchema),
  expires_at: z.string().datetime().optional(),
  metadata: z.record(JsonValueSchema).optional(),
});

export type ActionCardFromSchema = z.infer<typeof ActionCardSchema>;
```

### 7.3 Builders

`packages/action-card/src/builders.ts`:

```ts
import type {
  ActionCard,
  AgentDescriptor,
  ConsequenceDescriptor,
  EvidenceItem,
  ProposedAction,
  RiskDescriptor,
  UserOption,
} from "./types";

export interface BuildActionCardInput {
  id: string;
  run_id: string;
  agent: AgentDescriptor;
  proposed_action: ProposedAction;
  consequence: ConsequenceDescriptor;
  risk: RiskDescriptor;
  evidence?: EvidenceItem[];
  user_options?: UserOption[];
  created_at?: string;
}

export function buildActionCard(input: BuildActionCardInput): ActionCard {
  return {
    type: "agentclutch.action_card.v0",
    id: input.id,
    run_id: input.run_id,
    created_at: input.created_at ?? new Date().toISOString(),
    agent: input.agent,
    proposed_action: input.proposed_action,
    consequence: input.consequence,
    risk: input.risk,
    evidence: input.evidence ?? [],
    user_options: input.user_options ?? [
      "approve_once",
      "edit_fields",
      "take_wheel",
      "block",
    ],
  };
}
```

### 7.4 Validators

`packages/action-card/src/validators.ts`:

```ts
import { ActionCardSchema } from "./schema";
import type { ActionCard } from "./types";

export class ActionCardValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown,
  ) {
    super(message);
    this.name = "ActionCardValidationError";
  }
}

export function parseActionCard(value: unknown): ActionCard {
  const result = ActionCardSchema.safeParse(value);
  if (!result.success) {
    throw new ActionCardValidationError(
      "Invalid AgentClutch Action Card",
      result.error.issues,
    );
  }
  return result.data as ActionCard;
}

export function isActionCard(value: unknown): value is ActionCard {
  return ActionCardSchema.safeParse(value).success;
}
```

### 7.5 Public exports

`packages/action-card/src/index.ts`:

```ts
export * from "./types";
export * from "./schema";
export * from "./builders";
export * from "./validators";
```

### 7.6 Unit test

`packages/action-card/test/action-card.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildActionCard, parseActionCard } from "../src";

const card = buildActionCard({
  id: "acard_test_1",
  run_id: "run_test_1",
  agent: { name: "demo-agent", runtime: "playwright" },
  proposed_action: {
    id: "act_1",
    kind: "browser.form_submit",
    label: "Submit expense report",
    surface: "browser",
    target: {
      surface: "browser",
      target_app: "FakeExpense",
      page_title: "Expense Report",
      selector: "#submit-report",
      button_text: "Submit Report",
    },
    changed_fields: [{ field: "amount", after: "$231.47", editable: true }],
  },
  consequence: {
    class: "external_business_submission",
    label: "External business submission",
    reversibility: "not_cleanly_reversible",
    blast_radius: "single_user",
    requires_confirmation: true,
  },
  risk: {
    level: "high",
    score: 82,
    reasons: ["The action submits a business record outside the local page."],
  },
});

describe("ActionCard", () => {
  it("builds and parses a valid card", () => {
    expect(card.type).toBe("agentclutch.action_card.v0");
    const parsed = parseActionCard(card);
    expect(parsed.id).toBe(card.id);
  });
});
```

---

## 8. Package: `@agentclutch/core`

### 8.1 Package setup

`packages/core/package.json`:

```json
{
  "name": "@agentclutch/core",
  "version": "0.0.1",
  "description": "Core AgentClutch session, event, consequence, and risk utilities.",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@agentclutch/action-card": "workspace:*",
    "@agentclutch/loop": "workspace:*"
  },
  "devDependencies": {
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

### 8.2 IDs

`packages/core/src/ids.ts`:

```ts
const PREFIX_RANDOM_BYTES = 12;

export function createId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(PREFIX_RANDOM_BYTES));
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${token}`;
}
```

Node.js older contexts may not expose `crypto.getRandomValues` globally. For safer Node support:

```ts
import { randomBytes } from "node:crypto";

export function createNodeId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}
```

For a browser-compatible package, keep browser and Node ID generation separated or use a tiny dependency such as `nanoid`.

### 8.3 Consequence classifier

`packages/core/src/consequence.ts`:

```ts
import type { ConsequenceDescriptor } from "@agentclutch/action-card";

export interface ConsequenceInput {
  kind: string;
  label?: string;
  url?: string;
  buttonText?: string;
}

export function classifyConsequence(
  input: ConsequenceInput,
): ConsequenceDescriptor {
  const haystack =
    `${input.kind} ${input.label ?? ""} ${input.buttonText ?? ""}`.toLowerCase();

  if (
    haystack.includes("checkout") ||
    haystack.includes("buy") ||
    haystack.includes("purchase")
  ) {
    return {
      class: "payment_or_purchase",
      label: "Payment or purchase",
      description: "This action may spend money or place an order.",
      reversibility: "compensable",
      blast_radius: "single_user",
      requires_confirmation: true,
      possible_residue: [
        "Order record may be created",
        "Payment authorization may be captured",
      ],
      compensation_hint: "Cancel order or request refund if available.",
    };
  }

  if (
    haystack.includes("send") &&
    (haystack.includes("email") || haystack.includes("message"))
  ) {
    return {
      class: "external_message_send",
      label: "External message send",
      description: "This action may send content to another person or channel.",
      reversibility: "residue_remains",
      blast_radius: "team",
      requires_confirmation: true,
      possible_residue: ["Recipient may read or forward the message"],
      compensation_hint: "Send a follow-up correction if needed.",
    };
  }

  if (haystack.includes("submit")) {
    return {
      class: "external_business_submission",
      label: "External business submission",
      description:
        "This action may submit information to an external or business system.",
      reversibility: "not_cleanly_reversible",
      blast_radius: "single_user",
      requires_confirmation: true,
      possible_residue: ["A submitted record may remain in the target system"],
    };
  }

  if (haystack.includes("delete") || haystack.includes("remove")) {
    return {
      class: "local_file_delete",
      label: "Delete or remove",
      description: "This action may delete information or remove an object.",
      reversibility: "unknown",
      blast_radius: "workspace",
      requires_confirmation: true,
      possible_residue: ["Deleted data may not be recoverable"],
    };
  }

  if (
    haystack.includes("merge") ||
    haystack.includes("deploy") ||
    haystack.includes("production")
  ) {
    return {
      class: "production_change",
      label: "Production or repository change",
      description:
        "This action may alter code, deployment, or production state.",
      reversibility: "compensable",
      blast_radius: "production",
      requires_confirmation: true,
      compensation_hint:
        "Revert commit, rollback deployment, or restore previous config.",
    };
  }

  return {
    class: "unknown",
    label: "Unknown consequence",
    description: "AgentClutch could not confidently classify this action.",
    reversibility: "unknown",
    blast_radius: "unknown",
    requires_confirmation: true,
  };
}
```

### 8.4 Risk classifier

`packages/core/src/risk.ts`:

```ts
import type {
  ConsequenceDescriptor,
  RiskDescriptor,
} from "@agentclutch/action-card";

export function riskFromConsequence(
  consequence: ConsequenceDescriptor,
): RiskDescriptor {
  const reasons: string[] = [];
  let score = 10;

  if (consequence.requires_confirmation) {
    score += 20;
    reasons.push("This action requires explicit confirmation.");
  }

  switch (consequence.reversibility) {
    case "cleanly_reversible":
      score += 0;
      break;
    case "compensable":
      score += 10;
      reasons.push("This action may need a compensating action to undo.");
      break;
    case "residue_remains":
      score += 25;
      reasons.push("This action may leave residue even after correction.");
      break;
    case "not_cleanly_reversible":
      score += 30;
      reasons.push("This action is not cleanly reversible.");
      break;
    case "irreversible":
      score += 45;
      reasons.push("This action may be irreversible.");
      break;
    case "unknown":
      score += 20;
      reasons.push("Reversibility is unknown.");
      break;
  }

  switch (consequence.blast_radius) {
    case "single_user":
      score += 10;
      break;
    case "single_customer":
      score += 20;
      break;
    case "team":
      score += 25;
      break;
    case "organization":
    case "production":
    case "public":
      score += 40;
      break;
    case "unknown":
      score += 15;
      break;
    default:
      score += 0;
  }

  const normalized = Math.min(100, Math.max(0, score));

  return {
    level:
      normalized >= 85
        ? "critical"
        : normalized >= 65
          ? "high"
          : normalized >= 35
            ? "medium"
            : "low",
    score: normalized,
    reasons,
  };
}
```

### 8.5 Session state

`packages/core/src/session.ts`:

```ts
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
      current_action_card: this.currentActionCard,
      decisions: [...this.decisions],
    };
  }
}
```

### 8.6 Progressive facade APIs

The core package must expose simple APIs for prompt-compatible adoption while keeping the internal model loop-native.

The facade should support:

```text
confirmAction(...)       prompt_guard
wrapTool(...)            tool_wrapper
onActionProposed(...)    loop_native
```

`packages/core/src/facade.ts`:

```ts
import type { ActionCard, UserDecision } from "@agentclutch/action-card";
import {
  buildResumeContext,
  normalizeActionProposal,
  type ActionProposal,
  type ActionProposalInput,
  type ClutchDecision,
  type LoopResumeContext,
} from "@agentclutch/loop";

export interface ClutchDecisionResult {
  proposal: ActionProposal;
  decision: ClutchDecision;
  resumeContext: LoopResumeContext;
}

export interface DecisionRenderer {
  /**
   * Environment-specific renderer.
   * Browser adapters render a modal. CLI adapters may render a terminal prompt.
   * Tests can provide a deterministic fake decision.
   */
  decide(proposal: ActionProposal): Promise<ClutchDecision>;
}

export interface ClutchRecorderLike {
  record(event: unknown): Promise<void>;
}

export interface CreateClutchOptions {
  renderer: DecisionRenderer;
  recorder?: ClutchRecorderLike;
}

export interface ConfirmActionInput extends Omit<
  ActionProposalInput,
  "sourceMode"
> {
  sourceMode?: "prompt_guard";
}

export interface WrapToolOptions<TArgs extends unknown[]> {
  kind: string;
  label: string;
  targetSurface: string;
  targetApp?: string;
  risk?: ActionProposalInput["riskHints"];
  buildVisibleContext?: (
    ...args: TArgs
  ) => ActionProposalInput["visibleContext"];
  buildEvidence?: (...args: TArgs) => ActionProposalInput["evidence"];
  buildUserGoal?: (...args: TArgs) => ActionProposalInput["userGoal"];
}

export function createClutch(options: CreateClutchOptions) {
  async function decide(
    input: ActionProposalInput,
  ): Promise<ClutchDecisionResult> {
    const proposal = normalizeActionProposal(input);

    await options.recorder?.record({
      type: "agentclutch.loop_event.v0",
      loopId: proposal.loopId,
      stepId: proposal.stepId,
      eventType: "action.proposed",
      timestamp: new Date().toISOString(),
      payload: proposal,
    });

    const decision = await options.renderer.decide(proposal);
    const resumeContext = buildResumeContext(proposal, decision);

    await options.recorder?.record({
      type: "agentclutch.loop_event.v0",
      loopId: proposal.loopId,
      stepId: proposal.stepId,
      eventType: "user.decision",
      timestamp: new Date().toISOString(),
      payload: decision,
    });

    await options.recorder?.record({
      type: "agentclutch.loop_event.v0",
      loopId: proposal.loopId,
      stepId: proposal.stepId,
      eventType: "resume_context.created",
      timestamp: new Date().toISOString(),
      payload: resumeContext,
    });

    return { proposal, decision, resumeContext };
  }

  return {
    /** Level 1: prompt_guard */
    confirmAction(input: ConfirmActionInput): Promise<ClutchDecisionResult> {
      return decide({
        ...input,
        sourceMode: "prompt_guard",
      });
    },

    /** Level 2: tool_wrapper */
    wrapTool<TArgs extends unknown[], TResult>(
      tool: (...args: TArgs) => Promise<TResult>,
      toolOptions: WrapToolOptions<TArgs>,
    ) {
      return async (...args: TArgs): Promise<TResult | undefined> => {
        const { decision } = await decide({
          sourceMode: "tool_wrapper",
          userGoal: toolOptions.buildUserGoal?.(...args),
          proposedAction: {
            kind: toolOptions.kind,
            label: toolOptions.label,
            targetSurface: toolOptions.targetSurface,
            targetApp: toolOptions.targetApp,
            rawInput: args,
          },
          visibleContext: toolOptions.buildVisibleContext?.(...args),
          evidence: toolOptions.buildEvidence?.(...args),
          riskHints: toolOptions.risk,
        });

        if (decision.type === "approve_once") {
          return tool(...args);
        }

        if (decision.type === "edit") {
          throw new Error(
            "MVP wrapTool edit decisions require a caller-provided patch executor.",
          );
        }

        if (decision.type === "takeover" || decision.type === "block") {
          return undefined;
        }

        return undefined;
      };
    },

    /** Level 3: loop_native */
    async onActionProposed(
      input: ActionProposalInput | ActionProposal,
    ): Promise<ClutchDecisionResult> {
      return decide({
        ...input,
        sourceMode: input.sourceMode ?? "loop_native",
      });
    },
  };
}
```

MVP notes:

- `confirmAction` is the easiest onboarding API.
- `wrapTool` is the main path for MCP, email, shell, GitHub, calendar, and SaaS tools.
- `onActionProposed` is the explicit loop-engineering API.
- The renderer is injected so the same core can power React modals, browser overlays, CLI prompts, tests, and future desktop overlays.
- `wrapTool` edit support should be expanded later with caller-provided patch application.

### 8.7 Public exports

`packages/core/src/index.ts`:

```ts
export * from "./consequence";
export * from "./risk";
export * from "./session";
export * from "./facade";
```

---

## 9. Package: `@agentclutch/recorder`

### 9.1 Purpose

The recorder writes local event logs to `.agentclutch/runs/<run_id>/events.jsonl`.

This gives developers a simple, privacy-preserving record of:

- Action Cards
- User Decisions
- Intervention Events
- Run Stories

### 9.2 Package setup

`packages/recorder/package.json`:

```json
{
  "name": "@agentclutch/recorder",
  "version": "0.0.1",
  "description": "Local JSONL recorder for AgentClutch runs.",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@agentclutch/action-card": "workspace:*"
  },
  "devDependencies": {
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

### 9.3 JSONL recorder

`packages/recorder/src/jsonl-recorder.ts`:

```ts
import { mkdir, appendFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface JsonlRecorderOptions {
  rootDir: string;
  runId: string;
}

export class JsonlRecorder {
  readonly runDir: string;
  readonly eventsPath: string;

  constructor(private readonly options: JsonlRecorderOptions) {
    this.runDir = join(options.rootDir, "runs", options.runId);
    this.eventsPath = join(this.runDir, "events.jsonl");
  }

  async init(): Promise<void> {
    await mkdir(dirname(this.eventsPath), { recursive: true });
    await writeFile(this.eventsPath, "", { flag: "a" });
  }

  async record(event: unknown): Promise<void> {
    await this.init();
    await appendFile(this.eventsPath, JSON.stringify(event) + "\n", "utf8");
  }
}
```

### 9.4 Run store

`packages/recorder/src/run-store.ts`:

```ts
import { mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { JsonlRecorder } from "./jsonl-recorder";

export class RunStore {
  constructor(public readonly rootDir = ".agentclutch") {}

  async createRecorder(runId: string): Promise<JsonlRecorder> {
    await mkdir(join(this.rootDir, "runs", runId), { recursive: true });
    const recorder = new JsonlRecorder({ rootDir: this.rootDir, runId });
    await recorder.init();
    return recorder;
  }

  async listRuns(): Promise<string[]> {
    try {
      return await readdir(join(this.rootDir, "runs"));
    } catch {
      return [];
    }
  }

  async readEvents(runId: string): Promise<unknown[]> {
    const file = await readFile(
      join(this.rootDir, "runs", runId, "events.jsonl"),
      "utf8",
    );
    return file
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}
```

`packages/recorder/src/index.ts`:

```ts
export * from "./jsonl-recorder";
export * from "./run-store";
```

---

## 10. Package: `@agentclutch/react`

### 10.1 Purpose

The React package provides:

- `AgentClutchProvider`
- `ActionCardModal`
- `AgentEyesOverlay`
- `ClutchButton`
- `RunStoryPanel`
- hooks for state and decisions

For the MVP, UI state can be local React state. Later, it should support event streams and host-app integration.

### 10.2 Package setup

`packages/react/package.json`:

```json
{
  "name": "@agentclutch/react",
  "version": "0.0.1",
  "description": "React components for AgentClutch Action Cards and takeover UX.",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "src/styles.css"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "dependencies": {
    "@agentclutch/action-card": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

### 10.3 Provider

`packages/react/src/AgentClutchProvider.tsx`:

```tsx
import React, { createContext, useCallback, useMemo, useState } from "react";
import type {
  ActionCard,
  UserDecision,
  UserDecisionType,
} from "@agentclutch/action-card";

export interface AgentClutchContextValue {
  currentCard: ActionCard | null;
  history: Array<ActionCard | UserDecision>;
  proposeAction: (card: ActionCard) => Promise<UserDecision>;
  decide: (decision: UserDecisionType, extra?: Partial<UserDecision>) => void;
}

export const AgentClutchContext = createContext<AgentClutchContextValue | null>(
  null,
);

interface PendingResolver {
  resolve: (decision: UserDecision) => void;
}

export function AgentClutchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentCard, setCurrentCard] = useState<ActionCard | null>(null);
  const [history, setHistory] = useState<Array<ActionCard | UserDecision>>([]);
  const [pending, setPending] = useState<PendingResolver | null>(null);

  const proposeAction = useCallback((card: ActionCard) => {
    setCurrentCard(card);
    setHistory((prev) => [...prev, card]);

    return new Promise<UserDecision>((resolve) => {
      setPending({ resolve });
    });
  }, []);

  const decide = useCallback(
    (decisionType: UserDecisionType, extra?: Partial<UserDecision>) => {
      if (!currentCard || !pending) return;

      const decision: UserDecision = {
        type: "agentclutch.user_decision.v0",
        id: `dec_${crypto.randomUUID()}`,
        run_id: currentCard.run_id,
        action_card_id: currentCard.id,
        decided_at: new Date().toISOString(),
        decision: decisionType,
        ...extra,
      };

      setHistory((prev) => [...prev, decision]);
      pending.resolve(decision);
      setPending(null);
      setCurrentCard(null);
    },
    [currentCard, pending],
  );

  const value = useMemo(
    () => ({ currentCard, history, proposeAction, decide }),
    [currentCard, history, proposeAction, decide],
  );

  return (
    <AgentClutchContext.Provider value={value}>
      {children}
    </AgentClutchContext.Provider>
  );
}
```

### 10.4 Hook

`packages/react/src/hooks.ts`:

```ts
import { useContext } from "react";
import { AgentClutchContext } from "./AgentClutchProvider";

export function useAgentClutch() {
  const ctx = useContext(AgentClutchContext);
  if (!ctx) {
    throw new Error("useAgentClutch must be used inside AgentClutchProvider");
  }
  return ctx;
}
```

### 10.5 Risk badge

`packages/react/src/components/RiskBadge.tsx`:

```tsx
import React from "react";
import type { RiskLevel } from "@agentclutch/action-card";

export function RiskBadge({
  level,
  score,
}: {
  level: RiskLevel;
  score?: number;
}) {
  return (
    <span className={`ac-risk-badge ac-risk-${level}`}>
      {level.toUpperCase()}
      {typeof score === "number" ? ` ${score}/100` : ""}
    </span>
  );
}
```

### 10.6 Evidence list

`packages/react/src/components/EvidenceList.tsx`:

```tsx
import React from "react";
import type { EvidenceItem } from "@agentclutch/action-card";

export function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  if (evidence.length === 0) {
    return <p className="ac-muted">No evidence attached.</p>;
  }

  return (
    <ul className="ac-evidence-list">
      {evidence.map((item) => (
        <li key={item.id}>
          <strong>{item.label}</strong>
          {item.summary ? <span> — {item.summary}</span> : null}
          {item.source_ref ? (
            <div className="ac-muted">Source: {item.source_ref}</div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
```

### 10.7 Decision bar

`packages/react/src/components/DecisionBar.tsx`:

```tsx
import React from "react";
import type { UserDecisionType } from "@agentclutch/action-card";

interface DecisionBarProps {
  onDecision: (decision: UserDecisionType) => void;
  canEdit?: boolean;
}

export function DecisionBar({ onDecision, canEdit = true }: DecisionBarProps) {
  return (
    <div className="ac-decision-bar">
      <button
        className="ac-btn ac-btn-primary"
        onClick={() => onDecision("approve_once")}
      >
        Approve once
      </button>
      {canEdit ? (
        <button className="ac-btn" onClick={() => onDecision("edit_fields")}>
          Edit fields
        </button>
      ) : null}
      <button className="ac-btn" onClick={() => onDecision("take_wheel")}>
        Take wheel
      </button>
      <button
        className="ac-btn ac-btn-danger"
        onClick={() => onDecision("block")}
      >
        Block
      </button>
      <button className="ac-btn" onClick={() => onDecision("create_rule")}>
        Create rule
      </button>
    </div>
  );
}
```

### 10.8 Action Card modal

`packages/react/src/components/ActionCardModal.tsx`:

```tsx
import React from "react";
import type { ActionCard, UserDecisionType } from "@agentclutch/action-card";
import { DecisionBar } from "./DecisionBar";
import { EvidenceList } from "./EvidenceList";
import { RiskBadge } from "./RiskBadge";

export function ActionCardModal({
  card,
  onDecision,
}: {
  card: ActionCard;
  onDecision: (decision: UserDecisionType) => void;
}) {
  const changedFields = card.proposed_action.changed_fields ?? [];

  return (
    <div className="ac-modal-backdrop" role="presentation">
      <section
        className="ac-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ac-modal-title"
      >
        <header className="ac-modal-header">
          <div>
            <div className="ac-eyebrow">AgentClutch Action Card</div>
            <h2 id="ac-modal-title">{card.proposed_action.label}</h2>
          </div>
          <RiskBadge level={card.risk.level} score={card.risk.score} />
        </header>

        <div className="ac-section">
          <h3>The agent wants to</h3>
          <p className="ac-large">
            {card.proposed_action.description ?? card.proposed_action.label}
          </p>
        </div>

        <div className="ac-grid">
          <div className="ac-section">
            <h3>Visible target</h3>
            <dl className="ac-dl">
              <dt>Surface</dt>
              <dd>{card.proposed_action.target.surface}</dd>
              <dt>App</dt>
              <dd>{card.proposed_action.target.target_app ?? "Unknown"}</dd>
              <dt>Button</dt>
              <dd>
                {card.proposed_action.target.button_text ??
                  card.proposed_action.target.aria_label ??
                  "Unknown"}
              </dd>
              <dt>Page</dt>
              <dd>{card.proposed_action.target.page_title ?? "Unknown"}</dd>
            </dl>
          </div>

          <div className="ac-section">
            <h3>Likely consequence</h3>
            <dl className="ac-dl">
              <dt>Class</dt>
              <dd>{card.consequence.label}</dd>
              <dt>Reversibility</dt>
              <dd>{card.consequence.reversibility.replaceAll("_", " ")}</dd>
              <dt>Blast radius</dt>
              <dd>{card.consequence.blast_radius.replaceAll("_", " ")}</dd>
            </dl>
          </div>
        </div>

        {changedFields.length > 0 ? (
          <div className="ac-section">
            <h3>What will change</h3>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Before</th>
                  <th>After</th>
                </tr>
              </thead>
              <tbody>
                {changedFields.map((field) => (
                  <tr key={field.field}>
                    <td>{field.field}</td>
                    <td>{formatValue(field.before)}</td>
                    <td>{formatValue(field.after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="ac-section">
          <h3>Evidence</h3>
          <EvidenceList evidence={card.evidence} />
        </div>

        <div className="ac-section">
          <h3>Why this is risky</h3>
          <ul>
            {card.risk.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>

        <DecisionBar
          onDecision={onDecision}
          canEdit={changedFields.some((f) => f.editable)}
        />
      </section>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === "undefined") return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
```

### 10.9 Agent Eyes overlay

`packages/react/src/components/AgentEyesOverlay.tsx`:

```tsx
import React from "react";
import type { PerceptionFrame } from "@agentclutch/action-card";

export function AgentEyesOverlay({ frame }: { frame: PerceptionFrame | null }) {
  if (!frame?.elements?.length) return null;

  return (
    <div className="ac-eyes-layer" aria-hidden="true">
      {frame.elements
        .filter((el) => el.bounding_box)
        .map((el, index) => {
          const box = el.bounding_box!;
          const className = el.consequential_hint
            ? "ac-eye-box ac-eye-consequential"
            : el.clickable
              ? "ac-eye-box ac-eye-clickable"
              : "ac-eye-box ac-eye-readable";

          return (
            <div
              key={`${el.selector ?? el.label ?? "el"}-${index}`}
              className={className}
              style={{
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
              }}
            />
          );
        })}
    </div>
  );
}
```

### 10.10 Clutch Button

`packages/react/src/components/ClutchButton.tsx`:

```tsx
import React from "react";

export function ClutchButton({
  onPause,
  onTakeWheel,
}: {
  onPause?: () => void;
  onTakeWheel?: () => void;
}) {
  return (
    <div className="ac-clutch-button">
      <button className="ac-clutch-main" onClick={onPause} title="Pause agent">
        Clutch
      </button>
      <button
        className="ac-clutch-secondary"
        onClick={onTakeWheel}
        title="Take wheel"
      >
        Take wheel
      </button>
    </div>
  );
}
```

### 10.11 Styles

`packages/react/src/styles.css`:

```css
:root {
  --ac-bg: #0b1020;
  --ac-panel: #11182f;
  --ac-panel-2: #18223d;
  --ac-text: #eef3ff;
  --ac-muted: #9aa8c7;
  --ac-border: rgba(255, 255, 255, 0.14);
  --ac-primary: #7aa2ff;
  --ac-danger: #ff6b6b;
  --ac-warning: #ffcc66;
  --ac-success: #5ee39a;
  --ac-shadow: 0 20px 80px rgba(0, 0, 0, 0.45);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.ac-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(5px);
}

.ac-modal {
  width: min(920px, calc(100vw - 32px));
  max-height: min(860px, calc(100vh - 32px));
  overflow: auto;
  background: var(--ac-bg);
  color: var(--ac-text);
  border: 1px solid var(--ac-border);
  border-radius: 22px;
  box-shadow: var(--ac-shadow);
  padding: 24px;
}

.ac-modal-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--ac-border);
}

.ac-eyebrow {
  color: var(--ac-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  font-size: 12px;
}

.ac-modal h2 {
  margin: 6px 0 0;
  font-size: 28px;
  line-height: 1.1;
}

.ac-section {
  margin-top: 20px;
  padding: 16px;
  background: var(--ac-panel);
  border: 1px solid var(--ac-border);
  border-radius: 16px;
}

.ac-section h3 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--ac-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.ac-large {
  font-size: 20px;
  margin: 0;
}

.ac-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.ac-dl {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 8px 12px;
  margin: 0;
}

.ac-dl dt {
  color: var(--ac-muted);
}

.ac-dl dd {
  margin: 0;
}

.ac-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.ac-table th,
.ac-table td {
  border-bottom: 1px solid var(--ac-border);
  padding: 8px;
  text-align: left;
}

.ac-muted {
  color: var(--ac-muted);
}

.ac-risk-badge {
  white-space: nowrap;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid var(--ac-border);
}

.ac-risk-low {
  color: var(--ac-success);
}
.ac-risk-medium {
  color: var(--ac-warning);
}
.ac-risk-high {
  color: #ff9f43;
}
.ac-risk-critical {
  color: var(--ac-danger);
}
.ac-risk-unknown {
  color: var(--ac-muted);
}

.ac-decision-bar {
  position: sticky;
  bottom: -24px;
  display: flex;
  gap: 10px;
  padding-top: 18px;
  margin-top: 20px;
  background: linear-gradient(transparent, var(--ac-bg) 30%);
}

.ac-btn {
  border: 1px solid var(--ac-border);
  border-radius: 12px;
  padding: 10px 14px;
  color: var(--ac-text);
  background: var(--ac-panel-2);
  cursor: pointer;
  font-weight: 700;
}

.ac-btn:hover {
  filter: brightness(1.12);
}

.ac-btn-primary {
  background: var(--ac-primary);
  color: #071020;
}

.ac-btn-danger {
  background: var(--ac-danger);
  color: #1d0505;
}

.ac-clutch-button {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2147483645;
  display: flex;
  gap: 8px;
  align-items: center;
}

.ac-clutch-main,
.ac-clutch-secondary {
  border: 1px solid var(--ac-border);
  border-radius: 999px;
  padding: 10px 14px;
  background: var(--ac-bg);
  color: var(--ac-text);
  box-shadow: var(--ac-shadow);
  cursor: pointer;
  font-weight: 800;
}

.ac-eyes-layer {
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 2147483644;
}

.ac-eye-box {
  position: absolute;
  border-radius: 8px;
  box-sizing: border-box;
}

.ac-eye-readable {
  border: 2px solid rgba(94, 227, 154, 0.75);
}

.ac-eye-clickable {
  border: 2px solid rgba(122, 162, 255, 0.85);
}

.ac-eye-consequential {
  border: 3px solid rgba(255, 204, 102, 0.95);
  box-shadow: 0 0 0 4px rgba(255, 204, 102, 0.18);
}

@media (max-width: 720px) {
  .ac-grid {
    grid-template-columns: 1fr;
  }

  .ac-decision-bar {
    flex-wrap: wrap;
  }
}
```

### 10.12 Exports

`packages/react/src/index.ts`:

```ts
export * from "./AgentClutchProvider";
export * from "./hooks";
export * from "./components/ActionCardModal";
export * from "./components/AgentEyesOverlay";
export * from "./components/ClutchButton";
export * from "./components/RunStoryPanel";
```

---

## 11. Package: `@agentclutch/playwright`

### 11.1 Purpose

The Playwright adapter is the first implementation bridge and the primary `tool_wrapper` example. It must be loop-aware even when the host app is not.

For MVP, do not try to monkey-patch all Playwright actions. Start with an explicit wrapper:

```ts
const clutch = await attachClutch(page, options);
await clutch.click("#checkout", {
  kind: "browser.checkout",
  label: "Complete checkout",
});
```

The required internal pipeline is:

```text
selector + action options
  -> ActionProposalInput(sourceMode = tool_wrapper)
  -> normalizeActionProposal(...)
  -> Action Card
  -> browser overlay decision
  -> Resume Context
  -> execute / edit / block / takeover
```

This keeps the adapter friendly for prompt/tool-based builders while still producing loop-native artifacts.

Later, add opt-in monkey patches:

```ts
const page = await withClutch(page, { intercept: true });
```

### 11.2 Package setup

`packages/playwright/package.json`:

```json
{
  "name": "@agentclutch/playwright",
  "version": "0.0.1",
  "description": "Playwright adapter for AgentClutch Action Cards and takeover UX.",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@agentclutch/action-card": "workspace:*",
    "@agentclutch/core": "workspace:*",
    "@agentclutch/loop": "workspace:*",
    "@agentclutch/recorder": "workspace:*"
  },
  "peerDependencies": {
    "playwright": ">=1.45.0"
  },
  "devDependencies": {
    "playwright": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

### 11.3 Browser overlay bridge

`packages/playwright/src/browserOverlay.ts`:

```ts
import type {
  ActionCard,
  UserDecision,
  UserDecisionType,
} from "@agentclutch/action-card";

export function browserOverlayScript() {
  return `
(() => {
  if (window.__agentClutchInstalled) return;
  window.__agentClutchInstalled = true;

  const style = document.createElement('style');
  style.textContent = ${JSON.stringify(inlineCss())};
  document.documentElement.appendChild(style);

  function formatValue(value) {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  function removeExisting() {
    document.querySelectorAll('[data-agentclutch-root]').forEach((el) => el.remove());
    document.querySelectorAll('[data-agentclutch-highlight]').forEach((el) => el.remove());
  }

  function highlightTarget(card) {
    const selector = card?.proposed_action?.target?.selector;
    if (!selector) return;
    const target = document.querySelector(selector);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.setAttribute('data-agentclutch-highlight', 'true');
    highlight.className = 'ac-dom-highlight';
    highlight.style.left = rect.left + window.scrollX + 'px';
    highlight.style.top = rect.top + window.scrollY + 'px';
    highlight.style.width = rect.width + 'px';
    highlight.style.height = rect.height + 'px';
    document.body.appendChild(highlight);
  }

  window.__agentclutchShowActionCard = function(card) {
    removeExisting();
    highlightTarget(card);

    return new Promise((resolve) => {
      const root = document.createElement('div');
      root.setAttribute('data-agentclutch-root', 'true');
      root.className = 'ac-modal-backdrop';

      const changedFields = card.proposed_action.changed_fields || [];
      const changedRows = changedFields.map((field) => 
        '<tr><td>' + escapeHtml(field.field) + '</td><td>' + escapeHtml(formatValue(field.before)) + '</td><td>' + escapeHtml(formatValue(field.after)) + '</td></tr>'
      ).join('');

      const evidenceRows = (card.evidence || []).map((item) =>
        '<li><strong>' + escapeHtml(item.label) + '</strong>' + (item.summary ? ' — ' + escapeHtml(item.summary) : '') + '</li>'
      ).join('');

      const reasons = (card.risk.reasons || []).map((reason) => '<li>' + escapeHtml(reason) + '</li>').join('');

      root.innerHTML = 
        '<section class="ac-modal" role="dialog" aria-modal="true">' +
          '<header class="ac-modal-header">' +
            '<div><div class="ac-eyebrow">AgentClutch Action Card</div><h2>' + escapeHtml(card.proposed_action.label) + '</h2></div>' +
            '<span class="ac-risk-badge">' + escapeHtml(String(card.risk.level).toUpperCase()) + (card.risk.score ? ' ' + card.risk.score + '/100' : '') + '</span>' +
          '</header>' +
          '<div class="ac-section"><h3>The agent wants to</h3><p class="ac-large">' + escapeHtml(card.proposed_action.description || card.proposed_action.label) + '</p></div>' +
          '<div class="ac-grid">' +
            '<div class="ac-section"><h3>Visible target</h3><dl class="ac-dl">' +
              '<dt>App</dt><dd>' + escapeHtml(card.proposed_action.target.target_app || 'Unknown') + '</dd>' +
              '<dt>Button</dt><dd>' + escapeHtml(card.proposed_action.target.button_text || card.proposed_action.target.aria_label || 'Unknown') + '</dd>' +
              '<dt>Page</dt><dd>' + escapeHtml(card.proposed_action.target.page_title || document.title || 'Unknown') + '</dd>' +
            '</dl></div>' +
            '<div class="ac-section"><h3>Likely consequence</h3><dl class="ac-dl">' +
              '<dt>Class</dt><dd>' + escapeHtml(card.consequence.label) + '</dd>' +
              '<dt>Reversibility</dt><dd>' + escapeHtml(card.consequence.reversibility.replaceAll('_', ' ')) + '</dd>' +
              '<dt>Blast radius</dt><dd>' + escapeHtml(card.consequence.blast_radius.replaceAll('_', ' ')) + '</dd>' +
            '</dl></div>' +
          '</div>' +
          (changedRows ? '<div class="ac-section"><h3>What will change</h3><table class="ac-table"><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>' + changedRows + '</tbody></table></div>' : '') +
          '<div class="ac-section"><h3>Evidence</h3><ul>' + evidenceRows + '</ul></div>' +
          '<div class="ac-section"><h3>Why this is risky</h3><ul>' + reasons + '</ul></div>' +
          '<div class="ac-decision-bar">' +
            '<button data-decision="approve_once" class="ac-btn ac-btn-primary">Approve once</button>' +
            '<button data-decision="edit_fields" class="ac-btn">Edit fields</button>' +
            '<button data-decision="take_wheel" class="ac-btn">Take wheel</button>' +
            '<button data-decision="block" class="ac-btn ac-btn-danger">Block</button>' +
            '<button data-decision="create_rule" class="ac-btn">Create rule</button>' +
          '</div>' +
        '</section>';

      root.addEventListener('click', (event) => {
        const button = event.target.closest('[data-decision]');
        if (!button) return;
        const decision = button.getAttribute('data-decision');
        removeExisting();
        resolve({
          type: 'agentclutch.user_decision.v0',
          id: 'dec_' + crypto.randomUUID(),
          action_card_id: card.id,
          run_id: card.run_id,
          decided_at: new Date().toISOString(),
          decision
        });
      });

      document.body.appendChild(root);
    });
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
})();
  `;
}

function inlineCss() {
  return `
.ac-modal-backdrop{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:rgba(0,0,0,.38);backdrop-filter:blur(5px);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.ac-modal{width:min(920px,calc(100vw - 32px));max-height:min(860px,calc(100vh - 32px));overflow:auto;background:#0b1020;color:#eef3ff;border:1px solid rgba(255,255,255,.14);border-radius:22px;box-shadow:0 20px 80px rgba(0,0,0,.45);padding:24px}.ac-modal-header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.14)}.ac-eyebrow{color:#7aa2ff;text-transform:uppercase;letter-spacing:.08em;font-weight:700;font-size:12px}.ac-modal h2{margin:6px 0 0;font-size:28px;line-height:1.1}.ac-section{margin-top:20px;padding:16px;background:#11182f;border:1px solid rgba(255,255,255,.14);border-radius:16px}.ac-section h3{margin:0 0 8px;font-size:14px;color:#9aa8c7;text-transform:uppercase;letter-spacing:.06em}.ac-large{font-size:20px;margin:0}.ac-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.ac-dl{display:grid;grid-template-columns:120px minmax(0,1fr);gap:8px 12px;margin:0}.ac-dl dt{color:#9aa8c7}.ac-dl dd{margin:0}.ac-table{width:100%;border-collapse:collapse;font-size:14px}.ac-table th,.ac-table td{border-bottom:1px solid rgba(255,255,255,.14);padding:8px;text-align:left}.ac-risk-badge{white-space:nowrap;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:800;border:1px solid rgba(255,255,255,.14);color:#ffcc66}.ac-decision-bar{position:sticky;bottom:-24px;display:flex;gap:10px;padding-top:18px;margin-top:20px;background:linear-gradient(transparent,#0b1020 30%)}.ac-btn{border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 14px;color:#eef3ff;background:#18223d;cursor:pointer;font-weight:700}.ac-btn-primary{background:#7aa2ff;color:#071020}.ac-btn-danger{background:#ff6b6b;color:#1d0505}.ac-dom-highlight{position:absolute;z-index:2147483645;pointer-events:none;border:4px solid rgba(255,204,102,.95);border-radius:10px;box-shadow:0 0 0 6px rgba(255,204,102,.2),0 0 40px rgba(255,204,102,.35)}@media(max-width:720px){.ac-grid{grid-template-columns:1fr}.ac-decision-bar{flex-wrap:wrap}}
  `;
}

declare global {
  interface Window {
    __agentClutchInstalled?: boolean;
    __agentclutchShowActionCard?: (card: ActionCard) => Promise<UserDecision>;
  }
}
```

### 11.4 Attach Clutch to Playwright page

`packages/playwright/src/attachClutch.ts`:

```ts
import type { Page } from "playwright";
import {
  buildActionCard,
  type ActionCard,
  type ChangedField,
  type UserDecision,
} from "@agentclutch/action-card";
import { classifyConsequence, riskFromConsequence } from "@agentclutch/core";
import {
  buildResumeContext,
  normalizeActionProposal,
  type ActionProposal,
  type ActionProposalInput,
  type ClutchDecision,
  type LoopResumeContext,
} from "@agentclutch/loop";
import { JsonlRecorder } from "@agentclutch/recorder";
import { browserOverlayScript } from "./browserOverlay";

export interface AttachClutchOptions {
  runId: string;
  agentName?: string;
  agentRuntime?: string;
  recorder?: JsonlRecorder;
}

export interface ProposeClickOptions {
  kind?: string;
  label?: string;
  description?: string;
  targetApp?: string;
  changedFields?: ChangedField[];
  evidence?: ActionCard["evidence"];
  userGoal?: ActionProposalInput["userGoal"];
}

export interface ProposedDecisionResult {
  proposal: ActionProposal;
  card: ActionCard;
  decision: ClutchDecision;
  resumeContext: LoopResumeContext;
}

export interface ClutchPlaywright {
  click(
    selector: string,
    options?: ProposeClickOptions,
  ): Promise<ProposedDecisionResult>;
  submit(
    selector: string,
    options?: ProposeClickOptions,
  ): Promise<ProposedDecisionResult>;
  propose(input: ActionProposalInput): Promise<ProposedDecisionResult>;
}

export async function attachClutch(
  page: Page,
  options: AttachClutchOptions,
): Promise<ClutchPlaywright> {
  await page.addInitScript(browserOverlayScript());
  await page.evaluate(browserOverlayScript());

  async function propose(
    input: ActionProposalInput,
  ): Promise<ProposedDecisionResult> {
    const proposal = normalizeActionProposal(input);

    await options.recorder?.record({
      type: "agentclutch.loop_event.v0",
      loopId: proposal.loopId,
      stepId: proposal.stepId,
      eventType: "action.proposed",
      timestamp: new Date().toISOString(),
      payload: proposal,
    });

    const card = actionCardFromProposal(proposal, options.runId);
    await options.recorder?.record(card);

    const userDecision = await page.evaluate(async (actionCard) => {
      if (!window.__agentclutchShowActionCard) {
        throw new Error("AgentClutch browser overlay was not installed.");
      }
      return window.__agentclutchShowActionCard(actionCard);
    }, card);

    await options.recorder?.record(userDecision);

    const decision = userDecisionToClutchDecision(userDecision as UserDecision);
    const resumeContext = buildResumeContext(proposal, decision);

    await options.recorder?.record({
      type: "agentclutch.loop_event.v0",
      loopId: proposal.loopId,
      stepId: proposal.stepId,
      eventType: "resume_context.created",
      timestamp: new Date().toISOString(),
      payload: resumeContext,
    });

    return { proposal, card, decision, resumeContext };
  }

  async function buildProposalForSelector(
    selector: string,
    actionOptions: ProposeClickOptions = {},
  ): Promise<ActionProposalInput> {
    const target = await page.locator(selector).first();
    const box = await target.boundingBox();
    const buttonText = (await target.innerText().catch(() => "")).trim();
    const ariaLabel = await target.getAttribute("aria-label").catch(() => null);
    const title = await page.title().catch(() => "");
    const url = page.url();

    const kind =
      actionOptions.kind ??
      inferKindFromText(buttonText || ariaLabel || selector);
    const label = (actionOptions.label ?? buttonText) || ariaLabel || kind;

    return {
      sourceMode: "tool_wrapper",
      agent: {
        name: options.agentName ?? "playwright-agent",
        runtime: "playwright",
      },
      userGoal: actionOptions.userGoal,
      proposedAction: {
        kind,
        label,
        targetSurface: "browser",
        targetApp: actionOptions.targetApp,
        targetIdentifier: selector,
        rawInput: { selector, kind, label },
      },
      visibleContext: {
        pageTitle: title,
        url,
        highlightedSelector: selector,
        fields: {
          buttonText,
          ariaLabel: ariaLabel ?? undefined,
          boundingBox: box
            ? { x: box.x, y: box.y, width: box.width, height: box.height }
            : undefined,
        },
      },
      riskHints: {
        requiresApproval: true,
      },
      evidence: actionOptions.evidence?.map((item) => ({
        label: item.label,
        source: item.source_ref ?? item.source_type,
        summary: item.summary,
        hash: item.hash,
      })),
    };
  }

  return {
    async click(selector, actionOptions) {
      const result = await propose(
        await buildProposalForSelector(selector, actionOptions),
      );

      if (result.decision.type === "approve_once") {
        await page.locator(selector).first().click();
      }

      // edit, block, and takeover intentionally do not execute the original action in MVP.
      return result;
    },

    async submit(selector, actionOptions) {
      const result = await propose(
        await buildProposalForSelector(selector, {
          ...actionOptions,
          kind: actionOptions?.kind ?? "browser.form_submit",
        }),
      );

      if (result.decision.type === "approve_once") {
        await page.locator(selector).first().click();
      }

      return result;
    },

    propose,
  };
}

function actionCardFromProposal(
  proposal: ActionProposal,
  runId: string,
): ActionCard {
  const kind = proposal.proposedAction.kind;
  const label = proposal.proposedAction.label;
  const buttonText = String(proposal.visibleContext?.fields?.buttonText ?? "");
  const url = proposal.visibleContext?.url;

  const consequence = classifyConsequence({ kind, label, buttonText, url });
  const risk = riskFromConsequence(consequence);

  return buildActionCard({
    id: `acard_${crypto.randomUUID()}`,
    run_id: runId,
    agent: {
      id: proposal.agent.id,
      name: proposal.agent.name ?? "agentclutch-agent",
      runtime: proposal.agent.runtime,
      model: proposal.agent.model,
    },
    proposed_action: {
      id: `act_${proposal.id}`,
      kind,
      label,
      description: proposal.loopContext.whyNow,
      surface: "browser",
      target: {
        surface: "browser",
        target_app: proposal.proposedAction.targetApp,
        url: proposal.visibleContext?.url,
        page_title: proposal.visibleContext?.pageTitle,
        selector: proposal.visibleContext?.highlightedSelector,
        button_text: buttonText,
      },
      raw: proposal.proposedAction.rawInput as
        | Record<string, unknown>
        | undefined,
    },
    consequence,
    risk,
    evidence: proposal.evidence.map((item, index) => ({
      id: `ev_${index}`,
      label: item.label,
      source_type: "tool_output",
      source_ref: item.source,
      summary: item.summary,
      hash: item.hash,
    })),
  });
}

function userDecisionToClutchDecision(decision: UserDecision): ClutchDecision {
  const decidedAt = decision.decided_at ?? new Date().toISOString();

  switch (decision.decision) {
    case "approve_once":
      return { type: "approve_once", approvedBy: "local-user", decidedAt };
    case "edit_fields":
      return {
        type: "edit",
        approvedBy: "local-user",
        decidedAt,
        patch: [],
        note: "User requested field editing.",
      };
    case "take_wheel":
      return {
        type: "takeover",
        operator: "local-user",
        decidedAt,
        resumeMode: "resume_from_current_state",
      };
    case "block":
      return {
        type: "block",
        blockedBy: "local-user",
        decidedAt,
        reason: "User blocked the action.",
      };
    case "create_rule":
      return {
        type: "create_rule",
        approvedBy: "local-user",
        decidedAt,
        rule: {
          id: `rule_${crypto.randomUUID()}`,
          description: "Rule created from local AgentClutch decision.",
          match: { actionCardId: decision.action_card_id },
          decision: "require_clutch",
        },
      };
    default:
      return {
        type: "block",
        blockedBy: "local-user",
        decidedAt,
        reason: `Unsupported decision: ${decision.decision}`,
      };
  }
}

function inferKindFromText(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes("checkout") ||
    lower.includes("buy") ||
    lower.includes("purchase")
  )
    return "browser.checkout";
  if (lower.includes("submit")) return "browser.form_submit";
  if (lower.includes("send")) return "email.send";
  if (lower.includes("delete") || lower.includes("remove"))
    return "file.delete";
  if (lower.includes("approve")) return "browser.approve";
  return "browser.click";
}
```

`packages/playwright/src/index.ts`:

```ts
export * from "./attachClutch";
export * from "./browserOverlay";
```

---

## 12. Package: `@agentclutch/cli`

### 12.1 Purpose

The CLI should run demos and inspect local event logs.

Initial commands:

```bash
agentclutch init
agentclutch demo checkout
agentclutch inspect latest
agentclutch viewer latest
```

### 12.2 Package setup

`packages/cli/package.json`:

```json
{
  "name": "@agentclutch/cli",
  "version": "0.0.1",
  "description": "CLI for AgentClutch demos and local run inspection.",
  "type": "module",
  "bin": {
    "agentclutch": "dist/index.js"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@agentclutch/playwright": "workspace:*",
    "@agentclutch/recorder": "workspace:*",
    "commander": "latest",
    "playwright": "latest"
  },
  "devDependencies": {
    "tsx": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

### 12.3 CLI entrypoint

`packages/cli/src/index.ts`:

```ts
#!/usr/bin/env node
import { Command } from "commander";
import { runCheckoutDemo } from "./commands/demo";
import { inspectRuns } from "./commands/inspect";

const program = new Command();

program
  .name("agentclutch")
  .description(
    "Action Cards and takeover UX for consequential AI agent actions.",
  )
  .version("0.0.1");

program
  .command("demo")
  .argument("[name]", "demo name", "checkout")
  .description("Run an AgentClutch demo")
  .action(async (name) => {
    if (name !== "checkout") {
      throw new Error(`Unknown demo: ${name}`);
    }
    await runCheckoutDemo();
  });

program
  .command("inspect")
  .argument("[run]", "run id or latest", "latest")
  .description("Inspect local AgentClutch runs")
  .action(async (run) => {
    await inspectRuns(run);
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
```

### 12.4 Demo command

`packages/cli/src/commands/demo.ts`:

```ts
import { chromium } from "playwright";
import { attachClutch } from "@agentclutch/playwright";
import { RunStore } from "@agentclutch/recorder";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export async function runCheckoutDemo(): Promise<void> {
  const runId = `run_${Date.now()}`;
  const store = new RunStore();
  const recorder = await store.createRecorder(runId);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  const demoFile = demoHtmlPath();
  await page.goto(`file://${demoFile}`);

  const clutch = await attachClutch(page, {
    runId,
    agentName: "demo-shopping-agent",
    agentRuntime: "agentclutch-demo",
    recorder,
  });

  await page.locator("#search").fill("noise cancelling headphones");
  await page.locator("#search-button").click();
  await page.waitForTimeout(700);
  await page.locator("#select-product").click();
  await page.waitForTimeout(700);

  await clutch.click("#checkout", {
    kind: "browser.checkout",
    label: "Complete checkout",
    description: "Complete checkout for Wireless Headphones Pro",
    targetApp: "FakeStore",
    changedFields: [
      { field: "product", after: "Wireless Headphones Pro", editable: false },
      { field: "quantity", after: 1, editable: true },
      { field: "total", after: "$249.00", editable: false },
    ],
    evidence: [
      {
        id: "ev_product_page",
        label: "Selected product",
        source_type: "dom",
        source_ref: "#product-title",
        summary: "Wireless Headphones Pro was selected on the product page.",
      },
    ],
  });

  console.log(
    `AgentClutch demo run recorded: .agentclutch/runs/${runId}/events.jsonl`,
  );
  console.log(
    "Leave the browser open to inspect the result. Press Ctrl+C to exit.",
  );
}

function demoHtmlPath(): string {
  const here = fileURLToPath(new URL(".", import.meta.url));
  return join(here, "../../../../apps/browser-demo/public/fake-store.html");
}
```

### 12.5 Inspect command

`packages/cli/src/commands/inspect.ts`:

```ts
import { RunStore } from "@agentclutch/recorder";

export async function inspectRuns(runArg: string): Promise<void> {
  const store = new RunStore();
  const runs = await store.listRuns();

  if (runs.length === 0) {
    console.log("No AgentClutch runs found.");
    return;
  }

  const runId = runArg === "latest" ? runs.sort().at(-1)! : runArg;
  const events = await store.readEvents(runId);

  console.log(`AgentClutch run: ${runId}`);
  console.log(`Events: ${events.length}`);
  console.log("");

  for (const event of events) {
    if (isObject(event) && event.type === "agentclutch.action_card.v0") {
      console.log(`ACTION CARD: ${event.proposed_action?.label}`);
      console.log(`  consequence: ${event.consequence?.label}`);
      console.log(`  risk: ${event.risk?.level} ${event.risk?.score ?? ""}`);
    } else if (
      isObject(event) &&
      event.type === "agentclutch.user_decision.v0"
    ) {
      console.log(`DECISION: ${event.decision}`);
    } else {
      console.log(JSON.stringify(event));
    }
  }
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}
```

---

## 13. App: Browser Demo

### 13.1 Package

`apps/browser-demo/package.json`:

```json
{
  "name": "@agentclutch/browser-demo",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest"
  },
  "devDependencies": {}
}
```

### 13.2 Fake store HTML

`apps/browser-demo/public/fake-store.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FakeStore Checkout Demo</title>
    <style>
      body {
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        margin: 0;
        background: #f5f7fb;
        color: #172033;
      }
      header {
        background: #11182f;
        color: white;
        padding: 24px 40px;
      }
      main {
        max-width: 1080px;
        margin: 0 auto;
        padding: 40px;
      }
      .search {
        display: flex;
        gap: 12px;
        margin-bottom: 28px;
      }
      input {
        flex: 1;
        border: 1px solid #d0d7e2;
        border-radius: 12px;
        padding: 12px 14px;
        font-size: 16px;
      }
      button {
        border: 0;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
      }
      .primary {
        background: #3157ff;
        color: white;
      }
      .danger {
        background: #ff6b6b;
        color: #220000;
      }
      .card {
        background: white;
        border: 1px solid #dfe5ef;
        border-radius: 18px;
        padding: 24px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
      }
      .grid {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 24px;
      }
      .price {
        font-size: 32px;
        font-weight: 900;
      }
      .hidden {
        display: none;
      }
      .result {
        margin-top: 24px;
        background: #e9fff2;
        border: 1px solid #9be8bd;
        color: #113b23;
        padding: 16px;
        border-radius: 12px;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>FakeStore</h1>
      <p>AgentClutch checkout demo</p>
    </header>

    <main>
      <div class="search">
        <input id="search" placeholder="Search products" />
        <button id="search-button" class="primary">Search</button>
      </div>

      <section class="grid">
        <div class="card">
          <h2 id="product-title">Wireless Headphones Pro</h2>
          <p>Premium wireless noise-cancelling headphones with travel case.</p>
          <p class="price">$249.00</p>
          <button id="select-product" class="primary">Select product</button>
        </div>

        <div class="card">
          <h2>Cart</h2>
          <p>Product: <strong>Wireless Headphones Pro</strong></p>
          <p>Quantity: <strong>1</strong></p>
          <p>Total: <strong>$249.00</strong></p>
          <button id="checkout" class="danger">Complete checkout</button>
          <div id="result" class="result hidden">
            Checkout completed. This page simulates an external purchase.
          </div>
        </div>
      </section>
    </main>

    <script>
      document.getElementById("checkout").addEventListener("click", () => {
        document.getElementById("result").classList.remove("hidden");
      });
    </script>
  </body>
</html>
```

---

## 14. App: Action Card Viewer

This can be phase 2 of the MVP. Keep it simple: read a pasted JSON card, render it using the React components, and show recorded events.

`apps/action-card-viewer/package.json`:

```json
{
  "name": "@agentclutch/action-card-viewer",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@agentclutch/action-card": "workspace:*",
    "@agentclutch/react": "workspace:*",
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "react": "latest",
    "react-dom": "latest"
  }
}
```

`apps/action-card-viewer/src/App.tsx`:

```tsx
import React, { useState } from "react";
import { parseActionCard, type ActionCard } from "@agentclutch/action-card";
import { ActionCardModal } from "@agentclutch/react";
import "@agentclutch/react/src/styles.css";

export function App() {
  const [raw, setRaw] = useState("");
  const [card, setCard] = useState<ActionCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    try {
      const parsed = parseActionCard(JSON.parse(raw));
      setCard(parsed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setCard(null);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>AgentClutch Action Card Viewer</h1>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Paste an Action Card JSON object"
        style={{ width: "100%", height: 280 }}
      />
      <br />
      <button onClick={load}>Render card</button>
      {error ? <pre style={{ color: "crimson" }}>{error}</pre> : null}
      {card ? (
        <ActionCardModal card={card} onDecision={(d) => alert(d)} />
      ) : null}
    </main>
  );
}
```

`apps/action-card-viewer/src/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
```

---

## 15. Policy and Classification

### 15.1 Policy philosophy

AgentClutch should not become a backend policy engine. But it needs a light decision policy for the UI layer.

Policy should answer:

- Should this action card be shown?
- Which actions require confirmation?
- Which fields are editable?
- Which actions should always be blocked in demo / default mode?
- Which action types can auto-continue?

### 15.2 MVP policy file

`examples/browser-shopping/policy.json`:

```json
{
  "version": "0.0.1",
  "profile": "demo-safe",
  "require_action_card_for": [
    "browser.checkout",
    "browser.form_submit",
    "browser.oauth_approve",
    "browser.send",
    "browser.delete",
    "email.send",
    "github.merge",
    "github.workflow_dispatch",
    "filesystem.delete",
    "shell.exec"
  ],
  "always_block": [
    "credential.dump",
    "secrets.exfiltrate",
    "filesystem.delete_root"
  ],
  "default_user_options": [
    "approve_once",
    "edit_fields",
    "take_wheel",
    "block",
    "create_rule"
  ]
}
```

### 15.3 Default risk mapping

```ts
const defaultRiskMap = {
  "browser.click": "low",
  "browser.form_submit": "high",
  "browser.checkout": "critical",
  "browser.oauth_approve": "critical",
  "email.send": "high",
  "slack.post": "medium",
  "github.pr_create": "medium",
  "github.merge": "critical",
  "github.workflow_dispatch": "high",
  "filesystem.write": "medium",
  "filesystem.delete": "high",
  "shell.exec": "high",
  "payment.charge": "critical",
};
```

### 15.4 Consequential action detection heuristics

For browser MVP, use simple heuristics:

Target text contains:

```text
submit
send
buy
checkout
purchase
pay
book
reserve
delete
remove
approve
confirm
authorize
grant
merge
deploy
run
execute
```

Input types:

```text
type="submit"
role="button"
aria-label contains consequential verb
form action is non-empty
```

URLs / routes:

```text
/checkout
/payment
/oauth
/authorize
/admin
/delete
/settings
/billing
/deploy
```

This is not perfect. That is acceptable for v0.1. The goal is to show the product’s shape, not solve perfect classification.

---

## 16. Browser Integration Design

### 16.1 Explicit wrapper mode

MVP recommended:

```ts
await clutch.click("#checkout", {
  kind: "browser.checkout",
  label: "Complete checkout",
});
```

Pros:

- Easy to build.
- Easy to test.
- Clear for developers.
- No surprising patching of Playwright internals.

Cons:

- Requires developer adoption.
- Does not catch arbitrary actions automatically.

### 16.2 Auto-intercept mode

Later:

```ts
const page = await withClutch(page, { interceptClicks: true });
```

This can wrap:

- `page.click`
- `locator.click`
- `page.fill`
- `page.press`
- `page.evaluate` when it submits forms

But monkey patching is fragile. Do it after the explicit wrapper proves value.

### 16.3 Browser extension mode

Future:

- Chrome MV3 extension.
- Inject overlay on pages.
- Agent frameworks call extension via native messaging or WebSocket.
- User gets consistent browser overlay across agents.

### 16.4 CDP mode

Future:

- Attach to Chrome DevTools Protocol.
- Watch DOM, input, navigation, downloads.
- Interpose before clicks / submits where possible.

---

## 17. MCP Integration Design

### 17.1 Why MCP matters

MCP tool calls are becoming one of the most important places where agents touch real systems. AgentClutch should eventually render an Action Card before MCP tools perform consequential actions.

### 17.2 MCP Action Card example

```json
{
  "type": "agentclutch.action_card.v0",
  "id": "acard_mcp_001",
  "run_id": "run_001",
  "created_at": "2026-06-22T04:00:00.000Z",
  "agent": {
    "name": "demo-agent",
    "runtime": "mcp-client"
  },
  "proposed_action": {
    "id": "act_mcp_001",
    "kind": "mcp.tool_call",
    "label": "Send Slack message",
    "surface": "mcp",
    "target": {
      "surface": "mcp",
      "target_app": "Slack MCP Server"
    },
    "changed_fields": [
      { "field": "channel", "after": "#finance", "editable": true },
      { "field": "message", "after": "The report is ready.", "editable": true }
    ],
    "raw": {
      "server": "slack",
      "tool": "send_message"
    }
  },
  "consequence": {
    "class": "external_message_send",
    "label": "External message send",
    "reversibility": "residue_remains",
    "blast_radius": "team",
    "requires_confirmation": true
  },
  "risk": {
    "level": "high",
    "score": 75,
    "reasons": ["Message will be visible to a team channel."]
  },
  "evidence": [],
  "user_options": ["approve_once", "edit_fields", "take_wheel", "block"]
}
```

### 17.3 MCP package placeholder

`packages/mcp/src/actionCardForToolCall.ts`:

```ts
import {
  buildActionCard,
  type ActionCard,
  type ChangedField,
} from "@agentclutch/action-card";
import { classifyConsequence, riskFromConsequence } from "@agentclutch/core";

export interface McpToolCallInput {
  runId: string;
  agentName: string;
  serverName: string;
  toolName: string;
  args: Record<string, unknown>;
}

export function actionCardForMcpToolCall(input: McpToolCallInput): ActionCard {
  const kind = `mcp.${input.serverName}.${input.toolName}`;
  const consequence = classifyConsequence({ kind, label: input.toolName });
  const changedFields: ChangedField[] = Object.entries(input.args).map(
    ([key, value]) => ({
      field: key,
      after: value as any,
      editable: true,
    }),
  );

  return buildActionCard({
    id: `acard_${crypto.randomUUID()}`,
    run_id: input.runId,
    agent: {
      name: input.agentName,
      runtime: "mcp",
    },
    proposed_action: {
      id: `act_${crypto.randomUUID()}`,
      kind,
      label: `${input.serverName}.${input.toolName}`,
      surface: "mcp",
      target: {
        surface: "mcp",
        target_app: input.serverName,
      },
      changed_fields: changedFields,
      raw: {
        server: input.serverName,
        tool: input.toolName,
        args: input.args as any,
      },
    },
    consequence,
    risk: riskFromConsequence(consequence),
    evidence: [],
  });
}
```

---

## 18. AG-UI Bridge Design

### 18.1 Positioning

AgentClutch should not compete with AG-UI. It should export and consume AG-UI-style events where useful.

AgentClutch owns:

```text
Action Card visual safety layer
```

AG-UI owns or may own:

```text
agent-user event transport / frontend protocol
```

### 18.2 Mapping

AgentClutch event:

```text
action_card.created
```

AG-UI-like events:

```text
RUN_STARTED
TEXT_MESSAGE_CONTENT
TOOL_CALL_START
STATE_DELTA
INTERRUPT
```

Suggested mapping:

```ts
export function mapActionCardToAgUiEvents(card: ActionCard) {
  return [
    {
      type: "STATE_DELTA",
      payload: {
        agentclutch: {
          current_action_card: card,
        },
      },
    },
    {
      type: "INTERRUPT",
      payload: {
        reason: "consequential_action_requires_decision",
        action_card_id: card.id,
      },
    },
  ];
}
```

### 18.3 Package placeholder

`packages/ag-ui-bridge/src/mapToAgUiEvents.ts`:

```ts
import type { ActionCard, UserDecision } from "@agentclutch/action-card";

export interface AgUiLikeEvent {
  type: string;
  payload: Record<string, unknown>;
}

export function actionCardToAgUiEvents(card: ActionCard): AgUiLikeEvent[] {
  return [
    {
      type: "STATE_DELTA",
      payload: {
        agentclutch: {
          current_action_card: card,
        },
      },
    },
    {
      type: "INTERRUPT",
      payload: {
        reason: "consequential_action_requires_decision",
        action_card_id: card.id,
      },
    },
  ];
}

export function userDecisionToAgUiEvents(
  decision: UserDecision,
): AgUiLikeEvent[] {
  return [
    {
      type: "STATE_DELTA",
      payload: {
        agentclutch: {
          last_decision: decision,
        },
      },
    },
  ];
}
```

---

## 19. CHAP Export Design

### 19.1 Positioning

AgentClutch should not claim to be a human-agent collaboration protocol. It should generate front-end control events that can be exported to CHAP-style event logs.

### 19.2 Mapping

AgentClutch:

```text
Action Card created
User approved
User edited
User blocked
User took wheel
```

CHAP-style concepts:

```text
review_request
approval
rejection
override
handoff
pause
resume
snapshot
rollback
```

### 19.3 Package placeholder

`packages/chap-export/src/mapToChapEvents.ts`:

```ts
import type { ActionCard, UserDecision } from "@agentclutch/action-card";

export interface ChapLikeEvent {
  type: string;
  id: string;
  timestamp: string;
  task_id: string;
  artifact?: unknown;
  actor?: string;
  reason?: string;
}

export function actionCardToChapReviewRequest(card: ActionCard): ChapLikeEvent {
  return {
    type: "review_request",
    id: `chap_${card.id}`,
    timestamp: card.created_at,
    task_id: card.run_id,
    artifact: card,
    reason: "consequential_action_requires_review",
  };
}

export function decisionToChapEvent(decision: UserDecision): ChapLikeEvent {
  const type =
    decision.decision === "approve_once"
      ? "approval"
      : decision.decision === "block"
        ? "rejection"
        : decision.decision === "take_wheel"
          ? "handoff"
          : decision.decision === "edit_fields"
            ? "override"
            : "review_decision";

  return {
    type,
    id: `chap_${decision.id}`,
    timestamp: decision.decided_at,
    task_id: decision.run_id,
    artifact: decision,
    actor: decision.actor?.display_name,
    reason: decision.reason,
  };
}
```

---

## 20. Run Story Generation

### 20.1 Goal

Run Story turns raw events into a human-readable replay.

Example:

```text
The agent searched for noise cancelling headphones.
It selected Wireless Headphones Pro because it matched the request.
It paused before checkout because payment is not cleanly reversible.
Aaron approved the action once.
The agent completed checkout.
```

### 20.2 Implementation

`packages/core/src/run-story.ts`:

```ts
import type {
  ActionCard,
  RunStory,
  UserDecision,
} from "@agentclutch/action-card";

export function generateRunStory(
  runId: string,
  events: Array<ActionCard | UserDecision>,
): RunStory {
  const steps: RunStory["steps"] = [];

  for (const event of events) {
    if (event.type === "agentclutch.action_card.v0") {
      steps.push({
        timestamp: event.created_at,
        actor: "agent",
        action_card_id: event.id,
        text: `The agent proposed: ${event.proposed_action.label}. Consequence: ${event.consequence.label}.`,
      });
    }

    if (event.type === "agentclutch.user_decision.v0") {
      steps.push({
        timestamp: event.decided_at,
        actor: "user",
        decision_id: event.id,
        action_card_id: event.action_card_id,
        text: decisionToText(event),
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
    steps,
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
    (s) => s.action_card_id && s.actor === "agent",
  ).length;
  const userEvents = steps.filter((s) => s.actor === "user").length;
  return `The run included ${proposed} proposed consequential action(s) and ${userEvents} user decision event(s).`;
}
```

---

## 21. Testing Strategy

### 21.1 Unit tests

Test:

- Action Card schema validation.
- Consequence classification.
- Risk scoring.
- Session state transitions.
- Recorder writes valid JSONL.
- Run Story generation.

### 21.2 Component tests

Use React testing library later. For MVP, basic render tests are enough.

```bash
pnpm add -D @testing-library/react @testing-library/jest-dom jsdom
```

### 21.3 Playwright integration tests

Test that:

1. A page loads.
2. `attachClutch` injects overlay.
3. `clutch.click` shows Action Card.
4. Approve button triggers the real click.
5. Block button prevents the real click.
6. Events are recorded.

Example:

`packages/playwright/test/playwright-adapter.test.ts`:

```ts
import { test, expect } from "@playwright/test";
import { attachClutch } from "../src";

test("shows action card before consequential click", async ({ page }) => {
  await page.setContent(`
    <html>
      <head><title>Test</title></head>
      <body>
        <button id="checkout" onclick="window.__clicked = true">Complete checkout</button>
      </body>
    </html>
  `);

  const clutch = await attachClutch(page as any, {
    runId: "run_test",
    agentName: "test-agent",
  });

  const promise = clutch.click("#checkout", {
    kind: "browser.checkout",
    label: "Complete checkout",
  });
  await expect(page.locator("text=AgentClutch Action Card")).toBeVisible();
  await page.locator("text=Approve once").click();
  await promise;

  expect(await page.evaluate(() => (window as any).__clicked)).toBe(true);
});
```

---

## 22. CI/CD

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test
```

`.github/workflows/release.yml`:

```yaml
name: Release

on:
  workflow_dispatch:

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test
      - run: pnpm -r publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 23. README Draft

`README.md`:

````md
# AgentClutch

**Approve, edit, or take the wheel before agents touch the real world.**

AgentClutch is the open Action Card and takeover UX for consequential AI agent actions.

It gives AI agents a visible steering wheel:

- Watch what the agent is about to do
- See what will change
- Understand reversibility and blast radius
- Approve once
- Edit fields
- Take wheel
- Block
- Create reusable rules

## Why

Agents are moving from chat into action. They can browse, click, type, submit forms, send emails, update SaaS records, run tools, change files, merge code, deploy services, and call APIs.

But users still need a clear moment of control before consequential actions happen.

AgentClutch turns proposed actions into inspectable Action Cards.

## Demo

```bash
pnpm install
pnpm build
pnpm demo:checkout
```
````

Or from the npm alpha:

```bash
pnpm dlx @agentclutch/cli@alpha demo checkout
```

## Example

```ts
import { attachClutch } from "@agentclutch/playwright";

const clutch = await attachClutch(page, {
  runId: "run_001",
  agentName: "browser-agent",
});

await clutch.click("#checkout", {
  kind: "browser.checkout",
  label: "Complete checkout",
  changedFields: [
    { field: "product", after: "Wireless Headphones Pro", editable: false },
    { field: "total", after: "$249.00", editable: false },
  ],
});
```

## Packages

- `@agentclutch/action-card` — schema, types, builders, validators
- `@agentclutch/core` — risk and consequence utilities
- `@agentclutch/react` — Action Card UI components
- `@agentclutch/playwright` — Playwright adapter
- `@agentclutch/recorder` — local JSONL event recorder
- `@agentclutch/cli` — demos and local inspection

## What AgentClutch is not

AgentClutch is not a full agent, browser agent, desktop agent, general agent protocol, observability dashboard, or governance platform.

It owns one moment:

> When an AI agent is about to do something consequential, AgentClutch shows the human a clear, inspectable card and gives them a steering wheel.

````

---

## 24. SECURITY.md Draft

```md
# Security Policy

AgentClutch is a user-control layer for AI agent actions. It may process sensitive action metadata such as page titles, selectors, field values, URLs, tool names, and proposed messages.

## Security principles

- Local-first by default.
- No telemetry by default.
- No cloud sync in the open-source MVP.
- Redact secrets before recording events.
- Do not store credentials.
- Do not bypass native browser, OS, or enterprise security prompts.
- Do not treat AgentClutch approval as legal or compliance authorization by itself.

## Sensitive data

Action Cards may include field values. Developers should avoid attaching secrets, tokens, passwords, private keys, session cookies, or regulated personal data.

Future releases will include redaction hooks.

## Reporting vulnerabilities

Open a private security advisory or email the maintainers.
````

---

## 25. CONTRIBUTING.md Draft

````md
# Contributing to AgentClutch

AgentClutch is focused on one primitive: Action Cards and takeover UX for consequential AI agent actions.

## Good contributions

- Better Action Card schema fields
- Playwright integration improvements
- Browser overlay improvements
- Accessibility fixes
- More demo scenarios
- MCP tool-call Action Cards
- AG-UI bridge support
- CHAP export support
- Better risk/reversibility classification

## Out of scope

- Building a full autonomous agent
- Building a generic chat app
- Building a general human-agent protocol
- Building a SaaS dashboard in the OSS repo
- Adding telemetry by default

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm demo:checkout
```
````

````

---

## 26. Accessibility Requirements

AgentClutch is a control surface, so accessibility matters.

MVP requirements:

- Modal has `role="dialog"` and `aria-modal="true"`.
- Modal title is labeled.
- Buttons are keyboard-focusable.
- Escape key should close only if policy allows cancellation; otherwise it should focus the decision bar.
- Focus trap inside modal.
- High contrast for risk state.
- Do not rely only on color for risk.
- Buttons have text labels.
- Screen reader text for consequence and decision.

Add later:

- `@react-aria/focus` or custom focus trap.
- `aria-live` announcement when action card appears.
- Keyboard shortcuts:
  - `A` approve once
  - `E` edit fields
  - `T` take wheel
  - `B` block

---

## 27. Privacy and Redaction

### 27.1 Data that may be recorded

- Action Card JSON
- Target app and URL
- Page title
- Button text
- Proposed changed fields
- Evidence summaries
- User decision
- Run Story

### 27.2 Data that should not be recorded by default

- Password fields
- Cookies
- Access tokens
- Session IDs
- Full DOM snapshots
- Credit card numbers
- Social Security numbers
- Raw email bodies unless explicitly enabled
- Private keys

### 27.3 Redaction hooks

Add in `@agentclutch/core`:

```ts
export interface Redactor {
  redact(value: unknown, context: { field?: string; source?: string }): unknown;
}

export class DefaultRedactor implements Redactor {
  redact(value: unknown, context: { field?: string }): unknown {
    const field = context.field?.toLowerCase() ?? "";
    if (field.includes("password") || field.includes("token") || field.includes("secret")) {
      return "[REDACTED]";
    }
    if (typeof value === "string") {
      return value
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]")
        .replace(/\b(?:\d[ -]*?){13,16}\b/g, "[CARD]");
    }
    return value;
  }
}
````

---

## 28. Roadmap

### Phase 0 — Repo and brand foundation, Day 1

Deliver:

- GitHub repo scaffold.
- README.
- License.
- Initial docs.
- `@agentclutch/loop` package with progressive adoption modes.
- `@agentclutch/action-card` package.
- `@agentclutch/core` risk/consequence utilities and facade APIs.
- First Action Card JSON example.

Exit criteria:

```bash
pnpm build
pnpm test
```

Passes.

### Phase 1 — Visual demo, Days 2-4

Deliver:

- Browser fake store demo.
- Playwright explicit wrapper.
- In-page Action Card overlay.
- Approve and block decisions.
- Local JSONL recording.

Exit criteria:

```bash
pnpm demo:checkout
```

Shows a visual Action Card before checkout.

### Phase 2 — Polish and viewer, Days 5-7

Deliver:

- React component package.
- Action Card viewer app.
- Run Story generation.
- Screenshot/GIF for README.
- Demo video.

Exit criteria:

- A first-time user understands the product in under 60 seconds.

### Phase 3 — Developer SDK, Weeks 2-3

Deliver:

- Better Playwright APIs.
- Action classification rules.
- Editable fields support.
- Agent Eyes overlay.
- Recorder improvements.
- More examples: email, expense, GitHub, file delete.

### Phase 4 — Integration layer, Weeks 4-6

Deliver:

- MCP Action Card package.
- AG-UI bridge.
- CHAP export.
- Browser-use adapter.
- CDP prototype.

### Phase 5 — Launch, Weeks 6-8

Deliver:

- Public launch site.
- Docs site.
- Demo videos.
- Example integrations.
- GitHub discussions.
- Contribution guide.
- Starter issues.

---

## 29. Codex Build Plan

Use these as sequential Codex tasks.

### Task 1 — Scaffold monorepo

Prompt:

```text
Create a pnpm TypeScript monorepo for AgentClutch with packages/loop, packages/action-card, packages/core, packages/recorder, packages/playwright, packages/react, packages/cli, apps/browser-demo, and apps/action-card-viewer. Add root package.json, pnpm-workspace.yaml, tsconfig.base.json, turbo.json, .gitignore, README.md, LICENSE placeholder, SECURITY.md, and CONTRIBUTING.md. Include examples/prompt-guard-send-email, examples/tool-wrapper-file-delete, and examples/loop-native-checkout placeholders. Ensure pnpm build and pnpm test can run.
```

### Task 2 — Implement loop and Action Card packages

Prompt:

```text
Implement @agentclutch/loop with AgentClutchIntegrationMode, ActionProposalInput, ActionProposal, normalizeActionProposal, ClutchDecision, LoopResumeContext, AgentLoopEvent, AgentLoopAdapter, and buildResumeContext. Add tests for prompt_guard, tool_wrapper, loop_native, approve_once, edit, block, takeover, and create_rule decisions. Ensure all types are exported and no browser/Node-specific APIs are used in this package.

Implement @agentclutch/action-card with TypeScript types, Zod schema, buildActionCard, parseActionCard, and tests. Use the ActionCard v0 model from AgentClutch.md. Export all public types and validators. Add JSON schema copies in /schemas/action-card.schema.json and /schemas/action-proposal-input.schema.json.
```

### Task 3 — Implement core classifiers

Prompt:

```text
Implement @agentclutch/core with consequence classification, risk scoring, ClutchSession state machine, generateRunStory, createClutch, confirmAction, wrapTool, and onActionProposed. Add tests for checkout, send email, submit form, delete, deploy, unknown action, session transitions, prompt_guard confirmAction, tool_wrapper wrapTool, and loop_native onActionProposed.
```

### Task 4 — Implement recorder

Prompt:

```text
Implement @agentclutch/recorder with JsonlRecorder and RunStore. It should write to .agentclutch/runs/<run_id>/events.jsonl, list runs, and read events. Add tests using a temporary directory.
```

### Task 5 — Implement Playwright explicit wrapper

Prompt:

```text
Implement @agentclutch/playwright with attachClutch(page, options). The adapter should inject an in-page overlay script, normalize an ActionProposal with sourceMode=tool_wrapper for clutch.click and clutch.submit, compile it into an Action Card, display the card, await user decision, record proposal/card/decision/resume context, execute the action only if the decision is approve_once, and do nothing if block or take_wheel.
```

### Task 6 — Implement fake store demo

Prompt:

```text
Create apps/browser-demo/public/fake-store.html and implement @agentclutch/cli demo checkout. The demo should open Chromium, fill a search box, select a product, and use clutch.click('#checkout') to show an Action Card before checkout. Record the run locally.
```

### Task 7 — Implement React package

Prompt:

```text
Implement @agentclutch/react with AgentClutchProvider, useAgentClutch, ActionCardModal, RiskBadge, EvidenceList, DecisionBar, AgentEyesOverlay, ClutchButton, and styles.css. Components should render the Action Card model and expose decision callbacks.
```

### Task 8 — Implement viewer

Prompt:

```text
Implement apps/action-card-viewer as a Vite React app that lets users paste an Action Card JSON object and render it with ActionCardModal. Add sample JSON in the UI.
```

### Task 9 — Add CI and tests

Prompt:

```text
Add GitHub Actions CI for Node 22, pnpm install, pnpm build, and pnpm test. Add unit tests for action-card, core, recorder, and a Playwright adapter test that confirms approve executes and block prevents click.
```

### Task 10 — Polish README and launch demo

Prompt:

```text
Polish README with positioning, demo GIF placeholder, installation, usage examples for prompt_guard, tool_wrapper, and loop_native, package list, what AgentClutch is and is not, roadmap, and contribution instructions. Add docs/architecture.md, docs/action-cards.md, and docs/progressive-adoption.md.
```

---

## 30. Launch Strategy

### 30.1 Launch headline

```text
AgentClutch: Approve, edit, or take the wheel before agents touch the real world.
```

### 30.2 Launch demo

The launch demo must not be abstract. Use one of these:

1. **Checkout demo:** agent attempts purchase.
2. **Email demo:** agent attempts to send message.
3. **GitHub demo:** agent attempts to merge PR.
4. **File demo:** agent attempts delete.
5. **Expense demo:** agent attempts submit.

Recommended first demo: checkout, because it is instantly understandable.

### 30.3 README screenshot sequence

1. Agent browsing page.
2. Highlight around checkout button.
3. Action Card open.
4. User clicks Edit or Block.
5. Run Story summary.

### 30.4 Social launch copy

```text
Agents are learning to click, type, submit, buy, send, delete, merge, and deploy.

AgentClutch gives humans a steering wheel.

It turns consequential agent actions into clear Action Cards:
- What will happen
- What will change
- Whether it can be undone
- Why the agent thinks this is right
- Approve / Edit / Take Wheel / Block

Open source.
```

### 30.5 GitHub topics

Use:

```text
ai-agents
agentic-ai
human-in-the-loop
playwright
action-cards
agent-ui
agent-safety
agent-governance
mcp
browser-agents
```

### 30.6 Launch targets

- Hacker News
- Reddit r/LocalLLaMA
- Reddit r/MachineLearning
- Reddit r/ClaudeAI
- Reddit r/OpenAI
- X/Twitter AI builders
- LinkedIn enterprise AI/security audience
- Discords for OpenClaw, browser-use, MCP, LangChain/LangGraph, Playwright

---

## 31. Acquisition Logic

AgentClutch becomes acquisition-interesting if it becomes one of these:

1. The standard Action Card format for consequential agent actions.
2. The default React component library for approval/takeover UX.
3. The Playwright/browser-use/MCP adapter everyone uses to show action confirmations.
4. The neutral layer that works across agent frameworks rather than competing with them.
5. The developer-loved UX primitive that frontier labs and enterprise platforms need.

Potential acquirer categories:

- Frontier AI labs
- Browser-agent platforms
- Developer platforms
- Enterprise SaaS platforms
- RPA vendors
- Security vendors
- Identity vendors
- Observability vendors

The acquisition story:

```text
Every serious agent platform needs a safe, consistent, inspectable way to ask humans before consequential actions. AgentClutch became the OSS standard for that UX.
```

---

## 32. Key Product Risks

### 32.1 Risk: too broad

Mitigation: keep scope to Action Cards and takeover UX.

### 32.2 Risk: AG-UI / CHAP collision

Mitigation: integrate with them. Do not compete as a general protocol.

### 32.3 Risk: Magentic-style app collision

Mitigation: stay embeddable. Do not become a full agent UI.

### 32.4 Risk: weak interception

Mitigation: start explicit wrapper, then add adapters.

### 32.5 Risk: UI is not trusted

Mitigation: make the Action Card precise: target, fields, evidence, reversibility, risk.

### 32.6 Risk: too enterprise-heavy

Mitigation: first demo is consumer-simple: checkout/email/delete.

### 32.7 Risk: too consumer-toy

Mitigation: data model supports enterprise consequence, blast radius, audit events, AG-UI/CHAP export.

---

## 33. Future Features

### 33.1 Editable Action Cards

Let users change fields in the card, then have the adapter write those changes back to the page/tool call.

Example:

- Quantity: 4 -> 3
- Recipient: all@company.com -> finance@company.com
- Message: edit before send

### 33.2 Take Wheel mode

When user selects Take Wheel:

- Agent is paused.
- Overlay disappears.
- User manually controls browser/page.
- Agent can resume from current state.

### 33.3 Rules

User can turn decisions into rules:

```json
{
  "when": {
    "kind": "email.send",
    "recipient_domain": "external"
  },
  "decision": "require_action_card"
}
```

### 33.4 Enterprise approval webhooks

Action Card can be sent to Slack/Teams/Jira/ServiceNow for approval.

### 33.5 Desktop overlay

A Tauri app that floats above desktop agents and renders Action Cards for OS actions.

### 33.6 Browser extension

Chrome extension that provides a consistent overlay for browser agents.

### 33.7 MCP proxy

Proxy MCP tool calls and display Action Cards for consequential calls.

### 33.8 Agent Eyes

Show exactly what the agent thinks it can read/click/change.

### 33.9 Trust receipts

After user decision, generate a signed or hashable receipt:

```json
{
  "type": "agentclutch.decision_receipt.v0",
  "action_card_hash": "sha256:...",
  "decision": "approve_once",
  "decided_at": "...",
  "actor": "user:aaron"
}
```

---

## 34. First 30-Day Execution Plan

### Day 1

- Create repo.
- Add README, license, workspace.
- Add action-card package.
- Add first JSON schema.
- Add sample Action Card.

### Day 2

- Add core consequence and risk utilities.
- Add recorder.
- Add tests.

### Day 3

- Add Playwright overlay injection.
- Add `attachClutch` explicit wrapper.
- Add fake store demo HTML.

### Day 4

- Add CLI `demo checkout`.
- Record JSONL events.
- Add inspect command.

### Day 5

- Polish overlay UI.
- Add target highlight.
- Add block/approve logic.

### Day 6

- Add React package components.
- Add action-card-viewer app.

### Day 7

- Write docs.
- Record demo GIF/video.
- Prepare GitHub launch README.

### Week 2

- Add editable fields.
- Add email demo.
- Add file delete demo.
- Add Playwright tests.

### Week 3

- Add MCP action-card prototype.
- Add AG-UI bridge stub.
- Add CHAP export stub.

### Week 4

- Public beta launch.
- Gather issues.
- Improve docs.
- Add integrations requested by first users.

---

## 35. Final Build Direction

Build AgentClutch as:

```text
The open Action Card and takeover UX for consequential AI agent actions.
```

Do not drift into:

```text
full agent app
agent dashboard
agent protocol
agent OS
generic governance platform
```

The first public value proposition should be simple:

```text
Your agent is about to do something real.
AgentClutch shows what will happen and lets you approve, edit, block, or take over.
```

The first developer value proposition should be just as simple:

```ts
await clutch.click("#checkout", {
  kind: "browser.checkout",
  label: "Complete checkout",
});
```

The long-term value is that Action Cards become the standard UX object for agentic consent, review, takeover, and intervention.

---

## Appendix A — Minimal First Commit Checklist

- [ ] Root monorepo created.
- [ ] `README.md` explains category clearly.
- [ ] `@agentclutch/loop` builds.
- [ ] `@agentclutch/action-card` builds.
- [ ] `@agentclutch/core` builds.
- [ ] `confirmAction(...)` works for prompt-based builders.
- [ ] `wrapTool(...)` works for tool-based builders.
- [ ] `onActionProposed(...)` works for loop-native builders.
- [ ] `normalizeActionProposal(...)` supports prompt_guard, tool_wrapper, and loop_native.
- [ ] `@agentclutch/recorder` builds.
- [ ] `@agentclutch/playwright` builds.
- [ ] `@agentclutch/cli` builds.
- [ ] Fake store demo works.
- [ ] `pnpm demo:checkout` launches browser.
- [ ] Action Card appears before checkout.
- [ ] Approve executes the click.
- [ ] Block prevents the click.
- [ ] Events are recorded.
- [ ] `agentclutch inspect latest` shows card and decision.
- [ ] CI passes.

---

## Appendix B — Minimal Sample Action Card

```json
{
  "type": "agentclutch.action_card.v0",
  "id": "acard_demo_001",
  "run_id": "run_demo_001",
  "created_at": "2026-06-22T04:00:00.000Z",
  "agent": {
    "name": "demo-shopping-agent",
    "runtime": "playwright"
  },
  "proposed_action": {
    "id": "act_demo_001",
    "kind": "browser.checkout",
    "label": "Complete checkout",
    "description": "Complete checkout for Wireless Headphones Pro",
    "surface": "browser",
    "target": {
      "surface": "browser",
      "target_app": "FakeStore",
      "url": "file:///fake-store.html",
      "page_title": "FakeStore Checkout Demo",
      "selector": "#checkout",
      "button_text": "Complete checkout"
    },
    "changed_fields": [
      {
        "field": "product",
        "after": "Wireless Headphones Pro",
        "editable": false
      },
      { "field": "quantity", "after": 1, "editable": true },
      { "field": "total", "after": "$249.00", "editable": false }
    ]
  },
  "consequence": {
    "class": "payment_or_purchase",
    "label": "Payment or purchase",
    "description": "This action may spend money or place an order.",
    "reversibility": "compensable",
    "blast_radius": "single_user",
    "requires_confirmation": true,
    "possible_residue": [
      "Order record may be created",
      "Payment authorization may be captured"
    ],
    "compensation_hint": "Cancel order or request refund if available."
  },
  "risk": {
    "level": "critical",
    "score": 90,
    "reasons": [
      "This action requires explicit confirmation.",
      "This action may need a compensating action to undo.",
      "This action may spend money or place an order."
    ]
  },
  "evidence": [
    {
      "id": "ev_product_page",
      "label": "Selected product",
      "source_type": "dom",
      "source_ref": "#product-title",
      "summary": "Wireless Headphones Pro was selected on the product page."
    }
  ],
  "user_options": [
    "approve_once",
    "edit_fields",
    "take_wheel",
    "block",
    "create_rule"
  ]
}
```

---

## Appendix C — Demo Success Narrative

When the demo works, the story should read:

```text
The agent searched for noise cancelling headphones.
It selected Wireless Headphones Pro.
It attempted to complete checkout.
AgentClutch paused the action because checkout is consequential.
The user reviewed product, price, consequence, reversibility, and evidence.
The user approved once.
The agent completed checkout.
```

That is the product.

---

## 37. Loop-First Cross-Platform Build Mandate

Before public launch, verify the project satisfies the following engineering commitments:

```text
1. Action Proposal exists before Action Card.
2. Action Card is generated before side-effect execution.
3. Every user decision produces an Intervention Event.
4. Every intervention produces a Loop Resume Context.
5. Playwright adapter uses the loop contract.
6. Recorder stores loop events as JSONL.
7. Run Story is generated from loop events.
8. Linux CI passes.
9. Windows CI passes.
10. WSL2 local development path is documented.
```

Recommended first development path:

```text
Develop in Codex CLI inside WSL2 Ubuntu.
Validate in native Windows Codex app / PowerShell after each milestone.
Keep TypeScript as the MVP implementation language.
Delay Python and Rust until adapters/sidecars are justified.
```
