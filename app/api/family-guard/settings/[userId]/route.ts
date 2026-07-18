import type { NextRequest } from "next/server";
import {
  familyGuardError,
  familyGuardJson,
  requestJson,
} from "@/lib/familyGuard/http";
import {
  getFamilyGuardSettings,
  updateFamilyGuardSettings,
} from "@/lib/familyGuard/service";
import { parseSettingsUpdate } from "@/lib/familyGuard/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await context.params;
    return familyGuardJson(await getFamilyGuardSettings(userId));
  } catch (error) {
    return familyGuardError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await context.params;
    const patch = parseSettingsUpdate(await requestJson(request));
    return familyGuardJson(await updateFamilyGuardSettings(userId, patch));
  } catch (error) {
    return familyGuardError(error);
  }
}
