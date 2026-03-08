import { useState, useMemo } from "react";

/* --- Script Diff / Comparison View --- */
export default function ScriptDiff({ original, results, languages, darkMode }) {
  const [selectedLangs, setSelectedLangs] = useState(() => {
    const ids = Object.keys(results || {});
    return ids.slice(0, 2);
  });
  const [viewMode, setViewMode] = useState("side"); // "side" or "inline"
  const [showWordDiff, setShowWordDiff] = useState(true);

  const availableLangs = useMemo(() =>
    languages.filter(l => results[l.id]),
    [languages, results]
  );

  const toggleLang = (id) => {
    setSelectedLangs(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  // Simple word-level diff
  const computeDiff = (textA, textB) => {
    if (!textA || !textB) return { a: [], b: [] };
    const wordsA = textA.split(/(\s+)/);
    const wordsB = textB.split(/(\s+)/);
    const setB = new Set(wordsB.filter(w => w.trim()));
    const setA = new Set(wordsA.filter(w => w.trim()));
    const diffA = wordsA.map(w => ({ text: w, changed: w.trim() && !setB.has(w) }));
    const diffB = wordsB.map(w => ({ text: w, changed: w.trim() && !setA.has(w) }));
    return { a: diffA, b: diffB };
  };

  // Stats
  const getStats = (text) => {
    if (!text) return { words: 0, chars: 0, lines: 0, sentences: 0 };
    return {
      words: text.trim().split(/\s+/).filter(Boolean).length,
      chars: text.length,
      lines: text.split("\n").length,
      sentences: text.split(/[.!?।\u0964]+/).filter(s => s.trim()).length,
    };
  };

  const b = darkMode;
  const cardBg = b ? "linear-gradient(145deg, #111111, #0a0a0a)" : "linear-gradient(145deg, #f5f0e8, #ece7dd)";
  const cardShadow = b
    ? "8px 8px 16px rgba(0,0,0,0.7), -6px -6px 14px rgba(255,255,255,0.03), inset 0 2px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.3)"
    : "8px 8px 16px rgba(166,152,130,0.4), -6px -6px 14px rgba(255,255,255,0.8), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(166,152,130,0.15)";
  const border = b ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.5)";
  const textColor = b ? "#e8e0d4" : "#1e1b18";
  const subColor = b ? "#b0a090" : "#78350f";
  const mutedColor = b ? "#807060" : "#a08060";
  const innerBg = b ? "linear-gradient(145deg, #0d0d0d, #080808)" : "linear-gradient(145deg, #ece7dd, #e0d8cc)";

  if (!original && Object.keys(results || {}).length === 0) {
    return (
      <div style={{ background: cardBg, borderRadius: 24, boxShadow: cardShadow, border, padding: "40px", textAlign: "center", animation: "fadeUp 0.3s ease" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: textColor }}>No results to compare</div>
        <div style={{ fontSize: 12, color: mutedColor, marginTop: 6 }}>Convert a script first, then come back here to compare outputs</div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ background: cardBg, borderRadius: 24, boxShadow: cardShadow, border, padding: "18px 22px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: textColor, display: "flex", alignItems: "center", gap: 8 }}>
              🔍 Script Comparison
            </div>
            <div style={{ fontSize: 11, color: subColor, marginTop: 2 }}>Compare original with converted outputs side-by-side</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* View Mode Toggle */}
            {["side", "inline"].map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: "5px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                fontSize: 10, fontWeight: 700, textTransform: "capitalize",
                background: viewMode === mode ? "rgba(245,158,11,0.15)" : "transparent",
                color: viewMode === mode ? "#f59e0b" : mutedColor,
                transition: "all 0.15s",
              }}>{mode === "side" ? "📊 Side by Side" : "📝 Inline"}</button>
            ))}
            {/* Word Diff Toggle */}
            <button onClick={() => setShowWordDiff(d => !d)} style={{
              padding: "5px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 700,
              background: showWordDiff ? "rgba(34,197,94,0.12)" : "transparent",
              color: showWordDiff ? "#22c55e" : mutedColor,
              transition: "all 0.15s",
            }}>✨ Highlight Changes</button>
          </div>
        </div>

        {/* Language Selector */}
        <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: subColor, marginRight: 4 }}>COMPARE:</span>
          {availableLangs.map(lang => {
            const on = selectedLangs.includes(lang.id);
            return (
              <button key={lang.id} onClick={() => toggleLang(lang.id)} style={{
                padding: "4px 10px", borderRadius: 10, border: on ? `2px solid ${lang.color}60` : `1px solid ${b ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.15)"}`,
                cursor: "pointer", fontSize: 10, fontWeight: 700,
                background: on ? `${lang.color}15` : "transparent",
                color: on ? lang.color : mutedColor,
                transition: "all 0.15s",
              }}>
                {lang.label} ({lang.sub})
              </button>
            );
          })}
          <span style={{ fontSize: 9, color: mutedColor, marginLeft: 8 }}>Select up to 3</span>
        </div>
      </div>

      {/* Comparison Area */}
      {viewMode === "side" ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${1 + selectedLangs.length}, 1fr)`, gap: 12 }}>
          {/* Original Column */}
          <div style={{ background: cardBg, borderRadius: 20, boxShadow: cardShadow, border, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.12)"}`, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: textColor }}>Original</span>
              <span style={{ fontSize: 9, color: mutedColor, marginLeft: "auto" }}>{getStats(original).words} words</span>
            </div>
            <div style={{ padding: "14px 16px", fontSize: 13, lineHeight: 1.9, color: textColor, whiteSpace: "pre-wrap", maxHeight: 500, overflowY: "auto" }}>
              {original || "(empty)"}
            </div>
          </div>

          {/* Converted Columns */}
          {selectedLangs.map(langId => {
            const lang = languages.find(l => l.id === langId);
            const text = results[langId] || "";
            const diff = showWordDiff ? computeDiff(original, text) : null;
            const stats = getStats(text);
            const origStats = getStats(original);
            const wordDelta = stats.words - origStats.words;

            return (
              <div key={langId} style={{ background: cardBg, borderRadius: 20, boxShadow: cardShadow, border, overflow: "hidden", borderTop: `3px solid ${lang?.color || "#f59e0b"}` }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.12)"}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: lang?.color || "#ccc" }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: textColor }}>{lang?.label}</span>
                  <span style={{ fontSize: 9, color: mutedColor }}>{lang?.sub}</span>
                  <span style={{ fontSize: 9, color: mutedColor, marginLeft: "auto" }}>
                    {stats.words} words
                    <span style={{ color: wordDelta > 0 ? "#22c55e" : wordDelta < 0 ? "#ef4444" : mutedColor, marginLeft: 4 }}>
                      ({wordDelta > 0 ? "+" : ""}{wordDelta})
                    </span>
                  </span>
                </div>
                <div style={{ padding: "14px 16px", fontSize: 13, lineHeight: 1.9, color: textColor, whiteSpace: "pre-wrap", maxHeight: 500, overflowY: "auto" }}>
                  {diff ? diff.b.map((w, i) => (
                    <span key={i} style={w.changed ? {
                      background: `${lang?.color || "#f59e0b"}25`,
                      borderRadius: 3,
                      padding: "0 1px",
                      borderBottom: `2px solid ${lang?.color || "#f59e0b"}60`,
                    } : undefined}>{w.text}</span>
                  )) : text || "(empty)"}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Inline View */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {selectedLangs.map(langId => {
            const lang = languages.find(l => l.id === langId);
            const text = results[langId] || "";
            const origLines = (original || "").split("\n");
            const convLines = text.split("\n");
            const maxLines = Math.max(origLines.length, convLines.length);

            return (
              <div key={langId} style={{ background: cardBg, borderRadius: 20, boxShadow: cardShadow, border, overflow: "hidden", borderLeft: `4px solid ${lang?.color}` }}>
                <div style={{ padding: "12px 18px", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.12)"}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: lang?.color }}>{lang?.label}</span>
                  <span style={{ fontSize: 10, color: mutedColor }}>— Line-by-line comparison</span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  {Array.from({ length: maxLines }).map((_, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "6px 0", borderBottom: i < maxLines - 1 ? `1px solid ${b ? "rgba(255,255,255,0.04)" : "rgba(166,152,130,0.06)"}` : "none" }}>
                      <div style={{ fontSize: 12, lineHeight: 1.7, color: mutedColor, fontStyle: origLines[i] ? "normal" : "italic" }}>
                        <span style={{ fontSize: 9, color: b ? "#605040" : "#c0b0a0", marginRight: 6 }}>{i + 1}</span>
                        {origLines[i] || "—"}
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.7, color: textColor, fontWeight: 600 }}>
                        {convLines[i] || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Comparison Table */}
      {selectedLangs.length > 0 && (
        <div style={{ background: cardBg, borderRadius: 20, boxShadow: cardShadow, border, padding: "18px 22px", marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: textColor, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            📊 Statistics Comparison
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.15)"}`, color: subColor, fontWeight: 700 }}>Metric</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.15)"}`, color: "#f59e0b", fontWeight: 700 }}>Original</th>
                  {selectedLangs.map(id => {
                    const lang = languages.find(l => l.id === id);
                    return <th key={id} style={{ padding: "8px 12px", textAlign: "center", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.15)"}`, color: lang?.color, fontWeight: 700 }}>{lang?.label}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {["words", "chars", "lines", "sentences"].map(metric => {
                  const origVal = getStats(original)[metric];
                  return (
                    <tr key={metric}>
                      <td style={{ padding: "6px 12px", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.04)" : "rgba(166,152,130,0.06)"}`, textTransform: "capitalize", color: textColor, fontWeight: 600 }}>{metric}</td>
                      <td style={{ padding: "6px 12px", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.04)" : "rgba(166,152,130,0.06)"}`, textAlign: "center", color: mutedColor }}>{origVal}</td>
                      {selectedLangs.map(id => {
                        const val = getStats(results[id])[metric];
                        const delta = val - origVal;
                        return (
                          <td key={id} style={{ padding: "6px 12px", borderBottom: `1px solid ${b ? "rgba(255,255,255,0.04)" : "rgba(166,152,130,0.06)"}`, textAlign: "center", color: textColor }}>
                            {val}
                            {delta !== 0 && (
                              <span style={{ fontSize: 9, marginLeft: 4, color: delta > 0 ? "#22c55e" : "#ef4444" }}>
                                ({delta > 0 ? "+" : ""}{delta})
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
