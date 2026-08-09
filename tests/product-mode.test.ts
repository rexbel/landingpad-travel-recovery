import { afterEach, describe, expect, it, vi } from "vitest";
import { getProductMode } from "@/lib/config/product-mode";

describe("product mode configuration fallback", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to recovery mode when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "");
    expect(getProductMode()).toBe("recovery");
  });

  it("switches to EventStay only on an explicit event flag", () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "event");
    expect(getProductMode()).toBe("event");
  });

  it("falls back to recovery for any unrecognized value rather than failing", () => {
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "not-a-real-mode");
    expect(getProductMode()).toBe("recovery");
  });
});
