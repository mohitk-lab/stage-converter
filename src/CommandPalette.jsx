import React, { useState, useRef, useEffect, useCallback } from "react";

const ACTIONS = [
  { id: "convert", icon: "🔄", label: "Convert Script", shortcut: "Ctrl+Enter" },
  { id: "darkMode", icon: "🌙", label: "Toggle Dark Mode", shortcut: "Ctrl+D" },
  { id: "fullscreen", icon: "⛶", label: "Toggle Fullscreen", shortcut: "F11" },
  { id: "history", icon: "📜", label: "Open History", shortcut: "Ctrl+H" },
  { id: "shortcuts", icon: "⌨️", label: "Show Keyboard Shortcuts", shortcut: "?" },
  { id: "selectAll", icon: "✅", label: "Select All Languages" },
  { id: "deselectAll", icon: "❎", label: "Deselect All Languages" },
  { id: "newScript", icon: "📝", label: "New Script", shortcut: "Ctrl+N" },
  { id: "copyAll", icon: "📋", label: "Copy All Results", shortcut: "Ctrl+Shift+C" },
  { id: "download", icon: "💾", label: "Download Results", shortcut: "Ctrl+S" },
  { id: "saveFavorite", icon: "⭐", label: "Save Favorite" },
  { id: "tabStudio", icon: "🎬", label: "Open Content Studio" },
  { id: "tabDubbing", icon: "🎙️", label: "Open Video Dub" },
  { id: "tabConverter", icon: "🔤", label: "Open Script Converter" },
  { id: "voiceInput", icon: "🎤", label: "Toggle Voice Input", shortcut: "Ctrl+M" },
  { id: "tabAnalytics", icon: "📊", label: "Open Analytics" },
  { id: "tabSubtitle", icon: "💬", label: "Open Subtitle Studio" },
  { id: "tabTemplates", icon: "📁", label: "Open Template Library" },
];

const KEYFRAMES_ID = "command-palette-keyframes";

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.92) translateY(-12px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

export default function CommandPalette({ open, onClose, darkMode, onAction }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    injectKeyframes();
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const scrollToItem = useCallback((index) => {
    if (!listRef.current) return;
    const items = listRef.current.children;
    if (items[index]) {
      items[index].scrollIntoView({ block: "nearest" });
    }
  }, []);

  const handleSelect = useCallback(
    (action) => {
      onAction?.(action.id);
      onClose?.();
    },
    [onAction, onClose]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = (activeIndex + 1) % filtered.length;
        setActiveIndex(next);
        scrollToItem(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (activeIndex - 1 + filtered.length) % filtered.length;
        setActiveIndex(prev);
        scrollToItem(prev);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[activeIndex]) {
          handleSelect(filtered[activeIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    },
    [activeIndex, filtered, handleSelect, onClose, scrollToItem]
  );

  if (!open) return null;

  const colors = {
    bg: darkMode
      ? "linear-gradient(145deg, #111111, #0a0a0a)"
      : "linear-gradient(145deg, #f5f0e8, #ece7dd)",
    border: darkMode ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.2)",
    text: darkMode ? "#e8e0d4" : "#1e1b18",
    sub: darkMode ? "#b0a090" : "#78350f",
    accent: "#f59e0b",
    accentHover: "#d97706",
    inputBg: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    hoverBg: darkMode ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)",
    activeBg: darkMode ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.15)",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        background: darkMode ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: colors.bg,
          border: `1.5px solid ${colors.border}`,
          borderRadius: 20,
          boxShadow: darkMode
            ? "0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)"
            : "0 24px 64px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.6)",
          overflow: "hidden",
          animation: "fadeInScale 0.2s ease-out forwards",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div style={{ padding: "16px 16px 0 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: colors.inputBg,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 15,
                color: colors.text,
                fontFamily: "inherit",
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: colors.sub,
                background: darkMode
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
                padding: "2px 8px",
                borderRadius: 6,
                fontFamily: "monospace",
              }}
            >
              ESC
            </span>
          </div>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          style={{
            maxHeight: 340,
            overflowY: "auto",
            padding: "8px",
            marginTop: 8,
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: colors.sub,
                fontSize: 14,
              }}
            >
              No commands found
            </div>
          )}
          {filtered.map((action, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={action.id}
                onClick={() => handleSelect(action)}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  background: isActive ? colors.activeBg : "transparent",
                  transition: "background 0.12s ease",
                }}
              >
                <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>
                  {action.icon}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: 500,
                    color: isActive ? colors.accent : colors.text,
                    transition: "color 0.12s ease",
                  }}
                >
                  {action.label}
                </span>
                {action.shortcut && (
                  <span
                    style={{
                      fontSize: 11,
                      color: colors.sub,
                      background: darkMode
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.06)",
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontFamily: "monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {action.shortcut}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 11,
            color: colors.sub,
          }}
        >
          <span>
            <kbd style={kbdStyle(darkMode)}>↑↓</kbd> navigate
          </span>
          <span>
            <kbd style={kbdStyle(darkMode)}>↵</kbd> select
          </span>
          <span>
            <kbd style={kbdStyle(darkMode)}>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

function kbdStyle(darkMode) {
  return {
    display: "inline-block",
    background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
    borderRadius: 4,
    padding: "1px 5px",
    fontFamily: "monospace",
    fontSize: 11,
    marginRight: 3,
  };
}
