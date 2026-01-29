// AES-256-GCM encryption for API keys
// Uses NEXTAUTH_SECRET as the base for key derivation

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits
const SALT = 'crm-api-keys-salt'; // Static salt for consistency

function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for encryption');
  }
  // Derive a 256-bit key using scrypt
  return scryptSync(secret, SALT, KEY_LENGTH);
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns format: iv:authTag:ciphertext (all base64 encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts a string encrypted with encrypt()
 * Expects format: iv:authTag:ciphertext (all base64 encoded)
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const [ivBase64, authTagBase64, ciphertext] = parts;

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid IV length');
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid auth tag length');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks an API key for display, showing only first 4 and last 4 characters
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) {
    return '*'.repeat(apiKey.length);
  }
  const first = apiKey.slice(0, 4);
  const last = apiKey.slice(-4);
  const middle = '*'.repeat(Math.min(apiKey.length - 8, 20));
  return `${first}${middle}${last}`;
}

/**
 * Validates that a string appears to be an encrypted value
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;

  try {
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    return iv.length === IV_LENGTH && authTag.length === AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}
