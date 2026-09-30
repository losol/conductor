import { afterEach, describe, expect, it, vi } from 'vitest';
import { createConsoleLogger, noopLogger } from './logger.js';

describe('createConsoleLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes namespace, message and data', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = createConsoleLogger('discord');

    logger.info({ guildCount: 2 }, 'logged in');

    expect(info).toHaveBeenCalledWith('[discord]', 'logged in', {
      guildCount: 2,
    });
  });

  it('accepts a bare message and skips empty data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = createConsoleLogger();

    logger.warn('reconnecting');
    logger.warn({}, 'nothing attached');

    expect(warn).toHaveBeenNthCalledWith(1, 'reconnecting');
    expect(warn).toHaveBeenNthCalledWith(2, 'nothing attached');
  });

  it('routes each level to the matching console method', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logger = createConsoleLogger();

    logger.error({ error: new Error('boom') }, 'failed');
    logger.debug('details');

    expect(error).toHaveBeenCalledTimes(1);
    expect(debug).toHaveBeenCalledWith('details');
  });
});

describe('noopLogger', () => {
  it('does not touch the console', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    noopLogger.info({ a: 1 }, 'ignored');
    noopLogger.error('ignored');
    expect(info).not.toHaveBeenCalled();
  });
});
