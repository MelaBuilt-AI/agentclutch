#!/usr/bin/env node
import { parseCheckoutDemoArgs, runCheckoutDemo } from "./commands/demo.js";

async function main(args: string[]): Promise<void> {
  const [command, subcommand] = args;

  if (command === "demo" && (subcommand === undefined || subcommand === "checkout")) {
    await runCheckoutDemo(parseCheckoutDemoArgs(args.slice(2)));
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

Commands:
  demo checkout   Run the local fake store checkout demo`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
