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
// rates. Per AeroXplorer's own OpenAPI spec (responseExample for /v1/travel/otp),
// these numeric-typed fields are actually serialized as JSON strings (e.g.
// "cancelled": "0.0", "arrdelayminutes": "13.0") — the same string-vs-number
// mismatch already found and fixed for airport lat/lng. z.coerce.number()
// converts those strings to real numbers so downstream consumers (which check
// `typeof === "number"`) keep working unchanged. arrdelayminutes is nullable
// per the spec; cancelled/diverted are not.
export const aeroXplorerOtpRecordSchema = z
  .object({
    cancelled: z.union([z.boolean(), z.coerce.number()]).optional(),
    diverted: z.union([z.boolean(), z.coerce.number()]).optional(),
    arrdelayminutes: z.coerce.number().nullish(),
  })
  .passthrough();
export type AeroXplorerOtpRecord = z.infer<typeof aeroXplorerOtpRecordSchema>;

export const aeroXplorerOtpResponseSchema = z.object({
  results: z.array(aeroXplorerOtpRecordSchema),
});
export type AeroXplorerOtpResponse = z.infer<typeof aeroXplorerOtpResponseSchema>;
