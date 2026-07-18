import { NextResponse } from "next/server";

import {
  deriveRecommendation,
  sanitizeTranscript,
} from "@/lib/voiceSafety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const conversationId = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[A-Za-z0-9_-]{6,160}$/.test(conversationId)) {
    return NextResponse.json(
      { error: "A valid conversation id is required." },
      { status: 400, headers: NO_STORE },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Voice verification is not configured." },
      { status: 503, headers: NO_STORE },
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      { headers: { "xi-api-key": apiKey }, cache: "no-store" },
    );
    const data: Record<string, unknown> = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            typeof data.detail === "string"
              ? data.detail
              : "Failed to fetch the verification conversation.",
        },
        { status: response.status, headers: NO_STORE },
      );
    }

    const rawEntries = Array.isArray(data.transcript)
      ? data.transcript.map((entry) => {
          const candidate = entry as {
            role?: unknown;
            message?: unknown;
            time_in_call_secs?: unknown;
          };
          return {
            role: candidate.role === "agent" ? "ai" : "user",
            message: candidate.message,
            time: candidate.time_in_call_secs,
          };
        })
      : [];
    const transcript = sanitizeTranscript(rawEntries);

    return NextResponse.json(
      {
        status: data.status,
        transcript,
        recommendation: deriveRecommendation(transcript),
        redacted: true,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to reach the voice verification service.",
      },
      { status: 502, headers: NO_STORE },
    );
  }
}
