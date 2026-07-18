import { familyGuardError, familyGuardJson } from "@/lib/familyGuard/http";
import { listFamilyGuardFeedback } from "@/lib/familyGuard/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return familyGuardJson(await listFamilyGuardFeedback());
  } catch (error) {
    return familyGuardError(error);
  }
}
