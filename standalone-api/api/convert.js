const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPEN_AI_API ||
  process.env.OPEN_AI;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function resolveModel(requestedModel) {
  const looksLikeOpenAiModel =
    typeof requestedModel === "string" && /^(gpt|o)[a-zA-Z0-9._-]*$/.test(requestedModel);
  return looksLikeOpenAiModel ? requestedModel : OPENAI_MODEL;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: { message: "OPENAI_API_KEY is missing" } });
  }

  const { system, messages, model } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: "messages required" } });
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: resolveModel(model),
      max_tokens: 4096,
      stream: true,
      messages: system
        ? [{ role: "system", content: system }, ...messages]
        : messages,
    }),
  });

  if (!upstream.ok) {
    const raw = await upstream.text();
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {}
    return res.status(upstream.status).json(
      parsed || { error: { message: raw || "OpenAI request failed" } }
    );
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("x-llm-provider", "openai-vercel-standalone");

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } finally {
    res.end();
  }
}
