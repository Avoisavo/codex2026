import { NextResponse } from "next/server";

import { lookupLiveIntelligence } from "@/lib/intelligence/liveGraph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const account = search.get("account")?.trim() ?? "";
  const phone = search.get("phone")?.trim() ?? "";
  const website = search.get("website")?.trim() ?? "";

  if (!account && !phone && !website) {
    return NextResponse.json(
      { error: "Provide an account, phone, or website to check." },
      { status: 400, headers: NO_STORE },
    );
  }
  if (account && account.replace(/\D/g, "").length < 6) {
    return NextResponse.json(
      { error: "Account number is too short to check safely." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const result = await lookupLiveIntelligence({ account, phone, website });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: NO_STORE },
    );
  }
}
