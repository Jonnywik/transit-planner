# CI and Pull-Request Verification

## Automated verification

The repository uses the **Verify pull requests** GitHub Actions workflow at `.github/workflows/quality.yml`. It runs automatically for pull requests targeting `main`, direct pushes to `main`, and manually dispatched verification runs. Newer runs for the same pull request or branch cancel older in-progress runs, so review status reflects the latest commit.

| Job | What it verifies | Command |
|---|---|---|
| `Tests, coverage, and syntax` | Native Node test suite with measured coverage | `npm run coverage` |
| `Tests, coverage, and syntax` | JavaScript syntax for runtime modules | `npm run check` |

The workflow has read-only repository permissions, uses Node.js 22, applies a five-minute timeout, and treats unhandled promise rejections as failures.

## Enforcing the check on pull requests

The repository currently has no `main` branch protection rule. To make CI a merge gate, a repository administrator should open **Settings → Branches → Add branch protection rule**, target `main`, enable **Require a pull request before merging** and **Require status checks to pass before merging**, then select the check named **Tests, coverage, and syntax** after the first workflow run completes. Administrators may also enable review approvals and disable branch-force pushes according to the team’s delivery policy.

> The workflow reports verification status automatically. Branch protection is the separate repository setting that prevents a failing or missing check from being bypassed during a merge.

## Local parity

Before opening a pull request, run the same checks locally:

```bash
npm run coverage
npm run check
```

The workflow intentionally does not deploy the application. Deployment should remain a separate, explicitly approved release process after the verification check is green.
