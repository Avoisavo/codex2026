import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), "transcript.txt");

type Entry = { role: "user" | "ai"; message: string; time: number };

// POST /api/transcripts → append a verification-call transcript to transcript.txt
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transcript: Entry[] = Array.isArray(body.transcript) ? body.transcript : [];

    const now = new Date();
    const stamp = now.toISOString().replace("T", " ").slice(0, 19); // 2026-07-18 14:32:05

    const header =
      `===== ${stamp} | ${body.recipient ?? "?"} | RM ${body.amount ?? "?"} | ` +
      `${String(body.verdict ?? "UNKNOWN").toUpperCase()} =====`;

    const lines = transcript.map((t) => {
      const secsTotal = Math.floor(t.time ?? 0);
      const mm = Math.floor(secsTotal / 60);
      const ss = (secsTotal % 60).toString().padStart(2, "0");
      const who = t.role === "ai" ? "Scam Guard" : "Customer";
      return `[${mm}:${ss}] ${who}: ${t.message}`;
    });

    const block = `${header}\n${lines.join("\n") || "(no transcript captured)"}\n\n`;
    await fs.appendFile(FILE, block, "utf-8");

    return NextResponse.json({ ok: true, file: "transcript.txt", entries: transcript.length });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

type CallLine = { time: string; who: string; message: string };
type CallRecord = {
  timestamp: string;
  recipient: string;
  amount: string;
  verdict: string;
  lines: CallLine[];
};

// GET /api/transcripts → parse transcript.txt into structured verification-call records
export async function GET() {
  try {
    let raw = "";
    try {
      raw = await fs.readFile(FILE, "utf-8");
    } catch {
      return NextResponse.json({ calls: [] });
    }

    const calls: CallRecord[] = [];
    let current: CallRecord | null = null;

    for (const line of raw.split("\n")) {
      const header = line.match(/^=====\s*(.+?)\s*\|\s*(.+?)\s*\|\s*RM\s*(.+?)\s*\|\s*(\w+)\s*=====\s*$/);
      if (header) {
        current = { timestamp: header[1], recipient: header[2], amount: header[3], verdict: header[4], lines: [] };
        calls.push(current);
        continue;
      }
      const entry = line.match(/^\[([\d:]+)\]\s*([^:]+):\s*(.*)$/);
      if (entry && current) {
        current.lines.push({ time: entry[1], who: entry[2].trim(), message: entry[3] });
      }
    }

    // newest first
    calls.reverse();
    return NextResponse.json({ calls });
  } catch (err) {
    return NextResponse.json(
      { calls: [], error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
