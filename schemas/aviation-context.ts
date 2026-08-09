import { z } from "zod";

export const aviationEvidenceSchema = z.object({
  provider: z.literal("AeroXplorer"),
  classification: z.literal("historical"),
  label: z.literal("Historical aviation data"),
  retrievedAt: z.iso.datetime(),
});

export const aviationContextSchema = z.object({
  mode: z.enum(["aeroxplorer-historical", "airport-metadata-only", "unavailable"]),
  airport: z
    .object({
      iata: z.string().length(3),
      name: z.string().min(1),
      city: z.string().min(1).optional(),
      region: z.string().min(1).optional(),
      country: z.string().min(1).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
    })
    .optional(),
  historicalFlight: z
    .object({
      airlineCode: z.string().min(1),
      flightNumber: z.string().min(1),
      originIata: z.string().length(3).optional(),
      destinationIata: z.string().length(3).optional(),
      observationWindow: z.string().min(1).optional(),
      observations: z.number().int().nonnegative().optional(),
      cancellationRate: z.number().min(0).max(1).optional(),
      delayRate: z.number().min(0).max(1).optional(),
      diversionRate: z.number().min(0).max(1).optional(),
    })
    .optional(),
  evidence: z.array(aviationEvidenceSchema),
  warnings: z.array(z.string().min(1)),
});

export type AviationEvidence = z.infer<typeof aviationEvidenceSchema>;
export type AviationContext = z.infer<typeof aviationContextSchema>;
