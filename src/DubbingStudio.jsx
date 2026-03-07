import { useState } from "react";

/* ========================================
   STAGE DUBBING STUDIO
   6 AI-powered dubbing modules for Stage OTT
======================================== */

const MODULES = [
  { id: "adapt", icon: "\uD83C\uDFAC", label: "Script Adaptation" },
  { id: "voice", icon: "\uD83C\uDFAD", label: "Voice Direction" },
  { id: "timing", icon: "\u23F1\uFE0F", label: "Timing Sheet" },
  { id: "bible", icon: "\uD83D\uDCCB", label: "Voice Bible" },
  { id: "lipsync", icon: "\uD83D\uDC44", label: "Lip-Sync Adapter" },
  { id: "qc", icon: "\u2705", label: "QC Review" },
];

const LANGUAGES = [
  { value: "hindi", label: "\u0939\u093F\u0928\u094D\u0926\u0940" },
  { value: "bhojpuri", label: "\u092D\u094B\u091C\u092A\u0941\u0930\u0940" },
  { value: "haryanvi", label: "\u0939\u0930\u093F\u092F\u093E\u0923\u0935\u0940" },
  { value: "rajasthani", label: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928\u0940" },
  { value: "gujarati", label: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0" },
  { value: "marathi", label: "\u092E\u0930\u093E\u0920\u0940" },
  { value: "bengali", label: "\u09AC\u09BE\u0982\u09B2\u09BE" },
  { value: "punjabi", label: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40" },
  { value: "tamil", label: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD" },
  { value: "telugu", label: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41" },
];

const GENRES = [
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
  { value: "thriller", label: "Thriller" },
  { value: "romance", label: "Romance" },
  { value: "action", label: "Action" },
  { value: "horror", label: "Horror" },
  { value: "social", label: "Social" },
  { value: "devotional", label: "Devotional" },
];

/* --- System Prompts --- */
function buildAdaptSystem(data) {
  return `You are an expert dubbing script adapter for Stage, a regional Indian OTT platform. Your job is to adapt scripts from ${data.sourceLang} to ${data.targetLang} for professional dubbing.

ADAPTATION TYPE: ${data.adaptationType}

RULES:
- Match syllable count as closely as possible to the original for lip-sync
- Preserve bilabial consonants (B/P/M sounds) at the same positions in the sentence
- Keep open vowel sounds (AA/OH/AH) aligned with the original timing
- Culturally localize idioms, humor, and references for ${data.targetLang} audience
- Preserve emotional intensity and character voice
- If timecodes are present (e.g. [00:01:23]), preserve them exactly
- For each adapted line, add a SYNC NOTE about timing match quality

CONTENT TYPE: ${data.contentType}

OUTPUT FORMAT:
For each line provide:
---
ORIGINAL: [source line]
ADAPTED: [target language adaptation]
SYLLABLES: [original count] → [adapted count]
SYNC NOTE: [timing/lip-sync observation]
---

After all lines, provide:
=== ADAPTATION SUMMARY ===
- Overall sync quality score (1-10)
- Lines that need recording attention (longer/shorter than original)
- Cultural changes made and why
- Pronunciation guide for difficult ${data.targetLang} words`;
}

function buildVoiceSystem(data) {
  return `You are a professional dubbing voice director for Stage OTT platform. Generate comprehensive voice direction notes for dubbing artists recording in ${data.language}.

CHARACTER: ${data.characterName}
GENRE: ${data.genre}

OUTPUT FORMAT:

=== CHARACTER VOICE PROFILE ===
- Voice Type: [bass/baritone/tenor/alto/soprano]
- Age Sound: [how old should the voice sound]
- Energy Level: [1-10 baseline]
- Speech Tempo: [words per minute estimate]
- Dialect Notes: [specific ${data.language} dialect/accent guidance]

=== SCENE DIRECTION ===
For the given scene context, provide:
- Opening emotion and energy level
- Beat-by-beat emotion shifts
- Key moments requiring specific delivery
- Pause/breath placement suggestions

=== LINE-BY-LINE DIRECTION ===
For each dialogue line (if provided), specify:
- Emotion: [primary emotion + intensity 1-10]
- Pacing: [slow/medium/fast + any pauses]
- Emphasis: [which words to stress]
- Subtext: [what the character is really feeling]
- Technical: [whisper/shout/breathe/cry/laugh markers]

=== PRONUNCIATION GUIDE ===
- Difficult words/names with phonetic spelling
- Regional pronunciation variations for ${data.language}
- Words that must match original language pronunciation (brand names, etc.)

=== DO's AND DON'Ts ===
- Specific things the artist should/shouldn't do for this character`;
}

function buildTimingSystem(data) {
  return `You are a professional dubbing timing engineer for Stage OTT platform. Generate a detailed dubbing cue sheet/timing sheet.

SOURCE LANGUAGE: ${data.sourceLang}
TARGET LANGUAGE: ${data.targetLang}
FORMAT: ${data.format}
EPISODE/SCENE: ${data.episodeInfo || "Not specified"}

OUTPUT FORMAT (${data.format}):

=== DUBBING CUE SHEET ===
Episode: ${data.episodeInfo || "N/A"}
Source: ${data.sourceLang} → Target: ${data.targetLang}

| Cue# | TC IN | TC OUT | DUR(s) | CHAR | ORIGINAL | ADAPTED (${data.targetLang}) | WORD COUNT | SYNC STATUS |
|------|-------|--------|--------|------|----------|------------|------------|-------------|

For each dialogue line:
- Assign sequential cue numbers
- If timecodes provided, use them; otherwise estimate based on line length
- Duration = estimated speaking time (~2.5 words/sec for ${data.targetLang})
- SYNC STATUS: OK (within 0.5s) / LONG (needs speed up) / SHORT (needs slow down) / REWRITE (needs restructuring)

=== TIMING NOTES ===
- Lines requiring speed adjustment
- Suggested rewrites for timing-critical lines
- Pause/breath opportunities
- Scene transitions and natural break points

=== SUMMARY ===
- Total cues
- Sync-OK percentage
- Lines needing attention
- Estimated total dubbed audio duration`;
}

function buildBibleSystem(data) {
  return `You are a senior dubbing director creating a Character Voice Bible for Stage OTT platform. This document ensures voice consistency across all episodes of a show dubbed in ${data.language}.

SHOW: ${data.showTitle}
GENRE: ${data.genre}
EPISODES: ${data.episodes || "N/A"}
LANGUAGE: ${data.language}

For EACH character listed, generate:

=== CHARACTER: [Name] ===

1. VOICE IDENTITY
   - Voice type (bass/baritone/tenor/alto/soprano)
   - Age range the voice should convey
   - Pitch baseline (Hz estimate or relative: low/mid/high)
   - Speech tempo (slow/medium/fast, WPM estimate)
   - Vocal texture (smooth/raspy/nasal/breathy/clear)

2. DIALECT & ACCENT
   - Primary ${data.language} dialect/accent
   - Regional speech patterns to incorporate
   - Words/phrases this character would typically use
   - Words/phrases this character would NEVER use

3. SIGNATURE ELEMENTS
   - Catchphrases adapted to ${data.language}
   - Verbal tics or habits (um, haan, etc.)
   - Laugh style description
   - How they greet/address different characters

4. EMOTIONAL RANGE MAP
   - Neutral: [description of baseline delivery]
   - Happy/Excited: [how voice changes]
   - Angry/Frustrated: [how voice changes]
   - Sad/Vulnerable: [how voice changes]
   - Scared/Anxious: [how voice changes]
   - Romantic/Tender: [how voice changes]
   - Comic moments: [how voice changes]

5. RELATIONSHIP DYNAMICS
   - How voice changes when talking to [other character names]
   - Power dynamics reflected in voice
   - Formality shifts

6. CONSISTENCY RULES
   - ALWAYS: [non-negotiable voice traits]
   - NEVER: [things to avoid]
   - EVOLVES: [traits that change over the series arc]

=== CROSS-CHARACTER RULES ===
- Voice contrast requirements (no two characters should sound alike)
- Scene dynamics (who dominates vocally in group scenes)
- Ensemble energy guidelines`;
}

function buildLipsyncSystem(data) {
  return `You are a lip-sync specialist for Stage OTT dubbing. Your job is to create ${data.targetLang} dialogue alternatives that match the mouth movements of the ${data.sourceLang} original.

SYNC PRIORITY: ${data.syncPriority}
MOUTH REFERENCE FOCUS: ${data.mouthRef}

PHONEME MATCHING RULES:
- Bilabial (B/P/M): Lips fully closed → must match these positions exactly
- Labiodental (F/V): Lower lip touches upper teeth → match these positions
- Open vowels (AA/AH/OH): Wide open mouth → align with original open positions
- Closed sounds (S/T/N): Minimal mouth movement → flexible timing
- Rounded vowels (OO/U): Pursed lips → try to match

For EACH original line, provide 3 alternatives:

=== LINE: "[original]" ===

MOUTH MAP: [describe the mouth movement sequence]
Key positions: [timestamp/word where mouth is notably open/closed/rounded]

OPTION A (Best Sync):
- Text: [${data.targetLang} adaptation]
- Sync Score: [1-10]
- Mouth Match: [which positions align well]
- Compromise: [what meaning/nuance was adjusted for sync]

OPTION B (Balanced):
- Text: [${data.targetLang} adaptation]
- Sync Score: [1-10]
- Mouth Match: [which positions align well]
- Compromise: [what was adjusted]

OPTION C (Best Meaning):
- Text: [${data.targetLang} adaptation]
- Sync Score: [1-10]
- Mouth Match: [which positions align well]
- Note: [why this preserves meaning better despite lower sync]

=== RECOMMENDATION ===
Best option per line with reasoning.

=== PRONUNCIATION GUIDE ===
Phonetic spelling for the recording artist for any tricky adapted words.`;
}

function buildQCSystem(data) {
  return `You are a senior Quality Control reviewer for Stage OTT dubbed content. Generate a comprehensive QC review template for ${data.language} dubbed content.

SHOW: ${data.showTitle}
EPISODE/SCENE: ${data.episodeInfo || "N/A"}
LANGUAGE: ${data.language}
QC TYPE: ${data.qcType}
SPECIFIC CONCERNS: ${data.notes || "None specified"}

OUTPUT FORMAT:

=== QC REVIEW REPORT ===
Title: ${data.showTitle}
Episode: ${data.episodeInfo || "N/A"}
Language: ${data.language}
QC Type: ${data.qcType}
Date: [Current Date]
Reviewer: ___________

${ data.qcType === "audio_sync" ? `
=== AUDIO SYNC CHECKLIST ===
For each scene/segment:
| Scene | Sync Rating (1-5) | Lip Match | Timing Gap | Action Required |
` : data.qcType === "cultural" ? `
=== CULTURAL REVIEW CHECKLIST ===
| Item | Status | Notes |
- Idioms properly localized
- Humor lands in ${data.language}
- Cultural references appropriate
- No offensive translations
- Regional sensitivities addressed
- Slang/dialect consistency
- Character names handling (kept/adapted)
` : data.qcType === "technical" ? `
=== TECHNICAL AUDIO CHECKLIST ===
| Check | Pass/Fail | Notes |
- Audio levels consistent (-24 LUFS target)
- No clipping/distortion
- Background noise clean
- Room tone matches across takes
- Breath sounds natural
- No mouth clicks/pops
- Stereo balance correct
- Format compliance (sample rate, bit depth)
` : data.qcType === "final_delivery" ? `
=== FINAL DELIVERY CHECKLIST ===
| Check | Pass/Fail | Notes |
- All cues recorded
- Audio syncs with video
- Levels within spec
- Format correct (WAV/AAC)
- Metadata tagged correctly
- No missing/empty segments
- Background music/SFX intact
- Credits audio correct
` : `
=== FULL QC CHECKLIST ===

1. SYNC & TIMING
| Cue# | Sync (1-5) | Issue | Fix Required |
- Overall lip sync accuracy
- Timing gaps/overlaps
- Scene transition smoothness

2. AUDIO QUALITY
| Check | Pass/Fail | Notes |
- Levels, noise, clarity, consistency

3. PERFORMANCE
| Character | Voice Match | Emotion | Consistency |
- Each character's voice quality
- Emotional accuracy
- Character consistency across scenes

4. TRANSLATION/ADAPTATION
| Check | Status | Notes |
- Meaning accuracy
- Cultural appropriateness
- Dialogue naturalness in ${data.language}
- Humor/tone preservation

5. TECHNICAL
| Check | Pass/Fail | Notes |
- Format compliance
- Metadata
- Deliverables complete
`}

=== ISSUE LOG ===
| # | Timecode | Severity (Critical/Major/Minor) | Description | Suggested Fix |

=== SUMMARY ===
- Total issues found
- Critical issues
- Overall quality rating (1-10)
- Approved / Needs Revision / Rejected
- Notes for re-recording`;
}

/* --- Shared UI components --- */
function StudioSelect({ label, value, onChange, options, darkMode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: darkMode ? "#a09080" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="clay-inner" style={{
        width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 600,
        color: darkMode ? "#e8e0d4" : "#3d3425",
        background: darkMode ? "linear-gradient(145deg, #231e14, #1c1810)" : "linear-gradient(145deg, #e8e0d4, #ddd5c9)",
        border: "none", outline: "none", cursor: "pointer", fontFamily: "'Inter','Segoe UI',sans-serif",
        borderRadius: "12px", appearance: "none", WebkitAppearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378350f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "32px"
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function StudioInput({ label, value, onChange, placeholder, darkMode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: darkMode ? "#a09080" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="clay-inner" style={{
        width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 600,
        color: darkMode ? "#e8e0d4" : "#3d3425",
        background: "transparent", border: "none", outline: "none",
        fontFamily: "'Inter','Segoe UI',sans-serif", boxSizing: "border-box"
      }} />
    </div>
  );
}

function StudioTextArea({ label, value, onChange, placeholder, rows = 3, darkMode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: darkMode ? "#a09080" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="clay-inner" style={{
        width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 600,
        color: darkMode ? "#e8e0d4" : "#3d3425",
        background: "transparent", border: "none", outline: "none", resize: "none",
        fontFamily: "'Inter','Segoe UI',sans-serif", lineHeight: 1.7, boxSizing: "border-box"
      }} />
    </div>
  );
}

function CopyBtn({ text, darkMode }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="clay-btn" style={{
      padding: "4px 10px", fontSize: "10px", fontWeight: 700, flexShrink: 0,
      color: copied ? "#16a34a" : (darkMode ? "#d4c8b0" : "#78350f")
    }}>
      {copied ? "\u2713" : "\uD83D\uDCCB"}
    </button>
  );
}

function downloadContent(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ========================================
   MAIN COMPONENT
======================================== */
export default function DubbingStudio({ darkMode, streamConvert }) {
  const [activeModule, setActiveModule] = useState("adapt");
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  // Module form states
  const [adaptData, setAdaptData] = useState({
    sourceScript: "", sourceLang: "hindi", targetLang: "bhojpuri",
    adaptationType: "cultural", contentType: "film"
  });
  const [voiceData, setVoiceData] = useState({
    characterName: "", characterDesc: "", sceneContext: "",
    language: "hindi", genre: "drama"
  });
  const [timingData, setTimingData] = useState({
    dialogueText: "", sourceLang: "hindi", targetLang: "bhojpuri",
    episodeInfo: "", format: "standard"
  });
  const [bibleData, setBibleData] = useState({
    showTitle: "", characters: "", language: "hindi",
    genre: "drama", episodes: ""
  });
  const [lipsyncData, setLipsyncData] = useState({
    originalLines: "", sourceLang: "hindi", targetLang: "bhojpuri",
    syncPriority: "moderate", mouthRef: "mixed"
  });
  const [qcData, setQCData] = useState({
    showTitle: "", episodeInfo: "", language: "hindi",
    qcType: "full", notes: ""
  });

  const generate = async () => {
    setIsGenerating(true);
    setError("");
    setOutput("");

    let system = "";
    let userMessage = "";

    try {
      switch (activeModule) {
        case "adapt":
          if (!adaptData.sourceScript.trim()) {
            setError("Please enter source script to adapt");
            setIsGenerating(false);
            return;
          }
          system = buildAdaptSystem(adaptData);
          userMessage = adaptData.sourceScript;
          break;

        case "voice":
          system = buildVoiceSystem(voiceData);
          userMessage = `Character: ${voiceData.characterName || "Main Character"}
Description: ${voiceData.characterDesc || "Not provided"}
Scene Context: ${voiceData.sceneContext || "General scenes"}
Language: ${voiceData.language}
Genre: ${voiceData.genre}`;
          break;

        case "timing":
          if (!timingData.dialogueText.trim()) {
            setError("Please enter dialogue lines");
            setIsGenerating(false);
            return;
          }
          system = buildTimingSystem(timingData);
          userMessage = timingData.dialogueText;
          break;

        case "bible":
          system = buildBibleSystem(bibleData);
          userMessage = `Show: ${bibleData.showTitle || "Untitled Show"}
Characters:
${bibleData.characters || "Please generate sample characters for this genre"}
Language: ${bibleData.language}
Genre: ${bibleData.genre}
Episodes: ${bibleData.episodes || "Season 1"}`;
          break;

        case "lipsync":
          if (!lipsyncData.originalLines.trim()) {
            setError("Please enter dialogue lines for lip-sync adaptation");
            setIsGenerating(false);
            return;
          }
          system = buildLipsyncSystem(lipsyncData);
          userMessage = lipsyncData.originalLines;
          break;

        case "qc":
          system = buildQCSystem(qcData);
          userMessage = `Show: ${qcData.showTitle || "Content"}
Episode: ${qcData.episodeInfo || "Not specified"}
Language: ${qcData.language}
QC Type: ${qcData.qcType}
Notes: ${qcData.notes || "Standard review"}`;
          break;

        default:
          break;
      }

      await streamConvert({
        model: "anthropic/claude-sonnet-4-5",
        system,
        messages: [{ role: "user", content: userMessage }],
        onChunk: (partial) => setOutput(partial),
      });
    } catch (err) {
      setError(err.message || "Generation failed");
    }

    setIsGenerating(false);
  };

  const handleDownload = () => {
    if (!output) return;
    downloadContent(output, `stage_dubbing_${activeModule}_${Date.now()}.txt`);
  };

  const dm = darkMode;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 22px 60px", position: "relative", zIndex: 1 }}>

      {/* Studio Header */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h2 style={{
          fontSize: "28px", fontWeight: 900, letterSpacing: "-1.5px",
          background: "linear-gradient(135deg, #8b5cf6, #ec4899, #8b5cf6)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", marginBottom: "6px"
        }}>Dubbing Studio</h2>
        <p style={{ fontSize: "12px", color: dm ? "#a09080" : "#92400e", fontWeight: 600 }}>
          AI-Powered Dubbing Workflow for Stage OTT
        </p>
      </div>

      {/* Module Tabs */}
      <div className="clay" style={{ padding: 0, marginBottom: "20px", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          {MODULES.map(m => {
            const active = activeModule === m.id;
            return (
              <button key={m.id} onClick={() => { setActiveModule(m.id); setOutput(""); setError(""); }} className="clay-btn" style={{
                padding: "10px 16px", fontSize: "12px", fontWeight: active ? 800 : 600,
                color: active ? "#8b5cf6" : (dm ? "#a09080" : "#6b5e50"),
                background: active ? (dm ? "linear-gradient(145deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))" : "linear-gradient(145deg, rgba(139,92,246,0.12), rgba(139,92,246,0.05))") : undefined,
                border: active ? "1.5px solid rgba(139,92,246,0.3)" : undefined,
                display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap"
              }}>
                <span style={{ fontSize: "14px" }}>{m.icon}</span>
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="dubbing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Input Panel */}
        <div className="clay" style={{ padding: "18px", overflow: "hidden" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 800, color: dm ? "#d4c8b0" : "#78350f", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>{MODULES.find(m => m.id === activeModule)?.icon}</span>
            {MODULES.find(m => m.id === activeModule)?.label}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

            {/* SCRIPT ADAPTATION */}
            {activeModule === "adapt" && (<>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Source Language" value={adaptData.sourceLang} onChange={v => setAdaptData({ ...adaptData, sourceLang: v })} options={LANGUAGES} darkMode={dm} />
                <StudioSelect label="Target Language" value={adaptData.targetLang} onChange={v => setAdaptData({ ...adaptData, targetLang: v })} options={LANGUAGES} darkMode={dm} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Adaptation Type" value={adaptData.adaptationType} onChange={v => setAdaptData({ ...adaptData, adaptationType: v })} options={[
                  { value: "literal", label: "Literal" }, { value: "cultural", label: "Cultural" },
                  { value: "creative", label: "Creative" }, { value: "lipsync", label: "Lip-sync Priority" }
                ]} darkMode={dm} />
                <StudioSelect label="Content Type" value={adaptData.contentType} onChange={v => setAdaptData({ ...adaptData, contentType: v })} options={[
                  { value: "film", label: "Film" }, { value: "webseries", label: "Web Series" },
                  { value: "documentary", label: "Documentary" }, { value: "reality", label: "Reality Show" },
                  { value: "animation", label: "Animation" }
                ]} darkMode={dm} />
              </div>
              <StudioTextArea label="Source Script *" value={adaptData.sourceScript} onChange={v => setAdaptData({ ...adaptData, sourceScript: v })} placeholder="" rows={6} darkMode={dm} />
            </>)}

            {/* VOICE DIRECTION */}
            {activeModule === "voice" && (<>
              <StudioInput label="Character Name" value={voiceData.characterName} onChange={v => setVoiceData({ ...voiceData, characterName: v })} placeholder="" darkMode={dm} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Language" value={voiceData.language} onChange={v => setVoiceData({ ...voiceData, language: v })} options={LANGUAGES} darkMode={dm} />
                <StudioSelect label="Genre" value={voiceData.genre} onChange={v => setVoiceData({ ...voiceData, genre: v })} options={GENRES} darkMode={dm} />
              </div>
              <StudioTextArea label="Character Description" value={voiceData.characterDesc} onChange={v => setVoiceData({ ...voiceData, characterDesc: v })} placeholder="" rows={3} darkMode={dm} />
              <StudioTextArea label="Scene Context" value={voiceData.sceneContext} onChange={v => setVoiceData({ ...voiceData, sceneContext: v })} placeholder="" rows={3} darkMode={dm} />
            </>)}

            {/* TIMING SHEET */}
            {activeModule === "timing" && (<>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Source Language" value={timingData.sourceLang} onChange={v => setTimingData({ ...timingData, sourceLang: v })} options={LANGUAGES} darkMode={dm} />
                <StudioSelect label="Target Language" value={timingData.targetLang} onChange={v => setTimingData({ ...timingData, targetLang: v })} options={LANGUAGES} darkMode={dm} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioInput label="Episode/Scene Info" value={timingData.episodeInfo} onChange={v => setTimingData({ ...timingData, episodeInfo: v })} placeholder="" darkMode={dm} />
                <StudioSelect label="Sheet Format" value={timingData.format} onChange={v => setTimingData({ ...timingData, format: v })} options={[
                  { value: "standard", label: "Standard Cue Sheet" }, { value: "adr", label: "ADR Sheet" },
                  { value: "loop", label: "Loop Sheet" }
                ]} darkMode={dm} />
              </div>
              <StudioTextArea label="Dialogue Lines *" value={timingData.dialogueText} onChange={v => setTimingData({ ...timingData, dialogueText: v })} placeholder="" rows={6} darkMode={dm} />
            </>)}

            {/* VOICE BIBLE */}
            {activeModule === "bible" && (<>
              <StudioInput label="Show/Movie Title" value={bibleData.showTitle} onChange={v => setBibleData({ ...bibleData, showTitle: v })} placeholder="" darkMode={dm} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Language" value={bibleData.language} onChange={v => setBibleData({ ...bibleData, language: v })} options={LANGUAGES} darkMode={dm} />
                <StudioSelect label="Genre" value={bibleData.genre} onChange={v => setBibleData({ ...bibleData, genre: v })} options={GENRES} darkMode={dm} />
              </div>
              <StudioInput label="Episodes" value={bibleData.episodes} onChange={v => setBibleData({ ...bibleData, episodes: v })} placeholder="" darkMode={dm} />
              <StudioTextArea label="Characters" value={bibleData.characters} onChange={v => setBibleData({ ...bibleData, characters: v })} placeholder="" rows={4} darkMode={dm} />
            </>)}

            {/* LIP-SYNC ADAPTER */}
            {activeModule === "lipsync" && (<>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Source Language" value={lipsyncData.sourceLang} onChange={v => setLipsyncData({ ...lipsyncData, sourceLang: v })} options={LANGUAGES} darkMode={dm} />
                <StudioSelect label="Target Language" value={lipsyncData.targetLang} onChange={v => setLipsyncData({ ...lipsyncData, targetLang: v })} options={LANGUAGES} darkMode={dm} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioSelect label="Sync Priority" value={lipsyncData.syncPriority} onChange={v => setLipsyncData({ ...lipsyncData, syncPriority: v })} options={[
                  { value: "strict", label: "Strict (every syllable)" }, { value: "moderate", label: "Moderate (key positions)" },
                  { value: "loose", label: "Loose (natural flow)" }
                ]} darkMode={dm} />
                <StudioSelect label="Mouth Focus" value={lipsyncData.mouthRef} onChange={v => setLipsyncData({ ...lipsyncData, mouthRef: v })} options={[
                  { value: "wide_open", label: "Wide Open Vowels" }, { value: "bilabial", label: "Bilabial Focus" },
                  { value: "nasal", label: "Nasal Sounds" }, { value: "mixed", label: "Mixed" }
                ]} darkMode={dm} />
              </div>
              <StudioTextArea label="Original Dialogue Lines *" value={lipsyncData.originalLines} onChange={v => setLipsyncData({ ...lipsyncData, originalLines: v })} placeholder="" rows={4} darkMode={dm} />
            </>)}

            {/* QC REVIEW */}
            {activeModule === "qc" && (<>
              <StudioInput label="Show/Movie Title" value={qcData.showTitle} onChange={v => setQCData({ ...qcData, showTitle: v })} placeholder="" darkMode={dm} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <StudioInput label="Episode/Scene" value={qcData.episodeInfo} onChange={v => setQCData({ ...qcData, episodeInfo: v })} placeholder="" darkMode={dm} />
                <StudioSelect label="Language" value={qcData.language} onChange={v => setQCData({ ...qcData, language: v })} options={LANGUAGES} darkMode={dm} />
              </div>
              <StudioSelect label="QC Type" value={qcData.qcType} onChange={v => setQCData({ ...qcData, qcType: v })} options={[
                { value: "full", label: "Full QC Review" }, { value: "audio_sync", label: "Audio Sync Only" },
                { value: "cultural", label: "Cultural Review" }, { value: "technical", label: "Technical Audio" },
                { value: "final_delivery", label: "Final Delivery Check" }
              ]} darkMode={dm} />
              <StudioTextArea label="Specific Concerns" value={qcData.notes} onChange={v => setQCData({ ...qcData, notes: v })} placeholder="" rows={3} darkMode={dm} />
            </>)}

            {/* Generate Button */}
            <button onClick={generate} disabled={isGenerating} className="clay-btn-primary" style={{
              width: "100%", padding: "13px", borderRadius: "14px", border: "none",
              cursor: isGenerating ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "4px"
            }}>
              {isGenerating ? (
                <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Generating...</>
              ) : (
                <>{"\u26A1"} Generate {MODULES.find(m => m.id === activeModule)?.label}</>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="clay" style={{ padding: "18px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 800, color: dm ? "#d4c8b0" : "#78350f", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px" }}>{"\uD83D\uDCE4"}</span> Output
              {isGenerating && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#8b5cf6", display: "inline-block", animation: "pulse 1s ease-in-out infinite" }} />}
            </h3>
            {output && !isGenerating && (
              <div style={{ display: "flex", gap: "8px" }}>
                <CopyBtn text={output} darkMode={dm} />
                <button onClick={handleDownload} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: "#16a34a" }}>
                  {"\u2B07"} Download
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="clay-inner" style={{ padding: "12px 14px", marginBottom: "12px", color: "#dc2626", fontSize: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
              <span>{"\u26A0"}</span> {error}
            </div>
          )}

          <div className="clay-inner" style={{
            flex: 1, minHeight: "300px", maxHeight: "500px", overflowY: "auto",
            padding: "16px", fontSize: "13px", lineHeight: 1.9,
            color: dm ? "#e8e0d4" : "#3d3425", whiteSpace: "pre-wrap"
          }}>
            {output ? (
              <>
                {output}
                {isGenerating && <span style={{ display: "inline-block", width: "2px", height: "16px", background: "#8b5cf6", marginLeft: "2px", verticalAlign: "text-bottom", animation: "pulse 0.8s ease-in-out infinite" }} />}
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: dm ? "#6b5e50" : "#a08060", fontSize: "13px", fontWeight: 600, textAlign: "center" }}>
                {isGenerating ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "14px" }}>
                      {[0, 1, 2].map(i => <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", animation: `pulse 1.3s ${i * 0.22}s ease-in-out infinite` }} />)}
                    </div>
                    Generating dubbing content...
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "32px", marginBottom: "12px" }}>{MODULES.find(m => m.id === activeModule)?.icon}</div>
                    Fill the form and click Generate
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Responsive override for mobile */}
      <style>{`
        @media(max-width:700px){
          .dubbing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
