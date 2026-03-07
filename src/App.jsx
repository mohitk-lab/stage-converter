import { useState, useEffect } from "react";

function FloatingHearts() {
  const hearts = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 4 + Math.random() * 4,
    size: 14 + Math.random() * 20,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {hearts.map((h) => (
        <span
          key={h.id}
          style={{
            position: "absolute",
            bottom: "-40px",
            left: `${h.left}%`,
            fontSize: `${h.size}px`,
            animation: `floatHeart ${h.duration}s ease-in ${h.delay}s infinite`,
            opacity: 0.6,
          }}
        >
          {["&#10084;", "&#10085;"][h.id % 2] === "&#10084;" ? "\u2764" : "\u2765"}
        </span>
      ))}
    </div>
  );
}

function ProposalOverlay({ onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(136,14,79,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        animation: "fadeInUp 0.6s ease",
        cursor: "pointer",
      }}
      onClick={onClose}
    >
      <div
        style={{
          textAlign: "center",
          color: "#fff",
          animation: "pulse 2s ease infinite",
        }}
      >
        <div style={{ fontSize: "80px", marginBottom: "20px" }}>
          {"\u2764\uFE0F"}
        </div>
        <h1
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: "clamp(2rem, 6vw, 4rem)",
            fontWeight: 700,
            marginBottom: "16px",
            textShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}
        >
          Will you be my life partner?
        </h1>
        <p
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: "1.1rem",
            opacity: 0.8,
            fontWeight: 300,
          }}
        >
          I promise to love you forever...
        </p>
        <div style={{ marginTop: "30px", fontSize: "40px", letterSpacing: "10px" }}>
          {"\u2764 \u2764 \u2764"}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [clickCount, setClickCount] = useState(0);
  const [showProposal, setShowProposal] = useState(false);
  const [shake, setShake] = useState(false);

  const maxClicks = 5;
  const tab2Gone = clickCount >= maxClicks;

  const handleMaarClick = () => {
    if (tab2Gone) return;
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setClickCount((c) => Math.min(c + 1, maxClicks));
  };

  const handleMaafClick = () => {
    setShowProposal(true);
  };

  const tab1Scale = 1 + clickCount * 0.12;
  const tab2Scale = 1 - clickCount * 0.16;
  const tab2Opacity = tab2Gone ? 0 : 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "20px",
      }}
    >
      <FloatingHearts />

      {/* Title */}
      <h1
        style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: "clamp(1.8rem, 5vw, 3rem)",
          color: "#880e4f",
          marginBottom: "10px",
          textAlign: "center",
          animation: "fadeInUp 0.8s ease",
          position: "relative",
          zIndex: 1,
        }}
      >
        Hey Cutie...
      </h1>
      <p
        style={{
          fontFamily: "'Poppins', sans-serif",
          color: "#ad1457",
          fontSize: "0.95rem",
          marginBottom: "40px",
          fontWeight: 300,
          opacity: 0.8,
          animation: "fadeInUp 1s ease",
          position: "relative",
          zIndex: 1,
        }}
      >
        I have something to say...
      </p>

      {/* Puppy */}
      <div
        style={{
          fontSize: "clamp(80px, 20vw, 140px)",
          marginBottom: "50px",
          animation: shake
            ? "pulse 0.3s ease 3"
            : "pulse 3s ease infinite",
          position: "relative",
          zIndex: 1,
          filter: "drop-shadow(0 10px 30px rgba(136,14,79,0.2))",
          lineHeight: 1,
        }}
      >
        {"\uD83D\uDC36"}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
          animation: "fadeInUp 1.2s ease",
        }}
      >
        {/* Tab 1 - Maaf Kiya */}
        <button
          onClick={handleMaafClick}
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: `clamp(0.9rem, 2.5vw, 1.15rem)`,
            fontWeight: 500,
            padding: "14px 32px",
            border: "none",
            borderRadius: "50px",
            background: "linear-gradient(135deg, #e91e63, #c2185b)",
            color: "#fff",
            cursor: "pointer",
            transform: `scale(${tab1Scale})`,
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: `0 4px ${10 + clickCount * 4}px rgba(233,30,99,${0.3 + clickCount * 0.08})`,
            letterSpacing: "0.5px",
          }}
        >
          {tab2Gone ? "Maaf Kiya \u2764\uFE0F" : "Maaf Kiya"}
        </button>

        {/* Tab 2 - Maar Dalugi */}
        {!tab2Gone && (
          <button
            onClick={handleMaarClick}
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: "clamp(0.9rem, 2.5vw, 1.15rem)",
              fontWeight: 500,
              padding: "14px 32px",
              border: "2px solid rgba(136,14,79,0.3)",
              borderRadius: "50px",
              background: "rgba(255,255,255,0.6)",
              color: "#880e4f",
              cursor: "pointer",
              transform: `scale(${tab2Scale})`,
              opacity: tab2Opacity,
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              backdropFilter: "blur(10px)",
              letterSpacing: "0.5px",
            }}
          >
            Maar Dalugi
          </button>
        )}
      </div>

      {/* Click hint */}
      {!tab2Gone && clickCount > 0 && (
        <p
          style={{
            fontFamily: "'Poppins', sans-serif",
            color: "#ad1457",
            fontSize: "0.8rem",
            marginTop: "20px",
            opacity: 0.6,
            fontWeight: 300,
            position: "relative",
            zIndex: 1,
          }}
        >
          {clickCount < 3
            ? "Sochlo phir se..."
            : clickCount < 5
            ? "Ab toh maaf kr do na..."
            : ""}
        </p>
      )}

      {tab2Gone && (
        <p
          style={{
            fontFamily: "'Dancing Script', cursive",
            color: "#880e4f",
            fontSize: "clamp(1rem, 3vw, 1.4rem)",
            marginTop: "24px",
            fontWeight: 600,
            animation: "fadeInUp 0.6s ease",
            position: "relative",
            zIndex: 1,
          }}
        >
          Ab click kro... please
        </p>
      )}

      {/* Proposal */}
      {showProposal && (
        <ProposalOverlay onClose={() => setShowProposal(false)} />
      )}
    </div>
  );
}
