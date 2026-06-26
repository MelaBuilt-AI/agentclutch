# Security Policy

AgentClutch is a user-control layer for consequential AI agent actions. It may process sensitive action metadata such as page titles, selectors, field values, URLs, tool names, proposed messages, local run records, Run Stories, and screenshots.

## Supported versions

AgentClutch is currently alpha software. Security fixes target the latest public alpha release and the `main` branch.

| Version | Supported |
| --- | --- |
| `0.7.3-alpha.x` | Yes |
| older alpha tags | Best effort |

## Reporting a vulnerability

Please report security issues privately before opening a public issue.

Private vulnerability reporting is enabled for this repository. Preferred path:

<https://github.com/MelaBuilt-AI/agentclutch/security/advisories/new>

Do not open a public issue with exploit details, credentials, private payloads, screenshots containing secrets, or reproduction data that affects a real account. If GitHub private vulnerability reporting is unavailable for your account, contact the maintainer privately through the GitHub organization and avoid posting exploit details publicly.

A useful report includes:

- Affected package/version or commit SHA
- Reproduction steps
- Expected vs. actual behavior
- Impact assessment
- Whether sensitive data, credentials, local files, browser state, or external side effects are involved
- Redacted sample Action Card / recorder / Run Story data when relevant

## Security principles

- Local-first by default.
- No telemetry by default.
- No cloud sync in the open-source alpha.
- Do not store credentials in Action Cards, recorder events, screenshots, examples, or Run Stories.
- Redact secrets before recording events or generating Run Stories.
- Keep full private payloads out of Action Card `rawInput` when a preview or metadata is enough.
- Treat Action Cards, recorder JSONL, Run Stories, and screenshots as reviewable/disclosable surfaces.
- Do not bypass native browser, OS, enterprise, legal, compliance, payment, or security confirmation prompts.

## Sensitive data guidance

When integrating AgentClutch, avoid putting these into visible or recorded payloads unless absolutely necessary:

- API keys, OAuth tokens, session cookies, passwords, recovery codes, or SSH keys
- Full email/message bodies when a preview is enough
- Private file contents
- Full local filesystem paths when a relative or redacted path is enough
- Customer, patient, financial, or other regulated data
- Authentication headers, signed URLs, webhook secrets, or raw request/response bodies from authenticated systems

Prefer reviewable metadata and previews, such as:

- recipient + subject + `bodyPreview` instead of a full email body
- relative path + action summary instead of raw file contents
- endpoint + method + redacted parameters instead of full authenticated requests
- screenshot crops or synthetic demo screenshots instead of full desktops with private context

## Recorder, Run Story, and screenshot guidance

- Recorder JSONL is local, but it can still include sensitive fields supplied by the host app.
- Run Stories should be treated as summaries of side-effect decisions and reviewed before sharing.
- Demo screenshots and GIFs should use fake data or redacted fixtures.
- If an example needs realistic-looking data, use synthetic accounts and generated values.

## Dependency and release hygiene

- npm alpha packages are published under the `@agentclutch/*` scope.
- Prefer explicit `@alpha` installs until AgentClutch reaches a stable release.
- npm versions are immutable; bad alpha releases should be superseded by a new alpha patch and deprecated if necessary.
