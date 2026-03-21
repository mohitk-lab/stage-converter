const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
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

export default function handler(req, res) {
  res.status(200).json({
    provider: pickProvider(),
    forcedProvider: LLM_PROVIDER || null,
    hasGroqKey: Boolean(GROQ_API_KEY),
    hasOpenAiKey: Boolean(OPENAI_API_KEY),
    hasOpenRouterKey: Boolean(OPENROUTER_KEY),
    groqModel: process.env.GROQ_MODEL || null,
    openAiModel: process.env.OPENAI_MODEL || null,
    openRouterModel: process.env.OPENROUTER_MODEL || null,
  });
}
