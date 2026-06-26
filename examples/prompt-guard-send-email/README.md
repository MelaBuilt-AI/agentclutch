# prompt-guard-send-email

Runnable `prompt_guard` example: a prompt-based app is about to send one consequential email and asks AgentClutch for approval before executing.

## Run

```bash
pnpm --filter @agentclutch/example-prompt-guard-send-email start
```

## Scenario

A user asks an app to send a follow-up email. The app prepares the message, creates an Action Proposal in `prompt_guard` mode, renders an Action Card, and only simulates sending if the user approves.

The Action Card includes:

- recipient and CC
- subject
- body preview, not hidden headers or tokens
- user instruction evidence
- compose-window evidence
- external-message consequence and risk

## Safety Notes

- Do not include unredacted private email bodies unless the user explicitly expects them in the Action Card.
- Redact tokens, signatures, and hidden headers.
- A block decision should re-plan without sending the same message.
