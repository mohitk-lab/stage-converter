export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: "REPLICATE_API_TOKEN is not configured. Please add it to your Vercel project environment variables." });
  }
  try {
    const { audioUrl } = req.body;
    if (!audioUrl) {
      return res.status(400).json({ error: "audioUrl is required" });
    }

    // Use model-based API (always uses latest version, resilient to deprecation)
    const response = await fetch("https://api.replicate.com/v1/models/cjwbw/demucs/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "respond-async",
      },
      body: JSON.stringify({
        input: {
          audio: audioUrl,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `Replicate API error (${response.status}): ${err}` });
    }

    const prediction = await response.json();
    res.json({ predictionId: prediction.id, status: prediction.status, urls: prediction.urls || null });
  } catch (e) {
    res.status(500).json({ error: e.message || "Internal server error" });
  }
}
