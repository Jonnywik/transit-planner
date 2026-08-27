# CI and Pull-Request Verification

## Automated verification

The repository uses the **Verify pull requests** GitHub Actions workflow at `.github/workflows/quality.yml`. It runs automatically for pull requests targeting `main`, direct pushes to `main`, and manually dispatched verification runs. Newer runs for the same pull request or branch cancel older in-progress runs, so review status reflects the latest commit.

| Job | What it verifies | Command |
|---|---|---|
| `Tests, coverage, and syntax` | Native Node test suite with measured coverage | `npm run coverage` |
| `Tests, coverage, and syntax` | JavaScript syntax for runtime modules | `npm run check` |
| `Tests, coverage, and syntax` | A deterministic 390 × 844 mobile planning-shell screenshot and responsive-layout contract | `npm run smoke:mobile` |

The workflow has read-only repository permissions, uses Node.js 22, applies a five-minute timeout, and treats unhandled promise rejections as failures.

## Mobile visual smoke gate

The pull-request workflow now runs `npm run smoke:mobile`. It starts an isolated Sakay server, loads the real application at a **390 × 844** mobile viewport, confirms the map-led planning dock and primary controls are present, and saves `artifacts/visual-smoke/mobile-home.png` for the duration of the check. The script fails if the homepage or stylesheet cannot be served, the mobile sheet contract is missing, no Chromium-compatible browser is available, or the rendered screenshot is implausibly small.

The screenshot is intentionally excluded from version control because this is a deterministic smoke check, not an approved pixel-baseline comparison. The optional `npm run smoke:mobile:live` command is more comprehensive: it uses the configured local geocoding boundary to select real locations, exercises route cards and trip reversal in demo mode, and verifies the truthful unavailable-routing state outside demo mode. It is kept out of pull-request CI because it requires an approved external geocoding identity and network access.

## Enforcing the check on pull requests

The repository currently has no `main` branch protection rule. To make CI a merge gate, a repository administrator should open **Settings → Branches → Add branch protection rule**, target `main`, enable **Require a pull request before merging** and **Require status checks to pass before merging**, then select the check named **Tests, coverage, and syntax** after the first workflow run completes. Administrators may also enable review approvals and disable branch-force pushes according to the team’s delivery policy.

> The workflow reports verification status automatically. Branch protection is the separate repository setting that prevents a failing or missing check from being bypassed during a merge.

## Local parity

Before opening a pull request, run the same checks locally:

```bash
npm run coverage
npm run check
npm run smoke:mobile
npm run smoke:mobile:live # Requires a local server and GEOCODER_USER_AGENT
```

The workflow intentionally does not deploy the application. Deployment should remain a separate, explicitly approved release process after the verification check is green.
