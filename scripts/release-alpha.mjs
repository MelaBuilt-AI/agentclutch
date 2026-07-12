#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publishablePackages = [
  { name: "@agentclutch/action-card", path: "packages/action-card" },
  { name: "@agentclutch/loop", path: "packages/loop" },
  { name: "@agentclutch/recorder", path: "packages/recorder" },
  { name: "@agentclutch/core", path: "packages/core" },
  { name: "@agentclutch/react", path: "packages/react" },
  { name: "@agentclutch/playwright", path: "packages/playwright" },
  { name: "@agentclutch/cli", path: "packages/cli" },
];

const command = process.argv[2] ?? "help";
const args = process.argv.slice(3);
let evidenceWriteSequence = 0;

switch (command) {
  case "check":
    checkReleaseBoundary();
    break;
  case "bump":
    bumpVersions(requiredOption("--version"));
    break;
  case "verify-version":
    verifyVersions(requiredOption("--version"));
    break;
  case "stage":
    await stagePackages({
      version: requiredOption("--version"),
      destination: requiredOption("--destination"),
      evidencePath: option("--evidence"),
      dryRun: args.includes("--dry-run"),
    });
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
      throw new Error(
        `${pkg.path}/package.json has unexpected name ${manifest.name}`,
      );
    }

    if (manifest.private === true) {
      throw new Error(
        `${pkg.name} is marked private but is in the publishable set.`,
      );
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
  console.log(
    `- publishable packages: ${publishablePackages.map((pkg) => pkg.name).join(", ")}`,
  );
}

function bumpVersions(version) {
  assertAlphaVersion(version);
  const paths = [
    "package.json",
    ...publishablePackages.map((pkg) => join(pkg.path, "package.json")),
  ];

  for (const manifestPath of paths) {
    const manifest = readJson(manifestPath);
    manifest.version = version;
    writeJson(manifestPath, manifest);
    console.log(`Updated ${manifestPath} -> ${version}`);
  }
}

function verifyVersions(version) {
  assertAlphaVersion(version);
  const paths = [
    "package.json",
    ...publishablePackages.map((pkg) => join(pkg.path, "package.json")),
  ];

  for (const manifestPath of paths) {
    const manifest = readJson(manifestPath);
    if (manifest.version !== version) {
      throw new Error(
        `${manifestPath} is ${manifest.version}; expected ${version}.`,
      );
    }
  }

  console.log(`All release manifests match ${version}`);
}

async function stagePackages({ version, destination, evidencePath, dryRun }) {
  assertAlphaVersion(version);
  if (process.platform === "win32") {
    throw new Error(
      "Tarball validation and real npm staging are supported only on the GitHub-hosted Linux release job.",
    );
  }
  const tarballsByName = await inspectPackedTarballs(destination, version);
  const evidence = {
    version,
    destination: resolve(destination),
    startedAt: new Date().toISOString(),
    completedAt: null,
    results: [],
  };
  writeStageEvidence(evidencePath, evidence);

  for (const pkg of publishablePackages) {
    const tarball = tarballsByName.get(pkg.name);
    console.log(`STAGE ${pkg.name} ${tarball}`);
    if (dryRun) {
      continue;
    }

    const stageResult = {
      package: pkg.name,
      tarball,
      state: "attempting",
      startedAt: new Date().toISOString(),
      completedAt: null,
      exitCode: null,
      error: null,
      stdout: "",
      stderr: "",
    };
    evidence.results.push(stageResult);
    writeStageEvidence(evidencePath, evidence);

    const result = runCaptured("npm", [
      "stage",
      "publish",
      tarball,
      "--tag",
      "alpha",
      "--access",
      "public",
      "--ignore-scripts",
    ]);
    Object.assign(stageResult, {
      state: result.status === 0 ? "completed" : "failed",
      completedAt: new Date().toISOString(),
      exitCode: result.status,
      error: result.error?.message ?? null,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    });
    writeStageEvidence(evidencePath, evidence);

    if (result.status !== 0) {
      throw new Error(
        `npm stage publish failed for ${pkg.name} with exit code ${result.status}. ` +
          "Earlier packages may already be staged; inspect the evidence artifact and reject partial stages on npmjs.com before retrying.",
      );
    }
  }

  evidence.completedAt = new Date().toISOString();
  writeStageEvidence(evidencePath, evidence);
}

async function inspectPackedTarballs(destination, version) {
  const expectedNames = new Set(publishablePackages.map((pkg) => pkg.name));
  const tarballsByName = new Map();
  const tarballPaths = readdirSync(destination)
    .filter((fileName) => fileName.endsWith(".tgz"))
    .map((fileName) => resolve(destination, fileName));

  for (const tarballPath of tarballPaths) {
    const manifest = await readPackedManifest(tarballPath);
    if (!expectedNames.has(manifest.name)) {
      throw new Error(
        `${tarballPath} contains unexpected package ${manifest.name}.`,
      );
    }
    if (manifest.version !== version) {
      throw new Error(
        `${tarballPath} contains ${manifest.name}@${manifest.version}; expected ${version}.`,
      );
    }
    if (tarballsByName.has(manifest.name)) {
      throw new Error(`Multiple tarballs found for ${manifest.name}.`);
    }
    tarballsByName.set(manifest.name, tarballPath);
  }

  for (const packageName of expectedNames) {
    if (!tarballsByName.has(packageName)) {
      throw new Error(`Missing packed tarball for ${packageName}@${version}.`);
    }
  }

  return tarballsByName;
}

async function readPackedManifest(tarballPath) {
  const listing = runCaptured("tar", ["-tzf", tarballPath]);
  if (listing.status !== 0) {
    throw new Error(
      `${tarballPath} is not a valid gzip-compressed tar archive: ${listing.stderr ?? listing.error?.message ?? "tar failed"}`,
    );
  }
  const manifestEntries = listing.stdout
    .split(/\r?\n/)
    .map((entry) => entry.replace(/^\.\//, ""))
    .filter((entry) => entry === "package/package.json");
  if (manifestEntries.length !== 1) {
    throw new Error(
      `${tarballPath} must contain exactly one package/package.json entry.`,
    );
  }

  const npmInspection = runCaptured("npm", [
    "publish",
    tarballPath,
    "--dry-run",
    "--json",
    "--tag",
    "alpha",
    "--access",
    "public",
    "--ignore-scripts",
  ]);
  if (npmInspection.status !== 0) {
    throw new Error(
      `${tarballPath} failed npm's own publish dry-run inspection: ${npmInspection.stderr ?? npmInspection.error?.message ?? "npm failed"}`,
    );
  }

  let report;
  try {
    report = JSON.parse(npmInspection.stdout);
  } catch (error) {
    throw new Error(
      `${tarballPath} produced invalid npm inspection JSON: ${error.message}`,
    );
  }
  const inspectedPackage =
    report?.name !== undefined && report?.version !== undefined
      ? report
      : Object.values(report).length === 1
        ? Object.values(report)[0]
        : undefined;
  if (
    inspectedPackage?.name === undefined ||
    inspectedPackage?.version === undefined
  ) {
    throw new Error(
      `${tarballPath} produced an unexpected npm inspection report.`,
    );
  }
  return { name: inspectedPackage.name, version: inspectedPackage.version };
}

function writeStageEvidence(evidencePath, evidence) {
  if (evidencePath === undefined) {
    return;
  }
  const targetPath = resolve(evidencePath);
  const temporaryPath = `${targetPath}.${process.pid}.${++evidenceWriteSequence}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  renameSync(temporaryPath, targetPath);
}

function runCaptured(commandName, commandArgs) {
  console.log(`$ ${commandName} ${commandArgs.join(" ")}`);
  return spawnSync(commandName, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
  });
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
    run("pnpm", [
      "--filter",
      pkg.name,
      "pack",
      "--pack-destination",
      destination,
    ]);
  }

  console.log(
    `Packed ${publishablePackages.length} packages into ${destination}`,
  );
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
  if (
    process.platform === "win32" &&
    commandArgs.some((argument) => /[&|<>^()%!"\r\n]/.test(argument))
  ) {
    throw new Error(
      "Refusing a Windows shell argument containing cmd.exe metacharacters.",
    );
  }
  console.log(`$ ${commandName} ${commandArgs.join(" ")}`);
  const result = spawnSync(commandName, commandArgs, {
    cwd: repoRoot,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `${basename(commandName)} failed with exit code ${result.status ?? "unknown"}`,
    );
  }
}

function printHelp() {
  console.log(`AgentClutch alpha release helper

Usage:
  node scripts/release-alpha.mjs check
  node scripts/release-alpha.mjs list
  node scripts/release-alpha.mjs bump --version 0.7.3-alpha.1
  node scripts/release-alpha.mjs verify-version --version 0.7.3-alpha.1
  node scripts/release-alpha.mjs stage --version 0.7.3-alpha.1 --destination /tmp/agentclutch-npm-pack --dry-run
  node scripts/release-alpha.mjs stage --version 0.7.3-alpha.1 --destination /tmp/agentclutch-npm-pack --evidence npm-stage-evidence.json
  node scripts/release-alpha.mjs dry-run
  node scripts/release-alpha.mjs pack --destination /tmp/agentclutch-npm-pack

This helper never runs direct npm publish. The trusted GitHub Actions release job may stage verified tarballs through OIDC; a maintainer must still review and approve every staged package with npm 2FA.`);
}
