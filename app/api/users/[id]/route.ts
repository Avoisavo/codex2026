import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUser, updateUser } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/users/[id] → single user
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/users/[id]">) {
  try {
    const { id } = await ctx.params;
    const user = await getUser(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 500 });
  }
}

// PATCH /api/users/[id] → update balance / parentalControl / transactions
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/users/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const user = await updateUser(id, body);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 500 });
  }
}

function msg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
