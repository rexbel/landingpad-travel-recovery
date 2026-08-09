import { z } from "zod";

const isoDateSchema = z.iso.date();

export const flightSchema = z.object({
  airlineCode: z.string().trim().min(1).max(4).transform((value) => value.toUpperCase()).optional(),
  flightNumber: z.string().trim().min(1).max(6).optional(),
  originIata: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  destinationIata: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  scheduledDate: isoDateSchema.optional(),
});

export const tripRequestSchema = z
  .object({
    mode: z.enum(["recovery", "event"]),
    currentLocation: z.string().trim().min(1).optional(),
    targetArea: z.string().trim().min(1),
    checkin: isoDateSchema,
    checkout: isoDateSchema,
    adults: z.number().int().min(1).max(20),
    children: z.number().int().min(0).max(20),
    rooms: z.number().int().min(1).max(10),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    hardBudgetTotal: z.number().positive().optional(),
    stretchBudgetTotal: z.number().positive().optional(),
    mustHaves: z.array(z.string().trim().min(1)),
    preferences: z.array(z.string().trim().min(1)),
    uncertainties: z.array(z.string().trim().min(1)),
    disruption: z
      .object({
        summary: z.string().trim().min(1),
        urgency: z.enum(["same-day", "next-day", "flexible"]),
      })
      .optional(),
    event: z
      .object({
        url: z.url().optional(),
        name: z.string().trim().min(1).optional(),
        venue: z.string().trim().min(1).optional(),
        startsAt: z.iso.datetime().optional(),
        endsAt: z.iso.datetime().optional(),
      })
      .optional(),
    flight: flightSchema.optional(),
    // Which half of the disruption the traveler asked for. Undefined means
    // ambiguous/unspecified and is treated as "both" downstream — this field
    // narrows, it never expands scope beyond what was actually said.
    assistanceScope: z.enum(["hotel", "flight", "both"]).optional(),
  })
  .superRefine((value, context) => {
    if (value.checkout <= value.checkin) {
      context.addIssue({
        code: "custom",
        path: ["checkout"],
        message: "Checkout must be after check-in.",
      });
    }

    if (
      value.hardBudgetTotal !== undefined &&
      value.stretchBudgetTotal !== undefined &&
      value.stretchBudgetTotal < value.hardBudgetTotal
    ) {
      context.addIssue({
        code: "custom",
        path: ["stretchBudgetTotal"],
        message: "Stretch budget cannot be lower than the hard budget.",
      });
    }

    if (value.mode === "recovery" && !value.disruption) {
      context.addIssue({
        code: "custom",
        path: ["disruption"],
        message: "Recovery mode requires disruption context.",
      });
    }

    if (value.mode === "event" && !value.event) {
      context.addIssue({
        code: "custom",
        path: ["event"],
        message: "Event mode requires event context.",
      });
    }
  });

export type TripRequest = z.infer<typeof tripRequestSchema>;
