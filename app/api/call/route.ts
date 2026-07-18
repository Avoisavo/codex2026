import { NextResponse } from "next/server";

import {
  maskAccountNumber,
  normalizeMalaysianPhone,
  redactSensitiveText,
} from "@/lib/voiceSafety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

const ALLOWED_VARIABLES = [
  "user_name",
  "amount",
  "recipient",
  "recipient_bank",
  "payment_type",
  "suspicious_status",
  "suspicious_reason",
  "flagged_reasons",
  "contact_channel",
  "context_summary",
  "knowledge_graph_summary",
  "safety_phrase",
] as const;

type AllowedVariable = (typeof ALLOWED_VARIABLES)[number];

function safeVariables(
  value: unknown,
  rawAccount: unknown,
): Record<string, string | number | boolean> {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const output: Record<string, string | number | boolean> = {};

  for (const key of ALLOWED_VARIABLES) {
    const candidate = source[key];
    if (typeof candidate === "boolean" || typeof candidate === "number") {
      output[key] = candidate;
    } else if (candidate != null) {
      output[key] = redactSensitiveText(candidate).slice(0, 700);
    }
  }

  output.account_number_masked = maskAccountNumber(String(rawAccount ?? ""));
  output.call_safety_notice =
    "I will never ask for your password, PIN, OTP, TAC, or Secure2u approval.";
  output.assessment_instruction =
    "Give a recommendation only: CONTINUE CAREFULLY, PAUSE AND VERIFY, or HIGH RISK. Never approve or execute a transfer.";
  return output;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Request body must be an object.");
    }
    body = parsed as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body." },
      { status: 400, headers: NO_STORE },
    );
  }

  if (body.consent !== true) {
    return NextResponse.json(
      { error: "Explicit verification-call consent is required." },
      { status: 400, headers: NO_STORE },
    );
  }

  const toNumber = normalizeMalaysianPhone(String(body.to_number ?? ""));
  if (!toNumber) {
    return NextResponse.json(
      { error: "A valid account-holder phone number is required." },
      { status: 400, headers: NO_STORE },
    );
  }

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;

  if (!agentId || !apiKey || !phoneNumberId) {
    return NextResponse.json(
      {
        error: "Voice verification is not configured.",
        demoAvailable: true,
      },
      { status: 503, headers: NO_STORE },
    );
  }

  const dynamicVariables = safeVariables(
    body.dynamic_variables,
    body.account_number,
  );
  const upstreamBody = {
    agent_id: agentId,
    agent_phone_number_id: phoneNumberId,
    to_number: toNumber,
    conversation_initiation_client_data: {
      dynamic_variables: dynamicVariables,
    },
  };

  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify(upstreamBody),
        cache: "no-store",
      },
    );
    const data: Record<string, unknown> = await response
      .json()
      .catch(() => ({}));

    if (!response.ok || data.success === false) {
      return NextResponse.json(
        {
          error:
            typeof data.message === "string"
              ? data.message
              : typeof data.detail === "string"
                ? data.detail
                : "Failed to initiate the verification call.",
        },
        { status: response.ok ? 400 : response.status, headers: NO_STORE },
      );
    }

    return NextResponse.json(
      {
        ...data,
        accountNumberShared: dynamicVariables.account_number_masked,
        safetyPhrase: dynamicVariables.safety_phrase ?? null,
        privacyNotice:
          "Only masked transaction context was sent. Never share a password, PIN, OTP, TAC, or Secure2u approval.",
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

export type { AllowedVariable };
