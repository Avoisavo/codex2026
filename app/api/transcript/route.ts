import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("id");

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversation id is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ElevenLabs API key" },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
    { headers: { "xi-api-key": apiKey } }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: data.detail || "Failed to fetch conversation" },
      { status: res.status }
    );
  }

  const data = await res.json();

  const transcript = (data.transcript ?? []).map(
    (entry: { role: string; message: string; time_in_call_secs: number }) => ({
      role: entry.role === "agent" ? "ai" : "user",
      message: entry.message,
      time: entry.time_in_call_secs,
    })
  );

  return NextResponse.json({
    status: data.status,
    transcript,
  });
}
