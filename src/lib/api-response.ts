import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./api-error";

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    const fields = err.flatten().fieldErrors;
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid request body", fields } },
      { status: 400 },
    );
  }
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      { status: err.status },
    );
  }
  console.error("[api] unexpected error", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Server error" } },
    { status: 500 },
  );
}
