# syntax=docker/dockerfile:1
# Production image for Talerooms (Next.js standalone output).
# Debian "slim" base (not Alpine) so native deps — sharp, onnxruntime-node — get
# prebuilt glibc binaries instead of having to compile against musl.

# 1) Install dependencies against a clean lockfile.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) Build the app. Produces .next/standalone (a self-contained server) plus
#    .next/static. Uses the webpack builder (npm run build) because the Turbopack
#    builder mis-traces better-auth's unused SQLite dialects.
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Web Push public key — non-secret, but must be present at build time because
# Next inlines NEXT_PUBLIC_* into the client bundle. Passed via fly.toml [build.args].
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Minimal runtime: just Node + the standalone bundle, run as non-root.
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh
# Run as root so the entrypoint can fix the mounted Fly volume's root-owned
# lost+found directory each boot. Hardening note: drop back to the nextjs user
# once uploads move to object storage (see deployment.md).
EXPOSE 3000
CMD ["/app/docker-entrypoint.sh"]
