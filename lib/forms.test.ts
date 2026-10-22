import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fieldErrors, formValues } from './forms';

describe('fieldErrors', () => {
  it('keeps the first message per field', () => {
    const schema = z.object({
      name: z.string().min(1, 'Donne un nom.').max(3, 'Trop long.'),
      zone: z.string().min(1, 'Indique une zone.'),
    });
    const result = schema.safeParse({ name: '', zone: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({
        name: 'Donne un nom.',
        zone: 'Indique une zone.',
      });
    }
  });
});

describe('formValues', () => {
  it('trims strings and drops React internals', () => {
    const data = new FormData();
    data.set('name', '  Docker  ');
    data.set('$ACTION_ID_abc', 'x');
    expect(formValues(data)).toEqual({ name: 'Docker' });
  });
});
