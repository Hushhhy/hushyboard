import { z } from 'zod';

// Gemini rejects some JSON Schema keywords with a bare "400 invalid argument".
// We send it only a conservative subset; the full Zod schema still validates the answer
// (lengths, limits, required texts).
const KEPT_KEYWORDS = new Set([
  'type',
  'properties',
  'required',
  'items',
  'description',
  'enum',
  'anyOf',
  'nullable',
]);

function keepSupported(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(keepSupported);
  if (!node || typeof node !== 'object') return node;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!KEPT_KEYWORDS.has(key)) continue;
    if (key === 'properties' && value && typeof value === 'object') {
      // Property names are data, not keywords: keep them all.
      result.properties = Object.fromEntries(
        Object.entries(value).map(([name, child]) => [name, keepSupported(child)])
      );
    } else {
      result[key] = keepSupported(value);
    }
  }
  return result;
}

export function toGeminiSchema(schema: z.ZodType): unknown {
  return keepSupported(z.toJSONSchema(schema, { target: 'draft-7', io: 'input' }));
}
