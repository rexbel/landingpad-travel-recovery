export type ApiResult<T> =
  | { ok: true; data: T; mode?: "user" | "stay22-live" | "tavily-web" | "inference" | "demo" }
  | {
      ok: false;
      error: { code: string; message: string; retryable: boolean };
      fallbackAvailable: boolean;
    };
