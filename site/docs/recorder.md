# Recorder

`@agentclutch/recorder` stores local run events as JSONL.

## Default Location

```text
.agentclutch/runs/<run_id>/events.jsonl
```

## What Gets Recorded

Adapters should record:

- `action.proposed` loop event
- Action Card
- User decision
- `resume_context.created` loop event

Other loop events can be added by host applications.

## Local-First

The recorder does not upload events. Files stay in the local working directory unless the host app copies them elsewhere.

## Reading Runs

`RunStore` can list runs, read events for a run, and read the latest run.

```ts
import { RunStore } from "@agentclutch/recorder";

const store = new RunStore(".agentclutch");
const latest = await store.readLatestRun();
```

## Sensitive Data

Recorder events may contain field values and URLs. Redact secrets before recording.
