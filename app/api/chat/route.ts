import { CHAT_HISTORY_LIMIT, generateResponse, type ChatMessage } from "@/lib/services/species-chat";
import { NextResponse } from "next/server";

function isChatMessage(value: unknown): value is ChatMessage {
  return (
    !!value &&
    typeof value === "object" &&
    "role" in value &&
    (value.role === "user" || value.role === "bot") &&
    "content" in value &&
    typeof value.content === "string" &&
    value.content.trim().length > 0
  );
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  if (
    !body ||
    typeof body !== "object" ||
    !("messages" in body) ||
    !Array.isArray(body.messages) ||
    body.messages.length === 0 ||
    !body.messages.every(isChatMessage)
  ) {
    return NextResponse.json(
      { error: "Request body must include a non-empty 'messages' array of { role: 'user' | 'bot', content: string }." },
      { status: 400 },
    );
  }

  // Trim to the last N messages server-side too, so a client can't send an oversized history.
  const history = body.messages.slice(-CHAT_HISTORY_LIMIT);

  try {
    const response = await generateResponse(history);
    return NextResponse.json({ response });
  } catch {
    return NextResponse.json({ error: "Failed to reach the chatbot service." }, { status: 502 });
  }
}
