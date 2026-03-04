/**
 * TEKIR Fastify plugin.
 *
 * Decorates Fastify reply objects with a `.tekir(fields)` method.
 * TEKIR fields are automatically merged into the response payload
 * via an onSend hook.
 *
 * @example
 * ```ts
 * import Fastify from 'fastify';
 * import { tekirFastify } from 'tekir/fastify';
 * import { action } from 'tekir';
 *
 * const app = Fastify();
 * app.register(tekirFastify);
 *
 * app.get('/orders/:id', (request, reply) => {
 *   reply.tekir({
 *     next_actions: [
 *       action('cancel', 'Cancel order', `/orders/${request.params.id}/cancel`, {
 *         method: 'POST',
 *         effect: 'write',
 *       }),
 *     ],
 *   });
 *   return { id: request.params.id, status: 'confirmed' };
 * });
 * ```
 */

import type { TekirFields } from '../types.js';

/**
 * Minimal types so we do not require fastify as a direct dependency.
 * When fastify is installed, users get full type safety through the
 * module augmentation that fastify supports.
 */

interface FastifyReplyLike {
  tekir?: (fields: TekirFields) => void;
  _tekirFields?: TekirFields;
}

interface FastifyInstanceLike {
  decorateReply(name: string, value: unknown): void;
  addHook(name: string, handler: (...args: never[]) => void): void;
}

type FastifyPluginCallback = (
  instance: FastifyInstanceLike,
  opts: Record<string, unknown>,
  done: (err?: Error) => void,
) => void;

/**
 * Fastify plugin that adds TEKIR support to reply objects.
 *
 * The plugin:
 * 1. Decorates replies with a `tekir(fields)` method and internal `_tekirFields` storage
 * 2. Registers an onSend hook that merges TEKIR fields into JSON response bodies
 *
 * When using with TypeScript and fastify installed, augment the FastifyReply interface:
 *
 * ```ts
 * declare module 'fastify' {
 *   interface FastifyReply {
 *     tekir(fields: import('tekir').TekirFields): void;
 *   }
 * }
 * ```
 */
export const tekirFastify: FastifyPluginCallback = function tekirPlugin(
  fastify: FastifyInstanceLike,
  _opts: Record<string, unknown>,
  done: (err?: Error) => void,
): void {
  // Decorate reply with storage and setter
  fastify.decorateReply('_tekirFields', undefined);
  fastify.decorateReply('tekir', function setTekirFields(this: FastifyReplyLike, fields: TekirFields): void {
    const existing = this._tekirFields;
    if (existing) {
      this._tekirFields = { ...existing, ...fields };
    } else {
      this._tekirFields = fields;
    }
  });

  // Merge TEKIR fields into the response on send
  fastify.addHook(
    'onSend',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Fastify hook signature varies by version
    function tekirOnSend(
      _request: unknown,
      reply: unknown,
      payload: unknown,
      doneHook: unknown,
    ): void {
      const rep = reply as FastifyReplyLike;
      const done_ = doneHook as (err: Error | null, newPayload?: unknown) => void;
      const tekirFields = rep._tekirFields;

      if (!tekirFields) {
        done_(null);
        return;
      }

      // Only merge into JSON string payloads
      if (typeof payload === 'string') {
        try {
          const body = JSON.parse(payload) as Record<string, unknown>;
          const enriched = { ...body, ...tekirFields };
          done_(null, JSON.stringify(enriched));
          return;
        } catch {
          // Not valid JSON - pass through unchanged
          done_(null);
          return;
        }
      }

      done_(null);
    },
  );

  done();
};
