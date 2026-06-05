ARG PNPM_VERSION=10.4.1

FROM node:20-slim AS base

WORKDIR /app

# Enable pnpm with a pinned version from workspace packageManager
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

FROM base AS builder

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/voice-agent/package.json ./apps/voice-agent/

# Install dependencies for build with lockfile reproducibility
RUN pnpm install --frozen-lockfile --filter voice-agent...

# Copy source code and build
COPY apps/voice-agent ./apps/voice-agent
RUN pnpm --filter voice-agent run build

FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/voice-agent/package.json ./apps/voice-agent/

# Install production dependencies only for runtime image
RUN pnpm install --frozen-lockfile --prod --filter voice-agent...

FROM node:20-slim AS runner

# IMPORTANT: Required for @livekit/rtc-node native Rust binary on Google Cloud.
# The Rust binary uses system CA certs (unlike Node.js which bundles its own certs).
# Without this, the agent will fail with:
#   ConnectError: failed to retrieve region info (https://*.livekit.cloud/settings/regions)
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app/apps/voice-agent

# Copy runtime dependencies and built artifacts
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/apps/voice-agent/node_modules ./node_modules
COPY --from=builder /app/apps/voice-agent/dist ./dist
COPY --from=builder /app/apps/voice-agent/package.json ./

# Expose port (default 8082 as seen in server.ts)
EXPOSE 8082

# Default environment variables
ENV NODE_ENV=production
ENV PORT=8082

CMD ["node", "dist/server.js"]
