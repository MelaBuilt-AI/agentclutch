# Demo Script

Use this script to demo the launch slice. It covers the browser checkout path, every visible decision, seeded local rules, and the Run Story viewer.

## Setup

```bash
pnpm install
pnpm build
pnpm exec playwright install chromium
```

Reset local demo rules before manual decision demos:

```bash
pnpm demo:checkout --clear-rules
```

The demo records each run under:

```text
.agentclutch/runs/<run_id>/events.jsonl
```

The browser remains open until Enter is pressed in the terminal.

## Narrative

Say this before running the demo:

```text
AgentClutch sits at the moment before an agent performs a consequential action. The agent can plan and navigate, but before checkout it must produce an Action Proposal. AgentClutch turns that into an Action Card, lets the human decide, records the intervention, and returns Resume Context so the loop knows what happened.
```

## Demo 1: `approve_once`

1. Run:

   ```bash
   pnpm demo:checkout --clear-rules
   ```

2. Wait for the fake store to open and the Action Card to appear.
3. Point out:
   - Target selector: `#checkout`
   - Product: `Wireless Headphones Pro`
   - Quantity: `1`
   - Total: `$249.00`
   - Consequence: payment or purchase
   - Evidence rows
4. Click **Approve once**.
5. Expected terminal result:

   ```text
   Decision: approve_once
   Checkout completed in the fake store.
   ```

6. Explain that the action executed only after the user approved it once.

## Demo 2: Edit Quantity

1. Run:

   ```bash
   pnpm demo:checkout --clear-rules
   ```

2. In the Action Card, change the editable quantity field from `1` to `2`.
3. Click **Approve once** or **Edit fields**.
4. Expected terminal result:

   ```text
   Decision: edit
   Checkout completed with edited quantity 2 and total $498.00.
   ```

5. Point out the recorded patch:

   ```json
   [
     {
       "op": "replace",
       "path": "/changed_fields/quantity/after",
       "from": 1,
       "value": 2,
       "reason": "User edited quantity."
     }
   ]
   ```

6. Explain that edits become structured Resume Context, not a new prompt.

## Demo 3: `block`

1. Run:

   ```bash
   pnpm demo:checkout --clear-rules
   ```

2. Click **Block**.
3. Expected terminal result:

   ```text
   Decision: block
   Checkout was not executed.
   ```

4. Explain that the host loop receives an instruction to re-plan without repeating the same side effect.

## Demo 4: `create_rule`

1. Run:

   ```bash
   pnpm demo:checkout --clear-rules
   ```

2. Click **Create rule**.
3. Expected terminal result:

   ```text
   Decision: create_rule
   Checkout was not executed.
   ```

4. Show the local rules file:

   ```bash
   sed -n '1,200p' .agentclutch/rules/rules.json
   ```

5. Expected rule shape:

   ```json
   {
     "match": {
       "action_kind": "browser.checkout",
       "target_surface": "browser",
       "target_app": "FakeStore",
       "consequence_class": "payment_or_purchase"
     },
     "decision": "require_clutch"
   }
   ```

6. Explain that `create_rule` currently creates a local `require_clutch` rule for similar actions.

## Demo 5: Seeded Rule Decisions

Rules control whether a matching action is allowed, blocked, or forced through the Action Card. They are local demo policy, not preference memory.

### Seed `allow`

```bash
pnpm demo:checkout --clear-rules --seed-allow-rule
```

Expected behavior:

- No Action Card appears.
- The rule approves the matching checkout once.
- Terminal output includes:

  ```text
  Decision: approve_once
  Checkout completed in the fake store.
  ```

### Seed `block`

```bash
pnpm demo:checkout --clear-rules --seed-block-rule
```

Expected behavior:

- No Action Card appears.
- The rule blocks the matching checkout.
- Terminal output includes:

  ```text
  Decision: block
  Checkout was not executed.
  ```

### Seed `require_clutch`

```bash
pnpm demo:checkout --clear-rules --seed-require-clutch-rule
```

Expected behavior:

- The Action Card appears.
- The user must approve, edit, block, take the wheel, or create a rule.
- The final terminal decision matches the button path.

## Rules vs Future Teach Mode

Rules are explicit control policy:

- `allow`: permit matching actions without showing the overlay.
- `block`: prevent matching actions without showing the overlay.
- `require_clutch`: require the Action Card for matching actions.

Future Teach Mode is separate. It will remember user corrections and preferences. It is not implemented in this launch slice, and the demo should not claim that creating a rule teaches the agent a preference.

## Run Story Viewer

1. Start the viewer:

   ```bash
   pnpm --filter @agentclutch/action-card-viewer dev
   ```

2. Open the Vite URL printed in the terminal, usually:

   ```text
   http://127.0.0.1:5173/
   ```

3. Open a recorded run file:

   ```bash
   ls -td .agentclutch/runs/run_checkout_* | head -1
   sed -n '1,200p' .agentclutch/runs/<run_id>/events.jsonl
   ```

4. Paste the JSONL into the viewer and click **Render input**.
5. Show:
   - Rendered Action Card
   - Decision callbacks
   - Run Story timeline

Expected Run Story language should describe the proposed checkout, the pause before the consequential action, the human decision, and the resume context.

## Close

End with:

```text
AgentClutch is not the agent runtime. It owns the clutch point before side effects: Action Proposal -> Action Card -> Clutch Decision -> Resume Context -> Run Story.
```
