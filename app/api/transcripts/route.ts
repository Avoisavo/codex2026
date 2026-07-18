import { NextResponse } from "next/server";

import {
  deleteTranscript,
  purgeExpiredTranscripts,
  retainTranscript,
} from "@/lib/transcriptStore";
import {
  boundedRetentionDays,
  deriveRecommendation,
  redactSensitiveText,
  sanitizeTranscript,
} from "@/lib/voiceSafety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Request body must be an object.");
    }
    body = value as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body." },
      { status: 400, headers: NO_STORE },
    );
  }

  if (body.consent !== true) {
    return NextResponse.json(
      { error: "Transcript retention requires explicit consent." },
      { status: 400, headers: NO_STORE },
    );
  }

  const transcript = sanitizeTranscript(body.transcript);
  const recommendation = deriveRecommendation(transcript);
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json(
      { error: "A valid numeric amount is required." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const retained = await retainTranscript({
      approvalRequestId:
        typeof body.approvalRequestId === "string"
          ? body.approvalRequestId.slice(0, 120)
          : null,
      recipientLabel: redactSensitiveText(body.recipient).slice(0, 120),
      amount,
      recommendation,
      entries: transcript,
      retentionDays: boundedRetentionDays(body.retentionDays),
    });

    return NextResponse.json(
      {
        ok: true,
        id: retained.id,
        entries: retained.entries.length,
        recommendation: retained.recommendation,
        expiresAt: retained.expiresAt,
        redacted: true,
        storage: "time-limited privacy store",
      },
      { status: 201, headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: NO_STORE },
    );
  }
}
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  try {
    if (id) {
      const deleted = await deleteTranscript(id);
      return NextResponse.json(
        { ok: true, deleted },
        { status: deleted ? 200 : 404, headers: NO_STORE },
      );
    }

    const purged = await purgeExpiredTranscripts();
    return NextResponse.json(
      { ok: true, purged },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: NO_STORE },
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
