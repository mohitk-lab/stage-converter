import { useState, useRef } from "react";

/* ========================================
   SUBTITLE STUDIO (SRT Editor)
   Visual SRT editing, format conversion,
   and bulk translation for RUHI
======================================== */

const LANGUAGES = [
  { value: "hindi", label: "Hindi" },
  { value: "english", label: "English" },
  { value: "haryanvi", label: "Haryanvi" },
  { value: "rajasthani", label: "Rajasthani" },
  { value: "bhojpuri", label: "Bhojpuri" },
  { value: "gujarati", label: "Gujarati" },
  { value: "marathi", label: "Marathi" },
  { value: "bengali", label: "Bengali" },
  { value: "punjabi", label: "Punjabi" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "kannada", label: "Kannada" },
  { value: "malayalam", label: "Malayalam" },
  { value: "odia", label: "Odia" },
  { value: "assamese", label: "Assamese" },
  { value: "urdu", label: "Urdu" },
];

/* --- Parsers --- */
function parseSrt(text) {
  const blocks = [];
  const parts = text.trim().split(/\n\s*\n/);
  for (const part of parts) {
    const lines = part.trim().split("\n");
    if (lines.length < 3) continue;
    blocks.push({
      id: crypto.randomUUID(),
      index: lines[0].trim(),
      time: lines[1].trim(),
      text: lines.slice(2).join("\n"),
    });
  }
  return blocks;
}

function parseVtt(text) {
  const blocks = [];
  const raw = text.replace(/^WEBVTT[^\n]*\n/, "").trim();
  const parts = raw.split(/\n\s*\n/);
  for (const part of parts) {
    const lines = part.trim().split("\n");
    if (lines.length < 2) continue;
    const timeLineIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeLineIdx === -1) continue;
    const timeLine = lines[timeLineIdx].trim().replace(/\./g, ",");
    const textLines = lines.slice(timeLineIdx + 1).join("\n");
    blocks.push({
      id: crypto.randomUUID(),
      index: String(blocks.length + 1),
      time: timeLine,
      text: textLines,
    });
  }
  return blocks;
}

/* --- Builders --- */
function buildSrt(blocks) {
  return (
    blocks
      .map((b, i) => (i + 1) + "\n" + b.time + "\n" + b.text)
      .join("\n\n") + "\n"
  );
}

function buildVtt(blocks) {
  return (
    "WEBVTT\n\n" +
    blocks
      .map((b) => b.time.replace(/,/g, ".") + "\n" + b.text)
      .join("\n\n") +
    "\n"
  );
}

function buildTxt(blocks) {
  return blocks.map((b) => b.text).join("\n\n") + "\n";
}

/* --- Time helpers --- */
function timeToSeconds(ts) {
  const m = ts.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return 0;
  return (
    parseInt(m[1]) * 3600 +
    parseInt(m[2]) * 60 +
    parseInt(m[3]) +
    parseInt(m[4]) / 1000
  );
}

function secondsToTimestamp(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(sec).padStart(2, "0") +
    "," +
    String(ms).padStart(3, "0")
  );
}

function parseTimeLine(time) {
  const parts = time.split("-->");
  if (parts.length !== 2) return null;
  return {
    start: timeToSeconds(parts[0].trim()),
    end: timeToSeconds(parts[1].trim()),
  };
}

/* --- Download helper --- */
function downloadText(content, filename, mime = "text/plain") {
  const blob = new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ===== COMPONENT ===== */
export default function SubtitleStudio({ darkMode, streamConvert }) {
  const dm = darkMode;

  const [blocks, setBlocks] = useState([]);
  const [fileName, setFileName] = useState("");
  const [targetLang, setTargetLang] = useState("hindi");
  const [translating, setTranslating] = useState(false);
  const [translatingProgress, setTranslatingProgress] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState("");

  const fileRef = useRef(null);

  /* --- Styles --- */
  const cardBg = dm
    ? "linear-gradient(145deg, #111111, #0a0a0a)"
    : "linear-gradient(145deg, #f5f0e8, #ece7dd)";
  const clayShadow = dm
    ? "6px 6px 14px rgba(0,0,0,0.55), -4px -4px 10px rgba(255,255,255,0.03), inset 1px 1px 2px rgba(255,255,255,0.04)"
    : "6px 6px 14px rgba(166,152,130,0.35), -4px -4px 10px rgba(255,255,255,0.75), inset 1px 1px 2px rgba(255,255,255,0.6)";
  const innerShadow = dm
    ? "inset 3px 3px 6px rgba(0,0,0,0.5), inset -2px -2px 4px rgba(255,255,255,0.03)"
    : "inset 3px 3px 6px rgba(166,152,130,0.3), inset -2px -2px 4px rgba(255,255,255,0.7)";
  const textColor = dm ? "#e8e0d4" : "#3d3425";
  const mutedColor = dm ? "#b0a090" : "#92400e";
  const accent = "#f59e0b";
  const borderColor = dm ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const cardStyle = {
    background: cardBg,
    borderRadius: "18px",
    boxShadow: clayShadow,
    border: `1px solid ${borderColor}`,
    padding: "20px",
    marginBottom: "16px",
  };

  const btnStyle = (highlight = false) => ({
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 700,
    color: highlight ? "#fff" : (dm ? "#d4c8b0" : "#78350f"),
    background: highlight
      ? `linear-gradient(145deg, ${accent}, #d97706)`
      : (dm ? "linear-gradient(145deg, #1a1a1a, #111)" : "linear-gradient(145deg, #f0e8da, #e5ddd0)"),
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    boxShadow: highlight
      ? `4px 4px 10px rgba(0,0,0,0.3), -2px -2px 6px rgba(255,255,255,0.05)`
      : clayShadow,
    fontFamily: "'Inter','Segoe UI',sans-serif",
    transition: "all 0.15s ease",
    letterSpacing: "0.3px",
  });

  const smallBtnStyle = {
    padding: "4px 10px",
    fontSize: "10px",
    fontWeight: 700,
    color: dm ? "#d4c8b0" : "#78350f",
    background: dm ? "linear-gradient(145deg, #1a1a1a, #111)" : "linear-gradient(145deg, #f0e8da, #e5ddd0)",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    boxShadow: clayShadow,
    fontFamily: "'Inter','Segoe UI',sans-serif",
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: 600,
    color: textColor,
    background: dm
      ? "linear-gradient(145deg, #0d0d0d, #080808)"
      : "linear-gradient(145deg, #e8e0d4, #ddd5c9)",
    border: "none",
    borderRadius: "10px",
    boxShadow: innerShadow,
    outline: "none",
    fontFamily: "'Inter','Segoe UI',sans-serif",
    boxSizing: "border-box",
  };

  const selectStyle = {
    ...inputStyle,
    appearance: "none",
    WebkitAppearance: "none",
    cursor: "pointer",
    paddingRight: "32px",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378350f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
  };

  const labelStyle = {
    display: "block",
    fontSize: "10px",
    fontWeight: 700,
    color: mutedColor,
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  };

  /* --- File upload --- */
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setFileName(file.name);
      try {
        if (file.name.endsWith(".vtt")) {
          setBlocks(parseVtt(text));
        } else {
          setBlocks(parseSrt(text));
        }
      } catch {
        setError("Failed to parse subtitle file.");
      }
    };
    reader.readAsText(file);
  }

  /* --- Block editing --- */
  function updateBlock(id, field, value) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  }

  function deleteBlock(id) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function addBlockAfter(id) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const current = prev[idx];
      const parsed = parseTimeLine(current.time);
      const newStart = parsed ? parsed.end : 0;
      const newEnd = newStart + 2;
      const newBlock = {
        id: crypto.randomUUID(),
        index: String(idx + 2),
        time: secondsToTimestamp(newStart) + " --> " + secondsToTimestamp(newEnd),
        text: "",
      };
      const copy = [...prev];
      copy.splice(idx + 1, 0, newBlock);
      return copy;
    });
  }

  function addBlockAtEnd() {
    const last = blocks[blocks.length - 1];
    const parsed = last ? parseTimeLine(last.time) : null;
    const newStart = parsed ? parsed.end : 0;
    const newEnd = newStart + 2;
    setBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        index: String(prev.length + 1),
        time: secondsToTimestamp(newStart) + " --> " + secondsToTimestamp(newEnd),
        text: "",
      },
    ]);
  }

  /* --- Merge two consecutive blocks --- */
  function mergeBlocks(idx) {
    if (idx >= blocks.length - 1) return;
    setBlocks((prev) => {
      const a = prev[idx];
      const b = prev[idx + 1];
      const parsedA = parseTimeLine(a.time);
      const parsedB = parseTimeLine(b.time);
      const merged = {
        ...a,
        time:
          secondsToTimestamp(parsedA ? parsedA.start : 0) +
          " --> " +
          secondsToTimestamp(parsedB ? parsedB.end : 0),
        text: a.text + "\n" + b.text,
      };
      const copy = [...prev];
      copy.splice(idx, 2, merged);
      return copy;
    });
  }

  /* --- Split block at midpoint --- */
  function splitBlock(idx) {
    setBlocks((prev) => {
      const block = prev[idx];
      const parsed = parseTimeLine(block.time);
      if (!parsed) return prev;
      const mid = (parsed.start + parsed.end) / 2;
      const lines = block.text.split("\n");
      const splitPoint = Math.max(1, Math.ceil(lines.length / 2));
      const first = {
        ...block,
        time: secondsToTimestamp(parsed.start) + " --> " + secondsToTimestamp(mid),
        text: lines.slice(0, splitPoint).join("\n"),
      };
      const second = {
        id: crypto.randomUUID(),
        index: String(idx + 2),
        time: secondsToTimestamp(mid) + " --> " + secondsToTimestamp(parsed.end),
        text: lines.slice(splitPoint).join("\n") || "",
      };
      const copy = [...prev];
      copy.splice(idx, 1, first, second);
      return copy;
    });
  }

  /* --- AI Translation --- */
  async function translateAll() {
    if (!blocks.length) return;
    setTranslating(true);
    setTranslatingProgress("Starting translation...");
    setError("");

    const lang = LANGUAGES.find((l) => l.value === targetLang)?.label || targetLang;
    const allText = blocks.map((b) => b.text).join("\n---BLOCK---\n");

    try {
      const result = await streamConvert({
        model: "anthropic/claude-sonnet-4-5",
        system: `You are a professional subtitle translator. Translate each line to ${lang}. Keep the same number of lines. Output ONLY the translated lines, one per line. No numbering, no timestamps. Blocks are separated by ---BLOCK--- markers. Keep these markers in your output to separate translated blocks.`,
        messages: [{ role: "user", content: allText }],
        onChunk: (partial) => {
          const doneCount = (partial.match(/---BLOCK---/g) || []).length;
          setTranslatingProgress(
            `Translating... ${Math.min(doneCount + 1, blocks.length)}/${blocks.length} blocks`
          );
        },
      });

      const translatedBlocks = result.split("---BLOCK---").map((t) => t.trim());
      setBlocks((prev) =>
        prev.map((b, i) => ({
          ...b,
          text: translatedBlocks[i] !== undefined ? translatedBlocks[i] : b.text,
        }))
      );
      setTranslatingProgress("");
    } catch (err) {
      setError("Translation failed: " + (err.message || "Unknown error"));
    } finally {
      setTranslating(false);
    }
  }

  /* --- Stats --- */
  function getStats() {
    if (!blocks.length) return null;
    let totalDuration = 0;
    let totalChars = 0;
    for (const b of blocks) {
      const parsed = parseTimeLine(b.time);
      if (parsed) totalDuration += parsed.end - parsed.start;
      totalChars += b.text.length;
    }
    return {
      count: blocks.length,
      duration: totalDuration,
      avgLen: Math.round(totalChars / blocks.length),
    };
  }

  const stats = getStats();

  /* ===== RENDER ===== */
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 800, color: textColor, margin: "0 0 4px 0" }}>
          Subtitle Studio
        </h2>
        <p style={{ fontSize: "12px", color: mutedColor, margin: 0 }}>
          SRT / VTT Editor &bull; Format Conversion &bull; AI Translation
        </p>
      </div>

      {/* Upload + Controls Card */}
      <div style={cardStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
          {/* Upload */}
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>Upload Subtitle File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".srt,.vtt"
              onChange={handleFile}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="clay-btn"
              style={{
                ...btnStyle(false),
                width: "100%",
                textAlign: "left",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fileName || "Choose .srt or .vtt file"}
            </button>
          </div>

          {/* Language selector */}
          <div style={{ flex: "1 1 160px" }}>
            <label style={labelStyle}>Translate To</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              style={selectStyle}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Translate button */}
          <div>
            <button
              onClick={translateAll}
              disabled={translating || !blocks.length}
              className="clay-btn-primary"
              style={{
                ...btnStyle(true),
                opacity: translating || !blocks.length ? 0.5 : 1,
                cursor: translating || !blocks.length ? "not-allowed" : "pointer",
                minWidth: "120px",
              }}
            >
              {translating ? "Translating..." : "Translate All"}
            </button>
          </div>
        </div>

        {translatingProgress && (
          <div style={{ marginTop: "8px", fontSize: "11px", color: accent, fontWeight: 600 }}>
            {translatingProgress}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: "8px",
              fontSize: "11px",
              color: "#ef4444",
              fontWeight: 600,
              padding: "8px 12px",
              background: dm ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)",
              borderRadius: "10px",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Stats + Actions Bar */}
      {blocks.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
            {/* Stats */}
            {stats && (
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: accent }}>{stats.count}</div>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: mutedColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Blocks
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: accent }}>
                    {Math.floor(stats.duration / 60)}:{String(Math.floor(stats.duration % 60)).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: mutedColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Duration
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: accent }}>{stats.avgLen}</div>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: mutedColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Avg Chars
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() => downloadText(buildSrt(blocks), (fileName || "subtitles").replace(/\.\w+$/, "") + ".srt")}
                className="clay-btn"
                style={smallBtnStyle}
              >
                Download SRT
              </button>
              <button
                onClick={() => downloadText(buildVtt(blocks), (fileName || "subtitles").replace(/\.\w+$/, "") + ".vtt")}
                className="clay-btn"
                style={smallBtnStyle}
              >
                Download VTT
              </button>
              <button
                onClick={() => downloadText(buildTxt(blocks), (fileName || "subtitles").replace(/\.\w+$/, "") + ".txt")}
                className="clay-btn"
                style={smallBtnStyle}
              >
                Download TXT
              </button>
              <button
                onClick={() => setPreviewOpen((p) => !p)}
                className="clay-btn"
                style={{ ...smallBtnStyle, color: previewOpen ? accent : smallBtnStyle.color }}
              >
                {previewOpen ? "Hide Preview" : "Preview"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Panel */}
      {previewOpen && blocks.length > 0 && (
        <div style={{ ...cardStyle, maxHeight: "300px", overflowY: "auto" }}>
          <label style={{ ...labelStyle, marginBottom: "12px" }}>Subtitle Preview</label>
          {blocks.map((b, i) => {
            const parsed = parseTimeLine(b.time);
            return (
              <div
                key={b.id}
                style={{
                  padding: "8px 12px",
                  marginBottom: "6px",
                  borderRadius: "10px",
                  background: dm ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                  borderLeft: `3px solid ${accent}`,
                }}
              >
                <div style={{ fontSize: "10px", color: mutedColor, fontWeight: 700, marginBottom: "2px" }}>
                  {parsed
                    ? `${secondsToTimestamp(parsed.start).replace(",", ".")} - ${secondsToTimestamp(parsed.end).replace(",", ".")}`
                    : b.time}
                </div>
                <div style={{ fontSize: "13px", color: textColor, whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                  {b.text}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Block Editor - Timeline Layout */}
      <div style={{ position: "relative" }}>
        {/* Vertical timeline line */}
        {blocks.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: "20px",
              top: "0",
              bottom: "0",
              width: "2px",
              background: dm
                ? "linear-gradient(to bottom, transparent, rgba(245,158,11,0.3), transparent)"
                : "linear-gradient(to bottom, transparent, rgba(245,158,11,0.4), transparent)",
              zIndex: 0,
            }}
          />
        )}

        {blocks.map((block, idx) => {
          const parsed = parseTimeLine(block.time);
          return (
            <div
              key={block.id}
              style={{
                position: "relative",
                paddingLeft: "48px",
                marginBottom: "12px",
                zIndex: 1,
              }}
            >
              {/* Timeline dot */}
              <div
                style={{
                  position: "absolute",
                  left: "13px",
                  top: "22px",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: accent,
                  boxShadow: `0 0 8px rgba(245,158,11,0.4)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "8px",
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                {idx + 1}
              </div>

              {/* Block card */}
              <div style={cardStyle}>
                {/* Header row */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: accent,
                      minWidth: "24px",
                    }}
                  >
                    #{idx + 1}
                  </span>

                  {/* Timestamp input */}
                  <input
                    value={block.time}
                    onChange={(e) => updateBlock(block.id, "time", e.target.value)}
                    style={{
                      ...inputStyle,
                      width: "auto",
                      flex: "1 1 280px",
                      fontSize: "12px",
                      fontFamily: "'JetBrains Mono','Fira Code',monospace",
                      letterSpacing: "0.5px",
                    }}
                  />

                  {/* Duration badge */}
                  {parsed && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        color: dm ? "#888" : "#999",
                        padding: "3px 8px",
                        borderRadius: "8px",
                        background: dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                      }}
                    >
                      {(parsed.end - parsed.start).toFixed(1)}s
                    </span>
                  )}
                </div>

                {/* Text area */}
                <textarea
                  value={block.text}
                  onChange={(e) => updateBlock(block.id, "text", e.target.value)}
                  rows={Math.max(2, block.text.split("\n").length)}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    lineHeight: "1.6",
                    minHeight: "48px",
                  }}
                />

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => deleteBlock(block.id)}
                    className="clay-btn"
                    style={{ ...smallBtnStyle, color: "#ef4444" }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => addBlockAfter(block.id)}
                    className="clay-btn"
                    style={smallBtnStyle}
                  >
                    + Add After
                  </button>
                  {idx < blocks.length - 1 && (
                    <button
                      onClick={() => mergeBlocks(idx)}
                      className="clay-btn"
                      style={smallBtnStyle}
                    >
                      Merge Down
                    </button>
                  )}
                  <button
                    onClick={() => splitBlock(idx)}
                    className="clay-btn"
                    style={smallBtnStyle}
                  >
                    Split
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Block button */}
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <button
          onClick={addBlockAtEnd}
          className="clay-btn"
          style={{
            ...btnStyle(false),
            padding: "12px 28px",
            fontSize: "13px",
          }}
        >
          + Add New Block
        </button>
      </div>

      {/* Empty state */}
      {blocks.length === 0 && (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "48px 20px",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.5 }}>
            CC
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: textColor, marginBottom: "6px" }}>
            No subtitles loaded
          </div>
          <div style={{ fontSize: "12px", color: mutedColor }}>
            Upload an .srt or .vtt file above, or click "Add New Block" to start from scratch.
          </div>
        </div>
      )}
    </div>
  );
}
