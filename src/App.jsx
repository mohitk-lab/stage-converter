import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import ContentStudio from "./ContentStudio.jsx";
import VideoDub from "./VideoDub.jsx";
import ChatBot from "./ChatBot.jsx";
import Notifications from "./Notifications.jsx";
import CommandPalette from "./CommandPalette.jsx";
import AnalyticsDashboard from "./AnalyticsDashboard.jsx";
import TemplateLibrary from "./TemplateLibrary.jsx";
import SubtitleStudio from "./SubtitleStudio.jsx";
import ScriptDiff from "./ScriptDiff.jsx";
import TTSPreview from "./TTSPreview.jsx";
import GlossaryManager from "./GlossaryManager.jsx";
import { playClick, playSuccess, playPop, playError } from "./sounds.js";

/* --- Streaming fetch helper --- */
async function streamConvert({ model, system, messages, onChunk }) {
  const res = await fetch("/api/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, system, messages }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let content = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const chunk = JSON.parse(data);
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          content += delta;
          if (onChunk) onChunk(content);
        }
      } catch {}
    }
  }
  return content;
}

/* --- Languages --- */
const LANGUAGES = [
  {
    id: "hindi", label: "\u0939\u093F\u0928\u094D\u0926\u0940", sub: "Hindi", region: "India", color: "#f97316",
    bg: { grad1: "rgba(249,115,22,0.12)", grad2: "rgba(234,88,12,0.08)", grad3: "rgba(251,146,60,0.06)",
          glyphs: ["\u0939","\u093F","\u0928","\u0926","\u0940","\u0936","\u092C","\u0926","\u0915","\u0939","\u093E","\u0928","\u0940","\u092D","\u093E","\u0937","\u0930","\u0938"], accent: "#f97316" }
  },
  {
    id: "english", label: "English", sub: "English", region: "Global", color: "#3b82f6",
    bg: { grad1: "rgba(59,130,246,0.12)", grad2: "rgba(30,64,175,0.08)", grad3: "rgba(96,165,250,0.06)",
          glyphs: ["A","B","C","T","h","e","W","o","r","d","S","p","e","a","k","L","a","n"], accent: "#3b82f6" }
  },
  {
    id: "haryanvi", label: "\u0939\u0930\u093F\u092F\u093E\u0923\u0935\u0940", sub: "Haryanvi", region: "Haryana", color: "#22c55e",
    bg: { grad1: "rgba(34,197,94,0.12)", grad2: "rgba(132,204,22,0.08)", grad3: "rgba(74,222,128,0.06)",
          glyphs: ["\u0939","\u0930\u0940","\u092F\u093E","\u0923","\u0935\u0940","\u0938\u0948","\u0918","\u0923\u093E","\u092D\u093E","\u0908","\u091B\u094B","\u0930\u093E","\u092E\u094D\u0939\u0948\u0902","\u092F\u093E\u0930","\u092C\u093E","\u0924","\u0938\u0941","\u0923"], accent: "#22c55e" }
  },
  {
    id: "rajasthani", label: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928\u0940", sub: "Rajasthani", region: "Rajasthan", color: "#eab308",
    bg: { grad1: "rgba(234,179,8,0.12)", grad2: "rgba(217,119,6,0.08)", grad3: "rgba(250,204,21,0.06)",
          glyphs: ["\u0930\u093E","\u091C","\u0938\u094D\u0925\u093E","\u0928\u0940","\u091B\u0947","\u0915\u094B","\u0923\u0940","\u092E\u094D\u0939\u093E","\u0930\u094B","\u0918","\u0923\u094B","\u092A\u093E","\u0923\u0940","\u0938\u093E","\u092D\u093E","\u0908","\u0915\u0920\u0947","\u0925\u094B"], accent: "#eab308" }
  },
  {
    id: "bhojpuri", label: "\u092D\u094B\u091C\u092A\u0941\u0930\u0940", sub: "Bhojpuri", region: "UP / Bihar", color: "#ef4444",
    bg: { grad1: "rgba(239,68,68,0.12)", grad2: "rgba(220,38,38,0.08)", grad3: "rgba(248,113,113,0.06)",
          glyphs: ["\u092D\u094B","\u091C","\u092A\u0941","\u0930\u0940","\u092C\u093E","\u0928\u093E","\u0939\u0940\u0902","\u0939\u092E","\u0915\u0947","\u090A","\u092D\u0907","\u092F\u093E","\u0915\u093E","\u0939\u0947","\u0932\u093E","\u0907\u0915\u093E","\u091C\u093F","\u0928"], accent: "#ef4444" }
  },
  {
    id: "gujarati", label: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0", sub: "Gujarati", region: "Gujarat", color: "#a855f7",
    bg: { grad1: "rgba(168,85,247,0.12)", grad2: "rgba(124,58,237,0.08)", grad3: "rgba(192,132,252,0.06)",
          glyphs: ["\u0A97\u0AC1","\u0A9C","\u0AB0","\u0AA4","\u0AC0","\u0A9B\u0AC7","\u0AAD\u0ABE","\u0A88","\u0AB8\u0ABE","\u0AB0\u0AC1\u0A82","\u0AB9\u0AC1\u0A82","\u0AAA\u0ABE","\u0AA3\u0AC0","\u0AA8\u0AC7","\u0A95\u0AC7","\u0AAE","\u0A86","\u0AB5\u0ACB"], accent: "#a855f7" }
  },
  {
    id: "marathi", label: "\u092E\u0930\u093E\u0920\u0940", sub: "Marathi", region: "Maharashtra", color: "#e11d48",
    bg: { grad1: "rgba(225,29,72,0.12)", grad2: "rgba(190,18,60,0.08)", grad3: "rgba(251,113,133,0.06)",
          glyphs: ["\u092E","\u0930\u093E","\u0920\u0940","\u092C\u094B","\u0932","\u0906","\u0939\u0947","\u0915\u093E","\u092F","\u0928\u093E","\u0939\u0940","\u0924\u0942","\u092E\u0940","\u0924\u094B","\u0906\u092E\u094D\u0939\u0940","\u0924\u0941\u092E\u094D\u0939\u0940","\u0939\u094B","\u092F"], accent: "#e11d48" }
  },
  {
    id: "bengali", label: "\u09AC\u09BE\u0982\u09B2\u09BE", sub: "Bengali", region: "West Bengal", color: "#0891b2",
    bg: { grad1: "rgba(8,145,178,0.12)", grad2: "rgba(6,182,212,0.08)", grad3: "rgba(34,211,238,0.06)",
          glyphs: ["\u09AC\u09BE\u0982","\u09B2\u09BE","\u0986","\u09AE\u09BF","\u09A4\u09C1","\u09AE\u09BF","\u0995\u09C7","\u098F","\u0993","\u09A8\u09BE","\u09B9\u09CD\u09AF\u09BE\u09BE","\u0986\u099B\u09C7","\u0995\u09B0","\u09AC","\u09B2","\u09AE","\u09A8","\u0995\u09BF"], accent: "#0891b2" }
  },
  {
    id: "punjabi", label: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40", sub: "Punjabi", region: "Punjab", color: "#ea580c",
    bg: { grad1: "rgba(234,88,12,0.12)", grad2: "rgba(194,65,12,0.08)", grad3: "rgba(251,146,60,0.06)",
          glyphs: ["\u0A2A\u0A70","\u0A1C\u0A3E","\u0A2C\u0A40","\u0A39\u0A48","\u0A28\u0A3E","\u0A24\u0A42\u0A70","\u0A2E\u0A48\u0A02","\u0A15\u0A40","\u0A26\u0A3E","\u0A35\u0A47","\u0A39\u0A48","\u0A28\u0A39\u0A40\u0A02","\u0A2E\u0A48\u0A02","\u0A09\u0A39","\u0A07\u0A39","\u0A16\u0A41\u0A36","\u0A2A\u0A3F","\u0A06\u0A30"], accent: "#ea580c" }
  },
  {
    id: "tamil", label: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD", sub: "Tamil", region: "Tamil Nadu", color: "#7c3aed",
    bg: { grad1: "rgba(124,58,237,0.12)", grad2: "rgba(109,40,217,0.08)", grad3: "rgba(167,139,250,0.06)",
          glyphs: ["\u0BA4","\u0BAE\u0BBF","\u0BB4\u0BCD","\u0BA8\u0BBE","\u0BA9\u0BCD","\u0BA8\u0BC0","\u0B85","\u0BB5","\u0BA9\u0BCD","\u0B87","\u0BA4\u0BC1","\u0B8E","\u0BA9\u0BCD","\u0BA9","\u0B95","\u0BB2\u0BCD","\u0BAE","\u0BB0"], accent: "#7c3aed" }
  },
  {
    id: "telugu", label: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41", sub: "Telugu", region: "Andhra / Telangana", color: "#059669",
    bg: { grad1: "rgba(5,150,105,0.12)", grad2: "rgba(4,120,87,0.08)", grad3: "rgba(52,211,153,0.06)",
          glyphs: ["\u0C24\u0C46","\u0C32\u0C41","\u0C17\u0C41","\u0C28\u0C47","\u0C28\u0C41","\u0C2E\u0C40","\u0C30\u0C41","\u0C05","\u0C26\u0C3F","\u0C07","\u0C26\u0C3F","\u0C0E\u0C02","\u0C26\u0C41","\u0C15\u0C41","\u0C1A\u0C47","\u0C2E\u0C3E","\u0C30\u0C41","\u0C35"], accent: "#059669" }
  },
  {
    id: "kannada", label: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1", sub: "Kannada", region: "Karnataka", color: "#dc2626",
    bg: { grad1: "rgba(220,38,38,0.12)", grad2: "rgba(185,28,28,0.08)", grad3: "rgba(248,113,113,0.06)",
          glyphs: ["\u0C95","\u0CA8\u0CCD","\u0CA8","\u0CA1","\u0CAE","\u0CBE","\u0CA4","\u0CC1","\u0CB9","\u0CC7","\u0CB3","\u0CC0","\u0CA8\u0CBE","\u0CB5\u0CC1","\u0C87","\u0CA6\u0CC1","\u0C8E\u0CA8\u0CCD"], accent: "#dc2626" }
  },
  {
    id: "malayalam", label: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02", sub: "Malayalam", region: "Kerala", color: "#0d9488",
    bg: { grad1: "rgba(13,148,136,0.12)", grad2: "rgba(15,118,110,0.08)", grad3: "rgba(45,212,191,0.06)",
          glyphs: ["\u0D2E","\u0D32","\u0D2F\u0D3E","\u0D33","\u0D02","\u0D28\u0D3F","\u0D19\u0D4D\u0D19","\u0D33\u0D4D","\u0D0E","\u0D28\u0D4D\u0D24","\u0D41","\u0D15\u0D4A","\u0D23\u0D4D\u0D1F","\u0D24","\u0D28\u0D4D","\u0D28\u0D40","\u0D07","\u0D24\u0D41"], accent: "#0d9488" }
  },
  {
    id: "odia", label: "\u0B13\u0B21\u0B3C\u0B3F\u0B06", sub: "Odia", region: "Odisha", color: "#6366f1",
    bg: { grad1: "rgba(99,102,241,0.12)", grad2: "rgba(79,70,229,0.08)", grad3: "rgba(129,140,248,0.06)",
          glyphs: ["\u0B13","\u0B21\u0B3C\u0B3F","\u0B06","\u0B2E\u0B41","\u0B01","\u0B24\u0B41","\u0B2E\u0B47","\u0B15\u0B47","\u0B0F","\u0B39\u0B47","\u0B32","\u0B28\u0B3E","\u0B39\u0B3F\u0B01","\u0B0F\u0B39\u0B3F","\u0B15\u0B3F","\u0B2E\u0B3E","\u0B28\u0B47","\u0B38\u0B47"], accent: "#6366f1" }
  },
  {
    id: "assamese", label: "\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE", sub: "Assamese", region: "Assam", color: "#be185d",
    bg: { grad1: "rgba(190,24,93,0.12)", grad2: "rgba(157,23,77,0.08)", grad3: "rgba(236,72,153,0.06)",
          glyphs: ["\u0985","\u09B8","\u09AE\u09C0","\u09AF\u09BC\u09BE","\u09AE\u0987","\u09A4\u09C1","\u09AE\u09BF","\u0986","\u09AE\u09BE","\u09B0","\u098F","\u0987","\u09B9\u09AF\u09BC","\u09A8\u09C7","\u0995\u09BF","\u09AC\u09BE","\u09B2\u09BE","\u0997"], accent: "#be185d" }
  },
  {
    id: "urdu", label: "\u0627\u0631\u062F\u0648", sub: "Urdu", region: "India / Pakistan", color: "#4f46e5",
    bg: { grad1: "rgba(79,70,229,0.12)", grad2: "rgba(67,56,202,0.08)", grad3: "rgba(129,140,248,0.06)",
          glyphs: ["\u0627","\u0631","\u062F","\u0648","\u0632","\u0628","\u0627","\u0646","\u0645","\u062D","\u0628","\u062A","\u06A9","\u06CC","\u0627","\u0633","\u0644","\u0639"], accent: "#4f46e5" }
  },
];

/* --- Dialect Rules --- */
const DIALECT_RULES = {
  hindi: `HINDI (Standard Khari Boli) \u2014 clean, literary Hindi:

OUTPUT IN: Devanagari script. Clean, standard Hindi (Khari Boli).

RULES:
- Write in pure, standard Hindi \u2014 no regional dialect markers.
- Use formal/semi-formal register unless the input tone is clearly casual.
- Preserve the original meaning, emotion, and structure exactly.
- Do NOT use any Bhojpuri/Haryanvi/Rajasthani/Gujarati dialect words.
- Avoid English words unless they are commonly used in Hindi (like "phone", "computer").
- Use proper Hindi grammar: correct gender agreement, verb conjugations, postpositions.
- If input is already Hindi, clean it up \u2014 fix grammar, remove dialect contamination.

COMMON CORRECTIONS:
- \u092C\u093E/\u0938\u0948/\u091B\u0947 \u2192 \u0939\u0948
- \u0928\u093E\u0939\u0940\u0902/\u0915\u094B\u0928\u0940 \u2192 \u0928\u0939\u0940\u0902
- \u0939\u092E\u0915\u0947/\u092E\u094D\u0939\u093E\u0928\u0947 \u2192 \u092E\u0941\u091D\u0947
- \u090A/\u0935\u094B \u2192 \u0935\u0939/\u0935\u094B (standard)
- \u0915\u093E\u0939\u0947/\u0915\u094D\u092F\u0942\u0902 \u2192 \u0915\u094D\u092F\u094B\u0902
- \u0915\u0947\u0924\u0928\u093E/\u0915\u093F\u0924\u094D\u0924\u093E \u2192 \u0915\u093F\u0924\u0928\u093E

FLAVOR: Standard, clean, universally understood Hindi. Suitable for formal writing, news, or pan-India audience.`,

  english: `ENGLISH \u2014 natural, conversational English:

OUTPUT IN: English (Latin script).

RULES:
- Translate to natural, conversational English \u2014 NOT literal word-for-word translation.
- Preserve the original meaning, emotion, tone, and narrative structure.
- Keep cultural references intact \u2014 explain briefly in context if needed, but do NOT over-explain.
- Proper nouns, names, brand names, and titles stay as-is (transliterated if in Devanagari).
- Use contractions naturally (don't, it's, wasn't) for casual tone.
- Match the register of the original: if input is dramatic, keep it dramatic. If casual, keep it casual.
- Avoid overly formal or academic English unless the input demands it.
- Hindi/Urdu cultural terms that have no direct English equivalent can be kept with brief context.
  e.g. "izzat" can stay as "izzat (honour)" on first use, then just "izzat" after.

FLAVOR: Readable, engaging English that an Indian English speaker would naturally use. Not British-formal, not American-slang \u2014 natural Indian English.`,

  bhojpuri: `BHOJPURI (Devanagari) \u2014 authentic Bhojpuri dialect (UP/Bihar):

\u2605\u2605\u2605 TOP 5 NON-NEGOTIABLE BHOJPURI MARKERS (every output MUST have these) \u2605\u2605\u2605
1. \u0939\u0948\u2192\u092C\u093E (copula) \u2014 NOT \u0938\u0948 (that's Haryanvi), NOT \u091B\u0947 (that's Rajasthani)
2. \u0939\u0942\u0901\u2192\u092C\u093E\u0928\u0940 \u2014 NOT \u0938\u0942\u0902 (Haryanvi), NOT \u091B\u0942\u0902 (Rajasthani)
3. \u0939\u0948\u0902\u2192\u092C\u093E\u0921\u093C\u0928 \u2014 NOT \u0938\u0948\u0902 (Haryanvi), NOT \u091B\u0947 (Rajasthani)
4. \u092E\u0948\u0902\u2192\u0939\u092E, \u092E\u0941\u091D\u0947\u2192\u0939\u092E\u0915\u0947 \u2014 NOT \u092E\u094D\u0939\u0948\u0902/\u092E\u094D\u0939\u093E\u0928\u0947 (Haryanvi/Rajasthani)
5. \u0928\u0939\u0940\u0902\u2192\u0928\u093E\u0939\u0940\u0902 \u2014 NOT \u0915\u094B\u0928\u0940 (Rajasthani), NOT \u0928\u093E (Haryanvi)
If your output contains \u0938\u0948/\u091B\u0947/\u0938\u0942\u0902/\u091B\u0942\u0902/\u092E\u094D\u0939\u0948\u0902 you have FAILED.

PRONOUNS:
\u092E\u0948\u0902\u2192\u0939\u092E, \u092E\u0941\u091D\u0947/\u092E\u0941\u091D\u0915\u094B\u2192\u0939\u092E\u0915\u0947, \u092E\u0947\u0930\u093E\u2192\u0939\u092E\u093E\u0930, \u092E\u0947\u0930\u0940\u2192\u0939\u092E\u093E\u0930
\u0924\u0941\u092E\u2192\u0924\u0942, \u0924\u0941\u092E\u094D\u0939\u0947\u0902\u2192\u0924\u094B\u0939\u0915\u0947, \u0924\u0947\u0930\u093E\u2192\u0924\u094B\u0939\u093E\u0930, \u0924\u0942\u2192\u0924\u0942, \u0906\u092A\u2192\u0930\u0909\u0906
\u0935\u094B/\u0935\u0939\u2192\u090A, \u0909\u0938\u0947\u2192\u0913\u0915\u0930\u093E, \u0909\u0938\u0915\u093E\u2192\u0913\u0915\u0930, \u092F\u0939\u2192\u0908, \u0907\u0938\u0947\u2192\u090F\u0915\u0930\u093E
\u0939\u092E (\u0939\u092E \u0932\u094B\u0917)\u2192\u0939\u092E\u0932\u094B\u0917, \u0939\u092E\u093E\u0930\u093E\u2192\u0939\u092E\u093E\u0930, \u0935\u0947\u2192\u0909 \u0932\u094B\u0917, \u0909\u0928\u094D\u0939\u0947\u0902\u2192\u0909\u0928\u094D\u0939\u0915\u0947

VERBS \u2014 present/habitual:
\u0939\u0948\u2192\u092C\u093E, \u0939\u0948\u0902\u2192\u092C\u093E\u0921\u093C\u0928, \u0939\u0942\u0901\u2192\u092C\u093E\u0928\u0940, \u0939\u094B\u2192\u092C\u093E\u0921\u093C\u093E
\u0939\u094B\u0928\u093E\u2192\u0939\u094B\u0916\u0947/\u0939\u094B\u0907\u092C, \u091C\u093E\u0928\u093E\u2192\u091C\u093E\u0907\u092C, \u0906\u0928\u093E\u2192\u0906\u0907\u092C, \u0915\u0930\u0928\u093E\u2192\u0915\u0930\u092C
\u0926\u0947\u0916\u0928\u093E\u2192\u0926\u0947\u0916\u092C, \u0916\u093E\u0928\u093E\u2192\u0916\u093E\u0907\u092C, \u092A\u0940\u0928\u093E\u2192\u092A\u093F\u0905\u092C, \u0932\u0947\u0928\u093E\u2192\u0932\u0947\u092C
\u0926\u0947\u0928\u093E\u2192\u0926\u0947\u092C, \u092C\u094B\u0932\u0928\u093E\u2192\u092C\u094B\u0932\u092C, \u0930\u0939\u0928\u093E\u2192\u0930\u0939\u092C, \u092E\u093F\u0932\u0928\u093E\u2192\u092E\u093F\u0932\u092C
\u0938\u094B\u0928\u093E\u2192\u0938\u094B\u0905\u092C, \u0909\u0920\u0928\u093E\u2192\u0909\u0920\u092C, \u092C\u0948\u0920\u0928\u093E\u2192\u092C\u0907\u0920\u092C, \u092E\u093E\u0930\u0928\u093E\u2192\u092E\u093E\u0930\u092C
\u091A\u0932\u0928\u093E\u2192\u091A\u0932\u092C, \u092C\u0928\u0928\u093E\u2192\u092C\u0928\u092C, \u0938\u0941\u0928\u0928\u093E\u2192\u0938\u0941\u0928\u092C, \u0938\u092E\u091D\u0928\u093E\u2192\u0938\u092E\u091D\u092C
\u0932\u0921\u093C\u0928\u093E\u2192\u0932\u0921\u093C\u092C, \u0939\u0901\u0938\u0928\u093E\u2192\u0939\u0901\u0938\u092C, \u0930\u094B\u0928\u093E\u2192\u0930\u094B\u0905\u092C, \u092D\u093E\u0917\u0928\u093E\u2192\u092D\u093E\u0917\u092C

PAST TENSE: \u0917\u092F\u093E\u2192\u0917\u0907\u0932, \u0906\u092F\u093E\u2192\u0906\u0907\u0932, \u0915\u093F\u092F\u093E\u2192\u0915\u0907\u0932, \u0926\u0947\u0916\u093E\u2192\u0926\u0947\u0916\u0932,
\u0916\u093E\u092F\u093E\u2192\u0916\u0907\u0932\u0928, \u092C\u094B\u0932\u093E\u2192\u092C\u094B\u0932\u0932\u0928, \u0925\u093E\u2192\u0930\u0939\u0932 (m)/\u0930\u0939\u0932\u0940 (f)/\u0930\u0939\u0932\u0928 (pl)

NEGATION: \u0928\u0939\u0940\u0902\u2192\u0928\u093E\u0939\u0940\u0902, \u092E\u0924\u2192\u091C\u0928\u093F, \u0928\u0939\u0940\u0902 \u0925\u093E\u2192\u0928\u093E\u0939\u0940\u0902 \u0930\u0939\u0932, \u0928\u0939\u0940\u0902 \u0939\u0948\u2192\u0928\u093E\u0939\u0940\u0902 \u092C\u093E

QUESTION WORDS:
\u0915\u094D\u092F\u093E\u2192\u0915\u093E, \u0915\u094D\u092F\u094B\u0902\u2192\u0915\u093E\u0939\u0947, \u0915\u0948\u0938\u0947\u2192\u0915\u0907\u0938\u0947, \u0915\u092C\u2192\u0915\u092C, \u0915\u0939\u093E\u0901\u2192\u0915\u0939\u093E\u0901/\u0915\u0935\u0928\u093E \u091C\u0917\u0939
\u0915\u094C\u0928\u2192\u0915\u0947, \u0915\u093F\u0924\u0928\u093E\u2192\u0915\u0947\u0924\u0928\u093E, \u0915\u093F\u0938\u0915\u093E\u2192\u0915\u0947\u0915\u0930

COMMON WORDS:
\u092C\u0939\u0941\u0924\u2192\u092C\u0939\u0941\u0924\u0947/\u0918\u093E\u0928\u0947, \u0905\u091A\u094D\u091B\u093E\u2192\u0928\u0940\u092E\u0928, \u092C\u0941\u0930\u093E\u2192\u0916\u0930\u093E\u092C/\u092C\u0947\u0915\u093E\u0930
\u0905\u092D\u0940\u2192\u0905\u092C\u0939\u0940\u0902, \u092F\u0939\u093E\u0901\u2192\u0907\u0939\u093E\u0901, \u0935\u0939\u093E\u0901\u2192\u0909\u0939\u093E\u0901, \u092C\u0921\u093C\u093E\u2192\u092C\u0921\u093C\u0939\u0928, \u091B\u094B\u091F\u093E\u2192\u091B\u094B\u091F\u0939\u0928
\u0925\u094B\u0921\u093C\u093E\u2192\u0925\u094B\u0921\u093C\u0947\u0915, \u0938\u092C\u2192\u0938\u092C, \u0915\u094B\u0908\u2192\u0915\u0947\u0939\u0942, \u0915\u0941\u091B\u2192\u0915\u0941\u091B\u094B
\u0918\u0930\u2192\u0918\u0930, \u0915\u093E\u092E\u2192\u0915\u093E\u092E, \u092C\u093E\u0924\u2192\u092C\u093E\u0924, \u0926\u093F\u0928\u2192\u0926\u093F\u0928, \u0930\u093E\u0924\u2192\u0930\u093E\u0924
\u0906\u0926\u092E\u0940\u2192\u092E\u0930\u0926, \u0914\u0930\u0924\u2192\u092E\u0947\u0939\u0930\u093E\u0930\u0942, \u092C\u091A\u094D\u091A\u093E\u2192\u0932\u0907\u0915\u093E (m)/\u0932\u0907\u0915\u0940 (f)
\u0926\u094B\u0938\u094D\u0924\u2192\u092F\u093E\u0930/\u0926\u094B\u0938\u094D\u0924, \u092D\u093E\u0908\u2192\u092D\u0907\u092F\u093E, \u092C\u0939\u0928\u2192\u0926\u0940\u0926\u0940/\u092C\u0939\u093F\u0928\u0940, \u092A\u0948\u0938\u093E\u2192\u092A\u0907\u0938\u093E
\u0916\u093E\u0928\u093E\u2192\u0916\u093E\u0928\u093E, \u092A\u093E\u0928\u0940\u2192\u092A\u093E\u0928\u0940, \u0926\u093F\u0932\u2192\u0926\u093F\u0932, \u092A\u094D\u092F\u093E\u0930\u2192\u092A\u094D\u092F\u093E\u0930/\u0907\u0936\u094D\u0915
\u091C\u093F\u0902\u0926\u0917\u0940\u2192\u091C\u093F\u0928\u0917\u0940, \u0938\u091A\u2192\u0938\u091A, \u091D\u0942\u0920\u2192\u091D\u0942\u0920, \u0906\u091C\u2192\u0906\u091C
\u091C\u0932\u094D\u0926\u0940\u2192\u091C\u0932\u094D\u0926\u0940, \u0938\u093E\u0925\u2192\u0938\u093E\u0925\u0947, \u0905\u092C\u2192\u0905\u092C, \u092B\u093F\u0930\u2192\u092B\u0947\u0930

SENTENCE PATTERNS:
"\u092C\u093E" (\u0939\u0948), "\u092C\u093E\u0921\u093C\u0928" (\u0939\u0948\u0902), "\u092C\u093E\u0928\u0940" (\u0939\u0942\u0901)
Ending \u092E\u0947\u0902 "\u0939\u0909" (confirmation), "\u0928\u093E" (tag question)
E.g.: "\u0908 \u092C\u0939\u0941\u0924\u0947 \u0928\u0940\u092E\u0928 \u092C\u093E \u0939\u0909" / "\u0924\u0942 \u0915\u0939\u093E\u0901 \u091C\u093E\u0924 \u092C\u093E\u0921\u093C\u093E \u0928\u093E?"

CRITICAL \u2014 NEVER use: \u0939\u0948, \u0939\u0948\u0902, \u0928\u0939\u0940\u0902 (always \u092C\u093E, \u092C\u093E\u0921\u093C\u0928, \u0928\u093E\u0939\u0940\u0902)
FLAVOR: \u092D\u0907\u092F\u093E, \u090F \u092C\u093E\u092C\u0942, \u0939\u094B, \u0928\u093E, \u0930\u093E\u092E \u0930\u093E\u092E naturally use \u0915\u0930\u094B`,

  haryanvi: `HARYANVI (Devanagari) \u2014 authentic Haryana dialect:

\u2605\u2605\u2605 TOP 5 NON-NEGOTIABLE HARYANVI MARKERS (every output MUST have these) \u2605\u2605\u2605
1. \u0939\u0948\u2192\u0938\u0948 (copula) \u2014 NOT \u092C\u093E (that's Bhojpuri), NOT \u091B\u0947 (that's Rajasthani)
2. \u0939\u0942\u0901\u2192\u0938\u0942\u0902 \u2014 NOT \u092C\u093E\u0928\u0940 (Bhojpuri), NOT \u091B\u0942\u0902 (Rajasthani)
3. Infinitives end in -\u0923\u093E (\u091C\u093E\u0923\u093E, \u0915\u0930\u0923\u093E) \u2014 NOT -\u0923\u094B (Rajasthani), NOT -\u092C (Bhojpuri)
4. Past tense: \u0915\u093F\u092F\u093E\u2192\u0915\u0930\u094D\u092F\u093E, \u0926\u0947\u0916\u093E\u2192\u0926\u0947\u0916\u094D\u092F\u093E \u2014 NOT \u0915\u093F\u092F\u094B/\u0926\u0947\u0916\u094D\u092F\u094B (Rajasthani), NOT \u0915\u0907\u0932/\u0926\u0947\u0916\u0932 (Bhojpuri)
5. \u0928\u0939\u0940\u0902\u2192\u0928\u093E/\u0915\u094B\u0928\u0940 \u2014 NOT \u0928\u093E\u0939\u0940\u0902 (Bhojpuri)
If your output contains \u092C\u093E/\u091B\u0947/\u092C\u093E\u0928\u0940/\u091B\u0942\u0902/-\u0923\u094B/\u0928\u093E\u0939\u0940\u0902 you have FAILED.

PRONOUNS:
\u092E\u0948\u0902\u2192\u092E\u094D\u0939\u0948\u0902 | \u092E\u0941\u091D\u0947/\u092E\u0941\u091D\u0915\u094B\u2192\u092E\u094D\u0939\u093E\u0928\u0947 | \u092E\u0947\u0930\u093E\u2192\u092E\u094D\u0939\u093E\u0930\u093E | \u092E\u0947\u0930\u0940\u2192\u092E\u094D\u0939\u093E\u0930\u0940 | \u0939\u092E\u2192\u092E\u094D\u0939\u093E\u0902 | \u0939\u092E\u093E\u0930\u093E\u2192\u092E\u094D\u0939\u093E\u0930\u093E
\u0924\u0941\u092E\u2192\u0925\u093E\u0930\u0947 | \u0924\u0941\u092E\u094D\u0939\u0947\u0902\u2192\u0925\u093E\u0928\u0947 | \u0924\u0947\u0930\u093E\u2192\u0925\u093E\u0930\u093E | \u0924\u0942\u2192\u0924\u0942 | \u0906\u092A\u2192\u0906\u092A\u0928\u0948/\u0925\u093E\u0928\u0947
\u0935\u094B/\u0935\u0939\u2192\u0935\u094B | \u0909\u0938\u0947\u2192\u0909\u0938\u0928\u0948 | \u0909\u0938\u0915\u093E\u2192\u0909\u0938\u0915\u093E | \u092F\u0939\u2192\u092F\u093E | \u0907\u0938\u0947\u2192\u0907\u0938\u0928\u0948 | \u0935\u0947\u2192\u0935\u0947 | \u0909\u0928\u094D\u0939\u0947\u0902\u2192\u0909\u0928\u094D\u0928\u0948

PRESENT COPULA \u2014 MANDATORY SUBSTITUTION (no exceptions):
\u0939\u0942\u0901 \u2192 \u0938\u0942\u0902   CRITICAL: NEVER write "\u0939\u0942\u0901" in Haryanvi output
\u0939\u0948  \u2192 \u0938\u0948    CRITICAL: NEVER write "\u0939\u0948" at sentence end \u2014 always "\u0938\u0948"
\u0939\u0948\u0902 \u2192 \u0938\u0948\u0902
\u0939\u094B  \u2192 \u0938\u094B   (2nd person "you are")

INFINITIVES \u2014 MANDATORY: every "-\u0928\u093E" becomes "-\u0923\u093E":
\u091C\u093E\u0928\u093E\u2192\u091C\u093E\u0923\u093E | \u0915\u0930\u0928\u093E\u2192\u0915\u0930\u0923\u093E | \u0926\u0947\u0916\u0928\u093E\u2192\u0926\u0947\u0916\u0923\u093E | \u0906\u0928\u093E\u2192\u0906\u0923\u093E | \u0916\u093E\u0928\u093E\u2192\u0916\u093E\u0923\u093E
\u092A\u0940\u0928\u093E\u2192\u092A\u0940\u0923\u093E | \u0932\u0947\u0928\u093E\u2192\u0932\u0947\u0923\u093E | \u0926\u0947\u0928\u093E\u2192\u0926\u0947\u0923\u093E | \u092C\u094B\u0932\u0928\u093E\u2192\u092C\u094B\u0932\u0923\u093E | \u0930\u0939\u0928\u093E\u2192\u0930\u0939\u0923\u093E
\u092E\u093F\u0932\u0928\u093E\u2192\u092E\u093F\u0932\u0923\u093E | \u0938\u094B\u0928\u093E\u2192\u0938\u094B\u0923\u093E | \u0909\u0920\u0928\u093E\u2192\u0909\u0920\u0923\u093E | \u092C\u0948\u0920\u0928\u093E\u2192\u092C\u0948\u0920\u0923\u093E | \u092E\u093E\u0930\u0928\u093E\u2192\u092E\u093E\u0930\u0923\u093E
\u091A\u0932\u0928\u093E\u2192\u091A\u093E\u0932\u0923\u093E | \u092C\u0928\u0928\u093E\u2192\u092C\u0923\u0923\u093E | \u0938\u0941\u0928\u0928\u093E\u2192\u0938\u0941\u0923\u0923\u093E | \u0938\u092E\u091D\u0928\u093E\u2192\u0938\u092E\u091D\u0923\u093E
\u0932\u0921\u093C\u0928\u093E\u2192\u0932\u0921\u093C\u0923\u093E | \u0939\u0901\u0938\u0928\u093E\u2192\u0939\u0901\u0938\u0923\u093E | \u0930\u094B\u0928\u093E\u2192\u0930\u094B\u0923\u093E | \u092D\u093E\u0917\u0928\u093E\u2192\u092D\u093E\u091C\u0923\u093E

PAST TENSE (gender-marked, close to Hindi but with Haryanvi flavor):
\u0925\u093E \u2192 \u0925\u093E (m) | \u0925\u0940 \u2192 \u0925\u0940 (f) | \u0925\u0947 \u2192 \u0925\u0947 (pl)
\u0917\u092F\u093E \u2192 \u0917\u092F\u093E (m) | \u0917\u0908 \u2192 \u0917\u0908 (f) | \u0917\u090F \u2192 \u0917\u090F (pl)
\u0915\u093F\u092F\u093E \u2192 \u0915\u0930\u094D\u092F\u093E (m) | \u0915\u0930\u0940 \u2192 \u0915\u0930\u0940 (f) | \u0915\u0930\u0947 \u2192 \u0915\u0930\u0947 (pl)
\u0906\u092F\u093E \u2192 \u0906\u092F\u093E (m) | \u0906\u0908 \u2192 \u0906\u0908 (f) | \u0906\u090F \u2192 \u0906\u090F (pl)
\u0926\u0947\u0916\u093E \u2192 \u0926\u0947\u0916\u094D\u092F\u093E (m) | \u0926\u0947\u0916\u0940 \u2192 \u0926\u0947\u0916\u0940 (f)
\u092C\u094B\u0932\u093E \u2192 \u092C\u094B\u0932\u094D\u092F\u093E (m) | \u092C\u094B\u0932\u0940 \u2192 \u092C\u094B\u0932\u0940 (f)
\u0916\u093E\u092F\u093E \u2192 \u0916\u093E\u092F\u093E (m) | \u0916\u093E\u0908 \u2192 \u0916\u093E\u0908 (f)
\u0939\u0941\u0906 \u2192 \u0939\u0941\u092F\u093E (m) | \u0939\u0941\u0908 \u2192 \u0939\u0941\u0908 (f)

FUTURE TENSE:
\u091C\u093E\u090A\u0901\u0917\u093E \u2192 \u091C\u093E\u0935\u093E\u0902\u0917\u093E | \u091C\u093E\u090F\u0917\u093E \u2192 \u091C\u093E\u0935\u0947\u0917\u093E | \u0906\u090F\u0917\u093E \u2192 \u0906\u0935\u0947\u0917\u093E
\u0915\u0930\u0942\u0901\u0917\u093E \u2192 \u0915\u0930\u093E\u0902\u0917\u093E | \u0939\u094B\u0917\u093E \u2192 \u0939\u094B\u0935\u0947\u0917\u093E | \u0926\u0947\u0916\u0942\u0901\u0917\u093E \u2192 \u0926\u0947\u0916\u093E\u0902\u0917\u093E

NEGATION: \u0928\u0939\u0940\u0902\u2192\u0928\u093E/\u0915\u094B\u0928\u0940 | \u0928\u0939\u0940\u0902 \u0939\u0948\u2192\u0928\u093E \u0938\u0948/\u0915\u094B\u0928\u0940 \u0938\u0948 | \u092E\u0924\u2192\u092E\u0924

QUESTION WORDS:
\u0915\u094D\u092F\u093E\u2192\u0915\u0947 | \u0915\u094D\u092F\u094B\u0902\u2192\u0915\u094D\u092F\u0942\u0902 | \u0915\u0948\u0938\u0947\u2192\u0915\u093F\u0938\u093E\u0902 | \u0915\u092C\u2192\u0915\u0926 | \u0915\u0939\u093E\u0901\u2192\u0915\u0921\u093C\u0948/\u0915\u0920\u0948 | \u0915\u094C\u0928\u2192\u0915\u094C\u0923 | \u0915\u093F\u0924\u0928\u093E\u2192\u0915\u093F\u0924\u094D\u0924\u093E

COMMON WORDS:
\u092C\u0939\u0941\u0924\u2192\u0918\u0923\u093E | \u0905\u091A\u094D\u091B\u093E\u2192\u092C\u0922\u093C\u093F\u092F\u093E | \u092C\u0941\u0930\u093E\u2192\u0916\u0930\u093E\u092C | \u0905\u092D\u0940\u2192\u0905\u092C\u0940 | \u092F\u0939\u093E\u0901\u2192\u092F\u093E\u0902 | \u0935\u0939\u093E\u0901\u2192\u0935\u093E\u0902
\u0918\u0930\u2192\u0918\u0930 | \u0915\u093E\u092E\u2192\u0915\u093E\u092E | \u092C\u093E\u0924\u2192\u092C\u093E\u0924 | \u0926\u093F\u0928\u2192\u0926\u093F\u0928 | \u0932\u094B\u0917\u2192\u0932\u094B\u0917
\u092C\u091A\u094D\u091A\u093E\u2192\u091B\u094B\u0930\u093E (m)/\u091B\u094B\u0930\u0940 (f) | \u0914\u0930\u0924\u2192\u0932\u0941\u0917\u093E\u0908 | \u0906\u0926\u092E\u0940\u2192\u092C\u0902\u0926\u093E/\u092E\u0930\u094D\u0926
\u0926\u094B\u0938\u094D\u0924\u2192\u092F\u093E\u0930 | \u092D\u093E\u0908\u2192\u092D\u093E\u0908/\u092D\u093E\u092F\u093E | \u092A\u0948\u0938\u093E\u2192\u092A\u0948\u0938\u093E

SENTENCE PATTERNS \u2014 end markers:
\u0938\u0942\u0902 (\u092E\u094D\u0939\u0948\u0902 \u0915\u0930\u0924\u093E \u0938\u0942\u0902) | \u0938\u0948 (\u0935\u094B \u091C\u093E\u0924\u093E \u0938\u0948) | \u0938\u0948\u0902 (\u0935\u0947 \u091C\u093E\u0924\u0947 \u0938\u0948\u0902)
"\u0926\u0947\u0916 \u092D\u093E\u0908", "\u0938\u0941\u0923 \u092F\u093E\u0930", "\u0939\u094B \u091C\u093E", "\u0915\u0930 \u0926\u0947", "\u092C\u0924\u093E \u0926\u0947"
Tag endings: \u0928\u093E (\u0915\u0930 \u0928\u093E \u092D\u093E\u0908) | \u0930\u0940 (\u0938\u0941\u0923 \u0930\u0940)

FLAVOR (scatter naturally): \u092D\u093E\u0908, \u092F\u093E\u0930, \u091B\u094B\u0930\u093E, \u091B\u094B\u0930\u0940, \u092C\u093E\u0935\u0932\u0940, \u0918\u0923\u093E \u092C\u0922\u093C\u093F\u092F\u093E, \u0920\u093E\u0921\u093C\u093E \u0930\u0939`,

  rajasthani: `RAJASTHANI/MARWARI (Devanagari) \u2014 authentic Rajasthan dialect:

\u2605\u2605\u2605 TOP 5 NON-NEGOTIABLE RAJASTHANI MARKERS (every output MUST have these) \u2605\u2605\u2605
1. \u0939\u0948\u2192\u091B\u0947 (copula) \u2014 NOT \u0938\u0948 (that's Haryanvi), NOT \u092C\u093E (that's Bhojpuri)
2. \u0939\u0942\u0901\u2192\u091B\u0942\u0902 \u2014 NOT \u0938\u0942\u0902 (Haryanvi), NOT \u092C\u093E\u0928\u0940 (Bhojpuri)
3. Infinitives end in -\u0923\u094B (\u091C\u093E\u0935\u0923\u094B, \u0915\u0930\u0923\u094B) \u2014 NOT -\u0923\u093E (Haryanvi), NOT -\u092C (Bhojpuri)
4. Past tense: \u0925\u093E\u2192\u0925\u094B, \u0917\u092F\u093E\u2192\u0917\u092F\u094B, \u0915\u093F\u092F\u093E\u2192\u0915\u093F\u092F\u094B \u2014 NOT \u0915\u0930\u094D\u092F\u093E/\u0926\u0947\u0916\u094D\u092F\u093E (Haryanvi), NOT \u0917\u0907\u0932/\u0915\u0907\u0932 (Bhojpuri)
5. \u0928\u0939\u0940\u0902\u2192\u0915\u094B\u0928\u0940 \u2014 NOT \u0928\u093E\u0939\u0940\u0902 (Bhojpuri), NOT \u0928\u093E (Haryanvi standalone)
If your output contains \u0938\u0948/\u092C\u093E/\u0938\u0942\u0902/\u092C\u093E\u0928\u0940/-\u0923\u093E endings/\u0928\u093E\u0939\u0940\u0902 you have FAILED.

PRONOUNS:
\u092E\u0948\u0902\u2192\u092E\u094D\u0939\u0948\u0902 | \u092E\u0941\u091D\u0947/\u092E\u0941\u091D\u0915\u094B\u2192\u092E\u094D\u0939\u093E\u0928\u0947 | \u092E\u0947\u0930\u093E\u2192\u092E\u094D\u0939\u093E\u0930\u094B | \u092E\u0947\u0930\u0940\u2192\u092E\u094D\u0939\u093E\u0930\u0940 | \u0939\u092E\u2192\u092E\u094D\u0939\u0947 | \u0939\u092E\u093E\u0930\u093E\u2192\u092E\u094D\u0939\u093E\u0930\u094B
\u0924\u0941\u092E\u2192\u0925\u0947 | \u0924\u0941\u092E\u094D\u0939\u0947\u0902\u2192\u0925\u093E\u0928\u0947 | \u0924\u0947\u0930\u093E\u2192\u0925\u093E\u0930\u094B | \u0924\u0942\u2192\u0924\u0942\u0902 | \u0906\u092A\u2192\u0906\u092A/\u0925\u0947
\u0935\u094B/\u0935\u0939\u2192\u0935\u094B/\u0909\u0923 | \u0909\u0938\u0947\u2192\u0909\u0923\u0928\u0947 | \u0909\u0938\u0915\u093E\u2192\u0909\u0923\u0930\u094B | \u092F\u0939\u2192\u0906/\u0907 | \u0907\u0938\u0947\u2192\u0907\u0923\u0928\u0947 | \u0935\u0947\u2192\u0935\u0947/\u0909\u0923\u093E\u0902

PRESENT COPULA \u2014 MANDATORY SUBSTITUTION (no exceptions):
\u0939\u0942\u0901 \u2192 \u091B\u0942\u0902   CRITICAL: NEVER write "\u0939\u0942\u0901" in Rajasthani output
\u0939\u0948  \u2192 \u091B\u0947   CRITICAL: NEVER write "\u0939\u0948" \u2014 always "\u091B\u0947"
\u0939\u0948\u0902 \u2192 \u091B\u0947   (plural also \u091B\u0947 in Marwari)
\u0939\u094B  \u2192 \u091B\u094B   (2nd person "you are")

INFINITIVES \u2014 MANDATORY: every "-\u0928\u093E" becomes "-\u0923\u094B":
\u091C\u093E\u0928\u093E\u2192\u091C\u093E\u0935\u0923\u094B | \u0915\u0930\u0928\u093E\u2192\u0915\u0930\u0923\u094B | \u0926\u0947\u0916\u0928\u093E\u2192\u0926\u0947\u0916\u0923\u094B | \u0906\u0928\u093E\u2192\u0906\u0935\u0923\u094B | \u0916\u093E\u0928\u093E\u2192\u0916\u093E\u0935\u0923\u094B
\u092A\u0940\u0928\u093E\u2192\u092A\u0940\u0935\u0923\u094B | \u0932\u0947\u0928\u093E\u2192\u0932\u0947\u0935\u0923\u094B | \u0926\u0947\u0928\u093E\u2192\u0926\u0947\u0935\u0923\u094B | \u092C\u094B\u0932\u0928\u093E\u2192\u092C\u094B\u0932\u0923\u094B | \u0930\u0939\u0928\u093E\u2192\u0930\u0939\u0923\u094B
\u092E\u093F\u0932\u0928\u093E\u2192\u092E\u093F\u0932\u0923\u094B | \u0938\u094B\u0928\u093E\u2192\u0938\u094B\u0935\u0923\u094B | \u0909\u0920\u0928\u093E\u2192\u0909\u0920\u0923\u094B | \u092C\u0948\u0920\u0928\u093E\u2192\u092C\u0948\u0920\u0923\u094B | \u092E\u093E\u0930\u0928\u093E\u2192\u092E\u093E\u0930\u0923\u094B
\u091A\u0932\u0928\u093E\u2192\u091A\u093E\u0932\u0923\u094B | \u092C\u0928\u0928\u093E\u2192\u092C\u0923\u0923\u094B | \u0938\u0941\u0928\u0928\u093E\u2192\u0938\u0941\u0923\u0923\u094B | \u0938\u092E\u091D\u0928\u093E\u2192\u0938\u092E\u091D\u0923\u094B
\u0932\u0921\u093C\u0928\u093E\u2192\u0932\u0921\u093C\u0923\u094B | \u0939\u0901\u0938\u0928\u093E\u2192\u0939\u0901\u0938\u0923\u094B | \u0930\u094B\u0928\u093E\u2192\u0930\u094B\u0935\u0923\u094B | \u092D\u093E\u0917\u0928\u093E\u2192\u092D\u093E\u091C\u0923\u094B

PAST TENSE \u2014 critical, very different from Hindi (gender-marked):
\u0925\u093E   \u2192 \u0925\u094B (m) | \u0925\u0940 \u2192 \u0925\u0940 (f) | \u0925\u0947 \u2192 \u0925\u093E (pl)
\u0917\u092F\u093E  \u2192 \u0917\u092F\u094B (m)  | \u0917\u0908 \u2192 \u0917\u0908 (f)  | \u0917\u090F \u2192 \u0917\u092F\u093E (pl)
\u0915\u093F\u092F\u093E \u2192 \u0915\u093F\u092F\u094B (m) | \u0915\u0930\u0940 \u2192 \u0915\u0930\u0940 (f) | \u0915\u093F\u090F \u2192 \u0915\u093F\u092F\u093E (pl)
\u0906\u092F\u093E  \u2192 \u0906\u092F\u094B (m)  | \u0906\u0908 \u2192 \u0906\u0908 (f)  | \u0906\u090F \u2192 \u0906\u092F\u093E (pl)
\u0926\u0947\u0916\u093E \u2192 \u0926\u0947\u0916\u094D\u092F\u094B (m) | \u0926\u0947\u0916\u0940 \u2192 \u0926\u0947\u0916\u0940 (f)
\u092C\u094B\u0932\u093E \u2192 \u092C\u094B\u0932\u094D\u092F\u094B (m) | \u092C\u094B\u0932\u0940 \u2192 \u092C\u094B\u0932\u0940 (f)
\u0916\u093E\u092F\u093E \u2192 \u0916\u093E\u092F\u094B (m)  | \u0916\u093E\u0908 \u2192 \u0916\u093E\u0908 (f)
\u0939\u0941\u0906  \u2192 \u0939\u0941\u092F\u094B (m)  | \u0939\u0941\u0908 \u2192 \u0939\u0941\u0908 (f)
\u0930\u0939\u093E  \u2192 \u0930\u0939\u094D\u092F\u094B (m) | \u0930\u0939\u0940 \u2192 \u0930\u0939\u0940 (f)
Examples: "\u0935\u094B \u0917\u092F\u094B" (he went) | "\u0935\u093E \u0917\u0908" (she went) | "\u092E\u094D\u0939\u0948\u0902 \u0915\u093F\u092F\u094B" (I did)

FUTURE TENSE:
\u091C\u093E\u090A\u0901\u0917\u093E\u2192\u091C\u093E\u0938\u0942\u0902/\u091C\u093E\u090A\u0902\u0932\u094B | \u091C\u093E\u090F\u0917\u093E\u2192\u091C\u093E\u0935\u0947\u0932\u094B | \u0906\u090F\u0917\u093E\u2192\u0906\u0935\u0947\u0932\u094B
\u0915\u0930\u0942\u0901\u0917\u093E\u2192\u0915\u0930\u0938\u0942\u0902/\u0915\u0930\u0942\u0902\u0932\u094B | \u0939\u094B\u0917\u093E\u2192\u0939\u094B\u0935\u0947\u0932\u094B | \u0926\u0947\u0916\u0942\u0901\u0917\u093E\u2192\u0926\u0947\u0916\u0938\u0942\u0902

NEGATION: \u0928\u0939\u0940\u0902\u2192\u0915\u094B\u0928\u0940 | \u0928\u0939\u0940\u0902 \u0939\u0948\u2192\u0915\u094B\u0928\u0940 \u091B\u0947 | \u092E\u0924\u2192\u092E\u0924 | \u0928\u0939\u0940\u0902 \u0925\u093E\u2192\u0915\u094B\u0928\u0940 \u0925\u094B

QUESTION WORDS:
\u0915\u094D\u092F\u093E\u2192\u0915\u0947/\u0936\u093E | \u0915\u094D\u092F\u094B\u0902\u2192\u0915\u094D\u092F\u0942\u0902 | \u0915\u0948\u0938\u0947\u2192\u0915\u093F\u0902\u092F\u093E\u0902/\u0915\u093F\u092F\u093E\u0902 | \u0915\u092C\u2192\u0915\u0926 | \u0915\u0939\u093E\u0901\u2192\u0915\u0920\u0947/\u0915\u0920\u0948
\u0915\u094C\u0928\u2192\u0915\u0941\u0923 | \u0915\u093F\u0924\u0928\u093E\u2192\u0915\u093F\u0924\u094D\u0924\u094B | \u0915\u093F\u0938\u0915\u093E\u2192\u0915\u093F\u0923\u0930\u094B

COMMON WORDS:
\u092C\u0939\u0941\u0924\u2192\u0918\u0923\u094B (m)/\u0918\u0923\u0940 (f) | \u0905\u091A\u094D\u091B\u093E\u2192\u092C\u0922\u093C\u093F\u092F\u093E/\u0938\u093E\u0930\u094B | \u092C\u0941\u0930\u093E\u2192\u0916\u0930\u093E\u092C/\u092C\u0941\u0930\u094B
\u0905\u092D\u0940\u2192\u0905\u092C\u093E\u0930/\u0939\u093E\u0932\u0947 | \u092F\u0939\u093E\u0901\u2192\u0907\u0920\u0947/\u0907\u092F\u093E\u0902 | \u0935\u0939\u093E\u0901\u2192\u0909\u0920\u0947/\u0909\u092F\u093E\u0902
\u092C\u0921\u093C\u093E\u2192\u092E\u094B\u091F\u094B/\u092C\u0921\u093C\u094B | \u091B\u094B\u091F\u093E\u2192\u0928\u093E\u0928\u094B/\u091B\u094B\u091F\u094B | \u0925\u094B\u0921\u093C\u093E\u2192\u0925\u094B\u0921\u093C\u094B | \u0938\u092C\u2192\u0938\u0917\u0933\u093E
\u0918\u0930\u2192\u0918\u0930/\u0918\u0930\u093E\u0902 | \u0915\u093E\u092E\u2192\u0915\u093E\u092E | \u092C\u093E\u0924\u2192\u092C\u093E\u0924 | \u0932\u094B\u0917\u2192\u0932\u094B\u0917/\u092E\u093F\u0928\u0916
\u0906\u0926\u092E\u0940\u2192\u092E\u093F\u0928\u0916/\u092C\u0902\u0926\u094B | \u0914\u0930\u0924\u2192\u0932\u0941\u0917\u093E\u0908/\u092C\u093E\u0908 | \u092C\u091A\u094D\u091A\u093E\u2192\u091B\u094B\u0930\u094B (m)/\u091B\u094B\u0930\u0940 (f)
\u0926\u094B\u0938\u094D\u0924\u2192\u092D\u093E\u092F\u0932\u094B/\u0926\u094B\u0938\u094D\u0924 | \u092D\u093E\u0908\u2192\u092D\u093E\u0908/\u092D\u093E\u092F\u091C\u0940 | \u092A\u0948\u0938\u093E\u2192\u092A\u0907\u0938\u094B
\u092A\u093E\u0928\u0940\u2192\u092A\u093E\u0923\u0940 | \u0926\u093F\u0932\u2192\u0926\u093F\u0932

SENTENCE PATTERNS: \u091B\u0947 (\u0935\u094B \u0915\u0930\u0924\u093E \u091B\u0947) | \u0915\u094B\u0928\u0940 (\u0935\u094B \u0928\u0939\u0940\u0902 \u0915\u0930\u0924\u093E = \u0935\u094B \u0915\u0930\u0924\u093E \u0915\u094B\u0928\u0940)

FLAVOR (scatter naturally): \u0930\u093E\u092E \u0930\u093E\u092E \u0938\u093E, \u092D\u093E\u0908, \u092C\u093E\u0908, \u0939\u093E\u0901 \u092D\u093E\u0908, \u0915\u094B\u0928\u0940 \u092F\u093E\u0930, \u0918\u0923\u094B \u092C\u0922\u093C\u093F\u092F\u093E`,

  gujarati: `GUJARATI (Gujarati script \u2014 write ALL output in Gujarati script):

PRONOUNS: \u0AB9\u0AC1\u0A82 (I), \u0AAE\u0AA8\u0AC7 (me), \u0AAE\u0ABE\u0AB0\u0ACB/\u0AAE\u0ABE\u0AB0\u0AC0 (my), \u0AA4\u0AC1\u0A82 (you informal), \u0AA4\u0AAE\u0AC7 (you formal), \u0AA4\u0AC7/\u0A8F (he/she), \u0A86 (this), \u0A8F/\u0AAA\u0AC7\u0AB2\u0ACB (that)

VERBS (conjugations):
- \u0A9B\u0AC7 = is/are/am (ALL forms)
- \u0AB9\u0AA4\u0ACB/\u0AB9\u0AA4\u0AC0/\u0AB9\u0AA4\u0ABE = was/were
- \u0A9C\u0AB5\u0AC1\u0A82 = to go | \u0A9C\u0A89 (I go), \u0A9C\u0ABE (you go), \u0A9C\u0ABE\u0AAF (he/she goes), \u0A97\u0AAF\u0ACB/\u0A97\u0A88 (went)
- \u0A86\u0AB5\u0AB5\u0AC1\u0A82 = to come | \u0A86\u0AB5 (come), \u0A86\u0AB5\u0ACD\u0AAF\u0ACB/\u0A86\u0AB5\u0AC0 (came)
- \u0A95\u0AB0\u0AB5\u0AC1\u0A82 = to do | \u0A95\u0AB0 (do), \u0A95\u0AB0\u0AC7 (does), \u0A95\u0AB0\u0ACD\u0AAF\u0AC1\u0A82 (did)
- \u0A96\u0ABE\u0AB5\u0AC1\u0A82 = to eat | \u0A96\u0ABE (eat), \u0A96\u0ABE\u0AAF (eats), \u0A96\u0ABE\u0AA7\u0AC1\u0A82 (ate)
- \u0AAA\u0AC0\u0AB5\u0AC1\u0A82 = to drink | \u0AAA\u0AC0 (drink), \u0AAA\u0AC0\u0AB5\u0AC7 (drinks), \u0AAA\u0AC0\u0AA7\u0AC1\u0A82 (drank)
- \u0A9C\u0ACB\u0AB5\u0AC1\u0A82 = to see/watch | \u0A9C\u0ACB (see), \u0A9C\u0AC1\u0A93 (look), \u0A9C\u0ACB\u0AAF\u0AC1\u0A82 (saw)
- \u0AAC\u0ACB\u0AB2\u0AB5\u0AC1\u0A82 = to speak | \u0AAC\u0ACB\u0AB2 (speak), \u0AAC\u0ACB\u0AB2\u0AC7 (speaks), \u0AAC\u0ACB\u0AB2\u0ACD\u0AAF\u0ACB (spoke)
- \u0AB8\u0AC2\u0AB5\u0AC1\u0A82 = to sleep | \u0AB8\u0AC2 (sleep), \u0AB8\u0AC2\u0A88 \u0A9C\u0ABE (go to sleep)
- \u0AAC\u0AC7\u0AB8\u0AB5\u0AC1\u0A82 = to sit | \u0AAC\u0AC7\u0AB8 (sit), \u0AAC\u0AC7\u0AA0\u0ACB (sat)
- \u0A8A\u0AA0\u0AB5\u0AC1\u0A82 = to get up | \u0A8A\u0AA0 (get up), \u0A8A\u0AA0\u0ACD\u0AAF\u0ACB (got up)
- \u0AB0\u0AB9\u0AC7\u0AB5\u0AC1\u0A82 = to stay/live | \u0AB0\u0AB9\u0AC7 (stays), \u0AB0\u0AB9\u0ACD\u0AAF\u0ACB (stayed)
- \u0AAE\u0AB3\u0AB5\u0AC1\u0A82 = to meet | \u0AAE\u0AB3 (meet), \u0AAE\u0AB3\u0ACD\u0AAF\u0ACB (met)
- \u0AB2\u0AC7\u0AB5\u0AC1\u0A82 = to take | \u0AB2\u0AC7 (take), \u0AB2\u0AC0\u0AA7\u0AC1\u0A82 (took)
- \u0A86\u0AAA\u0AB5\u0AC1\u0A82 = to give | \u0A86\u0AAA (give), \u0A86\u0AAA\u0ACD\u0AAF\u0AC1\u0A82 (gave)
- \u0AB8\u0ABE\u0A82\u0AAD\u0AB3\u0AB5\u0AC1\u0A82 = to listen | \u0AB8\u0ABE\u0A82\u0AAD\u0AB3 (listen), \u0AB8\u0ABE\u0A82\u0AAD\u0AB3\u0ACD\u0AAF\u0AC1\u0A82 (heard)
- \u0A9A\u0ABE\u0AB2\u0AB5\u0AC1\u0A82 = to walk | \u0A9A\u0ABE\u0AB2 (walk), \u0A9A\u0ABE\u0AB2\u0ACD\u0AAF\u0ACB (walked)
- \u0AB9\u0AB8\u0AB5\u0AC1\u0A82 = to laugh | \u0AB9\u0AB8 (laugh), \u0AB9\u0AB8\u0ACD\u0AAF\u0ACB (laughed)
- \u0AB0\u0AA1\u0AB5\u0AC1\u0A82 = to cry | \u0AB0\u0AA1 (cry), \u0AB0\u0AA1\u0ACD\u0AAF\u0ACB (cried)
- \u0AB8\u0AAE\u0A9C\u0AB5\u0AC1\u0A82 = to understand | \u0AB8\u0AAE\u0A9C (understand), \u0AB8\u0AAE\u0A9C\u0ACD\u0AAF\u0ACB (understood)
- \u0AA5\u0AB5\u0AC1\u0A82 = to become | \u0AA5\u0A88 \u0A97\u0ACD\u0AAF\u0AC1\u0A82 (it happened), \u0AA5\u0AB6\u0AC7 (will happen)
- \u0A9C\u0ACB\u0A88\u0A8F = need/want | \u0AAE\u0AA8\u0AC7 \u0A9C\u0ACB\u0A88\u0A8F = I need
- \u0A97\u0AAE\u0AB5\u0AC1\u0A82 = to like | \u0A97\u0AAE\u0ACD\u0AAF\u0AC1\u0A82 (liked), \u0A97\u0AAE\u0AC7 (likes)

PAST TENSE patterns:
- masculine: -\u0AAF\u0ACB (\u0A97\u0AAF\u0ACB, \u0A86\u0AB5\u0ACD\u0AAF\u0ACB, \u0A95\u0AB0\u0ACD\u0AAF\u0ACB, \u0AAC\u0ACB\u0AB2\u0ACD\u0AAF\u0ACB)
- feminine: -\u0A88 (\u0A97\u0A88, \u0A86\u0AB5\u0AC0, \u0A95\u0AB0\u0AC0, \u0AAC\u0ACB\u0AB2\u0AC0)
- neuter: -\u0AAF\u0AC1\u0A82 (\u0A95\u0AB0\u0ACD\u0AAF\u0AC1\u0A82, \u0A96\u0ABE\u0AA7\u0AC1\u0A82, \u0AAA\u0AC0\u0AA7\u0AC1\u0A82, \u0A97\u0AAF\u0AC1\u0A82)
- plural: -\u0AAF\u0ABE (\u0A97\u0AAF\u0ABE, \u0A86\u0AB5\u0ACD\u0AAF\u0ABE)

FUTURE: verb + -\u0AB6\u0AC7/-\u0AB6\u0ACB/-\u0AB6\u0AC1\u0A82 (\u0A9C\u0A88\u0AB6=I'll go, \u0A9C\u0AB6\u0AC7=he'll go, \u0A95\u0AB0\u0AC0\u0AB6=I'll do, \u0A86\u0AB5\u0AB6\u0AC7=will come)

NEGATION: \u0AA8\u0AB9\u0AC0\u0A82 (NOT Devanagari "\u0928\u0939\u0940\u0902"), \u0AA8\u0ABE (no), \u0AA8\u0AA5\u0AC0 (is not)

QUESTION WORDS: \u0AB6\u0AC1\u0A82 (what), \u0A95\u0AC7\u0AAE (why), \u0A95\u0ACD\u0AAF\u0ABE\u0A82 (where), \u0A95\u0ACD\u0AAF\u0ABE\u0AB0\u0AC7 (when), \u0A95\u0ACB\u0AA3 (who), \u0A95\u0AC7\u0A9F\u0AB2\u0AC1\u0A82 (how much), \u0A95\u0AC7\u0AB5\u0AC0 \u0AB0\u0AC0\u0AA4\u0AC7 (how)

COMMON VOCABULARY:
Good: \u0AB8\u0ABE\u0AB0\u0AC1\u0A82/\u0AB8\u0ABE\u0AB0\u0ACB | Bad: \u0A96\u0AB0\u0ABE\u0AAC | Very: \u0A96\u0AC2\u0AAC/\u0A98\u0AA3\u0AC1\u0A82
Food: \u0A96\u0ABE\u0AB5\u0ABE\u0AA8\u0AC1\u0A82 | Water: \u0AAA\u0ABE\u0AA3\u0AC0 | House: \u0A98\u0AB0
Man: \u0AAE\u0ABE\u0AA3\u0AB8 | Woman: \u0AB8\u0ACD\u0AA4\u0ACD\u0AB0\u0AC0/\u0AAC\u0ABE\u0A88 | Child: \u0AAC\u0ABE\u0AB3\u0A95
Brother: \u0AAD\u0ABE\u0A88 | Sister: \u0AAC\u0AB9\u0AC7\u0AA8 | Friend: \u0AAE\u0ABF\u0AA4\u0ACD\u0AB0/\u0AA6\u0ACB\u0AB8\u0ACD\u0AA4
Now: \u0AB9\u0AB5\u0AC7 | Then: \u0AAA\u0A9B\u0AC0 | Today: \u0A86\u0A9C | Tomorrow: \u0A86\u0AB5\u0AA4\u0AC0 \u0A95\u0ABE\u0AB2
Here: \u0A85\u0AB9\u0AC0\u0A82 | There: \u0AA4\u0ACD\u0AAF\u0ABE\u0A82 | Always: \u0AB9\u0A82\u0AAE\u0AC7\u0AB6
Yes: \u0AB9\u0ABE | No: \u0AA8\u0ABE | Okay: \u0AA0\u0AC0\u0A95 | Really: \u0AB8\u0ABE\u0A9A\u0ACD\u0A9A\u0AC7
Beautiful: \u0AB8\u0AC1\u0A82\u0AA6\u0AB0 | Big: \u0AAE\u0ACB\u0A9F\u0ACB | Small: \u0AA8\u0ABE\u0AA8\u0ACB | New: \u0AA8\u0AB5\u0ACB
Work: \u0A95\u0ABE\u0AAE | Time: \u0AB8\u0AAE\u0AAF | Money: \u0AAA\u0AC8\u0AB8\u0ABE | Love: \u0AAA\u0ACD\u0AB0\u0AC7\u0AAE

FLAVOR WORDS (scatter naturally): \u0AAD\u0ABE\u0A88, \u0AAD\u0ABE\u0AAD\u0AC0, \u0A96\u0AB0\u0AC1\u0A82\u0AA8\u0AC7, \u0A9A\u0ABE\u0AB2, \u0A85\u0AB0\u0AC7, \u0A93 \u0AAD\u0ABE\u0A88, \u0A93 \u0AAC\u0AC7\u0AA8, \u0AB8\u0ABE\u0A9A\u0ACD\u0A9A\u0AC7

CRITICAL \u2014 NEVER write:
- Devanagari in output \u2014 write ENTIRE output in Gujarati script
- Hindi words mixed in`,

  marathi: `MARATHI (Devanagari) — authentic Marathi:

OUTPUT IN: Devanagari script. Natural, authentic Marathi.

PRONOUNS: मी (I), माझा/माझी/माझे (my), तू (you informal), तुम्ही (you formal), तो (he), ती (she), ते (they/it), आम्ही (we exclusive), आपण (we inclusive)

VERBS — Key conjugations:
- आहे = is (singular), आहेत = are (plural), होता/होती = was
- करतो/करते = does, केला/केली = did, करेल = will do
- जातो/जाते = goes, गेला/गेली = went, जाईल = will go
- येतो/येते = comes, आला/आली = came, येईल = will come
- बोलतो/बोलते = speaks, बोलला/बोलली = spoke

NEGATION: नाही (not), नको (don't want), नये (should not)

QUESTION WORDS: काय (what), का (why), कुठे (where), केव्हा (when), कोण (who), कसे/कसा (how), किती (how much)

COMMON WORDS: चांगले/छान (good), वाईट (bad), खूप (very), घर (house), पाणी (water), जेवण (food), माणूस (person), मुलगा/मुलगी (boy/girl), मित्र (friend), आज (today), उद्या (tomorrow)

FLAVOR (scatter naturally): अरे, बाई, ना, हो ना, काय सांगू, बरं का, च्यायला

CRITICAL:
- Write ENTIRE output in Marathi (Devanagari script)
- Do NOT mix Hindi grammar — Marathi has different verb endings
- Use ला/ला postposition (not को), ने/ने (not ने), चा/ची/चे (not का/की/के)
- Marathi uses आहे where Hindi uses है`,

  bengali: `BENGALI (Bengali script — write ALL output in Bengali script):

OUTPUT IN: Bengali script (বাংলা লিপি). NOT Devanagari.

PRONOUNS: আমি (I), আমার (my), তুমি (you informal), আপনি (you formal), সে/ও (he/she), তারা/ওরা (they), আমরা (we)

VERBS — Key conjugations:
- হয় = is, ছিল = was, হবে = will be
- করি/করো/করে = do, করলাম/করলে/করল = did, করব = will do
- যাই/যাও/যায় = go, গেলাম/গেলে/গেল = went, যাব = will go
- আসি/আসো/আসে = come, এলাম/এলে/এল = came, আসব = will come
- বলি/বলো/বলে = say, বললাম/বললে/বলল = said

NEGATION: না (not), নেই (is not/there isn't), নি (didn't — suffix)

QUESTION WORDS: কী/কি (what), কেন (why), কোথায় (where), কখন (when), কে (who), কেমন/কীভাবে (how), কত (how much)

COMMON WORDS: ভালো (good), খারাপ (bad), খুব (very), বাড়ি (house), জল/পানি (water), খাবার (food), মানুষ (person), ছেলে/মেয়ে (boy/girl), বন্ধু (friend), আজ (today), কাল (tomorrow)

FLAVOR (scatter naturally): আরে, ভাই, তাই না, কি বলো, যাও গে, আচ্ছা, ওরে বাবা, দাদা/দিদি

CRITICAL:
- Write ENTIRE output in Bengali script — NOT Devanagari
- Bengali has no gender in verbs (unlike Hindi)
- Use -টা/-টি for definite articles (বইটা = the book)
- Different verb endings from Hindi entirely`,

  punjabi: `PUNJABI (Gurmukhi script — write ALL output in Gurmukhi script):

OUTPUT IN: Gurmukhi script (ਗੁਰਮੁਖੀ). NOT Devanagari.

PRONOUNS: ਮੈਂ (I), ਮੇਰਾ/ਮੇਰੀ (my), ਤੂੰ (you informal), ਤੁਸੀਂ (you formal), ਉਹ (he/she/they), ਅਸੀਂ (we), ਇਹ (this), ਉਹ (that)

VERBS — Key conjugations:
- ਹੈ = is, ਸੀ = was, ਹੋਵੇਗਾ = will be
- ਕਰਦਾ/ਕਰਦੀ = does, ਕੀਤਾ/ਕੀਤੀ = did, ਕਰੇਗਾ = will do
- ਜਾਂਦਾ/ਜਾਂਦੀ = goes, ਗਿਆ/ਗਈ = went, ਜਾਵੇਗਾ = will go
- ਆਉਂਦਾ/ਆਉਂਦੀ = comes, ਆਇਆ/ਆਈ = came, ਆਵੇਗਾ = will come
- ਬੋਲਦਾ/ਬੋਲਦੀ = speaks, ਬੋਲਿਆ/ਬੋਲੀ = spoke

NEGATION: ਨਹੀਂ (not), ਨਾ (no/don't)

QUESTION WORDS: ਕੀ (what), ਕਿਉਂ (why), ਕਿੱਥੇ (where), ਕਦੋਂ (when), ਕੌਣ (who), ਕਿਵੇਂ (how), ਕਿੰਨਾ (how much)

COMMON WORDS: ਚੰਗਾ (good), ਮਾੜਾ (bad), ਬਹੁਤ (very), ਘਰ (house), ਪਾਣੀ (water), ਖਾਣਾ (food), ਬੰਦਾ (person), ਮੁੰਡਾ/ਕੁੜੀ (boy/girl), ਯਾਰ (friend), ਅੱਜ (today), ਕੱਲ੍ਹ (tomorrow)

FLAVOR (scatter naturally): ਯਾਰ, ਵੀਰੇ, ਪਾਜੀ, ਓਏ, ਕੀ ਹਾਲ, ਬੱਲੇ ਬੱਲੇ, ਸੱਚੀ, ਚੱਲ, ਫਿੱਟੇ ਮੂੰਹ

CRITICAL:
- Write ENTIRE output in Gurmukhi script — NOT Devanagari
- Punjabi uses ਦਾ/ਦੀ/ਦੇ (not का/की/के)
- Use authentic Punjabi expressions and vocabulary`,

  tamil: `TAMIL (Tamil script — write ALL output in Tamil script):

OUTPUT IN: Tamil script (தமிழ் எழுத்து). NOT Devanagari or Latin.

PRONOUNS: நான் (I), என்/என்னுடைய (my), நீ (you informal), நீங்கள் (you formal), அவன் (he), அவள் (she), அவர்கள் (they), நாங்கள்/நாம் (we)

VERBS — Key conjugations:
- இருக்கிறது = is, இருந்தது = was, இருக்கும் = will be
- செய்கிறேன்/செய்கிறான் = do/does, செய்தேன்/செய்தான் = did, செய்வேன் = will do
- போகிறேன் = going, போனேன் = went, போவேன் = will go
- வருகிறேன் = coming, வந்தேன் = came, வருவேன் = will come
- சொல்கிறேன் = saying, சொன்னேன் = said, சொல்வேன் = will say

NEGATION: இல்லை (not/no), மாட்டேன் (won't), வேண்டாம் (don't want)

QUESTION WORDS: என்ன (what), ஏன் (why), எங்கே (where), எப்போது (when), யார் (who), எப்படி (how), எவ்வளவு (how much)

COMMON WORDS: நல்ல (good), கெட்ட (bad), மிகவும் (very), வீடு (house), தண்ணீர் (water), சாப்பாடு (food), மனிதன் (person), நண்பன்/நண்பி (friend), இன்று (today), நாளை (tomorrow)

FLAVOR (scatter naturally): டா, டீ, மச்சான், தம்பி, அக்கா, போடா, வாடா, சரி, ஆமா

CRITICAL:
- Write ENTIRE output in Tamil script — NOT Devanagari
- Tamil is agglutinative — suffixes attach to verb stems
- Tamil has no gender distinction in plural
- Respect the formal/informal pronoun distinction (நீ vs நீங்கள்)`,

  telugu: `TELUGU (Telugu script — write ALL output in Telugu script):

OUTPUT IN: Telugu script (తెలుగు లిపి). NOT Devanagari or Latin.

PRONOUNS: నేను (I), నా/నాకు (my/me), నీవు/నువ్వు (you informal), మీరు (you formal), అతను (he), ఆమె (she), వాళ్ళు (they), మేము/మనం (we)

VERBS — Key conjugations:
- ఉంది = is, ఉంటుంది = will be, ఉన్నది = was
- చేస్తాను/చేస్తాడు = do/does, చేశాను/చేశాడు = did, చేస్తాను = will do
- వెళ్తాను = going, వెళ్ళాను = went, వెళ్తాను = will go
- వస్తాను = coming, వచ్చాను = came, వస్తాను = will come
- చెప్తాను = saying, చెప్పాను = said, చెప్తాను = will say

NEGATION: కాదు (is not), లేదు (not/there isn't), వద్దు (don't)

QUESTION WORDS: ఏమిటి/ఏంటి (what), ఎందుకు (why), ఎక్కడ (where), ఎప్పుడు (when), ఎవరు (who), ఎలా (how), ఎంత (how much)

COMMON WORDS: మంచి (good), చెడ్డ (bad), చాలా (very), ఇల్లు (house), నీళ్ళు (water), భోజనం (food), మనిషి (person), స్నేహితుడు (friend), ఈరోజు (today), రేపు (tomorrow)

FLAVOR (scatter naturally): రా, రోయ్, బాబు, అన్నా, అక్కా, ఏంటి, ఒరేయ్, మరి, అవునా

CRITICAL:
- Write ENTIRE output in Telugu script — NOT Devanagari
- Telugu is agglutinative — verb endings change based on person/number/gender
- Use natural Telugu sentence structure (SOV order)`,

  kannada: `KANNADA (Kannada script — write ALL output in Kannada script):

OUTPUT IN: Kannada script (ಕನ್ನಡ ಲಿಪಿ). NOT Devanagari or Latin.

PRONOUNS: ನಾನು (I), ನನ್ನ (my), ನೀನು (you informal), ನೀವು (you formal), ಅವನು (he), ಅವಳು (she), ಅವರು (they), ನಾವು (we)

VERBS — Key conjugations:
- ಇದೆ = is, ಇತ್ತು = was, ಇರುತ್ತದೆ = will be
- ಮಾಡುತ್ತೇನೆ = I do, ಮಾಡಿದೆ = did, ಮಾಡುವೆ = will do
- ಹೋಗುತ್ತೇನೆ = going, ಹೋದೆ = went, ಹೋಗುವೆ = will go
- ಬರುತ್ತೇನೆ = coming, ಬಂದೆ = came, ಬರುವೆ = will come

NEGATION: ಇಲ್ಲ (not), ಬೇಡ (don't want), ಆಗುವುದಿಲ್ಲ (won't happen)

QUESTION WORDS: ಏನು (what), ಯಾಕೆ (why), ಎಲ್ಲಿ (where), ಯಾವಾಗ (when), ಯಾರು (who), ಹೇಗೆ (how), ಎಷ್ಟು (how much)

COMMON WORDS: ಒಳ್ಳೆಯ (good), ಕೆಟ್ಟ (bad), ತುಂಬಾ (very), ಮನೆ (house), ನೀರು (water), ಊಟ (food), ಮನುಷ್ಯ (person), ಗೆಳೆಯ (friend), ಇಂದು (today), ನಾಳೆ (tomorrow)

FLAVOR: ಮಗಾ, ಗುರೂ, ಏನಪ್ಪಾ, ಲೋ, ಹೌದಾ, ಬಾರೋ, ಅಲ್ವಾ

CRITICAL:
- Write ENTIRE output in Kannada script — NOT Devanagari
- Kannada is agglutinative with gender/number agreement
- Use natural Kannada sentence structure (SOV)`,

  malayalam: `MALAYALAM (Malayalam script — write ALL output in Malayalam script):

OUTPUT IN: Malayalam script (മലയാളം ലിപി). NOT Devanagari or Latin.

PRONOUNS: ഞാൻ (I), എന്റെ (my), നീ (you informal), നിങ്ങൾ (you formal), അവൻ (he), അവൾ (she), അവർ (they), ഞങ്ങൾ/നമ്മൾ (we)

VERBS — Key conjugations:
- ആണ് = is, ആയിരുന്നു = was, ആയിരിക്കും = will be
- ചെയ്യുന്നു = does, ചെയ്തു = did, ചെയ്യും = will do
- പോകുന്നു = goes, പോയി = went, പോകും = will go
- വരുന്നു = comes, വന്നു = came, വരും = will come

NEGATION: ഇല്ല (not), വേണ്ട (don't want), അല്ല (is not)

QUESTION WORDS: എന്ത് (what), എന്തുകൊണ്ട് (why), എവിടെ (where), എപ്പോൾ (when), ആര് (who), എങ്ങനെ (how), എത്ര (how much)

COMMON WORDS: നല്ല (good), മോശം (bad), വളരെ (very), വീട് (house), വെള്ളം (water), ഭക്ഷണം (food), മനുഷ്യൻ (person), സുഹൃത്ത് (friend), ഇന്ന് (today), നാളെ (tomorrow)

FLAVOR: മച്ചാനേ, ചേട്ടാ, ചേച്ചി, എടാ, എടി, അല്ലേ, പിന്നെ, ശരി

CRITICAL:
- Write ENTIRE output in Malayalam script — NOT Devanagari
- Malayalam has unique conjunct consonants
- Use natural Malayalam sentence structure`,

  odia: `ODIA (Odia script — write ALL output in Odia script):

OUTPUT IN: Odia script (ଓଡ଼ିଆ ଲିପି). NOT Devanagari or Latin.

PRONOUNS: ମୁଁ (I), ମୋର (my), ତୁ (you informal), ଆପଣ (you formal), ସେ (he/she), ସେମାନେ (they), ଆମେ (we)

VERBS — Key conjugations:
- ଅଛି = is, ଥିଲା = was, ହେବ = will be
- କରୁଛି = doing, କଲା = did, କରିବ = will do
- ଯାଉଛି = going, ଗଲା = went, ଯିବ = will go
- ଆସୁଛି = coming, ଆସିଲା = came, ଆସିବ = will come

NEGATION: ନାହିଁ (not), ନୁହେଁ (is not)

QUESTION WORDS: କ'ଣ (what), କାହିଁକି (why), କେଉଁଠି (where), କେବେ (when), କିଏ (who), କେମିତି (how), କେତେ (how much)

COMMON WORDS: ଭଲ (good), ଖରାପ (bad), ବହୁତ (very), ଘର (house), ପାଣି (water), ଖାଦ୍ୟ (food), ମଣିଷ (person), ସାଥୀ (friend), ଆଜି (today), ଆସନ୍ତାକାଲି (tomorrow)

FLAVOR: ଭାଇ, ଅପା, ହଁ, ନା, ଆଉ, ତ, ମୁଁ କହିଲି

CRITICAL:
- Write ENTIRE output in Odia script — NOT Devanagari
- Odia has rounded letterforms distinct from other scripts
- Use natural Odia sentence structure`,

  assamese: `ASSAMESE (Assamese/Bengali script — write ALL output in Assamese script):

OUTPUT IN: Assamese script (অসমীয়া লিপি). Similar to Bengali but with distinct characters.

PRONOUNS: মই (I), মোৰ (my), তুমি (you informal), আপুনি (you formal), সি/তেওঁ (he/she), সিহঁত (they), আমি (we)

VERBS — Key conjugations:
- হয় = is, আছিল = was, হ'ব = will be
- কৰোঁ = do, কৰিলোঁ = did, কৰিম = will do
- যাওঁ = go, গ'লোঁ = went, যাম = will go
- আহোঁ = come, আহিলোঁ = came, আহিম = will come

NEGATION: নাই (not), নহয় (is not)

QUESTION WORDS: কি (what), কিয় (why), ক'ত (where), কেতিয়া (when), কোন (who), কেনেকৈ (how), কিমান (how much)

COMMON WORDS: ভাল (good), বেয়া (bad), বহুত (very), ঘৰ (house), পানী (water), খাদ্য (food), মানুহ (person), বন্ধু (friend), আজি (today), কাইলৈ (tomorrow)

FLAVOR: দাদা, বাইদেউ, হয়নে, অ', আৰে, হেৰা

CRITICAL:
- Write ENTIRE output in Assamese script
- Assamese uses ৰ (ro) and ৱ (wo) which are distinct from Bengali
- Use natural Assamese sentence structure`,

  urdu: `URDU (Nastaliq/Arabic script — write ALL output in Urdu script):

OUTPUT IN: Urdu script (اردو). NOT Devanagari or Latin.

PRONOUNS: میں (I), میرا/میری (my), تم (you informal), آپ (you formal), وہ (he/she/they), ہم (we)

VERBS — Key conjugations:
- ہے = is, تھا/تھی = was, ہوگا = will be
- کرتا/کرتی = does, کیا/کی = did, کرے گا = will do
- جاتا/جاتی = goes, گیا/گئی = went, جائے گا = will go
- آتا/آتی = comes, آیا/آئی = came, آئے گا = will come

NEGATION: نہیں (not), مت (don't), نا (no)

QUESTION WORDS: کیا (what), کیوں (why), کہاں (where), کب (when), کون (who), کیسے (how), کتنا (how much)

COMMON WORDS: اچھا (good), برا (bad), بہت (very), گھر (house), پانی (water), کھانا (food), انسان (person), دوست (friend), آج (today), کل (tomorrow)

FLAVOR: جناب, یار, بھائی, ارے, واہ, خیر, بس

CRITICAL:
- Write ENTIRE output in Urdu script (right-to-left)
- Use proper Nastaliq forms
- Preserve Urdu literary vocabulary where appropriate
- Do NOT write in Devanagari or Roman Urdu`,
};

/* --- Few-shot examples for each dialect --- */
const FEW_SHOT_EXAMPLES = {
  bhojpuri: [
    { role: "user", content: "\u092E\u0948\u0902 \u092C\u0939\u0941\u0924 \u0916\u0941\u0936 \u0939\u0942\u0901 \u0915\u094D\u092F\u094B\u0902\u0915\u093F \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948\u0964 \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964" },
    { role: "assistant", content: "\u0939\u092E \u092C\u0939\u0941\u0924\u0947 \u0916\u0941\u0936 \u092C\u093E\u0928\u0940 \u0915\u093E\u0939\u0947 \u0915\u093F \u0906\u091C \u0939\u092E\u093E\u0930 \u092F\u093E\u0930 \u0906\u0907\u0932 \u092C\u093E\u0964 \u0939\u092E\u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925\u0947 \u0916\u093E\u0928\u093E \u0916\u093E\u0907\u092C\u0964" },
    { role: "user", content: "\u0935\u094B \u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E \u0906\u0926\u092E\u0940 \u0939\u0948 \u0932\u0947\u0915\u093F\u0928 \u0909\u0938\u0915\u0940 \u092C\u0940\u0935\u0940 \u0915\u094B \u0915\u094B\u0908 \u0928\u0939\u0940\u0902 \u091C\u093E\u0928\u0924\u093E\u0964 \u0935\u094B \u0915\u0939\u093E\u0901 \u0917\u092F\u093E?" },
    { role: "assistant", content: "\u090A \u092C\u0939\u0941\u0924\u0947 \u0928\u0940\u092E\u0928 \u092E\u0930\u0926 \u092C\u093E \u0932\u0947\u0915\u093F\u0928 \u0913\u0915\u0930 \u092E\u0947\u0939\u0930\u093E\u0930\u0942 \u0915\u0947 \u0915\u0947\u0939\u0942 \u0928\u093E\u0939\u0940\u0902 \u091C\u093E\u0928\u0924 \u092C\u093E\u0964 \u090A \u0915\u0939\u093E\u0901 \u0917\u0907\u0932?" },
  ],
  haryanvi: [
    { role: "user", content: "\u092E\u0948\u0902 \u092C\u0939\u0941\u0924 \u0916\u0941\u0936 \u0939\u0942\u0901 \u0915\u094D\u092F\u094B\u0902\u0915\u093F \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948\u0964 \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964" },
    { role: "assistant", content: "\u092E\u094D\u0939\u0948\u0902 \u0918\u0923\u093E \u0916\u0941\u0936 \u0938\u0942\u0902 \u0915\u094D\u092F\u0942\u0902\u0915\u093F \u0906\u091C \u092E\u094D\u0939\u093E\u0930\u093E \u092F\u093E\u0930 \u0906\u092F\u093E \u0938\u0948\u0964 \u092E\u094D\u0939\u093E\u0902 \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u0916\u093E\u0923\u093E \u0916\u093E\u0935\u093E\u0902\u0917\u0947\u0964" },
    { role: "user", content: "\u0935\u094B \u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E \u0906\u0926\u092E\u0940 \u0939\u0948 \u0932\u0947\u0915\u093F\u0928 \u0909\u0938\u0915\u0940 \u092C\u0940\u0935\u0940 \u0915\u094B \u0915\u094B\u0908 \u0928\u0939\u0940\u0902 \u091C\u093E\u0928\u0924\u093E\u0964 \u0935\u094B \u0915\u0939\u093E\u0901 \u0917\u092F\u093E?" },
    { role: "assistant", content: "\u0935\u094B \u0918\u0923\u093E \u092C\u0922\u093C\u093F\u092F\u093E \u092C\u0902\u0926\u093E \u0938\u0948 \u0932\u0947\u0915\u093F\u0928 \u0909\u0938\u0915\u0940 \u0932\u0941\u0917\u093E\u0908 \u0928\u0948 \u0915\u094B\u090F \u0928\u093E \u091C\u093E\u0923\u0948\u0964 \u0935\u094B \u0915\u0921\u093C\u0948 \u0917\u092F\u093E?" },
  ],
  rajasthani: [
    { role: "user", content: "\u092E\u0948\u0902 \u092C\u0939\u0941\u0924 \u0916\u0941\u0936 \u0939\u0942\u0901 \u0915\u094D\u092F\u094B\u0902\u0915\u093F \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948\u0964 \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964" },
    { role: "assistant", content: "\u092E\u094D\u0939\u0948\u0902 \u0918\u0923\u094B \u0916\u0941\u0936 \u091B\u0942\u0902 \u0915\u094D\u092F\u0942\u0902\u0915\u093F \u0906\u091C \u092E\u094D\u0939\u093E\u0930\u094B \u092D\u093E\u092F\u0932\u094B \u0906\u092F\u094B \u091B\u0947\u0964 \u092E\u094D\u0939\u0947 \u0926\u094B\u0928\u0942\u0902 \u0938\u093E\u0925\u0948 \u0916\u093E\u0935\u0923\u094B \u091B\u0947\u0964" },
    { role: "user", content: "\u0935\u094B \u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E \u0906\u0926\u092E\u0940 \u0939\u0948 \u0932\u0947\u0915\u093F\u0928 \u0909\u0938\u0915\u0940 \u092C\u0940\u0935\u0940 \u0915\u094B \u0915\u094B\u0908 \u0928\u0939\u0940\u0902 \u091C\u093E\u0928\u0924\u093E\u0964 \u0935\u094B \u0915\u0939\u093E\u0901 \u0917\u092F\u093E?" },
    { role: "assistant", content: "\u0935\u094B \u0918\u0923\u094B \u0938\u093E\u0930\u094B \u092E\u093F\u0928\u0916 \u091B\u0947 \u092A\u0923 \u0909\u0923\u0930\u0940 \u0932\u0941\u0917\u093E\u0908 \u0928\u0948 \u0915\u094B\u0908 \u0915\u094B\u0928\u0940 \u091C\u093E\u0923\u0947\u0964 \u0935\u094B \u0915\u0920\u0947 \u0917\u092F\u094B?" },
  ],
  gujarati: [
    { role: "user", content: "\u092E\u0948\u0902 \u092C\u0939\u0941\u0924 \u0916\u0941\u0936 \u0939\u0942\u0901 \u0915\u094D\u092F\u094B\u0902\u0915\u093F \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948\u0964 \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964" },
    { role: "assistant", content: "\u0AB9\u0AC1\u0A82 \u0A96\u0AC2\u0AAC \u0A96\u0AC1\u0AB6 \u0A9B\u0AC1\u0A82 \u0A95\u0ABE\u0AB0\u0AA3 \u0A95\u0AC7 \u0A86\u0A9C\u0AC7 \u0AAE\u0ABE\u0AB0\u0ACB \u0AA6\u0ACB\u0AB8\u0ACD\u0AA4 \u0A86\u0AB5\u0ACD\u0AAF\u0ACB \u0A9B\u0AC7. \u0A85\u0AAE\u0AC7 \u0AAC\u0A82\u0AA8\u0AC7 \u0AB8\u0ABE\u0AA5\u0AC7 \u0A9C\u0AAE\u0AC0\u0AB6\u0AC1\u0A82." },
    { role: "user", content: "\u0935\u094B \u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E \u0906\u0926\u092E\u0940 \u0939\u0948 \u0932\u0947\u0915\u093F\u0928 \u0909\u0938\u0915\u0940 \u092C\u0940\u0935\u0940 \u0915\u094B \u0915\u094B\u0908 \u0928\u0939\u0940\u0902 \u091C\u093E\u0928\u0924\u093E\u0964 \u0935\u094B \u0915\u0939\u093E\u0901 \u0917\u092F\u093E?" },
    { role: "assistant", content: "\u0A8F \u0A96\u0AC2\u0AAC \u0AB8\u0ABE\u0AB0\u0ACB \u0AAE\u0ABE\u0AA3\u0AB8 \u0A9B\u0AC7 \u0AAA\u0AA3 \u0A8F\u0AA8\u0AC0 \u0AB5\u0ABE\u0A88\u0AAB\u0AA8\u0AC7 \u0A95\u0ACB\u0A88 \u0AA8\u0AA5\u0AC0 \u0A93\u0AB3\u0A96\u0AA4\u0AC1\u0A82. \u0A8F \u0A95\u0ACD\u0AAF\u0ABE\u0A82 \u0A97\u0AAF\u0ACB?" },
  ],
  hindi: [
    { role: "user", content: "bhai aaj mera dost aaya hai, hum dono saath me khaana khayenge. bahut maza aayega." },
    { role: "assistant", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
  ],
  english: [
    { role: "user", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
    { role: "assistant", content: "Bro, my friend came over today \u2014 we're both gonna eat together. It's gonna be a blast." },
  ],
  marathi: [
    { role: "user", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
    { role: "assistant", content: "\u0905\u0930\u0947 \u092F\u093E\u0930, \u0906\u091C \u092E\u093E\u091D\u093E \u092E\u093F\u0924\u094D\u0930 \u0906\u0932\u093E \u0906\u0939\u0947, \u0906\u092E\u094D\u0939\u0940 \u0926\u094B\u0918\u0947 \u092E\u093F\u0933\u0942\u0928 \u091C\u0947\u0935\u0923\u093E\u0930 \u0906\u0939\u094B\u0924. \u092D\u093E\u0930\u0940 \u092E\u091C\u093E \u092F\u0947\u0923\u093E\u0930!" },
  ],
  bengali: [
    { role: "user", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
    { role: "assistant", content: "\u0986\u09B0\u09C7 \u09AD\u09BE\u0987, \u0986\u099C \u0986\u09AE\u09BE\u09B0 \u09AC\u09A8\u09CD\u09A7\u09C1 \u098F\u09B8\u09C7\u099B\u09C7, \u0986\u09AE\u09B0\u09BE \u09A6\u09C1\u099C\u09A8\u09C7 \u098F\u0995\u09B8\u09BE\u09A5\u09C7 \u0996\u09BE\u09AC\u09CB\u0964 \u0996\u09C1\u09AC \u09AE\u099C\u09BE \u09B9\u09AC\u09C7!" },
  ],
  punjabi: [
    { role: "user", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
    { role: "assistant", content: "\u0A13\u0A2F\u0A47 \u0A2F\u0A3E\u0A30, \u0A05\u0A71\u0A1C \u0A2E\u0A47\u0A30\u0A3E \u0A26\u0A4B\u0A38\u0A24 \u0A06\u0A07\u0A06 \u0A39\u0A48, \u0A05\u0A38\u0A40\u0A02 \u0A26\u0A4B\u0A35\u0A47\u0A02 \u0A07\u0A15\u0A71\u0A20\u0A47 \u0A16\u0A3E\u0A23\u0A3E \u0A16\u0A3E\u0A35\u0A3E\u0A02\u0A17\u0A47\u0964 \u0A2C\u0A39\u0A41\u0A24 \u0A2E\u0A1C\u0A3C\u0A3E \u0A06\u0A0A\u0A17\u0A3E!" },
  ],
  tamil: [
    { role: "user", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
    { role: "assistant", content: "\u0BAE\u0B9A\u0BCD\u0B9A\u0BBE\u0BA9\u0BCD, \u0B87\u0BA9\u0BCD\u0BA9\u0BBF\u0B95\u0BCD\u0B95\u0BC1 \u0B8E\u0BA9\u0BCD \u0BA8\u0BA3\u0BCD\u0BAA\u0BA9\u0BCD \u0BB5\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BBE\u0BA9\u0BCD, \u0BA8\u0BBE\u0BAE \u0BB0\u0BA3\u0BCD\u0B9F\u0BC1 \u0BAA\u0BC7\u0BB0\u0BC1\u0BAE\u0BCD \u0B92\u0BA3\u0BCD\u0BA3\u0BBE \u0B9A\u0BBE\u0BAA\u0BCD\u0BAA\u0BBF\u0B9F\u0BAA\u0BCD \u0BAA\u0BCB\u0BB1\u0BCB\u0BAE\u0BCD. \u0BB0\u0BCA\u0BAE\u0BCD\u0BAA \u0B8E\u0BA9\u0BCD\u0B9C\u0BBE\u0BAF\u0BCD \u0BAA\u0BA3\u0BCD\u0BA3\u0BB2\u0BBE\u0BAE\u0BCD!" },
  ],
  telugu: [
    { role: "user", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
    { role: "assistant", content: "\u0C2E\u0C3E\u0C1A\u0C3F, \u0C08\u0C30\u0C4B\u0C1C\u0C41 \u0C28\u0C3E \u0C2B\u0C4D\u0C30\u0C46\u0C02\u0C21\u0C4D \u0C35\u0C1A\u0C4D\u0C1A\u0C3E\u0C21\u0C41, \u0C2E\u0C47\u0C2E\u0C41 \u0C07\u0C26\u0C4D\u0C26\u0C30\u0C42 \u0C15\u0C32\u0C3F\u0C38\u0C3F \u0C24\u0C3F\u0C28\u0C26\u0C3E\u0C02. \u0C1A\u0C3E\u0C32\u0C3E \u0C2E\u0C1C\u0C3E \u0C35\u0C38\u0C4D\u0C24\u0C41\u0C02\u0C26\u0C3F!" },
  ],
  kannada: [
    { role: "user", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
    { role: "assistant", content: "\u0CAE\u0C97\u0CBE, \u0C87\u0CB5\u0CA4\u0CCD\u0CA4\u0CC1 \u0CA8\u0CA8\u0CCD\u0CA8 \u0C97\u0CC6\u0CB3\u0CC6\u0CAF \u0CAC\u0C82\u0CA6\u0CBF\u0CA6\u0CCD\u0CA6\u0CBE\u0CA8\u0CC6, \u0CA8\u0CBE\u0CB5\u0CC1 \u0C87\u0CAC\u0CCD\u0CAC\u0CB0\u0CC2 \u0C92\u0CA3\u0CCD\u0CA3\u0CBE\u0C97\u0CBF \u0CA4\u0CBF\u0CA8\u0CCD\u0CA4\u0CC0\u0CB5\u0CBF. \u0CA4\u0CC1\u0C82\u0CAC\u0CBE \u0CAE\u0C9C\u0CBE \u0CAC\u0CB0\u0CC1\u0CA4\u0CCD\u0CA4\u0CC6!" },
  ],
  malayalam: [
    { role: "user", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
    { role: "assistant", content: "\u0D2E\u0D1A\u0D4D\u0D1A\u0D3E\u0D28\u0D47, \u0D07\u0D28\u0D4D\u0D28\u0D4D \u0D0E\u0D28\u0D4D\u0D31\u0D46 \u0D15\u0D42\u0D1F\u0D4D\u0D1F\u0D41\u0D15\u0D3E\u0D30\u0D28\u0D4D \u0D35\u0D28\u0D4D\u0D28\u0D3F\u0D1F\u0D4D\u0D1F\u0D41\u0D23\u0D4D\u0D1F\u0D4D, \u0D28\u0D2E\u0D4D\u0D2E\u0D33\u0D4D \u0D30\u0D23\u0D4D\u0D1F\u0D41\u0D2A\u0D47\u0D30\u0D41\u0D02 \u0D12\u0D23\u0D4D\u0D23\u0D3F\u0D1A\u0D4D\u0D1A\u0D4D \u0D15\u0D34\u0D3F\u0D15\u0D4D\u0D15\u0D3E\u0D02. \u0D28\u0D32\u0D4D\u0D32 \u0D0E\u0D28\u0D4D\u200D\u0D1C\u0D4B\u0D2F\u0D4D \u0D06\u0D15\u0D41\u0D02!" },
  ],
  odia: [
    { role: "user", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
    { role: "assistant", content: "\u0B2D\u0B3E\u0B07, \u0B06\u0B1C\u0B3F \u0B2E\u0B4B\u0B30 \u0B2C\u0B28\u0B4D\u0B27\u0B41 \u0B06\u0B38\u0B3F\u0B1B\u0B3F, \u0B06\u0B2E\u0B47 \u0B26\u0B41\u0B39\u0B47\u0B01 \u0B0F\u0B15\u0B3E \u0B38\u0B3E\u0B19\u0B4D\u0B17\u0B30\u0B47 \u0B16\u0B3E\u0B07\u0B2C\u0B3E\u0964 \u0B2C\u0B39\u0B41\u0B24 \u0B2E\u0B1C\u0B3E \u0B39\u0B47\u0B2C!" },
  ],
  assamese: [
    { role: "user", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
    { role: "assistant", content: "\u09A6\u09BE\u09A6\u09BE, \u0986\u099C\u09BF \u09AE\u09CB\u09F0 \u09AC\u09A8\u09CD\u09A7\u09C1 \u0986\u09B9\u09BF\u099B\u09C7, \u0986\u09AE\u09BF \u09A6\u09C1\u09AF\u09BC\u09CB\u099C\u09A8\u09C7 \u09B2\u0997\u09A4\u09C7 \u0996\u09BE\u09AE\u0964 \u09AC\u09B9\u09C1\u09A4 \u09AE\u099C\u09BE \u09B9'\u09AC!" },
  ],
  urdu: [
    { role: "user", content: "\u092D\u093E\u0908 \u0906\u091C \u092E\u0947\u0930\u093E \u0926\u094B\u0938\u094D\u0924 \u0906\u092F\u093E \u0939\u0948, \u0939\u092E \u0926\u094B\u0928\u094B\u0902 \u0938\u093E\u0925 \u092E\u0947\u0902 \u0916\u093E\u0928\u093E \u0916\u093E\u090F\u0902\u0917\u0947\u0964 \u092C\u0939\u0941\u0924 \u092E\u091C\u093C\u093E \u0906\u090F\u0917\u093E\u0964" },
    { role: "assistant", content: "\u06CC\u0627\u0631\u060C \u0622\u062C \u0645\u06CC\u0631\u0627 \u062F\u0648\u0633\u062A \u0622\u06CC\u0627 \u06C1\u06D2\u060C \u06C1\u0645 \u062F\u0648\u0646\u0648\u06BA \u0633\u0627\u062A\u06BE \u0645\u0644 \u06A9\u0631 \u06A9\u06BE\u0646\u0627 \u06A9\u06BE\u0626\u06CC\u06BA \u06AF\u06D2\u06D4 \u0628\u06C1\u062A \u0645\u0632\u06C1 \u0622\u0626\u06D2 \u06AF\u0627!" },
  ],
};

/* --- Contrastive reference for confusable dialects --- */
const CONTRASTIVE_TABLE = `
=== CRITICAL: Same sentences in each dialect \u2014 study the differences ===

Hindi: \u0935\u094B \u0905\u091A\u094D\u091B\u093E \u0906\u0926\u092E\u0940 \u0939\u0948\u0964 \u092E\u0948\u0902 \u0935\u0939\u093E\u0901 \u0928\u0939\u0940\u0902 \u091C\u093E\u090A\u0901\u0917\u093E\u0964
Bhojpuri: \u090A \u0928\u0940\u092E\u0928 \u092E\u0930\u0926 \u092C\u093E\u0964 \u0939\u092E \u0909\u0939\u093E\u0901 \u0928\u093E\u0939\u0940\u0902 \u091C\u093E\u0907\u092C\u0964
Haryanvi: \u0935\u094B \u092C\u0922\u093C\u093F\u092F\u093E \u092C\u0902\u0926\u093E \u0938\u0948\u0964 \u092E\u094D\u0939\u0948\u0902 \u0935\u093E\u0902 \u0928\u093E \u091C\u093E\u0935\u093E\u0902\u0917\u093E\u0964
Rajasthani: \u0935\u094B \u0938\u093E\u0930\u094B \u092E\u093F\u0928\u0916 \u091B\u0947\u0964 \u092E\u094D\u0939\u0948\u0902 \u0909\u0920\u0947 \u0915\u094B\u0928\u0940 \u091C\u093E\u0938\u0942\u0902\u0964

Hindi: \u092E\u0948\u0902 \u0915\u093E\u092E \u0915\u0930 \u0930\u0939\u093E \u0939\u0942\u0901\u0964 \u0935\u0947 \u0932\u094B\u0917 \u0906 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964
Bhojpuri: \u0939\u092E \u0915\u093E\u092E \u0915\u0930\u0924 \u092C\u093E\u0928\u0940\u0964 \u0909 \u0932\u094B\u0917 \u0906\u0935\u0924 \u092C\u093E\u0921\u093C\u0928\u0964
Haryanvi: \u092E\u094D\u0939\u0948\u0902 \u0915\u093E\u092E \u0915\u0930\u0924\u093E \u0938\u0942\u0902\u0964 \u0935\u0947 \u0932\u094B\u0917 \u0906\u0924\u0947 \u0938\u0948\u0902\u0964
Rajasthani: \u092E\u094D\u0939\u0948\u0902 \u0915\u093E\u092E \u0915\u0930\u0924\u093E \u091B\u0942\u0902\u0964 \u0935\u0947 \u0932\u094B\u0917 \u0906\u0935\u0947 \u091B\u0947\u0964

Hindi: \u092F\u0939 \u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E \u0939\u0948\u0964 \u0909\u0938\u0928\u0947 \u0915\u094D\u092F\u093E \u0915\u093F\u092F\u093E?
Bhojpuri: \u0908 \u092C\u0939\u0941\u0924\u0947 \u0928\u0940\u092E\u0928 \u092C\u093E\u0964 \u0913\u0915\u0930\u093E \u0915\u093E \u0915\u0907\u0932?
Haryanvi: \u092F\u093E \u0918\u0923\u093E \u092C\u0922\u093C\u093F\u092F\u093E \u0938\u0948\u0964 \u0909\u0938\u0928\u0948 \u0915\u0947 \u0915\u0930\u094D\u092F\u093E?
Rajasthani: \u0906 \u0918\u0923\u094B \u0938\u093E\u0930\u094B \u091B\u0947\u0964 \u0909\u0923\u0928\u0947 \u0915\u0947 \u0915\u093F\u092F\u094B?

Hindi: \u092E\u0941\u091D\u0947 \u091C\u093E\u0928\u093E \u0939\u0948\u0964 \u0924\u0941\u092E \u0915\u0939\u093E\u0901 \u0930\u0939\u0924\u0947 \u0939\u094B?
Bhojpuri: \u0939\u092E\u0915\u0947 \u091C\u093E\u0907\u092C \u092C\u093E\u0964 \u0924\u0942 \u0915\u0939\u093E\u0901 \u0930\u0939\u0924 \u092C\u093E\u0921\u093C\u093E?
Haryanvi: \u092E\u094D\u0939\u093E\u0928\u0947 \u091C\u093E\u0923\u093E \u0938\u0948\u0964 \u0925\u093E\u0930\u0947 \u0915\u0921\u093C\u0948 \u0930\u0939\u0924\u0947 \u0938\u094B?
Rajasthani: \u092E\u094D\u0939\u093E\u0928\u0947 \u091C\u093E\u0935\u0923\u094B \u091B\u0947\u0964 \u0925\u0947 \u0915\u0920\u0947 \u0930\u0939\u094B \u091B\u094B?

Hindi: \u092E\u0948\u0902\u0928\u0947 \u0909\u0938\u0947 \u0928\u0939\u0940\u0902 \u092C\u0924\u093E\u092F\u093E\u0964 \u0935\u094B \u092C\u0939\u0941\u0924 \u0917\u0941\u0938\u094D\u0938\u093E \u0915\u0930\u0947\u0917\u093E\u0964
Bhojpuri: \u0939\u092E \u0913\u0915\u0930\u093E \u0928\u093E\u0939\u0940\u0902 \u092C\u0924\u0907\u0932\u0940\u0902\u0964 \u090A \u092C\u0939\u0941\u0924\u0947 \u0917\u0941\u0938\u094D\u0938\u093E \u0915\u0930\u0940\u0964
Haryanvi: \u092E\u094D\u0939\u0948\u0902 \u0909\u0938\u0928\u0948 \u0928\u093E \u092C\u0924\u093E\u092F\u093E\u0964 \u0935\u094B \u0918\u0923\u093E \u0917\u0941\u0938\u094D\u0938\u093E \u0915\u0930\u0947\u0917\u093E\u0964
Rajasthani: \u092E\u094D\u0939\u0948\u0902 \u0909\u0923\u0928\u0947 \u0915\u094B\u0928\u0940 \u092C\u0924\u093E\u092F\u094B\u0964 \u0935\u094B \u0918\u0923\u094B \u0917\u0941\u0938\u094D\u0938\u094B \u0915\u0930\u0947\u0932\u094B\u0964

Hindi: \u0924\u0941\u092E \u0915\u092C \u0906\u0913\u0917\u0947? \u092E\u0948\u0902 \u0907\u0902\u0924\u091C\u093C\u093E\u0930 \u0915\u0930 \u0930\u0939\u093E \u0939\u0942\u0901\u0964
Bhojpuri: \u0924\u0942 \u0915\u092C \u0906\u0907\u092C? \u0939\u092E \u0907\u0902\u0924\u091C\u093C\u093E\u0930 \u0915\u0930\u0924 \u092C\u093E\u0928\u0940\u0964
Haryanvi: \u0924\u0942 \u0915\u0926 \u0906\u0935\u0947\u0917\u093E? \u092E\u094D\u0939\u0948\u0902 \u0907\u0902\u0924\u091C\u093C\u093E\u0930 \u0915\u0930\u0924\u093E \u0938\u0942\u0902\u0964
Rajasthani: \u0924\u0942\u0902 \u0915\u0926 \u0906\u0935\u0947\u0932\u094B? \u092E\u094D\u0939\u0948\u0902 \u0907\u0902\u0924\u091C\u093C\u093E\u0930 \u0915\u0930\u0924\u093E \u091B\u0942\u0902\u0964
`;

/* --- Tone/Register definitions --- */
const TONES = [
  { id: "auto", label: "Auto", icon: "\u2728", desc: "Match original tone" },
  { id: "formal", label: "Formal", icon: "\u{1F454}", desc: "Professional, polished" },
  { id: "casual", label: "Casual", icon: "\u{1F60E}", desc: "Relaxed, everyday" },
  { id: "dramatic", label: "Dramatic", icon: "\u{1F3AD}", desc: "Intense, emotional" },
  { id: "comedy", label: "Comedy", icon: "\u{1F602}", desc: "Funny, light-hearted" },
  { id: "romantic", label: "Romantic", icon: "\u2764\uFE0F", desc: "Tender, poetic" },
];

const TONE_INSTRUCTIONS = {
  auto: "",
  formal: "\nTONE: Write in a formal, polished, professional register. Use refined vocabulary and proper grammar. Avoid slang and colloquialisms.",
  casual: "\nTONE: Write in a casual, relaxed, everyday conversational style. Use natural speech patterns, contractions, and informal expressions.",
  dramatic: "\nTONE: Write in a dramatic, intense, emotionally charged style. Emphasize tension, conflict, and powerful emotions. Use vivid, impactful language.",
  comedy: "\nTONE: Write in a humorous, witty, light-hearted style. Add playful word choices, funny expressions, and comedic timing. Keep it entertaining.",
  romantic: "\nTONE: Write in a tender, poetic, emotionally intimate style. Use soft, evocative language with warmth and affection. Emphasize feelings of love and connection.",
};

/* --- System prompt builder --- */
const buildSingleConverterSystem = (id, selectedTone) => {
  const checklist = id === "haryanvi" ? `
HARYANVI FINAL CHECKLIST:
- \u0939\u0942\u0901 \u2192 \u0938\u0942\u0902 (MANDATORY)
- \u0939\u0948 \u2192 \u0938\u0948 (MANDATORY)
- \u0939\u0948\u0902 \u2192 \u0938\u0948\u0902 (MANDATORY)
- ALL "-\u0928\u093E" infinitives \u2192 "-\u0923\u093E" (NOT "-\u0923\u094B" \u2014 that's Rajasthani!)
- \u0928\u0939\u0940\u0902 \u2192 \u0928\u093E / \u0915\u094B\u0928\u0940
- \u092E\u0948\u0902 \u2192 \u092E\u094D\u0939\u0948\u0902 | \u092E\u0947\u0930\u093E \u2192 \u092E\u094D\u0939\u093E\u0930\u093E | \u092C\u0939\u0941\u0924 \u2192 \u0918\u0923\u093E
- Past: \u0915\u093F\u092F\u093E\u2192\u0915\u0930\u094D\u092F\u093E (m)/\u0915\u0930\u0940 (f) (NOT \u0915\u093F\u092F\u094B \u2014 that's Rajasthani!)
- ZERO Bhojpuri words: \u092C\u093E, \u092C\u093E\u0921\u093C\u0928, \u092C\u093E\u0928\u0940, \u0928\u093E\u0939\u0940\u0902, \u0939\u092E\u0915\u0947, \u090A, \u0913\u0915\u0930, \u0915\u0947\u0924\u0928\u093E
- ZERO Rajasthani words: \u091B\u0947, \u091B\u0942\u0902, \u091B\u094B, -\u0923\u094B endings, \u092E\u094D\u0939\u093E\u0930\u094B, \u0925\u094B, \u0917\u092F\u094B, \u0915\u093F\u092F\u094B, \u0926\u0947\u0916\u094D\u092F\u094B, \u0918\u0923\u094B, \u0938\u0917\u0933\u093E, \u0915\u0920\u0947
SELF-CHECK: Scan output \u2014 if you see \u091B\u0947/\u091B\u0942\u0902/\u092C\u093E/\u092C\u093E\u0928\u0940/-\u0923\u094B/\u0928\u093E\u0939\u0940\u0902, REWRITE those words.` : id === "rajasthani" ? `
RAJASTHANI FINAL CHECKLIST:
- \u0939\u0942\u0901 \u2192 \u091B\u0942\u0902 (MANDATORY)
- \u0939\u0948 \u2192 \u091B\u0947 (MANDATORY)
- ALL "-\u0928\u093E" infinitives \u2192 "-\u0923\u094B" (NOT "-\u0923\u093E" \u2014 that's Haryanvi!)
- \u0928\u0939\u0940\u0902 \u2192 \u0915\u094B\u0928\u0940 (MANDATORY)
- \u092E\u0948\u0902 \u2192 \u092E\u094D\u0939\u0948\u0902 | \u092E\u0947\u0930\u093E \u2192 \u092E\u094D\u0939\u093E\u0930\u094B (NOT \u092E\u094D\u0939\u093E\u0930\u093E \u2014 that's Haryanvi!) | \u092C\u0939\u0941\u0924 \u2192 \u0918\u0923\u094B/\u0918\u0923\u0940
- Past: \u0925\u093E\u2192\u0925\u094B (m) | \u0917\u092F\u093E\u2192\u0917\u092F\u094B (m) (NOT \u0915\u0930\u094D\u092F\u093E/\u0926\u0947\u0916\u094D\u092F\u093E \u2014 that's Haryanvi!)
- ZERO Bhojpuri words: \u092C\u093E, \u092C\u093E\u0921\u093C\u0928, \u092C\u093E\u0928\u0940, \u0928\u093E\u0939\u0940\u0902, \u0939\u092E\u0915\u0947, \u090A, \u0913\u0915\u0930, \u0915\u0947\u0924\u0928\u093E, \u092C\u0939\u0941\u0924\u0947
- ZERO Haryanvi words: \u0938\u0948, \u0938\u0942\u0902, \u0938\u0948\u0902, \u0938\u094B, -\u0923\u093E endings, \u092E\u094D\u0939\u093E\u0930\u093E, \u0915\u0930\u094D\u092F\u093E, \u0926\u0947\u0916\u094D\u092F\u093E, \u0915\u093F\u0924\u094D\u0924\u093E, \u0915\u0921\u093C\u0948
SELF-CHECK: Scan output \u2014 if you see \u0938\u0948/\u0938\u0942\u0902/\u092C\u093E/\u092C\u093E\u0928\u0940/-\u0923\u093E endings/\u0928\u093E\u0939\u0940\u0902, REWRITE those words.` : id === "bhojpuri" ? `
BHOJPURI FINAL CHECKLIST:
- \u0939\u0948 \u2192 \u092C\u093E | \u0939\u0948\u0902 \u2192 \u092C\u093E\u0921\u093C\u0928 | \u0939\u0942\u0901 \u2192 \u092C\u093E\u0928\u0940 (MANDATORY)
- \u0928\u0939\u0940\u0902 \u2192 \u0928\u093E\u0939\u0940\u0902 | \u092E\u0948\u0902 \u2192 \u0939\u092E | \u092E\u0941\u091D\u0947 \u2192 \u0939\u092E\u0915\u0947 | \u0935\u094B \u2192 \u090A
- NEVER use "\u0939\u0948", "\u0928\u0939\u0940\u0902", "\u092E\u0948\u0902" in output
- ZERO Haryanvi words: \u0938\u0948, \u0938\u0942\u0902, \u0938\u0948\u0902, -\u0923\u093E endings, \u092E\u094D\u0939\u0948\u0902, \u092E\u094D\u0939\u093E\u0928\u0947, \u092E\u094D\u0939\u093E\u0930\u093E, \u0918\u0923\u093E, \u0915\u0930\u094D\u092F\u093E, \u0915\u0921\u093C\u0948
- ZERO Rajasthani words: \u091B\u0947, \u091B\u0942\u0902, -\u0923\u094B endings, \u092E\u094D\u0939\u093E\u0930\u094B, \u0915\u094B\u0928\u0940, \u0918\u0923\u094B, \u0917\u092F\u094B, \u0925\u094B, \u0915\u0920\u0947
SELF-CHECK: Scan output \u2014 if you see \u0938\u0948/\u091B\u0947/\u0938\u0942\u0902/\u091B\u0942\u0902/\u092E\u094D\u0939\u0948\u0902/\u0915\u094B\u0928\u0940, REWRITE those words.` : id === "hindi" ? `
HINDI FINAL CHECKLIST:
- Remove ALL dialect markers (\u092C\u093E, \u0938\u0948, \u091B\u0947, etc.)
- Use standard \u0939\u0948/\u0939\u0948\u0902/\u0925\u093E/\u0925\u0940
- Use standard \u0928\u0939\u0940\u0902 (not \u0928\u093E\u0939\u0940\u0902/\u0915\u094B\u0928\u0940)
- Clean, grammatically correct Khari Boli` : id === "english" ? `
ENGLISH FINAL CHECKLIST:
- Natural, conversational English
- NO Hindi/Devanagari words in output (except proper nouns/cultural terms)
- Preserve tone and emotion of original
- Not literal translation \u2014 capture the meaning and feel` : "";

  const needsContrastive = ["bhojpuri", "haryanvi", "rajasthani"].includes(id);
  const contrastiveDialects = {
    bhojpuri: "Haryanvi and Rajasthani",
    haryanvi: "Bhojpuri and Rajasthani",
    rajasthani: "Bhojpuri and Haryanvi",
  };

  const opening = needsContrastive
    ? `You are an expert linguist specializing in North Indian dialects. Your task: rewrite the given input text in authentic ${id} dialect \u2014 which is COMPLETELY DISTINCT from ${contrastiveDialects[id]}. Pay careful attention to the dialect-specific markers below. Mixing up dialects is a CRITICAL FAILURE.`
    : `You are an expert linguist. Your task: rewrite the given input text in authentic ${id === "hindi" ? "standard Hindi" : id === "english" ? "English" : id + " dialect"}.`;

  const toneInstr = TONE_INSTRUCTIONS[selectedTone] || "";

  return `${opening}${toneInstr}

STEP 1 \u2014 AUTO-DETECT INPUT LANGUAGE:
The input may be in ANY language: Hindi, English, Hinglish, Bhojpuri, Haryanvi, Rajasthani, Gujarati, or any mix.
Silently identify the source language. Do NOT mention it in your output.

STEP 2 \u2014 UNDERSTAND THE MEANING:
First mentally translate the input to standard Hindi to normalize it. Then extract the MEANING, story, emotion, and intent. Do NOT just swap words.

STEP 3 \u2014 REWRITE in ${id === "hindi" ? "standard Hindi" : id === "english" ? "natural English" : "authentic " + id + " dialect"}:
- Write as a NATIVE SPEAKER would naturally speak \u2014 not a word-for-word swap.
- Preserve the original meaning, emotion, and structure.
- All names and proper nouns: preserve exactly as given.
- Output ONLY the converted text. No explanation, no labels, nothing else.
${needsContrastive ? "\n" + CONTRASTIVE_TABLE : ""}
${DIALECT_RULES[id]}
${checklist}

\u2605\u2605\u2605 CRITICAL OUTPUT RULES \u2605\u2605\u2605
1. Output ONLY the converted version of the user's EXACT input text. Nothing more, nothing less.
2. Do NOT add any extra sentences, phrases, or content that was not in the original input.
3. Do NOT prepend or append any example text, greetings, or filler sentences.
4. The number of sentences in your output must match the number of sentences in the input.
5. If the input has 3 sentences, your output must have exactly 3 sentences (converted).
6. NEVER add content from training examples or previous context into the output.`;
};

/* ============================================
   CLAYMORPHISM UI + MULTI-LANGUAGE SECTION
============================================ */

/* --- Global CSS (Claymorphism) --- */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  @keyframes fadeUp    {from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
  @keyframes slideInLeft {from{opacity:0;transform:translateX(-20px);}to{opacity:1;transform:translateX(0);}}
  @keyframes scaleIn   {from{opacity:0;transform:scale(0.9);}to{opacity:1;transform:scale(1);}}
  @keyframes fadeInScale {from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
  @keyframes pulse     {0%,100%{opacity:.3;transform:scale(.7);}50%{opacity:1;transform:scale(1);}}
  @keyframes spin      {to{transform:rotate(360deg);}}
  @keyframes ruhiShine {0%{background-position:-300% center;}100%{background-position:300% center;}}
  @keyframes goldShine {0%{background-position:-200% center;}100%{background-position:200% center;}}
  @keyframes float     {0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
  @keyframes connPulse {0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4);}60%{box-shadow:0 0 0 5px rgba(34,197,94,0);}}
  @keyframes fireflyDrift {
    0%   { transform: translate(0,0) scale(1); opacity:0; }
    15%  { opacity:0.7; }
    40%  { opacity:0.85; transform: translate(calc(var(--dx)*0.4), calc(var(--dy)*0.4)) scale(1.05); }
    60%  { opacity:0.7; transform: translate(calc(var(--dx)*0.7), calc(var(--dy)*0.7)) scale(1.08); }
    80%  { opacity:0.5; transform: translate(var(--dx), var(--dy)) scale(1.03); }
    100% { transform: translate(calc(var(--dx)*1.2), calc(var(--dy)*1.3)) scale(0.98); opacity:0; }
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f0ebe3; font-family: 'Inter','Segoe UI',sans-serif; }

  .clay {
    background: linear-gradient(145deg, #f5f0e8, #e8e0d4);
    border-radius: 24px;
    box-shadow:
      8px 8px 16px rgba(166,152,130,0.4),
      -6px -6px 14px rgba(255,255,255,0.8),
      inset 0 2px 0 rgba(255,255,255,0.6),
      inset 0 -1px 0 rgba(166,152,130,0.15);
    border: 1px solid rgba(255,255,255,0.5);
  }
  .clay-inner {
    background: linear-gradient(145deg, #ece7dd, #e0d8cc);
    border-radius: 18px;
    box-shadow:
      inset 4px 4px 8px rgba(166,152,130,0.3),
      inset -3px -3px 6px rgba(255,255,255,0.5);
    border: 1px solid rgba(255,255,255,0.3);
  }
  .clay-btn {
    background: linear-gradient(145deg, #f5f0e8, #e0d8cc);
    border-radius: 16px;
    box-shadow:
      5px 5px 10px rgba(166,152,130,0.4),
      -4px -4px 8px rgba(255,255,255,0.7),
      inset 0 1px 0 rgba(255,255,255,0.5);
    border: 1px solid rgba(255,255,255,0.4);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .clay-btn:hover {
    box-shadow:
      3px 3px 6px rgba(166,152,130,0.5),
      -2px -2px 5px rgba(255,255,255,0.6),
      inset 0 1px 0 rgba(255,255,255,0.4);
    transform: translateY(1px);
  }
  .clay-btn:active {
    box-shadow:
      inset 3px 3px 6px rgba(166,152,130,0.35),
      inset -2px -2px 5px rgba(255,255,255,0.4);
    transform: translateY(2px);
  }
  .clay-btn-primary {
    background: linear-gradient(145deg, #ffb347, #e89520);
    color: #fff;
    border: 1px solid rgba(255,200,100,0.4);
    box-shadow:
      5px 5px 12px rgba(200,130,20,0.4),
      -4px -4px 8px rgba(255,220,150,0.3),
      inset 0 2px 0 rgba(255,255,255,0.3);
    font-weight: 700;
  }
  .clay-btn-primary:hover {
    box-shadow:
      3px 3px 8px rgba(200,130,20,0.5),
      -2px -2px 5px rgba(255,220,150,0.3),
      inset 0 2px 0 rgba(255,255,255,0.25);
    transform: translateY(1px);
  }
  .clay-btn-primary:disabled {
    background: linear-gradient(145deg, #d4cfc5, #c8c0b4);
    color: #9e9688;
    cursor: not-allowed;
    box-shadow:
      4px 4px 8px rgba(166,152,130,0.3),
      -3px -3px 6px rgba(255,255,255,0.5);
  }

  .ruhi-title {
    font-size: 72px;
    background: linear-gradient(90deg,#92400e,#d97706,#f59e0b,#fde68a,#f59e0b,#d97706,#92400e);
    background-size: 300% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: ruhiShine 6s linear infinite;
    text-shadow: none;
    filter: drop-shadow(0 2px 4px rgba(146,64,14,0.15));
  }
  .gold-shine {
    background: linear-gradient(90deg,#92400e,#f59e0b 25%,#fde68a 50%,#f59e0b 75%,#92400e);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: goldShine 3s linear infinite;
    font-weight: 700;
  }
  .live-dot { animation: connPulse 2s ease infinite; }

  .lang-chip {
    transition: all 0.2s ease;
    cursor: pointer;
    user-select: none;
  }
  .lang-chip:hover { transform: translateY(-2px); }

  .ta-focus:focus-within {
    box-shadow:
      inset 4px 4px 8px rgba(166,152,130,0.35),
      inset -3px -3px 6px rgba(255,255,255,0.45),
      0 0 0 3px rgba(245,158,11,0.15) !important;
  }

  @media(max-width:600px){
    .topbar-c{padding:0 14px !important;height:54px !important;}
    .main-c{padding:20px 12px 70px !important;}
    .ruhi-title{font-size:44px !important;letter-spacing:-2px !important;}
    .lang-grid{grid-template-columns:repeat(2, 1fr) !important;}
    .converter-cols{flex-direction:column !important;}
    .top-controls-row{flex-direction:column !important;}
    .tone-sidebar{width:100% !important;}
  }
  @media(max-width:400px){.ruhi-title{font-size:36px !important;}}

  /* Dark Mode — Pure Black */
  .dark body, .dark { background: #000000; color: #e8e0d4; }
  .dark .clay {
    background: linear-gradient(145deg, #111111, #0a0a0a);
    box-shadow: 8px 8px 16px rgba(0,0,0,0.7), -6px -6px 14px rgba(255,255,255,0.03), inset 0 2px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .dark .clay-inner {
    background: linear-gradient(145deg, #0d0d0d, #080808);
    box-shadow: inset 4px 4px 8px rgba(0,0,0,0.5), inset -3px -3px 6px rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    color: #e8e0d4 !important;
  }
  .dark .clay-btn {
    background: linear-gradient(145deg, #111111, #0a0a0a);
    box-shadow: 5px 5px 10px rgba(0,0,0,0.5), -4px -4px 8px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: #d4c8b0;
  }
  .dark .clay-btn:hover { box-shadow: 3px 3px 6px rgba(0,0,0,0.6), -2px -2px 5px rgba(255,255,255,0.03); }
  .dark .clay-btn-primary { background: linear-gradient(145deg, #d4880a, #b87308); }
  .dark .clay-btn-primary:disabled { background: linear-gradient(145deg, #1a1a1a, #111111); color: #807060; }
  .dark textarea { color: #e8e0d4 !important; }
  .dark textarea::placeholder { color: #807060 !important; }
  .dark input { color: #e8e0d4 !important; }
  .dark input::placeholder { color: #807060 !important; }
  .dark select { color: #e8e0d4 !important; }
  .dark option { background: #0a0a0a; color: #e8e0d4; }
  .dark .lang-chip {
    background: linear-gradient(145deg, #111111, #0a0a0a) !important;
    border-color: rgba(255,255,255,0.08) !important;
    box-shadow: 4px 4px 10px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05) !important;
  }
  .dark .lang-chip[style*="border: 2px"] {
    box-shadow: 4px 4px 10px rgba(0,0,0,0.5), -3px -3px 8px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05) !important;
  }
  .dark .ta-focus textarea { color: #e8e0d4 !important; }
  .dark .ta-focus textarea::placeholder { color: #807060 !important; }

  /* Logo shine */
  .ruhi-logo-shine {
    background: linear-gradient(90deg, #92400e, #d97706, #f59e0b, #fde68a, #f59e0b, #d97706, #92400e);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: goldShine 3s linear infinite;
    filter: drop-shadow(0 1px 3px rgba(146,64,14,0.2));
  }
  .dark .ruhi-logo-shine {
    background: linear-gradient(90deg, #d4c8b0, #f59e0b, #fde68a, #fff, #fde68a, #f59e0b, #d4c8b0);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: goldShine 3s linear infinite;
    filter: drop-shadow(0 1px 6px rgba(245,158,11,0.3));
  }

  /* --- Dark mode: comprehensive color overrides --- */
  /* Logo */
  .dark .ruhi-logo-sub { color: #b0a090 !important; }

  /* Language cards text */
  .dark .lang-name { color: #e8e0d4 !important; }
  .dark .lang-name-off { color: #b0a090 !important; }
  .dark .lang-sub { color: #b0a090 !important; }
  .dark .lang-header-text { color: #d4c8b0 !important; }
  .dark .lang-header-count { color: #b0a090 !important; }
  .dark .lang-header-btn { color: #d4c8b0 !important; }
  .dark .lang-wc { color: #b0a090 !important; background: rgba(245,158,11,0.12) !important; }
  .dark .lang-icon-off { color: #807060 !important; background: linear-gradient(145deg, #111111, #0a0a0a) !important; }

  /* Result cards */
  .dark .result-lang-name { color: #e8e0d4 !important; }
  .dark .result-sub { color: #b0a090 !important; }

  /* Results header */
  .dark .results-title { color: #e8e0d4 !important; }
  .dark .results-sub { color: #b0a090 !important; }
  .dark .results-btn { color: #d4c8b0 !important; }

  /* Loading / progress */
  .dark .loading-text { color: #d4c8b0 !important; }
  .dark .loading-sub { color: #b0a090 !important; }

  /* Script Input area */
  .dark .word-count-text { color: #b0a090 !important; }
  .dark .char-count-text { color: #b0a090 !important; }
  .dark .ctrl-hint { color: #807060 !important; }

  /* History sidebar */
  .dark .history-panel {
    background: linear-gradient(180deg, #0a0a0a, #000000) !important;
    box-shadow: -8px 0 24px rgba(0,0,0,0.7) !important;
    border-left: 1px solid rgba(255,255,255,0.08) !important;
  }
  .dark .history-title { color: #d4c8b0 !important; }
  .dark .history-count { color: #b0a090 !important; background: rgba(245,158,11,0.15) !important; }
  .dark .history-preview { color: #d4c8b0 !important; }
  .dark .history-date { color: #807060 !important; }
  .dark .history-langs { color: #b0a090 !important; }
  .dark .history-load-btn { color: #d4c8b0 !important; }
  .dark .history-entry-text { color: #d4c8b0 !important; }
  .dark .history-expanded { background: rgba(255,255,255,0.03) !important; }
  .dark .history-footer { color: #807060 !important; }
  .dark .history-empty { color: #807060 !important; }

  /* Footer */
  .dark .footer-powered { color: #b0a090 !important; }
  .dark .footer-info { color: #807060 !important; }

  /* Batch CSV */
  .dark .batch-lang-text { color: #b0a090 !important; }

  /* Error text dark */
  .dark .error-box { color: #fca5a5 !important; }

  /* TTS Voice Over */
  .tts-panel { padding: 16px; margin-bottom: 14px; }
  .tts-toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
  .tts-toggle-track { width: 40px; height: 22px; border-radius: 11px; background: rgba(166,152,130,0.25); position: relative; transition: background 0.25s; flex-shrink: 0; }
  .tts-toggle-track.active { background: linear-gradient(135deg, #f59e0b, #d97706); }
  .tts-toggle-thumb { width: 18px; height: 18px; border-radius: 50%; background: white; position: absolute; top: 2px; left: 2px; transition: transform 0.25s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
  .tts-toggle-track.active .tts-toggle-thumb { transform: translateX(18px); }
  .tts-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
  .tts-field { min-width: 0; }
  .tts-field label { display: block; font-size: 10.5px; font-weight: 700; color: #78350f; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .tts-field select, .tts-field input[type="range"] { width: 100%; }
  .tts-field select { padding: 8px 12px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; color: #3d3425; cursor: pointer; }
  .tts-slider-row { display: flex; align-items: center; gap: 8px; }
  .tts-slider-row input[type="range"] { flex: 1; accent-color: #f59e0b; height: 4px; }
  .tts-slider-val { font-size: 11px; font-weight: 700; color: #92400e; min-width: 32px; text-align: right; }
  .tts-generate-btn { display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 10px; border: none; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
  .tts-audio-row { margin-top: 10px; }
  .tts-audio-row audio { width: 100%; border-radius: 8px; height: 36px; }
  .tts-error { color: #ef4444; font-size: 11px; font-weight: 600; margin-top: 6px; }
  .tts-advanced-toggle { grid-column: 1 / -1; font-size: 10.5px; font-weight: 700; cursor: pointer; color: #92400e; border: none; background: none; padding: 6px 0; display: flex; align-items: center; gap: 4px; transition: color 0.2s; }
  .tts-advanced-toggle:hover { color: #d97706; }
  .tts-advanced { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 10px; border-top: 1px solid rgba(166,152,130,0.15); }
  .tts-speaker-boost { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; color: #78350f; cursor: pointer; user-select: none; padding-top: 4px; }
  .tts-speaker-boost input[type="checkbox"] { accent-color: #f59e0b; width: 16px; height: 16px; }
  .tts-tags-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .tts-tag-btn { padding: 3px 8px; border-radius: 8px; border: 1px solid rgba(166,152,130,0.2); font-size: 10px; font-weight: 700; cursor: pointer; background: rgba(245,158,11,0.08); color: #92400e; transition: all 0.15s; }
  .tts-tag-btn:hover { background: rgba(245,158,11,0.18); }
  .tts-edit-area { width: 100%; min-height: 60px; max-height: 120px; resize: vertical; border-radius: 12px; border: none; padding: 10px 12px; font-size: 12px; font-family: 'Courier New', monospace; line-height: 1.6; box-sizing: border-box; }
  .tts-tags-note { font-size: 9px; color: #a08060; margin-top: 4px; }

  .dark .tts-advanced-toggle { color: #d4c8b0 !important; }
  .dark .tts-advanced-toggle:hover { color: #f59e0b !important; }
  .dark .tts-speaker-boost { color: #b0a090 !important; }
  .dark .tts-tag-btn { background: rgba(245,158,11,0.12) !important; color: #d4c8b0 !important; border-color: rgba(255,255,255,0.08) !important; }
  .dark .tts-edit-area { background: rgba(255,255,255,0.05) !important; color: #e8e0d4 !important; }
  .dark .tts-tags-note { color: #807060 !important; }

  .dark .tts-field label { color: #b0a090 !important; }
  .dark .tts-field select { color: #e8e0d4 !important; background: rgba(255,255,255,0.05) !important; }
  .dark .tts-slider-val { color: #d4c8b0 !important; }
  .dark .tts-toggle-track { background: rgba(255,255,255,0.08); }
  .dark .tts-audio-row audio { filter: invert(0.85) hue-rotate(180deg); }

  @media (max-width: 600px) {
    .tts-options { grid-template-columns: 1fr; }
    .tts-advanced { grid-template-columns: 1fr; }
  }

  /* Skeleton shimmer animation */
  @keyframes skeletonShimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .skeleton-line {
    height: 14px;
    border-radius: 8px;
    background: linear-gradient(90deg, rgba(166,152,130,0.12) 25%, rgba(166,152,130,0.24) 50%, rgba(166,152,130,0.12) 75%);
    background-size: 400px 100%;
    animation: skeletonShimmer 1.8s ease-in-out infinite;
    margin-bottom: 12px;
  }
  .dark .skeleton-line {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 400px 100%;
  }

  /* Theme picker */
  .theme-picker-wrap { position: relative; display: inline-block; }
  .theme-picker-dropdown {
    position: absolute; top: 100%; right: 0; margin-top: 6px;
    border-radius: 14px; padding: 8px; z-index: 50;
    display: flex; flex-wrap: wrap; gap: 6px; width: 170px;
  }
  .theme-dot {
    width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
    border: 2px solid transparent; transition: all 0.15s ease;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.15), -1px -1px 3px rgba(255,255,255,0.3);
  }
  .theme-dot:hover { transform: scale(1.15); }
  .theme-dot.active { border-color: #fff; box-shadow: 0 0 0 2px currentColor, 2px 2px 5px rgba(0,0,0,0.2); }
`;

/* --- Accent Themes --- */
const ACCENT_THEMES = {
  amber:   { label: "Amber",   primary: "#f59e0b", dark: "#d97706" },
  rose:    { label: "Rose",    primary: "#f43f5e", dark: "#e11d48" },
  violet:  { label: "Violet",  primary: "#8b5cf6", dark: "#7c3aed" },
  emerald: { label: "Emerald", primary: "#10b981", dark: "#059669" },
  ocean:   { label: "Ocean",   primary: "#0ea5e9", dark: "#0284c7" },
  sunset:  { label: "Sunset",  primary: "#f97316", dark: "#ea580c" },
};

/* --- Skeleton Loader --- */
function SkeletonLoader({ lines = 5, darkMode }) {
  const widths = ["100%", "85%", "92%", "70%", "60%"];
  return (
    <div style={{ padding: "28px 24px" }}>
      {widths.slice(0, lines).map((w, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{ width: w, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

/* --- Logo --- */
function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
      <div style={{ width: "38px", height: "38px", borderRadius: "13px", background: "linear-gradient(135deg, #f59e0b, #ef4444, #d97706)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 4px 14px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.3)", border: "none", overflow: "hidden" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ position: "relative", zIndex: 1 }}>
          <path d="M12 2L15.5 8.5H20L16 13L18 20L12 16.5L6 20L8 13L4 8.5H8.5L12 2Z" fill="white" opacity="0.95"/>
          <circle cx="12" cy="12" r="4" fill="rgba(245,158,11,0.6)"/>
          <path d="M10 10.5C10 10.5 11 12 12 12C13 12 14 10.5 14 10.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="10.5" cy="9.5" r="0.8" fill="white"/>
          <circle cx="13.5" cy="9.5" r="0.8" fill="white"/>
        </svg>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%)", borderRadius: "13px" }} />
      </div>
      <div>
        <div className="ruhi-logo-shine" style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "1px", lineHeight: 1.1 }}>RUHI</div>
        <div className="ruhi-logo-sub" style={{ fontSize: "7.5px", color: "#92400e", letterSpacing: "2px", fontWeight: 700, textTransform: "uppercase", marginTop: "1px" }}>Multilingual Studio</div>
      </div>
    </div>
  );
}

/* --- Firefly Background --- */
const FIREFLY_WORDS = [
  // Hindi
  { text: "\u0928\u092E\u0938\u094D\u0924\u0947", color: "#f97316" },
  { text: "\u092D\u093E\u0937\u093E", color: "#f97316" },
  { text: "\u0915\u0939\u093E\u0928\u0940", color: "#f97316" },
  { text: "\u092A\u094D\u092F\u093E\u0930", color: "#f97316" },
  // English
  { text: "Script", color: "#3b82f6" },
  { text: "Language", color: "#3b82f6" },
  { text: "Story", color: "#3b82f6" },
  // Haryanvi
  { text: "\u0930\u093E\u092E \u0930\u093E\u092E", color: "#22c55e" },
  { text: "\u092F\u093E\u0930", color: "#22c55e" },
  { text: "\u0918\u0923\u093E", color: "#22c55e" },
  // Rajasthani
  { text: "\u0918\u0923\u094B", color: "#eab308" },
  { text: "\u092A\u093E\u0923\u0940", color: "#eab308" },
  { text: "\u0938\u093E\u0930\u094B", color: "#eab308" },
  // Bhojpuri
  { text: "\u092D\u0907\u092F\u093E", color: "#ef4444" },
  { text: "\u0928\u0940\u092E\u0928", color: "#ef4444" },
  { text: "\u091C\u093F\u0928\u0917\u0940", color: "#ef4444" },
  // Gujarati
  { text: "\u0A95\u0AC7\u0AAE \u0A9B\u0ACB", color: "#a855f7" },
  { text: "\u0AAA\u0ACD\u0AB0\u0AC7\u0AAE", color: "#a855f7" },
  { text: "\u0AB8\u0ABE\u0AB0\u0AC1\u0A82", color: "#a855f7" },
  // Marathi
  { text: "\u0928\u092E\u0938\u094D\u0915\u093E\u0930", color: "#e11d48" },
  { text: "\u0915\u0925\u093E", color: "#e11d48" },
  { text: "\u092A\u094D\u0930\u0947\u092E", color: "#e11d48" },
  // Bengali
  { text: "\u0997\u09B2\u09CD\u09AA", color: "#0891b2" },
  { text: "\u09AD\u09BE\u09B2\u09CB\u09AC\u09BE\u09B8\u09BE", color: "#0891b2" },
  { text: "\u09B8\u09CD\u09AC\u09AA\u09CD\u09A8", color: "#0891b2" },
  // Punjabi
  { text: "\u0A2A\u0A3F\u0A06\u0A30", color: "#ea580c" },
  { text: "\u0A2F\u0A3E\u0A30", color: "#ea580c" },
  { text: "\u0A16\u0A41\u0A36\u0A40", color: "#ea580c" },
  // Tamil
  { text: "\u0BB5\u0BA3\u0B95\u0BCD\u0B95\u0BAE\u0BCD", color: "#7c3aed" },
  { text: "\u0B85\u0BA9\u0BCD\u0BAA\u0BC1", color: "#7c3aed" },
  { text: "\u0B95\u0BA9\u0BB5\u0BC1", color: "#7c3aed" },
  // Telugu
  { text: "\u0C2A\u0C4D\u0C30\u0C47\u0C2E", color: "#059669" },
  { text: "\u0C2E\u0C28\u0C38\u0C41", color: "#059669" },
  { text: "\u0C38\u0C4D\u0C28\u0C47\u0C39\u0C02", color: "#059669" },
  // Kannada
  { text: "\u0CAA\u0CCD\u0CB0\u0CC0\u0CA4\u0CBF", color: "#dc2626" },
  { text: "\u0C97\u0CC6\u0CB3\u0CC6\u0CAF", color: "#dc2626" },
  { text: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1", color: "#dc2626" },
  // Malayalam
  { text: "\u0D38\u0D4D\u0D28\u0D47\u0D39\u0D02", color: "#0d9488" },
  { text: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02", color: "#0d9488" },
  { text: "\u0D15\u0D25", color: "#0d9488" },
  // Odia
  { text: "\u0B2D\u0B3E\u0B32", color: "#6366f1" },
  { text: "\u0B13\u0B21\u0B3C\u0B3F\u0B06", color: "#6366f1" },
  { text: "\u0B2E\u0B3E\u0B5F\u0B3E", color: "#6366f1" },
  // Assamese
  { text: "\u09AE\u09BE\u09AF\u09BC\u09BE", color: "#be185d" },
  { text: "\u09AE\u0987", color: "#be185d" },
  { text: "\u0986\u09B6\u09BE", color: "#be185d" },
  // Urdu
  { text: "\u0645\u062D\u0628\u062A", color: "#4f46e5" },
  { text: "\u062E\u0648\u0627\u0628", color: "#4f46e5" },
  { text: "\u0627\u0631\u062F\u0648", color: "#4f46e5" },
  // Extra
  { text: "Ruhi", color: "#d97706" },
  { text: "Dream", color: "#3b82f6" },
  { text: "\u0926\u094B\u0938\u094D\u0924", color: "#f97316" },
  { text: "\u0907\u0936\u094D\u0915", color: "#ef4444" },
];

function FireflyBackground() {
  const fireflies = FIREFLY_WORDS.map((fw, i) => {
    const seed = i * 137.508;
    const left = ((seed * 3.17) % 90 + 5).toFixed(1);
    const top = ((seed * 2.31) % 85 + 5).toFixed(1);
    const dur = (18 + (seed * 0.37) % 16).toFixed(1);
    const delay = (-(seed * 0.53) % 25).toFixed(1);
    const dx = ((i % 2 === 0 ? 1 : -1) * (40 + (seed % 80))).toFixed(0);
    const dy = ((i % 3 === 0 ? -1 : 1) * (30 + (seed % 60))).toFixed(0);
    const size = (14 + (i * 1.7) % 10).toFixed(0);
    return (
      <span key={i} style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        fontSize: `${size}px`,
        fontWeight: 700,
        color: fw.color,
        opacity: 0,
        pointerEvents: "none",
        userSelect: "none",
        textShadow: `0 0 10px ${fw.color}aa, 0 0 25px ${fw.color}60, 0 0 45px ${fw.color}30`,
        animation: `fireflyDrift ${dur}s ${delay}s ease-in-out infinite`,
        "--dx": `${dx}px`,
        "--dy": `${dy}px`,
        fontFamily: "'Inter', serif",
        letterSpacing: "0.5px",
      }}>{fw.text}</span>
    );
  });

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {fireflies}
    </div>
  );
}

/* --- Language Cards (multi-select) --- */
function LanguageCards({ selected, onToggle, onSelectAll, onDeselectAll }) {
  const allSelected = selected.length === LANGUAGES.length;
  return (
    <div className="clay" style={{ padding: 0, overflow: "hidden", height: "100%" }}>
      <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(166,152,130,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>&#127760;</span>
          <span className="lang-header-text" style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase", color: "#78350f" }}>Convert To</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="lang-header-count" style={{ fontSize: "10px", color: "#92400e", fontWeight: 600 }}>{selected.length}/{LANGUAGES.length}</span>
          <button onClick={allSelected ? onDeselectAll : onSelectAll} className="clay-btn lang-header-btn" style={{ padding: "4px 12px", fontSize: "10px", fontWeight: 700, color: "#78350f" }}>
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
      </div>
      <div className="lang-grid" style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: "12px" }}>
        {LANGUAGES.map(d => {
          const on = selected.includes(d.id);
          return (
            <div key={d.id} onClick={() => onToggle(d.id)} className="lang-chip" style={{
              padding: "14px 16px", borderRadius: "18px",
              background: on
                ? `linear-gradient(145deg, ${d.color}20, ${d.color}10)`
                : "linear-gradient(145deg, #f5f0e8, #e8e0d4)",
              border: on ? `2px solid ${d.color}60` : "1px solid rgba(255,255,255,0.4)",
              transition: "all 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.2s ease",
              animation: "fadeInScale 0.2s ease",
              boxShadow: on
                ? `4px 4px 10px ${d.color}25, -3px -3px 8px rgba(255,255,255,0.6), inset 0 1px 0 rgba(255,255,255,0.4)`
                : "4px 4px 10px rgba(166,152,130,0.3), -3px -3px 8px rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.5)",
              position: "relative", overflow: "hidden"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "14px", flexShrink: 0,
                  background: on ? `linear-gradient(135deg, ${d.color}30, ${d.color}15)` : "linear-gradient(145deg, #ece7dd, #ddd5c9)",
                  boxShadow: on
                    ? `inset 2px 2px 4px ${d.color}15, inset -2px -2px 4px rgba(255,255,255,0.5)`
                    : "inset 2px 2px 4px rgba(166,152,130,0.2), inset -2px -2px 4px rgba(255,255,255,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px", fontWeight: 900, color: on ? d.color : "#8b7355",
                  border: `1px solid ${on ? d.color + "30" : "rgba(255,255,255,0.3)"}`,
                  transition: "all 0.2s"
                }}>{d.label.charAt(0)}</div>
                <div>
                  <div className={on ? "lang-name" : "lang-name-off"} style={{ fontSize: "13.5px", fontWeight: 800, color: on ? "#1e1b18" : "#6b5e50", lineHeight: 1.2, transition: "color 0.2s" }}>{d.label}</div>
                  <div className="lang-sub" style={{ fontSize: "10px", color: on ? "#78350f" : "#a09080", marginTop: "2px" }}>{d.sub} &middot; {d.region}</div>
                </div>
              </div>
              {on && <div style={{ position: "absolute", bottom: "8px", right: "10px", width: "20px", height: "20px", borderRadius: "50%", background: `linear-gradient(135deg, ${d.color}, ${d.color}cc)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#fff", fontWeight: 900, boxShadow: `2px 2px 4px ${d.color}40, -1px -1px 3px rgba(255,255,255,0.3)` }}>&#10003;</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --- Result Card --- */
function ResultCard({ result, lang, copied, onCopy, isStreaming, srtMode, onDownloadSrt, onShare }) {
  if (!result) return null;
  const wc = result.trim() ? result.trim().split(/\s+/).length : 0;
  return (
    <div className="clay" style={{
      borderLeft: `4px solid ${lang.color}`, padding: "18px", marginBottom: "14px",
      animation: "fadeUp 0.35s ease both"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: `linear-gradient(135deg, ${lang.color}25, ${lang.color}10)`, border: `1px solid ${lang.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 900, color: lang.color, flexShrink: 0, boxShadow: `inset 2px 2px 4px ${lang.color}10, inset -2px -2px 3px rgba(255,255,255,0.5)` }}>{lang.label.charAt(0)}</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="result-lang-name" style={{ fontSize: "15px", fontWeight: 800, color: "#1e1b18" }}>{lang.label}</span>
              {isStreaming && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: lang.color, display: "inline-block", animation: "pulse 1s ease-in-out infinite" }} />}
            </div>
            <div className="result-sub" style={{ fontSize: "10.5px", color: "#78350f" }}>{lang.sub} &middot; {lang.region}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="lang-wc" style={{ fontSize: "10px", color: "#78350f", background: "rgba(245,158,11,0.08)", borderRadius: "8px", padding: "3px 10px", fontWeight: 600 }}>{wc} words</span>
          {!isStreaming && (
            <div style={{ display: "flex", gap: "6px" }}>
              {srtMode && onDownloadSrt && (
                <button onClick={() => onDownloadSrt(lang.id)} className="clay-btn" style={{ padding: "6px 10px", fontSize: "10px", fontWeight: 700, color: "#16a34a" }}>
                  .srt
                </button>
              )}
              <button onClick={() => onCopy(result, lang.id)} className="clay-btn" style={{ padding: "6px 14px", fontSize: "11.5px", fontWeight: 700, color: copied === lang.id ? lang.color : "#6b5e50", background: copied === lang.id ? `linear-gradient(145deg, ${lang.color}15, ${lang.color}08)` : undefined }}>
                {copied === lang.id ? "Copied!" : "Copy"}
              </button>
              {onShare && (
                <button onClick={() => onShare(lang.id)} className="clay-btn" style={{ padding: "6px 10px", fontSize: "11px", fontWeight: 700, color: "#6b5e50" }} title="Share via WhatsApp or native share">
                  {"\uD83D\uDD17"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="clay-inner" style={{ fontSize: "13.5px", lineHeight: 1.9, color: "#3d3425", padding: "14px 16px", whiteSpace: "pre-wrap" }}>
        {result}
        {isStreaming && <span style={{ display: "inline-block", width: "2px", height: "16px", background: lang.color, marginLeft: "2px", verticalAlign: "text-bottom", animation: "pulse 0.8s ease-in-out infinite" }} />}
      </div>
    </div>
  );
}

/* --- History Sidebar --- */
function HistorySidebar({ open, onClose, onLoad }) {
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useState(() => {
    const raw = localStorage.getItem("ruhi_history");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        setHistory(parsed.filter(h => h.id > cutoff));
      } catch {}
    }
  }, [open]);

  const clearHistory = () => {
    localStorage.removeItem("ruhi_history");
    setHistory([]);
  };

  const deleteEntry = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem("ruhi_history", JSON.stringify(updated));
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 172800000) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 50, backdropFilter: "blur(3px)" }} />
      <div className="history-panel" style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "340px", maxWidth: "90vw",
        background: "linear-gradient(180deg, #f5f0e8, #ece7dd)", zIndex: 51,
        boxShadow: "-8px 0 24px rgba(166,152,130,0.3), -2px 0 8px rgba(255,255,255,0.5)",
        display: "flex", flexDirection: "column", animation: "slideIn 0.25s ease",
        borderLeft: "1px solid rgba(255,255,255,0.5)"
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%);}to{transform:translateX(0);}}`}</style>
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(166,152,130,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>&#128218;</span>
            <span className="history-title" style={{ fontSize: "14px", fontWeight: 800, color: "#78350f" }}>History</span>
            <span className="history-count" style={{ fontSize: "10px", color: "#92400e", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: "8px", fontWeight: 600 }}>{history.length}</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {history.length > 0 && (
              <button onClick={clearHistory} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: "#dc2626" }}>Clear All</button>
            )}
            <button onClick={onClose} className="clay-btn" style={{ padding: "4px 10px", fontSize: "12px", fontWeight: 700, color: "#6b5e50" }}>&#10005;</button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          {history.length === 0 ? (
            <div className="history-empty" style={{ textAlign: "center", padding: "40px 20px", color: "#a08060" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>&#128196;</div>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>No history yet</div>
              <div style={{ fontSize: "11px", marginTop: "4px" }}>Converted scripts will appear here for 30 days</div>
            </div>
          ) : (
            history.map(entry => {
              const isExpanded = expandedId === entry.id;
              const preview = entry.input.length > 60 ? entry.input.slice(0, 60) + "..." : entry.input;
              const langNames = (entry.langs || []).map(id => LANGUAGES.find(l => l.id === id)?.label || id).join(", ");
              return (
                <div key={entry.id} className="clay" style={{ marginBottom: "10px", padding: 0, overflow: "hidden", borderRadius: "16px" }}>
                  <div onClick={() => setExpandedId(isExpanded ? null : entry.id)} style={{ padding: "12px 14px", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div className="history-preview" style={{ fontSize: "12px", fontWeight: 700, color: "#3d3425", lineHeight: 1.5, flex: 1 }}>{preview}</div>
                      <span className="history-date" style={{ fontSize: "10px", color: "#a08060", whiteSpace: "nowrap", flexShrink: 0 }}>{formatDate(entry.date)}</span>
                    </div>
                    <div className="history-langs" style={{ fontSize: "10px", color: "#92400e", marginTop: "4px" }}>{langNames}</div>
                  </div>
                  {isExpanded && (
                    <div className="history-expanded" style={{ borderTop: "1px solid rgba(166,152,130,0.12)", padding: "10px 14px", background: "rgba(166,152,130,0.04)" }}>
                      <div className="clay-inner history-entry-text" style={{ padding: "10px 12px", fontSize: "11px", color: "#3d3425", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: "8px", maxHeight: "120px", overflowY: "auto" }}>{entry.input}</div>
                      {entry.results && Object.entries(entry.results).map(([langId, text]) => {
                        const lang = LANGUAGES.find(l => l.id === langId);
                        return (
                          <div key={langId} style={{ marginBottom: "6px" }}>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: lang?.color || "#78350f", marginBottom: "3px" }}>{lang?.label || langId}</div>
                            <div className="clay-inner history-entry-text" style={{ padding: "8px 10px", fontSize: "11px", color: "#3d3425", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: "80px", overflowY: "auto" }}>{text}</div>
                          </div>
                        );
                      })}
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <button onClick={() => { onLoad(entry); onClose(); }} className="clay-btn history-load-btn" style={{ padding: "5px 12px", fontSize: "10px", fontWeight: 700, color: "#78350f", flex: 1 }}>Load Script</button>
                        <button onClick={() => deleteEntry(entry.id)} className="clay-btn" style={{ padding: "5px 12px", fontSize: "10px", fontWeight: 700, color: "#dc2626" }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="history-footer" style={{ padding: "12px 16px", borderTop: "1px solid rgba(166,152,130,0.12)", fontSize: "10px", color: "#a08060", textAlign: "center" }}>
          Scripts auto-delete after 30 days
        </div>
      </div>
    </>
  );
}

/* ==============================
   ROOT APP
============================== */
export default function App() {
  const [selected, setSelected] = useState(LANGUAGES.map(l => l.id));
  const [script, setScript] = useState("");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState({});
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("ruhi_dark") === "1");
  const [activeTab, setActiveTab] = useState("converter");
  const [tone, setTone] = useState("auto");
  const [srtMode, setSrtMode] = useState(null); // null or { blocks: [{index, time, text}], fileName }
  const [csvMode, setCsvMode] = useState(null); // null or { rows: string[], fileName, header: string }
  const [batchResults, setBatchResults] = useState(null); // null or { langId: string[] }
  const [batchProgress, setBatchProgress] = useState(null); // null or { done: number, total: number }
  const fileInputRef = useRef(null);

  // TTS state
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [ttsModel, setTtsModel] = useState("eleven_multilingual_v3");
  const [ttsSettings, setTtsSettings] = useState({ stability: 0.5, similarity_boost: 0.75, style: 0, speed: 1.0, use_speaker_boost: true });
  const [ttsGenerating, setTtsGenerating] = useState({});
  const [audioUrls, setAudioUrls] = useState({});
  const [ttsError, setTtsError] = useState("");
  const [ttsAdvanced, setTtsAdvanced] = useState(false);
  const [ttsTextOverrides, setTtsTextOverrides] = useState({});
  const [ttsEditingLang, setTtsEditingLang] = useState(null);
  const ttsTextareaRef = useRef(null);

  /* --- Import & Download State --- */
  const [importTab, setImportTab] = useState("link");
  const [importLink, setImportLink] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [downloadDropdown, setDownloadDropdown] = useState(false);
  const downloadRef = useRef(null);
  const themePickerRef = useRef(null);
  const bulkFileRef = useRef(null);

  /* --- Voice Input State --- */
  const [voiceListening, setVoiceListening] = useState(false);
  const recognitionRef = useRef(null);

  /* --- New Feature States --- */
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem("ruhi_fontsize") || "14"));
  const [fullscreen, setFullscreen] = useState(false);
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem("ruhi_favorites") || "[]"); } catch { return []; } });
  const [themeSchedule, setThemeSchedule] = useState(() => localStorage.getItem("ruhi_theme_schedule") === "1");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [detectedLang, setDetectedLang] = useState(null);
  const [onboardingStep, setOnboardingStep] = useState(() => localStorage.getItem("ruhi_onboarding_done") ? -1 : 0);
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("ruhi_accent") || "amber");
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  /* --- Find & Replace State --- */
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [findCaseInsensitive, setFindCaseInsensitive] = useState(true);
  const [findRegex, setFindRegex] = useState(false);

  /* --- Transliteration Mode --- */
  const [translitMode, setTranslitMode] = useState(false);

  // Find & Replace helpers
  const findMatchCount = useMemo(() => {
    if (!findText || !script) return 0;
    try {
      if (findRegex) {
        const re = new RegExp(findText, findCaseInsensitive ? "gi" : "g");
        return (script.match(re) || []).length;
      }
      const search = findCaseInsensitive ? findText.toLowerCase() : findText;
      const hay = findCaseInsensitive ? script.toLowerCase() : script;
      let count = 0, idx = 0;
      while ((idx = hay.indexOf(search, idx)) !== -1) { count++; idx += search.length; }
      return count;
    } catch { return 0; }
  }, [findText, script, findCaseInsensitive, findRegex]);

  const doReplace = (all) => {
    if (!findText) return;
    try {
      if (findRegex) {
        const flags = findCaseInsensitive ? "gi" : "g";
        const re = new RegExp(findText, all ? flags : (findCaseInsensitive ? "i" : ""));
        setScript(prev => prev.replace(re, replaceText));
      } else {
        if (all) {
          const re = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), findCaseInsensitive ? "gi" : "g");
          setScript(prev => prev.replace(re, replaceText));
        } else {
          const idx = findCaseInsensitive ? script.toLowerCase().indexOf(findText.toLowerCase()) : script.indexOf(findText);
          if (idx !== -1) setScript(prev => prev.slice(0, idx) + replaceText + prev.slice(idx + findText.length));
        }
      }
    } catch { /* invalid regex */ }
  };

  // Theme auto-scheduling
  useEffect(() => {
    if (!themeSchedule) return;
    const checkTime = () => {
      const hour = new Date().getHours();
      const shouldBeDark = hour >= 19 || hour < 7;
      if (shouldBeDark !== darkMode) {
        setDarkMode(shouldBeDark);
        localStorage.setItem("ruhi_dark", shouldBeDark ? "1" : "0");
      }
    };
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [themeSchedule, darkMode]);

  // Font size persistence
  useEffect(() => { localStorage.setItem("ruhi_fontsize", String(fontSize)); }, [fontSize]);

  // Favorites persistence
  useEffect(() => { localStorage.setItem("ruhi_favorites", JSON.stringify(favorites)); }, [favorites]);

  // Apply accent theme CSS variables
  useEffect(() => {
    const theme = ACCENT_THEMES[accentColor] || ACCENT_THEMES.amber;
    const root = document.documentElement;
    root.style.setProperty("--accent-primary", theme.primary);
    root.style.setProperty("--accent-dark", theme.dark);
    root.style.setProperty("--accent-primary-12", theme.primary + "1f");
    root.style.setProperty("--accent-primary-30", theme.primary + "4d");
    root.style.setProperty("--accent-dark-30", theme.dark + "4d");
    localStorage.setItem("ruhi_accent", accentColor);
  }, [accentColor]);

  // Auto-detect input language
  useEffect(() => {
    if (!script.trim()) { setDetectedLang(null); return; }
    const sample = script.slice(0, 200);
    // Simple heuristic detection based on Unicode ranges
    const devanagari = (sample.match(/[\u0900-\u097F]/g) || []).length;
    const gujarati = (sample.match(/[\u0A80-\u0AFF]/g) || []).length;
    const bengali = (sample.match(/[\u0980-\u09FF]/g) || []).length;
    const gurmukhi = (sample.match(/[\u0A00-\u0A7F]/g) || []).length;
    const tamil = (sample.match(/[\u0B80-\u0BFF]/g) || []).length;
    const telugu = (sample.match(/[\u0C00-\u0C7F]/g) || []).length;
    const kannada = (sample.match(/[\u0C80-\u0CFF]/g) || []).length;
    const malayalam = (sample.match(/[\u0D00-\u0D7F]/g) || []).length;
    const odia = (sample.match(/[\u0B00-\u0B7F]/g) || []).length;
    const urdu = (sample.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
    const latin = (sample.match(/[a-zA-Z]/g) || []).length;
    const counts = { hindi: devanagari, gujarati, bengali, punjabi: gurmukhi, tamil, telugu, kannada, malayalam, odia, urdu, english: latin };
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] > 5) {
      const detected = sorted[0][0];
      // For devanagari, could be hindi/bhojpuri/haryanvi/rajasthani/marathi — default to "hindi (Devanagari)"
      if (detected === "hindi") {
        setDetectedLang({ id: "hindi", label: "Devanagari (Hindi/Bhojpuri/Haryanvi/Rajasthani/Marathi)", confidence: Math.min(sorted[0][1] / sample.length * 200, 99).toFixed(0) });
      } else {
        const lang = LANGUAGES.find(l => l.id === detected);
        setDetectedLang({ id: detected, label: lang?.label || detected, confidence: Math.min(sorted[0][1] / sample.length * 200, 99).toFixed(0) });
      }
    } else {
      setDetectedLang(null);
    }
  }, [script]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+K — command palette
      if (e.ctrlKey && e.key === "k") { e.preventDefault(); setCmdPaletteOpen(p => !p); }
      // Ctrl+Enter — convert
      if (e.ctrlKey && e.key === "Enter" && !loading && script.trim() && selected.length > 0) {
        e.preventDefault();
        (csvMode ? convertBatch : convert)();
      }
      // Ctrl+Shift+F — fullscreen toggle
      if (e.ctrlKey && e.shiftKey && e.key === "F") { e.preventDefault(); setFullscreen(f => !f); }
      // Ctrl+Shift+D — dark mode toggle
      if (e.ctrlKey && e.shiftKey && e.key === "D") { e.preventDefault(); setDarkMode(d => { localStorage.setItem("ruhi_dark", d ? "0" : "1"); return !d; }); }
      // Ctrl+Shift+H — history
      if (e.ctrlKey && e.shiftKey && e.key === "H") { e.preventDefault(); setHistoryOpen(h => !h); }
      // Escape — exit fullscreen / close shortcuts / close palette
      if (e.key === "Escape") { setFullscreen(false); setShowShortcuts(false); setCmdPaletteOpen(false); }
      // Ctrl+/ — show shortcuts
      if (e.ctrlKey && e.key === "/") { e.preventDefault(); setShowShortcuts(s => !s); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [loading, script, selected, csvMode]);

  // Voice input (Web Speech API)
  const voiceBaseRef = useRef("");
  const toggleVoice = () => {
    if (voiceListening) {
      recognitionRef.current?.stop();
      setVoiceListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input not supported in this browser. Try Chrome.");
      playError();
      return;
    }
    voiceBaseRef.current = script;
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    let accumulated = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          accumulated += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const base = voiceBaseRef.current;
      const sep = base && !base.endsWith(" ") && !base.endsWith("\n") ? " " : "";
      setScript(base + sep + accumulated + interim);
    };
    recognition.onerror = (e) => {
      if (e.error !== "aborted") { setError("Voice error: " + e.error); playError(); }
      setVoiceListening(false);
    };
    recognition.onend = () => { setVoiceListening(false); };
    recognitionRef.current = recognition;
    recognition.start();
    setVoiceListening(true);
    playPop();
  };

  // Save/load favorite pairs
  const saveFavorite = () => {
    if (selected.length === 0) return;
    const key = selected.sort().join(",");
    if (favorites.some(f => f.key === key)) return;
    const name = selected.map(id => LANGUAGES.find(l => l.id === id)?.sub || id).join(", ");
    setFavorites(prev => [...prev, { key, langs: [...selected], name }]);
    playSuccess();
  };
  const loadFavorite = (fav) => { setSelected(fav.langs); playPop(); };
  const removeFavorite = (key) => { setFavorites(prev => prev.filter(f => f.key !== key)); };

  // Share functionality
  const shareResult = async (langId) => {
    const text = results[langId];
    if (!text) return;
    const lang = LANGUAGES.find(l => l.id === langId);
    const shareText = `${lang?.label} (${lang?.sub}):\n\n${text}\n\n— Converted by RUHI Studio`;
    if (navigator.share) {
      try { await navigator.share({ title: `RUHI — ${lang?.label} Script`, text: shareText }); } catch {}
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) setDownloadDropdown(false);
      if (themePickerRef.current && !themePickerRef.current.contains(e.target)) setThemePickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchVoices = async () => {
    try {
      const res = await fetch("/api/voices");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setVoices(data);
      if (data.length > 0 && !selectedVoice) setSelectedVoice(data[0].voice_id);
    } catch { setTtsError("Failed to load voices"); }
  };

  const toggleTts = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    if (next && voices.length === 0) fetchVoices();
  };

  const generateTTS = async (langId, text) => {
    const ttsText = ttsTextOverrides[langId] || text;
    if (!selectedVoice || !ttsText) return;
    setTtsGenerating(p => ({ ...p, [langId]: true }));
    setTtsError("");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ttsText.substring(0, 5000),
          voice_id: selectedVoice,
          model_id: ttsModel,
          voice_settings: {
            stability: ttsSettings.stability,
            similarity_boost: ttsSettings.similarity_boost,
            style: ttsSettings.style,
            use_speaker_boost: ttsSettings.use_speaker_boost,
          },
          speed: ttsSettings.speed,
          output_format: "mp3_44100_128"
        })
      });
      if (!res.ok) throw new Error("Voice generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrls(p => ({ ...p, [langId]: url }));
    } catch (e) { setTtsError(e.message); }
    setTtsGenerating(p => ({ ...p, [langId]: false }));
  };

  const insertTag = (langId, tag) => {
    const text = ttsTextOverrides[langId] || results[langId] || "";
    const pos = ttsTextareaRef.current?.selectionStart ?? text.length;
    const newText = text.slice(0, pos) + tag + text.slice(pos);
    setTtsTextOverrides(p => ({ ...p, [langId]: newText }));
  };

  const downloadAudio = (langId) => {
    const url = audioUrls[langId];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `voiceover_${langId}.mp3`;
    a.click();
  };

  const loadFromHistory = (entry) => {
    setScript(entry.input);
    setSelected(entry.langs || ["hindi"]);
    setResults(entry.results || {});
  };

  const toggleLang = (id) => {
    playPop();
    setSelected(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
    );
  };

  const convert = async () => {
    if (!script.trim() || selected.length === 0) return;
    setLoading(true); setError(""); setResults({}); setStreaming({});
    const streamingSet = {};
    try {
      const promises = selected.map(async (langId) => {
        try {
          streamingSet[langId] = true;
          setStreaming(s => ({ ...s, [langId]: true }));
          const examples = FEW_SHOT_EXAMPLES[langId] || [];
          const sysPrompt = buildSingleConverterSystem(langId, tone) + (translitMode ? `

TRANSLITERATION MODE (IMPORTANT):
After writing the converted text in the target script, add a blank line and then provide a full Roman script (Latin alphabet) transliteration of your output. Label it "Transliteration:" on its own line. The transliteration should be natural Hinglish-style romanization (e.g. "Kaise ho bhai?" not "Kaisē hō bhāī?"). Use simple English letters, no diacritics. This applies to all non-English outputs.` : "");
          const raw = await streamConvert({
            model: "anthropic/claude-sonnet-4-5",
            system: sysPrompt,
            messages: [...examples, { role: "user", content: script }],
            onChunk: (partial) => {
              setResults(prev => ({ ...prev, [langId]: partial }));
            }
          });
          setResults(prev => ({ ...prev, [langId]: raw.trim() }));
          setStreaming(s => { const n = { ...s }; delete n[langId]; return n; });
          return { langId, text: raw.trim(), ok: true };
        } catch (err) {
          setStreaming(s => { const n = { ...s }; delete n[langId]; return n; });
          return { langId, text: "", ok: false, err: err.message };
        }
      });
      const all = await Promise.all(promises);
      const finalMap = {};
      const errors = [];
      all.forEach(r => {
        if (r.ok) finalMap[r.langId] = r.text;
        else errors.push(`${r.langId}: ${r.err}`);
      });
      setResults(finalMap);
      if (errors.length > 0 && Object.keys(finalMap).length === 0) setError(errors.join("; "));
      // Save to history
      if (Object.keys(finalMap).length > 0) {
        const entry = { id: Date.now(), input: script, results: finalMap, langs: selected, date: new Date().toISOString() };
        const hist = JSON.parse(localStorage.getItem("ruhi_history") || "[]");
        hist.unshift(entry);
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const filtered = hist.filter(h => h.id > cutoff).slice(0, 100);
        localStorage.setItem("ruhi_history", JSON.stringify(filtered));
      }
    } catch (e) {
      setError(e.message);
      playError();
    }
    setLoading(false); setStreaming({});
    if (Object.keys(results).length > 0) playSuccess();
  };

  const copy = (text, id) => { navigator.clipboard.writeText(text); setCopied(id); playPop(); setTimeout(() => setCopied(""), 2000); };

  /* --- SRT Parser/Formatter --- */
  const parseSrt = (text) => {
    const blocks = [];
    const parts = text.trim().split(/\n\s*\n/);
    for (const part of parts) {
      const lines = part.trim().split("\n");
      if (lines.length < 3) continue;
      const index = lines[0].trim();
      const time = lines[1].trim();
      const content = lines.slice(2).join("\n");
      blocks.push({ index, time, text: content });
    }
    return blocks;
  };

  const buildSrt = (blocks) => {
    return blocks.map(b => `${b.index}\n${b.time}\n${b.text}`).join("\n\n") + "\n";
  };

  const downloadSrt = (langId) => {
    if (!srtMode || !results[langId]) return;
    const lines = results[langId].split("\n");
    const blocks = srtMode.blocks.map((b, i) => ({
      index: b.index,
      time: b.time,
      text: lines[i] || b.text,
    }));
    const srtText = buildSrt(blocks);
    const blob = new Blob([srtText], { type: "text/srt;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const lang = LANGUAGES.find(l => l.id === langId);
    a.href = url;
    a.download = `${srtMode.fileName.replace(/\.srt$/i, "")}_${lang?.sub || langId}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* --- Simple CSV Parser --- */
  const parseCsv = (text) => {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return null;
    const header = lines[0].trim();
    const rows = lines.slice(1).map(l => l.trim()).filter(Boolean);
    return { header, rows };
  };

  const buildCsvOutput = (batchRes) => {
    if (!csvMode || !batchRes) return "";
    const langs = Object.keys(batchRes);
    const headerParts = [csvMode.header, ...langs.map(id => LANGUAGES.find(l => l.id === id)?.sub || id)];
    const outputLines = [headerParts.join(",")];
    csvMode.rows.forEach((row, i) => {
      const values = ['"' + row.replace(/"/g, '""') + '"'];
      langs.forEach(langId => {
        const val = batchRes[langId]?.[i] || "";
        values.push('"' + val.replace(/"/g, '""') + '"');
      });
      outputLines.push(values.join(","));
    });
    return outputLines.join("\n");
  };

  const downloadCsv = () => {
    const csvText = buildCsvOutput(batchResults);
    if (!csvText) return;
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvMode.fileName.replace(/\.csv$/i, "")}_converted.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* --- Batch Convert (CSV) --- */
  const convertBatch = async () => {
    if (!csvMode || selected.length === 0) return;
    setLoading(true); setError(""); setBatchResults(null);
    const total = csvMode.rows.length * selected.length;
    let done = 0;
    setBatchProgress({ done: 0, total });
    const res = {};
    for (const langId of selected) {
      res[langId] = [];
      const examples = FEW_SHOT_EXAMPLES[langId] || [];
      for (let i = 0; i < csvMode.rows.length; i++) {
        try {
          const raw = await streamConvert({
            model: "anthropic/claude-sonnet-4-5",
            system: buildSingleConverterSystem(langId, tone),
            messages: [...examples, { role: "user", content: csvMode.rows[i] }],
          });
          res[langId].push(raw.trim());
        } catch (err) {
          res[langId].push(`[Error: ${err.message}]`);
        }
        done++;
        setBatchProgress({ done, total });
      }
    }
    setBatchResults(res);
    setLoading(false);
    setBatchProgress(null);
  };

  /* --- File Upload Handler --- */
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      if (file.name.endsWith(".srt")) {
        const blocks = parseSrt(text);
        if (blocks.length > 0) {
          setSrtMode({ blocks, fileName: file.name });
          setCsvMode(null); setBatchResults(null);
          setScript(blocks.map(b => b.text).join("\n"));
        } else {
          setScript(text);
          setSrtMode(null); setCsvMode(null);
        }
      } else if (file.name.endsWith(".csv")) {
        const parsed = parseCsv(text);
        if (parsed && parsed.rows.length > 0) {
          setCsvMode({ ...parsed, fileName: file.name });
          setSrtMode(null); setBatchResults(null);
          setScript(`[CSV: ${parsed.rows.length} rows loaded from ${file.name}]`);
        } else {
          setScript(text);
          setCsvMode(null); setSrtMode(null);
        }
      } else {
        setScript(text);
        setSrtMode(null); setCsvMode(null);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* --- Bulk File Upload Handler --- */
  const handleBulkUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImportError("");
    const textExts = [".txt", ".text", ".srt", ".csv"];
    const supported = [];
    const unsupported = [];
    files.forEach(f => {
      const ext = "." + f.name.split(".").pop().toLowerCase();
      if (textExts.includes(ext)) supported.push(f);
      else unsupported.push(f.name);
    });
    if (unsupported.length > 0) {
      setImportError(`Cannot parse binary files: ${unsupported.join(", ")}. Please copy-paste content or convert to .txt first.`);
      playError();
    }
    if (supported.length === 0) { e.target.value = ""; return; }
    let loaded = 0;
    const parts = [];
    supported.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        if (supported.length > 1) {
          parts[idx] = `--- ${file.name} ---\n${text}`;
        } else {
          // Single file — use existing logic for srt/csv
          if (file.name.endsWith(".srt")) {
            const blocks = parseSrt(text);
            if (blocks.length > 0) {
              setSrtMode({ blocks, fileName: file.name });
              setCsvMode(null); setBatchResults(null);
              setScript(blocks.map(b => b.text).join("\n"));
              playSuccess();
              return;
            }
          } else if (file.name.endsWith(".csv")) {
            const parsed = parseCsv(text);
            if (parsed && parsed.rows.length > 0) {
              setCsvMode({ ...parsed, fileName: file.name });
              setSrtMode(null); setBatchResults(null);
              setScript(`[CSV: ${parsed.rows.length} rows loaded from ${file.name}]`);
              playSuccess();
              return;
            }
          }
          parts[idx] = text;
        }
        loaded++;
        if (loaded === supported.length) {
          setScript(parts.filter(Boolean).join("\n\n"));
          setSrtMode(null); setCsvMode(null);
          playSuccess();
        }
      };
      reader.readAsText(file);
    });
    e.target.value = "";
  };

  /* --- Link Import Handler --- */
  const handleLinkImport = async () => {
    if (!importLink.trim()) return;
    setImportLoading(true);
    setImportError("");
    try {
      let url = importLink.trim();
      if (url.includes("docs.google.com/document")) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) url = `https://docs.google.com/document/d/${match[1]}/export?format=txt`;
      }
      if (url.includes("sheets.google.com")) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) url = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch (${res.status}). For Google Docs, try File > Download as .txt and upload instead.`);
      const text = await res.text();
      if (!text.trim()) throw new Error("Document appears empty");
      setScript(text);
      setSrtMode(null); setCsvMode(null);
      setImportLink("");
      playSuccess();
    } catch (err) {
      setImportError(err.message || "Failed to fetch document. Try uploading the file instead.");
      playError();
    }
    setImportLoading(false);
  };

  /* --- Download Format Helpers --- */
  const generatePdfBlob = (text) => {
    const lines = text.split("\n");
    const pageHeight = 792; const pageWidth = 612;
    const margin = 50; const lineH = 14; const fontSize = 10;
    const usable = pageHeight - 2 * margin;
    const linesPerPage = Math.floor(usable / lineH);
    const pages = [];
    for (let i = 0; i < lines.length; i += linesPerPage) {
      pages.push(lines.slice(i, i + linesPerPage));
    }
    if (pages.length === 0) pages.push([""]);
    const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    let objCount = 0;
    const objs = [];
    const addObj = (content) => { objCount++; objs.push({ id: objCount, content }); return objCount; };

    addObj("<< /Type /Catalog /Pages 2 0 R >>");
    const pagesObjId = addObj("PAGES_PLACEHOLDER");
    const fontId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

    const pageObjIds = [];
    const contentObjIds = [];
    pages.forEach((pageLines, pi) => {
      const streamLines = [`BT`, `/F1 ${fontSize} Tf`, `${margin} ${pageHeight - margin} Td`, `${lineH} TL`];
      pageLines.forEach(l => { streamLines.push(`(${esc(l)}) Tj T*`); });
      streamLines.push("ET");
      const stream = streamLines.join("\n");
      const contentId = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      contentObjIds.push(contentId);
      const pageId = addObj(`<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`);
      pageObjIds.push(pageId);
    });

    objs[pagesObjId - 1].content = `<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [];
    objs.forEach(obj => {
      offsets.push(pdf.length);
      pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
    });
    const xrefOff = pdf.length;
    pdf += `xref\n0 ${objCount + 1}\n0000000000 65535 f \n`;
    offsets.forEach(off => { pdf += `${String(off).padStart(10, "0")} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  };

  const generateRtfBlob = (text) => {
    const escRtf = (s) => s.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/[^\x00-\x7F]/g, (c) => `\\u${c.charCodeAt(0)}?`);
    let rtf = "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Helvetica;}}\n\\f0\\fs22\n";
    text.split("\n").forEach(line => { rtf += escRtf(line) + "\\par\n"; });
    rtf += "}";
    return new Blob([rtf], { type: "application/rtf" });
  };

  const downloadAs = (format) => {
    const text = formatAllResults();
    if (!text) return;
    const dateSuffix = new Date().toISOString().slice(0, 10);
    let blob, ext;
    switch (format) {
      case "pdf":
        blob = generatePdfBlob(text); ext = "pdf"; break;
      case "rtf":
        blob = generateRtfBlob(text); ext = "rtf"; break;
      case "each": {
        selected.filter(id => results[id]).forEach(id => {
          const lang = LANGUAGES.find(l => l.id === id);
          const b = new Blob([results[id]], { type: "text/plain;charset=utf-8" });
          const u = URL.createObjectURL(b);
          const a = document.createElement("a");
          a.href = u; a.download = `ruhi-${lang?.sub || id}-${dateSuffix}.txt`; a.click();
          URL.revokeObjectURL(u);
        });
        setDownloadDropdown(false);
        return;
      }
      default:
        blob = new Blob([text], { type: "text/plain;charset=utf-8" }); ext = "txt"; break;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ruhi-conversion-${dateSuffix}.${ext}`; a.click();
    URL.revokeObjectURL(url);
    setDownloadDropdown(false);
  };

  const formatAllResults = () => {
    return selected
      .filter(id => results[id])
      .map(id => {
        const lang = LANGUAGES.find(l => l.id === id);
        return `=== ${lang?.label || id} (${lang?.sub || id}) ===\n${results[id]}`;
      })
      .join("\n\n");
  };

  const copyAll = () => {
    navigator.clipboard.writeText(formatAllResults());
    setCopied("__all__");
    setTimeout(() => setCopied(""), 2000);
  };

  const downloadAll = () => {
    const text = formatAllResults();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ruhi-conversion-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Command Palette action handler
  const handleCmdAction = (action) => {
    setCmdPaletteOpen(false);
    switch (action) {
      case "convert": (csvMode ? convertBatch : convert)(); break;
      case "darkMode": setDarkMode(d => { localStorage.setItem("ruhi_dark", d ? "0" : "1"); return !d; }); break;
      case "fullscreen": setFullscreen(f => !f); break;
      case "history": setHistoryOpen(true); break;
      case "shortcuts": setShowShortcuts(true); break;
      case "selectAll": setSelected(LANGUAGES.map(l => l.id)); break;
      case "deselectAll": setSelected([LANGUAGES[0].id]); break;
      case "newScript": setResults({}); setScript(""); break;
      case "copyAll": copyAll(); break;
      case "download": downloadAll(); break;
      case "saveFavorite": saveFavorite(); break;
      case "tabStudio": setActiveTab("studio"); break;
      case "tabDubbing": setActiveTab("dubbing"); break;
      case "tabConverter": setActiveTab("converter"); break;
      case "voiceInput": toggleVoice(); break;
      case "tabAnalytics": setActiveTab("analytics"); break;
      case "tabSubtitle": setActiveTab("subtitle"); break;
      case "tabTemplates": setActiveTab("templates"); break;
      case "tabGlossary": setActiveTab("glossary"); break;
      case "tabTTS": setActiveTab("ttsPreview"); break;
      case "tabDiff": setActiveTab("diff"); break;
      default: break;
    }
    playClick();
  };

  // Template handler
  const handleUseTemplate = (template) => {
    setScript(template.script || "");
    if (template.languages?.length > 0) setSelected(template.languages);
    setActiveTab("converter");
    setSrtMode(null); setCsvMode(null);
    playSuccess();
  };

  const wc = script.trim() ? script.trim().split(/\s+/).length : 0;
  const cp = Math.min((script.length / 2000) * 100, 100);
  const can = !loading && !!script.trim() && selected.length > 0;

  return (
    <div className={darkMode ? "dark" : ""} style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: darkMode ? "#000000" : "#f0ebe3", minHeight: "100vh", color: darkMode ? "#e8e0d4" : "#1e1b18", position: "relative", transition: "background 0.3s, color 0.3s" }}>
      <style>{CSS}</style>
      <FireflyBackground />

      {/* Command Palette */}
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} darkMode={darkMode} onAction={handleCmdAction} />

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <>
          <div onClick={() => setShowShortcuts(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, backdropFilter: "blur(4px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 101,
            width: "380px", maxWidth: "90vw", borderRadius: "20px", overflow: "hidden",
            background: darkMode ? "linear-gradient(145deg, #111, #0a0a0a)" : "linear-gradient(145deg, #f5f0e8, #ece7dd)",
            border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.2)"}`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "fadeInScale 0.2s ease",
          }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.12)"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: 800, color: darkMode ? "#d4c8b0" : "#78350f" }}>{"\u2328\uFE0F"} Keyboard Shortcuts</span>
              <button onClick={() => setShowShortcuts(false)} className="clay-btn" style={{ padding: "4px 10px", fontSize: "12px", fontWeight: 700 }}>{"\u2716"}</button>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {[
                ["Ctrl + K", "Command Palette"],
                ["Ctrl + Enter", "Convert script"],
                ["Ctrl + Shift + F", "Toggle fullscreen"],
                ["Ctrl + Shift + D", "Toggle dark mode"],
                ["Ctrl + Shift + H", "Toggle history"],
                ["Ctrl + /", "Show shortcuts"],
                ["Escape", "Exit fullscreen / close"],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(166,152,130,0.08)"}` }}>
                  <span style={{ fontSize: "12px", color: darkMode ? "#e8e0d4" : "#3d3425" }}>{desc}</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", background: darkMode ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)", color: "#d97706", fontFamily: "monospace" }}>{key}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Topbar */}
      <div className="topbar-c" style={{ padding: "0 28px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", background: darkMode ? "linear-gradient(145deg, #231e14ee, #1c1810ee)" : "linear-gradient(145deg, #f5f0e8ee, #ece7ddee)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 20, borderBottom: `1px solid ${darkMode ? "rgba(60,50,35,0.3)" : "rgba(166,152,130,0.15)"}`, boxShadow: darkMode ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(166,152,130,0.15)", transition: "background 0.3s" }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <Notifications darkMode={darkMode} />
          <button onClick={() => { playClick(); setCmdPaletteOpen(true); }} className="clay-btn" style={{ padding: "6px 12px", fontSize: "11px", lineHeight: 1, fontWeight: 700, color: darkMode ? "#b0a090" : "#6b5e50", display: "flex", alignItems: "center", gap: "4px" }} title="Command Palette (Ctrl+K)">
            {"🔍"} <span style={{ fontSize: "9px", opacity: 0.7, fontFamily: "monospace" }}>Ctrl+K</span>
          </button>
          <button onClick={() => { playClick(); setShowShortcuts(s => !s); }} className="clay-btn" style={{ padding: "6px 10px", fontSize: "12px", lineHeight: 1 }} title="Keyboard Shortcuts (Ctrl+/)">
            {"\u2328\uFE0F"}
          </button>
          <button onClick={() => { playClick(); setFullscreen(f => !f); }} className="clay-btn" style={{ padding: "6px 10px", fontSize: "12px", lineHeight: 1 }} title={fullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (Ctrl+Shift+F)"}>
            {fullscreen ? "\u2716" : "\u26F6"}
          </button>
          <button onClick={() => { playClick(); setThemeSchedule(s => { const next = !s; localStorage.setItem("ruhi_theme_schedule", next ? "1" : "0"); return next; }); }} className="clay-btn" style={{ padding: "6px 10px", fontSize: "12px", lineHeight: 1, background: themeSchedule ? (darkMode ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.12)") : undefined }} title={themeSchedule ? "Auto theme ON (7pm-7am dark)" : "Auto theme OFF"}>
            {"\u{1F553}"}
          </button>
          <div className="theme-picker-wrap" ref={themePickerRef}>
            <button onClick={() => { playClick(); setThemePickerOpen(p => !p); }} className="clay-btn" style={{ padding: "6px 10px", fontSize: "12px", lineHeight: 1, display: "flex", alignItems: "center", gap: "5px" }} title="Accent Theme">
              <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: (ACCENT_THEMES[accentColor] || ACCENT_THEMES.amber).primary, display: "inline-block", boxShadow: `0 0 6px ${(ACCENT_THEMES[accentColor] || ACCENT_THEMES.amber).primary}40` }} />
              <span style={{ fontSize: "10px", fontWeight: 700, color: darkMode ? "#b0a090" : "#6b5e50" }}>{"\u25BE"}</span>
            </button>
            {themePickerOpen && (
              <div className="theme-picker-dropdown" style={{
                background: darkMode ? "linear-gradient(145deg, #0d0d0d, #080808)" : "linear-gradient(145deg, #f5f0e8, #ece7dd)",
                border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.2)"}`,
                boxShadow: darkMode ? "0 8px 24px rgba(0,0,0,0.5)" : "6px 6px 18px rgba(166,152,130,0.3), -4px -4px 12px rgba(255,255,255,0.6)",
              }}>
                {Object.entries(ACCENT_THEMES).map(([key, theme]) => (
                  <div
                    key={key}
                    className={`theme-dot${accentColor === key ? " active" : ""}`}
                    style={{ background: theme.primary, color: theme.primary }}
                    title={theme.label}
                    onClick={() => { playClick(); setAccentColor(key); setThemePickerOpen(false); }}
                  />
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { playClick(); setDarkMode(d => { localStorage.setItem("ruhi_dark", d ? "0" : "1"); return !d; }); }} className="clay-btn" style={{ padding: "6px 12px", fontSize: "15px", lineHeight: 1 }} title={darkMode ? "Light Mode" : "Dark Mode"}>
            {darkMode ? "\u2600\uFE0F" : "\u{1F319}"}
          </button>
          <button onClick={() => setHistoryOpen(true)} className="clay-btn" style={{ padding: "6px 14px", fontSize: "11px", fontWeight: 700, color: darkMode ? "#d4c8b0" : "#78350f", display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "13px" }}>&#128218;</span> History
          </button>
          <div className="live-dot" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#16a34a", padding: "5px 12px", borderRadius: "14px", background: "linear-gradient(145deg, #f0ebe3, #e4ddd1)", boxShadow: "3px 3px 6px rgba(166,152,130,0.3), -2px -2px 5px rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.4)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Connected
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 28px 0", display: "flex", gap: "8px", position: "relative", zIndex: 1, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
        <button onClick={() => { playClick(); setActiveTab("converter"); }} className={activeTab === "converter" ? "clay-btn-primary" : "clay-btn"} style={{
          padding: "10px 22px", borderRadius: "14px", border: "none", fontSize: "12px", fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          ...(activeTab !== "converter" ? { color: darkMode ? "#b0a090" : "#6b5e50" } : {})
        }}>
          {"\u270D\uFE0F"} Script Converter
        </button>
        <button onClick={() => { playClick(); setActiveTab("studio"); }} className={activeTab === "studio" ? "clay-btn-primary" : "clay-btn"} style={{
          padding: "10px 22px", borderRadius: "14px", border: "none", fontSize: "12px", fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          ...(activeTab !== "studio" ? { color: darkMode ? "#b0a090" : "#6b5e50" } : {})
        }}>
          {"\uD83C\uDFAC"} Content Studio
        </button>
        <button onClick={() => { playClick(); setActiveTab("dubbing"); }} className={activeTab === "dubbing" ? "clay-btn-primary" : "clay-btn"} style={{
          padding: "10px 22px", borderRadius: "14px", border: "none", fontSize: "12px", fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          ...(activeTab !== "dubbing" ? { color: darkMode ? "#b0a090" : "#6b5e50" } : {})
        }}>
          {"\uD83C\uDFA5"} Video Dub
        </button>
        <button onClick={() => { playClick(); setActiveTab("ttsPreview"); }} className={activeTab === "ttsPreview" ? "clay-btn-primary" : "clay-btn"} style={{
          padding: "10px 22px", borderRadius: "14px", border: "none", fontSize: "12px", fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          ...(activeTab !== "ttsPreview" ? { color: darkMode ? "#b0a090" : "#6b5e50" } : {})
        }}>
          {"🔊"} TTS Preview
        </button>
        <button onClick={() => { playClick(); setActiveTab("subtitle"); }} className={activeTab === "subtitle" ? "clay-btn-primary" : "clay-btn"} style={{
          padding: "10px 22px", borderRadius: "14px", border: "none", fontSize: "12px", fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          ...(activeTab !== "subtitle" ? { color: darkMode ? "#b0a090" : "#6b5e50" } : {})
        }}>
          {"📝"} Subtitle Studio
        </button>
        <button onClick={() => { playClick(); setActiveTab("diff"); }} className={activeTab === "diff" ? "clay-btn-primary" : "clay-btn"} style={{
          padding: "10px 22px", borderRadius: "14px", border: "none", fontSize: "12px", fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          ...(activeTab !== "diff" ? { color: darkMode ? "#b0a090" : "#6b5e50" } : {})
        }}>
          {"🔍"} Diff View
        </button>
        <button onClick={() => { playClick(); setActiveTab("templates"); }} className={activeTab === "templates" ? "clay-btn-primary" : "clay-btn"} style={{
          padding: "10px 22px", borderRadius: "14px", border: "none", fontSize: "12px", fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          ...(activeTab !== "templates" ? { color: darkMode ? "#b0a090" : "#6b5e50" } : {})
        }}>
          {"📚"} Templates
        </button>
        <button onClick={() => { playClick(); setActiveTab("analytics"); }} className={activeTab === "analytics" ? "clay-btn-primary" : "clay-btn"} style={{
          padding: "10px 22px", borderRadius: "14px", border: "none", fontSize: "12px", fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          ...(activeTab !== "analytics" ? { color: darkMode ? "#b0a090" : "#6b5e50" } : {})
        }}>
          {"📊"} Analytics
        </button>
        <button onClick={() => { playClick(); setActiveTab("glossary"); }} className={activeTab === "glossary" ? "clay-btn-primary" : "clay-btn"} style={{
          padding: "10px 22px", borderRadius: "14px", border: "none", fontSize: "12px", fontWeight: 800,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
          ...(activeTab !== "glossary" ? { color: darkMode ? "#b0a090" : "#6b5e50" } : {})
        }}>
          {"📖"} Glossary
        </button>
      </div>

      {/* Non-converter tabs — solid background to prevent firefly bleed-through */}
      {activeTab !== "converter" && (
        <div style={{ position: "relative", zIndex: 1, minHeight: "calc(100vh - 160px)", background: darkMode ? "#000000" : "#f0ebe3" }}>
          {activeTab === "studio" && <ContentStudio darkMode={darkMode} streamConvert={streamConvert} dialectRules={DIALECT_RULES} />}
          {activeTab === "dubbing" && <VideoDub darkMode={darkMode} streamConvert={streamConvert} />}
          {activeTab === "ttsPreview" && <TTSPreview darkMode={darkMode} />}
          {activeTab === "subtitle" && <SubtitleStudio darkMode={darkMode} streamConvert={streamConvert} />}
          {activeTab === "diff" && (
            <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 22px 80px" }}>
              <ScriptDiff original={script} results={results} languages={LANGUAGES} darkMode={darkMode} />
            </div>
          )}
          {activeTab === "templates" && <TemplateLibrary darkMode={darkMode} onUseTemplate={handleUseTemplate} />}
          {activeTab === "analytics" && <AnalyticsDashboard darkMode={darkMode} />}
          {activeTab === "glossary" && <GlossaryManager darkMode={darkMode} />}
        </div>
      )}

      {/* Script Converter Tab */}
      {activeTab === "converter" && <div className="main-c" style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 22px 80px", position: "relative", zIndex: 1 }}>

        {/* Top Controls: Language Cards + Tone side by side */}
        <div className="top-controls-row" style={{ display: "flex", gap: "16px", marginBottom: "20px", alignItems: "stretch" }}>
          {/* Language Cards */}
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <LanguageCards selected={selected} onToggle={toggleLang} onSelectAll={() => setSelected(LANGUAGES.map(l => l.id))} onDeselectAll={() => setSelected([LANGUAGES[0].id])} />
          </div>

          {/* Tone Selector */}
          <div className="clay tone-sidebar" style={{ padding: 0, overflow: "hidden", flexShrink: 0, width: "220px", alignSelf: "stretch" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(166,152,130,0.12)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px" }}>{"\u{1F3AD}"}</span>
              <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase", color: darkMode ? "#d4c8b0" : "#78350f" }}>Tone</span>
            </div>
            <div style={{ padding: "12px 14px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {TONES.map(t => {
                const active = tone === t.id;
                return (
                  <button key={t.id} onClick={() => setTone(t.id)} className="clay-btn" style={{
                    padding: "6px 10px", fontSize: "10.5px", fontWeight: active ? 800 : 600,
                    color: active ? "#d97706" : (darkMode ? "#b0a090" : "#6b5e50"),
                    background: active ? (darkMode ? "linear-gradient(145deg, rgba(217,119,6,0.15), rgba(217,119,6,0.05))" : "linear-gradient(145deg, rgba(245,158,11,0.12), rgba(245,158,11,0.05))") : undefined,
                    border: active ? "1.5px solid rgba(245,158,11,0.3)" : undefined,
                    display: "flex", alignItems: "center", gap: "4px"
                  }}>
                    <span style={{ fontSize: "12px" }}>{t.icon}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Favorites Bar */}
        {favorites.length > 0 && (
          <div className="clay" style={{ padding: "10px 18px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", animation: "fadeUp 0.25s ease" }}>
            <span style={{ fontSize: "10px", fontWeight: 800, color: darkMode ? "#d4c8b0" : "#78350f", textTransform: "uppercase", letterSpacing: "1px" }}>{"\u2B50"} Favorites</span>
            {favorites.map(fav => (
              <div key={fav.key} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button onClick={() => loadFavorite(fav)} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 600, color: darkMode ? "#d4c8b0" : "#78350f" }}>
                  {fav.name}
                </button>
                <button onClick={() => removeFavorite(fav.key)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: "#dc2626", padding: "2px", lineHeight: 1 }}>{"\u2716"}</button>
              </div>
            ))}
          </div>
        )}

        {/* Two-column layout: Input (left) | Output (right) */}
        <div className="converter-cols" style={{ display: "flex", gap: "20px", alignItems: "flex-start", ...(fullscreen ? { position: "fixed", inset: 0, zIndex: 60, background: darkMode ? "#000" : "#f0ebe3", padding: "20px", overflow: "auto" } : {}) }}>

        {/* Left Column — Script Input */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <div className="clay ta-focus" style={{ marginBottom: "16px", overflow: "hidden" }}>
          <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(166,152,130,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>&#9997;&#65039;</span>
              <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "1.2px", textTransform: "uppercase", color: darkMode ? "#d4c8b0" : "#78350f" }}>Script Input</span>
              {srtMode && (
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#16a34a", background: "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: "6px" }}>
                  SRT &middot; {srtMode.blocks.length} blocks
                </span>
              )}
              {csvMode && (
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#0891b2", background: "rgba(8,145,178,0.1)", padding: "2px 8px", borderRadius: "6px" }}>
                  CSV &middot; {csvMode.rows.length} rows
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input ref={fileInputRef} type="file" accept=".txt,.srt,.csv,.text" onChange={handleFileUpload} style={{ display: "none" }} />
              <button onClick={() => fileInputRef.current?.click()} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: darkMode ? "#d4c8b0" : "#78350f" }}>
                {"\u{1F4C1}"} Upload
              </button>
              <button onClick={toggleVoice} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: voiceListening ? "#ef4444" : (darkMode ? "#d4c8b0" : "#78350f"), background: voiceListening ? "rgba(239,68,68,0.12)" : undefined, animation: voiceListening ? "pulse 1.5s infinite" : undefined }} title={voiceListening ? "Stop listening" : "Voice input (speak to type)"}>
                {"\u{1F3A4}"} {voiceListening ? "Stop" : "Mic"}
              </button>
              <button onClick={saveFavorite} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: darkMode ? "#d4c8b0" : "#78350f" }} title="Save current languages as favorite">
                {"\u2B50"} Save Fav
              </button>
              <button onClick={() => { setFindReplaceOpen(v => !v); playClick(); }} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: findReplaceOpen ? "#f59e0b" : (darkMode ? "#d4c8b0" : "#78350f"), background: findReplaceOpen ? "rgba(245,158,11,0.12)" : undefined }} title="Find & Replace">
                {"\uD83D\uDD0D"} Find
              </button>
              {detectedLang && (
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#d97706", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "3px" }}>
                  {"🌐"} {detectedLang.label} ({detectedLang.confidence}%)
                </span>
              )}
              <span className="word-count-text" style={{ fontSize: "11px", color: "#92400e", fontWeight: 600 }}>{wc} words</span>
              <span className="char-count-text" style={{ fontSize: "11px", color: script.length > 2000 ? "#dc2626" : "#92400e", fontWeight: 600 }}>{script.length} chars</span>
            </div>
          </div>
          {/* Font Size Slider */}
          <div style={{ padding: "6px 22px", borderBottom: "1px solid rgba(166,152,130,0.08)", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: darkMode ? "#807060" : "#a08060" }}>Aa</span>
            <input type="range" min="11" max="22" value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{ flex: 1, accentColor: "#f59e0b", height: "3px", maxWidth: "140px" }} />
            <span style={{ fontSize: "10px", fontWeight: 700, color: darkMode ? "#807060" : "#a08060", minWidth: "22px" }}>{fontSize}</span>
          </div>
          {/* Find & Replace Panel */}
          {findReplaceOpen && (
            <div style={{ padding: "10px 22px", borderBottom: "1px solid rgba(166,152,130,0.1)", background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(166,152,130,0.04)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                <input value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find..." style={{ flex: "1 1 120px", padding: "6px 10px", fontSize: "12px", borderRadius: "8px", border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(166,152,130,0.25)"}`, background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)", color: "inherit", outline: "none", minWidth: "100px" }} />
                <input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace..." style={{ flex: "1 1 120px", padding: "6px 10px", fontSize: "12px", borderRadius: "8px", border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(166,152,130,0.25)"}`, background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)", color: "inherit", outline: "none", minWidth: "100px" }} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                <button onClick={() => doReplace(false)} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: darkMode ? "#d4c8b0" : "#78350f" }}>Replace</button>
                <button onClick={() => doReplace(true)} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: darkMode ? "#d4c8b0" : "#78350f" }}>Replace All</button>
                <button onClick={() => setFindCaseInsensitive(v => !v)} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: findCaseInsensitive ? "#f59e0b" : (darkMode ? "#d4c8b0" : "#78350f"), background: findCaseInsensitive ? "rgba(245,158,11,0.12)" : undefined }} title="Case insensitive">Aa</button>
                <button onClick={() => setFindRegex(v => !v)} className="clay-btn" style={{ padding: "4px 10px", fontSize: "10px", fontWeight: 700, color: findRegex ? "#f59e0b" : (darkMode ? "#d4c8b0" : "#78350f"), background: findRegex ? "rgba(245,158,11,0.12)" : undefined }} title="Regex mode">.*</button>
                {findText && <span style={{ fontSize: "10px", fontWeight: 700, color: findMatchCount > 0 ? "#16a34a" : "#dc2626" }}>{findMatchCount} match{findMatchCount !== 1 ? "es" : ""}</span>}
              </div>
            </div>
          )}
          <div style={{ padding: "18px 22px" }}>
            <textarea value={script} onChange={e => setScript(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) convert(); }}
              placeholder={"Kisi bhi bhasha mein script paste karo...\n\nHindi, English, Bhojpuri, Gujarati, Haryanvi, Rajasthani, ya koi bhi mix.\n\nMultiple languages select karke ek saath convert karo!"}
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "inherit", fontSize: `${fontSize}px`, resize: "none", lineHeight: 1.9, fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: fullscreen ? "60vh" : "140px", boxSizing: "border-box", transition: "font-size 0.2s" }}
            />
            {script.length > 0 && (
              <div style={{ marginTop: "8px", height: "3px", borderRadius: "2px", background: "rgba(166,152,130,0.15)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${cp}%`, borderRadius: "2px", background: cp > 90 ? "linear-gradient(90deg,#f97316,#ef4444)" : "linear-gradient(90deg,#f59e0b,#d97706)", transition: "width 0.3s" }} />
              </div>
            )}
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid rgba(166,152,130,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(166,152,130,0.04)", flexWrap: "wrap", gap: "8px" }}>
            <span className="ctrl-hint" style={{ fontSize: "11px", color: "#a08060", fontWeight: 500 }}>Ctrl + Enter</span>
            <button onClick={() => { setTranslitMode(v => !v); playClick(); }} className="clay-btn" style={{ padding: "6px 14px", fontSize: "10px", fontWeight: 700, borderRadius: "10px", color: translitMode ? "#fff" : (darkMode ? "#d4c8b0" : "#78350f"), background: translitMode ? "linear-gradient(135deg,#f59e0b,#d97706)" : undefined, boxShadow: translitMode ? "0 2px 8px rgba(245,158,11,0.3)" : undefined, transition: "all 0.2s" }} title="Transliterate Devanagari to Roman script (Hinglish)">
              {translitMode ? "Aa" : "Aa"} Translit {translitMode ? "ON" : "OFF"}
            </button>
            <button onClick={() => { playClick(); (csvMode ? convertBatch : convert)(); }} disabled={!can} className={can ? "clay-btn-primary" : "clay-btn-primary"} style={{
              padding: "11px 28px", borderRadius: "14px", border: "none",
              cursor: can ? "pointer" : "not-allowed", fontSize: "13px",
              display: "inline-flex", alignItems: "center", gap: "7px",
            }}>
              {loading
                ? <><span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Converting {selected.length} language{selected.length > 1 ? "s" : ""}...</>
                : <>&#9889; Convert to {selected.length} language{selected.length > 1 ? "s" : ""}</>}
            </button>
          </div>
        </div>

        {/* Import From Section */}
        <div className="clay" style={{ overflow: "hidden" }}>
          <div style={{ padding: "10px 18px", borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(166,152,130,0.12)"}`, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px" }}>{"\uD83D\uDCE5"}</span>
            <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: darkMode ? "#d4c8b0" : "#78350f" }}>Import From</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
              {["link", "upload"].map(tab => (
                <button key={tab} onClick={() => { setImportTab(tab); setImportError(""); playClick(); }}
                  style={{
                    padding: "4px 12px", fontSize: "10px", fontWeight: 700, borderRadius: "8px", border: "none", cursor: "pointer",
                    background: importTab === tab
                      ? (darkMode ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.12)")
                      : "transparent",
                    color: importTab === tab
                      ? "#f59e0b"
                      : (darkMode ? "#807060" : "#92400e"),
                    transition: "all 0.15s",
                  }}>
                  {tab === "link" ? "\uD83D\uDD17 Link" : "\uD83D\uDCC2 Upload"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: "14px 18px" }}>
            {importTab === "link" ? (
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    value={importLink}
                    onChange={e => setImportLink(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleLinkImport(); }}
                    placeholder="Paste Google Docs, Pastebin, or any public text URL..."
                    style={{
                      flex: 1, padding: "9px 14px", borderRadius: "10px", fontSize: "12px",
                      border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.2)"}`,
                      background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)",
                      color: darkMode ? "#e8e0d4" : "#1e1b18", outline: "none",
                      fontFamily: "'Inter','Segoe UI',sans-serif",
                    }}
                  />
                  <button onClick={handleLinkImport} disabled={importLoading || !importLink.trim()} className="clay-btn"
                    style={{ padding: "8px 16px", fontSize: "11px", fontWeight: 700, color: darkMode ? "#d4c8b0" : "#78350f", opacity: importLoading || !importLink.trim() ? 0.5 : 1, cursor: importLoading ? "wait" : "pointer" }}>
                    {importLoading ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", border: "2px solid rgba(120,53,15,0.3)", borderTopColor: "#78350f", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                        Fetching...
                      </span>
                    ) : "Fetch"}
                  </button>
                </div>
                <div style={{ fontSize: "10px", color: darkMode ? "#605040" : "#a08060", marginTop: "6px" }}>
                  Works with raw text URLs, Pastebin, GitHub raw files. Google Docs may require CORS — use File &gt; Download as .txt if fetch fails.
                </div>
              </div>
            ) : (
              <div>
                <input ref={bulkFileRef} type="file" multiple accept=".txt,.srt,.csv,.text,.pdf,.docx" onChange={handleBulkUpload} style={{ display: "none" }} />
                <div
                  onClick={() => bulkFileRef.current?.click()}
                  style={{
                    padding: "20px", borderRadius: "12px", textAlign: "center", cursor: "pointer",
                    border: `2px dashed ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(166,152,130,0.25)"}`,
                    background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(166,152,130,0.04)",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.background = darkMode ? "rgba(245,158,11,0.05)" : "rgba(245,158,11,0.05)"; }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = darkMode ? "rgba(255,255,255,0.1)" : "rgba(166,152,130,0.25)"; e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.02)" : "rgba(166,152,130,0.04)"; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = darkMode ? "rgba(255,255,255,0.1)" : "rgba(166,152,130,0.25)";
                    e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.02)" : "rgba(166,152,130,0.04)";
                    if (e.dataTransfer.files?.length) handleBulkUpload({ target: { files: e.dataTransfer.files }, value: "" });
                  }}
                >
                  <div style={{ fontSize: "24px", marginBottom: "6px" }}>{"\uD83D\uDCC2"}</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: darkMode ? "#d4c8b0" : "#78350f", marginBottom: "4px" }}>
                    Drop files here or click to browse
                  </div>
                  <div style={{ fontSize: "10px", color: darkMode ? "#605040" : "#a08060" }}>
                    Supports TXT, SRT, CSV &middot; Select multiple files for bulk import
                  </div>
                </div>
              </div>
            )}
            {importError && (
              <div style={{ marginTop: "8px", padding: "8px 12px", borderRadius: "8px", fontSize: "11px", color: "#dc2626", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.12)" }}>
                {importError}
              </div>
            )}
          </div>
        </div>
        </div>{/* end left column */}

        {/* Right Column — Output */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>

        {/* Error */}
        {error && (
          <div className="clay error-box" style={{ padding: "14px 18px", marginBottom: "14px", borderLeft: "4px solid #ef4444", color: "#991b1b", fontSize: "13px", display: "flex", gap: "9px" }}>
            <span>&#9888;</span><span>{error}</span>
          </div>
        )}

        {/* Loading indicator with skeleton UI (only when no streaming results yet) */}
        {loading && Object.keys(results).length === 0 && (
          <div className="clay" style={{ marginBottom: "14px", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px 0", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "12px" }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", background: `linear-gradient(135deg, var(--accent-primary, #f59e0b), var(--accent-dark, #d97706))`, boxShadow: `3px 3px 6px var(--accent-dark-30, rgba(200,130,20,0.3)), -2px -2px 4px rgba(255,220,150,0.4)`, animation: `pulse 1.3s ${i * 0.22}s ease-in-out infinite` }} />)}
              </div>
              <div className="loading-text" style={{ fontSize: "13px", color: darkMode ? "#d4c8b0" : "#78350f", fontWeight: 700, marginBottom: "4px" }}>
                Converting to {selected.length} language{selected.length > 1 ? "s" : ""}...
              </div>
              <div className="loading-sub" style={{ fontSize: "10.5px", color: darkMode ? "#807060" : "#a08060", marginBottom: "6px" }}>
                {selected.map(id => LANGUAGES.find(l => l.id === id)?.label).join(", ")}
              </div>
            </div>
            <SkeletonLoader lines={5} darkMode={darkMode} />
          </div>
        )}

        {/* Results (show during streaming and after completion) */}
        {Object.keys(results).length > 0 && (
          <>
            <div className="clay" style={{ padding: "14px 20px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", borderLeft: `4px solid ${loading ? "#f59e0b" : "#22c55e"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {loading
                  ? <span style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2.5px solid rgba(245,158,11,0.3)", borderTopColor: "#f59e0b", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  : <span style={{ fontSize: "18px", color: "#16a34a" }}>&#10004;</span>
                }
                <div>
                  <div className="results-title" style={{ fontSize: "13px", fontWeight: 700, color: "#1e1b18" }}>
                    {loading
                      ? `Converting... ${Object.keys(results).length}/${selected.length} languages`
                      : `Conversion complete \u2014 ${Object.keys(results).length} language${Object.keys(results).length > 1 ? "s" : ""}`
                    }
                  </div>
                  <div className="results-sub" style={{ fontSize: "10.5px", color: "#78350f" }}>{loading ? "Results appear as they stream in" : "Ready to copy & use"}</div>
                </div>
              </div>
              {!loading && (
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={copyAll} className="clay-btn results-btn" style={{ padding: "6px 14px", fontSize: "11px", fontWeight: 700, color: copied === "__all__" ? "#16a34a" : "#78350f" }}>
                    {copied === "__all__" ? "\u2713 Copied All" : "\u{1F4CB} Copy All"}
                  </button>
                  <div ref={downloadRef} style={{ position: "relative" }}>
                    <button onClick={() => setDownloadDropdown(d => !d)} className="clay-btn results-btn" style={{ padding: "6px 14px", fontSize: "11px", fontWeight: 700, color: "#78350f", display: "flex", alignItems: "center", gap: "4px" }}>
                      {"\u2B07"} Download
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {downloadDropdown && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
                        minWidth: "180px", borderRadius: "14px", overflow: "hidden",
                        background: darkMode ? "linear-gradient(145deg, #0d0d0d, #080808)" : "linear-gradient(145deg, #f5f0e8, #ece7dd)",
                        border: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.2)"}`,
                        boxShadow: darkMode
                          ? "0 8px 24px rgba(0,0,0,0.5)"
                          : "6px 6px 18px rgba(166,152,130,0.3), -4px -4px 12px rgba(255,255,255,0.6)",
                        animation: "fadeUp 0.15s ease",
                      }}>
                        {[
                          { fmt: "txt", icon: "\uD83D\uDCC4", label: "Text (.txt)" },
                          { fmt: "pdf", icon: "\uD83D\uDCD5", label: "PDF (.pdf)" },
                          { fmt: "rtf", icon: "\uD83D\uDCC3", label: "Word/RTF (.rtf)" },
                          { fmt: "each", icon: "\uD83D\uDCC1", label: "Each Language (.txt)" },
                        ].map(opt => (
                          <button key={opt.fmt} onClick={() => { playClick(); downloadAs(opt.fmt); }}
                            style={{
                              display: "flex", alignItems: "center", gap: "10px", width: "100%",
                              padding: "10px 16px", border: "none", cursor: "pointer",
                              background: "transparent", color: darkMode ? "#e8e0d4" : "#1e1b18",
                              fontSize: "12px", fontWeight: 600, textAlign: "left",
                              transition: "background 0.12s",
                              borderBottom: opt.fmt !== "each" ? `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(166,152,130,0.08)"}` : "none",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.05)" : "rgba(245,158,11,0.08)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <span style={{ fontSize: "15px" }}>{opt.icon}</span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setResults({}); setScript(""); }} className="clay-btn" style={{ padding: "6px 14px", fontSize: "11px", fontWeight: 700, color: "#6b5e50" }}>New Script</button>
                </div>
              )}
            </div>
            {/* TTS Voice Over Panel */}
            {!loading && (
              <div className="clay tts-panel">
                <div className="tts-toggle" onClick={toggleTts}>
                  <div className={`tts-toggle-track${ttsEnabled ? " active" : ""}`}>
                    <div className="tts-toggle-thumb" />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: darkMode ? "#d4c8b0" : "#3d3425" }}>Voice Over Generation</span>
                  <span style={{ fontSize: "10px", color: darkMode ? "#807060" : "#92400e", fontWeight: 600 }}>ElevenLabs</span>
                </div>
                {ttsEnabled && (
                  <div className="tts-options">
                    <div className="tts-field">
                      <label>Voice</label>
                      <select className="clay-inner" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}>
                        {voices.length === 0 && <option value="">Loading voices...</option>}
                        {voices.map(v => (
                          <option key={v.voice_id} value={v.voice_id}>
                            {v.name}{v.labels?.accent ? ` (${v.labels.accent})` : ""}{v.labels?.gender ? ` - ${v.labels.gender}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="tts-field">
                      <label>Model</label>
                      <select className="clay-inner" value={ttsModel} onChange={e => setTtsModel(e.target.value)}>
                        <option value="eleven_multilingual_v3">Multilingual v3 (Latest)</option>
                        <option value="eleven_flash_v3">Flash v3 (Fast)</option>
                        <option value="eleven_multilingual_v2">Multilingual v2</option>
                        <option value="eleven_flash_v2_5">Flash v2.5</option>
                        <option value="eleven_flash_v2">Flash v2</option>
                        <option value="eleven_monolingual_v1">English v1</option>
                      </select>
                    </div>
                    <button className="tts-advanced-toggle" onClick={() => setTtsAdvanced(p => !p)}>
                      <span style={{ transition: "transform 0.2s", transform: ttsAdvanced ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>{"\u25B6"}</span>
                      Advanced Settings
                    </button>
                    {ttsAdvanced && (
                      <div className="tts-advanced">
                        <div className="tts-field">
                          <label>Stability ({ttsSettings.stability.toFixed(2)})</label>
                          <div className="tts-slider-row">
                            <input type="range" min="0" max="1" step="0.05" value={ttsSettings.stability} onChange={e => setTtsSettings(p => ({ ...p, stability: +e.target.value }))} />
                          </div>
                        </div>
                        <div className="tts-field">
                          <label>Similarity ({ttsSettings.similarity_boost.toFixed(2)})</label>
                          <div className="tts-slider-row">
                            <input type="range" min="0" max="1" step="0.05" value={ttsSettings.similarity_boost} onChange={e => setTtsSettings(p => ({ ...p, similarity_boost: +e.target.value }))} />
                          </div>
                        </div>
                        <div className="tts-field">
                          <label>Style ({ttsSettings.style.toFixed(2)})</label>
                          <div className="tts-slider-row">
                            <input type="range" min="0" max="1" step="0.05" value={ttsSettings.style} onChange={e => setTtsSettings(p => ({ ...p, style: +e.target.value }))} />
                          </div>
                        </div>
                        <div className="tts-field">
                          <label>Speed ({ttsSettings.speed.toFixed(1)}x)</label>
                          <div className="tts-slider-row">
                            <input type="range" min="0.5" max="2" step="0.1" value={ttsSettings.speed} onChange={e => setTtsSettings(p => ({ ...p, speed: +e.target.value }))} />
                          </div>
                        </div>
                        <label className="tts-speaker-boost">
                          <input type="checkbox" checked={ttsSettings.use_speaker_boost} onChange={e => setTtsSettings(p => ({ ...p, use_speaker_boost: e.target.checked }))} />
                          Speaker Boost
                        </label>
                      </div>
                    )}
                  </div>
                )}
                {ttsError && <div className="tts-error">{ttsError}</div>}
              </div>
            )}
            {selected.map(langId => {
              const lang = LANGUAGES.find(l => l.id === langId);
              return results[langId] ? (
                <div key={langId}>
                  <ResultCard result={results[langId]} lang={lang} copied={copied} onCopy={copy} isStreaming={!!streaming[langId]} srtMode={srtMode} onDownloadSrt={downloadSrt} onShare={shareResult} />
                  {ttsEnabled && !streaming[langId] && (
                    <div className="clay" style={{ padding: "8px 14px", marginTop: "-10px", marginBottom: "14px", borderLeft: `4px solid ${lang.color}20` }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                        {!audioUrls[langId] ? (
                          <>
                            <button
                              onClick={() => generateTTS(langId, results[langId])}
                              disabled={ttsGenerating[langId] || !selectedVoice}
                              className="clay-btn tts-generate-btn"
                              style={{ color: ttsGenerating[langId] ? "#92400e" : lang.color, opacity: ttsGenerating[langId] ? 0.7 : 1 }}
                            >
                              {ttsGenerating[langId] ? (
                                <><span style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(245,158,11,0.3)", borderTopColor: "#f59e0b", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Generating...</>
                              ) : (
                                <>{"\uD83D\uDD0A"} Generate Voice</>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                if (ttsEditingLang === langId) {
                                  setTtsEditingLang(null);
                                } else {
                                  if (!ttsTextOverrides[langId]) setTtsTextOverrides(p => ({ ...p, [langId]: results[langId] || "" }));
                                  setTtsEditingLang(langId);
                                }
                              }}
                              className="clay-btn"
                              style={{ padding: "6px 12px", fontSize: "11px", fontWeight: 700, color: ttsEditingLang === langId ? "#d97706" : (darkMode ? "#b0a090" : "#6b5e50"), whiteSpace: "nowrap" }}
                            >
                              {ttsEditingLang === langId ? "\u2716 Close Editor" : "\u270E Edit Text"}
                            </button>
                          </>
                        ) : (
                          <div className="tts-audio-row" style={{ flex: "1 1 100%", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <audio controls src={audioUrls[langId]} style={{ flex: "1 1 200px", minWidth: 0 }} />
                            <button onClick={() => downloadAudio(langId)} className="clay-btn" style={{ padding: "6px 12px", fontSize: "11px", fontWeight: 700, color: "#16a34a", whiteSpace: "nowrap" }}>
                              {"\u2B07"} Download
                            </button>
                            <button onClick={() => { setAudioUrls(p => { const n = { ...p }; delete n[langId]; return n; }); }} className="clay-btn" style={{ padding: "6px 12px", fontSize: "11px", fontWeight: 700, color: "#6b5e50", whiteSpace: "nowrap" }}>
                              Regenerate
                            </button>
                          </div>
                        )}
                      </div>
                      {ttsEditingLang === langId && (
                        <div style={{ marginTop: "10px" }}>
                          <div className="tts-tags-bar">
                            <span style={{ fontSize: "10px", fontWeight: 700, color: darkMode ? "#b0a090" : "#78350f", alignSelf: "center" }}>Tags:</span>
                            <button className="tts-tag-btn" onClick={() => insertTag(langId, '<break time="0.5s" />')}>Pause 0.5s</button>
                            <button className="tts-tag-btn" onClick={() => insertTag(langId, '<break time="1.0s" />')}>Pause 1s</button>
                            <button className="tts-tag-btn" onClick={() => insertTag(langId, '<break time="2.0s" />')}>Pause 2s</button>
                            <button className="tts-tag-btn" onClick={() => insertTag(langId, '<break time="3.0s" />')}>Pause 3s</button>
                          </div>
                          <textarea
                            ref={ttsTextareaRef}
                            className="clay-inner tts-edit-area"
                            value={ttsTextOverrides[langId] || ""}
                            onChange={e => setTtsTextOverrides(p => ({ ...p, [langId]: e.target.value }))}
                            style={{ color: darkMode ? "#e8e0d4" : "#3d3425", background: darkMode ? "rgba(60,50,35,0.3)" : "rgba(166,152,130,0.08)" }}
                          />
                          <div className="tts-tags-note">Break tags supported on Multilingual v2 & Flash models</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : loading ? (
                <div key={langId} className="clay" style={{ marginBottom: "14px", borderLeft: `4px solid ${lang?.color || "#f59e0b"}`, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px" }}>{lang?.label}</span>
                    <span style={{ fontSize: "10px", color: darkMode ? "#807060" : "#a08060" }}>Loading...</span>
                  </div>
                  <SkeletonLoader lines={4} darkMode={darkMode} />
                </div>
              ) : null;
            })}
          </>
        )}

        {/* Batch CSV Progress */}
        {batchProgress && (
          <div className="clay" style={{ padding: "20px 24px", textAlign: "center", marginBottom: "14px" }}>
            <div style={{ fontSize: "14px", color: darkMode ? "#d4c8b0" : "#78350f", fontWeight: 700, marginBottom: "10px" }}>
              Batch converting... {batchProgress.done}/{batchProgress.total}
            </div>
            <div style={{ height: "6px", borderRadius: "3px", background: darkMode ? "rgba(60,50,35,0.3)" : "rgba(166,152,130,0.15)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(batchProgress.done / batchProgress.total) * 100}%`, borderRadius: "3px", background: "linear-gradient(90deg,#f59e0b,#d97706)", transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Batch CSV Results */}
        {batchResults && csvMode && (
          <div className="clay" style={{ padding: "18px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: darkMode ? "#e8e0d4" : "#1e1b18" }}>
                  {"\u2705"} Batch complete — {csvMode.rows.length} rows &times; {Object.keys(batchResults).length} languages
                </div>
                <div className="batch-lang-text" style={{ fontSize: "11px", color: "#92400e", marginTop: "2px" }}>
                  {Object.keys(batchResults).map(id => LANGUAGES.find(l => l.id === id)?.label).join(", ")}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={downloadCsv} className="clay-btn" style={{ padding: "8px 16px", fontSize: "12px", fontWeight: 700, color: "#16a34a" }}>
                  {"\u2B07"} Download CSV
                </button>
                <button onClick={() => { setBatchResults(null); setCsvMode(null); setScript(""); }} className="clay-btn" style={{ padding: "8px 16px", fontSize: "12px", fontWeight: 700, color: "#6b5e50" }}>
                  New
                </button>
              </div>
            </div>
            {/* Preview table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.2)"}`, color: darkMode ? "#b0a090" : "#78350f", fontWeight: 700 }}>Original</th>
                    {Object.keys(batchResults).map(id => (
                      <th key={id} style={{ padding: "8px 10px", textAlign: "left", borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.2)"}`, color: LANGUAGES.find(l => l.id === id)?.color, fontWeight: 700 }}>
                        {LANGUAGES.find(l => l.id === id)?.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvMode.rows.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${darkMode ? "rgba(60,50,35,0.15)" : "rgba(166,152,130,0.1)"}`, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row}</td>
                      {Object.keys(batchResults).map(id => (
                        <td key={id} style={{ padding: "6px 10px", borderBottom: `1px solid ${darkMode ? "rgba(60,50,35,0.15)" : "rgba(166,152,130,0.1)"}`, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {batchResults[id]?.[i] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvMode.rows.length > 10 && (
                <div style={{ fontSize: "10px", color: "#a08060", textAlign: "center", padding: "8px" }}>
                  Showing 10 of {csvMode.rows.length} rows. Download CSV for full results.
                </div>
              )}
            </div>
          </div>
        )}
        </div>{/* end right column */}
        </div>{/* end two-column flex row */}
      </div>}

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(166,152,130,0.15)"}`, padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "7px", background: darkMode ? "linear-gradient(145deg, #0a0a0a, #000000)" : "linear-gradient(145deg, #f0ebe3, #e8e0d4)", transition: "background 0.3s" }}>
        <div style={{ fontSize: "11.5px", fontWeight: 500, display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
          <span className="footer-powered" style={{ color: "#92400e" }}>Powered by</span>
          <span className="gold-shine">Claude</span>
          <span style={{ color: "#c4a870" }}>&middot;</span>
          <span className="gold-shine">Built by</span>
          <span className="gold-shine">Manik Prajapati</span>
        </div>
        <div className="footer-info" style={{ fontSize: "10.5px", color: "#a08060" }}>{LANGUAGES.length} languages &middot; Multi-select &middot; Auto-detect</div>
      </div>

      {/* History Sidebar */}
      <HistorySidebar open={historyOpen} onClose={() => setHistoryOpen(false)} onLoad={loadFromHistory} />

      {/* Onboarding Wizard */}
      {onboardingStep >= 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeUp 0.3s ease" }}>
          <div className="clay" style={{ width: "420px", maxWidth: "92vw", padding: "28px", textAlign: "center", background: darkMode ? "linear-gradient(145deg, #111, #0a0a0a)" : "linear-gradient(145deg, #f5f0e8, #ece7dd)" }}>
            {onboardingStep === 0 && (<>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>{"🙏"}</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: darkMode ? "#e8e0d4" : "#1e1b18", marginBottom: "8px" }}>Namaste! Welcome to RUHI</div>
              <div style={{ fontSize: "13px", color: darkMode ? "#b0a090" : "#6b5e50", lineHeight: 1.7, marginBottom: "20px" }}>
                RUHI Multilingual Studio lets you convert scripts between 16 Indian languages, dub videos, generate voiceovers, and much more.
              </div>
            </>)}
            {onboardingStep === 1 && (<>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>{"✍️"}</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: darkMode ? "#e8e0d4" : "#1e1b18", marginBottom: "8px" }}>Script Converter</div>
              <div style={{ fontSize: "13px", color: darkMode ? "#b0a090" : "#6b5e50", lineHeight: 1.7, marginBottom: "20px" }}>
                Paste your script, select target languages, and click Convert. Supports SRT subtitles, CSV batch processing, voice input, and multiple export formats.
              </div>
            </>)}
            {onboardingStep === 2 && (<>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>{"🎥"}</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: darkMode ? "#e8e0d4" : "#1e1b18", marginBottom: "8px" }}>Video Dub & TTS</div>
              <div style={{ fontSize: "13px", color: darkMode ? "#b0a090" : "#6b5e50", lineHeight: 1.7, marginBottom: "20px" }}>
                Upload a video and RUHI will extract audio, separate stems, transcribe, translate, clone the voice, and create a dubbed version — all automatically!
              </div>
            </>)}
            {onboardingStep === 3 && (<>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>{"⌨️"}</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: darkMode ? "#e8e0d4" : "#1e1b18", marginBottom: "8px" }}>Pro Tips</div>
              <div style={{ fontSize: "13px", color: darkMode ? "#b0a090" : "#6b5e50", lineHeight: 1.7, marginBottom: "20px" }}>
                Press <b>Ctrl+K</b> for quick actions. Use <b>Ctrl+Enter</b> to convert. Chat with <b>RUHI Assistant</b> (bottom-right) for help anytime. Check out the <b>Glossary Manager</b> to create custom dictionaries!
              </div>
            </>)}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {[0,1,2,3].map(i => (
                  <span key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i === onboardingStep ? "#f59e0b" : (darkMode ? "#333" : "#d5cdc1"), transition: "background 0.2s" }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => { setOnboardingStep(-1); localStorage.setItem("ruhi_onboarding_done", "1"); }} className="clay-btn" style={{ padding: "8px 16px", fontSize: "12px", fontWeight: 700, color: darkMode ? "#b0a090" : "#6b5e50" }}>Skip</button>
                <button onClick={() => {
                  if (onboardingStep < 3) setOnboardingStep(s => s + 1);
                  else { setOnboardingStep(-1); localStorage.setItem("ruhi_onboarding_done", "1"); playSuccess(); }
                }} className="clay-btn-primary" style={{ padding: "8px 20px", borderRadius: "12px", border: "none", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}>
                  {onboardingStep < 3 ? "Next" : "Get Started!"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot */}
      <ChatBot darkMode={darkMode} streamConvert={streamConvert} />
    </div>
  );
}
