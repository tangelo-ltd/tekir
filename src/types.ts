/**
 * TEKIR - Transparent Endpoint Knowledge for Intelligent Reasoning
 *
 * TypeScript type definitions for all TEKIR extension fields.
 * These types describe the machine-actionable metadata that can be
 * attached to HTTP API responses so AI agents can reason about them.
 */

/**
 * The side-effect classification of an action.
 * Helps AI agents understand what will happen if they follow a link.
 *
 * - 'none'     - No side effects (e.g. health check)
 * - 'read'     - Read-only operation, no state change
 * - 'create'   - Creates a new resource
 * - 'write'    - Modifies an existing resource
 * - 'delete'   - Removes a resource
 * - 'external' - Triggers an external/third-party side effect
 */
export type Effect = 'none' | 'read' | 'create' | 'write' | 'delete' | 'external';

/**
 * Describes a follow-up action that an AI agent (or client) can take.
 * Each action is a hypermedia control with enough metadata for an agent
 * to decide whether and how to invoke it.
 */
export interface TekirAction {
  /** Stable machine-readable identifier for this action (e.g. "track_order") */
  id: string;

  /** Short human-readable title describing the action */
  title: string;

  /** Optional longer description of what the action does */
  description?: string;

  /** The URL to invoke for this action */
  href: string;

  /** HTTP method - defaults to GET when omitted */
  method?: string;

  /** Optional HTTP headers required for the request */
  headers?: Record<string, string>;

  /** Optional static request body (for actions with a fixed payload) */
  body?: unknown;

  /** JSON Schema describing the expected request body */
  input_schema?: Record<string, unknown>;

  /** The side-effect classification of this action */
  effect?: Effect;
}

/**
 * Describes a limitation or constraint on the current response.
 * Tells AI agents what data might be missing, truncated, or restricted.
 */
export interface TekirLimitation {
  /** Machine-readable code identifying the limitation (e.g. "pagination", "field_omitted") */
  code: string;

  /** Human-readable explanation of the limitation */
  detail?: string;

  /** The specific field or resource the limitation applies to */
  target?: string;
}

/**
 * Retry policy information for error responses.
 * Helps AI agents decide whether and how to retry a failed request.
 */
export interface TekirRetryPolicy {
  /** Whether the request can be retried */
  retryable: boolean;

  /** ISO 8601 duration or HTTP-date indicating when to retry. HTTP Retry-After header takes precedence if present. */
  retry_after?: string;

  /** Maximum number of retry attempts recommended */
  max_attempts?: number;

  /** Backoff strategy - "fixed" or "exponential" */
  backoff?: 'fixed' | 'exponential';

  /** When true, the client should generate and include an idempotency key on retries */
  idempotency_key?: boolean;
}

/**
 * A web link following RFC 8288 (Web Linking) conventions.
 * Used for documentation, related resources, and other references.
 */
export interface TekirLink {
  /** Link relation type (e.g. "documentation", "related", "self") */
  rel: string;

  /** The URL of the linked resource */
  href: string;

  /** Media type of the linked resource (e.g. "text/html") */
  type?: string;

  /** Human-readable title for the link */
  title?: string;

  /** Language of the linked resource (BCP 47 tag) */
  hreflang?: string;
}

/**
 * The full set of optional TEKIR extension fields that can be added
 * to any API response body.
 */
export interface TekirFields {
  /** Human-readable explanation of why this response was returned */
  reason?: string;

  /** List of limitations or constraints on the response data */
  limitations?: TekirLimitation[];

  /** Available follow-up actions the agent can take */
  next_actions?: TekirAction[];

  /** Free-form guidance messages directed at the AI agent */
  agent_guidance?: string[];

  /** Whether the agent should confirm with the user before proceeding */
  user_confirmation_required?: boolean;

  /** Retry policy for error responses */
  retry_policy?: TekirRetryPolicy;

  /** Related links (documentation, schemas, etc.) */
  links?: TekirLink[];
}

/**
 * A TEKIR-enriched response that combines arbitrary response data
 * with TEKIR metadata fields.
 *
 * @typeParam T - The shape of the original response data
 */
export type TekirResponse<T> = T & TekirFields;
