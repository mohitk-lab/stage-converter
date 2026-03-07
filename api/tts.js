export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { text, voice_id, model_id, voice_settings, output_format, speed } = req.body;
    if (!text || !voice_id) {
      return res.status(400).json({ error: "text and voice_id are required" });
    }
    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice_id)}?output_format=${output_format || "mp3_44100_128"}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: model_id || "eleven_multilingual_v3",
          voice_settings: {
            stability: voice_settings?.stability ?? 0.5,
            similarity_boost: voice_settings?.similarity_boost ?? 0.75,
            style: voice_settings?.style ?? 0,
            use_speaker_boost: voice_settings?.use_speaker_boost ?? true,
          },
          speed: speed || 1.0
        })
      }
    );
    if (!resp.ok) {
      const err = await resp.text();
      return res.status(resp.status).json({ error: err });
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "inline");
    const buffer = Buffer.from(await resp.arrayBuffer());
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: "Internal server error" });
  }
}
