#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
    stagePackages({
      version: requiredOption("--version"),
      destination: requiredOption("--destination"),
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

function stagePackages({ version, destination, dryRun }) {
  assertAlphaVersion(version);
  const tarballsByName = inspectPackedTarballs(destination, version);

  for (const pkg of publishablePackages) {
    const tarball = tarballsByName.get(pkg.name);
    console.log(`STAGE ${pkg.name} ${tarball}`);
    if (!dryRun) {
      run("npm", [
        "stage",
        "publish",
        tarball,
        "--tag",
        "alpha",
        "--access",
        "public",
      ]);
    }
  }
}

function inspectPackedTarballs(destination, version) {
  const expectedNames = new Set(publishablePackages.map((pkg) => pkg.name));
  const tarballsByName = new Map();
  const tarballPaths = readdirSync(destination)
    .filter((fileName) => fileName.endsWith(".tgz"))
    .map((fileName) => resolve(destination, fileName));

  for (const tarballPath of tarballPaths) {
    const manifest = readPackedManifest(tarballPath);
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

function readPackedManifest(tarballPath) {
  const archive = gunzipSync(readFileSync(tarballPath));
  let offset = 0;

  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    const name = readTarString(header, 0, 100);
    if (name === "") {
      break;
    }

    const sizeText = readTarString(header, 124, 12).trim();
    const size = Number.parseInt(sizeText || "0", 8);
    if (!Number.isFinite(size) || size < 0) {
      throw new Error(`${tarballPath} has an invalid tar entry size.`);
    }

    const dataOffset = offset + 512;
    if (name === "package/package.json") {
      return JSON.parse(
        archive.subarray(dataOffset, dataOffset + size).toString("utf8"),
      );
    }

    offset = dataOffset + Math.ceil(size / 512) * 512;
  }

  throw new Error(`${tarballPath} does not contain package/package.json.`);
}

function readTarString(buffer, offset, length) {
  const raw = buffer.subarray(offset, offset + length);
  const nul = raw.indexOf(0);
  return raw.subarray(0, nul === -1 ? raw.length : nul).toString("utf8");
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
  console.log(`$ ${commandName} ${commandArgs.join(" ")}`);
  const result = spawnSync(commandName, commandArgs, {
    cwd: repoRoot,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `${basename(commandName)} failed with exit code ${result.status}`,
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
  node scripts/release-alpha.mjs dry-run
  node scripts/release-alpha.mjs pack --destination /tmp/agentclutch-npm-pack

This helper intentionally does not run real npm publish. Publish remains a manual maintainer action gated by npm auth and 2FA.`);
}
