import { z } from "zod";

export const sourceModeSchema = z.enum([
  "user",
  "stay22-live",
  "tavily-web",
  "inference",
  "demo",
]);

export type SourceMode = z.infer<typeof sourceModeSchema>;
