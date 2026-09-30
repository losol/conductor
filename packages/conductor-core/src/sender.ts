import type { SendMessage, SendResponse } from './message.js';

/**
 * Lifecycle state shared by senders and receivers.
 *
 * - `idle`: created, `initialize()` not called yet
 * - `initializing`: connecting, authenticating
 * - `ready`: can send or receive
 * - `error`: initialization failed or the connection was lost
 * - `stopped`: `shutdown()` completed
 */
export type AdapterStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'error'
  | 'stopped';

export type SenderStatus = AdapterStatus;

/**
 * Delivers messages somewhere: a Discord channel, an MQTT topic, an inbox.
 *
 * A sender is configured with concrete values (tokens, ids, URLs) and knows
 * nothing about tenants, environment variables or the hub. One instance holds
 * one connection; create several for several accounts.
 */
export interface ConductorSender {
  /** The transport this sender speaks, e.g. `'discord'`. Matches its descriptor's `type`. */
  readonly type: string;

  /** The adapter's own version, for diagnostics. */
  readonly version: string;

  readonly status: SenderStatus;

  /**
   * Connect and authenticate. Resolves when `send()` can be called, rejects
   * when the transport cannot be reached or the credentials are refused.
   */
  initialize(): Promise<void>;

  /**
   * Deliver one message. Delivery failures come back as `{ success: false }`;
   * the promise only rejects on programming errors.
   */
  send(message: SendMessage): Promise<SendResponse>;

  /** Whether the sender can deliver right now. */
  healthCheck(): Promise<boolean>;

  /** Close the connection and release resources. Safe to call more than once. */
  shutdown(): Promise<void>;
}
