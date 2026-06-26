import { describe, expect, it } from "vitest";
import { runGitHubPrCreateExample } from "../src/index.js";

describe("github-pr-create runnable example", () => {
  it("creates a repository-change Action Card before simulating PR creation", async () => {
    const result = await runGitHubPrCreateExample();

    expect(result.card.proposed_action.kind).toBe("github.pr_create");
    expect(result.card.consequence.class).toBe("code_repository_change");
    expect(result.decision.type).toBe("approve_once");
    expect(result.createdPullRequest?.url).toBe("https://github.com/MelaBuilt-AI/agentclutch/pull/42");
    expect(result.resumeContext.continuePolicy.requireApprovalForSimilarActions).toBe(false);
  });
});
