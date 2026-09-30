# Conductor

Messaging orchestration server with a multi-tenant plugin architecture. It
routes notifications from Homey, Home Assistant or any HTTP client to Discord,
with more channels planned.

The repository is a [Turborepo](https://turborepo.com) monorepo managed with
pnpm. The hub application lives in `apps/`, and the standalone adapter packages
described in [ADR 0001](docs/adr/0001-directional-adapter-architecture.md) live
in `packages/`.

## Layout

| Path                      | Package                     | Contents                                                                                                                                              |
| ------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/conductor`          | `@eventuras/conductor`      | The hub: HTTP API, tenant authentication, plugin registry. See its [README](apps/conductor/README.md).                                                |
| `packages/conductor-core` | `@eventuras/conductor-core` | Shared contracts for adapters: sender and receiver interfaces, descriptors, logger shape, errors. See its [README](packages/conductor-core/README.md). |
| `packages/`               | `@eventuras/conductor-*`    | Adapter packages to come: `conductor-discord`, `conductor-mqtt` (ADR 0001 phases 2 and 3).                                                            |
| `docs/adr`                |                             | Architecture decision records.                                                                                                                        |

## Getting started

Requires Node 24 (see `.nvmrc`) and pnpm 11.

```bash
pnpm install
pnpm dev          # turbo run dev: starts apps/conductor with tsx watch
pnpm build        # turbo run build
pnpm typecheck    # turbo run typecheck
```

To run a script in a single package, filter on its name:

```bash
pnpm --filter @eventuras/conductor start
```

The hub reads its `.env` file and writes its runtime configuration to
`data/config/` relative to its own directory, so both live under
`apps/conductor/`. Copy `apps/conductor/.env.example` to
`apps/conductor/.env` to get started.

## Docker

The image is built from the repository root. The Dockerfile uses
`turbo prune` to reduce the workspace to the hub and the packages it depends
on before installing and building.

```bash
docker build -f apps/conductor/Dockerfile -t conductor:latest .
# or
docker compose up --build
```

Inside the container the hub keeps its configuration in `/app/data/config`;
mount a volume there to persist it.

## Releases

Package versions and changelogs are managed with
[changesets](https://github.com/changesets/changesets):

```bash
pnpm changeset            # record a change
pnpm changeset:version    # apply pending changesets and bump versions
```

Pushing a `v*` tag promotes the canary image built from `main` to a versioned
release image. See `.github/workflows/docker.yml`.

## License

MPL-2.0
