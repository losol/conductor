/**
 * Structured log data: key/value pairs written alongside a message.
 */
export type LogData = Record<string, unknown>;

/**
 * The logger adapters write to.
 *
 * The shape matches an `@eventuras/logger` instance, so the hub passes its own
 * logger straight through. Standalone users pass anything with this shape, or
 * nothing and get {@link noopLogger}.
 *
 * Every method takes either a message, or log data followed by a message:
 * `logger.info('connected')` and `logger.info({ guildCount: 2 }, 'connected')`.
 */
export interface ConductorLogger {
  debug(dataOrMessage: LogData | string, message?: string): void;
  info(dataOrMessage: LogData | string, message?: string): void;
  warn(dataOrMessage: LogData | string, message?: string): void;
  error(dataOrMessage: LogData | string, message?: string): void;
}

/**
 * A logger that discards everything. The default when no logger is given.
 */
export const noopLogger: ConductorLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

type ConsoleLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * A logger that writes to the console, for scripts and local experiments.
 *
 * Lines look like `[namespace] message { ...data }`.
 */
export function createConsoleLogger(namespace?: string): ConductorLogger {
  const write =
    (level: ConsoleLevel) =>
    (dataOrMessage: LogData | string, message?: string): void => {
      const [data, text] =
        typeof dataOrMessage === 'string'
          ? [undefined, dataOrMessage]
          : [dataOrMessage, message];

      const parts: unknown[] = [];
      if (namespace) parts.push(`[${namespace}]`);
      if (text) parts.push(text);
      if (data && Object.keys(data).length > 0) parts.push(data);

      console[level](...parts);
    };

  return {
    debug: write('debug'),
    info: write('info'),
    warn: write('warn'),
    error: write('error'),
  };
}
