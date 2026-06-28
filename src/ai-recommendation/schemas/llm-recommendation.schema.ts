import { z } from 'zod';

export const LlmRecommendationItemSchema = z.object({
  action: z.enum(['ADD', 'REMOVE', 'KEEP']),
  systemName: z.string().min(1),
  entitlementKey: z.string().min(1),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
  policyCitation: z.string().min(1),
});

export const LlmRecommendationResponseSchema = z.object({
  recommendations: z.array(LlmRecommendationItemSchema).min(1),
});

export type LlmRecommendationResponse = z.infer<
  typeof LlmRecommendationResponseSchema
>;