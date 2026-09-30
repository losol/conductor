# Dockerfile for Conductor (Webhook Gateway & Message Router)
#
# Build from the repository root. The context must be the whole monorepo:
# the pruner stage runs `turbo prune` on it.
#   docker build -f apps/conductor/Dockerfile -t conductor:latest .
#
# Run with configuration:
#   docker run -v /path/to/config:/app/data/config -p 3333:3333 conductor:latest

##################
# Stage 1: Base  #
##################
FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
# pnpm 11 puts global binaries in $PNPM_HOME/bin; the pruner stage installs turbo there.
ENV PATH="$PNPM_HOME/bin:$PNPM_HOME:$PATH"

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

##################
# Stage 2: Prune #
##################
# Cut the monorepo down to @eventuras/conductor and the workspace packages it
# depends on. The later stages only see, and only cache on, files that matter
# to this app.
FROM base AS pruner

RUN pnpm add -g turbo@2
COPY . .
RUN turbo prune @eventuras/conductor --docker

###########################
# Stage 3: Build          #
###########################
FROM base AS builder

# Manifests and lockfile first, so the dependency layer survives source-only
# changes.
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@eventuras/conductor...

###########################
# Stage 4: Runtime deps   #
###########################
# A separate install rather than pruning the builder's tree: the build output
# externalizes every dependency, so the runtime needs exactly the production set.
FROM base AS prod-deps

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --prod --frozen-lockfile

##########################
# Stage 5: Production    #
##########################
FROM base AS production

RUN groupadd -r conductor && useradd -r -g conductor conductor

# pnpm links apps/conductor/node_modules into the root virtual store with
# relative symlinks, so both trees must land at the same relative positions.
COPY --from=prod-deps --chown=conductor:conductor --chmod=555 /app/node_modules ./node_modules
COPY --from=prod-deps --chown=conductor:conductor --chmod=555 /app/apps/conductor/node_modules ./apps/conductor/node_modules
COPY --from=builder --chown=conductor:conductor --chmod=555 /app/apps/conductor/dist ./apps/conductor/dist
COPY --chown=conductor:conductor --chmod=444 apps/conductor/package.json ./apps/conductor/package.json

# The app resolves its config as `process.cwd()/data/config` — see
# apps/conductor/src/config/initializer.ts. WORKDIR stays /app, so the path is
# /app/data/config as it was before the monorepo split and existing volume
# mounts keep working. docker-compose mounts a volume over it; without one, the
# container initializes its own config files here on first start.
RUN mkdir -p /app/data/config && chown -R conductor:conductor /app/data/config

USER conductor

ENV NODE_ENV=production \
    PORT=3333

EXPOSE 3333

# `/` is the endpoint the auth middleware exempts and calls the health check;
# /health is behind auth and does not exist, so probing it always returned 401.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3333/ || exit 1

CMD ["node", "apps/conductor/dist/index.js"]
