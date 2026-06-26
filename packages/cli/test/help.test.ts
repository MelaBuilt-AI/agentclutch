import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("agentclutch help", () => {
  it("prints help and exits successfully for --help", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", "src/index.ts", "--help"],
      { cwd: process.cwd() },
    );

    expect(stdout).toContain("AgentClutch");
    expect(stdout).toContain("Usage:");
  });
});
