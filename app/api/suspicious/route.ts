import { NextResponse } from "next/server";
import { listSuspicious, checkSuspicious, addSuspicious, removeSuspicious } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/suspicious                 → list all flagged accounts
// GET /api/suspicious?account=1234... → check one account (spaces ignored)
export async function GET(request: Request) {
  try {
    const account = new URL(request.url).searchParams.get("account");
    if (account) return NextResponse.json(await checkSuspicious(account));
    return NextResponse.json(await listSuspicious());
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 500 });
  }
}

// POST /api/suspicious → flag a new account
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.accountNumber) {
      return NextResponse.json({ error: "accountNumber is required" }, { status: 400 });
    }
    const entry = await addSuspicious(body);
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 500 });
  }
}

// DELETE /api/suspicious?id=sus_1 → remove a flagged account
export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id query param is required" }, { status: 400 });
    await removeSuspicious(id);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 500 });
  }
}

function msg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
