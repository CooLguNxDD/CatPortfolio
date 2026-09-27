# CatPortfolio release guide

Portfolio releases are named `meow-<semver>`. GitHub Pages updates when that GitHub Release is **published**.

Live site: https://coolgunxdd.github.io/CatPortfolio/

Deploy workflow: [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) (`name: release-deploy`).

## Names

| Place | Value | Example |
| --- | --- | --- |
| Git tag and GitHub Release | `meow-<semver>` | `meow-1.0.1` |
| `package.json` and `package-lock.json` `version` | semver only | `1.0.1` |

`meow-` is the portfolio release series. npm versions cannot carry that prefix, so the package version is the semver half of the tag. They stay in lockstep: tag `meow-1.0.1` means `"version": "1.0.1"`.

The workflow also deploys a pushed tag that matches `v*`. Portfolio cuts stay on `meow-*`. A `meow-*` tag push does not match `v*`, so it does not start a second deploy next to the Release event. Publishing the Release is the deploy.

## What publishing does

`gh release create` creates the tag on the chosen commit and publishes the Release. GitHub then runs `release-deploy`:

1. `npm ci` and `npm run build` on that commit.
2. `VITE_OCT_URL` comes from the Actions secret `OCT_BASE_URL` (the Cloudflare Worker origin). `VITE_OCT_API_KEY` is empty, so the key is not baked into the client bundle.
3. `dist/index.html` is copied to `dist/404.html` so Pages can serve client-side routes.
4. The artifact deploys to the `github-pages` environment.

A push to `main` does not deploy. This workflow builds the committed layout; it does not generate one.

The Cloudflare Worker ([`cloudflare-worker/README.md`](./cloudflare-worker/README.md)) is a separate deploy. Run `npm run worker:deploy` only when `cloudflare-worker/` changes. A Pages release leaves the worker as it is.

## Version bumps

- **Patch** (`meow-1.0.2`): fixes, copy, content, and other non-contract changes.
- **Minor** (`meow-1.1.0`): a visible feature, a new block type, or a new route.
- **Major** (`meow-2.0.0`): a breaking change to the layout contract or the public URL contract (base path, `?j=`, `?v=`, `?f=`).

The first published tag is `meow-1.0.1`. There is no `meow-1.0.0`.

## Cut a release

Ship from `main` only, after the version commit is merged. `main` requires the `verify` check.

1. Update local `main`:

   ```bash
   git checkout main
   git pull origin main
   ```

2. Start from a clean tree. Leave local model dumps and other untracked assets out of the commit.
3. Set the package version to the semver half of the tag (no git tag yet):

   ```bash
   npm version X.Y.Z --no-git-tag-version
   ```

4. Run the gate, in order, and stop at the first failure:

   ```bash
   npm run check:layout
   npm run lint
   npm run test
   npm run build
   ```

5. Commit on a branch and open a pull request into `main`. Wait until `verify` is green and the pull request is merged. Tag the merge commit, not the branch tip.
6. Write notes for what changed since the previous `meow-*` tag, the live URL, and whether the Cloudflare Worker also needs a deploy. For the first release, describe what the cut ships.
7. Publish. This creates `meow-X.Y.Z` on current `main` and starts the deploy:

   ```bash
   git checkout main
   git pull origin main
   gh release create meow-X.Y.Z --target main --title "meow-X.Y.Z" --notes-file path/to/notes.md
   ```

The `github-pages` environment only deploys refs on its allow list. That list must include the `main` branch plus the tag patterns `meow-*` and `v*`. A tag missing from the list fails the deploy job before any step runs (`Tag "…" is not allowed to deploy to github-pages`).

8. Watch `release-deploy` until it succeeds:

   ```bash
   gh run list --workflow=deploy.yml --limit 5
   gh run watch <run-id>
   ```

9. Confirm the site:
   - https://coolgunxdd.github.io/CatPortfolio/ loads the tank.
   - https://coolgunxdd.github.io/CatPortfolio/?v=text loads the text matrix.
   - Reloading `?v=text` still returns the app (the `404.html` fallback).

## Rebuild or roll back

Actions → **release-deploy** → **Run workflow**, and pick the ref. Use that to rebuild the current release without a new tag, or to put a previous cut back on Pages:

```bash
gh workflow run deploy.yml --ref meow-X.Y.Z
```

Check the run's SHA against that tag before treating the site as rolled back. The latest successful Pages deployment is the live site.

## Hotfix

Pages serves one deployment: the latest successful `release-deploy` run. The tag you publish is the tree that goes live.

When every commit on `main` since the previous tag belongs in this ship, patch on `main` and tag that merge commit.

When `main` has moved and those newer commits must stay off the live site:

1. Branch from the tag you are patching (`meow-1.0.1`), not from `main`.
2. Bump only the patch semver on that branch (`1.0.1` → `1.0.2`) and run the gate.
3. Publish the next tag from that hotfix commit (`gh release create meow-1.0.2 --target <hotfix-sha>`). That deploy contains the previous cut plus the fix.
4. Forward-port the same fix onto `main` with a pull request. Do not tag that merge commit as the hotfix. It contains everything that landed on `main` in between, and publishing it would put that whole tree on Pages. Leave `main`'s package version where it already is when it is already newer than the patch.

## Constraints

- Publish a GitHub Release for every `meow-*` cut. A tag push alone does not deploy.
- Edit `design/layout.yaml` and run `npm run compile:layout`. Leave `src/content/layout.json` generated.
- Leave the client API key empty. The Worker injects `Authorization`.
- Leave `.github/workflows/deploy.yml` alone during layout or content work.
- Leave a published `meow-*` tag where it is. Ship the next semver instead of moving the tag.
