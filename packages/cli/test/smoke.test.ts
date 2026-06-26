import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("agentclutch smoke", () => {
  it("prints a registry-safe CLI smoke summary", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", "src/index.ts", "smoke"],
      { cwd: process.cwd() },
    );

    expect(stdout).toContain("AgentClutch CLI smoke check");
    expect(stdout).toContain("CLI entrypoint: ok");
    expect(stdout).toContain("Node runtime: ok");
    expect(stdout).toContain("Registry-safe: yes");
    expect(stdout).toContain(
      "The FakeStore browser demo requires demo assets from a source checkout.",
    );
  });
});
