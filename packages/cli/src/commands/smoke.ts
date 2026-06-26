export interface SmokeCheckOptions {
  minNodeMajor?: number;
  nodeVersion?: string;
}

export interface SmokeCheckResult {
  minNodeMajor: number;
  nodeVersion: string;
  nodeMajor: number;
  nodeOk: boolean;
}

export function runSmokeCheck(options: SmokeCheckOptions = {}): string {
  return formatSmokeCheck(evaluateSmokeCheck(options));
}

export function evaluateSmokeCheck(
  options: SmokeCheckOptions = {},
): SmokeCheckResult {
  const minNodeMajor = options.minNodeMajor ?? 22;
  const nodeVersion = options.nodeVersion ?? process.version;
  const nodeMajor = parseNodeMajor(nodeVersion);

  return {
    minNodeMajor,
    nodeVersion,
    nodeMajor,
    nodeOk: nodeMajor >= minNodeMajor,
  };
}

export function formatSmokeCheck(result: SmokeCheckResult): string {
  const nodeStatus = result.nodeOk
    ? `ok (${result.nodeVersion})`
    : `unsupported (${result.nodeVersion}; requires Node ${result.minNodeMajor}+)`;

  return [
    "AgentClutch CLI smoke check",
    "CLI entrypoint: ok",
    `Node runtime: ${nodeStatus}`,
    "Registry-safe: yes",
    "",
    "This command is intentionally lightweight so it can run from npm without a source checkout.",
    "The FakeStore browser demo requires demo assets from a source checkout.",
    "From npm, use:",
    "  pnpm dlx @agentclutch/cli@alpha smoke",
    "  pnpm dlx @agentclutch/cli@alpha --help",
  ].join("\n");
}

function parseNodeMajor(version: string): number {
  const match = /^v?(\d+)/.exec(version);

  if (match === null) {
    return 0;
  }

  return Number(match[1]);
}
