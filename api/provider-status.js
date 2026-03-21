const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LLM_PROVIDER = (process.env.LLM_PROVIDER || "").toLowerCase();

function pickProvider() {
  if (LLM_PROVIDER === "openai") return OPENAI_API_KEY ? "openai" : null;
  if (LLM_PROVIDER === "openrouter") return OPENROUTER_KEY ? "openrouter" : null;
  if (OPENAI_API_KEY) return "openai";
  if (OPENROUTER_KEY) return "openrouter";
  return null;
}

export default function handler(req, res) {
  res.status(200).json({
    provider: pickProvider(),
    forcedProvider: LLM_PROVIDER || null,
    hasOpenAiKey: Boolean(OPENAI_API_KEY),
    hasOpenRouterKey: Boolean(OPENROUTER_KEY),
    openAiModel: process.env.OPENAI_MODEL || null,
    openRouterModel: process.env.OPENROUTER_MODEL || null,
  });
}
