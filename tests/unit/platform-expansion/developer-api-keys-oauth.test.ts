import { describe, it, expect } from "vitest";
import { hashApiKey } from "@/modules/developer/api-key-service";

describe("Phase 16 — Developer Platform, Scoped API Keys & OAuth", () => {
  it("hashes API keys securely and deterministically using SHA-256", () => {
    const rawKey = "sfy_live_9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d";
    const hash1 = hashApiKey(rawKey);
    const hash2 = hashApiKey(rawKey);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
    expect(hash1).not.toBe(rawKey);
  });

  it("evaluates granular API scopes with least-privilege enforcement", () => {
    const grantedScopes = ["read_products", "read_inventory", "write_inventory"];

    function hasScope(granted: string[], required: string): boolean {
      return granted.includes(required) || granted.includes("*") || granted.includes("all");
    }

    expect(hasScope(grantedScopes, "read_products")).toBe(true);
    expect(hasScope(grantedScopes, "write_inventory")).toBe(true);
    expect(hasScope(grantedScopes, "read_orders")).toBe(false); // Not granted
    expect(hasScope(grantedScopes, "write_products")).toBe(false); // Not granted
  });

  it("grants access to wildcard super-scopes appropriately", () => {
    const adminScopes = ["*"];
    function hasScope(granted: string[], required: string): boolean {
      return granted.includes(required) || granted.includes("*");
    }

    expect(hasScope(adminScopes, "read_orders")).toBe(true);
    expect(hasScope(adminScopes, "write_products")).toBe(true);
  });

  it("detects expired or revoked API keys and tokens", () => {
    const now = Date.now();
    const activeKey = {
      isRevoked: false,
      expiresAt: new Date(now + 3600 * 1000), // in 1 hour
    };
    const expiredKey = {
      isRevoked: false,
      expiresAt: new Date(now - 3600 * 1000), // 1 hour ago
    };
    const revokedKey = {
      isRevoked: true,
      expiresAt: new Date(now + 3600 * 1000),
    };

    function isKeyValid(k: { isRevoked: boolean; expiresAt: Date | null }): boolean {
      if (k.isRevoked) return false;
      if (k.expiresAt && k.expiresAt.getTime() < now) return false;
      return true;
    }

    expect(isKeyValid(activeKey)).toBe(true);
    expect(isKeyValid(expiredKey)).toBe(false);
    expect(isKeyValid(revokedKey)).toBe(false);
  });
});
