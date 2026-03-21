const OPENROUTER_KEY =
  process.env.OPENROUTER_KEY ||
  process.env.OPENROUTER_API;
const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPEN_AI_API ||
  process.env.OPEN_AI;
const LLM_PROVIDER = (process.env.LLM_PROVIDER || "").toLowerCase();

function pickProvider() {
  if (LLM_PROVIDER === "openai") return OPENAI_API_KEY ? "openai" : null;
  if (LLM_PROVIDER === "openrouter") return OPENROUTER_KEY ? "openrouter" : null;
  if (OPENAI_API_KEY) return "openai";
  if (OPENROUTER_KEY) return "openrouter";
  return null;
}

function resolveModel(provider, requestedModel) {
  if (provider === "openrouter") {
    return requestedModel || process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5";
  }

  // OpenAI accepts models like gpt-4.1-mini, gpt-4o-mini, o4-mini etc.
  const looksLikeOpenAIModel = typeof requestedModel === "string" && /^(gpt|o)[a-zA-Z0-9._-]*$/.test(requestedModel);
  if (looksLikeOpenAIModel) return requestedModel;
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const provider = pickProvider();
  if (!provider) {
    const forcedProviderMissingKey =
      LLM_PROVIDER === "openai"
        ? "LLM_PROVIDER is set to openai but OPENAI_API_KEY is missing."
        : LLM_PROVIDER === "openrouter"
          ? "LLM_PROVIDER is set to openrouter but OPENROUTER_KEY is missing."
          : null;
    return res.status(500).json({
      error:
        forcedProviderMissingKey ||
        "No LLM key configured. Add OPENROUTER_KEY or OPENAI_API_KEY in Vercel environment variables.",
    });
  }
  res.setHeader("x-llm-provider", provider);

  const { system, messages, model } = req.body;
  if (!messages) return res.status(400).json({ error: "messages required" });

  const url =
    provider === "openrouter"
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
  const authKey = provider === "openrouter" ? OPENROUTER_KEY : OPENAI_API_KEY;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authKey}`,
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://stage-converter.vercel.app";
    headers["X-Title"] = "Stage Converter";
  }

  const payload = {
    model: resolveModel(provider, model),
    max_tokens: 4096,
    stream: true,
    messages: system
      ? [{ role: "system", content: system }, ...messages]
      : messages,
  };

  let orRes = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!orRes.ok) {
    const raw = await orRes.text();
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {}

    const errorText = (parsed?.error?.message || parsed?.error || raw || "").toString().toLowerCase();
    const shouldFallbackToOpenAI =
      provider === "openrouter" &&
      OPENAI_API_KEY &&
      (errorText.includes("insufficient credits") || errorText.includes("quota"));

    if (shouldFallbackToOpenAI) {
      const openAiHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      };

      orRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: openAiHeaders,
        body: JSON.stringify({
          ...payload,
          model: resolveModel("openai", model),
        }),
      });

      if (orRes.ok) {
        res.setHeader("x-llm-provider", "openai-fallback");
      } else {
        const openAiRaw = await orRes.text();
        let openAiParsed = null;
        try {
          openAiParsed = JSON.parse(openAiRaw);
        } catch {}
        return res.status(orRes.status).json(
          openAiParsed || { error: { message: openAiRaw || "LLM request failed" } }
        );
      }
    } else {
      return res.status(orRes.status).json(
        parsed || { error: { message: raw || "LLM request failed" } }
      );
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const reader = orRes.body.getReader();
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
