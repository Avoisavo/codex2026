import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { to_number, dynamic_variables } = await request.json();

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

  // Coerce dynamic variables to the string/number/boolean values ElevenLabs expects.
  let cleanVars: Record<string, string | number | boolean> | undefined;
  if (dynamic_variables && typeof dynamic_variables === "object") {
    cleanVars = {};
    for (const [k, v] of Object.entries(dynamic_variables as Record<string, unknown>)) {
      cleanVars[k] =
        typeof v === "number" || typeof v === "boolean" ? v : String(v ?? "");
    }
  }

  const body: Record<string, unknown> = {
    agent_id: agentId,
    agent_phone_number_id: phoneNumberId,
    to_number,
  };
  // Pass the transaction context into the agent's prompt/first-message variables.
  if (cleanVars) {
    body.conversation_initiation_client_data = { dynamic_variables: cleanVars };
  }

  const res = await fetch(
    "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(body),
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
