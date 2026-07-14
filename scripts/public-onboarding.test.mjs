import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const manifest = JSON.parse(read("package.json"));
const currentVersion = manifest.version;

const packageReadmes = [
  "packages/action-card/README.md",
  "packages/loop/README.md",
  "packages/recorder/README.md",
  "packages/core/README.md",
  "packages/react/README.md",
  "packages/playwright/README.md",
  "packages/cli/README.md",
];

const currentPublicDocs = [
  "README.md",
  "docs/quickstart.md",
  "docs/limitations.md",
  "site/docs/index.md",
  "site/docs/quickstart.md",
  "site/docs/limitations.md",
  ...packageReadmes,
];

test("current public documentation names the committed npm alpha", () => {
  for (const path of currentPublicDocs) {
    assert.match(
      read(path),
      new RegExp(currentVersion.replaceAll(".", "\\.")),
      `${path} must name ${currentVersion}`,
    );
  }

  assert.match(
    read("AgentClutch.md").slice(0, 2_000),
    new RegExp(`v${currentVersion.replaceAll(".", "\\.")}`),
    "the living design status must name the current implementation",
  );
});

test("the public clone quickstart works without GitHub SSH credentials", () => {
  for (const path of ["docs/quickstart.md", "site/docs/quickstart.md"]) {
    const contents = read(path);
    assert.match(
      contents,
      /git clone https:\/\/github\.com\/MelaBuilt-AI\/agentclutch\.git/,
      `${path} must lead with the public HTTPS clone URL`,
    );
    assert.doesNotMatch(contents, /git clone git@github\.com:/);
    assert.match(contents, /pnpm lint/);
  }
});

test("the npm consumer quickstart is no-build and pnpm 11 safe", () => {
  const contents = read("examples/npm-consumer-basic/README.md");
  assert.match(contents, /npm init -y/);
  assert.match(contents, /npm pkg set type=module/);
  assert.match(
    contents,
    new RegExp(
      `npm install @agentclutch/core@${currentVersion.replaceAll(".", "\\.")}`,
    ),
  );
  assert.match(contents, /node src\/index\.mjs/);
  assert.doesNotMatch(contents, /pnpm pkg set/);
  assert.doesNotMatch(contents, /pnpm add -D tsx/);
});

test("release-day pnpm behavior is explained without disabling safety globally", () => {
  for (const path of ["docs/quickstart.md", "site/docs/quickstart.md"]) {
    const contents = read(path);
    assert.match(contents, /minimumReleaseAge/);
    assert.match(contents, /1,?440 minutes|24 hours/);
    assert.match(contents, /minimumReleaseAgeExclude/);
    assert.match(contents, /@agentclutch\/\*/);
    assert.doesNotMatch(contents, /minimumReleaseAge:\s*0/);
  }
});

test("the root Quick Start includes a runnable deterministic renderer", () => {
  const contents = read("README.md");
  assert.match(
    contents,
    new RegExp(
      `npm install @agentclutch/core@${currentVersion.replaceAll(".", "\\.")}`,
    ),
  );
  assert.match(contents, /node index\.mjs/);
  assert.match(contents, /const approveRenderer =/);
  assert.match(contents, /renderer: approveRenderer/);
  assert.doesNotMatch(contents, /createClutch\(\{ runId: [^\n]+, renderer \}\)/);
  assert.doesNotMatch(contents, /await sendEmail\(\);/);
});

test("the docs header does not show GitHub's stable-only release widget", () => {
  const css = read("site/docs/stylesheets/extra.css");
  assert.match(
    css,
    /\.md-source__facts\s*\{[^}]*display:\s*none;/s,
    "the dynamic GitHub facts hide prerelease versions and must not contradict the alpha docs",
  );
  assert.match(
    css,
    /\.md-tabs\s*\{[^}]*background:\s*#1a1a28;/s,
    "the tab bar must keep normal-size navigation text at accessible contrast",
  );
});

test("the published Action Card manifest uses a reproducible Zod range", () => {
  const packageManifest = JSON.parse(read("packages/action-card/package.json"));
  assert.equal(packageManifest.dependencies.zod, "^4.4.3");

  const lockfile = read("pnpm-lock.yaml").replaceAll("\r\n", "\n");
  const lockfileVariants = [lockfile, lockfile.replaceAll("\n", "\r\n")];

  for (const variant of lockfileVariants) {
    assert.match(
      variant.replaceAll("\r\n", "\n"),
      /packages\/action-card:\n\s+dependencies:\n\s+zod:\n\s+specifier: \^4\.4\.3\n\s+version: 4\.4\.3/,
    );
  }
});
