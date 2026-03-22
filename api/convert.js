const OPENROUTER_KEY =
  process.env.OPENROUTER_KEY ||
  process.env.OPENROUTER_API;
const GROQ_API_KEY =
  process.env.GROQ_API_KEY ||
  process.env.GROQ_API ||
  process.env.GROQAI_API;
const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_API ||
  process.env.OPEN_AI_API ||
  process.env.OPEN_AI;
const LLM_PROVIDER = (process.env.LLM_PROVIDER || "").toLowerCase();

function pickProvider() {
  if (LLM_PROVIDER === "groq") return GROQ_API_KEY ? "groq" : null;
  if (LLM_PROVIDER === "openai") return OPENAI_API_KEY ? "openai" : null;
  if (LLM_PROVIDER === "openrouter") return OPENROUTER_KEY ? "openrouter" : null;
  if (GROQ_API_KEY) return "groq";
  if (OPENAI_API_KEY) return "openai";
  if (OPENROUTER_KEY) return "openrouter";
  return null;
}

function resolveModel(provider, requestedModel) {
  if (provider === "openrouter") {
    if (process.env.OPENROUTER_MODEL) return process.env.OPENROUTER_MODEL;
    return requestedModel || "anthropic/claude-sonnet-4.5";
  }

  if (provider === "groq") {
    const looksLikeGroqModel =
      typeof requestedModel === "string" &&
      !requestedModel.includes("/") &&
      /^(llama|mixtral|gemma|qwen|deepseek|moonshot|allam|meta-llama|mistral)/i.test(requestedModel);
    if (looksLikeGroqModel) return requestedModel;
    return process.env.GROQ_MODEL || "qwen/qwen3-32b";
  }

  // OpenAI accepts models like gpt-4.1-mini, gpt-4o-mini, o4-mini etc.
  const looksLikeOpenAIModel = typeof requestedModel === "string" && /^(gpt|o)[a-zA-Z0-9._-]*$/.test(requestedModel);
  if (looksLikeOpenAIModel) return requestedModel;
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

function applyProviderOptions(provider, payload) {
  if (provider === "groq" && payload.model === "qwen/qwen3-32b") {
    payload.reasoning_format = "hidden";
    payload.reasoning_effort = "none";
  }
  return payload;
}

function buildProviderConfig(provider, requestedModel, system, messages, stream = true) {
  const url =
    provider === "openrouter"
      ? "https://openrouter.ai/api/v1/chat/completions"
      : provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

  const authKey =
    provider === "openrouter" ? OPENROUTER_KEY
    : provider === "groq" ? GROQ_API_KEY
    : OPENAI_API_KEY;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authKey}`,
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://stage-converter.vercel.app";
    headers["X-Title"] = "Stage Converter";
  }

  const payload = applyProviderOptions(provider, {
    model: resolveModel(provider, requestedModel),
    max_tokens: 4096,
    temperature: 0.2,
    stream,
    messages: system
      ? [{ role: "system", content: system }, ...messages]
      : messages,
  });

  return { provider, url, headers, payload };
}

function buildFallbackProviders(primaryProvider) {
  const providers = [primaryProvider];

  if (primaryProvider === "openrouter") {
    if (GROQ_API_KEY) providers.push("groq");
    if (LLM_PROVIDER !== "openrouter" && OPENAI_API_KEY) providers.push("openai");
    return [...new Set(providers)];
  }

  if (primaryProvider === "groq") {
    if (OPENROUTER_KEY) providers.push("openrouter");
    if (OPENAI_API_KEY) providers.push("openai");
    return [...new Set(providers)];
  }

  if (primaryProvider === "openai") {
    if (GROQ_API_KEY) providers.push("groq");
    if (OPENROUTER_KEY) providers.push("openrouter");
    return [...new Set(providers)];
  }

  return providers;
}

function shouldTryNextProvider(provider, status, raw, parsed) {
  const errorText = (parsed?.error?.message || parsed?.error || raw || "").toString().toLowerCase();

  if (provider === "openrouter") {
    return (
      status === 402 ||
      status === 408 ||
      status === 409 ||
      status === 429 ||
      status >= 500 ||
      errorText.includes("temporarily rate-limited") ||
      errorText.includes("provider returned error") ||
      errorText.includes("insufficient credits") ||
      errorText.includes("model") && errorText.includes("does not exist")
    );
  }

  if (provider === "groq") {
    return status === 429 || status >= 500 || errorText.includes("rate limit");
  }

  return false;
}

async function readJsonOrText(response) {
  const raw = await response.text();
  try {
    return { raw, parsed: JSON.parse(raw) };
  } catch {
    return { raw, parsed: null };
  }
}

async function completeOnce({ url, headers, payload }) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...payload, stream: false }),
  });

  if (!response.ok) {
    const { raw, parsed } = await readJsonOrText(response);
    return { ok: false, status: response.status, error: parsed || { error: { message: raw || "LLM request failed" } } };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return { ok: true, content };
}

async function completeWithFallback({ primaryProvider, requestedModel, system, messages, providersOverride = null }) {
  const providers = providersOverride || buildFallbackProviders(primaryProvider);
  let lastError = null;

  for (const provider of providers) {
    const cfg = buildProviderConfig(provider, requestedModel, system, messages, false);
    const result = await completeOnce(cfg);
    if (result.ok) return { ...result, provider, model: cfg.payload.model };

    const raw = result.error?.error?.message || JSON.stringify(result.error);
    const parsed = result.error;
    if (!shouldTryNextProvider(provider, result.status, raw, parsed)) {
      return result;
    }
    lastError = result;
  }

  return lastError || { ok: false, status: 500, error: { error: { message: "All providers failed" } } };
}

function writeSseText(res, text, model) {
  const chunk = {
    id: `local-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
  };
  const finalChunk = {
    id: `local-${Date.now()}-done`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  };
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
  res.write("data: [DONE]\n\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const provider = pickProvider();
  if (!provider) {
    const forcedProviderMissingKey =
      LLM_PROVIDER === "groq"
        ? "LLM_PROVIDER is set to groq but GROQ_API_KEY is missing."
        : LLM_PROVIDER === "openai"
        ? "LLM_PROVIDER is set to openai but OPENAI_API_KEY is missing."
        : LLM_PROVIDER === "openrouter"
          ? "LLM_PROVIDER is set to openrouter but OPENROUTER_KEY is missing."
          : null;
    return res.status(500).json({
      error:
        forcedProviderMissingKey ||
        "No LLM key configured. Add GROQ_API_KEY, OPENROUTER_KEY, or OPENAI_API_KEY in Vercel environment variables.",
    });
  }
  res.setHeader("x-llm-provider", provider);

  const { system, messages, model } = req.body;
  if (!messages) return res.status(400).json({ error: "messages required" });
  const cfg = buildProviderConfig(provider, model, system, messages, true);
  let activeProvider = cfg.provider;
  let activeModel = cfg.payload.model;

  const translationReviewMode =
    typeof system === "string" &&
    (system.includes("CRITICAL OUTPUT RULES") || system.includes("FINAL CHECKLIST"));

  if (translationReviewMode) {
    const firstPass = await completeWithFallback({
      primaryProvider: provider,
      requestedModel: model,
      system,
      messages,
    });
    if (!firstPass.ok) {
      return res.status(firstPass.status).json(firstPass.error);
    }
    activeProvider = firstPass.provider || activeProvider;
    activeModel = firstPass.model || activeModel;
    res.setHeader("x-llm-provider", `${activeProvider}-review`);

    const sourceText = messages?.[messages.length - 1]?.content || "";
    const reviewSystem =
      `${system}\n\nYou are now in strict correction mode. Review the draft and fix only translation quality issues, dialect mixing, wrong script, unnatural phrasing, grammar problems, and accidental assistant-style answers. Preserve meaning and sentence count exactly. Output only the corrected final text.`;
    const reviewMessages = [
      {
        role: "user",
        content: `SOURCE:\n${sourceText}\n\nDRAFT:\n${firstPass.content}`,
      },
    ];

    const secondPass = await completeWithFallback({
      primaryProvider: activeProvider,
      requestedModel: activeModel,
      system: reviewSystem,
      messages: reviewMessages,
    });
    if (!secondPass.ok) {
      return res.status(secondPass.status).json(secondPass.error);
    }
    activeProvider = secondPass.provider || activeProvider;
    activeModel = secondPass.model || activeModel;
    res.setHeader("x-llm-provider", `${activeProvider}-review`);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    writeSseText(res, secondPass.content.trim(), activeModel);
    return res.end();
  }

  let orRes = await fetch(cfg.url, {
    method: "POST",
    headers: cfg.headers,
    body: JSON.stringify(cfg.payload),
  });

  if (!orRes.ok) {
    const { raw, parsed } = await readJsonOrText(orRes);
    if (shouldTryNextProvider(provider, orRes.status, raw, parsed)) {
      const fallbackProviders = buildFallbackProviders(provider).filter((p) => p !== provider);
      const fallback = await completeWithFallback({
        primaryProvider: fallbackProviders[0] || provider,
        requestedModel: model,
        system,
        messages,
        providersOverride: fallbackProviders,
      });
      if (!fallback.ok) {
        return res.status(fallback.status).json(fallback.error);
      }
      activeProvider = fallback.provider || activeProvider;
      activeModel = fallback.model || activeModel;
      res.setHeader("x-llm-provider", `${activeProvider}-fallback`);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      writeSseText(res, fallback.content.trim(), activeModel);
      return res.end();
    }
    return res.status(orRes.status).json(
      parsed || { error: { message: raw || "LLM request failed" } }
    );
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
