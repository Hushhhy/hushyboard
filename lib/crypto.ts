import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// AES-256-GCM for OAuth refresh tokens stored in the database.
// Format: "v1:<iv base64>:<auth tag base64>:<cipher text base64>". The key is 32 bytes (base64).

const VERSION = 'v1';

function keyFrom(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== 32) throw new Error('The encryption key must be 32 bytes.');
  return key;
}

export function encryptToken(plain: string, base64Key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(base64Key), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), encrypted]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64')))
    .join(':');
}

// Throws if the value was changed or encrypted with another key.
export function decryptToken(value: string, base64Key: string): string {
  const [version, iv, tag, encrypted] = value.split(':');
  if (version !== VERSION || !iv || !tag || !encrypted) throw new Error('Unknown token format.');
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(base64Key), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
