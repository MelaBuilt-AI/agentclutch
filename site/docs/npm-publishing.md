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
pnpm --filter @agentclutch/action-card publish --dry-run --tag alpha --access public
pnpm --filter @agentclutch/loop publish --dry-run --tag alpha --access public
pnpm --filter @agentclutch/core publish --dry-run --tag alpha --access public
pnpm --filter @agentclutch/recorder publish --dry-run --tag alpha --access public
pnpm --filter @agentclutch/playwright publish --dry-run --tag alpha --access public
pnpm --filter @agentclutch/react publish --dry-run --tag alpha --access public
pnpm --filter @agentclutch/cli publish --dry-run --tag alpha --access public
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
pnpm --filter @agentclutch/action-card pack --pack-destination /tmp/agentclutch-npm-pack
pnpm --filter @agentclutch/loop pack --pack-destination /tmp/agentclutch-npm-pack
pnpm --filter @agentclutch/core pack --pack-destination /tmp/agentclutch-npm-pack
pnpm --filter @agentclutch/recorder pack --pack-destination /tmp/agentclutch-npm-pack
pnpm --filter @agentclutch/playwright pack --pack-destination /tmp/agentclutch-npm-pack
pnpm --filter @agentclutch/react pack --pack-destination /tmp/agentclutch-npm-pack
pnpm --filter @agentclutch/cli pack --pack-destination /tmp/agentclutch-npm-pack
cd /tmp/agentclutch-npm-smoke
npm init -y
npm install /tmp/agentclutch-npm-pack/*.tgz playwright@1.61.1
npx agentclutch --help
```

## Future publish commands

For future alpha versions, run these only after explicit approval:

```bash
pnpm --filter @agentclutch/action-card publish --tag alpha --access public
pnpm --filter @agentclutch/loop publish --tag alpha --access public
pnpm --filter @agentclutch/core publish --tag alpha --access public
pnpm --filter @agentclutch/recorder publish --tag alpha --access public
pnpm --filter @agentclutch/playwright publish --tag alpha --access public
pnpm --filter @agentclutch/react publish --tag alpha --access public
pnpm --filter @agentclutch/cli publish --tag alpha --access public
```

Use `alpha` for future prereleases. npm also created `latest` for `0.7.3-alpha.0` because it was the first version of each package; docs should still recommend explicit `@alpha` installs until a stable release exists.

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
