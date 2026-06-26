import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("npm consumer basic example", () => {
  it("prints an approved Action Card summary", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--import", "tsx", "src/index.ts"],
      {
        cwd: new URL("..", import.meta.url),
        timeout: 10_000,
      },
    );

    const summary = JSON.parse(stdout) as {
      cardType: string;
      action: string;
      consequence: string;
      decision: string;
      resumePolicy: {
        allowSameActionRetry: boolean;
        requireApprovalForSimilarActions: boolean;
        maxRetries: number;
      };
    };

    expect(summary).toEqual({
      cardType: "agentclutch.action_card.v0",
      action: "Send follow-up email",
      consequence: "external_message_send",
      decision: "approve_once",
      resumePolicy: {
        allowSameActionRetry: true,
        requireApprovalForSimilarActions: false,
        maxRetries: 1,
      },
    });
  });
});
