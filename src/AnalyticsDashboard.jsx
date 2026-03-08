import React, { useState, useEffect, useMemo } from "react";

const LANG_COLORS = {
  hindi: "#f97316",
  english: "#3b82f6",
  haryanvi: "#22c55e",
  rajasthani: "#eab308",
  bhojpuri: "#ef4444",
  gujarati: "#a855f7",
  marathi: "#e11d48",
  bengali: "#0891b2",
  punjabi: "#ea580c",
  tamil: "#7c3aed",
  telugu: "#059669",
  kannada: "#dc2626",
  malayalam: "#0d9488",
  odia: "#6366f1",
  assamese: "#be185d",
  urdu: "#4f46e5",
};

const LANG_LABELS = {
  hindi: "Hindi",
  english: "English",
  haryanvi: "Haryanvi",
  rajasthani: "Rajasthani",
  bhojpuri: "Bhojpuri",
  gujarati: "Gujarati",
  marathi: "Marathi",
  bengali: "Bengali",
  punjabi: "Punjabi",
  tamil: "Tamil",
  telugu: "Telugu",
  kannada: "Kannada",
  malayalam: "Malayalam",
  odia: "Odia",
  assamese: "Assamese",
  urdu: "Urdu",
};

function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDayKey(isoString) {
  const d = new Date(isoString);
  return d.toISOString().slice(0, 10);
}

function getDayLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function AnalyticsDashboard({ darkMode }) {
  const [history, setHistory] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ruhi_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      // ignore parse errors
    }
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const totalConversions = history.length;

  const totalWordsConverted = useMemo(() => {
    let total = 0;
    for (const entry of history) {
      if (entry.results && typeof entry.results === "object") {
        for (const langId of Object.keys(entry.results)) {
          total += countWords(entry.results[langId]);
        }
      }
    }
    return total;
  }, [history]);

  const avgScriptLength = useMemo(() => {
    if (history.length === 0) return 0;
    let sum = 0;
    for (const entry of history) {
      sum += countWords(entry.input);
    }
    return Math.round(sum / history.length);
  }, [history]);

  const langUsage = useMemo(() => {
    const counts = {};
    for (const entry of history) {
      const langs = entry.langs || [];
      for (const langId of langs) {
        counts[langId] = (counts[langId] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [history]);

  const dailyCounts = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const counts = {};
    for (const day of days) counts[day] = 0;
    for (const entry of history) {
      if (entry.date) {
        const key = getDayKey(entry.date);
        if (key in counts) counts[key]++;
      }
    }
    return days.map((day) => ({ day, count: counts[day] }));
  }, [history]);

  const maxDaily = useMemo(
    () => Math.max(1, ...dailyCounts.map((d) => d.count)),
    [dailyCounts]
  );

  const langPairHeatmap = useMemo(() => {
    const pairCounts = {};
    const allLangs = new Set();
    for (const entry of history) {
      const langs = entry.langs || [];
      for (let i = 0; i < langs.length; i++) {
        for (let j = i + 1; j < langs.length; j++) {
          const a = langs[i] < langs[j] ? langs[i] : langs[j];
          const b = langs[i] < langs[j] ? langs[j] : langs[i];
          const key = `${a}|${b}`;
          pairCounts[key] = (pairCounts[key] || 0) + 1;
          allLangs.add(a);
          allLangs.add(b);
        }
      }
    }
    const sortedLangs = [...allLangs].sort();
    const maxCount = Math.max(1, ...Object.values(pairCounts));
    return { pairCounts, sortedLangs, maxCount };
  }, [history]);

  const recentActivity = useMemo(() => {
    return [...history]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [history]);

  const maxLangCount = useMemo(
    () => Math.max(1, ...langUsage.map(([, c]) => c)),
    [langUsage]
  );

  // --- Style helpers ---
  const cardBg = darkMode
    ? "linear-gradient(145deg, #111111, #0a0a0a)"
    : "linear-gradient(145deg, #f5f0e8, #ece7dd)";
  const cardShadow = darkMode
    ? "8px 8px 16px rgba(0,0,0,0.7), -6px -6px 14px rgba(255,255,255,0.03)"
    : "8px 8px 16px rgba(166,152,130,0.4), -6px -6px 14px rgba(255,255,255,0.8)";
  const cardBorder = darkMode
    ? "1px solid rgba(255,255,255,0.08)"
    : "1px solid rgba(255,255,255,0.5)";
  const textColor = darkMode ? "#e8e0d4" : "#1e1b18";
  const subColor = darkMode ? "#b0a090" : "#78350f";
  const accent = "#f59e0b";
  const accentDark = "#d97706";

  const cardStyle = {
    background: cardBg,
    boxShadow: cardShadow,
    border: cardBorder,
    borderRadius: "16px",
    padding: "24px",
    color: textColor,
  };

  const fadeUpStyle = {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(24px)",
    transition: "opacity 0.5s ease, transform 0.5s ease",
  };

  const fadeUpDelay = (i) => ({
    ...fadeUpStyle,
    transitionDelay: `${i * 80}ms`,
  });

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
        color: textColor,
      }}
    >
      <h2
        style={{
          fontSize: "28px",
          fontWeight: 700,
          marginBottom: "8px",
          color: accent,
          ...fadeUpDelay(0),
        }}
      >
        Analytics Dashboard
      </h2>
      <p style={{ color: subColor, marginBottom: "28px", ...fadeUpDelay(0) }}>
        Insights from your RUHI conversion history
      </p>

      {/* Stat Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        {/* Total Conversions */}
        <div style={{ ...cardStyle, ...fadeUpDelay(1) }}>
          <div style={{ fontSize: "13px", color: subColor, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
            Total Conversions
          </div>
          <div style={{ fontSize: "40px", fontWeight: 800, color: accent }}>
            {totalConversions}
          </div>
        </div>

        {/* Total Words Converted */}
        <div style={{ ...cardStyle, ...fadeUpDelay(2) }}>
          <div style={{ fontSize: "13px", color: subColor, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
            Total Words Converted
          </div>
          <div style={{ fontSize: "40px", fontWeight: 800, color: accent }}>
            {totalWordsConverted.toLocaleString()}
          </div>
        </div>

        {/* Average Script Length */}
        <div style={{ ...cardStyle, ...fadeUpDelay(3) }}>
          <div style={{ fontSize: "13px", color: subColor, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
            Avg Script Length
          </div>
          <div style={{ fontSize: "40px", fontWeight: 800, color: accent }}>
            {avgScriptLength}
            <span style={{ fontSize: "16px", fontWeight: 400, color: subColor, marginLeft: "6px" }}>
              words
            </span>
          </div>
        </div>
      </div>

      {/* Most Used Languages Bar Chart */}
      <div style={{ ...cardStyle, marginBottom: "28px", ...fadeUpDelay(4) }}>
        <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>
          Most Used Languages
        </div>
        {langUsage.length === 0 && (
          <div style={{ color: subColor, fontSize: "14px" }}>
            No language data yet.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {langUsage.map(([langId, count]) => {
            const pct = (count / maxLangCount) * 100;
            const color = LANG_COLORS[langId] || "#f59e0b";
            const label = LANG_LABELS[langId] || langId;
            return (
              <div key={langId} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "90px", fontSize: "13px", color: subColor, textAlign: "right", flexShrink: 0 }}>
                  {label}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: "22px",
                    borderRadius: "6px",
                    background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                      borderRadius: "6px",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <div style={{ width: "32px", fontSize: "13px", fontWeight: 600, color: textColor }}>
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversions Over Time */}
      <div style={{ ...cardStyle, marginBottom: "28px", ...fadeUpDelay(5) }}>
        <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>
          Conversions Over Time
          <span style={{ fontSize: "12px", fontWeight: 400, color: subColor, marginLeft: "8px" }}>
            (last 14 days)
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "6px",
            height: "140px",
            paddingBottom: "24px",
            position: "relative",
          }}
        >
          {dailyCounts.map(({ day, count }) => {
            const heightPct = maxDaily > 0 ? (count / maxDaily) * 100 : 0;
            return (
              <div
                key={day}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  height: "100%",
                }}
              >
                {count > 0 && (
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: accent,
                      marginBottom: "4px",
                    }}
                  >
                    {count}
                  </div>
                )}
                <div
                  style={{
                    width: "100%",
                    maxWidth: "36px",
                    height: `${Math.max(heightPct, count > 0 ? 4 : 0)}%`,
                    minHeight: count > 0 ? "4px" : "0",
                    background: count > 0
                      ? `linear-gradient(180deg, ${accent}, ${accentDark})`
                      : darkMode
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.5s ease",
                  }}
                />
                <div
                  style={{
                    fontSize: "9px",
                    color: subColor,
                    marginTop: "6px",
                    whiteSpace: "nowrap",
                    position: "absolute",
                    bottom: 0,
                    transform: "rotate(-45deg)",
                    transformOrigin: "top left",
                  }}
                >
                  {getDayLabel(day)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Language Pair Heatmap */}
      <div style={{ ...cardStyle, marginBottom: "28px", ...fadeUpDelay(6) }}>
        <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>
          Language Pair Heatmap
        </div>
        {langPairHeatmap.sortedLangs.length === 0 && (
          <div style={{ color: subColor, fontSize: "14px" }}>
            No pair data yet.
          </div>
        )}
        {langPairHeatmap.sortedLangs.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `80px repeat(${langPairHeatmap.sortedLangs.length}, 48px)`,
                gap: "3px",
                fontSize: "11px",
              }}
            >
              {/* Header row */}
              <div />
              {langPairHeatmap.sortedLangs.map((lang) => (
                <div
                  key={`h-${lang}`}
                  style={{
                    textAlign: "center",
                    color: subColor,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "10px",
                    transform: "rotate(-45deg)",
                    transformOrigin: "center",
                    height: "48px",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  {(LANG_LABELS[lang] || lang).slice(0, 4)}
                </div>
              ))}

              {/* Data rows */}
              {langPairHeatmap.sortedLangs.map((rowLang) => (
                <React.Fragment key={`r-${rowLang}`}>
                  <div
                    style={{
                      color: subColor,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      fontSize: "11px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {(LANG_LABELS[rowLang] || rowLang).slice(0, 8)}
                  </div>
                  {langPairHeatmap.sortedLangs.map((colLang) => {
                    const a = rowLang < colLang ? rowLang : colLang;
                    const b = rowLang < colLang ? colLang : rowLang;
                    const key = `${a}|${b}`;
                    const count = langPairHeatmap.pairCounts[key] || 0;
                    const intensity = count / langPairHeatmap.maxCount;
                    const isSelf = rowLang === colLang;
                    return (
                      <div
                        key={`c-${rowLang}-${colLang}`}
                        title={
                          isSelf
                            ? LANG_LABELS[rowLang] || rowLang
                            : `${LANG_LABELS[rowLang] || rowLang} + ${LANG_LABELS[colLang] || colLang}: ${count}`
                        }
                        style={{
                          width: "48px",
                          height: "32px",
                          borderRadius: "4px",
                          background: isSelf
                            ? darkMode
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(0,0,0,0.03)"
                            : count > 0
                              ? `rgba(245, 158, 11, ${0.15 + intensity * 0.85})`
                              : darkMode
                                ? "rgba(255,255,255,0.02)"
                                : "rgba(0,0,0,0.02)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: isSelf
                            ? "transparent"
                            : count > 0
                              ? intensity > 0.5
                                ? "#1e1b18"
                                : textColor
                              : "transparent",
                        }}
                      >
                        {isSelf ? "" : count > 0 ? count : ""}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div style={{ ...cardStyle, ...fadeUpDelay(7) }}>
        <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>
          Recent Activity
        </div>
        {recentActivity.length === 0 && (
          <div style={{ color: subColor, fontSize: "14px" }}>
            No conversions yet.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {recentActivity.map((entry, idx) => {
            const langs = entry.langs || [];
            return (
              <div
                key={entry.id || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: darkMode
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.03)",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: "140px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      color: textColor,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "320px",
                    }}
                  >
                    {entry.input
                      ? entry.input.length > 60
                        ? entry.input.slice(0, 60) + "..."
                        : entry.input
                      : "—"}
                  </div>
                  <div style={{ fontSize: "11px", color: subColor }}>
                    {entry.date ? formatDate(entry.date) : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {langs.map((langId) => (
                    <span
                      key={langId}
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: LANG_COLORS[langId]
                          ? `${LANG_COLORS[langId]}22`
                          : `${accent}22`,
                        color: LANG_COLORS[langId] || accent,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {LANG_LABELS[langId] || langId}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
