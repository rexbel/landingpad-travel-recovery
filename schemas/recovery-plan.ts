import { z } from "zod";
import { stayOptionSchema } from "./stay-option";

export const localContextItemSchema = z.object({
  claim: z.string().min(1),
  url: z.url(),
  sourceMode: z.literal("tavily-web"),
});

export const recoveryPlanSchema = z.object({
  label: z.enum(["fastest", "best-value", "best-rest"]),
  stay: stayOptionSchema,
  rationale: z.array(z.string().min(1)),
  tradeoffs: z.array(z.string().min(1)),
  localContext: z.array(localContextItemSchema),
  assumptions: z.array(z.string().min(1)),
  rejectedConstraints: z.array(z.string().min(1)),
});

export type LocalContextItem = z.infer<typeof localContextItemSchema>;
export type RecoveryPlan = z.infer<typeof recoveryPlanSchema>;
