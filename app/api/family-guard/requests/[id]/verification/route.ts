import type { NextRequest } from "next/server";
import {
  familyGuardError,
  familyGuardJson,
  requestJson,
} from "@/lib/familyGuard/http";
import { recordFamilyGuardVerification } from "@/lib/familyGuard/service";
import { parseVerification } from "@/lib/familyGuard/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return familyGuardJson(
      await recordFamilyGuardVerification(
        id,
        parseVerification(await requestJson(request)),
      ),
    );
  } catch (error) {
    return familyGuardError(error);
  }
}
