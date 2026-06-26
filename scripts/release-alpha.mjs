#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publishablePackages = [
  { name: "@agentclutch/action-card", path: "packages/action-card" },
  { name: "@agentclutch/loop", path: "packages/loop" },
  { name: "@agentclutch/core", path: "packages/core" },
  { name: "@agentclutch/recorder", path: "packages/recorder" },
  { name: "@agentclutch/playwright", path: "packages/playwright" },
  { name: "@agentclutch/react", path: "packages/react" },
  { name: "@agentclutch/cli", path: "packages/cli" },
];

const command = process.argv[2] ?? "help";
const args = process.argv.slice(3);

switch (command) {
  case "check":
    checkReleaseBoundary();
    break;
  case "bump":
    bumpVersions(requiredOption("--version"));
    break;
  case "dry-run":
    runForPublishablePackages("publish", [
      "--dry-run",
      "--tag",
      "alpha",
      "--access",
      "public",
      "--no-git-checks",
    ]);
    break;
  case "pack":
    packPackages(option("--destination") ?? "/tmp/agentclutch-npm-pack");
    break;
  case "list":
    console.log(publishablePackages.map((pkg) => pkg.name).join("\n"));
    break;
  case "help":
  case "--help":
  case "-h":
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}

function checkReleaseBoundary() {
  const rootManifest = readJson("package.json");

  if (rootManifest.private !== true) {
    throw new Error("Root package.json must remain private before release.");
  }

  for (const pkg of publishablePackages) {
    const manifest = readJson(join(pkg.path, "package.json"));

    if (manifest.name !== pkg.name) {
      throw new Error(`${pkg.path}/package.json has unexpected name ${manifest.name}`);
    }

    if (manifest.private === true) {
      throw new Error(`${pkg.name} is marked private but is in the publishable set.`);
    }

    if (manifest.publishConfig?.access !== "public") {
      throw new Error(`${pkg.name} must set publishConfig.access to public.`);
    }

    if (manifest.publishConfig?.tag !== "alpha") {
      throw new Error(`${pkg.name} must set publishConfig.tag to alpha.`);
    }

    if (!manifest.files?.includes("dist")) {
      throw new Error(`${pkg.name} must publish only its built dist files.`);
    }
  }

  console.log("Release boundary OK:");
  console.log("- root package remains private");
  console.log("- apps/examples remain outside the publishable package set");
  console.log(`- publishable packages: ${publishablePackages.map((pkg) => pkg.name).join(", ")}`);
}

function bumpVersions(version) {
  assertAlphaVersion(version);
  const paths = ["package.json", ...publishablePackages.map((pkg) => join(pkg.path, "package.json"))];

  for (const manifestPath of paths) {
    const manifest = readJson(manifestPath);
    manifest.version = version;
    writeJson(manifestPath, manifest);
    console.log(`Updated ${manifestPath} -> ${version}`);
  }
}

function runForPublishablePackages(script, scriptArgs) {
  checkReleaseBoundary();

  for (const pkg of publishablePackages) {
    run("pnpm", ["--filter", pkg.name, script, ...scriptArgs]);
  }
}

function packPackages(destination) {
  checkReleaseBoundary();
  mkdirSync(destination, { recursive: true });

  for (const pkg of publishablePackages) {
    run("pnpm", ["--filter", pkg.name, "pack", "--pack-destination", destination]);
  }

  console.log(`Packed ${publishablePackages.length} packages into ${destination}`);
}

function option(name) {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function requiredOption(name) {
  const value = option(name);

  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing required option ${name}`);
  }

  return value;
}

function assertAlphaVersion(version) {
  if (!/^\d+\.\d+\.\d+-alpha\.\d+$/.test(version)) {
    throw new Error(`Expected alpha semver like 0.7.3-alpha.1, got ${version}`);
  }
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  writeFileSync(
    join(repoRoot, relativePath),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function run(commandName, commandArgs) {
  console.log(`$ ${commandName} ${commandArgs.join(" ")}`);
  const result = spawnSync(commandName, commandArgs, {
    cwd: repoRoot,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${basename(commandName)} failed with exit code ${result.status}`);
  }
}

function printHelp() {
  console.log(`AgentClutch alpha release helper

Usage:
  node scripts/release-alpha.mjs check
  node scripts/release-alpha.mjs list
  node scripts/release-alpha.mjs bump --version 0.7.3-alpha.1
  node scripts/release-alpha.mjs dry-run
  node scripts/release-alpha.mjs pack --destination /tmp/agentclutch-npm-pack

This helper intentionally does not run real npm publish. Publish remains a manual maintainer action gated by npm auth and 2FA.`);
}
