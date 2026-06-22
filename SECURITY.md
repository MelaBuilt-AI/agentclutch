# Security Policy

AgentClutch is a user-control layer for consequential AI agent actions. It may process sensitive action metadata such as page titles, URLs, selectors, button text, field values, evidence summaries, proposed tool inputs, user decisions, and run events.

## Security Principles

- Local-first by default.
- No telemetry by default.
- No SaaS backend or cloud sync in the open-source MVP.
- Record only what is needed to explain and resume a proposed action.
- Do not store credentials.
- Do not bypass native browser, OS, identity, payment, or enterprise approval prompts.
- Do not treat an AgentClutch approval as legal, compliance, financial, or production authorization by itself.

## Approval Boundaries

AgentClutch approval means the user approved the proposed action in the host application context. It does not:

- Grant new permissions to the agent.
- Override OAuth, SSO, browser, OS, repository, deployment, or payment controls.
- Prove the action is legally or contractually authorized.
- Replace policy review for regulated workflows.

Host applications remain responsible for enforcing authorization, policy, rate limits, and downstream safety checks.

## Data Handling

The local recorder writes JSONL files under:

```text
.agentclutch/runs/<run_id>/events.jsonl
```

Recorded data may include:

- Action Cards
- Action proposals
- Loop events
- User decisions
- Resume contexts
- Run Story inputs

The repository does not enable remote telemetry or cloud upload by default.

## Secret Redaction Expectations

Developers integrating AgentClutch should redact secrets before creating Action Cards or recording events. Do not attach:

- Passwords
- API keys
- Access tokens
- Refresh tokens
- Session cookies
- Private keys
- Credit card numbers
- Social Security numbers
- Full unredacted email bodies unless explicitly intended
- Full DOM snapshots containing private user data

Recommended integration behavior:

- Replace sensitive values with `[REDACTED]`.
- Avoid recording password fields entirely.
- Prefer summaries over raw content for private messages.
- Hash or omit identifiers when the raw value is not needed for the user decision.

Future versions may add default redaction hooks, but current integrations should treat redaction as the caller's responsibility.

## Local-First Behavior

AgentClutch currently operates as local packages, local demo apps, local browser overlays, and local JSONL recording. If a host application uploads AgentClutch data elsewhere, that host application is responsible for user disclosure, access control, retention, and deletion.

## Reporting Vulnerabilities

Please report security issues privately through GitHub Security Advisories when available. Include:

- Affected package or app
- Reproduction steps
- Expected and actual impact
- Whether sensitive data can be exposed, modified, or executed without approval

Do not open public issues for vulnerabilities involving secrets, authorization bypass, or unsafe execution.
