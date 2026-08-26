# Security and Dependency Vulnerability Audit

**Audit date:** 27 August 2026
**Repository:** `Jonnywik/transit-planner`
**Reviewed baseline:** `afe2d23` on `main`, plus the uncommitted audit checklist
**Assessment type:** Authenticated, defensive source, configuration, dependency, and local HTTP verification review

## Executive summary

The audit verified **one high-severity exposure**, two medium-severity application or availability risks, and four defense-in-depth gaps. The highest priority is to stop serving the repository root: the supplied Node server returned `200` for `.git/config`, `.env.example`, `package.json`, and test fixtures during a local HTTP check. If the same server is deployed with the repository as its static root, an ignored future `.env` file and Git metadata could be exposed publicly.

The project currently has **no declared or installed npm dependencies**, so no dependency vulnerability was identified from the direct package tree. However, `npm audit` could not produce an advisory result because there is no lockfile, and GitHub Dependabot alerts are disabled. The repository should not treat this as a clean continuous dependency-monitoring result.

| Severity | Verified findings | Primary action |
|---|---:|---|
| High | 1 | Separate public assets from the repository root and block dotfiles. |
| Medium | 2 | Eliminate untrusted HTML rendering; bound and allowlist outbound provider traffic. |
| Low / defense in depth | 4 | Pin automation and browser assets, enable monitoring, and complete HTTP hardening. |

## Scope and method

The review covered tracked history, runtime JavaScript, HTTP response behavior, npm metadata, GitHub Actions, GitHub repository security settings, and local hostile-path probes. The local checks confirmed that encoded traversal probes returned `404`; they did **not** attempt to retrieve any sensitive content. Credential checks looked for common signature classes in the reachable six-commit history without recording raw values.

| Area | Evidence collected | Result or limitation |
|---|---|---|
| Dependency tree | `npm ls --all` | Empty declared and installed tree. |
| npm advisory audit | `npm audit --json` | Not runnable: npm returned `ENOLOCK` because no lockfile exists. |
| Secret indicators | Tracked files and reachable-history signature scan | No common AWS, GitHub, Google API-key, or private-key marker was found. This is not equivalent to a full secret-scanner result. |
| GitHub security settings | Authenticated repository metadata and alert endpoint checks | Secret scanning and push protection are enabled; Dependabot security updates are disabled. Dependabot alerts are disabled. Code-scanning and secret-alert APIs were not accessible through the integration, so alert state could not be independently verified. |
| Static-server boundary | Local HTTP probes | Encoded traversal requests returned `404`; repository metadata and non-public source files were reachable with `200`. |

## Verified findings

### SA-01 — Repository root is exposed by the static server

**Severity: High**

`server.js` resolves its static root to the repository directory and serves any existing path beneath it. Local requests to `/.env.example`, `/package.json`, `/test/fixtures/otp-plan-connection.json`, and `/.git/config` each received `200`. Although the tracked `.env.example` contains only examples, the server would also expose a future ignored `.env` file placed beneath the same root. Exposing `.git` can disclose repository metadata and make history or deployment details easier to recover.

**Required remediation.** Create a dedicated `public/` directory containing only browser-deliverable assets, point the static server exclusively at that directory, and explicitly reject path components beginning with `.`. Add integration tests that require `404` for `.git`, `.env`, `package.json`, `test/`, and `docs/`. Treat any secret that may previously have been present in a served `.env` file as potentially exposed and rotate it.

### SA-02 — Upstream transit labels reach a Leaflet HTML sink without encoding

**Severity: Medium**

`app.js` uses `bindPopup(\`Transfer: ${leg.from.name}\`)` for transfer markers. `leg.from.name` originates in the OpenTripPlanner response and is not encoded at this sink. The application has an `escapeHtml` helper and safely escapes several other route fields, but this popup path bypasses it. Exploitation requires a malicious or compromised routing-data source, but external data should still be treated as untrusted.

**Required remediation.** Pass Leaflet a DOM node whose `textContent` is set to the label, or apply context-appropriate encoding before calling `bindPopup`. Add a regression test with HTML-bearing provider data. OWASP recommends treating variables rendered into the UI as untrusted and preferring safe sinks such as `textContent` over `innerHTML`-style rendering.[5]

### SA-03 — Outbound provider calls have no deadline or deployment allowlist

**Severity: Medium**

Both `GEOCODER_BASE_URL` and `OTP_GRAPHQL_URL` control server-side fetch destinations. These values are deployment configuration rather than request parameters, so this is **not a user-driven SSRF finding**. It remains a material hardening gap: a configuration mistake or compromised deployment secret can direct the service toward an unintended host, and neither provider fetch applies an abort deadline. Public route requests can therefore accumulate against a slow or unavailable upstream; the geocoder queues requests but the routing provider has no comparable admission or rate control.

**Required remediation.** Require `https:`, allowlist approved hostnames, reject redirects, enforce an `AbortSignal.timeout`, and apply egress firewall rules so the runtime can reach only approved provider endpoints. Add an IP- and route-level rate limit plus bounded concurrency for route planning. OWASP recommends allowlisting trusted destinations and applying network-layer controls when an application makes server-side requests.[6]

### SA-04 — Action and browser CDN references are tag/version based rather than immutable

**Severity: Low**

The CI workflow uses `actions/checkout@v4` and `actions/setup-node@v4`; the browser loads Leaflet from `unpkg.com` without Subresource Integrity. The workflow already uses read-only permissions, avoids privileged pull-request triggers, and has no repository secrets in scope, which lowers impact. Nevertheless, tags are mutable references and external asset availability or integrity remains outside this repository’s control.

**Required remediation.** Pin GitHub Actions to verified full commit SHAs and annotate the original release tag in comments. Vendor Leaflet or use a trusted asset pipeline; if retaining the CDN, add verified SRI hashes for the CSS and JavaScript. GitHub states that a full-length commit SHA is the only immutable way to reference an action.[1]

### SA-05 — Continuous dependency and code-security monitoring is incomplete

**Severity: Low**

Repository metadata reports that Dependabot security updates are disabled, and the Dependabot-alert endpoint confirms alerts are disabled. Secret scanning and push protection are enabled, which is a positive control. The audit integration could not query code-scanning or secret-alert records, so the absence of accessible alerts is not evidence that no alerts exist.

**Required remediation.** Enable Dependabot alerts and security updates, add a `dependabot.yml` for npm and GitHub Actions, and enable CodeQL/default code scanning. Keep secret scanning and push protection enabled, and review alert access for maintainers. Dependabot evaluates the default branch and dependency-graph changes when enabled; GitHub documents both Dependabot and code scanning as mechanisms for identifying vulnerable dependencies and code defects.[2] [4]

### SA-06 — Dependency inventory is not reproducibly auditable

**Severity: Low**

`package.json` declares no dependencies and `npm ls --all` is empty, so there is no direct npm vulnerability to report. However, the absence of `package-lock.json` prevents `npm audit` from building its required dependency inventory. This becomes a material supply-chain gap as soon as a dependency is added.

**Required remediation.** When the first dependency is introduced, commit the generated lockfile, use `npm ci` in CI, and retain `npm audit` as a non-blocking advisory or controlled gate after triage. Do not create a lockfile solely to make the current empty dependency tree auditable.

### SA-07 — Browser and transport hardening is incomplete

**Severity: Low**

The server correctly sets `Content-Security-Policy`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store` for API JSON. The CSP still permits `'unsafe-inline'` styles and does not set `frame-ancestors`; the server also does not send `X-Frame-Options`. HSTS is absent, though it should normally be configured at the HTTPS reverse proxy or CDN rather than blindly emitted by a local development server.

**Required remediation.** Add `frame-ancestors 'none'` (or an approved allowlist) to CSP and `X-Frame-Options: DENY` as legacy defense. Remove `'unsafe-inline'` styles where Leaflet and the UI can support it; configure HSTS at the TLS terminator after confirming an HTTPS-only deployment. CSP is a useful additional layer, but OWASP cautions that it should not replace safe output handling.[5]

## Positive controls observed

The application bounds geocoding query length and coordinate ranges, uses a same-origin API boundary, limits request bodies to 16 KiB, does not set permissive CORS headers, returns generic unexpected-service errors, and uses read-only GitHub Actions permissions. The local encoded traversal probes returned `404`. The reachable six-commit history did not match the common credential signatures used in this audit, and GitHub secret-scanning push protection is enabled. GitHub describes secret scanning as scanning committed history and branches for known credential types, but the exact alert state was not available to this audit integration.[3]

## Remediation order

| Priority | Work item | Owner | Acceptance criterion |
|---|---|---|---|
| P0 | Serve only a dedicated public asset directory and deny dotfiles/source paths. | Application owner | HTTP integration tests confirm `404` for `.git`, `.env`, tests, docs, and manifests. |
| P1 | Replace the Leaflet transfer-popup string sink with safe text rendering. | Front-end owner | A hostile provider label renders as text and cannot create markup. |
| P1 | Harden provider egress with HTTPS/host allowlists, no redirects, timeouts, concurrency limits, and firewall controls. | Platform owner | Configuration validation and timeout tests pass; non-allowlisted host is rejected. |
| P2 | Pin Actions and external assets; enable Dependabot and CodeQL. | Repository administrator | Workflow actions use SHAs; security features produce visible alerts/checks. |
| P3 | Complete clickjacking/HSTS controls and add a lockfile when dependencies are introduced. | Platform owner | Header tests and CI dependency-inventory policy are documented. |

## References

[1]: https://docs.github.com/en/actions/reference/security/secure-use "GitHub Secure Use Reference"
[2]: https://docs.github.com/code-security/dependabot/dependabot-alerts/about-dependabot-alerts "GitHub Dependabot Alerts"
[3]: https://docs.github.com/code-security/secret-scanning/about-secret-scanning "GitHub Secret Scanning"
[4]: https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning "GitHub Code Scanning"
[5]: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html "OWASP Cross Site Scripting Prevention Cheat Sheet"
[6]: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html "OWASP Server Side Request Forgery Prevention Cheat Sheet"
