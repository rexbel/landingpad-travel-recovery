import type { ExtractRequest, ExtractionResult } from "./contracts";
import { deterministicExtract } from "./deterministic-extraction";
import { extractWithOpenAI } from "./openai";

export async function extractTripRequest(input: ExtractRequest): Promise<ExtractionResult> {
  if (!process.env.OPENAI_API_KEY) return deterministicExtract(input);
  try {
    return await extractWithOpenAI(input);
  } catch {
    return deterministicExtract(input);
  }
}
