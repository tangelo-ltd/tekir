# TEKIR - Project Guide

This is the TEKIR project - Transparent Endpoint Knowledge for Intelligent Reasoning.

A standard for HTTP API responses that are self-explaining for AI agents.
By Tangelo Bilisim Ltd.

## Stack

- TypeScript, ESM, Node 22+
- No runtime dependencies
- Express and Fastify as optional peer dependencies (middleware only)

## Commands

- `npm run build` - Compile TypeScript to dist/
- `npm test` - Run tests

## Structure

- `src/` - TypeScript reference implementation (types, builders, middleware)
- `spec/` - The TEKIR specification
- `schema/` - JSON Schema for TEKIR fields
- `examples/` - Example JSON responses
- `prompts/` - AI coding assistant prompts (Cursor, etc.)
- `TEKIR.md` - Drop-in instructions file for AI assistants

## Code Style

- Pure functions, no classes
- ESM imports with .js extensions
- Use regular dashes (-) everywhere, never em dashes
- Keep it simple - minimal abstractions
