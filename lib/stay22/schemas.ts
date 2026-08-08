import { z } from "zod";

const supplierSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  link: z.url(),
  price: z
    .object({
      total: z.number().positive(),
    })
    .nullable()
    .optional(),
});

export const stay22ResponseSchema = z.object({
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
    currency: z.string().length(3).transform((value) => value.toUpperCase()),
    checkin: z.string().optional(),
    checkout: z.string().optional(),
    nights: z.number().int().positive().optional(),
  }),
  results: z.array(
    z.object({
      id: z.union([z.string(), z.number()]).transform(String),
      name: z.string().min(1),
      type: z.string().min(1).optional(),
      url: z.url(),
      suppliers: z.record(z.string(), supplierSchema),
      location: z
        .object({
          coordinates: z
            .object({
              lat: z.number().min(-90).max(90),
              lng: z.number().min(-180).max(180),
            })
            .optional(),
        })
        .optional(),
    }),
  ),
});

export type Stay22Response = z.infer<typeof stay22ResponseSchema>;
