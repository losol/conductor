import type { AdapterStatus } from './sender.js';

/**
 * Base class for errors raised by Conductor packages. `code` is stable and
 * meant for programmatic handling; `message` is for people.
 */
export class ConductorError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

/** One thing wrong with a configuration object. */
export interface ConfigurationIssue {
  /** Dotted path to the offending field, or `''` for the root. */
  path: string;
  message: string;
}

/**
 * The configuration given to an adapter did not match its schema.
 */
export class ConfigurationError extends ConductorError {
  readonly adapterType: string;
  readonly issues: readonly ConfigurationIssue[];

  constructor(adapterType: string, issues: readonly ConfigurationIssue[]) {
    const details = issues
      .map((issue) => `${issue.path || '(root)'}: ${issue.message}`)
      .join('; ');
    super(
      'CONFIGURATION',
      `Invalid configuration for "${adapterType}": ${details}`,
    );
    this.adapterType = adapterType;
    this.issues = issues;
  }
}

/**
 * An operation needed a ready sender or receiver, and it was not.
 */
export class NotReadyError extends ConductorError {
  readonly adapterType: string;
  readonly status: AdapterStatus;

  constructor(adapterType: string, status: AdapterStatus) {
    super(
      'NOT_READY',
      `"${adapterType}" is not ready (status: ${status})`,
    );
    this.adapterType = adapterType;
    this.status = status;
  }
}
