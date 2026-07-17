import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { to_number } = await request.json();

  if (!to_number || typeof to_number !== "string") {
    return NextResponse.json(
      { error: "to_number is required" },
      { status: 400 }
    );
  }

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;

  if (!agentId || !apiKey || !phoneNumberId) {
    return NextResponse.json(
      { error: "Missing ElevenLabs configuration" },
      { status: 500 }
    );
  }

  const res = await fetch(
    "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        agent_id: agentId,
        agent_phone_number_id: phoneNumberId,
        to_number,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok || data.success === false) {
    return NextResponse.json(
      { error: data.message || data.detail || "Failed to initiate call" },
      { status: res.ok ? 400 : res.status }
    );
  }

  return NextResponse.json(data);
}
