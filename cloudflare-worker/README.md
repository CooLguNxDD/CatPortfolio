# CatPortfolio Cloudflare Worker Proxy

Edge reverse proxy for [CatPortfolio](https://coolgunxdd.github.io/CatPortfolio/) that keeps your backend API key (`OCT_API_KEY`) secure at the edge.

## Architecture

```
[Browser / GitHub Pages]
        │
        │ (no API key sent)
        ▼
[Cloudflare Worker]  <── Holds OCT_API_KEY in Cloudflare encrypted secrets
        │
        │ Injects: Authorization: Bearer <OCT_API_KEY>
        ▼
[Whiskers Agent Backend] (https://whiskers-agent.17655155.xyz)
```

## Setup & Deployment

### 1. Login to Cloudflare via Wrangler (one-time)
```bash
npx wrangler login
```

### 2. Set the Backend Secret (`OCT_API_KEY`)
Run the following from `CatPortfolio`:
```bash
npx wrangler secret put OCT_API_KEY --config cloudflare-worker/wrangler.jsonc
```
*(When prompted, paste your restricted Whiskers Agent / OCT API token).*

### 3. Deploy the Worker
```bash
npx wrangler deploy --config cloudflare-worker/wrangler.jsonc
```
Wrangler will output your public worker URL, for example:
`https://catportfolio-proxy.<your-subdomain>.workers.dev`

*(Optional)* You can attach a custom domain like `portfolio-gateway.17655155.xyz` in Cloudflare Dashboard: **Workers & Pages → catportfolio-proxy → Settings → Domains & Routes**.

### 4. Update CatPortfolio Deployment

In GitHub:
1. Go to **Repo Settings → Secrets and variables → Actions**.
2. Set **`OCT_BASE_URL`** to your worker URL (e.g. `https://portfolio-gateway.17655155.xyz` or `https://catportfolio-proxy.<subdomain>.workers.dev`).
3. Set **`OCT_API_KEY`** to empty or remove it.
4. Update `.github/workflows/deploy.yml` build step:
   ```yaml
   - name: Build
     run: npm run build
     env:
       VITE_OCT_URL: ${{ secrets.OCT_BASE_URL }}
       VITE_OCT_API_KEY: ""
   ```

Now, browser clients send zero API keys, and your backend credentials are never exposed in DevTools or bundled in JavaScript assets.
