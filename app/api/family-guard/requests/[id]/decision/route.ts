import type { NextRequest } from "next/server";
import {
  familyGuardError,
  familyGuardJson,
  requestJson,
} from "@/lib/familyGuard/http";
import { decideFamilyGuardRequest } from "@/lib/familyGuard/service";
import { parseDecision } from "@/lib/familyGuard/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return familyGuardJson(
      await decideFamilyGuardRequest(
        id,
        parseDecision(await requestJson(request)),
      ),
    );
  } catch (error) {
    return familyGuardError(error);
  }
}
