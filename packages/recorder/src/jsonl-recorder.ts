import { appendFile, mkdir, writeFile } from "node:fs/promises";
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
    const serialized = JSON.stringify(event);

    if (serialized === undefined) {
      throw new TypeError("JsonlRecorder can only record JSON-serializable values.");
    }

    await this.init();
    await appendFile(this.eventsPath, `${serialized}\n`, "utf8");
  }
}
