import { encrypt, decrypt } from "@/lib/encryption";

export interface DecryptedCredentials {
  keyId?: string;
  keySecret?: string;
  appId?: string;
  secretKey?: string;
  webhookSecret?: string;
  [key: string]: string | undefined;
}

export interface MaskedCredentials {
  keyId?: string;
  keySecret?: string;
  appId?: string;
  secretKey?: string;
  webhookSecret?: string;
  [key: string]: string | undefined;
}

/**
 * Encrypts an object of provider credentials into an AES-256-GCM cipher string.
 */
export function encryptCredentials(creds: DecryptedCredentials): string {
  const json = JSON.stringify(creds);
  return encrypt(json);
}

/**
 * Decrypts an AES-256-GCM cipher string back into provider credentials.
 */
export function decryptCredentials(encryptedPayload: string): DecryptedCredentials {
  try {
    const json = decrypt(encryptedPayload);
    return JSON.parse(json);
  } catch (err) {
    throw new Error(
      `Failed to decrypt credentials from vault: ${err instanceof Error ? err.message : "Cipher error"}`
    );
  }
}

/**
 * Masks a sensitive string for safe client display (e.g., "rzp_test_1234567890" -> "rzp_test_••••••••7890").
 */
export function maskSecret(secret?: string, visibleChars = 4): string {
  if (!secret) return "";
  if (secret.length <= visibleChars * 2) {
    return "••••••••";
  }
  const prefix = secret.slice(0, Math.min(visibleChars, 4));
  const suffix = secret.slice(-visibleChars);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Checks if a string is a masked placeholder from the client UI.
 */
export function isMaskedPlaceholder(value?: string): boolean {
  if (!value) return false;
  return value.includes("••••") || value.includes("****");
}

/**
 * Produces a client-safe masked copy of merchant payment credentials.
 */
export function getMaskedCredentials(creds: DecryptedCredentials): MaskedCredentials {
  const masked: MaskedCredentials = {};
  for (const [k, v] of Object.entries(creds)) {
    if (!v) continue;
    if (k.toLowerCase().includes("id") || k.toLowerCase().includes("appid")) {
      masked[k] = v.length > 8 ? `${v.slice(0, 8)}••••` : "••••";
    } else {
      masked[k] = maskSecret(v, 4);
    }
  }
  return masked;
}
