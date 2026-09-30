# Dockerfile for Conductor (Webhook Gateway & Message Router)
#
# Build:
#   docker build -t conductor:latest .
#
# Run with configuration:
#   docker run -v /path/to/config:/data/config -p 3333:3333 conductor:latest

##################
# Stage 1: Base  #
##################
FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# wget is needed by the HEALTHCHECK below; the slim image does not carry it.
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@11.8.0 --activate \
    && pnpm config set store-dir /pnpm/store

WORKDIR /app

###########################
# Stage 2: Build          #
###########################
FROM base AS builder

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN pnpm run build

###########################
# Stage 3: Runtime deps   #
###########################
# A separate install rather than pruning the builder's tree: the build output
# externalizes every dependency, so the runtime needs exactly the production set.
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

##########################
# Stage 4: Production    #
##########################
FROM base AS production

RUN groupadd -r conductor && useradd -r -g conductor conductor

COPY --from=prod-deps --chown=conductor:conductor --chmod=555 /app/node_modules ./node_modules
COPY --from=builder --chown=conductor:conductor --chmod=555 /app/dist ./dist
COPY --chown=conductor:conductor --chmod=444 package.json ./package.json

# The app resolves its config as `process.cwd()/data/config` — see
# src/config/initializer.ts — so the directory must exist under /app and be
# writable by the runtime user. docker-compose mounts a volume over it; without
# one, the container initializes its own config files here on first start.
RUN mkdir -p /app/data/config && chown -R conductor:conductor /app/data/config

USER conductor

ENV NODE_ENV=production \
    PORT=3333

EXPOSE 3333

# `/` is the endpoint the auth middleware exempts and calls the health check;
# /health is behind auth and does not exist, so probing it always returned 401.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3333/ || exit 1

CMD ["node", "dist/index.js"]
