import { handleUpload } from "@vercel/blob/client";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      error: "BLOB_READ_WRITE_TOKEN is not configured. Please add it to your Vercel project environment variables."
    });
  }

  try {
    const body = await handleUpload({
      body: req,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: [
            "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
            "video/x-matroska", "audio/wav", "audio/mpeg", "audio/webm",
            "audio/x-wav", "audio/ogg"
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Optional: log upload completion
      },
    });
    res.json(body);
  } catch (e) {
    const message = e.message || "Upload failed";
    const isBlobTokenError = message.toLowerCase().includes("token") || message.toLowerCase().includes("unauthorized");
    res.status(isBlobTokenError ? 500 : 400).json({
      error: isBlobTokenError
        ? "Blob storage token error. Check BLOB_READ_WRITE_TOKEN in Vercel environment variables."
        : message
    });
  }
}
