<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/tekir-logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/tekir-logo.svg">
    <img alt="TEKIR" src="./assets/tekir-logo.svg" width="160">
  </picture>
</p>

<h1 align="center">TEKIR</h1>

<p align="center">
  <strong><u>T</u>ransparent <u>E</u>ndpoint <u>K</u>nowledge for <u>I</u>ntelligent <u>R</u>easoning</strong><br>
  <em>Make your API responses self-explaining for AI agents.</em>
</p>

<p align="center">
  <a href="https://github.com/tangelo-ltd/tekir/stargazers"><img src="https://img.shields.io/github/stars/tangelo-ltd/tekir?style=social" alt="GitHub stars"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="./spec/tekir-v0.1.md"><img src="https://img.shields.io/badge/Spec-v0.1-orange.svg" alt="Spec: v0.1"></a>
  <a href="https://github.com/tangelo-ltd/tekir/issues"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

---

<h3 align="center"><em>AI agents are burning tokens, retrying blindly, and hallucinating recovery strategies - make your API actively help them out.</em></h3>

---

## The Problem

Your API returns this when something goes wrong:

```json
{
  "status": 410,
  "message": "Gone"
}
```

An AI agent sees this and has no idea what to do. So it starts guessing:

- Retries the same request in a loop, hoping the problem is transient
- Tries to discover alternative endpoints by modifying the URL
- Reformats the request body, hoping it was a validation issue
- Hallucinates a recovery strategy based on training data, not your API
- Asks the user a vague question like "Something went wrong, what should I do?"
- Gives up entirely and returns a generic error message

All of these waste tokens, time, and user trust. The information the agent needs *exists* on the server - it's just not in the response.

## The Solution

With TEKIR, the same response becomes self-explaining:

```json
{
  "type": "https://api.example.com/problems/thread-gone",
  "title": "Thread is gone",
  "status": 410,

  "reason": "Threads are archived after 90 days of inactivity. Archived threads are read-only - messages are still accessible but no new messages can be posted.",

  "next_actions": [
    {
      "id": "create_thread",
      "title": "Create a new thread",
      "description": "Creates a new thread in the same channel. Include previous_thread_id in metadata to link the threads and preserve conversation history. The new thread inherits channel defaults but not the original participant list.",
      "href": "https://api.example.com/v1/threads",
      "method": "POST",
      "effect": "create"
    }
  ],

  "agent_guidance": [
    "Explain to the user that the thread was archived and their message could not be sent.",
    "Ask whether they want to start a new thread - do not create one automatically.",
    "If the user just needs to reference old messages, use GET /v1/threads/thr_123/messages instead."
  ],

  "user_confirmation_required": true,
  "retry_policy": { "retryable": false }
}
```

The agent now knows *why* it failed, *what it can do next*, *what side effects those actions have*, and *whether to ask the user first*.

**And it's not just for errors.** A `200 OK` can also tell the agent what to do next:

```json
{
  "id": "order_789",
  "status": "confirmed",
  "total": 149.99,

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
    "The modification window closes at 2026-03-04T11:00:00Z - prioritize changes before other tasks.",
    "Do not poll tracking immediately - shipment labels take 1-2 hours. Suggest checking back later.",
    "If the user wants to cancel, make sure they understand it is irreversible and confirm explicitly."
  ],

  "user_confirmation_required": true
}
```

---

## What is TEKIR?

TEKIR is a lightweight standard that adds structured, machine-actionable metadata to HTTP API responses - both successes and errors - so AI agents can reason about them.

It builds on [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) (Problem Details for HTTP APIs) but goes further: TEKIR fields work in **any** JSON response, not just error responses.

**Why "TEKIR"?** In Turkish, *tekir* is the word for tabby - the iconic mixed-breed street cat found on every corner of Istanbul. Tekir cats are not bred for pedigree. They are forged by the streets: resilient, cunning, genetically diverse, and sharpened by generations of natural selection. They don't need a breeder or a manual - they figure things out. That's exactly what TEKIR does for APIs: it gives every response the street smarts to explain itself, so agents can figure out what to do next without guessing. It stands for **T**ransparent **E**ndpoint **K**nowledge for **I**ntelligent **R**easoning.

---

## Design Goals

- Backwards compatible with existing HTTP APIs
- Compatible with RFC 9457 Problem Details
- Provide structured hints for automated agents
- Avoid breaking existing clients
- Remain framework and language agnostic

---

## Extension Fields

| Field | Type | Description |
|-------|------|-------------|
| `reason` | `string` | Why the response has this outcome |
| `limitations` | `array` | Constraints that affected the response |
| `next_actions` | `array` | Machine-actionable follow-up steps |
| `agent_guidance` | `array` | Natural-language instructions for agents |
| `user_confirmation_required` | `boolean` | Must the agent ask the user first? |
| `retry_policy` | `object` | Structured retry hints |
| `links` | `array` | Related resources (RFC 8288) |

All fields are optional. Add them incrementally - even a single `next_actions` field makes your API dramatically more useful for AI agents.

See the [full specification](./spec/tekir-v0.1.md) for detailed field definitions and rules.

---

## Quick Start

### Option 1: Claude Code Plugin

Install as a Claude Code plugin - gives you the `/tekir` skill.

```bash
# Add the marketplace
/plugin marketplace add tangelo-ltd/tekir

# Install the plugin
/plugin install tekir@tangelo-ltd-tekir
```

Then type `/tekir` before asking Claude to build an API endpoint.

### Option 2: Drop-in AI Instructions (zero install)

Copy [`TEKIR.md`](./TEKIR.md) into your project root or `.claude/` folder. Your AI coding assistant will automatically build TEKIR-compliant responses.

```bash
# For Claude Code / Claude
curl -o TEKIR.md https://raw.githubusercontent.com/tangelo-ltd/tekir/main/TEKIR.md

# For Cursor
curl -o .cursorrules https://raw.githubusercontent.com/tangelo-ltd/tekir/main/prompts/cursor-rules.md
```

That's it. Next time you ask Claude or Cursor to build an API endpoint, it will include TEKIR fields automatically.

### Option 3: TypeScript Package (coming soon)

```bash
npm install tekir   # not yet published - coming soon
```

```typescript
import { tekir, action, guidance, link } from 'tekir';

// Enrich any response with TEKIR fields
const response = tekir(
  { id: 'order_123', status: 'confirmed', total: 149.99 },
  {
    next_actions: [
      action('track', 'Track shipment', '/orders/order_123/tracking', {
        effect: 'read',
      }),
      action('cancel', 'Cancel order', '/orders/order_123', {
        method: 'DELETE',
        effect: 'delete',
      }),
    ],
    agent_guidance: guidance(
      'Confirm the order details with the user.',
    ),
    user_confirmation_required: true,
    links: [
      link('help', 'https://api.example.com/docs/orders', {
        title: 'Orders API docs',
      }),
    ],
  }
);
```

### Option 4: Express / Fastify Middleware

```typescript
// Express
import express from 'express';
import { tekirExpress } from 'tekir/express';
import { action } from 'tekir';

const app = express();
app.use(tekirExpress());

app.post('/orders', (req, res) => {
  const order = { id: 'order_123', status: 'confirmed' };

  res.tekir({
    next_actions: [
      action('track', 'Track shipment', `/orders/${order.id}/tracking`, {
        effect: 'read',
      }),
    ],
  });

  res.status(201).json(order);
  // TEKIR fields are automatically merged into the response
});
```

```typescript
// Fastify
import Fastify from 'fastify';
import { tekirFastify } from 'tekir/fastify';
import { action } from 'tekir';

const app = Fastify();
app.register(tekirFastify);

app.post('/orders', (request, reply) => {
  const order = { id: 'order_123', status: 'confirmed' };

  reply.tekir({
    next_actions: [
      action('track', 'Track shipment', `/orders/${order.id}/tracking`, {
        effect: 'read',
      }),
    ],
  });

  reply.status(201).send(order);
});
```

---

## Why TEKIR?

- **For AI agents** - Agents consuming your API get structured guidance instead of guessing
- **For any response** - Works with 200 OK, 404 Not Found, 429 Rate Limited, everything
- **Backwards compatible** - Extends RFC 9457; unknown fields are safely ignored by existing clients
- **Incrementally adoptable** - Add one field at a time, starting with `next_actions`
- **Framework agnostic** - Works with any language, any framework, any API
- **Safe by default** - Effectful actions require explicit confirmation flags
- **10-minute integration** - Drop in `TEKIR.md` or install the npm package

---

## How TEKIR Complements Other Standards

| Standard | What it does | How TEKIR fits |
|----------|-------------|----------------|
| [**RFC 9457**](https://www.rfc-editor.org/rfc/rfc9457) | Error response envelope | TEKIR extends it beyond errors to all responses |
| [**MCP**](https://modelcontextprotocol.io) | Tool discovery and invocation for agents | TEKIR handles what happens *after* the tool call - the response |
| [**OpenAPI**](https://www.openapis.org) | API contract at design time | TEKIR provides runtime response metadata |
| [**HATEOAS**](https://en.wikipedia.org/wiki/HATEOAS) | Hypermedia-driven APIs | TEKIR makes hypermedia controls practical for LLM agents |

---

## Examples

See the [`examples/`](./examples/) folder for complete JSON examples:

- [200 - Success with guidance](./examples/200-success-with-guidance.json) - Order creation with follow-up actions
- [401 - Unauthorized](./examples/401-unauthorized.json) - Auth failure with re-authentication guidance
- [403 - Forbidden](./examples/403-forbidden.json) - Policy restriction with alternatives
- [410 - Gone](./examples/410-gone.json) - Archived resource with recovery steps
- [429 - Rate Limited](./examples/429-rate-limit.json) - Rate limit with structured retry policy

---

## JSON Schema

Validate your TEKIR responses against the official schema:

```json
{ "$ref": "https://raw.githubusercontent.com/tangelo-ltd/tekir/main/schema/tekir.schema.json" }
```

Or use the local schema file: [`schema/tekir.schema.json`](./schema/tekir.schema.json)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Spec proposals should be opened as GitHub Issues with the `[Proposal]` tag.

---

## License

[MIT](./LICENSE) - Tangelo Bilisim Ltd.

---

## Disclaimer

TEKIR is a free and open-source community project, provided under the [MIT License](./LICENSE). It is distributed in the hope that it will be useful, but **without any warranty** - without even the implied warranty of merchantability or fitness for a particular purpose.

This is a non-commercial project. The authors and contributors accept no liability for any damages or losses arising from the use of this software or specification. Use it at your own risk.

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

<p align="center">
  <em>Built with care by <a href="https://tangelo.com.tr">Tangelo Bilisim Ltd.</a> - a small company based in Antalya, Turkey.</em>
</p>
