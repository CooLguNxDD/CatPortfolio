#!/bin/sh
# Writes config.json from env vars at container start (not build time), so the
# /mcp API key never touches git or the built image layers — only the running
# container's environment (see .env, docker-compose.yml OCT_BASE_URL/OCT_API_KEY).
set -eu

CONFIG_PATH="/usr/share/nginx/html/config.json"
OCT_BASE_URL="${OCT_BASE_URL:-}"
OCT_API_KEY="${OCT_API_KEY:-}"

cat > "$CONFIG_PATH" <<EOF
{
  "octBaseUrl": "${OCT_BASE_URL}",
  "mcpApiKey": "${OCT_API_KEY}"
}
EOF

exec "$@"
