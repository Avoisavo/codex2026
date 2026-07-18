import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), "feedback.txt");

// POST /api/feedback → user feedback on a verification call (fed back to improve the AI)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const feedback = String(body.feedback ?? "").trim();
    if (!feedback) return NextResponse.json({ error: "feedback is required" }, { status: 400 });

    const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    const block =
      `===== ${stamp} | ${body.recipient ?? "?"} | RM ${body.amount ?? "?"} | ` +
      `${String(body.verdict ?? "UNKNOWN").toUpperCase()} =====\n${feedback}\n\n`;

    await fs.appendFile(FILE, block, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
