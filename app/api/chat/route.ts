import { generateResponse } from "@/lib/services/species-chat";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || !("message" in body) || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "Request body must include a non-empty 'message' string." }, { status: 400 });
  }

  try {
    const response = await generateResponse(body.message.trim());
    return NextResponse.json({ response });
  } catch {
    return NextResponse.json({ error: "Failed to reach the chatbot service." }, { status: 502 });
  }
}
