import { FamilyGuardError } from "@/lib/familyGuard/errors";
import {
  familyGuardError,
  familyGuardJson,
  requestJson,
} from "@/lib/familyGuard/http";
import {
  createFamilyGuardRequest,
  listFamilyGuardRequests,
} from "@/lib/familyGuard/service";
import type { FamilyGuardRequestStatus } from "@/lib/familyGuard/types";
import { parseCreateRequest } from "@/lib/familyGuard/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: FamilyGuardRequestStatus[] = [
  "awaiting_verification",
  "awaiting_guardian",
  "bank_review",
  "completed",
  "rejected",
  "reported",
  "blocked",
  "expired",
  "cancelled",
];

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const ownerUserId = params.get("ownerUserId") ?? undefined;
    const contactId = params.get("contactId") ?? undefined;
    if (!ownerUserId && !contactId) {
      throw new FamilyGuardError(
        "ownerUserId or contactId query parameter is required.",
        400,
        "missing_request_scope",
      );
    }
    const statusValue = params.get("status");
    if (statusValue && !STATUSES.includes(statusValue as FamilyGuardRequestStatus)) {
      throw new FamilyGuardError("status is not supported.", 400, "invalid_status");
    }
    return familyGuardJson(
      await listFamilyGuardRequests({
        ownerUserId,
        contactId,
        status: statusValue as FamilyGuardRequestStatus | undefined,
      }),
    );
  } catch (error) {
    return familyGuardError(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await createFamilyGuardRequest(
      parseCreateRequest(await requestJson(request)),
    );
    return familyGuardJson(result, { status: 201 });
  } catch (error) {
    return familyGuardError(error);
  }
}
