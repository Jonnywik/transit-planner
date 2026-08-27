# Sprint 0 Deployment Security Checklist

## Static delivery boundary

The production Node server now serves only the repository’s `public/` directory. Browser assets reside in that directory; application server code, test fixtures, documentation, Git metadata, package manifests, and environment files are outside the static root. Hidden path components and any path outside the public root return `404`; unsupported static methods return `405`.

Before a deployment, run the following locally or in the deployment validation job:

```bash
npm test
npm run check
npm run coverage
npm run smoke:mobile
```

The HTTP integration suite verifies that `.git/config`, source files, package metadata, test code, documentation, and missing paths are not publicly served.

## Browser and transport controls

The server sends an explicit content-security policy that prevents embedding through `frame-ancestors 'none'`, blocks plugins through `object-src 'none'`, restricts base URLs and form destinations to the local origin, and limits scripts, styles, maps, and images to the identified sources. `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a strict referrer policy are also sent.

TLS and `Strict-Transport-Security` must be configured by the production HTTPS terminator or hosting platform. The production operator must record the responsible platform and confirm that all HTTP requests redirect to HTTPS before the service becomes publicly reachable.

## Supply-chain controls

Dependabot checks npm and GitHub Actions dependencies weekly. CodeQL scans JavaScript on pull requests, pushes to `main`, manual runs, and a weekly schedule. The project verification workflow pins its used actions to immutable SHAs. Repository maintainers own triage according to [`SECURITY.md`](../SECURITY.md).

> Repository settings remain an administrative responsibility: enable Dependabot alerts and security updates, code scanning, secret scanning, and push protection in the GitHub security settings. The workflow files activate checks, but account or organization policy can still disable platform features.
