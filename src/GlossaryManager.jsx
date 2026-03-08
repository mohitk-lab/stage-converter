import React, { useState, useEffect, useMemo, useRef } from "react";

const LANGUAGES = [
  { value: "hindi", label: "\u0939\u093F\u0928\u094D\u0926\u0940" },
  { value: "english", label: "English" },
  { value: "bhojpuri", label: "\u092D\u094B\u091C\u092A\u0941\u0930\u0940" },
  { value: "haryanvi", label: "\u0939\u0930\u093F\u092F\u093E\u0923\u0935\u0940" },
  { value: "rajasthani", label: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928\u0940" },
  { value: "gujarati", label: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0" },
  { value: "marathi", label: "\u092E\u0930\u093E\u0920\u0940" },
  { value: "bengali", label: "\u09AC\u09BE\u0982\u09B2\u09BE" },
  { value: "punjabi", label: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40" },
  { value: "tamil", label: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD" },
  { value: "telugu", label: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41" },
  { value: "kannada", label: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1" },
  { value: "malayalam", label: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02" },
  { value: "odia", label: "\u0B13\u0B21\u0B3C\u0B3F\u0B06" },
  { value: "assamese", label: "\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE" },
  { value: "urdu", label: "\u0627\u0631\u062F\u0648" },
];

const STORAGE_KEY = "ruhi_glossary";

function loadEntries() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveEntries(entries) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

function langLabel(val) {
  const l = LANGUAGES.find((x) => x.value === val);
  return l ? l.label : val;
}

export default function GlossaryManager({ darkMode }) {
  const [entries, setEntries] = useState(loadEntries);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterTarget, setFilterTarget] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formSourceLang, setFormSourceLang] = useState("hindi");
  const [formTargetLang, setFormTargetLang] = useState("english");
  const [formSourceWord, setFormSourceWord] = useState("");
  const [formTargetWord, setFormTargetWord] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [bulkText, setBulkText] = useState("");

  const fileRef = useRef(null);

  useEffect(() => { saveEntries(entries); }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterSource !== "all" && e.sourceLang !== filterSource) return false;
      if (filterTarget !== "all" && e.targetLang !== filterTarget) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.sourceWord.toLowerCase().includes(q) || e.targetWord.toLowerCase().includes(q) || (e.notes || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [entries, search, filterSource, filterTarget]);

  function resetForm() {
    setFormSourceWord(""); setFormTargetWord(""); setFormNotes("");
    setEditId(null); setShowForm(false); setBulkMode(false); setBulkText("");
  }

  function openEdit(entry) {
    setFormSourceLang(entry.sourceLang); setFormTargetLang(entry.targetLang);
    setFormSourceWord(entry.sourceWord); setFormTargetWord(entry.targetWord);
    setFormNotes(entry.notes || ""); setEditId(entry.id);
    setShowForm(true); setBulkMode(false);
  }

  function handleSave(e) {
    e.preventDefault();
    if (!formSourceWord.trim() || !formTargetWord.trim()) return;
    if (editId) {
      setEntries((prev) => prev.map((x) => x.id === editId ? { ...x, sourceLang: formSourceLang, targetLang: formTargetLang, sourceWord: formSourceWord.trim(), targetWord: formTargetWord.trim(), notes: formNotes.trim() } : x));
    } else {
      setEntries((prev) => [...prev, { id: Date.now(), sourceLang: formSourceLang, targetLang: formTargetLang, sourceWord: formSourceWord.trim(), targetWord: formTargetWord.trim(), notes: formNotes.trim(), createdAt: new Date().toISOString() }]);
    }
    resetForm();
  }

  function handleBulkAdd(e) {
    e.preventDefault();
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    const newEntries = [];
    for (const line of lines) {
      const parts = line.split("=").map((s) => s.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        newEntries.push({ id: Date.now() + Math.random(), sourceLang: formSourceLang, targetLang: formTargetLang, sourceWord: parts[0], targetWord: parts[1], notes: "", createdAt: new Date().toISOString() });
      }
    }
    if (newEntries.length) setEntries((prev) => [...prev, ...newEntries]);
    resetForm();
  }

  function handleDelete(id) { setEntries((prev) => prev.filter((x) => x.id !== id)); setDeleteConfirm(null); }

  function handleExportCSV() {
    const header = "sourceLang,targetLang,sourceWord,targetWord,notes";
    const rows = entries.map((e) => [e.sourceLang, e.targetLang, `"${(e.sourceWord || "").replace(/"/g, '""')}"`, `"${(e.targetWord || "").replace(/"/g, '""')}"`, `"${(e.notes || "").replace(/"/g, '""')}"`].join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "glossary.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportCSV(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split("\n").slice(1).filter((l) => l.trim());
      const imported = [];
      for (const line of lines) {
        const match = line.match(/^([^,]+),([^,]+),("(?:[^"]|"")*"|[^,]*),("(?:[^"]|"")*"|[^,]*),("(?:[^"]|"")*"|[^,]*)$/);
        if (match) {
          const clean = (s) => s.replace(/^"|"$/g, "").replace(/""/g, '"').trim();
          imported.push({ id: Date.now() + Math.random(), sourceLang: match[1].trim(), targetLang: match[2].trim(), sourceWord: clean(match[3]), targetWord: clean(match[4]), notes: clean(match[5] || ""), createdAt: new Date().toISOString() });
        }
      }
      if (imported.length) setEntries((prev) => [...prev, ...imported]);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Styles
  const textColor = darkMode ? "#e8e0d4" : "#3d3425";
  const subText = darkMode ? "#9a9084" : "#7a7062";
  const cardBg = darkMode ? "linear-gradient(145deg, #0d0d0d, #080808)" : "linear-gradient(145deg, #f5f0e8, #ece7dd)";
  const cardShadow = darkMode ? "8px 8px 16px rgba(0,0,0,0.7), -6px -6px 14px rgba(255,255,255,0.03)" : "8px 8px 16px rgba(166,152,130,0.4), -6px -6px 14px rgba(255,255,255,0.8)";
  const cardBorder = darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.5)";

  const btnStyle = { background: "linear-gradient(145deg, #f59e0b, #d97706)", color: "#1e1b18", border: "none", padding: "10px 20px", borderRadius: "14px", fontWeight: 600, fontSize: "14px", cursor: "pointer", boxShadow: "4px 4px 10px rgba(0,0,0,0.2), -3px -3px 8px rgba(255,255,255,0.1)", fontFamily: "'Inter','Segoe UI',sans-serif" };
  const btnSecondary = { ...btnStyle, background: cardBg, color: textColor, border: cardBorder, boxShadow: cardShadow };
  const btnDanger = { ...btnStyle, background: "linear-gradient(145deg, #ef4444, #dc2626)", color: "#fff", padding: "6px 14px", fontSize: "12px" };
  const btnSmall = { ...btnStyle, padding: "6px 14px", fontSize: "12px" };

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: "12px", border: cardBorder, background: darkMode ? "#0d0d0d" : "#faf7f2", color: textColor, fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "'Inter','Segoe UI',sans-serif", boxShadow: darkMode ? "inset 3px 3px 6px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(255,255,255,0.03)" : "inset 3px 3px 6px rgba(166,152,130,0.25), inset -2px -2px 5px rgba(255,255,255,0.7)" };
  const selectStyle = { ...inputStyle, cursor: "pointer" };

  const formCard = { background: cardBg, boxShadow: cardShadow, border: cardBorder, borderRadius: "20px", padding: "24px", marginBottom: "24px" };
  const labelSt = { display: "block", fontSize: "12px", fontWeight: 600, color: subText, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" };
  const fieldGroup = { marginBottom: "16px" };
  const rowStyle = { display: "flex", gap: "12px", flexWrap: "wrap" };

  const overlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
  const dialog = { background: cardBg, boxShadow: cardShadow, border: cardBorder, borderRadius: "20px", padding: "28px", maxWidth: "400px", width: "90%", textAlign: "center" };

  const tableCard = { background: cardBg, boxShadow: cardShadow, border: cardBorder, borderRadius: "14px", overflow: "hidden" };
  const thStyle = { padding: "12px 14px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: subText, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)" };
  const tdStyle = { padding: "10px 14px", fontSize: "14px", color: textColor, borderBottom: darkMode ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.04)" };

  return (
    <div style={{ padding: "24px", color: textColor, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportCSV} />
          <button className="clay-btn" style={btnSecondary} onClick={() => fileRef.current?.click()}>Import CSV</button>
          <button className="clay-btn" style={btnSecondary} onClick={handleExportCSV}>Export CSV</button>
          <button className="clay-btn-primary" style={btnStyle} onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); } }}>
            {showForm ? "Cancel" : "+ Add Entry"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="clay" style={formCard}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <button className="clay-btn" style={!bulkMode ? btnStyle : btnSecondary} onClick={() => setBulkMode(false)}>Single</button>
            <button className="clay-btn" style={bulkMode ? btnStyle : btnSecondary} onClick={() => setBulkMode(true)}>Bulk Add</button>
          </div>
          <form onSubmit={bulkMode ? handleBulkAdd : handleSave}>
            <div style={rowStyle}>
              <div style={{ ...fieldGroup, flex: 1, minWidth: "140px" }}>
                <label style={labelSt}>Source Language</label>
                <select style={selectStyle} value={formSourceLang} onChange={(e) => setFormSourceLang(e.target.value)}>
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div style={{ ...fieldGroup, flex: 1, minWidth: "140px" }}>
                <label style={labelSt}>Target Language</label>
                <select style={selectStyle} value={formTargetLang} onChange={(e) => setFormTargetLang(e.target.value)}>
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
            {bulkMode ? (
              <div style={fieldGroup}>
                <label style={labelSt}>Pairs (one per line: source = target)</label>
                <textarea style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={"namaste = hello\ndhanyavaad = thank you\npyaar = love"} />
              </div>
            ) : (
              <>
                <div style={rowStyle}>
                  <div style={{ ...fieldGroup, flex: 1, minWidth: "140px" }}>
                    <label style={labelSt}>Source Word</label>
                    <input style={inputStyle} value={formSourceWord} onChange={(e) => setFormSourceWord(e.target.value)} placeholder="e.g. namaste" required />
                  </div>
                  <div style={{ ...fieldGroup, flex: 1, minWidth: "140px" }}>
                    <label style={labelSt}>Target Word</label>
                    <input style={inputStyle} value={formTargetWord} onChange={(e) => setFormTargetWord(e.target.value)} placeholder="e.g. hello" required />
                  </div>
                </div>
                <div style={fieldGroup}>
                  <label style={labelSt}>Notes (optional)</label>
                  <input style={inputStyle} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Context, usage notes..." />
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button type="button" className="clay-btn" style={btnSecondary} onClick={resetForm}>Cancel</button>
              <button type="submit" className="clay-btn-primary" style={btnStyle}>{editId ? "Update" : bulkMode ? "Add All" : "Add Entry"}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...inputStyle, maxWidth: "280px" }} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search glossary..." />
        <select style={{ ...selectStyle, maxWidth: "160px" }} value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          <option value="all">All Source</option>
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <select style={{ ...selectStyle, maxWidth: "160px" }} value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)}>
          <option value="all">All Target</option>
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <span style={{ fontSize: "13px", color: subText }}>{filtered.length} of {entries.length} entries</span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: subText, fontSize: "15px" }}>
          {entries.length === 0 ? "No glossary entries yet. Click \"+ Add Entry\" to get started." : "No entries match your search or filters."}
        </div>
      ) : (
        <div className="clay" style={tableCard}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Target</th>
                  <th style={thStyle}>Notes</th>
                  <th style={thStyle}>Date</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id}>
                    <td style={tdStyle}>
                      <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>{langLabel(entry.sourceLang)}</span>
                      <div>{entry.sourceWord}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 600 }}>{langLabel(entry.targetLang)}</span>
                      <div>{entry.targetWord}</div>
                    </td>
                    <td style={{ ...tdStyle, color: subText, fontSize: "13px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.notes || "--"}</td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: subText, whiteSpace: "nowrap" }}>{new Date(entry.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}</td>
                    <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="clay-btn" style={btnSmall} onClick={() => openEdit(entry)}>Edit</button>{" "}
                      <button className="clay-btn" style={btnDanger} onClick={() => setDeleteConfirm(entry.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleteConfirm !== null && (
        <div style={overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={dialog} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: textColor }}>Delete Entry?</div>
            <div style={{ fontSize: "14px", color: subText, marginBottom: "24px" }}>This action cannot be undone.</div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button className="clay-btn" style={btnSecondary} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="clay-btn" style={btnDanger} onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
