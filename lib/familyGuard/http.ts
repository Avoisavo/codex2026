import { NextResponse } from "next/server";
import { FamilyGuardError } from "./errors";

export const FAMILY_GUARD_NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
};

export function familyGuardJson(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: { ...FAMILY_GUARD_NO_STORE, ...(init?.headers ?? {}) },
  });
}

export function familyGuardError(error: unknown): NextResponse {
  if (error instanceof FamilyGuardError) {
    return familyGuardJson(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[family-guard] unexpected error", error);
  return familyGuardJson(
    { error: "Family Guard could not complete this request.", code: "internal_error" },
    { status: 500 },
  );
}

export async function requestJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new FamilyGuardError("Request body must be valid JSON.", 400, "invalid_json");
  }
}
