import type { ReceivedMessage } from './message.js';
import type { AdapterStatus } from './sender.js';

export type ReceiverStatus = AdapterStatus;

export type MessageHandler = (
  message: ReceivedMessage,
) => void | Promise<void>;

/**
 * Listens for messages arriving over a transport: an MQTT subscription, a
 * Discord bot reading a channel, a webhook endpoint.
 *
 * The contract is defined now so that packages can export a receiver next to
 * their sender when a transport is naturally two-way. No receiver ships yet.
 */
export interface ConductorReceiver {
  /** The transport this receiver speaks, e.g. `'mqtt'`. */
  readonly type: string;

  readonly version: string;

  readonly status: ReceiverStatus;

  /** Connect and start listening. */
  initialize(): Promise<void>;

  /**
   * Register a handler for incoming messages. Several handlers may be
   * registered; each is awaited, and a rejecting handler must not stop the
   * others.
   */
  onMessage(handler: MessageHandler): void;

  /** Stop listening and release resources. Safe to call more than once. */
  shutdown(): Promise<void>;
}
