// Serverless function to fetch Google Docs, Sheets, and other document URLs
// Handles CORS issues by proxying the request server-side

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    let fetchUrl = url;
    let docType = "unknown";

    // Google Docs → export as plain text
    const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docsMatch) {
      fetchUrl = `https://docs.google.com/document/d/${docsMatch[1]}/export?format=txt`;
      docType = "google-doc";
    }

    // Google Sheets → export as CSV
    const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetsMatch) {
      // Check if specific sheet/gid is specified
      const gidMatch = url.match(/gid=(\d+)/);
      const sheetMatch = url.match(/[#&]sheet=([^&]+)/);
      let csvUrl = `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/export?format=csv`;
      if (gidMatch) csvUrl += `&gid=${gidMatch[1]}`;
      if (sheetMatch) csvUrl += `&sheet=${encodeURIComponent(sheetMatch[1])}`;
      fetchUrl = csvUrl;
      docType = "google-sheet";
    }

    // Google Drive file → try export as text
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      fetchUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
      docType = "google-drive";
    }

    // Follow redirects and fetch
    let response = await fetch(fetchUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StageApp/1.0)",
      },
    });

    // Handle Google redirects (307/302)
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        response = await fetch(redirectUrl, {
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; StageApp/1.0)" },
        });
      }
    }

    if (!response.ok) {
      return res.status(400).json({
        error: `Could not fetch document (${response.status}). Make sure the link is publicly accessible or "Anyone with the link" sharing is enabled.`,
        docType,
      });
    }

    const contentType = response.headers.get("content-type") || "";
    let text = "";

    // For binary/PDF content, we can't extract text server-side easily
    if (contentType.includes("application/pdf")) {
      return res.status(400).json({
        error: "PDF files are not supported yet. Please copy-paste the text manually or download and upload as .txt file.",
        docType: "pdf",
      });
    }

    text = await response.text();

    // Clean up HTML if we got an HTML response (some Google exports return HTML)
    if (contentType.includes("text/html") && docType !== "unknown") {
      // Strip HTML tags for a basic text extraction
      text = text
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/tr>/gi, "\n")
        .replace(/<\/td>/gi, "\t")
        .replace(/<\/th>/gi, "\t")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    if (!text || text.length < 10) {
      return res.status(400).json({
        error: "Document appears empty or could not be read. Make sure it is publicly shared.",
        docType,
      });
    }

    return res.status(200).json({
      text,
      docType,
      charCount: text.length,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Failed to fetch document",
    });
  }
}
