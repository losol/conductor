/**
 * How urgently a message should be treated. Senders decide what that means
 * for their transport; the Discord sender, for example, prefixes high-priority
 * messages with a warning marker.
 */
export type MessagePriority = 'normal' | 'high';

/**
 * A message handed to a sender.
 *
 * This is the transport-neutral shape. Hub concerns such as tenant ids or
 * notification ids do not belong here; the hub puts them in `metadata` for
 * log correlation and senders never interpret them.
 */
export interface SendMessage {
  /** The text to deliver. */
  content: string;

  /** Defaults to `'normal'`. */
  priority?: MessagePriority;

  /**
   * Where to deliver the message within the transport: a Discord channel id,
   * an MQTT topic, a phone number. When omitted, the sender falls back to the
   * target it was configured with.
   */
  targetId?: string;

  /**
   * Anything the caller wants carried along, such as a notification id or a
   * tenant id for logging. Senders may log it but never act on it.
   */
  metadata?: Record<string, unknown>;
}

/**
 * The outcome of a send. Senders report delivery failures here rather than
 * throwing, so a hub can route many messages without wrapping every call.
 */
export interface SendResponse {
  success: boolean;

  /** The transport's own id for the delivered message, when it has one. */
  messageId?: string;

  /** Why delivery failed. Present when `success` is false. */
  error?: string;
}

/**
 * A message a receiver picked up from its transport.
 */
export interface ReceivedMessage {
  /** The text that arrived. */
  content: string;

  /** Where it arrived: a Discord channel id, an MQTT topic. */
  sourceId?: string;

  /** Who sent it, in the transport's own terms. */
  senderId?: string;

  receivedAt: Date;

  /**
   * The transport's own message object, for handlers that need more than the
   * common fields. Its type depends on the receiver.
   */
  raw?: unknown;

  metadata?: Record<string, unknown>;
}
