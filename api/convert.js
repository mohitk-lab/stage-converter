const OPENROUTER_KEY = process.env.OPENROUTER_KEY || "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";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { system, messages } = req.body;
  if (!messages) return res.status(400).json({ error: "messages required" });

  const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": "https://stage-converter.vercel.app",
      "X-Title": "Stage Converter",
    },
    body: JSON.stringify({
      model: "anthropic/claude-opus-4",
      max_tokens: 4096,
      messages: system
        ? [{ role: "system", content: system }, ...messages]
        : messages,
    }),
  });

  const data = await orRes.json();
  if (!orRes.ok) return res.status(orRes.status).json(data);
  res.status(200).json(data);
}
