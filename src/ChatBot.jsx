import { useState, useRef, useEffect } from "react";
import { playSend, playPop, playClick } from "./sounds.js";

const SUGGESTIONS = [
  "How do I convert a script?",
  "Which languages are supported?",
  "What is Gurmukhi?",
  "Tell me a fun fact about Hindi",
  "Show my recent conversions",
  "How to use Voice Over?",
];

const SCRIPT_INFO = {
  devanagari: "Devanagari is the script used for Hindi, Marathi, and other Indian languages. It was developed between the 1st and 4th century CE and is written left to right. It has 47 primary characters including 14 vowels and 33 consonants.",
  gurmukhi: "Gurmukhi (meaning 'from the mouth of the Guru') is the script used for Punjabi. It was standardized by Guru Angad Dev Ji, the second Sikh Guru, in the 16th century. It has 35 consonant letters and 10 vowel symbols.",
  bengali: "Bengali script (Bangla lipi) is used for Bengali and Assamese languages. It evolved from the Siddham script around 1000 CE. Bengali has 11 vowels and 39 consonants, and is known for its distinctive horizontal headstroke (matra).",
  tamil: "Tamil script is one of the oldest scripts still in use today, dating back to the 3rd century BCE. It is unique among Indian scripts for having fewer consonants — only 18 base consonants. Tamil literature is over 2000 years old.",
  telugu: "Telugu script is derived from the Bhattiprolu script and is known for its rounded shapes. It has 16 vowels and 36 consonants. Telugu was called 'Italian of the East' by the European traveler Niccolò de' Conti.",
  gujarati: "Gujarati script evolved from Devanagari but lacks the characteristic horizontal line (shirorekha). It has 34 consonants and 12 vowels. The script was used for commercial purposes since the 16th century.",
  kannada: "Kannada script dates back to about 1500 years. It has 49 letters — 14 vowels and 35 consonants. Kannada literature received 8 Jnanpith Awards, the most for any Dravidian language.",
  malayalam: "Malayalam script is derived from the Grantha script and is one of the most complex Indian scripts with many conjunct consonant forms. It has 15 vowels and 36 consonants.",
  odia: "Odia script is known for its distinctive rounded letterforms, developed because palm leaves (used for writing) would tear with straight horizontal lines. It has 11 vowels and 36 consonants.",
  urdu: "Urdu is written in a modified Persian-Arabic script called Nastaliq. It reads right-to-left and has 39 basic letters. Urdu poetry (ghazals, nazms) is renowned worldwide for its beauty.",
};

const LANGUAGE_TIPS = [
  "Hindi has no articles (a, an, the). Instead, context determines whether something is specific or general!",
  "Bhojpuri uses 'ba' instead of 'hai' — so 'ye accha ba' means 'this is good'. It's a dead giveaway!",
  "Haryanvi replaces 'hai' with 'sai' — if you hear 'sai' at the end, it's Haryanvi!",
  "Rajasthani uses 'chhe' instead of 'hai' — similar to Gujarati. 'Vo achchho minakh chhe' = He is a good person.",
  "Tamil is the only classical language in the world that is still widely spoken as a first language by over 80 million people.",
  "Telugu has the highest number of characters starting with vowels among Indian languages.",
  "Gujarati script looks like Devanagari without the top line (shirorekha). That's the easiest way to tell them apart!",
  "Punjabi's Gurmukhi script was created specifically to write the scriptures of Sikhism.",
  "Bengali and Assamese scripts look very similar, but Assamese has unique characters like ৰ (ro) and ৱ (wo).",
  "Marathi uses 'aahe' instead of 'hai', and 'la' instead of 'ko' — these two changes make text sound instantly Marathi!",
  "Kannada and Telugu scripts look very similar because they evolved from the same parent script — Chalukya.",
  "Malayalam has the largest number of letters among Indian language scripts — about 578 including conjunct consonants!",
  "Odia script has rounded letters because ancient scribes wrote on palm leaves, and straight lines would tear the leaves!",
  "Urdu and Hindi share nearly identical grammar but use completely different scripts — Nastaliq vs Devanagari.",
  "India has 22 officially recognized languages and over 19,500 dialects!",
  "The word 'script' comes from Latin 'scriptum' meaning 'something written'. Most Indian scripts evolved from Brahmi.",
];

const ANSWERS = {
  "how do i convert": "Simply paste or type your script in the input box, select your target languages from the language cards, and click the Convert button. You can also press Ctrl+Enter! Use Ctrl+Shift+F for fullscreen writing mode.",
  "which languages": "RUHI now supports 16 languages: Hindi, English, Haryanvi, Rajasthani, Bhojpuri, Gujarati, Marathi, Bengali, Punjabi, Tamil, Telugu, Kannada, Malayalam, Odia, Assamese, and Urdu. You can select multiple languages at once!",
  "upload srt": "Click the Upload button in the Script Input area and select your .srt file. RUHI will parse the subtitle blocks and convert each line while preserving timing codes. You can download the converted SRT with original timestamps.",
  "batch csv": "Upload a .csv file using the Upload button. RUHI reads each row and converts them to your selected languages in batch. Once done, download the converted CSV with all languages as columns.",
  "voice over": "After converting your script, toggle on 'Voice Over Generation' below the results. Choose a voice and model from ElevenLabs, then click 'Generate Voice' on any language result. You can also edit the text before generating.",
  "content studio": "The Content Studio tab lets you create promotional content, campaigns, scripts, captions, headlines, and learning material in multiple languages using AI.",
  "video dub": "The Video Dub tab provides a 7-step workflow: upload video, separate audio stems, transcribe speech, translate, generate dubbed voice, and mix the final video.",
  "tone": "You can set the conversion tone — Auto, Formal, Casual, Dramatic, Comedy, or Romantic. The AI adapts its output style accordingly.",
  "dark mode": "Click the sun/moon icon in the top bar to toggle between light and dark mode. You can also enable auto-scheduling (clock icon) to switch automatically — dark mode from 7pm to 7am!",
  "history": "Click the History button in the top bar to see your past conversions. You can load any previous script and results. History auto-deletes after 30 days. Shortcut: Ctrl+Shift+H",
  "keyboard": "RUHI has keyboard shortcuts! Ctrl+Enter to convert, Ctrl+Shift+F for fullscreen, Ctrl+Shift+D for dark mode, Ctrl+Shift+H for history, and Ctrl+/ to see all shortcuts.",
  "shortcut": "RUHI has keyboard shortcuts! Ctrl+Enter to convert, Ctrl+Shift+F for fullscreen, Ctrl+Shift+D for dark mode, Ctrl+Shift+H for history, and Ctrl+/ to see all shortcuts.",
  "fullscreen": "Press Ctrl+Shift+F or click the fullscreen icon in the top bar for distraction-free writing. Press Escape to exit.",
  "share": "After converting, click the share icon on any result to share it via WhatsApp or other apps. On mobile, it uses the native share sheet!",
  "favorite": "Click the star 'Save Fav' button to save your current language selection as a favorite. Access your favorites from the bar above the converter for quick switching!",
  "font": "Use the font size slider below the Script Input header to adjust text size from 11px to 22px. Your preference is saved automatically.",
  "offline": "RUHI works as a PWA! Add it to your home screen for an app-like experience. Note: conversions require internet, but the UI is cached for fast loading.",
  "export": "RUHI supports multiple export formats: TXT, PDF, RTF, or individual files per language. Click the Download button after converting to choose your format.",
  "voice": "Click the Mic button next to Upload in the Script Input area. RUHI uses your browser's speech recognition (works best in Chrome). Speak in Hindi or any language — it'll type as you talk! Click Stop when done.",
  "mic": "Click the Mic button next to Upload in the Script Input area. RUHI uses your browser's speech recognition (works best in Chrome). Speak in Hindi or any language — it'll type as you talk! Click Stop when done.",
  "kannada": "Kannada (ಕನ್ನಡ) is a Dravidian language spoken in Karnataka. It has a rich literary tradition spanning over 2000 years, with 8 Jnanpith Awards — the most for any Dravidian language!",
  "malayalam": "Malayalam (മലയാളം) is spoken in Kerala. It has one of the most complex scripts in India with about 578 characters including conjuncts. Fun fact: 'Malayalam' is a palindrome!",
  "odia": "Odia (ଓଡ଼ିଆ) is spoken in Odisha. Its rounded letterforms evolved because palm-leaf manuscripts would tear with straight lines. It's one of India's 6 classical languages.",
  "assamese": "Assamese (অসমীয়া) is spoken in Assam. Its script is very similar to Bengali but has distinct characters like ৰ and ৱ. It has a rich tradition of Bihu folk songs and Sattriya dance.",
  "urdu": "Urdu (اردو) is written right-to-left in Nastaliq script. It shares grammar with Hindi but uses many Persian and Arabic words. Urdu poetry (shayari) is famous worldwide!",
  "gurmukhi": SCRIPT_INFO.gurmukhi,
  "devanagari": SCRIPT_INFO.devanagari,
  "default": "I'm RUHI Assistant! I can help you with script conversion, language info, shortcuts, file uploads, voice generation, and more. Try asking 'What is Gurmukhi?' or 'Tell me a fun fact'!",
};

function getAnswer(msg) {
  const lower = msg.toLowerCase();
  for (const [key, val] of Object.entries(ANSWERS)) {
    if (key === "default") continue;
    if (lower.includes(key)) return val;
  }
  // Script info queries
  if (lower.includes("what is") || lower.includes("kya hai") || lower.includes("tell me about")) {
    for (const [script, info] of Object.entries(SCRIPT_INFO)) {
      if (lower.includes(script)) return info;
    }
  }
  // Fun fact / tip
  if (lower.includes("fun fact") || lower.includes("tip") || lower.includes("interesting") || lower.includes("did you know")) {
    return LANGUAGE_TIPS[Math.floor(Math.random() * LANGUAGE_TIPS.length)];
  }
  // Conversion history
  if (lower.includes("recent") || lower.includes("conversion history") || lower.includes("last convert") || lower.includes("my conversion")) {
    try {
      const hist = JSON.parse(localStorage.getItem("ruhi_history") || "[]");
      if (hist.length === 0) return "You haven't converted any scripts yet. Try pasting some text and hitting Convert!";
      const recent = hist.slice(0, 3);
      const lines = recent.map((h, i) => {
        const preview = h.input.length > 50 ? h.input.slice(0, 50) + "..." : h.input;
        const langs = (h.langs || []).join(", ");
        const ago = formatTimeAgo(h.date);
        return `${i + 1}. "${preview}" → ${langs} (${ago})`;
      });
      return `Your recent conversions:\n\n${lines.join("\n")}\n\nClick History (Ctrl+Shift+H) in the top bar to load any of these!`;
    } catch { return "Couldn't read conversion history. Try opening the History panel from the top bar."; }
  }
  // Greetings
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("namaste") || lower.includes("helo"))
    return "Namaste! I'm RUHI Assistant. How can I help you today? Ask me about languages, scripts, shortcuts, or anything else!";
  if (lower.includes("thank"))
    return "You're welcome! Feel free to ask if you need anything else. Here's a fun fact: " + LANGUAGE_TIPS[Math.floor(Math.random() * LANGUAGE_TIPS.length)];
  return ANSWERS.default;
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return "yesterday";
  return `${Math.floor(diff / 86400000)}d ago`;
}

const AI_SYSTEM_PROMPT = `You are RUHI, the AI assistant for RUHI Multilingual Studio — a tool for converting scripts between 16 Indian languages.
You respond in the same language the user writes in. If they write in Hindi, respond in Hindi. If English, respond in English.
Keep responses concise (2-3 sentences max). Be friendly and helpful.
You know about: script conversion, 16 Indian languages, video dubbing, TTS, subtitle editing, templates, analytics.`;

const LANG_PREF_OPTIONS = ["Auto", "Hindi", "English"];

export default function ChatBot({ darkMode, streamConvert }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Namaste! I'm RUHI Assistant. Ask me about languages, scripts, shortcuts, or anything else!" }
  ]);
  const [input, setInput] = useState("");
  const [useAI, setUseAI] = useState(true);
  const [langPref, setLangPref] = useState("Auto");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef(null);
  const streamAbortRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendAIQuery = async (msg) => {
    setIsStreaming(true);
    // Add a placeholder bot message for streaming
    const botIdx = { current: -1 };
    setMessages(prev => {
      botIdx.current = prev.length;
      return [...prev, { from: "bot", text: "", streaming: true }];
    });

    let langInstruction = "";
    if (langPref === "Hindi") langInstruction = "\nIMPORTANT: Respond in Hindi (Devanagari script) regardless of the user's language.";
    else if (langPref === "English") langInstruction = "\nIMPORTANT: Respond in English regardless of the user's language.";

    const systemPrompt = AI_SYSTEM_PROMPT + langInstruction;

    try {
      if (streamConvert) {
        let accumulated = "";
        await streamConvert({
          model: "anthropic/claude-sonnet-4.5",
          system: systemPrompt,
          messages: [{ role: "user", content: msg }],
          onChunk: (chunk) => {
            accumulated += chunk;
            const current = accumulated;
            setMessages(prev => {
              const updated = [...prev];
              if (botIdx.current >= 0 && botIdx.current < updated.length) {
                updated[botIdx.current] = { from: "bot", text: current, streaming: true };
              }
              return updated;
            });
          },
        });
        playPop();
        setMessages(prev => {
          const updated = [...prev];
          if (botIdx.current >= 0 && botIdx.current < updated.length) {
            updated[botIdx.current] = { ...updated[botIdx.current], streaming: false };
          }
          return updated;
        });
        setIsStreaming(false);
      } else {
        // No streamConvert available, fall back to default
        setMessages(prev => {
          const updated = [...prev];
          if (botIdx.current >= 0 && botIdx.current < updated.length) {
            updated[botIdx.current] = { from: "bot", text: ANSWERS.default, streaming: false };
          }
          return updated;
        });
        playPop();
        setIsStreaming(false);
      }
    } catch (err) {
      console.error("RUHI AI error:", err);
      setMessages(prev => {
        const updated = [...prev];
        if (botIdx.current >= 0 && botIdx.current < updated.length) {
          updated[botIdx.current] = { from: "bot", text: "Sorry, something went wrong. " + ANSWERS.default, streaming: false };
        }
        return updated;
      });
      setIsStreaming(false);
    }
  };

  const send = (text) => {
    const msg = text || input.trim();
    if (!msg || isStreaming) return;
    playSend();
    setMessages(prev => [...prev, { from: "user", text: msg }]);
    setInput("");

    const answer = getAnswer(msg);
    if (answer !== ANSWERS.default || !useAI) {
      // FAQ match found or AI disabled — use static answer
      setTimeout(() => {
        playPop();
        setMessages(prev => [...prev, { from: "bot", text: answer }]);
      }, 600);
    } else {
      // No FAQ match and AI enabled — call Claude
      sendAIQuery(msg);
    }
  };

  const bg = darkMode ? "#0a0a0a" : "#f5f0e8";
  const border = darkMode ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.2)";
  const textCol = darkMode ? "#e8e0d4" : "#1e1b18";
  const subCol = darkMode ? "#807060" : "#92400e";

  return (
    <>
      {/* Blink animation for streaming cursor */}
      <style>{`@keyframes cursorBlink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }`}</style>

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
          width: "380px", maxWidth: "calc(100vw - 32px)",
          maxHeight: "520px",
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
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: textCol }}>RUHI Assistant</div>
              <div style={{ fontSize: "10px", color: subCol, display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                Online &middot; {useAI ? "AI Mode" : "FAQ Mode"} &middot; 16 languages
              </div>
            </div>
            {/* AI Toggle */}
            <button
              onClick={() => setUseAI(a => !a)}
              title={useAI ? "AI mode ON — click to use FAQ only" : "FAQ mode — click to enable AI"}
              style={{
                padding: "3px 8px", fontSize: "9px", fontWeight: 700,
                borderRadius: "8px", border: `1px solid ${border}`, cursor: "pointer",
                background: useAI ? "linear-gradient(135deg, #f59e0b, #d97706)" : (darkMode ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.12)"),
                color: useAI ? "#fff" : subCol,
                transition: "all 0.2s",
              }}
            >
              {useAI ? "AI" : "FAQ"}
            </button>
          </div>

          {/* Language Preference Bar */}
          <div style={{
            padding: "6px 14px",
            borderBottom: `1px solid ${border}`,
            display: "flex", alignItems: "center", gap: "6px",
            background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(166,152,130,0.04)",
          }}>
            <span style={{ fontSize: "9px", color: subCol, fontWeight: 600, whiteSpace: "nowrap" }}>Respond in:</span>
            {LANG_PREF_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setLangPref(opt)}
                style={{
                  padding: "2px 8px", fontSize: "9px", fontWeight: 600,
                  borderRadius: "8px", cursor: "pointer",
                  border: langPref === opt ? "1px solid #d97706" : `1px solid ${border}`,
                  background: langPref === opt
                    ? (darkMode ? "rgba(217,119,6,0.2)" : "rgba(245,158,11,0.15)")
                    : "transparent",
                  color: langPref === opt ? "#d97706" : subCol,
                  transition: "all 0.15s",
                }}
              >
                {opt}
              </button>
            ))}
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
                  fontSize: "12.5px", lineHeight: 1.6, whiteSpace: "pre-wrap",
                  boxShadow: m.from === "user"
                    ? "0 2px 8px rgba(200,130,20,0.3)"
                    : (darkMode ? "2px 2px 6px rgba(0,0,0,0.3)" : "2px 2px 6px rgba(166,152,130,0.2)"),
                }}>
                  {m.text}{m.streaming && <span style={{
                    display: "inline-block", width: "2px", height: "13px",
                    background: m.from === "user" ? "#fff" : (darkMode ? "#f59e0b" : "#d97706"),
                    marginLeft: "2px", verticalAlign: "middle",
                    animation: "cursorBlink 0.8s step-end infinite",
                  }} />}
                </div>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {messages.length > 0 && messages[messages.length - 1].from === "bot" && !isStreaming && (
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
              disabled={isStreaming}
              placeholder={isStreaming ? "RUHI is thinking..." : "Ask about languages, scripts, tips..."}
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
