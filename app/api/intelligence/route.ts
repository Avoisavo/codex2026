import { NextResponse } from "next/server";
import {
  applyIntelligenceAction,
  getIntelligenceSnapshot,
} from "@/lib/intelligence/engine";
import type { IntelligenceAction } from "@/lib/intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function isAction(value: unknown): value is IntelligenceAction {
  return value === "next" || value === "run_all" || value === "reset";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function GET() {
  try {
    return NextResponse.json(await getIntelligenceSnapshot(), {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error) },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be an object with an action." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const action = (body as { action?: unknown }).action;
  if (!isAction(action)) {
    return NextResponse.json(
      { error: 'action must be one of "next", "run_all", or "reset".' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    return NextResponse.json(await applyIntelligenceAction(action), {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error) },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

