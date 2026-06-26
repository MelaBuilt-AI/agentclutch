#!/usr/bin/env node
import { parseCheckoutDemoArgs, runCheckoutDemo } from "./commands/demo.js";
import { inspectRun } from "./commands/inspect.js";
import { runSmokeCheck } from "./commands/smoke.js";

async function main(args: string[]): Promise<void> {
  const [command, subcommand] = args;

  if (command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (
    command === "demo" &&
    (subcommand === undefined || subcommand === "checkout")
  ) {
    await runCheckoutDemo(parseCheckoutDemoArgs(args.slice(2)));
    return;
  }

  if (command === "inspect") {
    console.log(await inspectRun(subcommand ?? "latest"));
    return;
  }

  if (command === "smoke") {
    console.log(runSmokeCheck());
    return;
  }

  printHelp();

  if (command !== undefined) {
    process.exitCode = 1;
  }
}

function printHelp(): void {
  console.log(`AgentClutch

Usage:
  agentclutch smoke
  agentclutch demo checkout [--clear-rules] [--seed-allow-rule|--seed-block-rule|--seed-require-clutch-rule]
  agentclutch inspect [latest|run_id]

Commands:
  smoke           Verify the npm-installed CLI entrypoint without source demo assets
  demo checkout   Run the local fake store checkout demo
  inspect         Summarize local AgentClutch run events`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
