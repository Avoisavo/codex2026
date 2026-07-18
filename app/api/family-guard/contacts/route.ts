import {
  familyGuardError,
  familyGuardJson,
  requestJson,
} from "@/lib/familyGuard/http";
import {
  createTrustedContact,
  listTrustedContacts,
} from "@/lib/familyGuard/service";
import { parseContact } from "@/lib/familyGuard/validation";
import { FamilyGuardError } from "@/lib/familyGuard/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ownerUserId = new URL(request.url).searchParams.get("ownerUserId");
    if (!ownerUserId) {
      throw new FamilyGuardError(
        "ownerUserId query parameter is required.",
        400,
        "missing_owner_user_id",
      );
    }
    return familyGuardJson(await listTrustedContacts(ownerUserId));
  } catch (error) {
    return familyGuardError(error);
  }
}

export async function POST(request: Request) {
  try {
    const contact = await createTrustedContact(
      parseContact(await requestJson(request)),
    );
    return familyGuardJson(contact, { status: 201 });
  } catch (error) {
    return familyGuardError(error);
  }
}
