import { z } from "zod";

export const CreateSalesChannelSchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().min(2),
  type: z.enum(["ONLINE_STORE", "POS", "B2B", "MARKETPLACE", "SOCIAL"]).default("ONLINE_STORE"),
  config: z.record(z.unknown()).default({}),
});

export type CreateSalesChannelInput = z.infer<typeof CreateSalesChannelSchema>;
