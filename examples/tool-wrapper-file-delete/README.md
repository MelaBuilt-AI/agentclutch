# tool-wrapper-file-delete

Runnable `tool_wrapper` example: a destructive file tool is wrapped so AgentClutch can show an Action Card before deletion.

## Run

```bash
pnpm --filter @agentclutch/example-tool-wrapper-file-delete start
```

## Scenario

The example creates a temporary file, wraps a local delete function, creates a proposal with `sourceMode = "tool_wrapper"`, records an Action Card, and deletes only after `approve_once`.

The Action Card uses a redacted temp path in visible fields so the user can review the target without leaking a full home-directory path.

## Safety Notes

- This runnable example creates and deletes only its own temporary file.
- Prefer showing relative workspace paths instead of absolute home-directory paths when possible.
- Do not record file contents unless needed for the decision.
- Block and takeover decisions should not call the underlying delete function.
