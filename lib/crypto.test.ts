import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken } from './crypto';

const key = Buffer.alloc(32, 1).toString('base64');
const otherKey = Buffer.alloc(32, 2).toString('base64');

describe('encryptToken / decryptToken', () => {
  it('round-trips a token, with a new IV every time', () => {
    const a = encryptToken('1//refresh-token', key);
    const b = encryptToken('1//refresh-token', key);
    expect(a).not.toBe(b);
    expect(a).not.toContain('refresh-token');
    expect(decryptToken(a, key)).toBe('1//refresh-token');
  });

  it('refuses another key or a changed value', () => {
    const value = encryptToken('secret', key);
    expect(() => decryptToken(value, otherKey)).toThrow();
    const parts = value.split(':');
    parts[3] = Buffer.from('tampered').toString('base64');
    expect(() => decryptToken(parts.join(':'), key)).toThrow();
    expect(() => decryptToken('plain-text', key)).toThrow('Unknown token format.');
  });

  it('refuses a key that is not 32 bytes', () => {
    expect(() => encryptToken('x', Buffer.alloc(16).toString('base64'))).toThrow('32 bytes');
  });
});
