export const config = {
  api: { bodyParser: { sizeLimit: "25mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: "ELEVENLABS_API_KEY is not configured. Please add it to your Vercel project environment variables." });
  }
  try {
    const { audioUrl, name } = req.body;
    if (!audioUrl) {
      return res.status(400).json({ error: "audioUrl is required" });
    }

    // Fetch audio sample
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) {
      return res.status(400).json({ error: "Could not fetch audio from URL" });
    }
    const audioBuffer = await audioResp.arrayBuffer();

    // Build multipart form for ElevenLabs voice clone
    const boundary = "----ElevenLabsBoundary" + Date.now();
    const voiceName = name || `dub_clone_${Date.now()}`;

    const parts = [];

    // Name field
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${voiceName}`
    );

    // Audio file
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="sample.wav"\r\nContent-Type: audio/wav\r\n\r\n`
    );

    const preFileBytes = Buffer.from(parts.join("\r\n") + "\r\n", "utf-8");
    const audioBytes = Buffer.from(audioBuffer);
    const closingBytes = Buffer.from(`\r\n--${boundary}--\r\n`, "utf-8");
    const body = Buffer.concat([preFileBytes, audioBytes, closingBytes]);

    const cloneResp = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!cloneResp.ok) {
      const err = await cloneResp.text();
      return res.status(cloneResp.status).json({ error: err });
    }

    const result = await cloneResp.json();
    res.json({ voice_id: result.voice_id });
  } catch (e) {
    res.status(500).json({ error: e.message || "Internal server error" });
  }
}
