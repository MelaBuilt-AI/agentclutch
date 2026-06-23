# Demo Script

Use this script to demo the local FakeStore checkout flow, Action Card decisions, Teach Mode lessons, seeded rules, and Run Story viewer.

## Setup

Install dependencies and browser support once:

```bash
pnpm install
pnpm build
pnpm exec playwright install chromium
```

Run the interactive demo:

```bash
pnpm demo:checkout
```

The browser opens a local FakeStore page and remains open until Enter is pressed in the terminal. Each run records local JSONL events under:

```text
.agentclutch/runs/<run_id>/events.jsonl
```

## Opening Narrative

Say this before running the demo:

```text
AgentClutch sits at the moment before an agent performs a consequential action. The agent can plan and navigate, but before checkout it must produce an Action Proposal. AgentClutch turns that into an Action Card, lets the human decide, records the intervention, and returns Resume Context so the loop knows what happened.
```

## Reset Local State

Clear rules through the demo command when starting manual decision demos:

```bash
pnpm demo:checkout --clear-rules
```

Clear lessons when you want to show Teach Mode from a clean slate:

```bash
rm -f .agentclutch/lessons/lessons.json
```

Clear rules without launching the demo:

```bash
rm -f .agentclutch/rules/rules.json
```

## Demo 1: Approve Once

1. Run:

   ```bash
   pnpm demo:checkout --clear-rules
   ```

2. Wait for FakeStore to open and the Action Card to appear.
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

6. Explain that the browser click executed only after the user approved it once.

## Demo 2: Edit Quantity

1. Run:

   ```bash
   pnpm demo:checkout --clear-rules
   ```

2. In the Action Card, change the editable quantity field from `1` to `3`.
3. Click **Approve once** or **Edit fields**.
4. Expected terminal result:

   ```text
   Decision: edit
   Checkout completed with edited quantity 3 and total $747.00.
   ```

5. Point out the recorded patch:

   ```json
   [
     {
       "op": "replace",
       "path": "/changed_fields/quantity/after",
       "from": 1,
       "value": 3,
       "reason": "User edited quantity."
     }
   ]
   ```

6. Explain that edits become structured Resume Context, not a new prompt.

## Demo 3: Create Lesson

Teach Mode captures corrections from edit decisions.

1. Clear existing lessons:

   ```bash
   rm -f .agentclutch/lessons/lessons.json
   ```

2. Run:

   ```bash
   pnpm demo:checkout --clear-rules
   ```

3. Change quantity from `1` to `3`.
4. Click **Approve once** or **Edit fields**.
5. Show the local lesson file:

   ```bash
   sed -n '1,200p' .agentclutch/lessons/lessons.json
   ```

6. Expected lesson shape:

   ```json
   {
     "action_kind": "browser.checkout",
     "target_app": "FakeStore",
     "field": "quantity",
     "original_value": 1,
     "corrected_value": 3
   }
   ```

7. Explain that the lesson remembers the corrected value. It does not create an allow rule and does not silently approve checkout.

## Demo 4: Rerun And Verify Lesson Appears

1. Run again without clearing lessons:

   ```bash
   pnpm demo:checkout
   ```

2. Wait for the Action Card.
3. Verify that it shows an **Applied Lesson** row for quantity `1` -> `3`.
4. Explain that the Action Card still appears because a lesson is correction memory, not approval policy.
5. Click one of the lesson buttons:
   - **Accept lesson** approves with the learned quantity and reinforces the lesson.
   - **Reject lesson** approves using the original proposed value.
   - **Disable lesson** disables that lesson for future matching proposals.

Expected Run Story events can include `lesson.applied`, `lesson.reinforced`, `lesson.rejected`, or `lesson.disabled`, depending on the selected path.

## Demo 5: Block

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

## Demo 6: Create Rule

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

6. Explain that `create_rule` creates a local `require_clutch` rule for similar actions. A rule is explicit policy; it is separate from lessons.

## Demo 7: Seeded Rule Decisions

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
- The final terminal decision matches the selected path.

## Rules Vs Teach Mode / Lessons

Rules are explicit control policy:

- `allow`: permit matching actions without showing the overlay.
- `block`: prevent matching actions without showing the overlay.
- `require_clutch`: require the Action Card for matching actions.

Lessons are correction memory:

- Lessons remember edited values such as quantity `1` -> `3`.
- Lessons can appear in future Action Cards as **Applied Lesson**.
- Lessons do not silently approve actions.
- The Action Card still appears unless an explicit `allow` rule exists.

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
   - Lesson events, if the run captured or applied lessons
   - Run Story timeline

Expected Run Story language should describe the proposed checkout, the pause before the consequential action, the human decision, any lesson events, and the resume context.

## Close

End with:

```text
AgentClutch is not the agent runtime. It owns the clutch point before side effects: Action Proposal -> Action Card -> Clutch Decision -> Resume Context -> Run Story.
```
