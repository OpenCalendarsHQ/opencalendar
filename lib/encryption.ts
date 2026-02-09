/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits authentication tag
const SALT_LENGTH = 32; // 256 bits salt

/**
 * Get encryption key from environment
 * In production, use a dedicated encryption key from secure key management (AWS KMS, HashiCorp Vault, etc.)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.NEON_AUTH_COOKIE_SECRET;

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY or NEON_AUTH_COOKIE_SECRET must be set for token encryption"
    );
  }

  // Derive a 32-byte key from the secret
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypt sensitive data (tokens, passwords, etc.)
 * @param plaintext - The data to encrypt
 * @returns Encrypted data in format: iv:authTag:ciphertext (base64)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty string");
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all base64 encoded)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 * @param encrypted - Encrypted data in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) {
    throw new Error("Cannot decrypt empty string");
  }

  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivBase64, authTagBase64, ciphertext] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a string is encrypted (has the correct format)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(":");
  return parts.length === 3;
}

/**
 * Safely encrypt if not already encrypted
 */
export function encryptIfNeeded(value: string | null): string | null {
  if (!value) return null;
  if (isEncrypted(value)) return value;
  return encrypt(value);
}

/**
 * Safely decrypt if encrypted, otherwise return as-is
 */
export function decryptIfNeeded(value: string | null): string | null {
  if (!value) return null;
  if (!isEncrypted(value)) return value;
  try {
    return decrypt(value);
  } catch (error) {
    console.error("Failed to decrypt value:", error);
    return null;
  }
}
