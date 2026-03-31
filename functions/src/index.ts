import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

const ALLOWED_MODELS = [
  "claude-sonnet-4-6",
  "claude-opus-4-6",
  "claude-haiku-4-5",
  "claude-sonnet-4-20250514",
];

const MAX_SYSTEM_PROMPT_LENGTH = 10000;
const MAX_USER_MESSAGE_LENGTH = 5000;

export const generateComment = onCall(
  {
    secrets: [anthropicApiKey],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in to generate comments.");
    }

    const { systemPrompt, userMessage, model } = request.data;

    // Validate inputs
    if (!systemPrompt || typeof systemPrompt !== "string") {
      throw new HttpsError("invalid-argument", "systemPrompt is required and must be a string.");
    }
    if (!userMessage || typeof userMessage !== "string") {
      throw new HttpsError("invalid-argument", "userMessage is required and must be a string.");
    }
    if (systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
      throw new HttpsError("invalid-argument", `systemPrompt exceeds ${MAX_SYSTEM_PROMPT_LENGTH} characters.`);
    }
    if (userMessage.length > MAX_USER_MESSAGE_LENGTH) {
      throw new HttpsError("invalid-argument", `userMessage exceeds ${MAX_USER_MESSAGE_LENGTH} characters.`);
    }

    const selectedModel = ALLOWED_MODELS.includes(model) ? model : "claude-sonnet-4-6";
    const apiKey = anthropicApiKey.value();

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        console.error("Anthropic API error:", response.status, JSON.stringify(json));

        if (response.status === 401) {
          throw new HttpsError("permission-denied", "Invalid API key. Contact your administrator.");
        }
        if (response.status === 429) {
          throw new HttpsError("resource-exhausted", "Rate limit exceeded. Please wait and try again.");
        }

        throw new HttpsError("internal", json.error?.message || "API error. Please try again.");
      }

      const text = json.content?.[0]?.type === "text" ? json.content[0].text : "";

      return {
        text: text.trim(),
        model: selectedModel,
        usage: {
          inputTokens: json.usage?.input_tokens,
          outputTokens: json.usage?.output_tokens,
        },
      };
    } catch (err: unknown) {
      if (err instanceof HttpsError) throw err;

      const error = err as Error;
      console.error("Fetch error:", error.message);
      throw new HttpsError("internal", "Failed to connect to AI service. Please try again.");
    }
  }
);
