import React, { useState, useEffect, useMemo } from "react";

const CATEGORIES = ["Promo", "Campaign", "Dialogue", "Caption", "Headline", "Song", "General"];

const CATEGORY_COLORS = {
  Promo: "#f97316",
  Campaign: "#3b82f6",
  Dialogue: "#22c55e",
  Caption: "#a855f7",
  Headline: "#ef4444",
  Song: "#0891b2",
  General: "#6b5e50",
};

const STORAGE_KEY = "ruhi_templates";

const STARTER_TEMPLATES = [
  {
    id: 1,
    name: "Movie Promo - Hindi",
    category: "Promo",
    script: "इस गर्मी, एक कहानी जो आपके दिल को छू जाएगी। देखिए बॉलीवुड की सबसे बड़ी फिल्म, जो प्यार, जुनून और हिम्मत की दास्तान है। सिनेमाघरों में जल्द आ रही है।",
    languages: ["hi", "en", "ta"],
    date: "2026-01-15T00:00:00.000Z",
    isBuiltIn: true,
  },
  {
    id: 2,
    name: "YouTube Description",
    category: "General",
    script: "Welcome to our channel! In today's video, we explore the top 10 travel destinations you must visit this year. Don't forget to like, subscribe, and hit the bell icon for more amazing content every week!",
    languages: ["en", "hi", "es"],
    date: "2026-01-20T00:00:00.000Z",
    isBuiltIn: true,
  },
  {
    id: 3,
    name: "Instagram Caption",
    category: "Caption",
    script: "Chasing sunsets and making memories that last a lifetime. Every journey begins with a single step — where will yours take you? ✨🌅 #TravelDiaries #Wanderlust #ExploreMore",
    languages: ["en", "hi", "fr"],
    date: "2026-02-01T00:00:00.000Z",
    isBuiltIn: true,
  },
  {
    id: 4,
    name: "Song Lyrics Translation",
    category: "Song",
    script: "Tere bina zindagi se koi shikwa to nahin, tere bina zindagi bhi lekin zindagi to nahin. Tum jo keh do to aaj ki raat chand doob jaaye, tum jo keh do to dharti pe sitaare aa jaayein.",
    languages: ["hi", "en", "ur"],
    date: "2026-02-10T00:00:00.000Z",
    isBuiltIn: true,
  },
  {
    id: 5,
    name: "News Headline",
    category: "Headline",
    script: "Breaking: Historic climate agreement reached as 195 nations pledge to reduce carbon emissions by 50% before 2035. Global leaders call it a turning point for future generations.",
    languages: ["en", "hi", "bn"],
    date: "2026-02-20T00:00:00.000Z",
    isBuiltIn: true,
  },
];

function loadTemplates() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const builtInIds = new Set(STARTER_TEMPLATES.map((t) => t.id));
      const userTemplates = parsed.filter((t) => !builtInIds.has(t.id) && !t.isBuiltIn);
      return [...STARTER_TEMPLATES, ...userTemplates];
    }
  } catch (e) {
    // ignore
  }
  return [...STARTER_TEMPLATES];
}

function saveTemplates(templates) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    // ignore
  }
}

export default function TemplateLibrary({ darkMode, onUseTemplate }) {
  const [templates, setTemplates] = useState(loadTemplates);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formScript, setFormScript] = useState("");
  const [formLanguages, setFormLanguages] = useState("");

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory = filterCategory === "All" || t.category === filterCategory;
      const q = search.toLowerCase();
      const matchesSearch =
        !q || t.name.toLowerCase().includes(q) || t.script.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [templates, search, filterCategory]);

  function handleSave(e) {
    e.preventDefault();
    if (!formName.trim() || !formScript.trim()) return;
    const langs = formLanguages
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    const newTemplate = {
      id: Date.now(),
      name: formName.trim(),
      category: formCategory,
      script: formScript.trim(),
      languages: langs,
      date: new Date().toISOString(),
      isBuiltIn: false,
    };
    setTemplates((prev) => [...prev, newTemplate]);
    setFormName("");
    setFormCategory("General");
    setFormScript("");
    setFormLanguages("");
    setShowForm(false);
  }

  function handleDelete(id) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setDeleteConfirm(null);
  }

  function handleUse(template) {
    if (onUseTemplate) {
      onUseTemplate({ script: template.script, languages: template.languages });
    }
  }

  // -- Styles --

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
  const subText = darkMode ? "#9a9084" : "#7a7062";

  const containerStyle = {
    padding: "24px",
    color: textColor,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
    gap: "12px",
  };

  const titleStyle = {
    fontSize: "22px",
    fontWeight: 700,
    color: textColor,
    margin: 0,
  };

  const btnStyle = {
    background: "linear-gradient(145deg, #f59e0b, #d97706)",
    color: "#1e1b18",
    border: "none",
    padding: "10px 20px",
    borderRadius: "14px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "4px 4px 10px rgba(0,0,0,0.2), -3px -3px 8px rgba(255,255,255,0.1)",
  };

  const btnSecondaryStyle = {
    ...btnStyle,
    background: cardBg,
    color: textColor,
    border: cardBorder,
    boxShadow: cardShadow,
  };

  const btnDangerStyle = {
    ...btnStyle,
    background: "linear-gradient(145deg, #ef4444, #dc2626)",
    color: "#fff",
    padding: "6px 14px",
    fontSize: "12px",
  };

  const btnSmallStyle = {
    ...btnStyle,
    padding: "6px 14px",
    fontSize: "12px",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "12px",
    border: cardBorder,
    background: darkMode ? "#0d0d0d" : "#faf7f2",
    color: textColor,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    boxShadow: darkMode
      ? "inset 3px 3px 6px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.03)"
      : "inset 3px 3px 6px rgba(166,152,130,0.25), inset -2px -2px 5px rgba(255,255,255,0.7)",
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
  };

  const formCardStyle = {
    background: cardBg,
    boxShadow: cardShadow,
    border: cardBorder,
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "24px",
  };

  const filtersStyle = {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap",
    alignItems: "center",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "20px",
  };

  const templateCardStyle = {
    background: cardBg,
    boxShadow: cardShadow,
    border: cardBorder,
    borderRadius: "20px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    transition: "transform 0.15s ease",
  };

  const badgeStyle = (category) => ({
    display: "inline-block",
    background: CATEGORY_COLORS[category] || "#6b5e50",
    color: "#fff",
    padding: "3px 10px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.3px",
  });

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: subText,
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const fieldGroup = {
    marginBottom: "16px",
  };

  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  };

  const dialogStyle = {
    background: cardBg,
    boxShadow: cardShadow,
    border: cardBorder,
    borderRadius: "20px",
    padding: "28px",
    maxWidth: "400px",
    width: "90%",
    textAlign: "center",
  };

  return (
    <div style={containerStyle}>
      {/* Search, Filter & Add — single toolbar */}
      <div style={filtersStyle}>
        <input
          style={{ ...inputStyle, maxWidth: "260px" }}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
        />
        <select
          style={{ ...selectStyle, maxWidth: "160px" }}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button style={btnStyle} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Save Template"}
        </button>
      </div>

      {/* Save Template Form */}
      {showForm && (
        <div style={formCardStyle}>
          <form onSubmit={handleSave}>
            <div style={fieldGroup}>
              <label style={labelStyle}>Template Name</label>
              <input
                style={inputStyle}
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Festive Sale Promo"
                required
              />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Category</label>
              <select
                style={selectStyle}
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Script Text</label>
              <textarea
                style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
                value={formScript}
                onChange={(e) => setFormScript(e.target.value)}
                placeholder="Enter your script or template text here..."
                required
              />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Languages (comma-separated IDs)</label>
              <input
                style={inputStyle}
                type="text"
                value={formLanguages}
                onChange={(e) => setFormLanguages(e.target.value)}
                placeholder="e.g. hi, en, ta, bn"
              />
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button type="button" style={btnSecondaryStyle} onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" style={btnStyle}>
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates Grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 20px",
            color: subText,
            fontSize: "15px",
          }}
        >
          No templates found. Try a different search or category.
        </div>
      ) : (
        <div style={gridStyle}>
          {filtered.map((template) => (
            <div key={template.id} style={templateCardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 600, color: textColor }}>
                  {template.name}
                </div>
                <span style={badgeStyle(template.category)}>{template.category}</span>
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: subText,
                  lineHeight: "1.5",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {template.script}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {template.languages.map((lang) => (
                  <span
                    key={lang}
                    style={{
                      background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                      color: subText,
                      padding: "2px 8px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 500,
                    }}
                  >
                    {lang}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: "11px", color: subText }}>
                {new Date(template.date).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                {template.isBuiltIn && (
                  <span
                    style={{
                      marginLeft: "8px",
                      color: "#f59e0b",
                      fontWeight: 600,
                    }}
                  >
                    Built-in
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "4px",
                  justifyContent: "flex-end",
                }}
              >
                {!template.isBuiltIn && (
                  <button
                    style={btnDangerStyle}
                    onClick={() => setDeleteConfirm(template.id)}
                  >
                    Delete
                  </button>
                )}
                <button style={btnSmallStyle} onClick={() => handleUse(template)}>
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm !== null && (
        <div style={overlayStyle} onClick={() => setDeleteConfirm(null)}>
          <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: textColor }}>
              Delete Template?
            </div>
            <div style={{ fontSize: "14px", color: subText, marginBottom: "24px" }}>
              This action cannot be undone. Are you sure you want to delete this template?
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button style={btnSecondaryStyle} onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button style={btnDangerStyle} onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
