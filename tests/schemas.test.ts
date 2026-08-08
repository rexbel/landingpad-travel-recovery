import { describe, expect, it } from "vitest";
import { primaryTripRequest } from "@/lib/data/demo-cases";
import { tripRequestSchema } from "@/schemas/trip-request";

describe("tripRequestSchema", () => {
  it("accepts the primary JFK recovery scenario", () => {
    expect(tripRequestSchema.parse(primaryTripRequest)).toEqual(primaryTripRequest);
  });

  it("rejects checkout on or before check-in", () => {
    const result = tripRequestSchema.safeParse({
      ...primaryTripRequest,
      checkout: primaryTripRequest.checkin,
    });

    expect(result.success).toBe(false);
  });

  it("requires disruption context in recovery mode", () => {
    const result = tripRequestSchema.safeParse({
      ...primaryTripRequest,
      disruption: undefined,
    });

    expect(result.success).toBe(false);
  });
});
