/**
 * TEKIR Express middleware.
 *
 * Adds a `res.tekir(fields)` method to Express response objects.
 * When `res.json()` is called, any attached TEKIR fields are automatically
 * merged into the response body.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { tekirExpress } from 'tekir/express';
 * import { action } from 'tekir';
 *
 * const app = express();
 * app.use(tekirExpress());
 *
 * app.get('/orders/:id', (req, res) => {
 *   res.tekir({
 *     next_actions: [
 *       action('cancel', 'Cancel order', `/orders/${req.params.id}/cancel`, {
 *         method: 'POST',
 *         effect: 'write',
 *       }),
 *     ],
 *   });
 *   res.json({ id: req.params.id, status: 'confirmed' });
 * });
 * ```
 */

import type { TekirFields } from '../types.js';

/**
 * Augment the Express Response interface to include the tekir() method.
 * This allows TypeScript users to call res.tekir() without casting.
 */
declare global {
  namespace Express {
    interface Response {
      tekir(fields: TekirFields): void;
    }
  }
}

/**
 * Minimal type for an Express-like request object.
 */
interface ExpressRequest {
  [key: string]: unknown;
}

/**
 * Minimal type for an Express-like response object.
 */
interface ExpressResponse {
  json: (body: unknown) => unknown;
  tekir?: (fields: TekirFields) => void;
  [key: string]: unknown;
}

/**
 * Minimal type for an Express-like next function.
 */
type ExpressNext = (err?: unknown) => void;

/**
 * Symbol used to store TEKIR fields on the response object internally.
 */
const TEKIR_FIELDS = Symbol('tekirFields');

/**
 * Creates an Express middleware that adds TEKIR support to response objects.
 *
 * The middleware:
 * 1. Adds a `res.tekir(fields)` method for attaching TEKIR metadata
 * 2. Wraps `res.json()` to merge TEKIR fields into the response body
 *
 * @returns Express middleware function
 */
export function tekirExpress() {
  return function tekirMiddleware(
    _req: ExpressRequest,
    res: ExpressResponse,
    next: ExpressNext,
  ): void {
    // Storage for TEKIR fields on this response
    const storage: Record<string | symbol, TekirFields | undefined> = res as never;
    storage[TEKIR_FIELDS] = undefined;

    // Add the tekir() method to the response
    res.tekir = function setTekirFields(fields: TekirFields): void {
      // Merge with any previously set fields
      const existing = storage[TEKIR_FIELDS];
      if (existing) {
        storage[TEKIR_FIELDS] = { ...existing, ...fields };
      } else {
        storage[TEKIR_FIELDS] = fields;
      }
    };

    // Wrap res.json() to merge TEKIR fields before sending
    const originalJson = res.json.bind(res);
    res.json = function tekirJson(body: unknown): unknown {
      const tekirFields = storage[TEKIR_FIELDS];

      if (tekirFields && body !== null && body !== undefined && typeof body === 'object') {
        // Merge TEKIR fields into the response body
        const enriched = { ...(body as Record<string, unknown>), ...tekirFields };
        return originalJson(enriched);
      }

      return originalJson(body);
    };

    next();
  };
}
