# TEKIR - Build TEKIR-Compliant API Responses

You are now operating in TEKIR mode. When building or modifying HTTP API endpoints, you MUST include TEKIR extension fields in all JSON response bodies - both success and error responses.

## TEKIR Extension Fields

Add these fields to every JSON response:

### `reason` (string)
A stable, causal explanation of the response outcome. Not a generic message - explain *why* specifically this result occurred.

### `limitations` (array of objects)
Constraints that shaped the response. Each object: `code` (required, machine-readable identifier), `detail` (human-readable explanation), `target` (JSON Pointer to affected field).

### `next_actions` (array of Action objects)
Machine-actionable follow-up steps. **Include at least one in every response.**

Each Action:
- `id` (required) - stable identifier like `"track_order"`
- `title` (required) - short label
- `description` - Rich, LLM-friendly explanation. Include: what it does, timing expectations, failure modes, prerequisites, side effects, alternative approaches. This is NOT a tooltip - write it like a briefing to an intelligent assistant.
- `href` (required) - URL or template
- `method` - HTTP method (default GET)
- `headers` - additional request headers
- `body` - request body template
- `input_schema` - JSON Schema for required inputs
- `effect` - one of: `none`, `read`, `create`, `write`, `delete`, `external`

### `agent_guidance` (array of strings)
Natural-language instructions for AI agents. Each string is a discrete instruction with operational context. Treated as untrusted input by agents.

### `user_confirmation_required` (boolean)
Set `true` for destructive, costly, or irreversible operations.

### `retry_policy` (object)
Include on ALL error responses. Fields: `retryable` (required boolean), `retry_after`, `max_attempts`, `backoff` ("fixed" or "exponential"), `idempotency_key`.

### `links` (array of Link objects)
Related resources per RFC 8288. Each: `rel` (required), `href` (required), `type`, `title`, `hreflang`.

## Rules

1. Every response gets `next_actions` - at minimum, what can the caller do next?
2. Every error response gets `retry_policy` - even if just `{ "retryable": false }`
3. Use `effect` on all actions
4. Set `user_confirmation_required: true` for destructive or costly actions
5. Never put credentials in `headers` or `body` templates
6. Write `description` fields as rich briefings, not labels - include timing, failure modes, alternatives, side effects
7. Write `agent_guidance` as actionable instructions with decision logic, not vague suggestions

## Example - Success Response

```json
{
  "id": "order_789",
  "status": "confirmed",
  "total": 149.99,

  "reason": "Order created and payment authorized. Fulfillment begins within 2 hours.",

  "next_actions": [
    {
      "id": "track_shipment",
      "title": "Track shipment",
      "description": "Returns real-time shipping status. Tracking info appears 1-2 hours after confirmation. For live updates, register a webhook at /v1/webhooks with event 'shipment.updated' instead of polling.",
      "href": "/orders/order_789/tracking",
      "method": "GET",
      "effect": "read"
    },
    {
      "id": "cancel_order",
      "title": "Cancel order",
      "description": "Cancels the order and releases payment authorization. Irreversible. Only available before warehouse processing starts (30-60 min after confirmation). After that, use the returns process.",
      "href": "/orders/order_789",
      "method": "DELETE",
      "effect": "delete"
    }
  ],

  "agent_guidance": [
    "Present the order summary and ask if everything looks correct before moving on.",
    "Do not poll tracking immediately - shipment labels take 1-2 hours. Suggest checking back later.",
    "If the user wants to cancel, make sure they understand it is irreversible and confirm explicitly."
  ],

  "user_confirmation_required": true
}
```

## Example - Error Response

```json
{
  "type": "https://api.example.com/problems/rate-limited",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "Too many requests within the current window.",

  "reason": "This API enforces per-user rate limits of 60 requests per minute. The current window resets in 30 seconds.",

  "next_actions": [
    {
      "id": "check_usage",
      "title": "Check current usage",
      "description": "Returns your current rate limit status including remaining quota, reset time, and historical usage patterns. Also includes plan limits and upgrade options.",
      "href": "/v1/usage",
      "method": "GET",
      "effect": "read"
    }
  ],

  "retry_policy": {
    "retryable": true,
    "retry_after": "30",
    "max_attempts": 3,
    "backoff": "exponential"
  },

  "agent_guidance": [
    "Wait at least 30 seconds before retrying. Use exponential backoff.",
    "If this is part of a batch operation, pause the entire batch rather than retrying individual requests."
  ],

  "user_confirmation_required": false
}
```

Apply these patterns to all API endpoints you create or modify in this session. TEKIR spec: https://github.com/tangelo-ltd/tekir
