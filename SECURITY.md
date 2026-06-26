# Security Policy

AgentClutch is a user-control layer for consequential AI agent actions. It may process sensitive action metadata such as page titles, selectors, field values, URLs, tool names, proposed messages, and local run records.

## Supported versions

AgentClutch is currently alpha software. Security fixes target the latest public alpha release and the `main` branch.

| Version | Supported |
| --- | --- |
| `0.7.3-alpha.x` | Yes |
| older alpha tags | Best effort |

## Reporting a vulnerability

Please report security issues privately before opening a public issue.

Use GitHub's private vulnerability reporting / security advisory flow if it is available for the repository. If private reporting is not available, contact the maintainer privately through the GitHub organization and avoid posting exploit details publicly.

A useful report includes:

- Affected package/version or commit SHA
- Reproduction steps
- Expected vs. actual behavior
- Impact assessment
- Whether sensitive data, credentials, local files, or external side effects are involved

## Security principles

- Local-first by default.
- No telemetry by default.
- No cloud sync in the open-source alpha.
- Do not store credentials in Action Cards, recorder events, screenshots, or examples.
- Redact secrets before recording events or generating Run Stories.
- Keep full private payloads out of Action Card `rawInput` when a preview or metadata is enough.
- Treat Action Cards, recorder JSONL, Run Stories, and screenshots as reviewable/disclosable surfaces.

## Sensitive data guidance

When integrating AgentClutch, avoid putting these into visible or recorded payloads unless absolutely necessary:

- API keys, OAuth tokens, session cookies, passwords, or SSH keys
- Full email/message bodies when a preview is enough
- Private file contents
- Full local filesystem paths when a relative or redacted path is enough
- Customer, patient, financial, or other regulated data

Prefer reviewable metadata and previews, such as:

- recipient + subject + `bodyPreview` instead of a full email body
- relative path + action summary instead of raw file contents
- endpoint + method + redacted parameters instead of full authenticated requests

## Dependency and release hygiene

- npm alpha packages are published under the `@agentclutch/*` scope.
- Prefer explicit `@alpha` installs until AgentClutch reaches a stable release.
- npm versions are immutable; bad alpha releases should be superseded by a new alpha patch and deprecated if necessary.
