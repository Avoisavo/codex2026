import { NextResponse } from "next/server";
import { initStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Seeds the local JSON store and (best-effort) the Databricks tables.
//   POST /api/db/init            → idempotent create + seed
//   POST /api/db/init?reset=true → wipe both stores and reseed
async function handle(request: Request) {
  try {
    const reset = new URL(request.url).searchParams.get("reset") === "true";
    const result = await initStore(reset);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export const POST = handle;
export const GET = handle;
