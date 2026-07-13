import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

const runRelease = (...args) => runReleaseWithEnv({}, ...args);

const runReleaseWithEnv = (extraEnv, ...args) =>
  spawnSync(process.execPath, ["scripts/release-alpha.mjs", ...args], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });

test("verify-version accepts the alpha version committed in every publishable manifest", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const result = runRelease("verify-version", "--version", manifest.version);

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    new RegExp(
      `All release manifests match ${manifest.version.replaceAll(".", "\\.")}`,
    ),
  );
});

test("release prep uses Bash for the version input across line endings", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/release-alpha.yml", import.meta.url),
    "utf8",
  );
  const workflowVariants = [workflow, workflow.replaceAll("\n", "\r\n")];

  for (const workflowVariant of workflowVariants) {
    assert.match(
      workflowVariant.replaceAll("\r\n", "\n"),
      /- name: Bump package manifests in workspace\n\s+env:\n\s+RELEASE_VERSION: \$\{\{ inputs\.version \}\}\n\s+shell: bash\n\s+run: node scripts\/release-alpha\.mjs bump --version "\$RELEASE_VERSION"/,
    );
  }
});

function createDependencyTree(version, nestedVersion = version) {
  const dependencies = Object.fromEntries(
    packageNames.map((name) => [name, { version, dependencies: {} }]),
  );
  dependencies["@agentclutch/core"].dependencies["@agentclutch/loop"] = {
    version: nestedVersion,
    dependencies: {},
  };
  return { name: "agentclutch-registry-smoke", version: "1.0.0", dependencies };
}

test("verify-tree accepts exact root and nested AgentClutch versions", (t) => {
  const root = mkdtempSync(join(tmpdir(), "agentclutch-tree-test-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const treePath = join(root, "npm-tree.json");
  writeFileSync(
    treePath,
    `${JSON.stringify(createDependencyTree("0.7.3-alpha.3"))}\n`,
  );

  const result = runRelease(
    "verify-tree",
    "--version",
    "0.7.3-alpha.3",
    "--tree",
    treePath,
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /All AgentClutch dependency-tree nodes match 0\.7\.3-alpha\.3/,
  );
});

test("verify-tree rejects nested AgentClutch version skew", (t) => {
  const root = mkdtempSync(join(tmpdir(), "agentclutch-tree-test-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const treePath = join(root, "npm-tree.json");
  writeFileSync(
    treePath,
    `${JSON.stringify(createDependencyTree("0.7.3-alpha.3", "0.7.3-alpha.2"))}\n`,
  );

  const result = runRelease(
    "verify-tree",
    "--version",
    "0.7.3-alpha.3",
    "--tree",
    treePath,
  );

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /@agentclutch\/loop appears in the npm dependency tree as 0\.7\.3-alpha\.2; expected 0\.7\.3-alpha\.3/,
  );
});

function runTreeFixture(t, tree, version = "0.7.3-alpha.3") {
  const root = mkdtempSync(join(tmpdir(), "agentclutch-tree-test-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  const treePath = join(root, "npm-tree.json");
  writeFileSync(treePath, `${JSON.stringify(tree)}\n`);
  return runRelease("verify-tree", "--version", version, "--tree", treePath);
}

test("verify-tree rejects a missing root AgentClutch package", (t) => {
  const tree = createDependencyTree("0.7.3-alpha.3");
  delete tree.dependencies["@agentclutch/cli"];

  const result = runTreeFixture(t, tree);

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /@agentclutch\/cli is missing at the dependency-tree root or does not equal 0\.7\.3-alpha\.3/,
  );
});

test("verify-tree rejects a wrong root AgentClutch version", (t) => {
  const tree = createDependencyTree("0.7.3-alpha.3");
  tree.dependencies["@agentclutch/cli"].version = "0.7.3-alpha.2";

  const result = runTreeFixture(t, tree);

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /@agentclutch\/cli is missing at the dependency-tree root or does not equal 0\.7\.3-alpha\.3/,
  );
});

test("verify-tree rejects deeply nested AgentClutch version skew", (t) => {
  const tree = createDependencyTree("0.7.3-alpha.3");
  tree.dependencies["@agentclutch/core"].dependencies[
    "@agentclutch/loop"
  ].dependencies["@agentclutch/recorder"] = {
    version: "0.7.3-alpha.2",
    dependencies: {},
  };

  const result = runTreeFixture(t, tree);

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /@agentclutch\/recorder appears in the npm dependency tree as 0\.7\.3-alpha\.2; expected 0\.7\.3-alpha\.3/,
  );
});

const packageNames = [
  "@agentclutch/action-card",
  "@agentclutch/loop",
  "@agentclutch/recorder",
  "@agentclutch/core",
  "@agentclutch/react",
  "@agentclutch/playwright",
  "@agentclutch/cli",
];

function createPackedFixtures(version, overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "agentclutch-release-test-"));
  const destination = join(root, "packs");
  mkdirSync(destination);
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  for (const name of packageNames) {
    const packageDir = join(root, name.split("/").at(-1));
    mkdirSync(packageDir);
    writeFileSync(
      join(packageDir, "package.json"),
      `${JSON.stringify({ name, version: overrides[name]?.version ?? version })}\n`,
    );
    execFileSync(
      npmCommand,
      ["pack", "--silent", "--pack-destination", destination],
      {
        cwd: packageDir,
        shell: process.platform === "win32",
        stdio: "pipe",
      },
    );
  }

  return { destination, root };
}

test(
  "stage dry-run validates packed manifests and preserves dependency order",
  { skip: process.platform === "win32" },
  (t) => {
    const version = "0.7.3-alpha.3";
    const { destination, root } = createPackedFixtures(version);
    t.after(() => rmSync(root, { force: true, recursive: true }));
    const result = runRelease(
      "stage",
      "--version",
      version,
      "--destination",
      destination,
      "--dry-run",
    );

    assert.equal(result.status, 0, result.stderr);
    const stagedNames = result.stdout
      .split("\n")
      .filter((line) => line.startsWith("STAGE "))
      .map((line) => line.split(" ")[1]);
    assert.deepEqual(stagedNames, packageNames);
  },
);

test(
  "stage rejects a tarball whose embedded version differs from the release",
  { skip: process.platform === "win32" },
  (t) => {
    const version = "0.7.3-alpha.3";
    const { destination, root } = createPackedFixtures(version, {
      "@agentclutch/cli": { version: "0.7.3-alpha.4" },
    });
    t.after(() => rmSync(root, { force: true, recursive: true }));

    const result = runRelease(
      "stage",
      "--version",
      version,
      "--destination",
      destination,
      "--dry-run",
    );

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /@agentclutch\/cli@0\.7\.3-alpha\.4; expected 0\.7\.3-alpha\.3/,
    );
  },
);

test(
  "stage rejects tarballs with duplicate package manifests",
  { skip: process.platform === "win32" },
  (t) => {
    const version = "0.7.3-alpha.3";
    const { destination, root } = createPackedFixtures(version);
    t.after(() => rmSync(root, { force: true, recursive: true }));

    const cliTarballName = readdirSync(destination).find((name) =>
      name.startsWith("agentclutch-cli-"),
    );
    assert.ok(cliTarballName);
    const cliTarball = join(destination, cliTarballName);
    const first = join(root, "duplicate-one", "package");
    const second = join(root, "duplicate-two", "package");
    mkdirSync(first, { recursive: true });
    mkdirSync(second, { recursive: true });
    const manifest = `${JSON.stringify({ name: "@agentclutch/cli", version })}\n`;
    writeFileSync(join(first, "package.json"), manifest);
    writeFileSync(join(second, "package.json"), manifest);
    execFileSync(
      "tar",
      [
        "-czf",
        cliTarball,
        "-C",
        join(root, "duplicate-one"),
        "package/package.json",
        "-C",
        join(root, "duplicate-two"),
        "package/package.json",
      ],
      { stdio: "pipe" },
    );

    const result = runRelease(
      "stage",
      "--version",
      version,
      "--destination",
      destination,
      "--dry-run",
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /exactly one package\/package\.json/);
  },
);

test(
  "stage rejects truncated tarballs before npm staging",
  { skip: process.platform === "win32" },
  (t) => {
    const version = "0.7.3-alpha.3";
    const { destination, root } = createPackedFixtures(version);
    t.after(() => rmSync(root, { force: true, recursive: true }));
    const cliTarballName = readdirSync(destination).find((name) =>
      name.startsWith("agentclutch-cli-"),
    );
    assert.ok(cliTarballName);
    const cliTarball = join(destination, cliTarballName);
    truncateSync(cliTarball, Math.floor(statSync(cliTarball).size / 2));

    const result = runRelease(
      "stage",
      "--version",
      version,
      "--destination",
      destination,
      "--dry-run",
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not a valid gzip-compressed tar archive/);
  },
);

function createFakeNpm(root) {
  const bin = join(root, "fake-bin");
  const log = join(root, "npm-invocations.jsonl");
  const realNpm = execFileSync("which", ["npm"], { encoding: "utf8" }).trim();
  mkdirSync(bin);
  const executable = join(bin, "npm");
  writeFileSync(
    executable,
    `#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args[0] === "publish" && args.includes("--dry-run")) {
  const result = spawnSync(process.env.REAL_NPM, args, { stdio: "inherit" });
  process.exit(result.status ?? 1);
}
const previous = existsSync(process.env.NPM_FAKE_LOG)
  ? readFileSync(process.env.NPM_FAKE_LOG, "utf8").trim().split("\\n").filter(Boolean).length
  : 0;
const attempt = previous + 1;
appendFileSync(process.env.NPM_FAKE_LOG, JSON.stringify(args) + "\\n");
if (Number(process.env.NPM_SLEEP_AT ?? 0) === attempt) {
  await new Promise((resolve) => setTimeout(resolve, 60_000));
}
console.log(JSON.stringify({ stageId: \`fake-stage-\${attempt}\` }));
if (Number(process.env.NPM_FAIL_AT ?? 0) === attempt) process.exit(9);
`,
  );
  chmodSync(executable, 0o755);
  return { bin, log, realNpm };
}

test(
  "real staging treats spaces and shell metacharacters in tarball paths as data",
  { skip: process.platform === "win32" },
  (t) => {
    const version = "0.7.3-alpha.3";
    const fixtures = createPackedFixtures(version);
    t.after(() => rmSync(fixtures.root, { force: true, recursive: true }));
    const destination = join(fixtures.root, "packs & harmless");
    renameSync(fixtures.destination, destination);
    const { bin, log, realNpm } = createFakeNpm(fixtures.root);
    const evidence = join(fixtures.root, "stage evidence.json");

    const result = runReleaseWithEnv(
      {
        PATH: `${bin}:${process.env.PATH}`,
        NPM_FAKE_LOG: log,
        REAL_NPM: realNpm,
      },
      "stage",
      "--version",
      version,
      "--destination",
      destination,
      "--evidence",
      evidence,
    );

    assert.equal(result.status, 0, result.stderr);
    const invocations = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(invocations.length, 7);
    assert.ok(
      invocations.every((argv) => argv[0] === "stage" && argv[1] === "publish"),
    );
    assert.ok(
      invocations.every((argv) => argv[2].includes("packs & harmless")),
    );
  },
);

test(
  "staging writes durable evidence when a later package fails",
  { skip: process.platform === "win32" },
  (t) => {
    const version = "0.7.3-alpha.3";
    const { destination, root } = createPackedFixtures(version);
    t.after(() => rmSync(root, { force: true, recursive: true }));
    const { bin, log, realNpm } = createFakeNpm(root);
    const evidencePath = join(root, "stage-evidence.json");

    const result = runReleaseWithEnv(
      {
        PATH: `${bin}:${process.env.PATH}`,
        NPM_FAKE_LOG: log,
        NPM_FAIL_AT: "3",
        REAL_NPM: realNpm,
      },
      "stage",
      "--version",
      version,
      "--destination",
      destination,
      "--evidence",
      evidencePath,
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Earlier packages may already be staged/);
    const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
    assert.deepEqual(
      evidence.results.map((entry) => [entry.package, entry.exitCode]),
      [
        ["@agentclutch/action-card", 0],
        ["@agentclutch/loop", 0],
        ["@agentclutch/recorder", 9],
      ],
    );
  },
);

test(
  "an interrupted stage leaves valid evidence for the in-flight package",
  { skip: process.platform === "win32", timeout: 30_000 },
  async (t) => {
    const version = "0.7.3-alpha.3";
    const { destination, root } = createPackedFixtures(version);
    t.after(() => rmSync(root, { force: true, recursive: true }));
    const { bin, log, realNpm } = createFakeNpm(root);
    const evidencePath = join(root, "stage-evidence.json");
    const child = spawn(
      process.execPath,
      [
        "scripts/release-alpha.mjs",
        "stage",
        "--version",
        version,
        "--destination",
        destination,
        "--evidence",
        evidencePath,
      ],
      {
        cwd: new URL("..", import.meta.url),
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          NPM_FAKE_LOG: log,
          NPM_SLEEP_AT: "3",
          REAL_NPM: realNpm,
        },
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const deadline = Date.now() + 20_000;
    while (
      (!existsSync(log) ||
        readFileSync(log, "utf8").trim().split("\n").filter(Boolean).length <
          3) &&
      Date.now() < deadline
    ) {
      await delay(25);
    }
    assert.ok(existsSync(log), "fake npm never started");
    assert.equal(
      readFileSync(log, "utf8").trim().split("\n").filter(Boolean).length,
      3,
      "third staging attempt never started",
    );

    const exited = once(child, "exit");
    process.kill(-child.pid, "SIGTERM");
    await exited;

    const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
    assert.equal(evidence.results.length, 3);
    assert.deepEqual(
      evidence.results.map((entry) => [entry.package, entry.state]),
      [
        ["@agentclutch/action-card", "completed"],
        ["@agentclutch/loop", "completed"],
        ["@agentclutch/recorder", "attempting"],
      ],
    );
  },
);
