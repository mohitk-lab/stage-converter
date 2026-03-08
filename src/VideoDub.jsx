import { useState, useRef, useCallback, useEffect } from "react";
import { upload } from "@vercel/blob/client";

/* --- Constants --- */
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
];

const STEPS = [
  { id: 1, label: "Upload Video", icon: "\uD83C\uDFA5" },
  { id: 2, label: "Extract Audio", icon: "\uD83C\uDFB5" },
  { id: 3, label: "Separate Stems", icon: "\uD83C\uDFA4" },
  { id: 4, label: "Transcribe", icon: "\uD83D\uDCDD" },
  { id: 5, label: "Translate", icon: "\uD83C\uDF10" },
  { id: 6, label: "Dub Voice", icon: "\uD83D\uDDE3\uFE0F" },
  { id: 7, label: "Final Mix", icon: "\uD83C\uDFAC" },
];

/* --- Shared UI --- */
function StudioSelect({ label, value, onChange, options, darkMode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: darkMode ? "#b0a090" : "#92400e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="clay-inner" style={{
        width: "100%", padding: "10px 12px", fontSize: "13px", fontWeight: 600,
        color: darkMode ? "#e8e0d4" : "#3d3425",
        background: darkMode ? "linear-gradient(145deg, #0d0d0d, #080808)" : "linear-gradient(145deg, #e8e0d4, #ddd5c9)",
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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadText(content, filename) {
  downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), filename);
}

/* --- Step Card wrapper --- */
function StepCard({ step, currentStep, label, icon, darkMode, error, children }) {
  const isActive = currentStep >= step;
  const isCurrent = currentStep === step;
  const dm = darkMode;

  return (
    <div className="clay" style={{
      padding: "18px 20px",
      opacity: isActive ? 1 : 0.45,
      border: isCurrent ? "1.5px solid rgba(245,158,11,0.35)" : "1.5px solid transparent",
      transition: "all 0.3s ease",
      pointerEvents: isActive ? "auto" : "none",
      gridColumn: isCurrent ? "1 / -1" : undefined,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: isActive ? "12px" : "0" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "26px", height: "26px", borderRadius: "50%", fontSize: "11px", fontWeight: 800,
          background: isCurrent ? "linear-gradient(135deg, #f59e0b, #d97706)" : (dm ? "#111111" : "#e8e0d4"),
          color: isCurrent ? "#fff" : (dm ? "#b0a090" : "#78350f"),
        }}>{step}</span>
        <span style={{ fontSize: "14px" }}>{icon}</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: dm ? "#e8e0d4" : "#3d3425" }}>{label}</span>
        {currentStep > step && <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700, marginLeft: "auto" }}>Done</span>}
      </div>
      {isActive && children}
      {error && (
        <div className="clay-inner" style={{ padding: "8px 12px", marginTop: "8px", color: "#dc2626", fontSize: "11px", fontWeight: 600 }}>
          {error}
        </div>
      )}
    </div>
  );
}

/* --- Audio/Video Preview --- */
function MediaPreview({ url, type, blob, filename, darkMode }) {
  if (!url) return null;
  const dm = darkMode;
  return (
    <div style={{ marginTop: "8px" }}>
      {type === "video" ? (
        <video src={url} controls style={{ width: "100%", borderRadius: "10px", maxHeight: "220px" }} />
      ) : (
        <audio src={url} controls style={{ width: "100%", height: "36px" }} />
      )}
      {blob && (
        <button onClick={() => downloadBlob(blob, filename)} className="clay-btn" style={{
          marginTop: "6px", padding: "5px 12px", fontSize: "10px", fontWeight: 700,
          color: dm ? "#d4c8b0" : "#78350f", display: "inline-flex", alignItems: "center", gap: "4px"
        }}>
          Download {filename}
        </button>
      )}
    </div>
  );
}

/* --- Progress Bar --- */
function ProgressBar({ progress, label, darkMode }) {
  return (
    <div style={{ marginTop: "8px" }}>
      {label && <div style={{ fontSize: "10px", fontWeight: 700, color: darkMode ? "#b0a090" : "#92400e", marginBottom: "4px" }}>{label}</div>}
      <div className="clay-inner" style={{ height: "8px", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: "4px", width: `${progress}%`,
          background: "linear-gradient(90deg, #f59e0b, #d97706)",
          transition: "width 0.3s ease"
        }} />
      </div>
    </div>
  );
}

/* --- Action Button --- */
function ActionBtn({ onClick, disabled, loading, label, loadingLabel, darkMode }) {
  return (
    <button onClick={onClick} disabled={disabled || loading} className="clay-btn-primary" style={{
      width: "100%", padding: "11px", borderRadius: "12px", border: "none",
      cursor: disabled || loading ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 800,
      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
      opacity: disabled ? 0.5 : 1,
    }}>
      {loading ? (
        <><span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> {loadingLabel || "Processing..."}</>
      ) : label}
    </button>
  );
}

/* --- Translation System Prompt --- */
function buildDubTranslateSystem(sourceLang, targetLang) {
  return `You are an expert dubbing translator for Stage, a regional Indian OTT platform.

TASK: Translate the following transcription from ${sourceLang} to ${targetLang} for professional voice dubbing.

RULES:
1. Preserve the character's voice, tone, pace, and emotional energy exactly
2. Match approximate syllable count per line for lip-sync compatibility
3. Maintain dramatic timing — pauses, emphasis, builds
4. Adapt cultural references naturally for the target audience (don't just transliterate)
5. Keep proper nouns (character names, place names) as-is unless they have standard translations
6. If the source has multiple speakers/characters, clearly label each speaker's lines
7. Output format: One line per segment, maintaining the original segment structure
8. Add brief tone/emotion notes in [brackets] where the delivery style is important
9. Keep slang and colloquial energy — don't make it formal unless the original is formal

OUTPUT ONLY THE TRANSLATED LINES. No explanations or meta-commentary.`;
}

/* ========================================
   MAIN COMPONENT
======================================== */
export default function VideoDub({ darkMode, streamConvert }) {
  const dm = darkMode;
  const ffmpegRef = useRef(null);
  const ffmpegLoadedRef = useRef(false);
  const urlsRef = useRef([]);

  const createObjectURL = (blob) => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.push(url);
    return url;
  };

  // Pipeline state
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});

  // Step 1: Upload
  const [videoFile, setVideoFile] = useState(null);
  const [videoLocalUrl, setVideoLocalUrl] = useState(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Step 2: Extract Audio
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [extracting, setExtracting] = useState(false);

  // Step 3: Stem Separation
  const [vocalsBlob, setVocalsBlob] = useState(null);
  const [vocalsUrl, setVocalsUrl] = useState(null);
  const [musicBlob, setMusicBlob] = useState(null);
  const [musicUrl, setMusicUrl] = useState(null);
  const [separating, setSeparating] = useState(false);
  const [separateStatus, setSeparateStatus] = useState(null);

  // Cached vocals upload URL (reused across steps)
  const [vocalsUploadUrl, setVocalsUploadUrl] = useState(null);

  // Step 4: Transcription
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [transcribing, setTranscribing] = useState(false);

  // Step 5: Translation
  const [targetLanguage, setTargetLanguage] = useState("hindi");
  const [translatedText, setTranslatedText] = useState("");
  const [translating, setTranslating] = useState(false);

  // Step 6: Voice Clone + TTS
  const [clonedVoiceId, setClonedVoiceId] = useState(null);
  const [dubbedAudioBlob, setDubbedAudioBlob] = useState(null);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [ttsProgress, setTtsProgress] = useState("");

  // Step 7: Final Mix
  const [finalAudioBlob, setFinalAudioBlob] = useState(null);
  const [finalAudioUrl, setFinalAudioUrl] = useState(null);
  const [mixing, setMixing] = useState(false);

  const setError = (step, msg) => setErrors(prev => ({ ...prev, [step]: msg }));
  const clearError = (step) => setErrors(prev => { const n = { ...prev }; delete n[step]; return n; });

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      urlsRef.current.forEach(u => URL.revokeObjectURL(u));
      urlsRef.current = [];
    };
  }, []);

  /* --- FFmpeg loader --- */
  const loadFFmpeg = useCallback(async () => {
    if (ffmpegLoadedRef.current) return ffmpegRef.current;
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    const ffmpeg = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegRef.current = ffmpeg;
    ffmpegLoadedRef.current = true;
    return ffmpeg;
  }, []);

  /* --- Step 1: Upload Video --- */
  const handleVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) {
      setError(1, "File size 500MB se zyada hai. Chhoti file use karo.");
      return;
    }
    clearError(1);
    setVideoFile(file);
    setVideoLocalUrl(createObjectURL(file));
    setUploading(true);
    setUploadProgress(0);

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload-url",
        onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(percentage)),
      });
      setVideoBlobUrl(blob.url);
      setUploadProgress(100);
      setCurrentStep(2);
    } catch (err) {
      const msg = err.message || "Upload failed. Try again.";
      setError(1, msg.includes("token") ? "Blob storage not configured. Admin ko BLOB_READ_WRITE_TOKEN set karne bolo." : msg);
    }
    setUploading(false);
  };

  /* --- Step 2: Extract Audio --- */
  const extractAudio = async () => {
    clearError(2);
    setExtracting(true);
    try {
      const ffmpeg = await loadFFmpeg();
      const { fetchFile } = await import("@ffmpeg/util");
      await ffmpeg.writeFile("input.mp4", await fetchFile(videoFile));
      await ffmpeg.exec(["-i", "input.mp4", "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "1", "output.wav"]);
      const data = await ffmpeg.readFile("output.wav");
      const blob = new Blob([data.buffer], { type: "audio/wav" });
      setAudioBlob(blob);
      setAudioUrl(createObjectURL(blob));
      await ffmpeg.deleteFile("input.mp4");
      await ffmpeg.deleteFile("output.wav");
      setCurrentStep(3);
    } catch (err) {
      setError(2, "Audio extraction fail hua. Different format try karo.");
    }
    setExtracting(false);
  };

  /* --- Step 3: Stem Separation --- */
  const separateStems = async () => {
    clearError(3);
    setSeparating(true);
    setSeparateStatus("Uploading audio...");
    try {
      // Upload audio blob to Vercel Blob
      const audioBlobUpload = await upload("extracted_audio.wav", audioBlob, {
        access: "public",
        handleUploadUrl: "/api/upload-url",
      });

      setSeparateStatus("Starting stem separation...");
      // Start Replicate job
      const startResp = await fetch("/api/stem-separate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: audioBlobUpload.url }),
      });
      if (!startResp.ok) {
        const errData = await startResp.json().catch(() => ({}));
        throw new Error(errData.error || `Stem separation start fail hua (${startResp.status})`);
      }
      const { predictionId } = await startResp.json();

      // Poll for completion
      setSeparateStatus("Processing stems (1-5 min lag sakta hai)...");
      let attempts = 0;
      const maxAttempts = 200; // ~10 minutes at 3s intervals
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3000));
        const statusResp = await fetch(`/api/stem-status?id=${predictionId}`);
        const statusData = await statusResp.json();

        if (statusData.status === "succeeded" && statusData.output) {
          const output = statusData.output;
          console.log("[StemSeparation] Replicate output:", JSON.stringify(output));

          // Handle all known Demucs output formats:
          // 1. String URL (single output)
          // 2. Object with named keys: {vocals, drums, bass, other} or {vocals, accompaniment/no_vocals}
          // 3. Array: [vocals_url, accompaniment_url, ...]
          let vocalsSrc = null;
          let musicSrc = null;

          if (typeof output === "string") {
            vocalsSrc = output;
          } else if (Array.isArray(output)) {
            vocalsSrc = output[0];
            musicSrc = output[1] || null;
          } else if (output && typeof output === "object") {
            vocalsSrc = output.vocals || null;
            // For accompaniment: try direct key, then fallback to "no_vocals" or "other"
            musicSrc = output.accompaniment || output.no_vocals || output.other || null;
            // If model returns individual stems (drums/bass/other) but no combined accompaniment,
            // pick any non-vocal stem so user at least gets background music
            if (!musicSrc) {
              const nonVocalKey = Object.keys(output).find(k => k !== "vocals" && output[k]);
              if (nonVocalKey) musicSrc = output[nonVocalKey];
            }
          }

          if (!vocalsSrc) throw new Error("No vocals track found in output. Raw: " + JSON.stringify(output));

          const vocalsResp = await fetch(vocalsSrc);
          if (!vocalsResp.ok) throw new Error("Failed to download vocals track");
          const vBlob = new Blob([await vocalsResp.arrayBuffer()], { type: "audio/wav" });
          setVocalsBlob(vBlob);
          setVocalsUrl(createObjectURL(vBlob));

          if (musicSrc) {
            const musicResp = await fetch(musicSrc);
            if (!musicResp.ok) throw new Error("Failed to download music track");
            const mBlob = new Blob([await musicResp.arrayBuffer()], { type: "audio/wav" });
            setMusicBlob(mBlob);
            setMusicUrl(createObjectURL(mBlob));
          }

          setSeparateStatus(null);
          setCurrentStep(4);
          setSeparating(false);
          return;
        }
        if (statusData.status === "failed") {
          throw new Error(statusData.error || "Stem separation failed");
        }
        attempts++;
        setSeparateStatus(`Processing... (${Math.round(attempts * 3 / 60)}m elapsed)`);
      }
      throw new Error("Stem separation timeout. Please try again.");
    } catch (err) {
      setError(3, err.message || "Stem separation fail hua");
      setSeparateStatus(null);
    }
    setSeparating(false);
  };

  /* --- Step 4: Transcribe --- */
  const transcribe = async () => {
    clearError(4);
    setTranscribing(true);
    try {
      // Upload vocals for transcription (cache URL for reuse in voice cloning)
      let uploadUrl = vocalsUploadUrl;
      if (!uploadUrl) {
        const vocalsUpload = await upload("vocals.wav", vocalsBlob, {
          access: "public",
          handleUploadUrl: "/api/upload-url",
        });
        uploadUrl = vocalsUpload.url;
        setVocalsUploadUrl(uploadUrl);
      }

      const resp = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: uploadUrl }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Transcription failed");
      }
      const data = await resp.json();
      setDetectedLanguage(data.language);
      setTranscription(data);
      setCurrentStep(5);
    } catch (err) {
      setError(4, err.message || "Transcription fail hua");
    }
    setTranscribing(false);
  };

  /* --- Step 5: Translate --- */
  const translate = async () => {
    clearError(5);
    setTranslating(true);
    setTranslatedText("");
    try {
      const system = buildDubTranslateSystem(
        detectedLanguage || "auto-detected",
        targetLanguage
      );
      const userMessage = `SOURCE LANGUAGE: ${detectedLanguage || "auto-detected"}
TARGET LANGUAGE: ${targetLanguage}

=== TRANSCRIPTION ===
${transcription.text}

=== SEGMENTS WITH TIMESTAMPS ===
${(transcription.segments || []).map(s => `[${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s] ${s.text}`).join("\n")}`;

      await streamConvert({
        model: "anthropic/claude-sonnet-4-5",
        system,
        messages: [{ role: "user", content: userMessage }],
        onChunk: (partial) => setTranslatedText(partial),
      });
      setCurrentStep(6);
    } catch (err) {
      setError(5, err.message || "Translation fail hua");
    }
    setTranslating(false);
  };

  /* --- Step 6: Voice Clone + TTS --- */
  const generateDubbedAudio = async () => {
    clearError(6);
    setGenerating(true);
    setTtsProgress("Voice cloning...");
    try {
      // Reuse cached vocals URL or upload if not available
      let uploadUrl = vocalsUploadUrl;
      if (!uploadUrl) {
        const vocalsUpload = await upload("vocals_clone.wav", vocalsBlob, {
          access: "public",
          handleUploadUrl: "/api/upload-url",
        });
        uploadUrl = vocalsUpload.url;
        setVocalsUploadUrl(uploadUrl);
      }

      // Clone voice
      const cloneResp = await fetch("/api/clone-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: uploadUrl, name: `dub_${Date.now()}` }),
      });
      if (!cloneResp.ok) {
        const err = await cloneResp.json();
        throw new Error(err.error || "Voice clone fail hua");
      }
      const { voice_id } = await cloneResp.json();
      setClonedVoiceId(voice_id);

      // Generate TTS with cloned voice — split into paragraphs for better quality
      setTtsProgress("Generating dubbed audio...");
      const segments = translatedText.split("\n").filter(l => l.trim());
      const audioChunks = [];

      for (let i = 0; i < segments.length; i++) {
        setTtsProgress(`Generating segment ${i + 1}/${segments.length}...`);
        const ttsResp = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: segments[i],
            voice_id: voice_id,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.6, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true },
            speed: 1.0,
          }),
        });
        if (!ttsResp.ok) throw new Error(`TTS segment ${i + 1} fail hua`);
        audioChunks.push(await ttsResp.arrayBuffer());
      }

      // Concatenate audio chunks using FFmpeg for proper MP3 merging
      const ffmpeg = await loadFFmpeg();
      const { fetchFile } = await import("@ffmpeg/util");
      const concatList = [];
      for (let j = 0; j < audioChunks.length; j++) {
        const name = `seg_${j}.mp3`;
        await ffmpeg.writeFile(name, new Uint8Array(audioChunks[j]));
        concatList.push(`file '${name}'`);
      }
      await ffmpeg.writeFile("concat_list.txt", new TextEncoder().encode(concatList.join("\n")));
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat_list.txt", "-c", "copy", "dubbed_out.mp3"]);
      const dubbedData = await ffmpeg.readFile("dubbed_out.mp3");
      // Cleanup temp files
      for (let j = 0; j < audioChunks.length; j++) {
        try { await ffmpeg.deleteFile(`seg_${j}.mp3`); } catch {}
      }
      try { await ffmpeg.deleteFile("concat_list.txt"); } catch {}
      try { await ffmpeg.deleteFile("dubbed_out.mp3"); } catch {}

      const dubbedBlob = new Blob([dubbedData.buffer], { type: "audio/mpeg" });
      setDubbedAudioBlob(dubbedBlob);
      setDubbedAudioUrl(createObjectURL(dubbedBlob));
      setTtsProgress("");
      setCurrentStep(7);
    } catch (err) {
      setError(6, err.message || "Voice generation fail hua");
      setTtsProgress("");
    }
    setGenerating(false);
  };

  /* --- Step 7: Final Mix --- */
  const mixFinal = async () => {
    clearError(7);
    setMixing(true);
    try {
      const ffmpeg = await loadFFmpeg();
      const { fetchFile } = await import("@ffmpeg/util");

      // Write music and dubbed audio
      if (musicBlob) {
        await ffmpeg.writeFile("music.wav", await fetchFile(musicBlob));
      }
      await ffmpeg.writeFile("dubbed.mp3", await fetchFile(dubbedAudioBlob));

      if (musicBlob) {
        // Mix music + dubbed vocals
        await ffmpeg.exec([
          "-i", "music.wav", "-i", "dubbed.mp3",
          "-filter_complex", "amix=inputs=2:duration=longest:dropout_transition=2",
          "-ac", "2", "-b:a", "192k", "final.mp3"
        ]);
      } else {
        // No music stem, just use dubbed audio as final
        await ffmpeg.exec(["-i", "dubbed.mp3", "-b:a", "192k", "final.mp3"]);
      }

      const data = await ffmpeg.readFile("final.mp3");
      const blob = new Blob([data.buffer], { type: "audio/mpeg" });
      setFinalAudioBlob(blob);
      setFinalAudioUrl(createObjectURL(blob));

      // Cleanup ffmpeg files
      try { await ffmpeg.deleteFile("music.wav"); } catch {}
      try { await ffmpeg.deleteFile("dubbed.mp3"); } catch {}
      try { await ffmpeg.deleteFile("final.mp3"); } catch {}
    } catch (err) {
      setError(7, "Final mix fail hua. Try again.");
    }
    setMixing(false);
  };

  /* --- Reset --- */
  const resetPipeline = () => {
    urlsRef.current.forEach(u => URL.revokeObjectURL(u));
    urlsRef.current = [];
    setCurrentStep(1);
    setErrors({});
    setVideoFile(null); setVideoLocalUrl(null); setVideoBlobUrl(null); setUploading(false); setUploadProgress(0);
    setAudioBlob(null); setAudioUrl(null); setExtracting(false);
    setVocalsBlob(null); setVocalsUrl(null); setMusicBlob(null); setMusicUrl(null); setSeparating(false); setSeparateStatus(null);
    setVocalsUploadUrl(null);
    setDetectedLanguage(null); setTranscription(null); setTranscribing(false);
    setTargetLanguage("hindi"); setTranslatedText(""); setTranslating(false);
    setClonedVoiceId(null); setDubbedAudioBlob(null); setDubbedAudioUrl(null); setGenerating(false); setTtsProgress("");
    setFinalAudioBlob(null); setFinalAudioUrl(null); setMixing(false);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 22px 60px", position: "relative", zIndex: 1 }}>

      {/* Header */}
      <div className="clay" style={{ padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>{"\uD83C\uDFA5"}</span>
          <span style={{ fontSize: "14px", fontWeight: 800, color: dm ? "#e8e0d4" : "#3d3425" }}>Video Dub</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Step indicators */}
          {STEPS.map(s => (
            <span key={s.id} style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: currentStep > s.id ? "#16a34a" : (currentStep === s.id ? "#f59e0b" : (dm ? "#333333" : "#d5cdc1")),
              transition: "background 0.3s"
            }} title={s.label} />
          ))}
          {currentStep > 1 && (
            <button onClick={resetPipeline} className="clay-btn" style={{
              padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: "#dc2626", marginLeft: "8px"
            }}>Reset</button>
          )}
        </div>
      </div>

      {/* Steps Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

      {/* Step 1: Upload Video */}
      <StepCard step={1} currentStep={currentStep} label="Upload Video" icon={"\uD83C\uDFA5"} darkMode={dm} error={errors[1]}>
        {!videoFile ? (
          <label className="clay-inner" style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "32px 16px", cursor: "pointer", borderRadius: "14px",
            border: "2px dashed rgba(245,158,11,0.3)", textAlign: "center",
          }}>
            <span style={{ fontSize: "28px", marginBottom: "8px" }}>{"\uD83C\uDFA5"}</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: dm ? "#d4c8b0" : "#78350f" }}>
              Video select karo (500MB tak)
            </span>
            <span style={{ fontSize: "10px", color: dm ? "#807060" : "#a08060", marginTop: "4px" }}>
              MP4, WebM, MOV, AVI, MKV
            </span>
            <input type="file" accept="video/*" onChange={handleVideoSelect} style={{ display: "none" }} />
          </label>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: dm ? "#e8e0d4" : "#3d3425" }}>{videoFile.name}</span>
              <span style={{ fontSize: "10px", color: dm ? "#807060" : "#a08060" }}>
                ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
              </span>
            </div>
            {uploading && <ProgressBar progress={uploadProgress} label={`Uploading... ${uploadProgress}%`} darkMode={dm} />}
            <MediaPreview url={videoLocalUrl} type="video" blob={videoFile} filename={videoFile.name} darkMode={dm} />
          </div>
        )}
      </StepCard>

      {/* Step 2: Extract Audio */}
      <StepCard step={2} currentStep={currentStep} label="Extract Audio" icon={"\uD83C\uDFB5"} darkMode={dm} error={errors[2]}>
        {!audioBlob ? (
          <ActionBtn onClick={extractAudio} loading={extracting} label="Extract Audio from Video" loadingLabel="Extracting audio..." darkMode={dm} />
        ) : (
          <MediaPreview url={audioUrl} type="audio" blob={audioBlob} filename="extracted_audio.wav" darkMode={dm} />
        )}
      </StepCard>

      {/* Step 3: Separate Stems */}
      <StepCard step={3} currentStep={currentStep} label="Separate Stems" icon={"\uD83C\uDFA4"} darkMode={dm} error={errors[3]}>
        {!vocalsBlob ? (
          <>
            <ActionBtn onClick={separateStems} loading={separating} label="Separate Vocals & Music" loadingLabel={separateStatus || "Processing..."} darkMode={dm} />
            {separating && separateStatus && (
              <div style={{ marginTop: "8px", fontSize: "10px", fontWeight: 600, color: dm ? "#b0a090" : "#6b5e50", textAlign: "center" }}>
                {separateStatus}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: dm ? "#b0a090" : "#92400e", marginBottom: "4px", textTransform: "uppercase" }}>Vocals</div>
              <MediaPreview url={vocalsUrl} type="audio" blob={vocalsBlob} filename="vocals.wav" darkMode={dm} />
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: dm ? "#b0a090" : "#92400e", marginBottom: "4px", textTransform: "uppercase" }}>Music</div>
              {musicBlob ? (
                <MediaPreview url={musicUrl} type="audio" blob={musicBlob} filename="music.wav" darkMode={dm} />
              ) : (
                <div style={{ fontSize: "10px", color: dm ? "#807060" : "#a08060", padding: "8px" }}>No music stem found</div>
              )}
            </div>
          </div>
        )}
      </StepCard>

      {/* Step 4: Transcribe */}
      <StepCard step={4} currentStep={currentStep} label="Transcribe" icon={"\uD83D\uDCDD"} darkMode={dm} error={errors[4]}>
        {!transcription ? (
          <ActionBtn onClick={transcribe} loading={transcribing} label="Transcribe (Auto-Detect Language)" loadingLabel="Transcribing..." darkMode={dm} />
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: dm ? "#b0a090" : "#92400e", textTransform: "uppercase" }}>Detected Language:</span>
              <span className="clay-inner" style={{ padding: "3px 10px", fontSize: "11px", fontWeight: 700, color: "#f59e0b", borderRadius: "8px" }}>
                {detectedLanguage || "Unknown"}
              </span>
              {transcription.duration && (
                <span style={{ fontSize: "10px", color: dm ? "#807060" : "#a08060" }}>
                  ({Math.round(transcription.duration)}s)
                </span>
              )}
            </div>
            <div className="clay-inner" style={{
              padding: "10px 12px", maxHeight: "200px", overflowY: "auto",
              fontSize: "12px", fontWeight: 500, lineHeight: 1.7,
              color: dm ? "#e8e0d4" : "#3d3425", whiteSpace: "pre-wrap"
            }}>
              {transcription.text}
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <CopyBtn text={transcription.text} darkMode={dm} />
              <button onClick={() => downloadText(transcription.text, "transcription.txt")} className="clay-btn" style={{
                padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: dm ? "#d4c8b0" : "#78350f"
              }}>Download .txt</button>
              <button onClick={() => {
                const srt = (transcription.segments || []).map((s, i) => {
                  const fmt = (t) => {
                    const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60); const sec = Math.floor(t % 60); const ms = Math.round((t % 1) * 1000);
                    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
                  };
                  return `${i + 1}\n${fmt(s.start)} --> ${fmt(s.end)}\n${s.text}\n`;
                }).join("\n");
                downloadText(srt, "transcription.srt");
              }} className="clay-btn" style={{
                padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: dm ? "#d4c8b0" : "#78350f"
              }}>Download .srt</button>
            </div>
          </div>
        )}
      </StepCard>

      {/* Step 5: Translate */}
      <StepCard step={5} currentStep={currentStep} label="Translate" icon={"\uD83C\uDF10"} darkMode={dm} error={errors[5]}>
        <div style={{ marginBottom: "10px" }}>
          <StudioSelect label="Target Language" value={targetLanguage} onChange={setTargetLanguage} options={LANGUAGES} darkMode={dm} />
        </div>
        {!translatedText && !translating ? (
          <ActionBtn onClick={translate} label="Translate" loadingLabel="Translating..." loading={false} darkMode={dm} />
        ) : (
          <>
            {translating && <ActionBtn disabled loading={true} label="" loadingLabel="Translating..." darkMode={dm} />}
            {translatedText && (
              <div>
                <div className="clay-inner" style={{
                  padding: "10px 12px", maxHeight: "200px", overflowY: "auto",
                  fontSize: "12px", fontWeight: 500, lineHeight: 1.7,
                  color: dm ? "#e8e0d4" : "#3d3425", whiteSpace: "pre-wrap"
                }}>
                  {translatedText}
                  {translating && <span style={{ display: "inline-block", width: "6px", height: "14px", background: "#f59e0b", marginLeft: "2px", animation: "blink 0.8s infinite", verticalAlign: "text-bottom" }} />}
                </div>
                {!translating && (
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                    <CopyBtn text={translatedText} darkMode={dm} />
                    <button onClick={() => downloadText(translatedText, `translated_${targetLanguage}.txt`)} className="clay-btn" style={{
                      padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: dm ? "#d4c8b0" : "#78350f"
                    }}>Download .txt</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </StepCard>

      {/* Step 6: Voice Clone + TTS */}
      <StepCard step={6} currentStep={currentStep} label="Dub Voice" icon={"\uD83D\uDDE3\uFE0F"} darkMode={dm} error={errors[6]}>
        {!dubbedAudioBlob ? (
          <>
            <ActionBtn onClick={generateDubbedAudio} loading={generating} label="Clone Voice & Generate Dub" loadingLabel={ttsProgress || "Processing..."} darkMode={dm} />
            {generating && ttsProgress && (
              <div style={{ marginTop: "6px", fontSize: "10px", fontWeight: 600, color: dm ? "#b0a090" : "#6b5e50", textAlign: "center" }}>
                {ttsProgress}
              </div>
            )}
          </>
        ) : (
          <MediaPreview url={dubbedAudioUrl} type="audio" blob={dubbedAudioBlob} filename={`dubbed_${targetLanguage}.mp3`} darkMode={dm} />
        )}
      </StepCard>

      {/* Step 7: Final Mix */}
      <StepCard step={7} currentStep={currentStep} label="Final Mix" icon={"\uD83C\uDFAC"} darkMode={dm} error={errors[7]}>
        {!finalAudioBlob ? (
          <ActionBtn onClick={mixFinal} loading={mixing} label="Mix Dubbed Vocals + Music" loadingLabel="Mixing..." darkMode={dm} />
        ) : (
          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#16a34a", marginBottom: "8px", textTransform: "uppercase" }}>
              Dubbing Complete!
            </div>
            <MediaPreview url={finalAudioUrl} type="audio" blob={finalAudioBlob} filename={`final_dub_${targetLanguage}.mp3`} darkMode={dm} />
          </div>
        )}
      </StepCard>

      </div>{/* end Steps Grid */}

      {/* Blink animation for streaming cursor */}
      <style>{`@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </div>
  );
}
