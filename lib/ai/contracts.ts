import { z } from "zod";
import { recoveryPlanSchema } from "@/schemas/recovery-plan";
import { stayOptionSchema } from "@/schemas/stay-option";
import { tripRequestSchema } from "@/schemas/trip-request";

export const extractRequestSchema = z.object({
  transcript: z.string().trim().min(1).max(8_000),
  referenceDate: z.iso.date().optional(),
  mode: z.enum(["recovery", "event"]).default("recovery"),
});

export const extractionResultSchema = z.object({
  tripRequest: tripRequestSchema,
  missingFields: z.array(z.string().min(1)),
  extractionMode: z.enum(["inference", "demo"]),
});

const constraintEvidenceSchema = z.object({
  verified: z.array(z.string().min(1)).default([]),
  contradicted: z.array(z.string().min(1)).default([]),
  unknown: z.array(z.string().min(1)).default([]),
});

export const rankCandidateSchema = z.object({
  stay: stayOptionSchema,
  proximityMinutes: z.number().nonnegative().optional(),
  recoveryFrictionScore: z.number().min(0).max(1).optional(),
  preferenceMatchScore: z.number().min(0).max(1).optional(),
  sourceCompletenessScore: z.number().min(0).max(1).optional(),
  constraintEvidence: constraintEvidenceSchema.optional(),
});

export const rankRequestSchema = z.object({
  tripRequest: tripRequestSchema,
  candidates: z.array(rankCandidateSchema).max(100),
  localContext: z
    .array(
      z.object({
        claim: z.string().min(1),
        url: z.url(),
        sourceMode: z.literal("tavily-web"),
      }),
    )
    .default([]),
  stretchApproved: z.boolean().default(false),
});

export const rankedRecoverySchema = z.object({
  plans: z.array(recoveryPlanSchema).max(3),
  excluded: z.array(
    z.object({
      stayId: z.string().min(1),
      reasons: z.array(z.string().min(1)).min(1),
    }),
  ),
  relaxations: z.array(z.enum(["increase-budget", "widen-area", "alternate-area"])),
});

export const handoffRequestSchema = z.object({
  tripRequest: tripRequestSchema,
  selectedPlan: recoveryPlanSchema.optional(),
  openQuestions: z.array(z.string().trim().min(1)).default([]),
});

export const handoffResultSchema = z.object({
  summary: z.string().min(1),
  confirmedFacts: z.array(z.string().min(1)),
  openQuestions: z.array(z.string().min(1)),
  selectedStay: stayOptionSchema.optional(),
  bookingUrl: z.url().optional(),
  requiresApproval: z.literal(true),
});

export type ExtractRequest = z.infer<typeof extractRequestSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
export type RankRequest = z.infer<typeof rankRequestSchema>;
export type RankedRecovery = z.infer<typeof rankedRecoverySchema>;
export type HandoffRequest = z.infer<typeof handoffRequestSchema>;
export type HandoffResult = z.infer<typeof handoffResultSchema>;
