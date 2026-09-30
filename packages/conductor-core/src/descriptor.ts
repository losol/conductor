import type { z } from 'zod';
import { ConfigurationError } from './errors.js';
import { type ConductorLogger, noopLogger } from './logger.js';
import type { ConductorSender } from './sender.js';

/**
 * What an adapter gets from whoever creates it, besides its configuration.
 */
export interface AdapterContext {
  logger: ConductorLogger;
}

/**
 * Describes a sender so that something else, typically the Conductor hub, can
 * create instances of it from configuration it has resolved.
 *
 * The descriptor is the whole plugin contract. A package exports one next to
 * its factory function; the hub registers it and calls `create` with
 * validated config. Nothing in it refers to tenants, secrets or environment
 * variables, so the package stays usable on its own.
 */
export interface SenderDescriptor<TConfig> {
  /** Identifies the transport in configuration, e.g. `'discord'`. */
  readonly type: string;

  /**
   * Validates the configuration `create` needs. Owned by the adapter, so the
   * hub can validate at startup without knowing what the fields mean.
   */
  readonly configSchema: z.ZodType<TConfig>;

  /** Builds a sender from validated configuration. Does not connect. */
  create(config: TConfig, context: AdapterContext): ConductorSender;
}

/**
 * Identity helper that lets TypeScript infer `TConfig` from the schema:
 *
 * ```ts
 * export const discordSender = defineSender({
 *   type: 'discord',
 *   configSchema: z.object({ botToken: z.string(), defaultChannelId: z.string().optional() }),
 *   create: (config, { logger }) => createDiscordSender({ config, logger }),
 * });
 * ```
 */
export function defineSender<TConfig>(
  descriptor: SenderDescriptor<TConfig>,
): SenderDescriptor<TConfig> {
  return descriptor;
}

/**
 * Validates `config` against the descriptor's schema and creates the sender.
 * Throws {@link ConfigurationError} when the config does not match.
 *
 * This is what a hub calls once it has resolved secrets into plain values.
 */
export function createSender<TConfig>(
  descriptor: SenderDescriptor<TConfig>,
  config: unknown,
  context: Partial<AdapterContext> = {},
): ConductorSender {
  const result = descriptor.configSchema.safeParse(config);

  if (!result.success) {
    throw new ConfigurationError(
      descriptor.type,
      result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    );
  }

  return descriptor.create(result.data, {
    logger: context.logger ?? noopLogger,
  });
}
