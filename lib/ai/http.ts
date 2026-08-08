import type { ApiResult } from "@/schemas/api-result";

export function invalidRequest(message = "The request body is invalid."): Response {
  const result: ApiResult<never> = {
    ok: false,
    error: { code: "INVALID_REQUEST", message, retryable: false },
    fallbackAvailable: false,
  };
  return Response.json(result, { status: 400 });
}

export function serverFailure(code: string, message: string, fallbackAvailable: boolean): Response {
  const result: ApiResult<never> = {
    ok: false,
    error: { code, message, retryable: true },
    fallbackAvailable,
  };
  return Response.json(result, { status: 502 });
}
