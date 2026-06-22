# tool-wrapper-file-delete

This example documents the `tool_wrapper` adoption path: a destructive file tool is wrapped so AgentClutch can show an Action Card before deletion.

## Scenario

An app or agent is about to delete a local file. The wrapped tool creates a proposal with `sourceMode = "tool_wrapper"`, records an Action Card, and deletes only after approval.

## Shape

```ts
import { createClutch } from "@agentclutch/core";

const clutch = createClutch({ runId: "run_file_001", renderer });

const guardedDelete = clutch.wrapTool(deleteFile, {
  kind: "file.delete",
  label: "Delete file",
  targetSurface: "filesystem",
  targetApp: "local workspace",
  riskHints: {
    requiresApproval: true,
    reversibility: "unknown",
    blastRadius: "single_user"
  }
});

await guardedDelete("/workspace/tmp/report.csv");
```

## Safety Notes

- Prefer showing relative workspace paths instead of absolute home-directory paths when possible.
- Do not record file contents unless needed for the decision.
- Block and takeover decisions should not call the underlying delete function.
