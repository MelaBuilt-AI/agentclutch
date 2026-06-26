#!/usr/bin/env node
import { parseCheckoutDemoArgs, runCheckoutDemo } from "./commands/demo.js";
import { inspectRun } from "./commands/inspect.js";

async function main(args: string[]): Promise<void> {
  const [command, subcommand] = args;

  if (command === "demo" && (subcommand === undefined || subcommand === "checkout")) {
    await runCheckoutDemo(parseCheckoutDemoArgs(args.slice(2)));
    return;
  }

  if (command === "inspect") {
    console.log(await inspectRun(subcommand ?? "latest"));
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
  agentclutch demo checkout [--clear-rules] [--seed-allow-rule|--seed-block-rule|--seed-require-clutch-rule]
  agentclutch inspect [latest|run_id]

Commands:
  demo checkout   Run the local fake store checkout demo
  inspect         Summarize local AgentClutch run events`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
