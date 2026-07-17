import { NextResponse } from "next/server";
import { query } from "@/lib/databricks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/db/catalogs → list catalogs (and schemas of a given catalog) this token can see.
export async function GET(request: Request) {
  try {
    const catalog = new URL(request.url).searchParams.get("catalog");
    if (catalog) {
      const schemas = await query<Record<string, unknown>>(`SHOW SCHEMAS IN ${catalog}`);
      return NextResponse.json({ catalog, schemas });
    }
    const catalogs = await query<Record<string, unknown>>(`SHOW CATALOGS`);
    return NextResponse.json({ catalogs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
