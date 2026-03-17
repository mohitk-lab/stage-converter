export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: "ELEVENLABS_API_KEY is not configured. Please add it to your Vercel project environment variables." });
  }
  try {
    const resp = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }
    });
    if (!resp.ok) {
      return res.status(resp.status).json({ error: "Failed to fetch voices" });
    }
    const data = await resp.json();
    const voices = (data.voices || []).map(v => ({
      voice_id: v.voice_id,
      name: v.name,
      labels: v.labels || {},
      preview_url: v.preview_url
    }));
    res.json(voices);
  } catch (e) {
    res.status(500).json({ error: "Internal server error" });
  }
}
