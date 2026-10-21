import { describe, expect, it } from 'vitest';
import { withSearchParam } from './url';

describe('withSearchParam', () => {
  it('adds a param and keeps the others', () => {
    expect(withSearchParam('/career/job-search', 'status=SENT', 'panel', 'app_1')).toBe(
      '/career/job-search?status=SENT&panel=app_1'
    );
  });

  it('replaces an existing value', () => {
    expect(withSearchParam('/finance', '?panel=a&month=2026-10', 'panel', 'b')).toBe(
      '/finance?panel=b&month=2026-10'
    );
  });

  it('removes the param and drops an empty query', () => {
    expect(withSearchParam('/finance', 'panel=a', 'panel', null)).toBe('/finance');
    expect(withSearchParam('/finance', 'panel=a&month=2026-10', 'panel', null)).toBe(
      '/finance?month=2026-10'
    );
  });

  it('encodes values', () => {
    expect(withSearchParam('/mail', '', 'q', 'from:qonto é')).toBe('/mail?q=from%3Aqonto+%C3%A9');
  });
});
