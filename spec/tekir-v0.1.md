# TEKIR Specification v0.1

**Transparent Endpoint Knowledge for Intelligent Reasoning**

By Tangelo Bilisim Ltd.

---

## Abstract

TEKIR (Transparent Endpoint Knowledge for Intelligent Reasoning) is a specification for enriching HTTP API responses with structured, machine-actionable metadata. It extends RFC 9457 (Problem Details for HTTP APIs) beyond error responses to cover the full range of HTTP outcomes - including successful 2xx responses. TEKIR provides a standard vocabulary of extension fields that help AI agents, automation systems, and human developers understand not just what happened, but why it happened and what to do next. The specification is designed for incremental adoption: you can add a single field to an existing API response and immediately benefit.

## Motivation

HTTP APIs are no longer consumed exclusively by human-written code that knows exactly what to expect. A growing share of API traffic originates from LLM-powered agents, orchestration frameworks, and autonomous systems that must interpret responses, recover from errors, and navigate multi-step workflows without hard-coded logic.

Today's APIs communicate outcomes through status codes and, in the best case, RFC 9457 problem details for errors. But status codes alone are coarse. A `403 Forbidden` tells an agent the request was denied - it does not explain whether the denial is permanent, whether an alternative endpoint exists, or whether the user can upgrade their permissions to proceed. On the success side, a `200 OK` with a JSON body gives no machine-readable signal about what the caller should do next, what limitations were applied to the result, or whether a human should review the outcome before the agent continues.

TEKIR closes this gap. It defines a small set of extension fields that any JSON API response can carry - success or error - to provide:

- **Causal explanations** of why the response looks the way it does
- **Structured limitations** that describe constraints applied to the result
- **Machine-actionable next steps** with full request templates
- **Natural-language guidance** for AI agents (treated as untrusted input)
- **Retry and recovery policies** for transient failures
- **Human-in-the-loop signals** for effectful or sensitive operations

The goal is not to replace existing standards but to layer structured intelligence on top of them, so that any API - new or legacy - can become more navigable for both machines and humans.

## Design Principles

### Extend, don't replace

TEKIR builds on RFC 9457 Problem Details. Every valid RFC 9457 response is a valid TEKIR response. TEKIR fields are additions, never replacements for existing standard fields like `type`, `title`, `status`, `detail`, and `instance`.

### Works for ALL responses

RFC 9457 targets error responses (4xx and 5xx). TEKIR covers the entire HTTP response spectrum, including 2xx success responses. A successful order creation can carry `next_actions` for tracking the order, `limitations` describing rate limits applied, and `agent_guidance` suggesting a follow-up workflow.

### HTTP-semantics-first

HTTP headers remain authoritative. A `Retry-After` header takes precedence over `retry_policy.retry_after`. TEKIR fields provide supplementary context and machine-actionable structure - they do not override protocol-level semantics.

### Safe by default

Actions that create, modify, or delete resources are explicitly tagged with an `effect` field. When `user_confirmation_required` is true, agents MUST obtain human approval before executing effectful actions. The default posture is caution.

### Backwards compatible

Clients that do not understand TEKIR fields MUST ignore them, per standard JSON processing rules. Adding TEKIR fields to an existing API response is a non-breaking change.

### Incrementally adoptable

There is no minimum set of required fields. An API can start by adding `reason` to error responses, then later add `next_actions` to success responses, and eventually adopt the full field set. Each field provides standalone value.

### Transport-independent

While TEKIR is designed with HTTP APIs as the primary use case, the fields are plain JSON and work equally well in message queue payloads, log entries, webhook bodies, and event streams.

## Extension Fields

### Field Summary

| Field | Type | Context | Description |
|---|---|---|---|
| `reason` | string | Success and Error | Stable causal explanation of the response outcome |
| `limitations` | array of objects | Success and Error | Constraints that affected the response |
| `next_actions` | array of Action | Success and Error | Machine-actionable steps the caller can take |
| `agent_guidance` | array of strings | Success and Error | Natural-language instructions for AI agents (untrusted) |
| `user_confirmation_required` | boolean | Success and Error | Whether human approval is needed before acting |
| `retry_policy` | object | Primarily Error | Retry hints for transient failures |
| `links` | array of Link | Success and Error | Related resources per RFC 8288 |

---

### `reason`

**Type:** string

A stable, human-readable causal explanation of the response outcome.

For error responses, `reason` explains why the request failed - going beyond the generic `detail` field of RFC 9457 to provide specific causal information. For success responses, `reason` provides context about the result that might not be obvious from the data alone.

The value SHOULD be stable across identical conditions (i.e., the same cause should produce the same reason string), making it suitable for logging, monitoring, and programmatic matching.

**Error example:**

```json
{
  "type": "https://api.example.com/problems/insufficient-credits",
  "title": "Insufficient Credits",
  "status": 402,
  "detail": "Your account does not have enough credits to complete this request.",
  "reason": "Account has 12 credits remaining but the requested operation requires 50 credits. Credits reset on the 1st of each month or can be purchased immediately."
}
```

**Success example:**

```json
{
  "status": 200,
  "data": {
    "results": [ ... ],
    "total": 47
  },
  "reason": "Results filtered by region policy. 3 results excluded because your account is restricted to the EU region."
}
```

---

### `limitations`

**Type:** array of objects

Describes constraints that affected the response. Limitations can represent business rules, policy restrictions, quota boundaries, or data availability issues that shaped the response the caller received.

Each limitation object has the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | A stable, machine-readable identifier for the limitation (e.g., `"rate_limit"`, `"geo_restriction"`) |
| `detail` | string | No | Human-readable explanation of the limitation |
| `target` | string | No | A JSON Pointer (RFC 6901) identifying the part of the response affected by this limitation |

**Example in a success response:**

```json
{
  "status": 200,
  "data": {
    "products": [ ... ],
    "page": 1,
    "page_size": 25
  },
  "limitations": [
    {
      "code": "max_page_size",
      "detail": "Page size capped at 25 for free-tier accounts. Upgrade to increase to 100.",
      "target": "/data/page_size"
    },
    {
      "code": "catalog_subset",
      "detail": "Only products from your assigned warehouse are included. 340 products in other warehouses are excluded."
    }
  ]
}
```

**Example in an error response:**

```json
{
  "type": "https://api.example.com/problems/rate-limited",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "limitations": [
    {
      "code": "rate_limit",
      "detail": "Account is limited to 100 requests per minute. Current usage: 100/100."
    }
  ]
}
```

---

### `next_actions`

**Type:** array of Action objects

Machine-actionable steps the caller can take. For error responses, these represent recovery paths. For success responses, these represent follow-up workflow steps - such as tracking an order, modifying a resource, or initiating a related process.

Each Action object has the following fields:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | string | Yes | - | Stable, unique identifier for this action (e.g., `"track_order"`, `"retry_with_backoff"`) |
| `title` | string | Yes | - | Short human-readable label for the action |
| `description` | string | No | - | Rich, LLM-friendly explanation of what this action does, when to use it, what to expect, and operational context (see guidance below) |
| `href` | string | Yes | - | URL or URL template for the action |
| `method` | string | No | `"GET"` | HTTP method to use |
| `headers` | object | No | - | Additional HTTP headers to include in the request |
| `body` | object | No | - | Request body template (for POST, PUT, PATCH) |
| `input_schema` | object | No | - | JSON Schema describing required input parameters |
| `effect` | string | No | - | One of: `none`, `read`, `create`, `write`, `delete`, `external`. Describes the side effect of executing this action |

The `effect` field is central to TEKIR's safety model:

- `none` - No side effects (e.g., documentation links)
- `read` - Retrieves data without modification
- `create` - Creates a new resource
- `write` - Modifies an existing resource
- `delete` - Removes a resource
- `external` - Triggers an effect outside the API's system boundary (e.g., sending an email, charging a payment method)

Agents SHOULD treat actions with `create`, `write`, `delete`, or `external` effects with caution and respect the `user_confirmation_required` flag.

#### Writing effective `description` fields

The `description` field on each action is where TEKIR differentiates itself from plain HATEOAS links. An LLM can reason about natural language - use that. A good `description` should read like a briefing to an intelligent assistant, not a tooltip label.

Include:

- **What the action does and what the response looks like** - not just a label, but operational context
- **Timing expectations** - "Tracking info appears 1-2 hours after confirmation", "Approval takes 1-2 business days"
- **Alternative approaches** - "For live updates, register a webhook at /webhooks instead of polling this endpoint"
- **Failure modes** - "Returns 404 until the warehouse creates a shipment label", "Returns 402 if payment method cannot cover the new total"
- **Prerequisites and constraints** - "Only available during the 30-minute modification window", "Requires hr-compensation scope"
- **Side effects and irreversibility** - "This is irreversible", "Releases the payment authorization"

Bad (plain HATEOAS):
```
"description": "Track the shipment"
```

Good (LLM-friendly):
```
"description": "Returns real-time shipping status including carrier, tracking number, and estimated delivery date. Tracking info appears 1-2 hours after order confirmation - calling before that returns 404. For live push notifications instead of polling, register a webhook at /v1/webhooks with event type 'shipment.updated'. Status changes typically occur every 2-4 hours."
```

**Example in a success response (order creation):**

```json
{
  "status": 201,
  "data": {
    "order_id": "ord_8xk2m",
    "status": "confirmed",
    "total": "142.50",
    "currency": "USD"
  },
  "reason": "Order created and payment authorized. Fulfillment begins within 2 hours.",
  "next_actions": [
    {
      "id": "track_order",
      "title": "Track Order",
      "description": "Returns real-time order status including fulfillment stage, carrier info, and estimated delivery. Tracking info appears within 2 hours of order confirmation. For live updates, register a webhook at /webhooks with event 'order.status_changed' instead of polling.",
      "href": "https://api.example.com/orders/ord_8xk2m/tracking",
      "method": "GET",
      "effect": "read"
    },
    {
      "id": "modify_order",
      "title": "Modify Order",
      "description": "Modify item quantities or shipping address for an unprocessed order. Changes are only accepted while the order status is 'confirmed' - once the warehouse begins picking (typically 30-60 minutes after confirmation), this returns 409 Conflict. Changing quantities triggers a price recalculation and may result in a different total. If the new total exceeds the authorized payment amount, returns 402 and the user must re-authorize.",
      "href": "https://api.example.com/orders/ord_8xk2m",
      "method": "PATCH",
      "input_schema": {
        "type": "object",
        "properties": {
          "shipping_address": { "type": "object" },
          "items": { "type": "array" }
        }
      },
      "effect": "write"
    },
    {
      "id": "cancel_order",
      "title": "Cancel Order",
      "description": "Cancels the order, releases the payment authorization, and notifies the warehouse to halt processing. This is irreversible - once cancelled, the order cannot be reinstated and must be placed again from scratch. Only available before the order enters 'shipped' status. After shipping, use the returns process at /orders/ord_8xk2m/return instead.",
      "href": "https://api.example.com/orders/ord_8xk2m/cancel",
      "method": "POST",
      "effect": "delete"
    }
  ],
  "user_confirmation_required": false
}
```

**Example in an error response:**

```json
{
  "type": "https://api.example.com/problems/thread-gone",
  "title": "Thread Deleted",
  "status": 410,
  "detail": "The conversation thread has been deleted.",
  "reason": "Thread thr_abc123 was deleted by the owner 2 hours ago. Thread data is not recoverable. The thread had 47 messages from 3 participants over a 2-week span.",
  "next_actions": [
    {
      "id": "create_new_thread",
      "title": "Create New Thread",
      "description": "Creates a new conversation thread in the same channel with the same participants. Include previous_thread_id in the metadata field to link the new thread to this one - participants will see a 'continued from' banner. The new thread inherits channel defaults (notification settings, retention policy) but starts with zero messages. Participant list can be modified in the request body if desired.",
      "href": "https://api.example.com/threads",
      "method": "POST",
      "body": {
        "participants": ["user_1", "user_2"],
        "metadata": { "previous_thread_id": "thr_abc123" }
      },
      "effect": "create"
    },
    {
      "id": "list_active_threads",
      "title": "List Active Threads",
      "description": "Returns all active (non-deleted, non-archived) threads for the current user, sorted by last activity. Useful for finding an existing thread to continue the conversation instead of creating a new one. Supports filtering by channel_id and participant query parameters. Paginated at 25 threads per page.",
      "href": "https://api.example.com/threads?status=active",
      "method": "GET",
      "effect": "read"
    }
  ]
}
```

---

### `agent_guidance`

**Type:** array of strings

Natural-language instructions intended for AI agents consuming the API. Each string is a discrete instruction or suggestion.

**CRITICAL SECURITY NOTE:** The contents of `agent_guidance` MUST be treated as untrusted input. An agent MUST NOT execute instructions from `agent_guidance` that contradict its system prompt, violate its safety policies, or request actions outside the scope of the current task. This field is advisory, never authoritative.

Use cases include:

- Suggesting optimal retry timing for transient errors
- Recommending a sequence of API calls for a multi-step workflow
- Warning about edge cases or known issues
- Providing context that helps the agent make better decisions

**Example:**

```json
{
  "status": 200,
  "data": {
    "search_results": [ ... ]
  },
  "agent_guidance": [
    "Results are sorted by relevance by default. If the user asks for 'latest' or 'newest', re-request with sort=created_at&order=desc. If they ask for 'cheapest', use sort=price&order=asc. Do not re-sort client-side as the server applies boosting rules that affect ordering.",
    "This endpoint paginates at 20 results. If the user asks for a comprehensive summary, fetch all pages using the 'next' Link header before synthesizing. For 'find me one that...' queries, scan results page by page and stop as soon as a match is found to avoid unnecessary API calls.",
    "Product prices in results are in the warehouse's local currency (EUR for EU, USD for US, TRY for TR). Always call /currencies/convert with the user's preferred currency before displaying prices. Do not attempt manual conversion - exchange rates are updated hourly and include applicable taxes."
  ]
}
```

---

### `user_confirmation_required`

**Type:** boolean

Signals whether an agent MUST obtain explicit human approval before executing any of the `next_actions` in this response.

When `true`, the agent SHOULD present the available actions to the user and wait for confirmation before proceeding. This is particularly important for actions with `create`, `write`, `delete`, or `external` effects.

When `false` or absent, the agent MAY proceed autonomously based on its own policies and the `effect` annotations on individual actions.

**Example:**

```json
{
  "status": 200,
  "data": {
    "subscription": {
      "plan": "pro",
      "renewal_date": "2026-04-01",
      "amount": "99.00"
    }
  },
  "next_actions": [
    {
      "id": "cancel_subscription",
      "title": "Cancel Subscription",
      "description": "Cancels the subscription at the end of the current billing period (2026-04-01). The user retains access until then. This is irreversible through the API - reactivation requires contacting support. Any unused credits or add-ons are forfeited. Prorated refunds are not issued for mid-cycle cancellations.",
      "href": "https://api.example.com/subscriptions/sub_xyz/cancel",
      "method": "POST",
      "effect": "external"
    },
    {
      "id": "change_plan",
      "title": "Change Plan",
      "description": "Switches the subscription to a different plan. Upgrades take effect immediately with prorated billing. Downgrades take effect at the next billing cycle to avoid losing access to features mid-period. Changing from 'pro' to 'starter' will disable team collaboration, API access, and priority support. The user should export shared team data before downgrading.",
      "href": "https://api.example.com/subscriptions/sub_xyz/plan",
      "method": "PUT",
      "input_schema": {
        "type": "object",
        "properties": {
          "plan": { "type": "string", "enum": ["starter", "pro", "enterprise"] }
        },
        "required": ["plan"]
      },
      "effect": "external"
    }
  ],
  "user_confirmation_required": true
}
```

---

### `retry_policy`

**Type:** object

Provides structured retry hints for transient failures. While the HTTP `Retry-After` header conveys when to retry, `retry_policy` provides a richer set of hints about how to retry.

| Field | Type | Required | Description |
|---|---|---|---|
| `retryable` | boolean | Yes | Whether the request can be retried with a reasonable expectation of success |
| `retry_after` | string | No | ISO 8601 duration or HTTP-date indicating when to retry. If the HTTP `Retry-After` header is also present, the header value takes precedence. |
| `max_attempts` | integer | No | Suggested maximum number of retry attempts |
| `backoff` | string | No | One of `fixed` or `exponential`. Suggests the backoff strategy between retries. |
| `idempotency_key` | boolean | No | When `true`, indicates the client should generate and include an idempotency key on retries to prevent duplicate processing |

**Example:**

```json
{
  "type": "https://api.example.com/problems/service-overloaded",
  "title": "Service Overloaded",
  "status": 503,
  "detail": "The payment processing service is temporarily unavailable.",
  "reason": "Upstream payment gateway is experiencing elevated latency. Requests are being shed to protect system stability.",
  "retry_policy": {
    "retryable": true,
    "retry_after": "PT30S",
    "max_attempts": 3,
    "backoff": "exponential",
    "idempotency_key": true
  },
  "next_actions": [
    {
      "id": "check_status",
      "title": "Check Service Status",
      "description": "Returns the current operational status of the payment gateway including health, average latency, and estimated recovery time. This is a public endpoint that does not require authentication. If the status shows 'degraded' or 'down', wait for the estimated recovery time before retrying rather than using the backoff schedule.",
      "href": "https://status.example.com/api/payment-gateway",
      "method": "GET",
      "effect": "read"
    }
  ]
}
```

**Non-retryable example:**

```json
{
  "type": "https://api.example.com/problems/invalid-input",
  "title": "Validation Error",
  "status": 422,
  "retry_policy": {
    "retryable": false
  }
}
```

---

### `links`

**Type:** array of Link objects

Provides related resources following the semantics of RFC 8288 (Web Linking). While the HTTP `Link` header serves the same purpose, the `links` field allows richer metadata and is easier for clients to parse from JSON response bodies.

| Field | Type | Required | Description |
|---|---|---|---|
| `rel` | string | Yes | Link relation type (e.g., `"self"`, `"next"`, `"documentation"`, `"related"`) |
| `href` | string | Yes | URL of the linked resource |
| `type` | string | No | Media type hint for the linked resource |
| `title` | string | No | Human-readable label for the link |
| `hreflang` | string | No | Language of the linked resource (BCP 47 language tag) |

**Example:**

```json
{
  "status": 200,
  "data": {
    "user": { "id": "u_abc", "name": "Jane Doe" }
  },
  "links": [
    {
      "rel": "self",
      "href": "https://api.example.com/users/u_abc",
      "type": "application/json"
    },
    {
      "rel": "documentation",
      "href": "https://docs.example.com/api/users",
      "type": "text/html",
      "title": "User API Documentation"
    },
    {
      "rel": "related",
      "href": "https://api.example.com/users/u_abc/orders",
      "type": "application/json",
      "title": "User's Orders"
    }
  ]
}
```

## Usage in Success Responses

This is TEKIR's key differentiator from RFC 9457. While Problem Details was designed exclusively for error responses, TEKIR fields can appear in any JSON response body - including 2xx success responses.

In successful responses, TEKIR fields serve several purposes:

**Contextual transparency.** The `reason` and `limitations` fields explain what happened behind the scenes. A search endpoint might return 20 results, but TEKIR can communicate that 5 results were excluded by a geographic policy, the page size was capped due to account tier, and results were re-ranked by a personalization model.

**Workflow continuity.** The `next_actions` field provides machine-actionable follow-up steps. After creating an order, the response can offer actions for tracking, modification, and cancellation - each with full request templates that an agent can execute without consulting external documentation.

**Guardrails for autonomy.** The `user_confirmation_required` flag and `effect` annotations let API providers signal which follow-up actions are safe for autonomous execution and which require human review.

**Agent-specific hints.** The `agent_guidance` field allows API providers to communicate optimization strategies, known edge cases, and workflow recommendations in natural language - useful for LLM agents that can interpret nuanced instructions.

### Full Success Response Example

```json
{
  "status": 200,
  "data": {
    "shipment_id": "shp_92kd",
    "carrier": "FedEx",
    "tracking_number": "7489273649182",
    "estimated_delivery": "2026-03-08",
    "items": [
      { "sku": "WIDGET-001", "quantity": 5 },
      { "sku": "GADGET-042", "quantity": 2 }
    ]
  },
  "reason": "Shipment created with standard shipping. Express shipping was unavailable for the destination ZIP code.",
  "limitations": [
    {
      "code": "shipping_method_fallback",
      "detail": "Requested express shipping is not available for ZIP 99501 (Alaska). Standard shipping was applied automatically.",
      "target": "/data/carrier"
    }
  ],
  "next_actions": [
    {
      "id": "track_shipment",
      "title": "Track Shipment",
      "description": "Returns real-time tracking data from FedEx including current location, scan events, and estimated delivery date. Tracking updates are available within 1 hour of shipment creation. For automated monitoring, register a webhook at /webhooks with event 'shipment.tracking_updated' instead of polling. Standard shipments update every 4-6 hours.",
      "href": "https://api.example.com/shipments/shp_92kd/tracking",
      "method": "GET",
      "effect": "read"
    },
    {
      "id": "update_shipping_address",
      "title": "Update Shipping Address",
      "description": "Redirects the shipment to a different address. Only available before the carrier picks up the package (carrier pickup happens within 4-6 hours of shipment creation for standard shipping). After pickup, returns 409 Conflict and the user must contact FedEx directly or wait for delivery and use the return process. Address changes to Alaska, Hawaii, or international destinations may incur additional shipping charges.",
      "href": "https://api.example.com/shipments/shp_92kd/address",
      "method": "PUT",
      "input_schema": {
        "type": "object",
        "properties": {
          "street": { "type": "string" },
          "city": { "type": "string" },
          "state": { "type": "string" },
          "zip": { "type": "string" }
        },
        "required": ["street", "city", "state", "zip"]
      },
      "effect": "write"
    },
    {
      "id": "request_return_label",
      "title": "Request Return Label",
      "description": "Generates a prepaid FedEx return label for this shipment. The label is emailed to the shipping address contact and also available as a PDF download in the response. Return labels are valid for 30 days. Only one active return label per shipment - requesting again while one is active returns the existing label.",
      "href": "https://api.example.com/shipments/shp_92kd/return-label",
      "method": "POST",
      "effect": "create"
    }
  ],
  "agent_guidance": [
    "Note that express shipping was unavailable and standard shipping was applied. Inform the user of this change and the revised estimated delivery date before proceeding with other tasks.",
    "The tracking endpoint will not return data for approximately 1 hour. If the user asks to track immediately, explain the delay rather than calling the endpoint and getting a 404.",
    "Address updates are only accepted before carrier pickup (4-6 hours for standard). If the user needs to change the address, prioritize this action over other requests as the window is limited.",
    "A return label can be requested preemptively if the user expresses uncertainty about the order. This does not affect the shipment - the label simply becomes available if needed."
  ],
  "user_confirmation_required": false,
  "links": [
    {
      "rel": "documentation",
      "href": "https://docs.example.com/api/shipments",
      "type": "text/html",
      "title": "Shipments API Documentation"
    },
    {
      "rel": "related",
      "href": "https://api.example.com/orders/ord_8xk2m",
      "type": "application/json",
      "title": "Parent Order"
    }
  ]
}
```

## Usage in Error Responses

For error responses, TEKIR builds on the existing RFC 9457 Problem Details structure. The standard `type`, `title`, `status`, `detail`, and `instance` fields remain the foundation. TEKIR fields layer structured recovery guidance on top.

The combination is powerful: RFC 9457 tells the caller what went wrong, and TEKIR tells the caller what to do about it.

### Error Recovery Example

```json
{
  "type": "https://api.example.com/problems/payment-method-expired",
  "title": "Payment Method Expired",
  "status": 402,
  "detail": "The credit card on file (ending 4242) expired in January 2026.",
  "instance": "/payments/pay_7km2/attempts/3",
  "reason": "Payment failed because the primary payment method has expired. The account has no backup payment methods configured.",
  "limitations": [
    {
      "code": "no_backup_payment",
      "detail": "No backup payment method is available to fall back to."
    }
  ],
  "next_actions": [
    {
      "id": "update_payment_method",
      "title": "Update Payment Method",
      "description": "Replace the expired card with a new payment method. The card_token must be obtained first by tokenizing the card details through the /tokens endpoint (PCI compliance requires client-side tokenization - never send raw card numbers through this API). Setting set_as_default to true ensures future charges use this card. After updating, use retry_payment to complete the original transaction.",
      "href": "https://api.example.com/account/payment-methods",
      "method": "PUT",
      "input_schema": {
        "type": "object",
        "properties": {
          "card_token": { "type": "string" },
          "set_as_default": { "type": "boolean" }
        },
        "required": ["card_token"]
      },
      "effect": "write"
    },
    {
      "id": "retry_payment",
      "title": "Retry Payment",
      "description": "Retries the original payment (amount: $142.50) using the current default payment method. This must be called after update_payment_method - retrying with the same expired card will fail again immediately. The retry preserves the original order and pricing. If retry fails, the order remains in 'pending_payment' status for 24 hours before automatic cancellation.",
      "href": "https://api.example.com/payments/pay_7km2/retry",
      "method": "POST",
      "effect": "external"
    },
    {
      "id": "contact_support",
      "title": "Contact Support",
      "description": "Creates a support ticket for manual payment processing or account-level billing issues. Average response time is 2-4 hours during business hours (UTC 08:00-18:00 Mon-Fri). Use this if the user cannot update their payment method through the API (e.g., wire transfer, purchase order, or corporate billing arrangements).",
      "href": "https://api.example.com/support/tickets",
      "method": "POST",
      "body": {
        "subject": "Payment failure - expired card",
        "context": { "payment_id": "pay_7km2" }
      },
      "effect": "create"
    }
  ],
  "agent_guidance": [
    "Do not retry the payment without first updating the payment method - the same expired card will fail again immediately. The correct sequence is: collect new card details from user, tokenize via /tokens, call update_payment_method, then retry_payment.",
    "If the user wants to update their card, explain that you need their new card number, expiry, and CVV. These are tokenized client-side for PCI compliance and never stored in plaintext.",
    "The order is held in 'pending_payment' status for 24 hours. After that, it is automatically cancelled and the user must place a new order. Communicate this urgency if appropriate.",
    "If the user mentions corporate billing, purchase orders, or wire transfer, direct them to contact_support as these payment methods cannot be processed through the API."
  ],
  "user_confirmation_required": true,
  "retry_policy": {
    "retryable": false
  }
}
```

## Security Considerations

TEKIR introduces fields that AI agents may act upon. This creates a new class of security concerns that API providers and agent developers must address.

### Prompt Injection via `agent_guidance`

The `agent_guidance` field contains natural-language text from the API server. A compromised or malicious server could use this field to inject instructions that manipulate the agent's behavior - for example, instructing it to ignore previous instructions, exfiltrate data to a third-party URL, or bypass safety checks.

**Mitigation:** Agents MUST treat `agent_guidance` as untrusted input, equivalent to user-generated content. Agent frameworks SHOULD:

- Sandbox `agent_guidance` content so it cannot override system prompts
- Apply the same content filtering applied to any untrusted text
- Log `agent_guidance` content for audit purposes
- Never grant `agent_guidance` elevated privileges

### Confused Deputy Attacks

The `next_actions` field provides full request templates including URLs, methods, headers, and bodies. A malicious server could craft actions that direct the agent to make requests to unrelated services using the agent's credentials.

**Mitigation:** Agents SHOULD:

- Validate that `next_actions` URLs belong to the same origin or a known trusted set of origins
- Never blindly forward authentication credentials to URLs provided in `next_actions`
- Apply allowlists for domains and URL patterns that actions can target
- Require explicit user confirmation for actions targeting external origins

### Credential Exfiltration

Action templates in `next_actions` could include `href` values or `body` templates designed to capture and exfiltrate credentials, tokens, or sensitive data embedded in URL parameters or request bodies.

**Mitigation:** API providers MUST NOT include secrets, tokens, or credentials in `next_actions` templates. Agent frameworks SHOULD:

- Inspect action URLs and bodies for patterns resembling credential exfiltration
- Never interpolate secrets into action templates without explicit user consent
- Treat action templates as data, not code

### Information Leakage

TEKIR fields like `reason`, `limitations`, and `agent_guidance` may inadvertently expose internal system details - such as infrastructure topology, internal service names, rate limit algorithms, or business logic - that could aid an attacker.

**Mitigation:** API providers SHOULD:

- Review TEKIR fields for sensitive internal details before including them in responses
- Use the same information classification standards applied to other response fields
- Avoid exposing internal error messages, stack traces, or infrastructure details through `reason` or `agent_guidance`
- Consider different levels of detail for authenticated vs. unauthenticated callers

## Relationship to Other Standards

### RFC 9457 - Problem Details for HTTP APIs

TEKIR is a direct extension of RFC 9457. It preserves the core Problem Details fields (`type`, `title`, `status`, `detail`, `instance`) and adds new extension fields as permitted by the RFC 9457 extension mechanism. The key expansion is scope: RFC 9457 targets error responses, while TEKIR fields are designed for all HTTP responses.

An API that already uses RFC 9457 can adopt TEKIR by adding extension fields to its existing error responses, then expanding to success responses over time.

### MCP - Model Context Protocol

MCP and TEKIR are complementary. MCP handles tool and capability discovery - it lets an agent learn what an API can do. TEKIR handles response-time guidance - it tells the agent what happened and what to do next after a specific API call.

Think of it this way: MCP is the map, TEKIR is the turn-by-turn navigation. An agent might discover an API through MCP, call it, and then use TEKIR fields in the response to determine its next move.

### OpenAPI

OpenAPI defines the API contract at design time - the available endpoints, request/response schemas, authentication methods, and so on. TEKIR provides runtime response metadata that reflects the actual outcome of a specific request.

OpenAPI and TEKIR complement each other well. An OpenAPI specification can document that TEKIR fields may appear in responses (using the `additionalProperties` or extension mechanisms), and TEKIR fields can reference OpenAPI documentation via the `links` field.

### HATEOAS

HATEOAS (Hypermedia as the Engine of Application State) is the REST principle that responses should include links to related resources and available actions. TEKIR makes HATEOAS practical for LLM agents by providing:

- Structured action templates (not just links, but full request specifications)
- Effect annotations that classify the safety profile of each action
- Human-in-the-loop signals for effectful operations
- Natural-language guidance that helps agents choose between available actions

Where traditional HATEOAS relied on human developers to interpret hypermedia controls, TEKIR provides enough structure and context for autonomous agents to navigate API workflows safely.

## Versioning

This document defines TEKIR v0.1, the initial public draft.

The specification will evolve through the following stages:

- **v0.x (Draft)** - Experimental. Fields may be added, modified, or removed between minor versions. Implementers should expect breaking changes and are encouraged to provide feedback.
- **v1.0 (Stable)** - The field vocabulary, semantics, and JSON structure are fixed. No breaking changes within the v1.x line. New fields may be added as optional extensions.
- **v2.0+** - Reserved for changes that modify the semantics of existing fields or introduce structural incompatibilities.

The version of the TEKIR specification in use can optionally be indicated by including a `tekir_version` field in the response body:

```json
{
  "tekir_version": "0.1",
  "reason": "...",
  "next_actions": [ ... ]
}
```

Clients SHOULD NOT require the presence of `tekir_version` and SHOULD process TEKIR fields regardless of whether it is present.

### Feedback and Contributions

TEKIR is developed in the open. Feedback, issues, and contributions are welcome at the project repository. The specification is governed by Tangelo Bilisim Ltd. with input from the community.

---

TEKIR Specification v0.1 - By Tangelo Bilisim Ltd.
