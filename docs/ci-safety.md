# CI public-safety checks

The session/deployment owner applies this snippet; `.github/**` is protected during
fleet implementation. Do not modify the deployment workflow for these checks.

## Where to put it

The existing `.github/workflows/ci.yml` runs on pull requests to `main`. Its `verify`
job already checks layout sync, lint, tests, browser tests and the production build.
Add the following **sibling job under its existing `jobs:` key**, alongside `verify`.
Do not replace the existing job or triggers. This intentionally builds separately so
the safety scan checks this job's fresh `dist/`, never an absent or stale artifact.

```yaml
  public-safety:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Scan Git history for secrets
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_ENABLE_COMMENTS: "false"
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Scan tracked source and production output
        run: node scripts/check-public-safety.mjs
```

`contents: read` allows checkout/history access; `pull-requests: read` allows the
secret-scanning action to inspect pull-request metadata. Comments are disabled, so
no write permission or privileged pull-request trigger is needed. Keep using
`pull_request`, not `pull_request_target` for building untrusted PR code. Full history
(`fetch-depth: 0`) is required for the gitleaks commit-range scan. The action uses the
automatically supplied `GITHUB_TOKEN`; never paste a token into the workflow. If the
repository is moved to an organization that requires a Gitleaks action license,
configure that separately as an Actions secret according to the action's documentation.

The Node scanner checks all tracked authored text (including `cloudflare-worker/**`)
and the fresh production `dist/`. It rejects addresses, unapproved hostnames,
endpoint literals and common secret shapes. Findings contain only `path:line: rule`,
not matched values. Its reviewed public-host, dev-origin and vendor exclusions are
commented in `scripts/check-public-safety.mjs`; do not bypass a finding with a broad
path exclusion. Gitleaks complements this with history/secret detection.

No `.gitleaks.toml` allowlist is needed for the current unit fixtures: synthetic
values are assembled at runtime rather than stored as key-shaped literals. If a
future fixture produces a false positive, review it first and prefer constructing
it at runtime; any necessary allowlist must identify the exact fixture and reason,
not exclude the Worker tree or general application code.

## Run locally

Install the standalone Gitleaks CLI using its official release/package instructions,
then run from the repository root with history available:

```bash
gitleaks detect --source . --no-banner
npm ci
npm run build
node scripts/check-public-safety.mjs
```

The CLI command scans local Git history; the action selects the relevant CI commit
range. Inspect findings privately, remove/rotate exposed credentials and resolve
false positives narrowly. Do not paste discovered secret values into issues or logs.
For focused current-source scans, use `node scripts/check-public-safety.mjs --files
<path>...`; the CI command deliberately omits `--files` to include both tracked text
and `dist/`.
