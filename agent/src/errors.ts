import type { ApiError } from "@buyer/contract";

export function apiError(code: string, message: string): ApiError {
  return { error: { code, message } };
}

export class HttpError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 500 | 503,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
