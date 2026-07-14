import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const expectedSummary = {
  cardType: "agentclutch.action_card.v0",
  action: "Send follow-up email",
  consequence: "external_message_send",
  decision: "approve_once",
  resumePolicy: {
    allowSameActionRetry: true,
    requireApprovalForSimilarActions: false,
    maxRetries: 1,
  },
};

describe("npm consumer basic example", () => {
  it("prints an approved Action Card summary from TypeScript", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", "src/index.ts"],
      {
        cwd: new URL("..", import.meta.url),
        timeout: 10_000,
      },
    );

    expect(JSON.parse(stdout)).toEqual(expectedSummary);
  });

  it("prints the same summary from the no-build JavaScript quickstart", async () => {
    const { stdout } = await execFileAsync(process.execPath, ["src/index.mjs"], {
      cwd: new URL("..", import.meta.url),
      timeout: 10_000,
    });

    expect(JSON.parse(stdout)).toEqual(expectedSummary);
  });
});
