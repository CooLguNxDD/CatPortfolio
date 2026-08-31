#!/bin/sh
# Container start script — runs before nginx launches.
#
# What it does:
#   1. Writes public/config.json with non-secret runtime values (octBaseUrl,
#      askTimeoutMs).  mcpApiKey is intentionally omitted — the SPA ignores
#      that field even if planted in config.json. nginx injects Authorization
#      on the /mcp proxy, so the key never travels to the browser.
#   2. Templates nginx.conf via envsubst, substituting ${OCT_API_KEY} into
#      the upstream Authorization header — the only place the key lives at
#      runtime is inside the nginx worker process.
#
# See nginx.conf (proxy_set_header Authorization) and .env.example.
set -eu

# Runtime config lives in nginx's cache dir (chowned to `nginx` in the
# image). The static web root stays root-owned/read-only; writing
# /usr/share/nginx/html/config.json as USER nginx crash-loops the
# container the moment that file's writable-layer copy is not owned
# by uid 101 (Docker Desktop + a stale container layer is enough).
CONFIG_PATH="/var/cache/nginx/config.json"
NGINX_TEMPLATE="/etc/nginx/conf.d/default.conf.template"
NGINX_CONF="/etc/nginx/conf.d/default.conf"

OCT_BASE_URL="${OCT_BASE_URL:-}"
OCT_API_KEY="${OCT_API_KEY:-}"
# Idle timeout (ms) for Andrew's AI run_graph; keepalives reset it. Default 10 min.
OCT_ASK_TIMEOUT_MS="${OCT_ASK_TIMEOUT_MS:-600000}"

# ── 1. Write non-secret runtime config ────────────────────────────────────────
# octBaseUrl is intentionally omitted — in Docker, resolveOctBaseUrl("") maps to
# window.location.origin so the browser uses same-origin /api/ and /mcp paths,
# which nginx proxies to the real backend. The backend URL never reaches the browser.
cat > "$CONFIG_PATH" <<EOF
{
  "askTimeoutMs": ${OCT_ASK_TIMEOUT_MS}
}
EOF

# ── 2. Bake OCT_BASE_URL + OCT_API_KEY into nginx config (server-side only) ───
# envsubst substitutes both placeholders; the result is the live nginx config
# that proxies /api/ and /mcp to the real backend and injects Authorization.
export OCT_BASE_URL OCT_API_KEY
envsubst '${OCT_BASE_URL}${OCT_API_KEY}' < "$NGINX_TEMPLATE" > "$NGINX_CONF"

exec "$@"
