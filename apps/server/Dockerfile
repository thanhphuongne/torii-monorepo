FROM node:20-slim AS builder

WORKDIR /app

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install Build Dependencies (openssl for Prisma + python3 for edge-tts)
RUN apt-get update -y && apt-get install -y openssl python3 python3-pip python3-venv ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package definitions
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/protocol/package.json ./packages/protocol/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY packages/schemas ./packages/schemas
COPY packages/protocol ./packages/protocol
COPY packages/eslint-config ./packages/eslint-config
COPY packages/typescript-config ./packages/typescript-config
COPY apps/server ./apps/server
COPY apps/server/config ./apps/server/config

# Build Protocol (Generate first because src/gen is ignored)
WORKDIR /app/packages/protocol
RUN pnpm run generate
RUN pnpm run build

# Build Schemas
WORKDIR /app/packages/schemas
RUN pnpm run build

# Build Server Apps
WORKDIR /app/apps/server
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate
RUN npx nest build meet

# --- Runner Stage ---
FROM node:20-slim AS runner

WORKDIR /app

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install Runtime Dependencies:
# - openssl: Prisma
# - python3 / venv: edge-tts
# - mupdf-tools: `mutool` for PDF→PNG whiteboard office conversion (FileService.convertWhiteboardFile)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    python3 python3-pip python3-venv \
    mupdf-tools \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create Python venv with edge-tts at the path expected by tts.service.ts
# tts.service.ts resolves: path.join(process.cwd(), '.venv/bin/edge-tts')
# process.cwd() in container = /app/apps/server
RUN python3 -m venv /app/apps/server/.venv && \
    /app/apps/server/.venv/bin/pip install --no-cache-dir edge-tts

# Copy production dependencies (using node_modules from builder for simplicity)
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace packages which might be symlinked
COPY --from=builder /app/packages ./packages

# Copy Server artifacts
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/config ./apps/server/config

# Set working directory to server app
WORKDIR /app/apps/server

# Default command (overridden in docker-compose)
CMD ["node"]
