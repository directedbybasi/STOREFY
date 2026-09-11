import { z } from "zod";

export const CANONICAL_API_SCOPES = [
  "read_products",
  "write_products",
  "read_orders",
  "write_orders",
  "read_customers",
  "write_customers",
  "read_inventory",
  "write_inventory",
  "read_locations",
  "read_pages",
  "write_pages",
] as const;

export type ApiScope = (typeof CANONICAL_API_SCOPES)[number];

export const CreateApiKeySchema = z.object({
  storeId: z.string().uuid(),
  label: z.string().min(2).max(255),
  scopes: z.array(z.string()).min(1),
  expiresInDays: z.number().int().positive().optional(),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;

export const CreateDeveloperAppSchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  redirectUris: z.array(z.string().url()).min(1),
});

export type CreateDeveloperAppInput = z.infer<typeof CreateDeveloperAppSchema>;

export const RegisterWebhookEndpointSchema = z.object({
  storeId: z.string().uuid(),
  url: z.string().url(),
  description: z.string().optional(),
  eventTypes: z.array(z.string()).min(1),
});

export type RegisterWebhookEndpointInput = z.infer<typeof RegisterWebhookEndpointSchema>;

export interface DeveloperAuthContext {
  storeId: string;
  scopes: string[];
  keyId?: string;
  appId?: string;
  authType: "API_KEY" | "OAUTH_TOKEN";
}
