import { env } from "../config.ts";

export async function maybePolishExplanation(deterministic: string, context: string): Promise<string> {
  if (env.llmProvider === "none" || !env.llmApiKey) return deterministic;
  try {
    const res = await fetch(`${env.llmBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.llmApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.llmModel,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Rewrite the reconciliation explanation for a non-technical operations user. Do not invent facts. Keep all evidence. Return plain text only.",
          },
          { role: "user", content: `${context}\n\nDraft:\n${deterministic}` },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return deterministic;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() || deterministic;
  } catch {
    return deterministic;
  }
}
