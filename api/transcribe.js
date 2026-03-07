export const config = {
  api: { bodyParser: { sizeLimit: "25mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { audioUrl } = req.body;
    if (!audioUrl) {
      return res.status(400).json({ error: "audioUrl is required" });
    }

    // Fetch audio from URL
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) {
      return res.status(400).json({ error: "Could not fetch audio from URL" });
    }
    const audioBuffer = await audioResp.arrayBuffer();

    // Build multipart form for Whisper API
    const boundary = "----WhisperBoundary" + Date.now();
    const filename = "audio.wav";

    const preamble = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      `Content-Type: audio/wav`,
      "",
      "",
    ].join("\r\n");

    const fields = [
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1`,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\nverbose_json`,
      `\r\n--${boundary}--\r\n`,
    ].join("");

    const preambleBytes = Buffer.from(preamble, "utf-8");
    const audioBytes = Buffer.from(audioBuffer);
    const fieldsBytes = Buffer.from(fields, "utf-8");
    const body = Buffer.concat([preambleBytes, audioBytes, fieldsBytes]);

    const whisperResp = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!whisperResp.ok) {
      const err = await whisperResp.text();
      return res.status(whisperResp.status).json({ error: err });
    }

    const result = await whisperResp.json();
    res.json({
      language: result.language || null,
      text: result.text || "",
      segments: (result.segments || []).map((s) => ({
        start: s.start,
        end: s.end,
        text: s.text,
      })),
      duration: result.duration || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Internal server error" });
  }
}
