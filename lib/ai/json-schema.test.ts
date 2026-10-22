import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { resumeContentSchema } from '@/lib/resume/schema';
import { toGeminiSchema } from './json-schema';

describe('toGeminiSchema', () => {
  it('keeps structure and descriptions, drops unsupported keywords', () => {
    const schema = z.object({
      title: z.string().min(1).max(80).describe('Job title'),
      tags: z.array(z.string().max(20)).max(5),
      kind: z.enum(['A', 'B']),
    });
    expect(toGeminiSchema(schema)).toEqual({
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Job title' },
        tags: { type: 'array', items: { type: 'string' } },
        kind: { type: 'string', enum: ['A', 'B'] },
      },
      required: ['title', 'tags', 'kind'],
    });
  });

  it('keeps a property even if it is named like a keyword', () => {
    const schema = z.object({ description: z.string(), type: z.string() });
    const result = toGeminiSchema(schema) as { properties: Record<string, unknown> };
    expect(Object.keys(result.properties)).toEqual(['description', 'type']);
  });

  it('produces no $schema, additionalProperties or length keywords for the CV schema', () => {
    const text = JSON.stringify(toGeminiSchema(resumeContentSchema));
    for (const keyword of [
      '$schema',
      'additionalProperties',
      'maxLength',
      'minLength',
      'maxItems',
    ]) {
      expect(text).not.toContain(`"${keyword}"`);
    }
    expect(text).toContain('"experiences"');
  });
});
