import { z } from "zod";
import { sourceModeSchema } from "./source-mode";

export const stayOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1).optional(),
  supplier: z.string().min(1),
  totalPrice: z.number().nonnegative(),
  currency: z.string().length(3),
  bookingUrl: z.url(),
  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  sourceMode: sourceModeSchema,
});

export type StayOption = z.infer<typeof stayOptionSchema>;
