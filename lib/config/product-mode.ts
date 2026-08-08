export type ProductMode = "recovery" | "event";

export function getProductMode(): ProductMode {
  return process.env.NEXT_PUBLIC_PRODUCT_MODE === "event" ? "event" : "recovery";
}
