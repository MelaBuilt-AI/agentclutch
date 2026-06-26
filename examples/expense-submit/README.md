# expense-submit

Runnable `prompt_guard` example: a form-driven app is about to submit an expense report and asks AgentClutch for approval before touching the business system.

## Run

```bash
pnpm --filter @agentclutch/example-expense-submit start
```

## Scenario

The app drafts an expense report from a receipt. AgentClutch shows merchant, amount, category, memo, receipt evidence, and company policy evidence before submission. The deterministic example renderer returns an `edit` decision that corrects the amount from `$483.72` to `$438.72`, then the simulated host app submits the corrected payload.

## Safety Notes

- Treat expense submission as an external business submission.
- Show enough fields for review, but avoid recording full receipt images or private account data unless needed.
- Edit decisions should become structured patches and resume context, not a free-form chat instruction.
