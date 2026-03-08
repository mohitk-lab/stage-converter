export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: "REPLICATE_API_TOKEN is not configured. Please add it to your Vercel project environment variables." });
  }
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "id query param is required" });
    }

    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const prediction = await response.json();
    res.json({
      status: prediction.status,
      output: prediction.output || null,
      error: prediction.error || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Internal server error" });
  }
}
