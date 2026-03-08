import { useState, useRef, useEffect } from "react";
import { playSend, playPop, playClick } from "./sounds.js";

const SUGGESTIONS = [
  "How do I convert a script?",
  "Which languages are supported?",
  "How to upload SRT files?",
  "How does batch CSV work?",
  "How to use Voice Over?",
];

const ANSWERS = {
  "how do i convert": "Simply paste or type your script in the input box, select your target languages from the language cards, and click the Convert button. You can also press Ctrl+Enter!",
  "which languages": "RUHI supports 11 languages: Hindi, English, Haryanvi, Rajasthani, Bhojpuri, Gujarati, Marathi, Bengali, Punjabi, Tamil, and Telugu. You can select multiple languages at once.",
  "upload srt": "Click the Upload button in the Script Input area and select your .srt file. RUHI will parse the subtitle blocks and convert each line while preserving timing codes. You can download the converted SRT with original timestamps.",
  "batch csv": "Upload a .csv file using the Upload button. RUHI reads each row and converts them to your selected languages in batch. Once done, download the converted CSV with all languages as columns.",
  "voice over": "After converting your script, toggle on 'Voice Over Generation' below the results. Choose a voice and model from ElevenLabs, then click 'Generate Voice' on any language result. You can also edit the text before generating.",
  "content studio": "The Content Studio tab lets you create promotional content, campaigns, scripts, captions, headlines, and learning material in multiple languages using AI.",
  "video dub": "The Video Dub tab provides a 7-step workflow: upload video, separate audio stems, transcribe speech, translate, generate dubbed voice, and mix the final video.",
  "tone": "You can set the conversion tone — Auto, Formal, Casual, Dramatic, Comedy, or Romantic. The AI adapts its output style accordingly.",
  "dark mode": "Click the sun/moon icon in the top bar to toggle between light and dark mode. Your preference is saved automatically.",
  "history": "Click the History button in the top bar to see your past conversions. You can load any previous script and results. History auto-deletes after 30 days.",
  "default": "I'm RUHI Assistant! I can help you with script conversion, language selection, file uploads, voice generation, and more. Try asking me something specific!",
};

function getAnswer(msg) {
  const lower = msg.toLowerCase();
  for (const [key, val] of Object.entries(ANSWERS)) {
    if (key === "default") continue;
    if (lower.includes(key)) return val;
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("namaste") || lower.includes("helo"))
    return "Namaste! I'm RUHI Assistant. How can I help you today? You can ask me about script conversion, languages, file uploads, voice generation, or anything else!";
  if (lower.includes("thank"))
    return "You're welcome! Feel free to ask if you need anything else.";
  return ANSWERS.default;
}

export default function ChatBot({ darkMode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Namaste! I'm RUHI Assistant. How can I help you with the studio?" }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    playSend();
    setMessages(prev => [...prev, { from: "user", text: msg }]);
    setInput("");
    setTimeout(() => {
      const answer = getAnswer(msg);
      playPop();
      setMessages(prev => [...prev, { from: "bot", text: answer }]);
    }, 600);
  };

  const bg = darkMode ? "#0a0a0a" : "#f5f0e8";
  const border = darkMode ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.2)";
  const textCol = darkMode ? "#e8e0d4" : "#1e1b18";
  const subCol = darkMode ? "#807060" : "#92400e";

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => { setOpen(o => !o); playClick(); }}
        style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 1000,
          width: "56px", height: "56px", borderRadius: "50%",
          background: "linear-gradient(145deg, #ffb347, #e89520)",
          border: "none", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(200,130,20,0.4), inset 0 2px 0 rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s, box-shadow 0.2s",
          transform: open ? "scale(0.9)" : "scale(1)",
        }}
        title="Chat with RUHI Assistant"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open
            ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            : <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>
          }
        </svg>
      </button>

      {/* Chat Window */}
      {open && (
        <div style={{
          position: "fixed", bottom: "90px", right: "24px", zIndex: 999,
          width: "360px", maxWidth: "calc(100vw - 32px)",
          maxHeight: "500px",
          borderRadius: "20px", overflow: "hidden",
          background: bg,
          border: `1px solid ${border}`,
          boxShadow: darkMode
            ? "0 8px 40px rgba(0,0,0,0.6)"
            : "8px 8px 24px rgba(166,152,130,0.35), -6px -6px 16px rgba(255,255,255,0.7)",
          display: "flex", flexDirection: "column",
          animation: "fadeUp 0.25s ease",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 18px",
            background: darkMode ? "linear-gradient(145deg, #1a1508, #110e06)" : "linear-gradient(145deg, #f5f0e8, #ece7dd)",
            borderBottom: `1px solid ${border}`,
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", color: "#fff", fontWeight: 800,
            }}>R</div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: textCol }}>RUHI Assistant</div>
              <div style={{ fontSize: "10px", color: subCol, display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px",
            minHeight: "250px", maxHeight: "340px",
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: m.from === "user" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: m.from === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.from === "user"
                    ? "linear-gradient(135deg, #f59e0b, #d97706)"
                    : (darkMode ? "linear-gradient(145deg, #111, #0a0a0a)" : "linear-gradient(145deg, #ece7dd, #e0d8cc)"),
                  color: m.from === "user" ? "#fff" : textCol,
                  fontSize: "12.5px", lineHeight: 1.6,
                  boxShadow: m.from === "user"
                    ? "0 2px 8px rgba(200,130,20,0.3)"
                    : (darkMode ? "2px 2px 6px rgba(0,0,0,0.3)" : "2px 2px 6px rgba(166,152,130,0.2)"),
                }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {messages.length > 0 && messages[messages.length - 1].from === "bot" && (
            <div style={{ padding: "0 14px 8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{
                  padding: "5px 10px", fontSize: "10px", fontWeight: 600,
                  borderRadius: "10px", border: `1px solid ${border}`, cursor: "pointer",
                  background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(166,152,130,0.08)",
                  color: subCol, transition: "background 0.15s",
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: "10px 14px",
            borderTop: `1px solid ${border}`,
            display: "flex", gap: "8px", alignItems: "center",
            background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(166,152,130,0.04)",
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") send(); }}
              placeholder="Type a message..."
              style={{
                flex: 1, padding: "10px 14px", borderRadius: "12px",
                border: `1px solid ${border}`,
                background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)",
                color: textCol, fontSize: "12px", outline: "none",
                fontFamily: "'Inter','Segoe UI',sans-serif",
              }}
            />
            <button onClick={() => send()} style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: input.trim() ? "linear-gradient(135deg, #f59e0b, #d97706)" : (darkMode ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.15)"),
              border: "none", cursor: input.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? "#fff" : (darkMode ? "#807060" : "#a08060")} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
