import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const runRelease = (...args) =>
  spawnSync(process.execPath, ["scripts/release-alpha.mjs", ...args], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
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

test("stage dry-run validates packed manifests and preserves dependency order", (t) => {
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
});

test("stage rejects a tarball whose embedded version differs from the release", (t) => {
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
});
