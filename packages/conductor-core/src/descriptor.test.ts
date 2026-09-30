import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createSender, defineSender } from './descriptor.js';
import { ConfigurationError } from './errors.js';
import type { ConductorLogger } from './logger.js';
import { noopLogger } from './logger.js';
import type { ConductorSender } from './sender.js';

const fakeSender = (type: string): ConductorSender => ({
  type,
  version: '0.0.0',
  status: 'idle',
  initialize: async () => {},
  send: async () => ({ success: true }),
  healthCheck: async () => true,
  shutdown: async () => {},
});

const echo = defineSender({
  type: 'echo',
  configSchema: z.object({
    token: z.string().min(1),
    target: z.string().optional(),
  }),
  create: (config, { logger }) => {
    // `config` is inferred from the schema: these lines fail to compile otherwise.
    const token: string = config.token;
    const target: string | undefined = config.target;
    logger.info({ token, target }, 'creating');
    return fakeSender('echo');
  },
});

describe('createSender', () => {
  it('validates the config and hands the parsed value to create', () => {
    const create = vi.spyOn(echo, 'create');

    const sender = createSender(echo, { token: 'abc' });

    expect(sender.type).toBe('echo');
    expect(create).toHaveBeenCalledWith(
      { token: 'abc' },
      { logger: noopLogger },
    );
  });

  it('passes the given logger through', () => {
    const logger: ConductorLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    createSender(echo, { token: 'abc', target: 't' }, { logger });

    expect(logger.info).toHaveBeenCalledWith(
      { token: 'abc', target: 't' },
      'creating',
    );
  });

  it('throws ConfigurationError with one issue per problem', () => {
    let caught: unknown;
    try {
      createSender(echo, { token: '', target: 42 });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConfigurationError);
    const error = caught as ConfigurationError;
    expect(error.code).toBe('CONFIGURATION');
    expect(error.adapterType).toBe('echo');
    expect(error.issues.map((issue) => issue.path).sort()).toEqual([
      'target',
      'token',
    ]);
    expect(error.message).toContain('Invalid configuration for "echo"');
  });

  it('reports a non-object config at the root path', () => {
    expect(() => createSender(echo, null)).toThrow(ConfigurationError);
    try {
      createSender(echo, null);
    } catch (error) {
      expect((error as ConfigurationError).issues[0]?.path).toBe('');
      expect((error as ConfigurationError).message).toContain('(root)');
    }
  });
});
