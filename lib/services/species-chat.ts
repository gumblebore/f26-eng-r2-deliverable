import { env } from "@/env.mjs";
import OpenAI from "openai";

// Initialized once and reused across requests, rather than creating a new client every call.
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const SYSTEM_PROMPT =
  "You are a chatbot that specializes in answering questions about animals and species, " +
  "such as their habitat, diet, conservation status, and other facts. " +
  "If the user asks something unrelated to animals or species, politely remind them that " +
  "you only handle species-related queries and cannot help with that topic.";

export async function generateResponse(message: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    });

    return completion.choices[0]?.message?.content ?? "Sorry, I couldn't come up with a response for that.";
  } catch {
    return "Sorry, something went wrong while contacting the chatbot. Please try again.";
  }
}
