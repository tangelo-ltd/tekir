/**
 * TEKIR - Transparent Endpoint Knowledge for Intelligent Reasoning
 *
 * A standard for adding machine-actionable metadata to HTTP API responses
 * so AI agents can reason about them.
 *
 * @packageDocumentation
 */

// Type definitions
export type {
  Effect,
  TekirAction,
  TekirFields,
  TekirLimitation,
  TekirLink,
  TekirResponse,
  TekirRetryPolicy,
} from './types.js';

// Builder functions
export {
  tekir,
  action,
  limitation,
  retryable,
  notRetryable,
  link,
  guidance,
} from './builders.js';

// Re-export option types for advanced usage
export type {
  ActionOptions,
  LimitationOptions,
  LinkOptions,
  RetryOptions,
} from './builders.js';
