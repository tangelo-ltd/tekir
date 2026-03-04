/**
 * TEKIR - Transparent Endpoint Knowledge for Intelligent Reasoning
 *
 * Builder functions for constructing TEKIR-enriched API responses.
 * All functions are pure - no classes, no side effects.
 *
 * @example
 * ```ts
 * import { tekir, action, limitation, guidance } from 'tekir';
 *
 * const response = tekir(
 *   { id: 'order_123', status: 'confirmed' },
 *   {
 *     next_actions: [
 *       action('track', 'Track shipment', '/orders/order_123/tracking', { effect: 'read' }),
 *     ],
 *     agent_guidance: guidance('Confirm the order details with the user.'),
 *   }
 * );
 * ```
 */

import type {
  Effect,
  TekirAction,
  TekirFields,
  TekirLimitation,
  TekirLink,
  TekirResponse,
  TekirRetryPolicy,
} from './types.js';

/**
 * Options for building a TekirAction (all optional fields).
 */
export interface ActionOptions {
  description?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  input_schema?: Record<string, unknown>;
  effect?: Effect;
}

/**
 * Options for building a TekirLimitation (all optional fields).
 */
export interface LimitationOptions {
  detail?: string;
  target?: string;
}

/**
 * Options for building a retryable TekirRetryPolicy.
 */
export interface RetryOptions {
  retry_after?: string;
  max_attempts?: number;
  backoff?: 'fixed' | 'exponential';
  idempotency_key?: boolean;
}

/**
 * Options for building a TekirLink (all optional fields).
 */
export interface LinkOptions {
  type?: string;
  title?: string;
  hreflang?: string;
}

/**
 * Wraps any response data object with TEKIR extension fields.
 *
 * @param data - The original response data
 * @param fields - TEKIR metadata fields to attach
 * @returns A new object combining data and TEKIR fields
 *
 * @example
 * ```ts
 * const response = tekir(
 *   { items: [], total: 0 },
 *   { reason: 'No items match the filter criteria.' }
 * );
 * ```
 */
export function tekir<T extends Record<string, unknown>>(
  data: T,
  fields: TekirFields,
): TekirResponse<T> {
  // Only include TEKIR fields that are actually defined
  const defined: Partial<TekirFields> = {};

  if (fields.reason !== undefined) defined.reason = fields.reason;
  if (fields.limitations !== undefined) defined.limitations = fields.limitations;
  if (fields.next_actions !== undefined) defined.next_actions = fields.next_actions;
  if (fields.agent_guidance !== undefined) defined.agent_guidance = fields.agent_guidance;
  if (fields.user_confirmation_required !== undefined)
    defined.user_confirmation_required = fields.user_confirmation_required;
  if (fields.retry_policy !== undefined) defined.retry_policy = fields.retry_policy;
  if (fields.links !== undefined) defined.links = fields.links;

  return { ...data, ...defined } as TekirResponse<T>;
}

/**
 * Builds a TekirAction object.
 *
 * @param id - Stable machine-readable identifier
 * @param title - Human-readable title
 * @param href - URL for the action
 * @param opts - Additional optional fields
 * @returns A fully constructed TekirAction
 *
 * @example
 * ```ts
 * action('cancel', 'Cancel order', '/orders/123/cancel', {
 *   method: 'POST',
 *   effect: 'write',
 * })
 * ```
 */
export function action(
  id: string,
  title: string,
  href: string,
  opts?: ActionOptions,
): TekirAction {
  const result: TekirAction = { id, title, href };

  if (opts?.description !== undefined) result.description = opts.description;
  if (opts?.method !== undefined) result.method = opts.method;
  if (opts?.headers !== undefined) result.headers = opts.headers;
  if (opts?.body !== undefined) result.body = opts.body;
  if (opts?.input_schema !== undefined) result.input_schema = opts.input_schema;
  if (opts?.effect !== undefined) result.effect = opts.effect;

  return result;
}

/**
 * Builds a TekirLimitation object.
 *
 * @param code - Machine-readable limitation code
 * @param opts - Additional optional fields
 * @returns A fully constructed TekirLimitation
 *
 * @example
 * ```ts
 * limitation('pagination', { detail: 'Only first 50 results returned.' })
 * ```
 */
export function limitation(
  code: string,
  opts?: LimitationOptions,
): TekirLimitation {
  const result: TekirLimitation = { code };

  if (opts?.detail !== undefined) result.detail = opts.detail;
  if (opts?.target !== undefined) result.target = opts.target;

  return result;
}

/**
 * Builds a retryable TekirRetryPolicy.
 *
 * @param opts - Retry configuration options
 * @returns A retry policy with retryable set to true
 *
 * @example
 * ```ts
 * retryable({ retry_after: 5, max_attempts: 3, backoff: 'exponential' })
 * ```
 */
export function retryable(opts?: RetryOptions): TekirRetryPolicy {
  const result: TekirRetryPolicy = { retryable: true };

  if (opts?.retry_after !== undefined) result.retry_after = opts.retry_after;
  if (opts?.max_attempts !== undefined) result.max_attempts = opts.max_attempts;
  if (opts?.backoff !== undefined) result.backoff = opts.backoff;
  if (opts?.idempotency_key !== undefined) result.idempotency_key = opts.idempotency_key;

  return result;
}

/**
 * Builds a non-retryable TekirRetryPolicy.
 * Use this for errors that cannot be resolved by retrying
 * (e.g. validation errors, authorization failures).
 *
 * @returns A retry policy with retryable set to false
 *
 * @example
 * ```ts
 * notRetryable()
 * // => { retryable: false }
 * ```
 */
export function notRetryable(): TekirRetryPolicy {
  return { retryable: false };
}

/**
 * Builds a TekirLink object.
 *
 * @param rel - Link relation type
 * @param href - URL of the linked resource
 * @param opts - Additional optional fields
 * @returns A fully constructed TekirLink
 *
 * @example
 * ```ts
 * link('documentation', 'https://api.example.com/docs/orders', {
 *   type: 'text/html',
 *   title: 'Orders API documentation',
 * })
 * ```
 */
export function link(
  rel: string,
  href: string,
  opts?: LinkOptions,
): TekirLink {
  const result: TekirLink = { rel, href };

  if (opts?.type !== undefined) result.type = opts.type;
  if (opts?.title !== undefined) result.title = opts.title;
  if (opts?.hreflang !== undefined) result.hreflang = opts.hreflang;

  return result;
}

/**
 * Convenience function that wraps string arguments into a string array
 * suitable for the agent_guidance field.
 *
 * @param messages - One or more guidance messages
 * @returns An array of guidance strings
 *
 * @example
 * ```ts
 * guidance('Confirm with the user before proceeding.', 'Check the billing address.')
 * // => ['Confirm with the user before proceeding.', 'Check the billing address.']
 * ```
 */
export function guidance(...messages: string[]): string[] {
  return messages;
}
