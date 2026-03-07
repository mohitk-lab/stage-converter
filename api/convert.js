const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  if (!OPENROUTER_KEY) return res.status(500).json({ error: "OPENROUTER_KEY not configured" });

  const { system, messages, model } = req.body;
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
      model: model || "anthropic/claude-sonnet-4-5",
      max_tokens: 4096,
      stream: true,
      messages: system
        ? [{ role: "system", content: system }, ...messages]
        : messages,
    }),
  });

  if (!orRes.ok) {
    const data = await orRes.json();
    return res.status(orRes.status).json(data);
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
