# @eventuras/conductor-core

The contracts every Conductor adapter is built on. It holds no transport code:
a few interfaces, a descriptor helper, the logger shape adapters write to, and
the error classes they throw.

Adapter packages such as `@eventuras/conductor-discord` depend on it. The
Conductor hub depends on it to validate configuration and create senders. An
application that only wants to send a message with one adapter can use that
adapter directly and never see this package beyond its types.

## Contracts

**`ConductorSender`** delivers messages: `initialize()`, `send(message)`,
`healthCheck()`, `shutdown()`, plus `type`, `version` and `status`. A sender is
configured with concrete values (a bot token, a channel id) and knows nothing
about tenants, secrets or the hub.

**`ConductorReceiver`** listens for messages: `initialize()`,
`onMessage(handler)`, `shutdown()`. Defined now for transports that are
naturally two-way; no receiver ships yet.

**`SendMessage`** is what a sender takes: `content`, an optional `priority`
(`'normal'` or `'high'`), an optional `targetId` (a channel id, a topic) and
free-form `metadata` that senders may log but never act on. **`SendResponse`**
reports `success`, an optional provider `messageId` and an `error` text.

**`ConductorLogger`** is the logger adapters write to. Each method takes a
message, or log data followed by a message. An `@eventuras/logger` instance has
this shape, so the hub passes its own logger through. `noopLogger` is the
default; `createConsoleLogger(namespace)` is there for scripts.

## Describing a sender

A package exports a factory for direct use and a descriptor for hosts:

```ts
import { defineSender } from '@eventuras/conductor-core';
import { z } from 'zod';

export function createDiscordSender(options: {
  config: DiscordConfig;
  logger?: ConductorLogger;
}): ConductorSender {
  /* ... */
}

export const discordSender = defineSender({
  type: 'discord',
  configSchema: z.object({
    botToken: z.string().min(1),
    defaultChannelId: z.string().optional(),
  }),
  create: (config, { logger }) => createDiscordSender({ config, logger }),
});
```

`defineSender` only helps inference: `config` in `create` is typed from the
schema. A host validates and creates in one step:

```ts
import { createSender } from '@eventuras/conductor-core';

const sender = createSender(discordSender, resolvedConfig, { logger });
await sender.initialize();
await sender.send({ content: 'Motion detected', priority: 'high' });
```

`createSender` throws `ConfigurationError` when the config does not match the
schema. The error lists every problem in `issues`, each with a dotted `path`.

## Errors

- `ConductorError`: base class with a stable `code`.
- `ConfigurationError` (`CONFIGURATION`): config did not match an adapter's schema.
- `NotReadyError` (`NOT_READY`): an operation needed a ready adapter.

## Building

```bash
pnpm --filter @eventuras/conductor-core build      # vite build + declarations
pnpm --filter @eventuras/conductor-core test
```

`zod` is a peer dependency: the descriptor's `configSchema` is a Zod schema,
and adapters bring their own Zod to write it.
