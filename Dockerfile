# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cache friendly)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Install nginx.conf as a template.  docker-entrypoint.sh runs envsubst to
# substitute ${OCT_API_KEY} and write the live default.conf at container start,
# so the key never appears in the image layers or any browser-visible resource.
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Shared security headers, `include`d from the server block and from every
# nested location that sets its own add_header (nginx doesn't inherit
# add_header into a child location once the child declares one).
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf

# Writes config.json (non-secret values only) and templates nginx.conf at start
# (see docker-entrypoint.sh) — OCT_API_KEY is injected by nginx, not the browser.
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Least privilege: web root stays root-owned/read-only. Runtime config.json
# is written by docker-entrypoint.sh into /var/cache/nginx (already nginx-
# writable) and aliased from nginx.conf — never into the static html tree.
# caches/logs/conf.d need write for nginx to run at all. PID file moves to
# /tmp (writable by any user) instead of /run/nginx.pid — nginx deletes its
# pid file on graceful stop and can't recreate one under root-owned /run as
# a non-root user, which crash-loops restarts. `pid` is a main-context-only
# directive already set in the base image's nginx.conf, so it's patched in
# place rather than duplicated via -g.
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    sed -i 's#pid \+/run/nginx.pid;#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/CatPortfolio/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
