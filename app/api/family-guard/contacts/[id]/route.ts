import type { NextRequest } from "next/server";
import {
  familyGuardError,
  familyGuardJson,
  requestJson,
} from "@/lib/familyGuard/http";
import {
  replaceTrustedContact,
  revokeTrustedContact,
} from "@/lib/familyGuard/service";
import { parseContact } from "@/lib/familyGuard/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return familyGuardJson(
      await replaceTrustedContact(id, parseContact(await requestJson(request))),
    );
  } catch (error) {
    return familyGuardError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return familyGuardJson(await revokeTrustedContact(id));
  } catch (error) {
    return familyGuardError(error);
  }
}
