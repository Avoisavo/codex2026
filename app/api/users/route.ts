import { NextResponse } from "next/server";
import { listUsers, getUser, createUser } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/users            → list all users
// GET /api/users?id=u_danial → single user
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const user = await getUser(id);
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      return NextResponse.json(user);
    }
    return NextResponse.json(await listUsers());
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 500 });
  }
}

// POST /api/users → create a user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.name || !body?.accountNo) {
      return NextResponse.json({ error: "name and accountNo are required" }, { status: 400 });
    }
    const user = await createUser(body);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: msg(err) }, { status: 500 });
  }
}

function msg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
