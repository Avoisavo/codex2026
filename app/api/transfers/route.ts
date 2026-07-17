import { NextResponse } from "next/server";
import { listTransfers, createTransfer } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/transfers            → all transfers (newest first)
// GET /api/transfers?userId=... → transfers for one user
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") ?? undefined;
    return NextResponse.json(await listTransfers(userId));
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 500 });
  }
}

// POST /api/transfers → record an executed transfer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.userId || typeof body.amount !== "number") {
      return NextResponse.json({ error: "userId and numeric amount are required" }, { status: 400 });
    }
    const transfer = await createTransfer(body);
    return NextResponse.json(transfer, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 500 });
  }
}

function msg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
