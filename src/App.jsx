import { useState, useRef, useCallback } from "react";

/* ─── Streaming fetch helper ─── */
async function streamConvert({ model, system, messages }) {
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
        if (delta) content += delta;
      } catch {}
    }
  }
  return content;
}

/* ─── Languages ─── */
const LANGUAGES = [
  {
    id: "hindi", label: "हिन्दी", sub: "Hindi", region: "India", color: "#f97316",
    bg: { grad1: "rgba(249,115,22,0.12)", grad2: "rgba(234,88,12,0.08)", grad3: "rgba(251,146,60,0.06)",
          glyphs: ["ह","ि","न","द","ी","श","ब","द","क","ह","ा","न","ी","भ","ा","ष","र","स"], accent: "#f97316" }
  },
  {
    id: "english", label: "English", sub: "English", region: "Global", color: "#3b82f6",
    bg: { grad1: "rgba(59,130,246,0.12)", grad2: "rgba(30,64,175,0.08)", grad3: "rgba(96,165,250,0.06)",
          glyphs: ["A","B","C","T","h","e","W","o","r","d","S","p","e","a","k","L","a","n"], accent: "#3b82f6" }
  },
  {
    id: "haryanvi", label: "हरियाणवी", sub: "Haryanvi", region: "Haryana", color: "#22c55e",
    bg: { grad1: "rgba(34,197,94,0.12)", grad2: "rgba(132,204,22,0.08)", grad3: "rgba(74,222,128,0.06)",
          glyphs: ["ह","री","या","ण","वी","सै","घ","णा","भा","ई","छो","रा","म्हैं","यार","बा","त","सु","ण"], accent: "#22c55e" }
  },
  {
    id: "rajasthani", label: "राजस्थानी", sub: "Rajasthani", region: "Rajasthan", color: "#eab308",
    bg: { grad1: "rgba(234,179,8,0.12)", grad2: "rgba(217,119,6,0.08)", grad3: "rgba(250,204,21,0.06)",
          glyphs: ["रा","ज","स्था","नी","छे","को","णी","म्हा","रो","घ","णो","पा","णी","सा","भा","ई","कठे","थो"], accent: "#eab308" }
  },
  {
    id: "bhojpuri", label: "भोजपुरी", sub: "Bhojpuri", region: "UP / Bihar", color: "#ef4444",
    bg: { grad1: "rgba(239,68,68,0.12)", grad2: "rgba(220,38,38,0.08)", grad3: "rgba(248,113,113,0.06)",
          glyphs: ["भो","ज","पु","री","बा","ना","हीं","हम","के","ऊ","भइ","या","का","हे","ला","इका","जि","न"], accent: "#ef4444" }
  },
  {
    id: "gujarati", label: "ગુજરાતી", sub: "Gujarati", region: "Gujarat", color: "#a855f7",
    bg: { grad1: "rgba(168,85,247,0.12)", grad2: "rgba(124,58,237,0.08)", grad3: "rgba(192,132,252,0.06)",
          glyphs: ["ગુ","જ","ર","ત","ી","છે","ભા","ઈ","સા","રું","હું","પા","ણી","ને","કે","મ","આ","વો"], accent: "#a855f7" }
  },
];

/* ─── Dialect Rules ─── */
const DIALECT_RULES = {
  hindi: `HINDI (Standard Khari Boli) — clean, literary Hindi:

OUTPUT IN: Devanagari script. Clean, standard Hindi (Khari Boli).

RULES:
- Write in pure, standard Hindi — no regional dialect markers.
- Use formal/semi-formal register unless the input tone is clearly casual.
- Preserve the original meaning, emotion, and structure exactly.
- Do NOT use any Bhojpuri/Haryanvi/Rajasthani/Gujarati dialect words.
- Avoid English words unless they are commonly used in Hindi (like "phone", "computer").
- Use proper Hindi grammar: correct gender agreement, verb conjugations, postpositions.
- If input is already Hindi, clean it up — fix grammar, remove dialect contamination.

COMMON CORRECTIONS:
- बा/सै/छे → है
- नाहीं/कोनी → नहीं
- हमके/म्हाने → मुझे
- ऊ/वो → वह/वो (standard)
- काहे/क्यूं → क्यों
- केतना/कित्ता → कितना

FLAVOR: Standard, clean, universally understood Hindi. Suitable for formal writing, news, or pan-India audience.`,

  english: `ENGLISH — natural, conversational English:

OUTPUT IN: English (Latin script).

RULES:
- Translate to natural, conversational English — NOT literal word-for-word translation.
- Preserve the original meaning, emotion, tone, and narrative structure.
- Keep cultural references intact — explain briefly in context if needed, but do NOT over-explain.
- Proper nouns, names, brand names, and titles stay as-is (transliterated if in Devanagari).
- Use contractions naturally (don't, it's, wasn't) for casual tone.
- Match the register of the original: if input is dramatic, keep it dramatic. If casual, keep it casual.
- Avoid overly formal or academic English unless the input demands it.
- Hindi/Urdu cultural terms that have no direct English equivalent can be kept with brief context.
  e.g. "izzat" can stay as "izzat (honour)" on first use, then just "izzat" after.

FLAVOR: Readable, engaging English that an Indian English speaker would naturally use. Not British-formal, not American-slang — natural Indian English.`,

  bhojpuri: `BHOJPURI (Devanagari) — authentic Bhojpuri dialect (UP/Bihar):

PRONOUNS:
मैं→हम, मुझे/मुझको→हमके, मेरा→हमार, मेरी→हमार
तुम→तू, तुम्हें→तोहके, तेरा→तोहार, तू→तू, आप→रउआ
वो/वह→ऊ, उसे→ओकरा, उसका→ओकर, यह→ई, इसे→एकरा
हम (हम लोग)→हमलोग, हमारा→हमार, वे→उ लोग, उन्हें→उन्हके

VERBS — present/habitual:
है→बा, हैं→बाड़न, हूँ→बानी, हो→बाड़ा
होना→होखे/होइब, जाना→जाइब, आना→आइब, करना→करब
देखना→देखब, खाना→खाइब, पीना→पिअब, लेना→लेब
देना→देब, बोलना→बोलब, रहना→रहब, मिलना→मिलब
सोना→सोअब, उठना→उठब, बैठना→बइठब, मारना→मारब
चलना→चलब, बनना→बनब, सुनना→सुनब, समझना→समझब
लड़ना→लड़ब, हँसना→हँसब, रोना→रोअब, भागना→भागब

PAST TENSE: गया→गइल, आया→आइल, किया→कइल, देखा→देखल,
खाया→खइलन, बोला→बोललन, था→रहल (m)/रहली (f)/रहलन (pl)

NEGATION: नहीं→नाहीं, मत→जनि, नहीं था→नाहीं रहल, नहीं है→नाहीं बा

QUESTION WORDS:
क्या→का, क्यों→काहे, कैसे→कइसे, कब→कब, कहाँ→कहाँ/कवना जगह
कौन→के, कितना→केतना, किसका→केकर

COMMON WORDS:
बहुत→बहुते/घाने, अच्छा→नीमन, बुरा→खराब/बेकार
अभी→अबहीं, यहाँ→इहाँ, वहाँ→उहाँ, बड़ा→बड़हन, छोटा→छोटहन
थोड़ा→थोड़ेक, सब→सब, कोई→केहू, कुछ→कुछो
घर→घर, काम→काम, बात→बात, दिन→दिन, रात→रात
आदमी→मरद, औरत→मेहरारू, बच्चा→लइका (m)/लइकी (f)
दोस्त→यार/दोस्त, भाई→भइया, बहन→दीदी/बहिनी, पैसा→पइसा
खाना→खाना, पानी→पानी, दिल→दिल, प्यार→प्यार/इश्क
जिंदगी→जिनगी, सच→सच, झूठ→झूठ, आज→आज
जल्दी→जल्दी, साथ→साथे, अब→अब, फिर→फेर

SENTENCE PATTERNS:
"बा" (है), "बाड़न" (हैं), "बानी" (हूँ)
Ending में "हऊ" (confirmation), "ना" (tag question)
E.g.: "ई बहुते नीमन बा हऊ" / "तू कहाँ जात बाड़ा ना?"

CRITICAL — NEVER use: है, हैं, नहीं (always बा, बाड़न, नाहीं)
FLAVOR: भइया, ए बाबू, हो, ना, राम राम naturally use करो`,

  haryanvi: `HARYANVI (Devanagari) — authentic Haryana dialect:

PRONOUNS:
मैं→म्हैं | मुझे/मुझको→म्हाने | मेरा→म्हारा | मेरी→म्हारी | हम→म्हां | हमारा→म्हारा
तुम→थारे | तुम्हें→थाने | तेरा→थारा | तू→तू | आप→आपनै/थाने
वो/वह→वो | उसे→उसनै | उसका→उसका | यह→या | इसे→इसनै | वे→वे | उन्हें→उन्नै

PRESENT COPULA — MANDATORY SUBSTITUTION (no exceptions):
हूँ → सूं   CRITICAL: NEVER write "हूँ" in Haryanvi output
है  → सै    CRITICAL: NEVER write "है" at sentence end — always "सै"
हैं → सैं
हो  → सो   (2nd person "you are")

INFINITIVES — MANDATORY: every "-ना" becomes "-णा":
जाना→जाणा | करना→करणा | देखना→देखणा | आना→आणा | खाना→खाणा
पीना→पीणा | लेना→लेणा | देना→देणा | बोलना→बोलणा | रहना→रहणा
मिलना→मिलणा | सोना→सोणा | उठना→उठणा | बैठना→बैठणा | मारना→मारणा
चलना→चालणा | बनना→बणणा | सुनना→सुणणा | समझना→समझणा
लड़ना→लड़णा | हँसना→हँसणा | रोना→रोणा | भागना→भाजणा

PAST TENSE (gender-marked, close to Hindi but with Haryanvi flavor):
था → था (m) | थी → थी (f) | थे → थे (pl)
गया → गया (m) | गई → गई (f) | गए → गए (pl)
किया → कर्या (m) | करी → करी (f) | करे → करे (pl)
आया → आया (m) | आई → आई (f) | आए → आए (pl)
देखा → देख्या (m) | देखी → देखी (f)
बोला → बोल्या (m) | बोली → बोली (f)
खाया → खाया (m) | खाई → खाई (f)
हुआ → हुया (m) | हुई → हुई (f)

FUTURE TENSE:
जाऊंगा → जावांगा | जाएगा → जावेगा | आएगा → आवेगा
करूंगा → करांगा | होगा → होवेगा | देखूंगा → देखांगा

NEGATION: नहीं→ना/कोनी | नहीं है→ना सै/कोनी सै | मत→मत

QUESTION WORDS:
क्या→के | क्यों→क्यूं | कैसे→किसां | कब→कद | कहाँ→कड़ै/कठै | कौन→कौण | कितना→कित्ता

COMMON WORDS:
बहुत→घणा | अच्छा→बढ़िया | बुरा→खराब | अभी→अबी | यहाँ→यां | वहाँ→वां
घर→घर | काम→काम | बात→बात | दिन→दिन | लोग→लोग
बच्चा→छोरा (m)/छोरी (f) | औरत→लुगाई | आदमी→बंदा/मर्द
दोस्त→यार | भाई→भाई/भाया | पैसा→पैसा

SENTENCE PATTERNS — end markers:
सूं (म्हैं करता सूं) | सै (वो जाता सै) | सैं (वे जाते सैं)
"देख भाई", "सुण यार", "हो जा", "कर दे", "बता दे"
Tag endings: ना (कर ना भाई) | री (सुण री)

FLAVOR (scatter naturally): भाई, यार, छोरा, छोरी, बावली, घणा बढ़िया, ठाड़ा रह`,

  rajasthani: `RAJASTHANI/MARWARI (Devanagari) — authentic Rajasthan dialect:

PRONOUNS:
मैं→म्हैं | मुझे/मुझको→म्हाने | मेरा→म्हारो | मेरी→म्हारी | हम→म्हे | हमारा→म्हारो
तुम→थे | तुम्हें→थाने | तेरा→थारो | तू→तूं | आप→आप/थे
वो/वह→वो/उण | उसे→उणने | उसका→उणरो | यह→आ/इ | इसे→इणने | वे→वे/उणां

PRESENT COPULA — MANDATORY SUBSTITUTION (no exceptions):
हूँ → छूं   CRITICAL: NEVER write "हूँ" in Rajasthani output
है  → छे   CRITICAL: NEVER write "है" — always "छे"
हैं → छे   (plural also छे in Marwari)
हो  → छो   (2nd person "you are")

INFINITIVES — MANDATORY: every "-ना" becomes "-णो":
जाना→जावणो | करना→करणो | देखना→देखणो | आना→आवणो | खाना→खावणो
पीना→पीवणो | लेना→लेवणो | देना→देवणो | बोलना→बोलणो | रहना→रहणो
मिलना→मिलणो | सोना→सोवणो | उठना→उठणो | बैठना→बैठणो | मारना→मारणो
चलना→चालणो | बनना→बणणो | सुनना→सुणणो | समझना→समझणो
लड़ना→लड़णो | हँसना→हँसणो | रोना→रोवणो | भागना→भाजणो

PAST TENSE — critical, very different from Hindi (gender-marked):
था   → थो (m) | थी → थी (f) | थे → था (pl)
गया  → गयो (m)  | गई → गई (f)  | गए → गया (pl)
किया → कियो (m) | करी → करी (f) | किए → किया (pl)
आया  → आयो (m)  | आई → आई (f)  | आए → आया (pl)
देखा → देख्यो (m) | देखी → देखी (f)
बोला → बोल्यो (m) | बोली → बोली (f)
खाया → खायो (m)  | खाई → खाई (f)
हुआ  → हुयो (m)  | हुई → हुई (f)
रहा  → रह्यो (m) | रही → रही (f)
Examples: "वो गयो" (he went) | "वा गई" (she went) | "म्हैं कियो" (I did)

FUTURE TENSE:
जाऊंगा→जासूं/जाऊंलो | जाएगा→जावेलो | आएगा→आवेलो
करूंगा→करसूं/करूंलो | होगा→होवेलो | देखूंगा→देखसूं

NEGATION: नहीं→कोनी | नहीं है→कोनी छे | मत→मत | नहीं था→कोनी थो

QUESTION WORDS:
क्या→के/शा | क्यों→क्यूं | कैसे→किंयां/कियां | कब→कद | कहाँ→कठे/कठै
कौन→कुण | कितना→कित्तो | किसका→किणरो

COMMON WORDS:
बहुत→घणो (m)/घणी (f) | अच्छा→बढ़िया/सारो | बुरा→खराब/बुरो
अभी→अबार/हाले | यहाँ→इठे/इयां | वहाँ→उठे/उयां
बड़ा→मोटो/बड़ो | छोटा→नानो/छोटो | थोड़ा→थोड़ो | सब→सगळा
घर→घर/घरां | काम→काम | बात→बात | लोग→लोग/मिनख
आदमी→मिनख/बंदो | औरत→लुगाई/बाई | बच्चा→छोरो (m)/छोरी (f)
दोस्त→भायलो/दोस्त | भाई→भाई/भायजी | पैसा→पइसो
पानी→पाणी | दिल→दिल

SENTENCE PATTERNS: छे (वो करता छे) | कोनी (वो नहीं करता = वो करता कोनी)

FLAVOR (scatter naturally): राम राम सा, भाई, बाई, हाँ भाई, कोनी यार, घणो बढ़िया`,

  gujarati: `GUJARATI (Gujarati script — write ALL output in Gujarati script):

PRONOUNS: હું (I), મને (me), મારો/મારી (my), તું (you informal), તમે (you formal), તે/એ (he/she), આ (this), એ/પેલો (that)

VERBS (conjugations):
- છે = is/are/am (ALL forms)
- હતો/હતી/હતા = was/were
- જવું = to go | જઉ (I go), જા (you go), જાય (he/she goes), ગયો/ગઈ (went)
- આવવું = to come | આવ (come), આવ્યો/આવી (came)
- કરવું = to do | કર (do), કરે (does), કર્યું (did)
- ખાવું = to eat | ખા (eat), ખાય (eats), ખાધું (ate)
- પીવું = to drink | પી (drink), પીવે (drinks), પીધું (drank)
- જોવું = to see/watch | જો (see), જુઓ (look), જોયું (saw)
- બોલવું = to speak | બોલ (speak), બોલે (speaks), બોલ્યો (spoke)
- સૂવું = to sleep | સૂ (sleep), સૂઈ જા (go to sleep)
- બેસવું = to sit | બેસ (sit), બેઠો (sat)
- ઊઠવું = to get up | ઊઠ (get up), ઊઠ્યો (got up)
- રહેવું = to stay/live | રહે (stays), રહ્યો (stayed)
- મળવું = to meet | મળ (meet), મળ્યો (met)
- લેવું = to take | લે (take), લીધું (took)
- આપવું = to give | આપ (give), આપ્યું (gave)
- સાંભળવું = to listen | સાંભળ (listen), સાંભળ્યું (heard)
- ચાલવું = to walk | ચાલ (walk), ચાલ્યો (walked)
- હસવું = to laugh | હસ (laugh), હસ્યો (laughed)
- રડવું = to cry | રડ (cry), રડ્યો (cried)
- સમજવું = to understand | સમજ (understand), સમજ્યો (understood)
- થવું = to become | થઈ ગ્યું (it happened), થશે (will happen)
- જોઈએ = need/want | મને જોઈએ = I need
- ગમવું = to like | ગમ્યું (liked), ગમે (likes)

PAST TENSE patterns:
- masculine: -યો (ગયો, આવ્યો, કર્યો, બોલ્યો)
- feminine: -ઈ (ગઈ, આવી, કરી, બોલી)
- neuter: -યું (કર્યું, ખાધું, પીધું, ગયું)
- plural: -યા (ગયા, આવ્યા)

FUTURE: verb + -શે/-શો/-શું (જઈશ=I'll go, જશે=he'll go, કરીશ=I'll do, આવશે=will come)

NEGATION: નહીં (NOT Devanagari "नहीं"), ના (no), નથી (is not)

QUESTION WORDS: શું (what), કેમ (why), ક્યાં (where), ક્યારે (when), કોણ (who), કેટલું (how much), કેવી રીતે (how)

COMMON VOCABULARY:
Good: સારું/સારો | Bad: ખરાબ | Very: ખૂબ/ઘણું
Food: ખાવાનું | Water: પાણી | House: ઘર
Man: માણસ | Woman: સ્ત્રી/બાઈ | Child: બાળક
Brother: ભાઈ | Sister: બહેન | Friend: મિત્ર/દોસ્ત
Now: હવે | Then: પછી | Today: આજ | Tomorrow: આવતી કાલ
Here: અહીં | There: ત્યાં | Always: હંમેશ
Yes: હા | No: ના | Okay: ઠીક | Really: સાચ્ચે
Beautiful: સુંદર | Big: મોટો | Small: નાનો | New: નવો
Work: કામ | Time: સમય | Money: પૈસા | Love: પ્રેમ

FLAVOR WORDS (scatter naturally): ભાઈ, ભાભી, ખરુંને, ચાલ, અરે, ઓ ભાઈ, ઓ બેન, સાચ્ચે

CRITICAL — NEVER write:
- Devanagari in output — write ENTIRE output in Gujarati script
- Hindi words mixed in`,
};

/* ─── System prompt builder ─── */
const buildSingleConverterSystem = (id) => {
  const checklist = id === "haryanvi" ? `
HARYANVI FINAL CHECKLIST:
- हूँ → सूं (MANDATORY)
- है → सै (MANDATORY)
- हैं → सैं (MANDATORY)
- ALL "-ना" infinitives → "-णा"
- नहीं → ना / कोनी
- मैं → म्हैं | मेरा → म्हारा | बहुत → घणा
- Past: किया→कर्या (m)/करी (f)
- ZERO Bhojpuri words: बा, बाड़न, नाहीं, हमके, ऊ` : id === "rajasthani" ? `
RAJASTHANI FINAL CHECKLIST:
- हूँ → छूं (MANDATORY)
- है → छे (MANDATORY)
- ALL "-ना" infinitives → "-णो"
- नहीं → कोनी (MANDATORY)
- मैं → म्हैं | मेरा → म्हारो | बहुत → घणो/घणी
- Past: था→थो (m) | गया→गयो (m)
- ZERO Bhojpuri words: बा, बाड़न, नाहीं, हमके, ऊ` : id === "bhojpuri" ? `
BHOJPURI FINAL CHECKLIST:
- है → बा | हैं → बाड़न | हूँ → बानी
- नहीं → नाहीं | मैं → हम | मुझे → हमके | वो → ऊ
- NEVER use "है", "नहीं", "मैं" in output` : id === "hindi" ? `
HINDI FINAL CHECKLIST:
- Remove ALL dialect markers (बा, सै, छे, etc.)
- Use standard है/हैं/था/थी
- Use standard नहीं (not नाहीं/कोनी)
- Clean, grammatically correct Khari Boli` : id === "english" ? `
ENGLISH FINAL CHECKLIST:
- Natural, conversational English
- NO Hindi/Devanagari words in output (except proper nouns/cultural terms)
- Preserve tone and emotion of original
- Not literal translation — capture the meaning and feel` : "";

  return `You are an expert linguist. Your task: rewrite the given input text in authentic ${id === "hindi" ? "standard Hindi" : id === "english" ? "English" : id + " dialect"}.

STEP 1 — AUTO-DETECT INPUT LANGUAGE:
The input may be in ANY language: Hindi, English, Hinglish, Bhojpuri, Haryanvi, Rajasthani, Gujarati, or any mix.
Silently identify the source language. Do NOT mention it in your output.

STEP 2 — UNDERSTAND THE MEANING:
Extract the MEANING, story, emotion, and intent from the input. Do NOT just swap words.

STEP 3 — REWRITE in ${id === "hindi" ? "standard Hindi" : id === "english" ? "natural English" : "authentic " + id + " dialect"}:
- Write as a NATIVE SPEAKER would naturally speak — not a word-for-word swap.
- Preserve the original meaning, emotion, and structure.
- All names and proper nouns: preserve exactly as given.
- Output ONLY the converted text. No explanation, no labels, nothing else.

${DIALECT_RULES[id]}
${checklist}`;
};

/* ─── Dynamic Language Background ─── */
function LanguageBackground({ langId }) {
  const lang = LANGUAGES.find(l => l.id === langId) || LANGUAGES[0];
  const { bg } = lang;
  const glyphs = bg.glyphs;
  const parts = Array.from({ length: 28 }, (_, i) => {
    const s = i * 137.5;
    return {
      char: glyphs[i % glyphs.length],
      left: +((s * 5.13) % 100).toFixed(1),
      dur: +(22 + (s * 0.71) % 26).toFixed(1),
      delay: -+((s * 0.93) % 45).toFixed(1),
      size: +(14 + (i * 2.1) % 12).toFixed(0),
    };
  });

  return (
    <>
      <style>{`
        @keyframes sF{0%{transform:translateY(100vh);opacity:0;}10%{opacity:.15;}90%{opacity:.15;}100%{transform:translateY(-10vh);opacity:0;}}
        @keyframes blobFloat{0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(20px,-15px) scale(1.04);}66%{transform:translate(-12px,10px) scale(0.97);}}
      `}</style>
      {/* Ambient blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: -1, overflow: "hidden", transition: "opacity 0.6s ease" }}>
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: "700px", height: "500px", borderRadius: "50%", background: `radial-gradient(ellipse at center, ${bg.grad1} 0%, transparent 70%)`, animation: "blobFloat 18s ease-in-out infinite", filter: "blur(40px)", transition: "background 0.8s ease" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-5%", width: "600px", height: "500px", borderRadius: "50%", background: `radial-gradient(ellipse at center, ${bg.grad2} 0%, transparent 70%)`, animation: "blobFloat 22s ease-in-out infinite reverse", filter: "blur(40px)", transition: "background 0.8s ease" }} />
        <div style={{ position: "absolute", top: "35%", left: "30%", width: "500px", height: "400px", borderRadius: "50%", background: `radial-gradient(ellipse at center, ${bg.grad3} 0%, transparent 70%)`, animation: "blobFloat 16s 4s ease-in-out infinite", filter: "blur(50px)", transition: "background 0.8s ease" }} />
      </div>
      {/* Floating glyphs */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: -1, userSelect: "none" }}>
        {parts.map((p, i) => (
          <span key={`${langId}-${i}`} style={{ position: "absolute", left: `${p.left}%`, bottom: 0, fontSize: `${p.size}px`, color: lang.color, textShadow: `0 0 10px ${lang.color}`, opacity: 0.18, animation: `sF ${p.dur}s ${p.delay}s linear infinite`, fontFamily: "serif" }}>{p.char}</span>
        ))}
      </div>
    </>
  );
}

/* ─── Logo ─── */
function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: "33px", height: "33px", borderRadius: "10px", background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", fontWeight: 900, color: "#fff", boxShadow: "0 0 16px rgba(245,158,11,0.45)" }}>R</div>
      <div>
        <div style={{ fontSize: "15px", fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1.1, background: "linear-gradient(90deg,#f1f5f9,#fbbf24 60%,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Ruhi</div>
        <div style={{ fontSize: "8px", color: "#334155", letterSpacing: "1.8px", fontWeight: 700, textTransform: "uppercase" }}>Script Converter</div>
      </div>
    </div>
  );
}

/* ─── Language Cards (single select) ─── */
function LanguageCards({ selected, onSelect }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.035)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "16px", overflow: "hidden", marginBottom: "12px", boxShadow: "0 4px 24px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.06)" }}>
      <div style={{ padding: "13px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "12px" }}>🌐</span>
        <span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#475569" }}>Convert To</span>
      </div>
      <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
        {LANGUAGES.map(d => {
          const on = selected === d.id;
          return (
            <div key={d.id} onClick={() => onSelect(d.id)} style={{
              padding: "14px 16px", borderRadius: "14px", cursor: "pointer", userSelect: "none",
              border: `1.5px solid ${on ? d.color + "70" : "rgba(255,255,255,0.07)"}`,
              background: on ? d.color + "18" : "rgba(255,255,255,0.025)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              boxShadow: on ? `0 0 28px ${d.color}30,inset 0 1px 0 rgba(255,255,255,0.1)` : "inset 0 1px 0 rgba(255,255,255,0.04)",
              transition: "all 0.22s ease", position: "relative", overflow: "hidden"
            }}>
              {on && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${d.color}, transparent)` }} />}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                  background: on ? d.color + "20" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${on ? d.color + "40" : "rgba(255,255,255,0.06)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "17px", fontWeight: 900, color: on ? d.color : "#334155",
                  transition: "all 0.2s", boxShadow: on ? `0 0 12px ${d.color}25` : "none"
                }}>{d.label.charAt(0)}</div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: on ? "#f1f5f9" : "#64748b", lineHeight: 1.2, transition: "color 0.2s" }}>{d.label}</div>
                  <div style={{ fontSize: "10px", color: on ? "#94a3b8" : "#2d3748", marginTop: "2px" }}>{d.sub} · {d.region}</div>
                </div>
              </div>
              {on && <div style={{ position: "absolute", bottom: "8px", right: "10px", width: "18px", height: "18px", borderRadius: "50%", background: d.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#fff", fontWeight: 900, boxShadow: `0 0 8px ${d.color}60` }}>&#10003;</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Result Card (single) ─── */
function ResultCard({ result, lang, copied, onCopy }) {
  if (!result) return null;
  const wc = result.trim() ? result.trim().split(/\s+/).length : 0;
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
      border: `1px solid ${lang.color}28`, borderLeft: `3px solid ${lang.color}`,
      borderRadius: "15px", padding: "18px", marginBottom: "11px",
      boxShadow: `0 0 30px ${lang.color}0a,0 4px 20px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.05)`,
      animation: "fadeUp 0.35s ease both"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: lang.color + "14", border: `1px solid ${lang.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 900, color: lang.color, flexShrink: 0 }}>{lang.label.charAt(0)}</div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#f1f5f9" }}>{lang.label}</div>
            <div style={{ fontSize: "10.5px", color: "#475569" }}>{lang.sub} · {lang.region}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10px", color: "#334155", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "3px 8px" }}>{wc} words</span>
          <button onClick={() => onCopy(result, lang.id)} style={{ padding: "6px 14px", borderRadius: "8px", border: `1px solid ${lang.color}25`, cursor: "pointer", background: copied === lang.id ? lang.color + "18" : "transparent", color: copied === lang.id ? lang.color : "#475569", fontSize: "11.5px", fontWeight: 700, transition: "all 0.15s" }}>
            {copied === lang.id ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <div style={{ fontSize: "13.5px", lineHeight: 1.9, color: "#cbd5e1", background: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "14px 16px", borderRadius: "10px", whiteSpace: "pre-wrap", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}>{result}</div>
    </div>
  );
}

/* ─── Global CSS ─── */
const CSS = `
  @keyframes fadeUp    {from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
  @keyframes pulse     {0%,100%{opacity:.3;transform:scale(.7);}50%{opacity:1;transform:scale(1);}}
  @keyframes readyGlow {0%,100%{box-shadow:0 0 16px rgba(245,158,11,0.28),0 3px 14px rgba(0,0,0,0.3);}50%{box-shadow:0 0 30px rgba(245,158,11,0.5),0 4px 18px rgba(0,0,0,0.4);}}
  @keyframes goldShine {0%{background-position:-200% center;}100%{background-position:200% center;}}
  @keyframes connPulse {0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4);}60%{box-shadow:0 0 0 5px rgba(34,197,94,0);}}
  @keyframes ruhiShine {0%{background-position:-300% center;}100%{background-position:300% center;}}
  @keyframes ruhiGlow  {0%,100%{text-shadow:0 0 16px rgba(245,158,11,0.22);}50%{text-shadow:0 0 28px rgba(245,158,11,0.4);}}
  @keyframes spin      {to{transform:rotate(360deg);}}

  .ruhi-title {
    font-size:80px;
    background:linear-gradient(90deg,#a16207 0%,#ca8a04 20%,#eab308 35%,#fde68a 50%,#eab308 65%,#ca8a04 80%,#a16207 100%);
    background-size:300% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    animation:ruhiShine 6s linear infinite, ruhiGlow 4s ease-in-out infinite;
  }
  .gold-shine {
    background:linear-gradient(90deg,#92400e,#f59e0b 25%,#fde68a 50%,#f59e0b 75%,#92400e);
    background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent;
    background-clip:text; animation:goldShine 3s linear infinite; font-weight:700;
  }
  .pb { transition:all 0.2s ease; }
  .pb:hover  { transform:translateY(-2px); box-shadow:0 0 32px rgba(245,158,11,0.5),0 5px 20px rgba(0,0,0,0.4) !important; }
  .pb:active { transform:translateY(0); }
  .pb-ready  { animation:readyGlow 2.5s ease-in-out infinite; }
  .live-dot  { animation:connPulse 2s ease infinite; }
  .gb { transition:all 0.14s; }
  .gb:hover  { background:rgba(255,255,255,0.07) !important; }
  .gb:active { transform:scale(.97); }
  .ta-wrap { transition:border-color 0.2s,box-shadow 0.2s; }
  .ta-wrap:focus-within { border-color:rgba(245,158,11,0.38) !important; box-shadow:0 0 0 3px rgba(245,158,11,0.10), 0 0 20px rgba(245,158,11,0.08) !important; }

  @media(max-width:600px){
    .topbar{padding:0 14px !important;height:54px !important;}
    .main{padding:20px 12px 70px !important;}
    .ruhi-title{font-size:48px !important;letter-spacing:-2px !important;}
    .lang-grid{grid-template-columns:repeat(2, 1fr) !important;}
  }
  @media(max-width:400px){.ruhi-title{font-size:38px !important;}}
`;

/* ═══════════════════════
   ROOT APP
═══════════════════════ */
export default function App() {
  const [selected, setSelected] = useState("hindi");
  const [script, setScript] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [detectedLang, setDetectedLang] = useState("");

  const selectedLang = LANGUAGES.find(l => l.id === selected) || LANGUAGES[0];

  const convert = async () => {
    if (!script.trim()) return;
    setLoading(true); setError(""); setResult(null); setDetectedLang("");
    try {
      const raw = await streamConvert({
        model: "anthropic/claude-sonnet-4-5",
        system: buildSingleConverterSystem(selected),
        messages: [{ role: "user", content: script }]
      });
      setResult(raw.trim());
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const copy = (text, id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(""), 2000); };

  const wc = script.trim() ? script.trim().split(/\s+/).length : 0;
  const cp = Math.min((script.length / 2000) * 100, 100);
  const can = !loading && !!script.trim();

  const CARD = { background: "rgba(255,255,255,0.035)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "16px", overflow: "hidden", marginBottom: "12px", boxShadow: "0 4px 24px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.06)" };

  const ROOT = { fontFamily: "'Inter','Segoe UI',sans-serif", background: "#07070f", minHeight: "100vh", color: "#fff", position: "relative", isolation: "isolate" };
  const TOPBAR = { padding: "0 28px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(7,7,15,0.65)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 1px 0 rgba(245,158,11,0.12),0 8px 32px rgba(0,0,0,0.6),inset 0 -1px 0 rgba(255,255,255,0.04)" };

  return (
    <div style={ROOT}>
      <LanguageBackground langId={selected} />
      <style>{CSS}</style>
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Topbar */}
        <div style={TOPBAR} className="topbar">
          <Logo />
          <div className="live-dot" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#22c55e", background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.18)", padding: "4px 11px", borderRadius: "20px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            <span className="api-label">Connected</span>
          </div>
        </div>

        {/* Main */}
        <div style={{ maxWidth: "780px", margin: "0 auto", padding: "36px 22px 80px" }} className="main">

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <h1 className="ruhi-title" style={{ margin: 0, fontWeight: 900, letterSpacing: "-3px", lineHeight: 1, userSelect: "none" }}>RUHI</h1>
          </div>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <p style={{ fontSize: "13px", color: "#475569", margin: 0, lineHeight: 1.6 }}>
              Kisi bhi bhasha mein likho — Hindi, English, Haryanvi, ya koi bhi.
              <br />AI detect karega aur aapki chosen bhasha mein convert karega.
            </p>
          </div>

          {/* Language Cards */}
          <LanguageCards selected={selected} onSelect={setSelected} />

          {/* Script Input */}
          <div style={{ ...CARD, border: "1px solid rgba(255,255,255,0.09)" }} className="ta-wrap">
            <div style={{ padding: "13px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span>&#9997;&#65039;</span><span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#475569" }}>Script Input</span></div>
              <div style={{ display: "flex", gap: "12px" }}><span style={{ fontSize: "11px", color: "#2d3748" }}>{wc} words</span><span style={{ fontSize: "11px", color: script.length > 2000 ? "#f87171" : "#2d3748" }}>{script.length} chars</span></div>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <textarea value={script} onChange={e => setScript(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) convert(); }}
                placeholder={"Kisi bhi bhasha mein script paste karo...\n\nHindi, English, Bhojpuri, Gujarati, Haryanvi, Rajasthani, ya koi bhi mix.\n\nAI automatically detect karega aur selected bhasha mein convert karega.\n\nExample: \"Yeh kahani hai ek aisi ladki ki, jisne apni zindagi mein sab kuch kho diya — par haar nahi maani.\""}
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "14px", resize: "none", lineHeight: 1.9, fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: "140px", boxSizing: "border-box" }}
              />
              {script.length > 0 && <div style={{ marginTop: "8px", height: "2px", borderRadius: "2px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}><div style={{ height: "100%", width: `${cp}%`, borderRadius: "2px", background: cp > 90 ? "linear-gradient(90deg,#f97316,#ef4444)" : `linear-gradient(90deg,${selectedLang.color},${selectedLang.color}aa)`, transition: "width 0.3s" }} /></div>}
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.14)", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#2d3748" }}>Ctrl + Enter</span>
              <button onClick={convert} disabled={!can} className={can ? "pb pb-ready" : ""} style={{
                padding: "10px 26px", borderRadius: "10px", border: "none",
                cursor: can ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "13px",
                background: can ? `linear-gradient(135deg,${selectedLang.color},${selectedLang.color}cc)` : "rgba(255,255,255,0.04)",
                color: can ? "#fff" : "#334155",
                display: "inline-flex", alignItems: "center", gap: "7px",
                boxShadow: can ? `0 0 20px ${selectedLang.color}40` : "none"
              }}>
                {loading
                  ? <><span style={{ width: "11px", height: "11px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Converting...</>
                  : <>&#9889; Convert to {selectedLang.label}</>}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: "13px", padding: "13px 16px", color: "#fca5a5", marginBottom: "12px", fontSize: "13px", display: "flex", gap: "9px" }}><span>&#9888;</span><span>{error}</span></div>}

          {/* Loading */}
          {loading && (
            <div style={CARD}>
              <div style={{ padding: "40px 24px", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "18px" }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: "11px", height: "11px", borderRadius: "50%", background: `linear-gradient(135deg,${selectedLang.color},${selectedLang.color}aa)`, boxShadow: `0 0 14px ${selectedLang.color}55`, animation: `pulse 1.3s ${i * 0.22}s ease-in-out infinite` }} />)}
                </div>
                <div style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 700, marginBottom: "6px" }}>
                  Converting to {selectedLang.label}...
                </div>
                <div style={{ fontSize: "11px", color: "#475569" }}>
                  Auto-detecting input language & converting
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.13)", borderRadius: "13px", padding: "13px 18px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "18px" }}>&#10004;</span>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#f1f5f9" }}>Conversion complete — {selectedLang.label}</div>
                    <div style={{ fontSize: "10.5px", color: "#475569" }}>Ready to copy & use</div>
                  </div>
                </div>
                <button onClick={() => { setResult(null); setScript(""); }} className="gb" style={{ padding: "5px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontWeight: 600, fontSize: "11px", background: "transparent", color: "#64748b" }}>New Script</button>
              </div>
              <ResultCard result={result} lang={selectedLang} copied={copied} onCopy={copy} />
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "7px" }}>
          <div style={{ fontSize: "11.5px", fontWeight: 500, display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
            <span style={{ color: "#334155" }}>Powered by</span>
            <span className="gold-shine">Claude</span>
            <span style={{ color: "#1e293b" }}>·</span>
            <span className="gold-shine">Built by</span>
            <span className="gold-shine">Manik Prajapati</span>
          </div>
          <div style={{ fontSize: "10.5px", color: "#1e293b" }}>{LANGUAGES.length} languages · Auto-detect</div>
        </div>
      </div>
    </div>
  );
}
