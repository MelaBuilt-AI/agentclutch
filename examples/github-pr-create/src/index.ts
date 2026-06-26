import { createClutch, type DecisionRenderer } from "@agentclutch/core";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const decidedAt = "2026-06-26T18:00:00.000Z";

export interface SimulatedPullRequest {
  url: string;
  repo: string;
  base: string;
  head: string;
  title: string;
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
      approvedBy: "repo-maintainer",
      decidedAt,
      note: "PR creation approved after reviewing files and reviewer list.",
    };
  },
};

export async function runGitHubPrCreateExample() {
  const recorder = new MemoryRecorder();
  const lessonsRootDir = await mkdtemp(
    join(tmpdir(), "agentclutch-github-pr-lessons-"),
  );
  const clutch = createClutch({
    runId: "run_github_pr_create_example",
    renderer: approveRenderer,
    recorder,
    lessonsRootDir,
  });
  const draft = {
    repo: "MelaBuilt-AI/agentclutch",
    base: "main",
    head: "feat/runnable-examples",
    title: "feat: add runnable consequential-action examples",
    reviewers: ["maintainer-a"],
    changedFiles: [
      "examples/expense-submit/src/index.ts",
      "examples/github-pr-create/src/index.ts",
      "examples/prompt-guard-send-email/src/index.ts",
      "examples/tool-wrapper-file-delete/src/index.ts",
    ],
  };

  try {
    const result = await clutch.onActionProposed({
      sourceMode: "loop_native",
      loopId: "loop_repo_001",
      stepId: "step_pr_create",
      agent: {
        runtime: "custom",
        name: "repository-maintenance-agent",
      },
      userGoal: {
        summary: "Open a reviewable PR for runnable AgentClutch examples",
      },
      proposedAction: {
        kind: "github.pr_create",
        label: "Create pull request",
        targetSurface: "github",
        targetApp: "GitHub",
        targetIdentifier: draft.repo,
        rawInput: {
          ...draft,
          changedFields: [
            { field: "repo", after: draft.repo, editable: false },
            { field: "base", after: draft.base, editable: false },
            { field: "head", after: draft.head, editable: true },
            { field: "title", after: draft.title, editable: true },
            { field: "reviewers", after: draft.reviewers, editable: true },
            {
              field: "changedFiles",
              after: draft.changedFiles,
              editable: false,
            },
          ],
        },
      },
      visibleContext: {
        pageTitle: "GitHub - New pull request",
        url: `https://github.com/${draft.repo}/compare/${draft.base}...${draft.head}`,
        fields: {
          repo: draft.repo,
          base: draft.base,
          head: draft.head,
          title: draft.title,
          reviewerCount: draft.reviewers.length,
          changedFileCount: draft.changedFiles.length,
        },
      },
      loopContext: {
        planSummary:
          "Prepare example changes, open PR, wait for review and checks.",
        whyNow:
          "The branch is ready for human review before repository state changes.",
        confidence: 0.86,
      },
      riskHints: {
        requiresApproval: true,
        reversibility: "compensable",
        blastRadius: "team",
      },
      evidence: [
        {
          label: "Changed files",
          source: "git diff --name-only",
          summary: `${draft.changedFiles.length} example files are included in the PR draft.`,
        },
        {
          label: "Repository target",
          source: "git remote",
          summary: `Target repository is ${draft.repo}, base ${draft.base}.`,
        },
      ],
    });

    const createdPullRequest: SimulatedPullRequest | undefined =
      result.decision.type === "approve_once"
        ? {
            repo: draft.repo,
            base: draft.base,
            head: draft.head,
            title: draft.title,
            url: "https://github.com/MelaBuilt-AI/agentclutch/pull/42",
          }
        : undefined;

    return {
      proposal: result.proposal,
      card: result.card,
      decision: result.decision,
      resumeContext: result.resumeContext,
      createdPullRequest,
      recorderEvents: recorder.events,
      lessonsRootDir,
    };
  } finally {
    await rm(lessonsRootDir, { recursive: true, force: true });
  }
}

function printExampleSummary(name: string, output: unknown): void {
  console.log(`${name} completed:`);
  console.log(JSON.stringify(output, null, 2));
}

function isMainModule(): boolean {
  return process.argv[1]?.endsWith("src/index.ts") ?? false;
}

if (isMainModule()) {
  runGitHubPrCreateExample()
    .then((output) => printExampleSummary("github-pr-create", output))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
