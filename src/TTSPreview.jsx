import { useState, useRef, useEffect } from "react";

/* --- TTS Audio Preview Tab --- */
/* Quick text-to-speech preview — type text, pick voice, instant audio */
export default function TTSPreview({ darkMode }) {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [model, setModel] = useState("eleven_multilingual_v3");
  const [speed, setSpeed] = useState(1.0);
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const audioRef = useRef(null);

  const b = darkMode;
  const cardBg = b ? "linear-gradient(145deg, #111111, #0a0a0a)" : "linear-gradient(145deg, #f5f0e8, #ece7dd)";
  const cardShadow = b
    ? "8px 8px 16px rgba(0,0,0,0.7), -6px -6px 14px rgba(255,255,255,0.03), inset 0 2px 0 rgba(255,255,255,0.05)"
    : "8px 8px 16px rgba(166,152,130,0.4), -6px -6px 14px rgba(255,255,255,0.8), inset 0 2px 0 rgba(255,255,255,0.6)";
  const border = b ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.5)";
  const innerBg = b ? "linear-gradient(145deg, #0d0d0d, #080808)" : "linear-gradient(145deg, #ece7dd, #e0d8cc)";
  const innerShadow = b ? "inset 4px 4px 8px rgba(0,0,0,0.5), inset -3px -3px 6px rgba(255,255,255,0.02)" : "inset 4px 4px 8px rgba(166,152,130,0.3), inset -3px -3px 6px rgba(255,255,255,0.5)";
  const textColor = b ? "#e8e0d4" : "#1e1b18";
  const subColor = b ? "#b0a090" : "#78350f";
  const mutedColor = b ? "#807060" : "#a08060";

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      const res = await fetch("/api/voices");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setVoices(data);
      if (data.length > 0) setSelectedVoice(data[0].voice_id);
    } catch { setError("Failed to load voices. Make sure ElevenLabs API is configured."); }
  };

  const generate = async () => {
    if (!text.trim() || !selectedVoice) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.substring(0, 5000),
          voice_id: selectedVoice,
          model_id: model,
          voice_settings: { stability, similarity_boost: similarity, style: 0, use_speaker_boost: true },
          speed,
          output_format: "mp3_44100_128",
        }),
      });
      if (!res.ok) throw new Error("Voice generation failed");
      const blob = await res.blob();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      // Add to history
      const voiceName = voices.find(v => v.voice_id === selectedVoice)?.name || "Unknown";
      setHistory(prev => [{ id: Date.now(), text: text.slice(0, 80), voiceName, url, date: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
    } catch (e) { setError(e.message); }
    setGenerating(false);
  };

  const downloadAudio = (url, name) => {
    const a = document.createElement("a");
    a.href = url || audioUrl;
    a.download = `tts-preview-${name || "audio"}.mp3`;
    a.click();
  };

  // Quick presets
  const presets = [
    { label: "Promo", text: "इस बार का सबसे बड़ा ब्लॉकबस्टर, सिर्फ आपके लिए! देखिए पूरी फिल्म सिनेमाघरों में।" },
    { label: "News", text: "ताज़ा ख़बर: आज दिल्ली में बारिश का सिलसिला जारी, मौसम विभाग ने अलर्ट जारी किया।" },
    { label: "Dialogue", text: "तुम्हें पता है, ज़िंदगी में कुछ पल ऐसे होते हैं जो हमेशा याद रहते हैं। यह उनमें से एक है।" },
    { label: "Caption", text: "Life is better with good vibes and great people! 🌟 #motivation" },
    { label: "Song", text: "तेरे बिना जिंदगी से, कोई शिकवा तो नहीं... तेरे बिना जिंदगी भी, लेकिन जिंदगी तो नहीं।" },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 22px 80px", animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ background: cardBg, borderRadius: 24, boxShadow: cardShadow, border, padding: "22px 28px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: textColor }}>🔊 TTS Audio Preview</div>
            <div style={{ fontSize: 12, color: subColor, marginTop: 4 }}>Type text → pick voice → instant audio preview</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#16a34a", fontWeight: 700, padding: "5px 12px", borderRadius: 12, background: b ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
            ElevenLabs
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        {/* Left - Text Input & Audio */}
        <div>
          {/* Quick Presets */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: subColor, alignSelf: "center" }}>Quick:</span>
            {presets.map(p => (
              <button key={p.label} onClick={() => setText(p.text)} style={{
                padding: "4px 10px", borderRadius: 8, border: `1px solid ${b ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.15)"}`,
                background: "transparent", color: mutedColor, fontSize: 10, fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.1)"; e.currentTarget.style.color = "#f59e0b"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = mutedColor; }}
              >{p.label}</button>
            ))}
          </div>

          {/* Text Area */}
          <div style={{ background: cardBg, borderRadius: 20, boxShadow: cardShadow, border, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.12)"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: subColor, letterSpacing: 1, textTransform: "uppercase" }}>✍️ Text to Speak</span>
              <span style={{ fontSize: 10, color: text.length > 5000 ? "#ef4444" : mutedColor, fontWeight: 600 }}>{text.length}/5000</span>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type or paste any text here... Hindi, English, or any language supported by ElevenLabs."
                style={{
                  width: "100%", minHeight: 150, background: "transparent", border: "none", outline: "none",
                  color: textColor, fontSize: 14, lineHeight: 1.9, resize: "vertical",
                  fontFamily: "'Inter','Segoe UI',sans-serif",
                }}
              />
            </div>
            <div style={{ padding: "12px 18px", borderTop: `1px solid ${b ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.1)"}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 10, color: mutedColor }}>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
              <button
                onClick={generate}
                disabled={generating || !text.trim() || !selectedVoice}
                style={{
                  padding: "10px 24px", borderRadius: 14, border: "none", cursor: generating || !text.trim() ? "not-allowed" : "pointer",
                  fontSize: 13, fontWeight: 800, color: "#fff",
                  background: generating || !text.trim() ? (b ? "linear-gradient(145deg, #1a1a1a, #111)" : "linear-gradient(145deg, #d4cfc5, #c8c0b4)") : "linear-gradient(145deg, #ffb347, #e89520)",
                  boxShadow: generating || !text.trim() ? "none" : "5px 5px 12px rgba(200,130,20,0.4), -4px -4px 8px rgba(255,220,150,0.3)",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.2s",
                }}
              >
                {generating ? (
                  <><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Generating...</>
                ) : "🔊 Generate Audio"}
              </button>
            </div>
          </div>

          {/* Audio Player */}
          {audioUrl && (
            <div style={{ background: cardBg, borderRadius: 20, boxShadow: cardShadow, border, padding: "16px 20px", marginBottom: 16, borderLeft: "4px solid #22c55e", animation: "fadeUp 0.25s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>🎵</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>Preview Ready</span>
              </div>
              <audio ref={audioRef} controls src={audioUrl} style={{ width: "100%", borderRadius: 8, height: 40, ...(b ? { filter: "invert(0.85) hue-rotate(180deg)" } : {}) }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => downloadAudio(audioUrl, "preview")} style={{
                  padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 700, color: "#16a34a",
                  background: b ? "linear-gradient(145deg, #111, #0a0a0a)" : "linear-gradient(145deg, #f5f0e8, #e0d8cc)",
                  boxShadow: b ? "5px 5px 10px rgba(0,0,0,0.5)" : "5px 5px 10px rgba(166,152,130,0.4)",
                }}>⬇ Download MP3</button>
                <button onClick={() => { if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null); }} style={{
                  padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 700, color: mutedColor,
                  background: b ? "linear-gradient(145deg, #111, #0a0a0a)" : "linear-gradient(145deg, #f5f0e8, #e0d8cc)",
                  boxShadow: b ? "5px 5px 10px rgba(0,0,0,0.5)" : "5px 5px 10px rgba(166,152,130,0.4)",
                }}>🔄 Regenerate</button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: "12px 16px", borderRadius: 12, fontSize: 12, color: "#dc2626", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.12)", marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Right - Voice Settings */}
        <div>
          <div style={{ background: cardBg, borderRadius: 20, boxShadow: cardShadow, border, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.12)"}` }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: subColor, letterSpacing: 1, textTransform: "uppercase" }}>🎤 Voice Settings</span>
            </div>
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Voice Select */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: subColor, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Voice</label>
                <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} style={{
                  width: "100%", padding: "8px 12px", borderRadius: 10, border: "none",
                  fontSize: 12, fontWeight: 600, color: textColor, cursor: "pointer",
                  background: innerBg, boxShadow: innerShadow,
                }}>
                  {voices.length === 0 && <option value="">Loading voices...</option>}
                  {voices.map(v => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name}{v.labels?.accent ? ` (${v.labels.accent})` : ""}{v.labels?.gender ? ` - ${v.labels.gender}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: subColor, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Model</label>
                <select value={model} onChange={e => setModel(e.target.value)} style={{
                  width: "100%", padding: "8px 12px", borderRadius: 10, border: "none",
                  fontSize: 12, fontWeight: 600, color: textColor, cursor: "pointer",
                  background: innerBg, boxShadow: innerShadow,
                }}>
                  <option value="eleven_multilingual_v3">Multilingual v3 (Latest)</option>
                  <option value="eleven_flash_v3">Flash v3 (Fast)</option>
                  <option value="eleven_multilingual_v2">Multilingual v2</option>
                  <option value="eleven_flash_v2_5">Flash v2.5</option>
                </select>
              </div>

              {/* Speed */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: subColor, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Speed ({speed.toFixed(1)}x)</label>
                <input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={e => setSpeed(+e.target.value)} style={{ width: "100%", accentColor: "#f59e0b", height: 4 }} />
              </div>

              {/* Stability */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: subColor, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Stability ({stability.toFixed(2)})</label>
                <input type="range" min="0" max="1" step="0.05" value={stability} onChange={e => setStability(+e.target.value)} style={{ width: "100%", accentColor: "#f59e0b", height: 4 }} />
              </div>

              {/* Similarity */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: subColor, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Similarity ({similarity.toFixed(2)})</label>
                <input type="range" min="0" max="1" step="0.05" value={similarity} onChange={e => setSimilarity(+e.target.value)} style={{ width: "100%", accentColor: "#f59e0b", height: 4 }} />
              </div>
            </div>
          </div>

          {/* Audio History */}
          {history.length > 0 && (
            <div style={{ background: cardBg, borderRadius: 20, boxShadow: cardShadow, border, overflow: "hidden" }}>
              <div style={{ padding: "12px 18px", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.12)"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: subColor, letterSpacing: 1, textTransform: "uppercase" }}>📜 Recent</span>
                <button onClick={() => setHistory([])} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#dc2626", fontWeight: 700 }}>Clear</button>
              </div>
              <div style={{ padding: "8px 12px", maxHeight: 300, overflowY: "auto" }}>
                {history.map(h => (
                  <div key={h.id} style={{ padding: "8px 10px", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.04)" : "rgba(166,152,130,0.06)"}`, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.text}...</div>
                      <div style={{ fontSize: 9, color: mutedColor }}>{h.voiceName} · {h.date}</div>
                    </div>
                    <button onClick={() => downloadAudio(h.url, h.id)} style={{
                      padding: "3px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                      fontSize: 9, fontWeight: 700, color: "#16a34a", background: "transparent",
                    }}>⬇</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
