# CatPortfolio Cloudflare Worker Proxy

Edge reverse proxy for [CatPortfolio](../README.md) that keeps the backend API key (`OCT_API_KEY`) at the edge, not in the browser bundle.

## Architecture

```text
[Browser / GitHub Pages]
        │ (no API key sent)
        ▼
[Cloudflare Worker at https://<gateway-host>]
        │ Holds OCT_API_KEY and UPSTREAM_HOST in Worker secrets/vars
        │ Injects: Authorization: Bearer <OCT_API_KEY>
        ▼
[Whiskers Agent Backend at https://<backend-host>]
```

These are placeholders, not deployment coordinates. Never commit the real backend host,
gateway host, account identifier or secret values.

## Setup & Deployment

Run these commands from the CatPortfolio root. Deployment and secret entry are manual
operator steps; do not put their values in tracked files.

### 1. Select the account and log in (one-time)

```bash
npx wrangler login
```

Wrangler uses the logged-in account, or `CLOUDFLARE_ACCOUNT_ID` supplied privately in
the shell/CI environment. There is no account identifier in `wrangler.jsonc`.

### 2. Set both Worker secrets

```bash
npx wrangler secret put UPSTREAM_HOST --config cloudflare-worker/wrangler.jsonc
npx wrangler secret put OCT_API_KEY --config cloudflare-worker/wrangler.jsonc
```

At the first prompt, enter only `<backend-host>` replaced with your backend's hostname:
no scheme, path, port or whitespace. At the second prompt, enter the restricted
Whiskers Agent / OCT API token. `UPSTREAM_HOST` may alternatively be a Worker dashboard
variable, but must never be a tracked Wrangler var or a source-code default.

**Before the next Worker deploy, set `UPSTREAM_HOST`.** Deploying without it is allowed,
but `/api` and `/mcp` requests return HTTP 500 by design, with
`{"error":"Worker misconfigured: UPSTREAM_HOST is not set"}`. Blank values behave the
same way. Invalid hostname values also return 500 without an upstream request.
Preflight OPTIONS and non-proxy 404 responses still work without the setting.
Gateway failures return a generic 502 body without upstream details.

### 3. Deploy the Worker

```bash
npx wrangler deploy --config cloudflare-worker/wrangler.jsonc
```

Wrangler outputs the public worker URL. Use that URL or attach the custom domain
`<gateway-host>` in **Workers & Pages → catportfolio-proxy → Settings → Domains & Routes**.

### 4. Update CatPortfolio Deployment

In GitHub:
1. Go to **Repo Settings → Secrets and variables → Actions**.
2. Set **`OCT_BASE_URL`** privately to `https://<gateway-host>` with your gateway hostname substituted.
3. Set **`OCT_API_KEY`** to empty or remove it from the frontend deployment secrets.
4. Have the deployment owner confirm the build uses the gateway URL and no browser key:
   ```yaml
   - name: Build
     run: npm run build
     env:
       VITE_OCT_URL: ${{ secrets.OCT_BASE_URL }}
       VITE_OCT_API_KEY: ""
   ```

Do not commit deployment values or change the protected deployment workflow as part
of Worker maintenance. The Worker strips browser-supplied Authorization and injects
only its own configured key. If `OCT_API_KEY` is unset, it forwards no Authorization.

## Local verification

```bash
npx vitest run cloudflare-worker
npm run lint
npm run build
node scripts/check-public-safety.mjs
```

The Node-environment tests stub fetch; they need no Worker runtime, credentials or
live upstream. The public safety scanner checks Worker source, config, tests and docs;
only the exact local development CORS origin in the Worker source is excepted.
See [CI safety integration](../docs/ci-safety.md) for the session-applied CI snippet.
