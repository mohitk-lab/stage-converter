import http from "node:http";

const port = Number(process.env.PORT || 8080);
const openAiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(body));
}

function resolveModel(requestedModel) {
  const looksLikeOpenAiModel =
    typeof requestedModel === "string" && /^(gpt|o)[a-zA-Z0-9._-]*$/.test(requestedModel);
  return looksLikeOpenAiModel ? requestedModel : openAiModel;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, {
      ok: true,
      provider: "openai",
      hasOpenAiKey: Boolean(openAiKey),
      model: openAiModel,
    });
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/convert") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (!openAiKey) {
    sendJson(res, 500, { error: { message: "OPENAI_API_KEY is missing" } });
    return;
  }

  try {
    const raw = await readBody(req);
    const payload = raw ? JSON.parse(raw) : {};
    const { system, messages, model } = payload;

    if (!Array.isArray(messages) || messages.length === 0) {
      sendJson(res, 400, { error: { message: "messages required" } });
      return;
    }

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
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
      const errorText = await upstream.text();
      let parsed = null;
      try {
        parsed = JSON.parse(errorText);
      } catch {}
      sendJson(res, upstream.status, parsed || { error: { message: errorText || "OpenAI request failed" } });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "x-llm-provider": "openai-standalone",
    });

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
  } catch (error) {
    sendJson(res, 500, { error: { message: error.message || "Internal server error" } });
  }
});

server.listen(port, () => {
  console.log(`Standalone API listening on http://localhost:${port}`);
});
