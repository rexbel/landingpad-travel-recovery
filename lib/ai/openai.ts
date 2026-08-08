import { z } from "zod";
import { tripRequestSchema, type TripRequest } from "@/schemas/trip-request";
import type { ExtractRequest, ExtractionResult } from "./contracts";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const responseEnvelopeSchema = z.object({
  output: z.array(
    z.object({
      type: z.string(),
      content: z
        .array(z.object({ type: z.string(), text: z.string().optional() }))
        .optional(),
    }),
  ),
});

const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] } as const;

const tripRequestJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["recovery", "event"] },
    currentLocation: nullableString,
    targetArea: { type: "string", minLength: 1 },
    checkin: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    checkout: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    adults: { type: "integer", minimum: 1, maximum: 20 },
    children: { type: "integer", minimum: 0, maximum: 20 },
    rooms: { type: "integer", minimum: 1, maximum: 10 },
    currency: { type: "string", minLength: 3, maxLength: 3 },
    hardBudgetTotal: nullableNumber,
    stretchBudgetTotal: nullableNumber,
    mustHaves: { type: "array", items: { type: "string" } },
    preferences: { type: "array", items: { type: "string" } },
    uncertainties: { type: "array", items: { type: "string" } },
    disruption: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            urgency: { type: "string", enum: ["same-day", "next-day", "flexible"] },
          },
          required: ["summary", "urgency"],
        },
        { type: "null" },
      ],
    },
    event: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            url: nullableString,
            name: nullableString,
            venue: nullableString,
            startsAt: nullableString,
            endsAt: nullableString,
          },
          required: ["url", "name", "venue", "startsAt", "endsAt"],
        },
        { type: "null" },
      ],
    },
    missingFields: { type: "array", items: { type: "string" } },
  },
  required: [
    "mode",
    "currentLocation",
    "targetArea",
    "checkin",
    "checkout",
    "adults",
    "children",
    "rooms",
    "currency",
    "hardBudgetTotal",
    "stretchBudgetTotal",
    "mustHaves",
    "preferences",
    "uncertainties",
    "disruption",
    "event",
    "missingFields",
  ],
} as const;

function removeNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeNulls);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== null)
        .map(([key, child]) => [key, removeNulls(child)]),
    );
  }
  return value;
}

function outputText(payload: unknown): string {
  const parsed = responseEnvelopeSchema.parse(payload);
  for (const item of parsed.output) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("Model response did not contain structured output.");
}

export async function extractWithOpenAI(
  input: ExtractRequest,
  options: { apiKey?: string; model?: string; fetchImpl?: typeof fetch } = {},
): Promise<ExtractionResult> {
  if (typeof window !== "undefined") throw new Error("SERVER_ONLY_ADAPTER");
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");
  const fetchImpl = options.fetchImpl ?? fetch;
  const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-5.6";
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(OPENAI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          store: false,
          input: [
            {
              role: "system",
              content:
                "Extract only facts stated or safely implied by the traveler. Put missing or unverified facts in uncertainties and missingFields. Never invent prices, dates, accessibility, amenities, availability, or travel times. Use the supplied reference date for 'tonight'.",
            },
            {
              role: "user",
              content: JSON.stringify({
                transcript: input.transcript,
                referenceDate: input.referenceDate ?? new Date().toISOString().slice(0, 10),
                mode: input.mode,
              }),
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "landingpad_trip_request",
              strict: true,
              schema: tripRequestJsonSchema,
            },
          },
        }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`OPENAI_HTTP_${response.status}`);
      const raw = JSON.parse(outputText(await response.json())) as Record<string, unknown>;
      const missingFields = z.array(z.string().min(1)).parse(raw.missingFields);
      const requestValue = { ...raw };
      delete requestValue.missingFields;
      const tripRequest: TripRequest = tripRequestSchema.parse(removeNulls(requestValue));
      return { tripRequest, missingFields, extractionMode: "inference" };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("OPENAI_INVALID_RESPONSE");
}
