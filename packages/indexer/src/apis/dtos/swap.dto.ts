import { z } from 'zod';

export const swapSchema = z.object({
  offerJettonAddress: z.string().min(1),
  offerAmount: z.string().min(1),
  askJettonAddress: z.string().min(1),
  senderAddress: z.string().min(1),
});

export type SwapDto = z.infer<typeof swapSchema>;
