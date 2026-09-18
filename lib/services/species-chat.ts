import { env } from "@/env.mjs";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Initialized once and reused across requests, rather than creating a new client every call.
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const SYSTEM_PROMPT =
  "You are a chatbot that specializes in answering questions about animals and species, " +
  "such as their habitat, diet, conservation status, and other facts. " +
  "If the user asks something unrelated to animals or species, politely remind them that " +
  "you only handle species-related queries and cannot help with that topic.";

// How many most-recent messages (user + bot combined) to send back to the model as context.
export const CHAT_HISTORY_LIMIT = 10;

export interface ChatMessage {
  role: "user" | "bot";
  content: string;
}

export async function generateResponse(history: ChatMessage[]): Promise<string> {
  // Defense in depth: enforce the window here too, even though the API route already trims it,
  // so this function is safe to call with an unbounded history from any future caller.
  const trimmedHistory = history.slice(-CHAT_HISTORY_LIMIT);

  try {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...trimmedHistory.map(
        (entry): ChatCompletionMessageParam => ({
          role: entry.role === "bot" ? "assistant" : "user",
          content: entry.content,
        }),
      ),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    return completion.choices[0]?.message?.content ?? "Sorry, I couldn't come up with a response for that.";
  } catch {
    return "Sorry, something went wrong while contacting the chatbot. Please try again.";
  }
}
