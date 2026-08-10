import { z } from "zod";

export const aeroXplorerTokenResponseSchema = z.object({
  bearer: z.string().min(1),
  expiration: z.number().positive(),
});
export type AeroXplorerTokenResponse = z.infer<typeof aeroXplorerTokenResponseSchema>;

export const aeroXplorerAirportSchema = z.object({
  iata: z.string().length(3),
  name: z.string().min(1),
  location: z.string().optional(),
  description: z.string().optional(),
  // The live API returns these as numeric strings (e.g. "40.634638"), not
  // JSON numbers — coerce rather than require z.number(), which rejected
  // every real airport response outright. z.coerce.number() still rejects
  // genuinely non-numeric input, it just also accepts "40.63".
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export const aeroXplorerAirportResponseSchema = z.object({
  results: z.array(aeroXplorerAirportSchema),
});
export type AeroXplorerAirportResponse = z.infer<typeof aeroXplorerAirportResponseSchema>;

// The API returns individual historical flight-leg records, not pre-aggregated
// rates. cancelled/diverted may come back as booleans or 0/1 depending on the
// leg; we normalize both. Unknown extra fields are ignored, not surfaced.
export const aeroXplorerOtpRecordSchema = z
  .object({
    cancelled: z.union([z.boolean(), z.number()]).optional(),
    diverted: z.union([z.boolean(), z.number()]).optional(),
    arrdelayminutes: z.number().optional(),
  })
  .passthrough();
export type AeroXplorerOtpRecord = z.infer<typeof aeroXplorerOtpRecordSchema>;

export const aeroXplorerOtpResponseSchema = z.object({
  results: z.array(aeroXplorerOtpRecordSchema),
});
export type AeroXplorerOtpResponse = z.infer<typeof aeroXplorerOtpResponseSchema>;
