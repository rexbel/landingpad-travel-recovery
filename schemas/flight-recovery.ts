import { z } from "zod";

export const flightRecoveryOptionSchema = z.object({
  label: z.string().min(1),
  url: z.url(),
  sourceMode: z.literal("tavily-web"),
});

export const flightRecoveryEvidenceSchema = z.object({
  provider: z.enum(["Tavily", "AeroXplorer"]),
  label: z.string().min(1),
  retrievedAt: z.iso.datetime(),
});

export const flightRecoveryContextSchema = z.object({
  mode: z.enum(["flight-recovery", "unavailable"]),
  options: z.array(flightRecoveryOptionSchema).max(3),
  historicalContext: z
    .object({
      originIata: z.string().length(3),
      destinationIata: z.string().length(3).optional(),
      onTimeRate: z.number().min(0).max(1).optional(),
      observations: z.number().int().nonnegative().optional(),
      observationWindow: z.string().min(1).optional(),
    })
    .optional(),
  evidence: z.array(flightRecoveryEvidenceSchema),
  warnings: z.array(z.string().min(1)),
});

export type FlightRecoveryOption = z.infer<typeof flightRecoveryOptionSchema>;
export type FlightRecoveryEvidence = z.infer<typeof flightRecoveryEvidenceSchema>;
export type FlightRecoveryContext = z.infer<typeof flightRecoveryContextSchema>;
