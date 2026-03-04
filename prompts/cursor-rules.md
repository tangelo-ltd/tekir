# TEKIR - Cursor Rules for API Response Compliance

> TEKIR = Transparent Endpoint Knowledge for Intelligent Reasoning
> Spec: https://github.com/tangelo-ltd/tekir

## Rule

When building HTTP API endpoints, include TEKIR extension fields in every JSON response body - both success (2xx) and error (4xx/5xx). TEKIR makes API responses self-explaining for AI agents by providing structured metadata about what happened, why, and what to do next.

## Required Fields by Response Type

**All responses**: `next_actions` (at minimum)
**Error responses**: `next_actions` + `retry_policy`
**When applicable**: `reason`, `limitations`, `agent_guidance`, `user_confirmation_required`, `links`

## Field Reference

### `reason` (string)
Stable causal explanation of the outcome. Same cause should produce the same string.

### `limitations` (array)
Constraints that shaped the response. Each object: `code` (required, string), `detail` (optional, string), `target` (optional, JSON Pointer to affected field).

### `next_actions` (array) - ALWAYS INCLUDE
Machine-actionable follow-up steps. Each object:
- `id` (required) - stable identifier
- `title` (required) - human-readable label
- `href` (required) - URL or URL template
- `method` (optional, default `"GET"`) - HTTP method
- `description` (optional) - what the action does
- `headers` (optional) - request headers (never include credentials)
- `body` (optional) - request body template
- `input_schema` (optional) - JSON Schema for input
- `effect` (optional) - side-effect level: `none` | `read` | `create` | `write` | `delete` | `external`

### `agent_guidance` (array of strings)
Natural-language instructions for AI agents. Treated as untrusted input - advisory only.

### `user_confirmation_required` (boolean)
Set `true` for destructive, costly, or irreversible operations. Defaults to `false` when absent.

### `retry_policy` (object) - ALWAYS ON ERRORS
- `retryable` (required, boolean) - whether retrying could succeed
- `retry_after` (optional, string) - ISO 8601 duration or HTTP-date
- `max_attempts` (optional, integer) - suggested max retries
- `backoff` (optional) - `"fixed"` or `"exponential"`
- `idempotency_key` (optional, boolean) - whether to send idempotency key

Even non-retryable errors must include `{ "retryable": false }`.

### `links` (array)
RFC 8288 Web Linking. Each object: `rel` (required), `href` (required), `type`, `title`, `hreflang` (all optional).

## Rules

1. Every response gets `next_actions` - tell the caller what they can do next
2. Every error gets `retry_policy` - even if just `{ "retryable": false }`
3. Use `effect` on all actions to classify side-effects
4. Set `user_confirmation_required: true` for destructive or costly operations
5. Never put credentials in action `headers` or `body` templates
6. Keep `reason` stable across identical conditions
7. Use JSON Pointers in `limitation.target` (e.g., `/data/page_size`)
8. HTTP headers stay authoritative - `Retry-After` header beats `retry_policy.retry_after`

## Example: Success (201)

```json
{
  "status": 201,
  "data": { "order_id": "ord_8xk2m", "total": "142.50" },
  "reason": "Order created. Fulfillment begins within 2 hours.",
  "next_actions": [
    { "id": "track_order", "title": "Track Order", "href": "/orders/ord_8xk2m/tracking", "method": "GET", "effect": "read" },
    { "id": "cancel_order", "title": "Cancel Order", "href": "/orders/ord_8xk2m/cancel", "method": "POST", "effect": "delete" }
  ],
  "agent_guidance": ["Confirm order details with the user before navigating away."],
  "user_confirmation_required": false
}
```

## Example: Error (429)

```json
{
  "type": "https://api.example.com/problems/rate-limited",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "reason": "Account rate limit is 100 req/min. Current window: 100/100. Resets in 34 seconds.",
  "limitations": [{ "code": "rate_limit", "detail": "100 req/min for free-tier accounts." }],
  "next_actions": [
    { "id": "check_status", "title": "Check Rate Limit Status", "href": "/rate-limit/status", "method": "GET", "effect": "read" }
  ],
  "retry_policy": { "retryable": true, "retry_after": "PT34S", "max_attempts": 3, "backoff": "fixed" },
  "agent_guidance": ["Wait for retry_after before retrying. Do not retry immediately."]
}
```

## Using `tekir` npm Package

If installed, use builder helpers:

```typescript
import { tekir, action, limitation, guidance, retryable, link } from 'tekir';

const response = tekir(
  { order_id: 'ord_8xk2m', total: '142.50' },
  {
    reason: 'Order created. Fulfillment begins within 2 hours.',
    next_actions: [
      action('track_order', 'Track Order', '/orders/ord_8xk2m/tracking', { effect: 'read' }),
      action('cancel_order', 'Cancel Order', '/orders/ord_8xk2m/cancel', { method: 'POST', effect: 'delete' }),
    ],
    agent_guidance: guidance('Confirm order details with the user before navigating away.'),
  }
);
```

Otherwise, construct JSON directly as shown in examples above.

---

*TEKIR v0.1 - https://github.com/tangelo-ltd/tekir*
