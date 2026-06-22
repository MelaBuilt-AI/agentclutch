import { mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { JsonlRecorder } from "./jsonl-recorder.js";

export interface LatestRun {
  runId: string;
  events: unknown[];
}

export class RunStore {
  constructor(public readonly rootDir = ".agentclutch") {}

  async createRecorder(runId: string): Promise<JsonlRecorder> {
    await mkdir(this.runDir(runId), { recursive: true });
    const recorder = new JsonlRecorder({ rootDir: this.rootDir, runId });
    await recorder.init();
    return recorder;
  }

  async listRuns(): Promise<string[]> {
    try {
      const entries = await readdir(this.runsDir(), { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    } catch (error) {
      if (isNotFoundError(error)) {
        return [];
      }

      throw error;
    }
  }

  async readEvents(runId: string): Promise<unknown[]> {
    let file: string;

    try {
      file = await readFile(this.eventsPath(runId), "utf8");
    } catch (error) {
      if (isNotFoundError(error)) {
        return [];
      }

      throw error;
    }

    return file
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as unknown);
  }

  async readLatestRun(): Promise<LatestRun | undefined> {
    const runIds = await this.listRuns();

    if (runIds.length === 0) {
      return undefined;
    }

    const candidates = await Promise.all(
      runIds.map(async (runId) => {
        try {
          const metadata = await stat(this.runDir(runId));
          return { runId, mtimeMs: metadata.mtimeMs };
        } catch (error) {
          if (isNotFoundError(error)) {
            return undefined;
          }

          throw error;
        }
      })
    );

    const latest = candidates
      .filter((candidate): candidate is { runId: string; mtimeMs: number } =>
        candidate !== undefined
      )
      .sort((left, right) => {
        if (left.mtimeMs === right.mtimeMs) {
          return left.runId.localeCompare(right.runId);
        }

        return left.mtimeMs - right.mtimeMs;
      })
      .at(-1);

    if (latest === undefined) {
      return undefined;
    }

    return {
      runId: latest.runId,
      events: await this.readEvents(latest.runId)
    };
  }

  async clearRun(runId: string): Promise<void> {
    await rm(this.runDir(runId), { recursive: true, force: true });
  }

  private runsDir(): string {
    return join(this.rootDir, "runs");
  }

  private runDir(runId: string): string {
    return join(this.runsDir(), runId);
  }

  private eventsPath(runId: string): string {
    return join(this.runDir(runId), "events.jsonl");
  }
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
