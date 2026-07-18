import type { NextRequest } from "next/server";
import { FamilyGuardError } from "@/lib/familyGuard/errors";
import { familyGuardError, familyGuardJson } from "@/lib/familyGuard/http";
import {
  cancelFamilyGuardRequest,
  getFamilyGuardRequest,
} from "@/lib/familyGuard/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return familyGuardJson(await getFamilyGuardRequest(id));
  } catch (error) {
    return familyGuardError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const rawVersion = new URL(request.url).searchParams.get("expectedVersion");
    const expectedVersion = rawVersion == null ? Number.NaN : Number(rawVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      throw new FamilyGuardError(
        "expectedVersion query parameter must be a non-negative integer.",
        400,
        "invalid_version",
      );
    }
    return familyGuardJson(
      await cancelFamilyGuardRequest(id, expectedVersion),
    );
  } catch (error) {
    return familyGuardError(error);
  }
}
