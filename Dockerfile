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

# Writes config.json (non-secret values only) and templates nginx.conf at start
# (see docker-entrypoint.sh) — OCT_API_KEY is injected by nginx, not the browser.
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
