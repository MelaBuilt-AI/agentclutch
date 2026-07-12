# npm Publishing Plan

This document records the first AgentClutch npm alpha publish and provides the checklist for future alpha versions.

## Published boundary

The first public npm alpha published these workspace packages only:

- `@agentclutch/action-card@0.7.3-alpha.0`
- `@agentclutch/loop@0.7.3-alpha.0`
- `@agentclutch/core@0.7.3-alpha.0`
- `@agentclutch/recorder@0.7.3-alpha.0`
- `@agentclutch/playwright@0.7.3-alpha.0`
- `@agentclutch/react@0.7.3-alpha.0`
- `@agentclutch/cli@0.7.3-alpha.0`

Remain unpublished:

- root package `agentclutch-monorepo` (`private: true`)
- `apps/*`
- `examples/*`

## Why include loop and recorder?

`@agentclutch/core`, `@agentclutch/react`, `@agentclutch/playwright`, and `@agentclutch/cli` depend on the loop and recorder packages. Publishing them together keeps the first npm alpha installable without hidden monorepo-only dependencies.

## npm/org setup

1. Confirm the npm account/organization that owns the `@agentclutch` scope.
2. Login locally:

```bash
npm login
npm whoami
```

3. Confirm package names are still available:

```bash
npm view @agentclutch/core name version
npm view @agentclutch/cli name version
```

For future new packages, npm should return `E404` before first publish. Existing AgentClutch packages should return their published versions.

## Prepublish verification for future versions

AgentClutch uses a lightweight release helper instead of Changesets for the current alpha line. It keeps the publishable package list explicit and intentionally does **not** run real `npm publish`.

Validate the publish boundary before preparing a release:

```bash
pnpm release:check
```

Bump the root package marker and all publishable package manifests:

```bash
pnpm release:bump -- --version 0.7.3-alpha.1
```

The helper only accepts prerelease versions shaped like `x.y.z-alpha.n`, which keeps alpha release prep from accidentally producing stable package metadata.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm test
git diff --check
```

## Package dry-run for future versions

Run from the repo root after building:

```bash
pnpm release:dry-run
```

Inspect each dry-run manifest and tarball listing for:

- `dist/**` JavaScript and declaration files are present.
- `README.md`, `package.json`, and license metadata are present.
- Workspace dependencies are rewritten to real versions in the publish manifest.
- No `.agentclutch`, local run logs, secrets, screenshots with private data, or repo-only files are included.

## Tarball smoke test before future publish

Pack tarballs into a temporary directory and install them together in a clean app before publishing. Use `npm install` for this prepublish tarball smoke because the packed manifests correctly rewrite `workspace:*` dependencies to exact registry versions; until the packages exist on npm, pnpm may try to resolve those exact transitive versions from the registry instead of the sibling tarballs.

```bash
rm -rf /tmp/agentclutch-npm-pack /tmp/agentclutch-npm-smoke
mkdir -p /tmp/agentclutch-npm-pack /tmp/agentclutch-npm-smoke
pnpm release:pack -- --destination /tmp/agentclutch-npm-pack
cd /tmp/agentclutch-npm-smoke
npm init -y
npm install /tmp/agentclutch-npm-pack/*.tgz playwright@1.61.1
npx agentclutch --help
npx agentclutch smoke
```

## GitHub release workflows

Maintainers have two deliberately separate workflows:

- **Alpha Release Prep** (`release-alpha.yml`) is a read-only rehearsal. It validates the publish boundary, bumps manifests only in the temporary workflow workspace, runs lint/typecheck/tests/build on Ubuntu and Windows, runs npm publish dry-runs, and uploads packed tarballs. It never authenticates to npm.
- **Stage or Verify npm Alpha** (`stage-alpha.yml`) is the trusted-publishing path for a version already committed and tagged. Dispatch it from the matching `vX.Y.Z-alpha.N` tag with `mode=stage`; after npm approval, dispatch the same tag/version with `mode=verify`.

The staging workflow uses a GitHub-hosted Ubuntu runner, Node 24, npm 11.16.0, and these least-privilege permissions:

```yaml
permissions:
  contents: read
  id-token: write
```

The OIDC job refuses branch dispatches, mismatched tags/manifests, versions already present on npm, missing/duplicate/unexpected tarballs, and tarballs whose embedded package name or version does not match the release. It runs the full local gates plus a clean tarball install before calling `npm stage publish` in dependency order.

No `NPM_TOKEN` or OTP is stored in GitHub. Staging does not make packages public. A maintainer must inspect npmjs.com → **Staged Packages** and approve each package using normal 2FA. The follow-up `mode=verify` job confirms all exact versions and `alpha` dist-tags, installs all seven packages from npm in a clean directory, runs CLI help/smoke, imports core, and runs `npm audit`.

## Configure npm trusted publishing

Each existing public package needs its own npm trusted-publisher entry, all pointing to the same exact workflow:

- Provider: GitHub Actions
- Organization/user: `MelaBuilt-AI`
- Repository: `agentclutch`
- Workflow filename: `stage-alpha.yml`
- Environment: leave blank unless the workflow is later pinned to a protected GitHub environment
- Allowed action: **npm stage publish only**

Configure these seven packages:

1. `@agentclutch/action-card`
2. `@agentclutch/loop`
3. `@agentclutch/recorder`
4. `@agentclutch/core`
5. `@agentclutch/react`
6. `@agentclutch/playwright`
7. `@agentclutch/cli`

After the first successful OIDC staging cycle, revoke obsolete automation publish tokens and keep traditional-token publishing disabled where npm package settings allow it.

## Future alpha sequence

Only after explicit approval:

1. Bump all release manifests to a new immutable alpha version and commit the change.
2. Push and verify normal Build/Test CI.
3. Run **Alpha Release Prep** and inspect its artifacts.
4. Create and push an annotated `vX.Y.Z-alpha.N` tag resolving to the intended commit.
5. Dispatch **Stage or Verify npm Alpha** from that tag with `mode=stage` and the exact version.
6. Review the staged packages on npmjs.com and approve them with 2FA.
7. Dispatch the same tag/version with `mode=verify`.
8. Create or update the matching GitHub release only after registry verification succeeds.

The helper's local staging validation can be rehearsed without npm side effects:

```bash
pnpm release:pack -- --destination /tmp/agentclutch-npm-pack
node scripts/release-alpha.mjs stage \
  --version 0.7.3-alpha.3 \
  --destination /tmp/agentclutch-npm-pack \
  --dry-run
```

Do not attempt to republish an existing version. npm versions are immutable.

## Postpublish verification

```bash
npm view @agentclutch/core dist-tags version
npm view @agentclutch/cli dist-tags version
rm -rf /tmp/agentclutch-npm-registry-smoke
mkdir /tmp/agentclutch-npm-registry-smoke
cd /tmp/agentclutch-npm-registry-smoke
pnpm init
pnpm add @agentclutch/core@alpha @agentclutch/react@alpha @agentclutch/playwright@alpha playwright
pnpm dlx @agentclutch/cli@alpha --help
```

If a published alpha is bad, deprecate it and publish a new alpha patch. Do not try to overwrite an npm version; npm versions are immutable.
