# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Contact the repository maintainers privately through the repository owner’s established support channel and include a concise reproduction path, affected commit, impact, and any suggested mitigation. The maintainers should acknowledge receipt within five business days, triage the report, coordinate a fix, and agree a disclosure timeline with the reporter.

## Alert ownership

Repository maintainers own the first review of dependency, code-scanning, and secret-scanning alerts. Critical or high-severity alerts require triage within one business day; medium alerts within five business days; and lower-severity alerts within the next scheduled maintenance cycle. Every closed alert should link to a remediation commit, an accepted-risk decision, or a documented false-positive rationale.

## Release safeguard

No release may bypass a known critical vulnerability, a confirmed exposed secret, or a failure in the required verification workflow without a time-bounded, documented exception approved by the repository owner.
