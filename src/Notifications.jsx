import { useState, useEffect, useRef } from "react";
import { playNotification, playPop } from "./sounds.js";

const TIPS = [
  { id: 1, icon: "\u26A1", title: "Quick Convert", body: "Press Ctrl+Enter to instantly convert your script to all selected languages.", time: "Tip" },
  { id: 2, icon: "\uD83D\uDCC1", title: "Batch CSV Support", body: "Upload a CSV file to convert hundreds of lines at once across multiple languages.", time: "Feature" },
  { id: 3, icon: "\uD83C\uDFA4", title: "Voice Over Generation", body: "Generate AI voiceovers in any language using ElevenLabs after converting your script.", time: "Feature" },
  { id: 4, icon: "\uD83C\uDFA5", title: "Video Dubbing", body: "Try the Video Dub tab to automatically dub videos into multiple languages.", time: "New" },
  { id: 5, icon: "\uD83C\uDFAD", title: "Tone Selection", body: "Set the tone to Dramatic, Comedy, or Romantic for creative script conversions.", time: "Tip" },
  { id: 6, icon: "\uD83D\uDCC4", title: "SRT Subtitle Support", body: "Upload .srt files to convert subtitles while preserving all timestamps.", time: "Feature" },
  { id: 7, icon: "\uD83C\uDF19", title: "Dark Mode", body: "Switch to dark mode for a comfortable experience during late-night sessions.", time: "Tip" },
];

export default function Notifications({ darkMode }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ruhi_notif_dismissed") || "[]"); } catch { return []; }
  });
  const ref = useRef(null);

  const unread = TIPS.filter(t => !dismissed.includes(t.id));
  const count = unread.length;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dismiss = (id) => {
    playPop();
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("ruhi_notif_dismissed", JSON.stringify(next));
  };

  const dismissAll = () => {
    playPop();
    const next = TIPS.map(t => t.id);
    setDismissed(next);
    localStorage.setItem("ruhi_notif_dismissed", JSON.stringify(next));
  };

  const border = darkMode ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.2)";
  const textCol = darkMode ? "#e8e0d4" : "#1e1b18";
  const subCol = darkMode ? "#b0a090" : "#78350f";
  const mutedCol = darkMode ? "#807060" : "#a08060";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open && count > 0) playNotification(); }}
        className="clay-btn"
        style={{ padding: "6px 12px", fontSize: "15px", lineHeight: 1, position: "relative" }}
        title="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={darkMode ? "#d4c8b0" : "#78350f"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span style={{
            position: "absolute", top: "-2px", right: "-2px",
            width: "16px", height: "16px", borderRadius: "50%",
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            color: "#fff", fontSize: "9px", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 6px rgba(239,68,68,0.4)",
          }}>{count}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          width: "340px", maxWidth: "calc(100vw - 40px)",
          maxHeight: "420px",
          borderRadius: "18px", overflow: "hidden",
          background: darkMode ? "linear-gradient(145deg, #0d0d0d, #080808)" : "linear-gradient(145deg, #f5f0e8, #ece7dd)",
          border: `1px solid ${border}`,
          boxShadow: darkMode
            ? "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "8px 8px 24px rgba(166,152,130,0.35), -6px -6px 16px rgba(255,255,255,0.7), inset 0 2px 0 rgba(255,255,255,0.6)",
          animation: "fadeUp 0.2s ease",
          zIndex: 100,
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "0.5px", color: textCol }}>Notifications</span>
              {count > 0 && (
                <span style={{
                  fontSize: "10px", fontWeight: 700, color: "#f59e0b",
                  background: "rgba(245,158,11,0.12)", padding: "2px 8px", borderRadius: "8px",
                }}>{count} new</span>
              )}
            </div>
            {count > 0 && (
              <button onClick={dismissAll} style={{
                fontSize: "10px", fontWeight: 600, color: mutedCol,
                background: "none", border: "none", cursor: "pointer",
                padding: "4px 8px", borderRadius: "6px",
              }}>Mark all read</button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {unread.length === 0 ? (
              <div style={{ padding: "30px 16px", textAlign: "center", color: mutedCol, fontSize: "12px" }}>
                All caught up! No new notifications.
              </div>
            ) : (
              unread.map(tip => (
                <div key={tip.id} style={{
                  padding: "12px 14px", borderRadius: "14px", marginBottom: "6px",
                  background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(166,152,130,0.06)",
                  display: "flex", gap: "12px", alignItems: "flex-start",
                  cursor: "pointer", transition: "background 0.15s",
                }} onClick={() => dismiss(tip.id)}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "12px", flexShrink: 0,
                    background: darkMode ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "18px",
                  }}>{tip.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: textCol }}>{tip.title}</span>
                      <span style={{
                        fontSize: "9px", fontWeight: 700, color: tip.time === "New" ? "#22c55e" : "#f59e0b",
                        background: tip.time === "New" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                        padding: "2px 6px", borderRadius: "6px",
                      }}>{tip.time}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: subCol, lineHeight: 1.5 }}>{tip.body}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
