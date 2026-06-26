import { createClutch, type DecisionRenderer } from "@agentclutch/core";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const decidedAt = "2026-06-26T18:00:00.000Z";

export interface DeleteResult {
  deleted: boolean;
  path: string;
}

class MemoryRecorder {
  readonly events: unknown[] = [];

  async record(event: unknown): Promise<void> {
    this.events.push(event);
  }
}

const approveRenderer: DecisionRenderer = {
  async decide() {
    return {
      type: "approve_once",
      approvedBy: "workspace-owner",
      decidedAt,
      note: "The file is in the generated temp workspace and may be deleted."
    };
  }
};

export async function runToolWrapperFileDeleteExample() {
  const recorder = new MemoryRecorder();
  const clutch = createClutch({
    runId: "run_tool_wrapper_file_delete_example",
    renderer: approveRenderer,
    recorder
  });
  const tempDir = await mkdtemp(join(tmpdir(), "agentclutch-file-delete-"));
  const filePath = join(tempDir, "stale-report.csv");
  await writeFile(filePath, "id,status\n1,stale\n", "utf8");

  const guardedDelete = clutch.wrapTool(deleteLocalFile, {
    kind: "file.delete",
    label: "Delete stale report",
    targetSurface: "filesystem",
    targetApp: "local workspace",
    risk: {
      requiresApproval: true,
      reversibility: "unknown",
      blastRadius: "single_user"
    },
    buildUserGoal: (path) => ({
      original: `Delete ${basename(path)} after export validation.`,
      summary: "Delete a stale generated report"
    }),
    buildVisibleContext: (path) => ({
      fields: {
        relativePath: `tmp/${basename(path)}`,
        absolutePathRedacted: `<tempdir>/${basename(path)}`,
        reason: "Generated stale report should not be kept."
      }
    }),
    buildEvidence: (path) => [
      {
        label: "Generated temp file",
        source: "filesystem",
        summary: `${basename(path)} was created by this example in a temporary directory.`
      }
    ]
  });

  const deleteResult = await guardedDelete(filePath);
  const card = recorder.events.find(isActionCardEvent);

  if (card === undefined) {
    throw new Error("File-delete example did not record an Action Card.");
  }

  return {
    card,
    deleteResult,
    filePath,
    recorderEvents: recorder.events
  };
}

async function deleteLocalFile(path: string): Promise<DeleteResult> {
  await rm(path);
  return { deleted: true, path };
}

function isActionCardEvent(event: unknown): event is {
  type: "agentclutch.action_card.v0";
  proposed_action: { kind: string };
  consequence: { class: string };
} {
  return (
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    event.type === "agentclutch.action_card.v0"
  );
}

function printExampleSummary(name: string, output: unknown): void {
  console.log(`${name} completed:`);
  console.log(JSON.stringify(output, null, 2));
}

function isMainModule(): boolean {
  return process.argv[1]?.endsWith("src/index.ts") ?? false;
}

if (isMainModule()) {
  runToolWrapperFileDeleteExample()
    .then((output) => printExampleSummary("tool-wrapper-file-delete", output))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
