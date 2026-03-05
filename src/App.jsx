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

/* ─── Dialects ─── */
const DIALECTS = [
  { id:"bhojpuri",   label:"भोजपुरी",   sub:"Bhojpuri",   region:"UP / Bihar",  color:"#f97316" },
  { id:"haryanvi",   label:"हरियाणवी",  sub:"Haryanvi",   region:"Haryana",     color:"#22c55e" },
  { id:"rajasthani", label:"राजस्थानी", sub:"Rajasthani", region:"Rajasthan",   color:"#3b82f6" },
  { id:"gujarati",   label:"ગુજRATI",   sub:"Gujarati",   region:"Gujarat",     color:"#eab308" },
  { id:"marathi",    label:"मराठी",      sub:"Marathi",    region:"Maharashtra", color:"#ef4444" },
  { id:"punjabi",    label:"ਪੰਜਾਬੀ",    sub:"Punjabi",    region:"Punjab",      color:"#a855f7" },
];

const DIALECT_RULES = {
  bhojpuri:`BHOJPURI (Devanagari) — authentic Bhojpuri dialect (UP/Bihar):

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
  haryanvi:`HARYANVI (Devanagari) — authentic Haryana dialect:

PRONOUNS:
मैं→म्हैं, मुझे/मुझको→म्हाने, मेरा→म्हारा, मेरी→म्हारी, हम→म्हां, हमारा→म्हारा
तुम→थारे, तुम्हें→थाने, तेरा→थारा, तू→तू, आप→आपनै
वो/वह→वो, उसे→उसनै, उसका→उसका, यह→या, इसे→इसनै, ये→ये, वे→वे, उन्हें→उन्नै

VERBS — present tense:
है→सै, हैं→सैं, हूँ→हूँ, हो→हो
होना→होणा, जाना→जाणा, करना→करणा, देखना→देखणा, आना→आणा
खाना→खाणा, पीना→पीणा, लेना→लेणा, देना→देणा, बोलना→बोलणा
रहना→रहणा, मिलना→मिलणा, सोना→सोणा, उठना→उठणा, बैठना→बैठणा
मारना→मारणा, चलना→चलणा, बनना→बणणा, सुनना→सुणणा, समझना→समझणा
लड़ना→लड़णा, हँसना→हँसणा, रोना→रोणा, भागना→भाजणा

NEGATION: नहीं→ना/कोनी, मत→मत, नहीं होता→होता ना

QUESTION WORDS:
क्या→के, क्यों→क्यूं, कैसे→किसां, कब→कद, कहाँ→कड़ै/कठै, कौन→कौण, कितना→कित्ता

COMMON WORDS:
बहुत→घणा, अच्छा→बढ़िया, बुरा→खराब, अभी→अबी, यहाँ→यां, वहाँ→वां
बड़ा→बड़ा, छोटा→छोटा, थोड़ा→थोड़ा सा, सब→सारे, कोई→कोई
घर→घर, काम→काम, बात→बात, दिन→दिन, लोग→लोग
आदमी→मर्द/बंदा, औरत→लुगाई, बच्चा→छोरा (लड़का)/छोरी (लड़की)
दोस्त→यार, भाई→भाई/भाया, पैसा→पैसा, खाना→खाणा

SENTENCE PATTERNS — sentence endings में use करो:
सै (वो करता सै), सैं (वे जाते सैं), ना (कर ना भाई), री (सुण री)
"देख भाई", "सुण यार", "हो जा", "कर दे", "बता दे"

FLAVOR — naturally scatter करो:
भाई, यार, छोरा, छोरी, बावली, बाहर सै, घणा बढ़िया, ठाड़ा रह
Avoid: formal Hindi endings, -ता हूँ (instead use -ता हूँ only if natural, else restructure)`,

  rajasthani:`RAJASTHANI/MARWARI (Devanagari) — authentic Rajasthan dialect:

PRONOUNS:
मैं→म्हैं, मुझे/मुझको→म्हाने, मेरा→म्हारो, मेरी→म्हारी, हम→म्हे, हमारा→म्हारो
तुम→थे, तुम्हें→थाने, तेरा→थारो, तू→तूं, आप→आप/थे
वो/वह→वो/उण, उसे→उणने, उसका→उणरो, यह→आ/इ, इसे→इणने, ये→ये, वे→वे/उणां

VERBS — present tense (है→छे for Marwari):
है→छे, हैं→छे, हूँ→हूँ, हो→छो
होना→होवणो, जाना→जावणो, करना→करणो, देखना→देखणो/निरखणो
आना→आवणो, खाना→खावणो, पीना→पीवणो, लेना→लेवणो, देना→देवणो
बोलना→बोलणो, रहना→रहणो, मिलना→मिलणो, सोना→सोवणो
उठना→उठणो, बैठना→बैठणो, मारना→मारणो, चलना→चालणो
बनना→बणणो, सुनना→सुणणो, समझना→समझणो, लड़ना→लड़णो
हँसना→हँसणो, रोना→रोवणो, भागना→भाजणो

NEGATION: नहीं→कोनी, नहीं है→कोनी छे, मत→मत, नहीं था→कोनी थो

QUESTION WORDS:
क्या→के/शा, क्यों→क्यूं, कैसे→किंयां/कियां, कब→कद, कहाँ→कठे/कठै
कौन→कुण, कितना→कित्तो, किसका→किणरो

COMMON WORDS:
बहुत→घणो (masc)/घणी (fem), अच्छा→बढ़िया/सारो, बुरा→खराब/बुरो
अभी→अबार/हाले, यहाँ→इठे/इयां, वहाँ→उठे/उयां
बड़ा→मोटो/बड़ो, छोटा→नानो/छोटो, थोड़ा→थोड़ो, सब→सगळा
घर→घर/घरां, काम→काम, बात→बात, दिन→दिन, लोग→लोग/मिनख
आदमी→मिनख/बंदो, औरत→लुगाई/बाई, बच्चा→छोरो (लड़का)/छोरी (लड़की)
दोस्त→भायलो/दोस्त, भाई→भाई/भायजी, पैसा→पइसो
खाना→खाणो, पानी→पाणी, रात→रात, दिल→दिल

SENTENCE PATTERNS:
"छे" for है/हैं, "कोनी" for नहीं/नहीं है
Past: थो (masc था), थी (fem थी), हा (थे/were)
"राम राम सा" (greeting), "जय श्री राम" naturally use करो

FLAVOR — naturally scatter करो:
राम राम सा, भाई, बाई, हाँ भाई, कोनी यार, घणो बढ़िया
Avoid: है, हैं, नहीं (replace with छे, कोनी) — ye Rajasthani ki core identity है`,
  gujarati:`GUJARATI (Gujarati script — write ALL output in Gujarati script):

PRONOUNS: હું (I/मैं), મને (me/मुझे), મારો/મારી (my/मेरा), તું (you informal/तुम), તમે (you formal/आप), તે/એ (he/she/वो), આ (this/यह), એ/પેલો (that/वो)

VERBS (conjugations):
- છે = is/are/am (है/हैं/हूँ — ALL forms)
- હતો/હતી/હતા = was/were (था/थी/थे)
- જવું = to go (जाना) | જઉ (I go), જા (you go), જાય (he/she goes), ગયો/ગઈ (went)
- આવવું = to come (आना) | આવ (come), આવ્યો/આવી (came)
- કરવું = to do (करना) | કર (do), કરે (does), કર્યું (did)
- ખાવું = to eat (खाना) | ખા (eat), ખાય (eats), ખાધું (ate)
- પીવું = to drink (पीना) | પી (drink), પીવે (drinks), પીધું (drank)
- જોવું = to see/watch (देखना) | જો (see), જુઓ (look), જોયું (saw)
- બોલવું = to speak (बोलना) | બોલ (speak), બોલે (speaks), બોલ્યો (spoke)
- સૂવું = to sleep (सोना) | સૂ (sleep), સૂઈ જા (go to sleep)
- બેસવું = to sit (बैठना) | બેસ (sit), બેઠો (sat)
- ઊઠવું = to get up (उठना) | ઊઠ (get up), ઊઠ્યો (got up)
- રહેવું = to stay/live (रहना) | રહે (stays), રહ્યો (stayed)
- મળવું = to meet (मिलना) | મળ (meet), મળ્યો (met)
- લેવું = to take (लेना) | લે (take), લીધું (took)
- આપવું = to give (देना) | આપ (give), આપ્યું (gave)
- સાંભળવું = to listen (सुनना) | સાંભળ (listen), સાંભળ્યું (heard)
- ચાલવું = to walk (चलना) | ચાલ (walk), ચાલ્યો (walked)
- હસવું = to laugh (हंसना) | હસ (laugh), હસ્યો (laughed)
- રડવું = to cry (रोना) | રડ (cry), રડ્યો (cried)
- સમજવું = to understand | સમજ (understand), સમજ્યો (understood)
- થવું = to become (होना) | થઈ ગ્યું (it happened), થશે (will happen)
- જોઈએ = need/want (चाहिए) | મને જોઈએ = I need
- ગમવું = to like (पसंद आना) | ગમ્યું (liked), ગમે (likes)

PAST TENSE patterns:
- masculine: -યો (ગયો, આવ્યો, કર્યો, બોલ્યો)
- feminine: -ઈ (ગઈ, આવી, કરી, બોલી)
- neuter: -યું (કર્યું, ખાધું, પીધું, ગયું)
- plural: -યા (ગયા, આવ્યા)

FUTURE: verb + -શે/-શો/-શું (જઈશ=I'll go, જશે=he'll go, કરીશ=I'll do, આવશે=will come)

NEGATION: નહીં (नहीं — NOT "नहीं", write in Gujarati script), ના (no/मत), નથી (is not)
- Example: "હું નહીં આવું" = I won't come | "આ સારું નથી" = This is not good

QUESTION WORDS: શું (what/क्या), કેમ (why/क्यों), ક્યાં (where/कहाँ), ક્યારે (when/कब), કોણ (who/कौन), કેટલું (how much/कितना), કેવી રીતે (how/कैसे)

COMMON VOCABULARY (40+ words):
- Good: સારું/સારો (अच्छा) | Bad: ખરાબ (बुरा) | Very: ખૂબ/ઘણું (बहुत)
- Food: ખાવાનું (खाना) | Water: પાણી (पानी) | House: ઘર (घर)
- Man: માણસ (आदमी) | Woman: સ્ત્રી/બાઈ (औरत) | Child: બાળક (बच्चा)
- Brother: ભાઈ (भाई) | Sister: બહેન (बहन) | Friend: મિત્ર/દોસ્ત (दोस्त)
- Now: હવે (अब) | Then: પછી (फिर/तब) | Today: આજ (आज) | Tomorrow: આવતી કાલ (कल)
- Here: અહીં (यहाँ) | There: ત્યાં (वहाँ) | Always: હંમેશ (हमेशा)
- Yes: હા (हाँ) | No: ના (नहीं/नहीं) | Okay: ઠીક (ठीक) | Really: સાચ્ચે (सच में)
- Beautiful: સુંદર (सुंदर) | Big: મોટો (बड़ा) | Small: નાનો (छोटा) | New: નવો (नया)
- Work: કામ (काम) | Time: સમય (समय) | Money: પૈસા (पैसे) | Love: પ્રેમ (प्यार)
- Happy: ખુશ (खुश) | Sad: દુઃખી (दुखी) | Tired: થાકેલો (थका) | Angry: ગુસ્સો (गुस्सा)
- Come: આ (आ) | Go: જા (जा) | See: જો (देख) | Hear: સાંભળ (सुन) | Know: જાણ (जान)
- Fast: ઝડપથી (जल्दी) | Slow: ધીરે (धीरे) | Again: ફરી (फिर से) | Also: પણ (भी)

FLAVOR WORDS (scatter naturally): ભાઈ, ભાભી, ભૂલ ન જા, ગભરાઈ ન જા, ખરુંને, ચાલ, અરે, ઓ ભાઈ, ઓ બેન, સાચ્ચે, અરે હા

CRITICAL — NEVER write:
- है, हैं, हूँ in output (always use છે)
- नहीं in output (write નહીં in Gujarati script)
- Hindi/Devanagari words mixed in — write entire output in Gujarati script`,
  marathi:`MARATHI (Devanagari script — standard Maharashtrian Marathi):

PRONOUNS: मी (I/मैं), मला (me/मुझे), माझा/माझी/माझं (my/मेरा), तू (you informal/तुम), तुम्ही/आपण (you formal/आप), तो/ती/ते (he/she/it/वो), हे/हा/ही (this/यह), ते/तो (that/वो)

VERBS (conjugations):
- आहे = is/am (है) | आहेत = are (हैं) | आहात = you are (formal, हैं)
- होतो/होती/होतं = was/were (था/थी/था)
- जाणे = to go | जातो (I go, m), जाते (I go, f), गेलो/गेले (went m/f)
- येणे = to come | येतो/येते (comes), आलो/आले (came m/f)
- करणे = to do | करतो/करते (does), केलं (did)
- खाणे = to eat | खातो/खाते (eats), खाल्लं (ate)
- पिणे = to drink | पितो/पिते (drinks), प्यायलं (drank)
- पाहणे = to see | पाहतो/पाहते (sees), पाहिलं (saw)
- बोलणे = to speak | बोलतो/बोलते (speaks), बोललो (spoke)
- झोपणे = to sleep | झोपतो (sleeps), झोपलो (slept)
- बसणे = to sit | बसतो (sits), बसलो (sat)
- उठणे = to get up | उठतो (gets up), उठलो (got up)
- राहणे = to stay | राहतो (stays), राहिलो (stayed)
- भेटणे = to meet | भेटतो (meets), भेटलो (met)
- घेणे = to take | घेतो (takes), घेतलं (took)
- देणे = to give | देतो (gives), दिलं (gave)
- ऐकणे = to listen | ऐकतो (listens), ऐकलं (heard)
- चालणे = to walk | चालतो (walks), चाललो (walked)
- हसणे = to laugh | हसतो (laughs), हसलो (laughed)
- रडणे = to cry | रडतो (cries), रडलो (cried)
- समजणे = to understand | समजतो (understands), समजलं (understood)
- होणे = to become/happen | होतं (it happens), झालं (it happened)
- हवं आहे = want/need (चाहिए) | मला हवं = I want
- आवडणे = to like | आवडतं (likes), आवडलं (liked)

PAST TENSE patterns:
- masculine: -लो (गेलो, आलो, केलो, बोललो)
- feminine: -ले (गेले, आले, केले)  
- neuter: -लं (केलं, खाल्लं, पाहिलं, झालं)
- plural/formal: -ला (गेला, आला, केला) or -ल्या (गेल्या, आल्या)

FUTURE: verb + -ईन/-शील/-ईल (जाईन=I'll go, जाशील=you'll go, जाईल=he'll go)

NEGATION: नाही (नहीं/is not — primary negation), नको (don't/मत), नाहीत (are not, plural)
- "मी नाही येणार" = I won't come | "हे चांगलं नाही" = This is not good
- नको रे = Don't (informal) | नको ना = Please don't

QUESTION WORDS: काय (what/क्या), का (why/क्यों), कुठे (where/कहाँ), केव्हा (when/कब), कोण (who/कौन), किती (how much/कितना), कसं (how/कैसे)

COMMON VOCABULARY (40+ words):
- Good: चांगलं (अच्छा) | Bad: वाईट (बुरा) | Very: खूप (बहुत)
- Food: जेवण (खाना) | Water: पाणी (पानी) | House: घर (घर)
- Man: माणूस (आदमी) | Woman: बाई/स्त्री (औरत) | Child: मुलगा/मुलगी (बच्चा)
- Brother: भाऊ (भाई) | Sister: बहीण (बहन) | Friend: मित्र/दोस्त (दोस्त)
- Now: आत्ता (अभी) | Then: मग (फिर/तब) | Today: आज (आज) | Tomorrow: उद्या (कल)
- Here: इथे (यहाँ) | There: तिथे (वहाँ) | Always: नेहमी (हमेशा)
- Yes: हो (हाँ) | No: नाही (नहीं) | Okay: ठीक/बरं (ठीक) | Really: खरंच (सच में)
- Beautiful: सुंदर (सुंदर) | Big: मोठा (बड़ा) | Small: लहान (छोटा) | New: नवीन (नया)
- Work: काम (काम) | Time: वेळ (समय) | Money: पैसे (पैसे) | Love: प्रेम (प्यार)
- Happy: आनंदी (खुश) | Sad: दुःखी (दुखी) | Tired: थकलेलो (थका) | Angry: रागावलेलो (गुस्सा)
- Fast: लवकर (जल्दी) | Slow: हळू (धीरे) | Again: परत (फिर से) | Also: पण (भी)
- Market: बाजार | School: शाळा | Village: गाव | City: शहर | Road: रस्ता

FLAVOR WORDS (scatter naturally): रे, बघ, अरे, बरं का, ऐकलंस का, खरंच, एकदम, अरे यार, ए, सांग, झकास, भारी, मस्त

CRITICAL — NEVER write:
- है or हैं (always use आहे/आहेत)
- नहीं (always use नाही)
- Avoid mixing in Punjabi/Haryanvi vocabulary`,
  punjabi:`PUNJABI (Gurmukhi script — write ALL output in Gurmukhi/Punjabi script):

PRONOUNS: ਮੈਂ (I/मैं), ਮੈਨੂੰ (me/मुझे), ਮੇਰਾ/ਮੇਰੀ (my/मेरा), ਤੂੰ (you informal/तुम), ਤੁਸੀਂ (you formal/आप), ਉਹ (he/she/वो), ਇਹ (this/he/she/यह), ਉਹ (that/वो)

VERBS (conjugations):
- ਹੈ = is/am (है) | ਹਨ = are plural (हैं) | ਹੋ = you are (formal)
- ਸੀ = was/were (था/थी/थे)
- ਜਾਣਾ = to go | ਜਾਂਦਾ/ਜਾਂਦੀ (goes m/f), ਗਿਆ/ਗਈ (went m/f)
- ਆਉਣਾ = to come | ਆਉਂਦਾ/ਆਉਂਦੀ (comes), ਆਇਆ/ਆਈ (came m/f)
- ਕਰਨਾ = to do | ਕਰਦਾ/ਕਰਦੀ (does), ਕੀਤਾ/ਕੀਤੀ (did m/f)
- ਖਾਣਾ = to eat | ਖਾਂਦਾ/ਖਾਂਦੀ (eats), ਖਾਧਾ/ਖਾਧੀ (ate m/f)
- ਪੀਣਾ = to drink | ਪੀਂਦਾ/ਪੀਂਦੀ (drinks), ਪੀਤਾ/ਪੀਤੀ (drank m/f)
- ਦੇਖਣਾ = to see | ਦੇਖਦਾ/ਦੇਖਦੀ (sees), ਦੇਖਿਆ/ਦੇਖੀ (saw m/f)
- ਬੋਲਣਾ = to speak | ਬੋਲਦਾ/ਬੋਲਦੀ (speaks), ਬੋਲਿਆ (spoke)
- ਸੌਣਾ = to sleep | ਸੌਂਦਾ/ਸੌਂਦੀ (sleeps), ਸੁੱਤਾ/ਸੁੱਤੀ (slept m/f)
- ਬੈਠਣਾ = to sit | ਬੈਠਦਾ/ਬੈਠਦੀ (sits), ਬੈਠਾ/ਬੈਠੀ (sat m/f)
- ਉੱਠਣਾ = to get up | ਉੱਠਦਾ/ਉੱਠਦੀ (gets up), ਉੱਠਿਆ (got up)
- ਰਹਿਣਾ = to stay | ਰਹਿੰਦਾ/ਰਹਿੰਦੀ (stays), ਰਿਹਾ/ਰਹੀ (stayed m/f)
- ਮਿਲਣਾ = to meet | ਮਿਲਦਾ/ਮਿਲਦੀ (meets), ਮਿਲਿਆ/ਮਿਲੀ (met m/f)
- ਲੈਣਾ = to take | ਲੈਂਦਾ/ਲੈਂਦੀ (takes), ਲਿਆ/ਲਈ (took m/f)
- ਦੇਣਾ = to give | ਦਿੰਦਾ/ਦਿੰਦੀ (gives), ਦਿੱਤਾ/ਦਿੱਤੀ (gave m/f)
- ਸੁਣਨਾ = to listen | ਸੁਣਦਾ/ਸੁਣਦੀ (listens), ਸੁਣਿਆ/ਸੁਣੀ (heard m/f)
- ਚੱਲਣਾ = to walk/run | ਚੱਲਦਾ/ਚੱਲਦੀ (walks), ਚੱਲਿਆ (walked)
- ਹੱਸਣਾ = to laugh | ਹੱਸਦਾ/ਹੱਸਦੀ (laughs), ਹੱਸਿਆ/ਹੱਸੀ (laughed m/f)
- ਰੋਣਾ = to cry | ਰੋਂਦਾ/ਰੋਂਦੀ (cries), ਰੋਇਆ/ਰੋਈ (cried m/f)
- ਸਮਝਣਾ = to understand | ਸਮਝਦਾ (understands), ਸਮਝਿਆ (understood)
- ਹੋਣਾ = to become/happen | ਹੋ ਗਿਆ (it happened), ਹੋਵੇਗਾ (will happen)
- ਚਾਹੀਦਾ = need/want (चाहिए) | ਮੈਨੂੰ ਚਾਹੀਦਾ = I need
- ਪਸੰਦ ਆਉਣਾ = to like | ਪਸੰਦ ਆਇਆ (liked)

PAST TENSE patterns:
- masculine singular: -ਆ (ਗਿਆ, ਆਇਆ, ਕੀਤਾ, ਬੋਲਿਆ)
- feminine singular: -ਈ (ਗਈ, ਆਈ, ਕੀਤੀ, ਬੋਲੀ)
- masculine plural: -ਏ (ਗਏ, ਆਏ, ਕੀਤੇ)
- feminine plural: -ਈਆਂ (ਗਈਆਂ, ਆਈਆਂ)

FUTURE: verb stem + -ਾਂਗਾ/-ਏਗਾ/-ਾਂਗੀ (ਜਾਵਾਂਗਾ=I'll go, ਜਾਵੇਗਾ=he'll go, ਕਰਾਂਗਾ=I'll do, ਆਵੇਗਾ=will come)

NEGATION: ਨਹੀਂ (नहीं — in Gurmukhi, NOT Devanagari), ਨਾ (no/मत), ਨਹੀਂ ਹੈ (is not)
- "ਮੈਂ ਨਹੀਂ ਆਵਾਂਗਾ" = I won't come | "ਇਹ ਚੰਗਾ ਨਹੀਂ" = This is not good

QUESTION WORDS: ਕੀ (what/क्या), ਕਿਉਂ (why/क्यों), ਕਿੱਥੇ (where/कहाँ), ਕਦੋਂ (when/कब), ਕੌਣ (who/कौन), ਕਿੰਨਾ (how much/कितना), ਕਿਵੇਂ (how/कैसे)

COMMON VOCABULARY (40+ words):
- Good: ਚੰਗਾ/ਚੰਗੀ (अच्छा) | Bad: ਮਾੜਾ/ਮਾੜੀ (बुरा) | Very: ਬਹੁਤ (बहुत)
- Food: ਖਾਣਾ (खाना) | Water: ਪਾਣੀ (पानी) | House: ਘਰ (घर)
- Man: ਬੰਦਾ/ਆਦਮੀ (आदमी) | Woman: ਔਰਤ/ਬੀਬੀ (औरत) | Child: ਬੱਚਾ/ਬੱਚੀ (बच्चा)
- Brother: ਭਰਾ (भाई) | Sister: ਭੈਣ (बहन) | Friend: ਯਾਰ/ਦੋਸਤ (दोस्त)
- Now: ਹੁਣ (अब/अभी) | Then: ਫਿਰ (फिर/तब) | Today: ਅੱਜ (आज) | Tomorrow: ਕੱਲ੍ਹ (कल)
- Here: ਇੱਥੇ (यहाँ) | There: ਉੱਥੇ (वहाँ) | Always: ਹਮੇਸ਼ਾ (हमेशा)
- Yes: ਹਾਂ (हाँ) | No: ਨਹੀਂ (नहीं) | Okay: ਠੀਕ ਹੈ (ठीक) | Really: ਸੱਚੀ (सच में)
- Beautiful: ਸੋਹਣਾ/ਸੋਹਣੀ (सुंदर) | Big: ਵੱਡਾ (बड़ा) | Small: ਛੋਟਾ (छोटा) | New: ਨਵਾਂ/ਨਵੀਂ (नया)
- Work: ਕੰਮ (काम) | Time: ਸਮਾਂ (समय) | Money: ਪੈਸੇ (पैसे) | Love: ਪਿਆਰ (प्यार)
- Happy: ਖੁਸ਼ (खुश) | Sad: ਦੁਖੀ (दुखी) | Tired: ਥੱਕਿਆ/ਥੱਕੀ (थका) | Angry: ਗੁੱਸੇ ਵਿੱਚ (गुस्से में)
- Fast: ਜਲਦੀ (जल्दी) | Slow: ਹੌਲੀ (धीरे) | Again: ਫਿਰ ਤੋਂ (फिर से) | Also: ਵੀ (भी)
- Market: ਬਾਜ਼ਾਰ | School: ਸਕੂਲ | Village: ਪਿੰਡ | City: ਸ਼ਹਿਰ | Road: ਸੜਕ

FLAVOR WORDS (scatter naturally): ਯਾਰ, ਵੇ, ਓਏ, ਸੱਚੀ, ਪੁੱਤ, ਬੇਟਾ, ਬਾਈ, ਅਰੇ, ਹਾਂ ਯਾਰ, ਕੀ ਹਾਲ ਹੈ, ਸੁਣ, ਦੇਖ, ਵਾਹ

CRITICAL — NEVER write:
- है, हैं in Devanagari (always use ਹੈ, ਹਨ in Gurmukhi)
- नहीं in Devanagari (always use ਨਹੀਂ in Gurmukhi)
- Hindi/Devanagari words mixed in — write entire output in Gurmukhi script`,
};

/* ─── System prompts ─── */
const buildConverterSystem = (ids) => {
  const rules  = ids.map(id => DIALECT_RULES[id]).join("\n");
  const tmpl   = ids.map(id => `  "${id}": "..."`).join(",\n");
  return `You are an expert linguist specializing in Indian regional languages and dialects.

STEP 1 — AUTO-DETECT INPUT LANGUAGE:
The input script may be in ANY language: Hindi, English, Hinglish, Bhojpuri, Haryanvi, Rajasthani, Gujarati, Marathi, Punjabi, Bengali, or any mix/dialect.
Silently identify the source language. Do NOT mention it in your output.

STEP 2 — UNDERSTAND THE MEANING:
Read the full script semantically. Understand the story, emotion, characters, and intent.

STEP 3 — CONVERT TO EACH TARGET DIALECT:
For each dialect listed below, rewrite the script completely in that authentic dialect.
- If input is already in a target dialect: refine it to sound more natural, don't return as-is.
- Preserve the original meaning, emotion, and structure across all versions.
- Show names, "Stage", and proper nouns must be preserved exactly as given.

DIALECT RULES — apply strictly for each dialect:
${rules}

OUTPUT FORMAT — respond with ONLY this valid JSON, nothing else:
{
${tmpl}
}`;
};

const buildSingleConverterSystem = (id) =>
  `You are an expert linguist specializing in Indian regional languages and dialects.

STEP 1 — AUTO-DETECT INPUT LANGUAGE:
The input script may be in ANY language or dialect: Hindi, English, Hinglish, Bhojpuri, Haryanvi, Rajasthani, Gujarati, Marathi, Punjabi, Bengali, or any mix.
First, silently identify the source language/dialect. Do NOT mention it in your output.

STEP 2 — UNDERSTAND THE MEANING:
Read the full script semantically. Understand the story, emotion, characters, and intent — not just the words.

STEP 3 — CONVERT TO ${id.toUpperCase()} DIALECT:
Rewrite the script completely in authentic ${id} dialect, preserving the original meaning, emotion, and structure.
- If the input is already in ${id}: refine it to sound more authentic and natural, don't just return it as-is.
- If the input is in another Indian dialect: understand it fully, then rewrite in ${id}.
- If the input is in Hindi/Hinglish: convert using the dialect rules below.
- If the input is in English: translate the meaning first, then write in ${id} dialect.
- Show names, brand names ("Stage"), and proper nouns must be preserved exactly.

${DIALECT_RULES[id]}

${id === "haryanvi" ? `CRITICAL HARYANVI CHECKLIST — verify every sentence:
✅ Every "है" → "सै" (MANDATORY — the #1 Haryanvi marker)
✅ Every "हैं" → "सैं"
✅ Every infinitive "-ना" ending → "-णा" (जाना→जाणा, करना→करणा, देखना→देखणा)
✅ Every "नहीं" → "ना" or "कोनी"
✅ "बहुत" → "घणा", "क्या" → "के", "कैसे" → "किसां"
✅ "मैं" → "म्हैं", "हम" → "म्हां", "मेरा" → "म्हारा"
❌ NEVER use "है" at end of sentence — always "सै"
❌ NEVER use plain "-ना" infinitives — always "-णा"` : ""}

${id === "rajasthani" ? `CRITICAL RAJASTHANI CHECKLIST — verify every sentence:
✅ Every "है/हैं" → "छे" (MANDATORY — the #1 Rajasthani/Marwari marker)
✅ Every "नहीं" → "कोनी" (MANDATORY — never write "नहीं")
✅ Every infinitive "-ना" ending → "-णो" (जाना→जावणो, करना→करणो, देखना→देखणो)
✅ "बहुत" → "घणो/घणी", "क्या" → "के/शा", "कैसे" → "किंयां"
✅ "मैं" → "म्हैं", "हम" → "म्हे", "मेरा" → "म्हारो"
✅ "कहाँ" → "कठे", "कौन" → "कुण", "वो" → "उण"
✅ Use "राम राम सा" naturally in appropriate places
❌ NEVER use "है" or "हैं" — always "छे"
❌ NEVER use "नहीं" — always "कोनी"
❌ NEVER use plain "-ना" infinitives — always "-णो"` : ""}

Respond with ONLY the converted ${id} dialect text. No JSON, no labels, no explanation, no source language mention.`;

const TONES = [
  { id:"dramatic",  icon:"🎬", label:"Dramatic",
    prompt:`TONE — DRAMATIC & CINEMATIC:
- Every line must carry weight. Use short, punchy sentences separated by pauses ("...").
- Build tension in 3 beats: setup → conflict reveal → cliffhanger or peak emotion.
- Power words: takht, toofan, intezaar, ek waqt tha, sab kuch badal gaya.
- Avoid soft language. No filler words. Each sentence = a hammer blow.
- Rhetorical questions work: "Aur phir?" / "Tabhi..." / "Woh pal, jab..."` },
  { id:"comedy",    icon:"😄", label:"Comedy",
    prompt:`TONE — DESI COMEDY & WARMTH:
- Humor should feel like a ghar ka mazaak — familiar, warm, never mean.
- Use local comic situations: saas-bahu, sarkari office, jugaad, gaon ki politics.
- Exaggerations and hyperbole land well: "Poora gaon jaan gaya", "Saat janam ki setting".
- Timing matters — end the line on the punchword.
- Avoid slapstick descriptions. Wit > loud jokes. Smile > laugh-track.` },
  { id:"emotional", icon:"💔", label:"Emotional",
    prompt:`TONE — DEEPLY EMOTIONAL & TOUCHING:
- Hit the heart with family relationships: maa, baap, bhai, behen, beti, pati-patni.
- Nostalgia triggers: gaon ka ghar, purani yaadein, bachpan, woh din jab sab theek tha.
- Pace is slow and deliberate. Let the emotion breathe. Use ellipsis for silence (...).
- Core feelings to evoke: longing (tadap), sacrifice (kurbani), pride (garv), forgiveness (maafi).
- End on an unresolved ache — don't over-resolve. Leave them feeling.` },
  { id:"social",    icon:"📱", label:"Social",
    prompt:`TONE — SOCIAL-MEDIA NATIVE & SCROLL-STOPPING:
- First 4-5 words must be the entire hook — treat them as a thumbnail headline.
- Write for EYES first, ears second (most watch without sound).
- Rhythm: hook → 1 punchy detail → CTA. Three beats, done.
- Use direct address: "Tune dekha kya?", "Bata de...", "Samjha karo yaar".
- No formal language. No complete sentences needed. Fragments are power.` },
];

const CONTENT_TYPES = [
  { id:"trailer",  icon:"🎞️", label:"Trailer VO",
    prompt:`FORMAT — TRAILER VOICEOVER (cinematic, layered):
Structure: [World/character intro — 1-2 lines] → [Conflict/twist reveal — 1-2 lines] → [Emotional peak — 1 line] → [Stage CTA — 1 punchy line]
- Voiceover style: speak in second or third person, not first person.
- Use dramatic pauses with "..." between beats.
- The CTA should feel earned, not slapped on.
- Do NOT use subheadings or labels. Pure flowing VO text.` },
  { id:"caption",  icon:"✏️",  label:"Caption",
    prompt:`FORMAT — SOCIAL MEDIA CAPTION (scroll-stopper):
Structure: [Line 1 = Hook — must work as standalone statement] → [Line 2 = context or twist] → [Line 3 = CTA]
- Max 3 lines. Each line on its own paragraph.
- Line 1 must stop the scroll: question, bold claim, or shocking reveal.
- No hashtags. No emojis in the text (they can be added by the team later).
- CTA must be dialect-specific — not a copy-paste "Sirf Stage par".` },
  { id:"dialogue", icon:"💬", label:"Dialogue",
    prompt:`FORMAT — CHARACTER DIALOGUE (scene-accurate):
- Preserve ALL speaker names EXACTLY as written. Never translate or change names.
- Convert ONLY the spoken lines to dialect. Keep stage directions in original Hindi.
- Maintain the emotional subtext of each line — anger stays angry, love stays tender.
- Dialect should feel like how that character would naturally speak, not just word-for-word swap.
- Format: SPEAKER_NAME: [converted dialogue line]` },
  { id:"synopsis", icon:"📖", label:"Synopsis",
    prompt:`FORMAT — SHOW/EPISODE SYNOPSIS (narrative paragraph):
- Write as a single flowing paragraph (2-4 sentences for 30sec, 4-6 for full).
- Introduce characters organically within the story — no "Meet X, who is Y" structure.
- Maintain complete narrative arc: setup → complication → hint of resolution or cliffhanger.
- Third-person perspective. Present tense for immediacy.
- Include one sensory or emotional detail that makes the world feel real.` },
];

const LENGTHS = [
  { id:"full",  label:"Full",
    prompt:"LENGTH — Full length: No word constraint. Preserve all narrative beats, emotions, and details from the original. Depth over brevity." },
  { id:"30sec", label:"30-sec",
    prompt:"LENGTH — 30-second (~70-80 words): Keep only 2-3 story beats. Lead with conflict, end with CTA. Cut all setup that doesn't add tension. Every word must earn its place." },
  { id:"15sec", label:"15-sec",
    prompt:"LENGTH — 15-second (~30-38 words): ONE powerful hook + ONE payoff + CTA. Nothing else. Think: teaser, not trailer. Make them desperate to know more." },
];

const INTENSITIES = [
  { id:"mild",   label:"Mild",
    prompt:`INTENSITY — MILD (light dialect touch):
Replace 20-30% of words with dialect. Change: key pronouns (मैं→local), common verbs (है→dialect), 2-3 characteristic flavor words.
Keep 70%+ in standard Hindi — widely understood across regions. Suitable for broad reach campaigns.` },
  { id:"medium", label:"Medium",
    prompt:`INTENSITY — MEDIUM (authentic blend):
Replace 50-60% with dialect grammar and vocabulary. Apply dialect verb conjugations, all pronouns, common nouns.
Natural code-switching — the way a city person from that region would speak. Feels genuine, not performed.` },
  { id:"full",   label:"Full",
    prompt:`INTENSITY — FULL DIALECT (hyper-local):
80-90% dialect grammar, vocabulary, and sentence structure. Written as a native speaker of that region would naturally speak.
Use regional proverbs, local idioms, and cultural references where appropriate. Made for the dialect's core audience.` },
];

const PLATFORMS = [
  { id:"insta",   icon:"📸", label:"Instagram",
    prompt:"PLATFORM — Instagram/Reels: First 3 words visible before 'more' — make them count. Line breaks for visual rhythm. VO must hook within 2 seconds." },
  { id:"youtube", icon:"▶️",  label:"YouTube",
    prompt:"PLATFORM — YouTube: Can build up for 5-7 seconds before the hook lands. More story context allowed. Thumbnail-worthy opening statement." },
  { id:"whatsapp",icon:"💬", label:"WhatsApp",
    prompt:"PLATFORM — WhatsApp Broadcast/Status: Single impactful message. Must work as pure text, no sound assumed. Feels personal, like sent by a friend." },
  { id:"tv",      icon:"📺", label:"TV Spot",
    prompt:"PLATFORM — TV/OTT Spot: Classic voiceover pacing. Cinematic breathing room between lines. Longer sentences work. Emotional build → release → CTA." },
];

const GENRES = [
  { id:"drama",      icon:"🎭", label:"Drama"      },
  { id:"comedy",     icon:"😄", label:"Comedy"     },
  { id:"thriller",   icon:"🔪", label:"Thriller"   },
  { id:"romance",    icon:"💕", label:"Romance"    },
  { id:"action",     icon:"💥", label:"Action"     },
  { id:"horror",     icon:"👻", label:"Horror"     },
  { id:"social",     icon:"🤝", label:"Social"     },
  { id:"devotional", icon:"🙏", label:"Devotional" },
];

const TARGET_EMOTIONS = [
  { id:"hassi",       icon:"😂", label:"Hassi"       },
  { id:"dard",        icon:"💔", label:"Dard"        },
  { id:"deshbhakti",  icon:"🇮🇳", label:"Deshbhakti" },
  { id:"romance",     icon:"💕", label:"Romance"     },
  { id:"mystery",     icon:"🔮", label:"Mystery"     },
  { id:"inspiration", icon:"⚡", label:"Inspiration" },
];

const DURATIONS = [
  { id:"15",  label:"15s"  },
  { id:"30",  label:"30s"  },
  { id:"60",  label:"60s"  },
  { id:"120", label:"2min" },
];

const buildPromoSystem = (ids, tone, contentType, length, intensity, platform, showContext, genre, targetEmotion, duration, cast, plotPoints) => {
  const t    = TONES.find(x=>x.id===tone);
  const ct   = CONTENT_TYPES.find(x=>x.id===contentType);
  const ln   = LENGTHS.find(x=>x.id===length);
  const intn = INTENSITIES.find(x=>x.id===intensity);
  const plt  = PLATFORMS.find(x=>x.id===platform);
  const rules = ids.map(id => DIALECT_RULES[id]).join("\n");
  const tmpl  = ids.map(id =>
    `  "${id}":{"hooks":["hook1","hook2","hook3","hook4","hook5","hook6","hook7","hook8"],"voScript":"150-250 word VO in ${id} dialect — no timestamps, pure flowing text","captions":["caption1 with hashtags","caption2","caption3","caption4","caption5","caption6"],"ctas":["cta1","cta2","cta3"]}`
  ).join(",\n");

  const contextBlock = showContext?.trim()
    ? `SHOW/CHARACTER CONTEXT (treat as ground truth — never contradict):\n${showContext.trim()}\nPreserve all names, show titles, and brand references exactly as given above.`
    : `No specific show context provided — write for a generic Stage OTT promo.`;

  const genreBlock = genre ? `GENRE: ${genre.toUpperCase()} — Let the genre define the emotional register of every hook and the energy of the VO.` : "";
  const emotionBlock = targetEmotion ? `TARGET EMOTION: ${targetEmotion.toUpperCase()} — Every piece of copy must consistently drive this primary emotion. Hooks should trigger it; VO should build it; CTA should release it.` : "";
  const durationBlock = duration ? `PROMO DURATION: ${duration}s — All voiceover scripts must be readable in ${duration} seconds at a steady regional pace (~2.5 words/second).` : "";
  const castBlock = cast?.trim() ? `STAR CAST: ${cast.trim()} — Mention lead actors where it adds social proof. Their name = credibility for Tier 2/3 audiences.` : "";
  const plotBlock = plotPoints?.trim() ? `KEY PLOT POINTS / MOMENTS TO HIGHLIGHT:\n${plotPoints.trim()}\nBuild hooks and VO around these moments. Don't reveal full twists — tease them.` : "";

  const dialectCTAs = {
    bhojpuri:  ["Stage pe देखीं — सात दिन अनलिमिटेड बा", "एक रुपिया में ट्रायल करीं", "अपनी भाषा में मनोरंजन — सिर्फ Stage पे"],
    haryanvi:  ["Stage पे देखो — सात दिन अनलिमिटेड सै", "एक रुपिया में ट्रायल करो", "अपनी भाषा में मज्जा — सिर्फ Stage पे"],
    rajasthani:["Stage पर देखो — सात दिन अनलिमिटेड छे", "एक रुपिया में ट्रायल करो", "अपनी भाषा में मनोरंजन — सिर्फ Stage पर"],
    gujarati:  ["Stage પર જુઓ — સાત દિવસ અનલિમિટેડ", "એક રૂપિયામાં ટ્રાયલ", "તમારી ભાષામાં મનોરંજન — ફક્ત Stage પર"],
    marathi:   ["Stage वर पाहा — सात दिवस अनलिमिटेड", "एक रुपयात ट्रायल करा", "तुमच्या भाषेत मनोरंजन — फक्त Stage वर"],
    punjabi:   ["Stage ਤੇ ਦੇਖੋ — ਸੱਤ ਦਿਨ ਅਨਲਿਮਿਟਿਡ", "ਇੱਕ ਰੁਪਏ ਵਿੱਚ ਟ੍ਰਾਇਲ ਕਰੋ", "ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਮਨੋਰੰਜਨ — ਸਿਰਫ਼ Stage ਤੇ"],
  };
  const ctaBlock = ids.map(id => dialectCTAs[id] ? `${id.toUpperCase()} CTAs to adapt: ${dialectCTAs[id].join(" | ")}` : "").filter(Boolean).join("\n");

  return `You are a senior promo writer for Stage OTT — India's #1 regional entertainment platform serving Bharat's Tier 2/3 cities.

AUDIENCE BRIEF:
- Age 18-45, primarily Tier 2/3 cities. Family-first values, strong regional identity.
- Responds to: family drama (saas-bahu, bhai-behen, baap-beti), love stories, action, comedy of errors.
- Avoids: corporate tone, English phrases (unless intentional slang), overly urban references.
- Emotionally triggered by: izzat (honour), pyaar (love), dhoka (betrayal), garv (pride), sacrifice.
- Platform habit: scroll culture. Attention is earned in the first 2 seconds.

${contextBlock}
${genreBlock}
${emotionBlock}
${durationBlock}
${castBlock}
${plotBlock}

${t?.prompt}

${ct?.prompt}

${ln?.prompt}

${intn?.prompt}

${plt?.prompt}

AD_INTEL — 100 PATTERNS DATABASE (apply the most effective ones for this genre/emotion):

HOOK CATEGORIES — write exactly 8 hooks, one from each category:
1. PATTERN_INTERRUPT: Break the viewer's mental autopilot. Unexpected statement/question. "Socha tha sab theek ho jayega… par tab tak bahut der ho chuki thi."
2. CURIOSITY_GAP: Create an irresistible information gap. Tease without revealing. "Woh ek raaz jo poora gaon jaanta tha… sirf ek ke alawa."
3. SOCIAL_PROOF: Leverage authority, crowd, or relatability. "Jab poori basti ek taraf khadi ho… toh sach kya hota hai?"
4. EMOTIONAL_TRIGGER: Directly activate a core emotion. Hit the specific target emotion (${targetEmotion||"dard/hassi/romance"}) in one line.
5. FEAR_LOSS_AVERSION: Trigger FOMO or fear of missing something vital. "Agar aaj nahi dekha… kal pachtaoge."
6. TREND_JACKING: Reference something universally relatable in Tier 2/3 life. Family pressure, sarkari naukri, gaon ki izzat, arranged marriage.
7. UGC_REACTION: Write as if someone just watched it and is telling a friend. Authentic, word-of-mouth energy. "Yaar yeh dekhna — seriously."
8. CLIFFHANGER: End mid-scene with maximum unresolved tension. "Aur tab unhone dekha… jo dekhna nahi chahiye tha."

WRITING STYLES (rotate across hooks and VO):
- Staccato Punch: Short. Sharp. No filler. Every word = weight.
- Whisper Build: Start soft and intimate. Build to a peak. Then silence.
- Repetition Rhythm: "Toota… bikhra… par jhuka nahi."
- Contrast Flash: "Ek taraf khushi. Doosri taraf dard."
- Question Ladder: Three rising questions that build to an answer only watching can give.

COPYWRITING FORMULAS (use in VO structure):
- PAS: Problem → Agitate → Solution (show the problem, twist the knife, hint at resolution through viewing)
- AIDA: Attention (hook) → Interest (stakes) → Desire (emotional peak) → Action (CTA)
- Before/After Bridge: "Pehle yeh tha… ab yeh hai…" — contrast creates narrative pull

PROVEN TECHNIQUES:
1. Rule of 3: setup → twist → payoff (works even in 15 seconds)
2. Unresolved ending: leave the audience in the middle of an emotion — compels viewing
3. Relational hooks outperform solo hooks: "Bete ne ek baar..." beats "Ek laadka tha..."
4. Local proverbs or idioms add instant authenticity when used naturally
5. Repetition for rhythm: "Toot gaya... bikhar gaya... par jhuka nahi"
6. Sensory detail over abstract description: "Woh raat ki baarish" > "Ek mushkil waqt"
7. Character action beats: "Usne haath thama… aur phir..." — creates visual imagination
8. Dialect-native idioms: don't translate — find the equivalent emotion in that culture

STAGE BRAND VOICE (non-negotiable):
- "Stage" is never translated. Always written as "Stage".
- Show names and character names are preserved exactly as given.
- Stage taglines to naturally weave in (one per output): "सिर्फ Stage ऐप पे" / "एक रुपिया में ट्रायल" / "सात दिन अनलिमिटेड" / "अपनी भाषा में मनोरंजन"
- Voice of Stage = dil ki baat, ghar jaisi feeling. Never corporate. Never cold.

DIALECT-SPECIFIC CTAs (adapt naturally, don't translate literally):
${ctaBlock}

CAPTION FORMAT (6 captions):
- Caption 1-2: Hook-first (pattern interrupt or curiosity gap). No hashtags.
- Caption 3-4: Emotional or relatable. Add 3-4 relevant hashtags.
- Caption 5-6: CTA-forward. Platform-specific energy. Add hashtags.
- Hashtags: mix of dialect name, show/genre tags, Stage brand tags.

VOICEOVER RULES:
- NO timestamps, no [MUSIC], no stage directions. Pure text only.
- ${duration ? duration+"s" : "Full length"} pacing: ~2.5 words/second for regional dialect.
- Structure: Hook (2-3s) → Character/World intro (5-7s) → Conflict reveal (5-7s) → Emotional peak (3-4s) → CTA (3-4s)
- Each VO must feel like a LOCAL writer from that region wrote it — not a Hindi translation.

DIALECT RULES — apply per intensity setting:
${rules}

OUTPUT FORMAT — respond with ONLY this valid JSON, nothing else:
{
${tmpl}
}`;
};

/* ─── Story → Promo system (creative generation, not conversion) ─── */
const buildStorySystem = (ids, tone, contentType, length, intensity, platform, showContext, storyBible) => {
  const t    = TONES.find(x=>x.id===tone);
  const ct   = CONTENT_TYPES.find(x=>x.id===contentType);
  const ln   = LENGTHS.find(x=>x.id===length);
  const intn = INTENSITIES.find(x=>x.id===intensity);
  const plt  = PLATFORMS.find(x=>x.id===platform);
  const rules = ids.map(id => DIALECT_RULES[id]).join("\n");
  const tmpl  = ids.map(id =>
    `  "${id}":{"hooks":["hook1","hook2","hook3","hook4","hook5","hook6","hook7","hook8"],"voScript":"150-250 word VO in ${id} dialect — no timestamps, pure flowing text","captions":["caption1 with hashtags","caption2","caption3","caption4","caption5","caption6"],"ctas":["cta1","cta2","cta3"]}`
  ).join(",\n");

  const contextBlock = showContext?.trim()
    ? `SHOW/CHARACTER REFERENCE:\n${showContext.trim()}\nPreserve all names and show titles exactly as given.`
    : "";

  const bibleLines = [];
  if(storyBible) {
    if(storyBible.protagonist)      bibleLines.push(`PROTAGONIST: ${storyBible.protagonist}`);
    if(storyBible.protaGoal)        bibleLines.push(`PROTAGONIST'S GOAL: ${storyBible.protaGoal}`);
    if(storyBible.protaFlaw)        bibleLines.push(`PROTAGONIST'S FLAW/WOUND: ${storyBible.protaFlaw}`);
    if(storyBible.antagonist)       bibleLines.push(`ANTAGONIST: ${storyBible.antagonist}`);
    if(storyBible.antaGoal)         bibleLines.push(`ANTAGONIST'S GOAL: ${storyBible.antaGoal}`);
    if(storyBible.act1)             bibleLines.push(`ACT 1 (Setup): ${storyBible.act1}`);
    if(storyBible.act2)             bibleLines.push(`ACT 2 (Conflict): ${storyBible.act2}`);
    if(storyBible.act3)             bibleLines.push(`ACT 3 (Resolution): ${storyBible.act3}`);
    if(storyBible.twist)            bibleLines.push(`KEY TWIST: ${storyBible.twist}`);
    if(storyBible.climax)           bibleLines.push(`CLIMAX MOMENT: ${storyBible.climax}`);
    if(storyBible.emotionalJourney) bibleLines.push(`EMOTIONAL JOURNEY: ${storyBible.emotionalJourney}`);
    if(storyBible.usp)              bibleLines.push(`UNIQUE SELLING POINT: ${storyBible.usp}`);
    if(storyBible.themes)           bibleLines.push(`THEMES: ${storyBible.themes}`);
    if(storyBible.cast)             bibleLines.push(`CAST: ${storyBible.cast}`);
    if(storyBible.keyDialogues)     bibleLines.push(`KEY DIALOGUES TO REFERENCE:\n${storyBible.keyDialogues}`);
  }
  const bibleBlock = bibleLines.length
    ? `STORY BIBLE (deep character and narrative context — use all of this in your writing):\n${bibleLines.join("\n")}\n`
    : "";

  const dialectCTAs = {
    bhojpuri:  ["Stage pe देखीं — सात दिन अनलिमिटेड बा", "एक रुपिया में ट्रायल करीं", "अपनी भाषा में मनोरंजन — सिर्फ Stage पे"],
    haryanvi:  ["Stage पे देखो — सात दिन अनलिमिटेड सै", "एक रुपिया में ट्रायल करो", "अपनी भाषा में मज्जा — सिर्फ Stage पे"],
    rajasthani:["Stage पर देखो — सात दिन अनलिमिटेड छे", "एक रुपिया में ट्रायल करो", "अपनी भाषा में मनोरंजन — सिर्फ Stage पर"],
    gujarati:  ["Stage પર જુઓ — સાત દિવસ અનલિમિટેડ", "એક રૂપિયામાં ટ્રાયલ", "તમારી ભાષામાં મનોરંજન — ફક્ત Stage પર"],
    marathi:   ["Stage वर पाहा — सात दिवस अनलिमिटेड", "एक रुपयात ट्रायल करा", "तुमच्या भाषेत मनोरंजन — फक्त Stage वर"],
    punjabi:   ["Stage ਤੇ ਦੇਖੋ — ਸੱਤ ਦਿਨ ਅਨਲਿਮਿਟਿਡ", "ਇੱਕ ਰੁਪਏ ਵਿੱਚ ਟ੍ਰਾਇਲ ਕਰੋ", "ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਮਨੋਰੰਜਨ — ਸਿਰਫ਼ Stage ਤੇ"],
  };
  const ctaBlock = ids.map(id => dialectCTAs[id] ? `${id.toUpperCase()} CTAs: ${dialectCTAs[id].join(" | ")}` : "").filter(Boolean).join("\n");

  return `You are a senior promo writer for Stage OTT — India's #1 regional entertainment platform.

YOUR TASK: Read the story/synopsis carefully. Understand it deeply. Then CREATE original, fresh promo content in each selected dialect.

⚡ THIS IS CREATIVE WRITING — NOT TRANSLATION.
Do not convert or translate the story. Instead:
1. Read the story once. Understand: WHO is the character, WHAT is the conflict, WHY does the audience care, WHAT single moment is the hook.
2. Then write as if you are a LOCAL WRITER from each region — someone who has lived there, speaks that dialect naturally, and is telling this story to their own people.
3. Each dialect version must feel BORN in that language, not imported from Hindi.

STORY ANALYSIS (do mentally before writing each version):
- Core emotion: What is the one feeling this story leaves you with?
- Hook moment: What single scene or line would stop someone mid-scroll?
- Character pull: What makes the lead character relatable to a Tier 2/3 audience?
- Regional angle: Would a farmer in Bihar / a housewife in Rajasthan / a shop owner in Punjab recognize themselves in this story?

${contextBlock}
${bibleBlock}

${t?.prompt}

${ct?.prompt}

${ln?.prompt}

${intn?.prompt}

${plt?.prompt}

AD_INTEL — HOOK CATEGORIES (write exactly 8 hooks per dialect, one per category):
1. PATTERN_INTERRUPT: Break autopilot — unexpected statement that stops the scroll
2. CURIOSITY_GAP: Irresistible information gap — tease without revealing
3. SOCIAL_PROOF: Crowd/authority/relatability — "Jab poora gaon..."
4. EMOTIONAL_TRIGGER: Directly activate the core emotion of this story in one line
5. FEAR_LOSS_AVERSION: FOMO — "Agar aaj nahi dekha..."
6. TREND_JACKING: Universally relatable Tier 2/3 life moment
7. UGC_REACTION: Word-of-mouth — as if telling a friend who must watch this
8. CLIFFHANGER: End mid-scene with maximum unresolved tension

WRITING TECHNIQUES:
- Staccato Punch: Short. Sharp. No filler.
- Whisper Build: Start soft, build to peak, then silence.
- Repetition Rhythm: "Toota… bikhra… par jhuka nahi."
- Contrast Flash: "Ek taraf khushi. Doosri taraf dard."
- Rule of 3, Unresolved endings, Relational hooks, Local proverbs

STAGE BRAND VOICE (non-negotiable):
- "Stage" is never translated. Always written as "Stage".
- Show names and character names preserved exactly as given.
- Stage taglines to weave in: "सिर्फ Stage ऐप पे" / "एक रुपिया में ट्रायल" / "सात दिन अनलिमिटेड"
- Voice = dil ki baat, ghar jaisi feeling. Never corporate. Never cold.

DIALECT-SPECIFIC CTAs:
${ctaBlock}

CAPTION FORMAT (6 captions per dialect):
- Caption 1-2: Hook-first. No hashtags.
- Caption 3-4: Emotional/relatable. 3-4 hashtags.
- Caption 5-6: CTA-forward. Hashtags.

VOICEOVER RULES:
- NO timestamps, no [MUSIC], no stage directions. Pure text only.
- Structure: Hook → World/character intro → Conflict reveal → Emotional peak → CTA
- Each VO must feel BORN in that dialect — not a Hindi translation.

DIALECT RULES — apply per intensity:
${rules}

OUTPUT FORMAT — ONLY this valid JSON, nothing else:
{
${tmpl}
}`;
};

/* ─── Single-dialect promo/story system builders ─── */
const SINGLE_TMPL = `{"hooks":["h1","h2","h3","h4","h5","h6","h7","h8"],"voScript":"150-250 word VO — no timestamps, pure flowing text","captions":["c1 with hashtags","c2","c3","c4","c5","c6"],"ctas":["cta1","cta2","cta3"]}`;

const buildSinglePromoSystem = (id, tone, contentType, length, intensity, platform, showContext, genre, targetEmotion, duration, cast, plotPoints) => {
  const t    = TONES.find(x=>x.id===tone);
  const ct   = CONTENT_TYPES.find(x=>x.id===contentType);
  const ln   = LENGTHS.find(x=>x.id===length);
  const intn = INTENSITIES.find(x=>x.id===intensity);
  const plt  = PLATFORMS.find(x=>x.id===platform);
  const contextBlock = showContext?.trim() ? `SHOW CONTEXT:\n${showContext.trim()}` : `No show context — write for a generic Stage OTT promo.`;
  const genreBlock = genre ? `GENRE: ${genre.toUpperCase()}` : "";
  const emotionBlock = targetEmotion ? `TARGET EMOTION: ${targetEmotion.toUpperCase()}` : "";
  const durationBlock = duration ? `PROMO DURATION: ${duration}s (~2.5 words/second)` : "";
  const castBlock = cast?.trim() ? `STAR CAST: ${cast.trim()}` : "";
  const plotBlock = plotPoints?.trim() ? `KEY PLOT POINTS:\n${plotPoints.trim()}` : "";
  const dialectCTAs = {
    bhojpuri:["Stage pe देखीं — सात दिन अनलिमिटेड बा","एक रुपिया में ट्रायल करीं"],
    haryanvi:["Stage पे देखो — सात दिन अनलिमिटेड सै","एक रुपिया में ट्रायल करो"],
    rajasthani:["Stage पर देखो — सात दिन अनलिमिटेड छे","एक रुपिया में ट्रायल करो"],
    gujarati:["Stage પર જુઓ — સાત દિવસ અनलिमिटेड","એક રૂપિयामां ट्रायल"],
    marathi:["Stage वर पाहा — सात दिवस अनलिमिटेड","एक रुपयात ट्रायल करा"],
    punjabi:["Stage ਤੇ ਦੇਖੋ — ਸੱਤ ਦਿਨ ਅਨਲਿਮਿਟਿਡ","ਇੱਕ ਰੁਪਏ ਵਿੱਚ ਟ੍ਰਾਇਲ"],
  };
  const ctaBlock = dialectCTAs[id] ? `${id.toUpperCase()} CTAs: ${dialectCTAs[id].join(" | ")}` : "";
  return `You are a senior promo writer for Stage OTT. Write promo content in ${id.toUpperCase()} dialect only.
${contextBlock}
${genreBlock}${emotionBlock}${durationBlock}${castBlock}${plotBlock}
${t?.prompt}
${ct?.prompt}
${ln?.prompt}
${intn?.prompt}
${plt?.prompt}
Write 8 hooks (one per category: pattern-interrupt, curiosity-gap, social-proof, emotional-trigger, fear-loss-aversion, trend-jacking, ugc-reaction, cliffhanger), a VO script, 6 captions, and 3 CTAs.
"Stage" is never translated. Show/character names preserved exactly.
${ctaBlock}
DIALECT RULES:
${DIALECT_RULES[id]}
OUTPUT FORMAT — ONLY this valid JSON, nothing else:
${SINGLE_TMPL}`;
};

const buildSingleStorySystem = (id, tone, contentType, length, intensity, platform, showContext, storyBible) => {
  const t    = TONES.find(x=>x.id===tone);
  const ct   = CONTENT_TYPES.find(x=>x.id===contentType);
  const ln   = LENGTHS.find(x=>x.id===length);
  const intn = INTENSITIES.find(x=>x.id===intensity);
  const plt  = PLATFORMS.find(x=>x.id===platform);
  const contextBlock = showContext?.trim() ? `SHOW REFERENCE:\n${showContext.trim()}` : "";
  const bibleLines = [];
  if(storyBible){
    if(storyBible.protagonist)     bibleLines.push(`PROTAGONIST: ${storyBible.protagonist}`);
    if(storyBible.protaGoal)       bibleLines.push(`PROTAGONIST'S GOAL: ${storyBible.protaGoal}`);
    if(storyBible.protaFlaw)       bibleLines.push(`FLAW/WOUND: ${storyBible.protaFlaw}`);
    if(storyBible.antagonist)      bibleLines.push(`ANTAGONIST: ${storyBible.antagonist}`);
    if(storyBible.act1)            bibleLines.push(`ACT 1: ${storyBible.act1}`);
    if(storyBible.act2)            bibleLines.push(`ACT 2: ${storyBible.act2}`);
    if(storyBible.act3)            bibleLines.push(`ACT 3: ${storyBible.act3}`);
    if(storyBible.twist)           bibleLines.push(`TWIST: ${storyBible.twist}`);
    if(storyBible.climax)          bibleLines.push(`CLIMAX: ${storyBible.climax}`);
    if(storyBible.cast)            bibleLines.push(`CAST: ${storyBible.cast}`);
    if(storyBible.keyDialogues)    bibleLines.push(`KEY DIALOGUES:\n${storyBible.keyDialogues}`);
  }
  const bibleBlock = bibleLines.length ? `STORY BIBLE:\n${bibleLines.join("\n")}` : "";
  return `You are a senior promo writer for Stage OTT. Read the story and CREATE original ${id.toUpperCase()} dialect promo content — do NOT translate, write as a local writer from that region.
${contextBlock}
${bibleBlock}
${t?.prompt}
${ct?.prompt}
${ln?.prompt}
${intn?.prompt}
${plt?.prompt}
Write 8 hooks, a VO script (150-250 words), 6 captions, and 3 CTAs. All in ${id} dialect.
"Stage" is never translated. Character names preserved exactly.
DIALECT RULES:
${DIALECT_RULES[id]}
OUTPUT FORMAT — ONLY this valid JSON, nothing else:
${SINGLE_TMPL}`;
};

/* ─── History ─── */
const LS_KEY     = "openrouter_api_key";
const LS_HISTORY = "ruhi_history";
const getHistory  = () => { try { return JSON.parse(localStorage.getItem(LS_HISTORY)||"[]"); } catch { return []; } };
const pushHistory = (e,prev) => { const u=[e,...prev].slice(0,10); localStorage.setItem(LS_HISTORY,JSON.stringify(u)); return u; };

/* ─── Background ─── */
const GLYPHS = ["भ","ज","प","र","ण","ह","स","त","ग","लि","रा","ना","बा","ગ","જ","ત","ર","ભ","ੋ","ਭ","ਜ","ਪ","ਰ","ਹ","ੀ"];
const WORDS  = ["भोजपुरी","हरियाणवी","राजस्थानी","मराठी","ગуजराती","ਪੰਜਾਬੀ","संवाद","कहानी","नाटक","भाषा","ਬੋਲੀ","शब्द"];
const PARTS  = Array.from({length:32},(_,i)=>{const s=i*137.5;return{char:GLYPHS[i%GLYPHS.length],left:+((s*5.13)%100).toFixed(1),dur:+(22+(s*0.71)%26).toFixed(1),delay:-+((s*0.93)%45).toFixed(1),size:+(14+(i*2.1)%12).toFixed(0)};});
const WPARTS = Array.from({length:12},(_,i)=>{const s=i*89.4;return{word:WORDS[i%WORDS.length],left:+((s*7.3)%88).toFixed(1),top:+((s*4.1+5)%82).toFixed(1),dur:+(20+(s*0.6)%24).toFixed(1),delay:-+((s*1.1)%32).toFixed(1),size:+(11+(i*1.7)%8).toFixed(0)};});

function LanguageBg() {
  return (
    <>
      <style>{`@keyframes sF{0%{transform:translateY(100vh);opacity:0;}10%{opacity:.18;}90%{opacity:.18;}100%{transform:translateY(-10vh);opacity:0;}} @keyframes wB{0%{transform:translateY(0);opacity:0;}12%{opacity:.11;}88%{opacity:.08;}100%{transform:translateY(-50px);opacity:0;}}`}</style>
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:-1,userSelect:"none"}}>
        {PARTS.map((p,i)  =><span key={i}      style={{position:"absolute",left:`${p.left}%`,bottom:0,fontSize:`${p.size}px`,color:"#fbbf24",textShadow:"0 0 10px #f59e0b",animation:`sF ${p.dur}s ${p.delay}s linear infinite`,fontFamily:"serif"}}>{p.char}</span>)}
        {WPARTS.map((w,i) =><span key={`w${i}`} style={{position:"absolute",left:`${w.left}%`,top:`${w.top}%`,fontSize:`${w.size}px`,color:"#f59e0b",textShadow:"0 0 8px #f59e0b",animation:`wB ${w.dur}s ${w.delay}s ease-in-out infinite`,fontFamily:"serif",fontWeight:600}}>{w.word}</span>)}
      </div>
    </>
  );
}

/* ─── Ambient Blobs ─── */
function AmbientBg() {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:-1,overflow:"hidden"}}>
      <div style={{position:"absolute",top:"-10%",right:"-5%",width:"700px",height:"500px",borderRadius:"50%",background:"radial-gradient(ellipse at center, rgba(245,158,11,0.09) 0%, transparent 70%)",animation:"blobFloat 18s ease-in-out infinite",filter:"blur(40px)"}} />
      <div style={{position:"absolute",bottom:"-10%",left:"-5%",width:"600px",height:"500px",borderRadius:"50%",background:"radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 70%)",animation:"blobFloat 22s ease-in-out infinite reverse",filter:"blur(40px)"}} />
      <div style={{position:"absolute",top:"35%",left:"30%",width:"500px",height:"400px",borderRadius:"50%",background:"radial-gradient(ellipse at center, rgba(239,68,68,0.05) 0%, transparent 70%)",animation:"blobFloat 16s 4s ease-in-out infinite",filter:"blur(50px)"}} />
    </div>
  );
}

/* ─── Logo ─── */
function Logo() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
      <div style={{width:"33px",height:"33px",borderRadius:"10px",background:"linear-gradient(135deg,#f59e0b,#ef4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px",fontWeight:900,color:"#fff",boxShadow:"0 0 16px rgba(245,158,11,0.45)"}}>R</div>
      <div>
        <div style={{fontSize:"15px",fontWeight:900,letterSpacing:"-0.5px",lineHeight:1.1,background:"linear-gradient(90deg,#f1f5f9,#fbbf24 60%,#ef4444)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Ruhi</div>
        <div style={{fontSize:"8px",color:"#334155",letterSpacing:"1.8px",fontWeight:700,textTransform:"uppercase"}}>Speak Every Dialect</div>
      </div>
    </div>
  );
}

/* ─── Shared: Dialect Pills + Script Box + Results ─── */
function DialectPills({selected, onToggle}) {
  const toggleAll  = useCallback(()=>{ /* handled outside */ }, []);
  return (
    <div style={{background:"rgba(255,255,255,0.035)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:"16px",overflow:"hidden",marginBottom:"12px",boxShadow:"0 4px 24px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.06)"}}>
      <div style={{padding:"13px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <span style={{fontSize:"12px"}}>🌐</span>
          <span style={{fontSize:"10.5px",fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:"#475569"}}>Target Languages</span>
          <span style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",color:"#f59e0b",fontSize:"9.5px",fontWeight:800,padding:"2px 8px",borderRadius:"9px"}}>{selected.size}/{DIALECTS.length}</span>
        </div>
      </div>
      <div style={{padding:"14px 18px",display:"flex",flexWrap:"wrap",gap:"9px"}}>
        {DIALECTS.map(d=>{
          const on=selected.has(d.id);
          return (
            <div key={d.id} onClick={()=>onToggle(d.id)} style={{display:"inline-flex",alignItems:"center",gap:"8px",padding:"9px 14px",borderRadius:"12px",cursor:"pointer",userSelect:"none",border:`1px solid ${on?d.color+"60":"rgba(255,255,255,0.07)"}`,background:on?d.color+"14":"rgba(255,255,255,0.03)",backdropFilter:on?"blur(8px)":"none",WebkitBackdropFilter:on?"blur(8px)":"none",boxShadow:on?`0 0 20px ${d.color}25,inset 0 1px 0 rgba(255,255,255,0.08)`:"none",transition:"all 0.17s ease"}}>
              <span style={{width:"7px",height:"7px",borderRadius:"50%",flexShrink:0,background:on?d.color:"#2d3748",boxShadow:on?`0 0 7px ${d.color}`:"none",transition:"all 0.2s"}} />
              <div>
                <div style={{fontSize:"12.5px",fontWeight:700,color:on?"#f1f5f9":"#4a5568",lineHeight:1.2}}>{d.label}</div>
                <div style={{fontSize:"9.5px",color:on?"#94a3b8":"#2d3748"}}>{d.region}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultCards({results, selIds, copied, onCopy, showWordCount=false}) {
  return (
    <>
      {DIALECTS.filter(d=>results[d.id]).map((d,idx)=>{
        const text=results[d.id];
        const wc=text.trim()?text.trim().split(/\s+/).length:0;
        const readSec=Math.round(wc/2.5); // ~150wpm for regional read-aloud
        return (
          <div key={d.id} style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",border:`1px solid ${d.color}28`,borderLeft:`3px solid ${d.color}`,borderRadius:"15px",padding:"18px",marginBottom:"11px",boxShadow:`0 0 30px ${d.color}0a,0 4px 20px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.05)`,animation:"fadeUp 0.35s ease both",animationDelay:`${idx*0.07}s`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"11px"}}>
                <div style={{width:"36px",height:"36px",borderRadius:"10px",background:d.color+"14",border:`1px solid ${d.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",fontWeight:900,color:d.color,flexShrink:0}}>{d.label.charAt(0)}</div>
                <div>
                  <div style={{fontSize:"15px",fontWeight:800,color:"#f1f5f9"}}>{d.label}</div>
                  <div style={{fontSize:"10.5px",color:"#475569"}}>{d.sub} · {d.region}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                {showWordCount && <span style={{fontSize:"10px",color:"#334155",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"6px",padding:"3px 8px"}}>{wc}w · ~{readSec}s</span>}
                <button onClick={()=>onCopy(text,d.id)} style={{padding:"6px 14px",borderRadius:"8px",border:`1px solid ${d.color}25`,cursor:"pointer",background:copied===d.id?d.color+"18":"transparent",color:copied===d.id?d.color:"#475569",fontSize:"11.5px",fontWeight:700,transition:"all 0.15s"}}>
                  {copied===d.id?"✓ Copied":"Copy"}
                </button>
              </div>
            </div>
            <div style={{fontSize:"13.5px",lineHeight:1.9,color:"#cbd5e1",background:"rgba(0,0,0,0.25)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",padding:"14px 16px",borderRadius:"10px",whiteSpace:"pre-wrap",border:"1px solid rgba(255,255,255,0.05)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.03)"}}>{text}</div>
          </div>
        );
      })}
    </>
  );
}

/* ─── PromoSectionItems ─── */
function PromoSectionItems({items, sectionId, copied, onCopy, accent}) {
  if(!items||!items.length) return null;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
      {items.map((item,i)=>(
        <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"8px",background:"rgba(0,0,0,0.18)",borderRadius:"8px",padding:"8px 10px",border:"1px solid rgba(255,255,255,0.04)"}}>
          <span style={{fontSize:"10px",fontWeight:800,color:accent,opacity:0.7,minWidth:"16px",paddingTop:"2px"}}>{i+1}</span>
          <span style={{fontSize:"12.5px",lineHeight:1.75,color:"#cbd5e1",flex:1,whiteSpace:"pre-wrap"}}>{item}</span>
          <button onClick={()=>onCopy(item,`${sectionId}-${i}`)} style={{flexShrink:0,padding:"3px 9px",borderRadius:"6px",border:`1px solid ${copied===`${sectionId}-${i}`?accent+"55":"rgba(255,255,255,0.06)"}`,cursor:"pointer",background:copied===`${sectionId}-${i}`?accent+"14":"transparent",color:copied===`${sectionId}-${i}`?accent:"#475569",fontSize:"10px",fontWeight:700,transition:"all 0.15s"}}>
            {copied===`${sectionId}-${i}`?"✓":"Copy"}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── PromoResultCards ─── */
function PromoResultCards({results, selIds, copied, onCopy}) {
  const [openSections, setOpenSections] = useState({});
  const toggleSection = (key) => setOpenSections(prev=>({...prev,[key]:!prev[key]}));

  return (
    <>
      {DIALECTS.filter(d=>selIds.includes(d.id)&&results[d.id]).map((d,idx)=>{
        const r = results[d.id];
        // Support legacy plain string results
        if(typeof r === "string") {
          const wc = r.trim()?r.trim().split(/\s+/).length:0;
          const readSec = Math.round(wc/2.5);
          return (
            <div key={d.id} style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",border:`1px solid ${d.color}28`,borderLeft:`3px solid ${d.color}`,borderRadius:"15px",padding:"18px",marginBottom:"11px",boxShadow:`0 0 30px ${d.color}0a,0 4px 20px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.05)`,animation:"fadeUp 0.35s ease both",animationDelay:`${idx*0.07}s`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"11px"}}>
                  <div style={{width:"36px",height:"36px",borderRadius:"10px",background:d.color+"14",border:`1px solid ${d.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",fontWeight:900,color:d.color,flexShrink:0}}>{d.label.charAt(0)}</div>
                  <div>
                    <div style={{fontSize:"15px",fontWeight:800,color:"#f1f5f9"}}>{d.label}</div>
                    <div style={{fontSize:"10.5px",color:"#475569"}}>{d.sub} · {d.region}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{fontSize:"10px",color:"#334155",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"6px",padding:"3px 8px"}}>{wc}w · ~{readSec}s</span>
                  <button onClick={()=>onCopy(r,d.id)} style={{padding:"6px 14px",borderRadius:"8px",border:`1px solid ${d.color}25`,cursor:"pointer",background:copied===d.id?d.color+"18":"transparent",color:copied===d.id?d.color:"#475569",fontSize:"11.5px",fontWeight:700,transition:"all 0.15s"}}>{copied===d.id?"✓ Copied":"Copy"}</button>
                </div>
              </div>
              <div style={{fontSize:"13.5px",lineHeight:1.9,color:"#cbd5e1",background:"rgba(0,0,0,0.25)",padding:"14px 16px",borderRadius:"10px",whiteSpace:"pre-wrap",border:"1px solid rgba(255,255,255,0.05)"}}>{r}</div>
            </div>
          );
        }

        // Structured output: { hooks, voScript, captions, ctas }
        const { hooks=[], voScript="", captions=[], ctas=[] } = r;
        const allText = [...hooks, voScript, ...captions, ...ctas].join("\n\n");
        const sections = [
          { key:"hooks",    label:"🎣 Hooks", icon:"🎣", count:hooks.length,    items:hooks,   accent:d.color },
          { key:"voScript", label:"🎙️ VO Script", icon:"🎙️", count:1,           items:[voScript], accent:"#f1f5f9" },
          { key:"captions", label:"✏️ Captions", icon:"✏️", count:captions.length, items:captions, accent:"#06b6d4" },
          { key:"ctas",     label:"📣 CTAs",   icon:"📣", count:ctas.length,    items:ctas,    accent:"#22c55e" },
        ];

        return (
          <div key={d.id} style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",border:`1px solid ${d.color}28`,borderLeft:`3px solid ${d.color}`,borderRadius:"15px",marginBottom:"11px",boxShadow:`0 0 30px ${d.color}0a,0 4px 20px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.05)`,animation:"fadeUp 0.35s ease both",animationDelay:`${idx*0.07}s`,overflow:"hidden"}}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.04)",flexWrap:"wrap",gap:"8px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"11px"}}>
                <div style={{width:"36px",height:"36px",borderRadius:"10px",background:d.color+"14",border:`1px solid ${d.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",fontWeight:900,color:d.color,flexShrink:0}}>{d.label.charAt(0)}</div>
                <div>
                  <div style={{fontSize:"15px",fontWeight:800,color:"#f1f5f9"}}>{d.label}</div>
                  <div style={{fontSize:"10.5px",color:"#475569"}}>{d.sub} · {d.region} · {hooks.length} hooks · {captions.length} captions · {ctas.length} CTAs</div>
                </div>
              </div>
              <button onClick={()=>onCopy(allText,d.id)} style={{padding:"6px 14px",borderRadius:"8px",border:`1px solid ${d.color}25`,cursor:"pointer",background:copied===d.id?d.color+"18":"transparent",color:copied===d.id?d.color:"#475569",fontSize:"11.5px",fontWeight:700,transition:"all 0.15s"}}>{copied===d.id?"✓ Copied":"Copy All"}</button>
            </div>
            {/* Sections */}
            <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:"8px"}}>
              {sections.map(sec=>{
                const isOpen = openSections[`${d.id}-${sec.key}`] !== false; // default open
                return (
                  <div key={sec.key} style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",overflow:"hidden"}}>
                    <button onClick={()=>toggleSection(`${d.id}-${sec.key}`)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"rgba(255,255,255,0.025)",border:"none",cursor:"pointer",textAlign:"left"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
                        <span style={{fontSize:"12px"}}>{sec.icon}</span>
                        <span style={{fontSize:"11px",fontWeight:700,color:"#94a3b8",letterSpacing:"0.5px"}}>{sec.label}</span>
                        <span style={{fontSize:"10px",background:sec.accent+"18",color:sec.accent,border:`1px solid ${sec.accent}30`,borderRadius:"5px",padding:"1px 7px",fontWeight:700}}>{sec.count}</span>
                      </div>
                      <span style={{fontSize:"10px",color:"#334155"}}>{isOpen?"▲":"▼"}</span>
                    </button>
                    {isOpen&&(
                      <div style={{padding:"10px 12px",background:"rgba(0,0,0,0.12)"}}>
                        {sec.key==="voScript"
                          ? <div style={{fontSize:"13.5px",lineHeight:1.9,color:"#cbd5e1",background:"rgba(0,0,0,0.22)",padding:"13px 15px",borderRadius:"9px",whiteSpace:"pre-wrap",border:"1px solid rgba(255,255,255,0.05)",position:"relative"}}>
                              {voScript}
                              <button onClick={()=>onCopy(voScript,`${d.id}-vo`)} style={{position:"absolute",top:"8px",right:"8px",padding:"3px 9px",borderRadius:"6px",border:`1px solid ${copied===`${d.id}-vo`?d.color+"55":"rgba(255,255,255,0.06)"}`,cursor:"pointer",background:copied===`${d.id}-vo`?d.color+"14":"rgba(0,0,0,0.3)",color:copied===`${d.id}-vo`?d.color:"#475569",fontSize:"10px",fontWeight:700}}>{copied===`${d.id}-vo`?"✓":"Copy VO"}</button>
                            </div>
                          : <PromoSectionItems items={sec.items} sectionId={`${d.id}-${sec.key}`} copied={copied} onCopy={onCopy} accent={sec.accent} />
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ─── LoadingCard ─── */
function LoadingCard({tone, contentType, platform, length, label, CARD}) {
  return (
    <div style={CARD}><div style={{padding:"52px 24px",textAlign:"center"}}>
      <div style={{display:"flex",justifyContent:"center",gap:"10px",marginBottom:"22px"}}>
        {[0,1,2].map(i=><div key={i} style={{width:"10px",height:"10px",borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#ef4444)",boxShadow:"0 0 12px rgba(245,158,11,0.5)",animation:`pulse 1.3s ${i*0.22}s ease-in-out infinite`}}/>)}
      </div>
      <div style={{fontSize:"13.5px",color:"#94a3b8",fontWeight:700,marginBottom:"6px"}}>{label}</div>
      <div style={{fontSize:"10.5px",color:"#334155"}}>
        {TONES.find(t=>t.id===tone)?.icon} {TONES.find(t=>t.id===tone)?.label} · {CONTENT_TYPES.find(c=>c.id===contentType)?.label} · {PLATFORMS.find(p=>p.id===platform)?.icon} {PLATFORMS.find(p=>p.id===platform)?.label} · {LENGTHS.find(l=>l.id===length)?.label}
      </div>
    </div></div>
  );
}

/* ─── ModeRow (Promo tab) ─── */
function ModeRow({label,options,value,onChange,accent}) {
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:"12px"}} className="mode-row">
      <div style={{width:"62px",paddingTop:"6px",fontSize:"9.5px",fontWeight:700,color:"#334155",textTransform:"uppercase",letterSpacing:"0.8px",flexShrink:0}}>{label}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
        {options.map(opt=>{
          const on=value===opt.id;
          return <button key={opt.id} onClick={()=>onChange(opt.id)} style={{padding:"5px 12px",borderRadius:"7px",border:`1px solid ${on?accent+"55":"rgba(255,255,255,0.06)"}`,background:on?accent+"16":"rgba(255,255,255,0.02)",color:on?accent:"#334155",fontSize:"11.5px",fontWeight:on?700:500,cursor:"pointer",transition:"all 0.14s"}}>{opt.icon?<span style={{marginRight:"3px"}}>{opt.icon}</span>:null}{opt.label}</button>;
        })}
      </div>
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
  @keyframes slideIn   {from{transform:translateX(100%);}to{transform:translateX(0);}}
  @keyframes blobFloat {0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(20px,-15px) scale(1.04);}66%{transform:translate(-12px,10px) scale(0.97);}}

  /* Tab content animations */
  @keyframes tabExitLeft  {from{opacity:1;transform:translateX(0) scale(1);}to{opacity:0;transform:translateX(-40px) scale(0.97);}}
  @keyframes tabExitRight {from{opacity:1;transform:translateX(0) scale(1);}to{opacity:0;transform:translateX(40px) scale(0.97);}}
  @keyframes tabEnterLeft {from{opacity:0;transform:translateX(-40px) scale(0.97);}to{opacity:1;transform:translateX(0) scale(1);}}
  @keyframes tabEnterRight{from{opacity:0;transform:translateX(40px) scale(0.97);}to{opacity:1;transform:translateX(0) scale(1);}}

  .ruhi-title {
    font-size:92px;
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
  .hist-panel { animation:slideIn 0.26s cubic-bezier(.16,1,.3,1) both; }
  .hist-item { transition:background 0.13s; cursor:pointer; }
  .hist-item:hover { background:rgba(255,255,255,0.05) !important; border-color:rgba(255,255,255,0.09) !important; }

  @media(max-width:600px){
    .topbar{padding:0 14px !important;height:54px !important;}
    .main{padding:20px 12px 70px !important;}
    .ruhi-title{font-size:52px !important;letter-spacing:-2px !important;}
    .mode-row{flex-direction:column !important;gap:5px !important;}
    .tab-bar{padding:4px !important;}
    .api-label{display:none !important;}
    .hist-panel{width:100vw !important;}
  }
  @media(max-width:400px){.ruhi-title{font-size:40px !important;}}
`;

/* ─── Tab Switcher ─── */
const TABS = [
  { id:"converter", icon:"🌐", label:"Converter",    sub:"Script → Dialect" },
  { id:"promo",     icon:"🎬", label:"Promo Studio", sub:"Stage Content" },
];

function TabBar({active, onSwitch}) {
  const idx = TABS.findIndex(t=>t.id===active);
  return (
    <div className="tab-bar" style={{display:"flex",gap:"6px",padding:"6px",background:"rgba(255,255,255,0.025)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:"16px",marginBottom:"24px",position:"relative",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.06)"}}>
      {/* Glowing slider */}
      <div style={{position:"absolute",top:"6px",bottom:"6px",left:`calc(${idx}*50% + 6px)`,width:"calc(50% - 12px)",borderRadius:"11px",background:"linear-gradient(135deg,rgba(245,158,11,0.14),rgba(239,68,68,0.10))",border:"1px solid rgba(245,158,11,0.28)",boxShadow:"0 0 20px rgba(245,158,11,0.12),inset 0 1px 0 rgba(245,158,11,0.12)",transition:"left 0.32s cubic-bezier(.34,1.3,.64,1)",pointerEvents:"none",zIndex:0}} />
      {TABS.map(t=>{
        const on=active===t.id;
        return (
          <button key={t.id} onClick={()=>onSwitch(t.id)} style={{flex:1,padding:"10px 16px",border:"none",background:"transparent",borderRadius:"11px",cursor:"pointer",position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",transition:"opacity 0.18s"}}>
            <div style={{fontSize:"15px",lineHeight:1}}>{t.icon}</div>
            <div style={{fontSize:"12px",fontWeight:on?800:500,color:on?"#fbbf24":"#334155",transition:"color 0.2s",letterSpacing:"-0.2px"}}>{t.label}</div>
            <div style={{fontSize:"9.5px",color:on?"#78716c":"#1e293b",transition:"color 0.2s"}}>{t.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════
   CONVERTER TAB  (original simple)
══════════════════════════════════ */
function ConverterTab() {
  const [sel,     setSel]     = useState(new Set(DIALECTS.map(d=>d.id)));
  const [script,  setScript]  = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [copied,  setCopied]  = useState("");
  const toggle = id => setSel(prev=>{const n=new Set(prev);if(n.has(id)&&n.size===1)return prev;n.has(id)?n.delete(id):n.add(id);return n;});

  const convert = async () => {
    if(!script.trim()||sel.size===0)return;
    setLoading(true);setError("");setResults(null);
    const ids=DIALECTS.filter(d=>sel.has(d.id)).map(d=>d.id);
    try {
      await Promise.all(ids.map(id =>
        streamConvert({
          model:"anthropic/claude-haiku-4-5",
          system:buildSingleConverterSystem(id),
          messages:[{role:"user",content:`Auto-detect the language of this script, understand its full meaning, then rewrite it completely in authentic ${id} dialect:\n\n${script}`}]
        }).then(raw => setResults(prev=>({...(prev||{}), [id]:raw.trim()})))
      ));
    }catch(e){setError(e.message);}
    setLoading(false);
  };

  const copy=(text,id)=>{navigator.clipboard.writeText(text);setCopied(id);setTimeout(()=>setCopied(""),2000);};
  const copyAll=()=>copy(DIALECTS.filter(d=>results[d.id]).map(d=>`━━━ ${d.sub} (${d.region}) ━━━\n${results[d.id]}`).join("\n\n"),"all");

  const wc=script.trim()?script.trim().split(/\s+/).length:0;
  const cp=Math.min((script.length/2000)*100,100);
  const ids=DIALECTS.filter(d=>sel.has(d.id)).map(d=>d.id);
  const can=!loading&&!!script.trim()&&sel.size>0;
  const CARD={background:"rgba(255,255,255,0.035)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:"16px",overflow:"hidden",marginBottom:"12px",boxShadow:"0 4px 24px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.06)"};
  const GHOST={padding:"5px 12px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",fontWeight:600,fontSize:"11px",background:"transparent",color:"#64748b"};

  return (
    <>
      <DialectPills selected={sel} onToggle={toggle} />

      {/* Script Input */}
      <div style={{...CARD,border:"1px solid rgba(255,255,255,0.09)"}} className="ta-wrap">
        <div style={{padding:"13px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}><span>✍️</span><span style={{fontSize:"10.5px",fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:"#475569"}}>Script Input</span></div>
          <div style={{display:"flex",gap:"12px"}}><span style={{fontSize:"11px",color:"#2d3748"}}>{wc} words</span><span style={{fontSize:"11px",color:script.length>2000?"#f87171":"#2d3748"}}>{script.length} chars</span></div>
        </div>
        <div style={{padding:"18px 20px"}}>
          <textarea value={script} onChange={e=>setScript(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&e.ctrlKey)convert();}}
            placeholder={"Kisi bhi bhasha mein script paste karo — Hindi, English, Bhojpuri, Gujarati, Marathi, Punjabi, Haryanvi, ya koi bhi...\n\nAI automatically detect karega aur selected dialects mein convert karega.\n\nExample: \"Yeh kahani hai ek aisi ladki ki, jisne apni zindagi mein sab kuch kho diya — par haar nahi maani.\""}
            style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"#e2e8f0",fontSize:"14px",resize:"none",lineHeight:1.9,fontFamily:"'Inter','Segoe UI',sans-serif",minHeight:"140px",boxSizing:"border-box"}}
          />
          {script.length>0&&<div style={{marginTop:"8px",height:"2px",borderRadius:"2px",background:"rgba(255,255,255,0.05)",overflow:"hidden"}}><div style={{height:"100%",width:`${cp}%`,borderRadius:"2px",background:cp>90?"linear-gradient(90deg,#f97316,#ef4444)":"linear-gradient(90deg,#f59e0b,#fbbf24)",transition:"width 0.3s"}}/></div>}
        </div>
        <div style={{padding:"12px 20px",borderTop:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.14)",flexWrap:"wrap",gap:"8px"}}>
          <span style={{fontSize:"11px",color:"#2d3748"}}>⌨ Ctrl + Enter</span>
          <button onClick={convert} disabled={!can} className={can?"pb pb-ready":""} style={{padding:"10px 26px",borderRadius:"10px",border:"none",cursor:can?"pointer":"not-allowed",fontWeight:700,fontSize:"13px",background:can?"linear-gradient(135deg,#f59e0b,#ef4444)":"rgba(255,255,255,0.04)",color:can?"#fff":"#334155",display:"inline-flex",alignItems:"center",gap:"7px"}}>
            {loading?<><span style={{width:"11px",height:"11px",borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",display:"inline-block",animation:"spin 0.7s linear infinite"}}/> Converting…</>:`⚡ Convert to ${sel.size} dialect${sel.size>1?"s":""}`}
          </button>
        </div>
      </div>

      {error&&<div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:"13px",padding:"13px 16px",color:"#fca5a5",marginBottom:"12px",fontSize:"13px",display:"flex",gap:"9px"}}><span>⚠</span><span>{error}</span></div>}

      {loading&&<div style={CARD}><div style={{padding:"32px 24px",textAlign:"center"}}>
        <div style={{display:"flex",justifyContent:"center",gap:"10px",marginBottom:"16px"}}>{[0,1,2].map(i=><div key={i} style={{width:"11px",height:"11px",borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#ef4444)",boxShadow:"0 0 14px rgba(245,158,11,0.55)",animation:`pulse 1.3s ${i*0.22}s ease-in-out infinite`}}/>)}</div>
        <div style={{fontSize:"14px",color:"#94a3b8",fontWeight:700,marginBottom:"10px"}}>Converting in parallel…</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"6px",justifyContent:"center"}}>
          {ids.map(id=>{const d=DIALECTS.find(x=>x.id===id);const done=results&&results[id];return <span key={id} style={{fontSize:"11px",padding:"3px 10px",borderRadius:"8px",border:`1px solid ${done?d.color+"60":"rgba(255,255,255,0.08)"}`,color:done?d.color:"#334155",background:done?d.color+"12":"transparent",fontWeight:done?700:400}}>{done?"✓ ":""}{d?.sub}</span>;})}
        </div>
      </div></div>}

      {results&&(
        <>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",background:"rgba(34,197,94,0.05)",border:"1px solid rgba(34,197,94,0.13)",borderRadius:"13px",padding:"13px 18px",flexWrap:"wrap",gap:"8px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}><span style={{fontSize:"18px"}}>{loading?"⏳":"✅"}</span><div><div style={{fontSize:"13px",fontWeight:700,color:"#f1f5f9"}}>{Object.keys(results).length}/{ids.length} conversion{ids.length>1?"s":""} {loading?"in progress…":"complete"}</div><div style={{fontSize:"10.5px",color:"#475569"}}>Ready to copy & use</div></div></div>
            <div style={{display:"flex",gap:"7px"}}>
              <button onClick={copyAll} className="gb" style={{padding:"5px 12px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",fontWeight:600,fontSize:"11px",background:"transparent",color:copied==="all"?"#22c55e":"#64748b"}}>{copied==="all"?"✓ Copied!":"Copy All"}</button>
              <button onClick={()=>{setResults(null);setScript("");}} className="gb" style={{padding:"5px 12px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",fontWeight:600,fontSize:"11px",background:"transparent",color:"#64748b"}}>New Script</button>
            </div>
          </div>
          <ResultCards results={results} selIds={ids} copied={copied} onCopy={copy} />
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════
   PROMO STUDIO TAB
══════════════════════════════════ */
function PromoTab() {
  const [sel,           setSel]         = useState(new Set(DIALECTS.map(d=>d.id)));
  const [script,        setScript]      = useState("");
  const [story,         setStory]       = useState("");
  const [innerTab,      setInnerTab]    = useState("script");
  const [results,       setResults]     = useState(null);
  const [loading,       setLoading]     = useState(false);
  const [error,         setError]       = useState("");
  const [copied,        setCopied]      = useState("");
  const [tone,          setTone]        = useState("dramatic");
  const [contentType,   setContentType] = useState("trailer");
  const [length,        setLength]      = useState("full");
  const [intensity,     setIntensity]   = useState("medium");
  const [platform,      setPlatform]    = useState("insta");
  const [showContext,   setShowContext]  = useState("");
  const [genre,         setGenre]       = useState("drama");
  const [targetEmotion, setTargetEmotion] = useState("dard");
  const [duration,      setDuration]    = useState("30");
  const [cast,          setCast]        = useState("");
  const [plotPoints,    setPlotPoints]  = useState("");
  const [storyBible,    setStoryBible]  = useState({protagonist:"",protaGoal:"",protaFlaw:"",antagonist:"",antaGoal:"",act1:"",act2:"",act3:"",twist:"",climax:"",emotionalJourney:"",usp:"",themes:"",cast:"",keyDialogues:""});
  const [showBible,     setShowBible]   = useState(false);
  const [history,       setHistory]     = useState(()=>getHistory());
  const [showHist,      setShowHist]    = useState(false);
  const upBible = (k,v) => setStoryBible(prev=>({...prev,[k]:v}));
  const toggle=id=>setSel(prev=>{const n=new Set(prev);if(n.has(id)&&n.size===1)return prev;n.has(id)?n.delete(id):n.add(id);return n;});

  const generate=async(mode)=>{
    const input=(mode==="story"?story:script).trim();
    if(!input||sel.size===0)return;
    setLoading(true);setError("");setResults(null);
    const ids=DIALECTS.filter(d=>sel.has(d.id)).map(d=>d.id);
    const accumulated={};
    try{
      await Promise.all(ids.map(id=>{
        const sys = mode==="story"
          ? buildSingleStorySystem(id,tone,contentType,length,intensity,platform,showContext,storyBible)
          : buildSinglePromoSystem(id,tone,contentType,length,intensity,platform,showContext,genre,targetEmotion,duration,cast,plotPoints);
        const userMsg = mode==="story"
          ? `Yeh story hai. Isko samajhkar ${id} dialect mein original promo content likho:\n\n${input}`
          : `Is script ko ${id} dialect mein convert karo:\n\n${input}`;
        return streamConvert({model:"anthropic/claude-sonnet-4-5",system:sys,messages:[{role:"user",content:userMsg}]})
          .then(raw=>{
            const m=raw.replace(/```json|```/gi,"").trim().match(/\{[\s\S]*\}/);
            if(!m)throw new Error(`${id}: parse nahi hua`);
            const parsed=JSON.parse(m[0]);
            accumulated[id]=parsed;
            setResults(prev=>({...(prev||{}), [id]:parsed}));
          });
      }));
      setInnerTab("output");
      const entry={id:Date.now(),ts:new Date().toISOString(),mode,script:input,selIds:ids,tone,contentType,length,intensity,platform,showContext,genre,targetEmotion,duration,cast,plotPoints,results:accumulated};
      setHistory(prev=>pushHistory(entry,prev));
    }catch(e){setError(e.message);}
    setLoading(false);
  };

  const loadEntry=h=>{
    if(h.mode==="story")setStory(h.script);else setScript(h.script);
    setSel(new Set(h.selIds));setTone(h.tone);setContentType(h.contentType);
    setLength(h.length);setIntensity(h.intensity);
    if(h.platform)setPlatform(h.platform);
    if(h.showContext!==undefined)setShowContext(h.showContext);
    setResults(h.results);
    setInnerTab(h.mode==="story"?"story":"script");
    setShowHist(false);
  };
  const clearHist=()=>{localStorage.removeItem(LS_HISTORY);setHistory([]);};
  const copy=(text,id)=>{navigator.clipboard.writeText(text);setCopied(id);setTimeout(()=>setCopied(""),2000);};
  const copyAll=()=>{
    const text=DIALECTS.filter(d=>results[d.id]).map(d=>{
      const r=results[d.id];
      if(typeof r==="string") return `━━━ ${d.sub} (${d.region}) ━━━\n${r}`;
      const {hooks=[],voScript="",captions=[],ctas=[]}=r;
      const parts=[`━━━ ${d.sub} (${d.region}) ━━━`];
      if(hooks.length){parts.push("🎣 HOOKS:");hooks.forEach((h,i)=>parts.push(`${i+1}. ${h}`));}
      if(voScript){parts.push("\n🎙️ VO SCRIPT:");parts.push(voScript);}
      if(captions.length){parts.push("\n✏️ CAPTIONS:");captions.forEach((c,i)=>parts.push(`${i+1}. ${c}`));}
      if(ctas.length){parts.push("\n📣 CTAs:");ctas.forEach((c,i)=>parts.push(`${i+1}. ${c}`));}
      return parts.join("\n");
    }).join("\n\n");
    copy(text,"all");
  };

  const ids=DIALECTS.filter(d=>sel.has(d.id)).map(d=>d.id);
  const CARD={background:"rgba(255,255,255,0.035)",backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:"16px",overflow:"hidden",marginBottom:"12px",boxShadow:"0 4px 24px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.06)"};
  const GHOST={padding:"5px 12px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",fontWeight:600,fontSize:"11px",background:"transparent",color:"#64748b"};

  /* ── Inner tab bar ── */
  const INNER_TABS = [
    { id:"script", label:"📄 Script",  desc:"Existing script convert karo" },
    { id:"story",  label:"📖 Story",   desc:"Story do → Claude promo likhega" },
    { id:"output", label:"✨ Output",  desc:"Generated results", badge: results?ids.length:0 },
  ];

  return (
    <>
      {/* Writing Mode */}
      <div style={CARD}>
        <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontSize:"12px"}}>⚙️</span>
            <span style={{fontSize:"10.5px",fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:"#475569"}}>Writing Mode</span>
          </div>
          <button onClick={()=>setShowHist(true)} className="gb" style={{...GHOST,position:"relative"}}>
            History {history.length>0&&<span style={{position:"absolute",top:"-4px",right:"-4px",width:"14px",height:"14px",borderRadius:"50%",background:"#f59e0b",fontSize:"8px",fontWeight:800,color:"#000",display:"flex",alignItems:"center",justifyContent:"center"}}>{history.length}</span>}
          </button>
        </div>
        <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:"11px"}}>
          <ModeRow label="Tone"      options={TONES}           value={tone}          onChange={setTone}          accent="#f59e0b" />
          <ModeRow label="Format"    options={CONTENT_TYPES}   value={contentType}   onChange={setContentType}   accent="#a855f7" />
          <ModeRow label="Length"    options={LENGTHS}         value={length}        onChange={setLength}        accent="#3b82f6" />
          <ModeRow label="Intensity" options={INTENSITIES}     value={intensity}     onChange={setIntensity}     accent="#22c55e" />
          <ModeRow label="Platform"  options={PLATFORMS}       value={platform}      onChange={setPlatform}      accent="#06b6d4" />
          <ModeRow label="Genre"     options={GENRES}          value={genre}         onChange={setGenre}         accent="#ec4899" />
          <ModeRow label="Emotion"   options={TARGET_EMOTIONS} value={targetEmotion} onChange={setTargetEmotion} accent="#f97316" />
          <ModeRow label="Duration"  options={DURATIONS}       value={duration}      onChange={setDuration}      accent="#a855f7" />
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"11px 18px",display:"flex",flexDirection:"column",gap:"9px"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"6px"}}>
              <span style={{fontSize:"10px"}}>🎭</span>
              <span style={{fontSize:"9.5px",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"#334155"}}>Show Context</span>
              <span style={{fontSize:"9px",color:"#1e293b",fontStyle:"italic"}}>(optional)</span>
            </div>
            <input value={showContext} onChange={e=>setShowContext(e.target.value)}
              placeholder="Show: Aandhi  ·  Lead: Guddan  ·  Villain: Ramesh Babu"
              style={{width:"100%",background:"rgba(0,0,0,0.3)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",padding:"8px 12px",color:"#94a3b8",fontSize:"11.5px",outline:"none",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color 0.2s,box-shadow 0.2s"}}
              onFocus={e=>e.target.style.borderColor="rgba(6,182,212,0.35)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.07)"}
            />
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"6px"}}>
              <span style={{fontSize:"10px"}}>🌟</span>
              <span style={{fontSize:"9.5px",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"#334155"}}>Star Cast</span>
              <span style={{fontSize:"9px",color:"#1e293b",fontStyle:"italic"}}>(optional)</span>
            </div>
            <input value={cast} onChange={e=>setCast(e.target.value)}
              placeholder="e.g. Pawan Singh, Aamrapali Dubey"
              style={{width:"100%",background:"rgba(0,0,0,0.3)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",padding:"8px 12px",color:"#94a3b8",fontSize:"11.5px",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor="rgba(236,72,153,0.35)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.07)"}
            />
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"6px"}}>
              <span style={{fontSize:"10px"}}>🎬</span>
              <span style={{fontSize:"9.5px",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"#334155"}}>Key Plot Points</span>
              <span style={{fontSize:"9px",color:"#1e293b",fontStyle:"italic"}}>(optional)</span>
            </div>
            <textarea value={plotPoints} onChange={e=>setPlotPoints(e.target.value)}
              placeholder={"Key moments to highlight in hooks/VO:\n• Guddan discovers her chacha betrayed the family\n• Final confrontation scene in the panchayat"}
              rows={3}
              style={{width:"100%",background:"rgba(0,0,0,0.3)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",padding:"8px 12px",color:"#94a3b8",fontSize:"11.5px",outline:"none",fontFamily:"inherit",boxSizing:"border-box",resize:"vertical",lineHeight:1.6}}
              onFocus={e=>e.target.style.borderColor="rgba(249,115,22,0.35)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.07)"}
            />
          </div>
        </div>
      </div>

      {/* Inner Tab Bar */}
      <div style={{display:"flex",gap:"6px",marginBottom:"12px",background:"rgba(255,255,255,0.025)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:"14px",padding:"5px",boxShadow:"0 4px 20px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.05)"}}>
        {INNER_TABS.map(t=>{
          const on=innerTab===t.id;
          return (
            <button key={t.id} onClick={()=>setInnerTab(t.id)} style={{flex:1,padding:"9px 10px",border:"none",borderRadius:"10px",cursor:"pointer",background:on?"#0d0d16":"transparent",boxShadow:on?"0 0 0 1px rgba(245,158,11,0.22), 0 2px 8px rgba(0,0,0,0.3)":"none",position:"relative",transition:"all 0.18s"}}>
              <div style={{fontSize:"12px",fontWeight:on?700:500,color:on?"#fbbf24":"#334155",letterSpacing:"-0.2px",lineHeight:1.2}}>{t.label}</div>
              <div style={{fontSize:"9px",color:on?"#57534e":"#1e293b",marginTop:"2px"}}>{t.desc}</div>
              {t.badge>0&&<span style={{position:"absolute",top:"5px",right:"8px",minWidth:"16px",height:"16px",borderRadius:"8px",background:"linear-gradient(135deg,#f59e0b,#ef4444)",fontSize:"8.5px",fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* ── SCRIPT TAB ── */}
      {innerTab==="script"&&(
        <>
          <DialectPills selected={sel} onToggle={toggle} />
          <div style={{...CARD,border:"1px solid rgba(255,255,255,0.09)"}} className="ta-wrap">
            <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
                <span style={{fontSize:"12px"}}>📄</span>
                <span style={{fontSize:"10.5px",fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:"#475569"}}>Existing Script</span>
              </div>
              <div style={{display:"flex",gap:"10px"}}>
                <span style={{fontSize:"10.5px",color:"#2d3748"}}>{script.trim()?script.trim().split(/\s+/).length:0} words</span>
                <span style={{fontSize:"10.5px",color:script.length>2000?"#f87171":"#2d3748"}}>{script.length} chars</span>
              </div>
            </div>
            <div style={{padding:"16px 18px"}}>
              <textarea value={script} onChange={e=>setScript(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&e.ctrlKey)generate("script");}}
                placeholder={"Apna existing script yahan paste karo — jisko dialect mein convert karna hai.\n\nExample:\n\"Yeh kahani hai ek aisi ladki ki, jisne apni zindagi mein sab kuch kho diya — par haar nahi maani. Dekhiye Stage par, sirf aaj se.\""}
                style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"#e2e8f0",fontSize:"13.5px",resize:"none",lineHeight:1.9,fontFamily:"'Inter','Segoe UI',sans-serif",minHeight:"130px",boxSizing:"border-box"}}
              />
              {script.length>0&&<div style={{marginTop:"7px",height:"2px",borderRadius:"2px",background:"rgba(255,255,255,0.05)",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min((script.length/2000)*100,100)}%`,borderRadius:"2px",background:script.length>1800?"linear-gradient(90deg,#f97316,#ef4444)":"linear-gradient(90deg,#f59e0b,#fbbf24)",transition:"width 0.3s"}}/></div>}
            </div>
            <div style={{padding:"11px 18px",borderTop:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.14)",flexWrap:"wrap",gap:"8px"}}>
              <span style={{fontSize:"10.5px",color:"#2d3748"}}>⌨ Ctrl + Enter</span>
              <button onClick={()=>generate("script")} disabled={loading||!script.trim()||sel.size===0} className={(!loading&&script.trim()&&sel.size>0)?"pb pb-ready":""} style={{padding:"9px 22px",borderRadius:"10px",border:"none",cursor:(!loading&&script.trim()&&sel.size>0)?"pointer":"not-allowed",fontWeight:700,fontSize:"12.5px",background:(!loading&&script.trim()&&sel.size>0)?"linear-gradient(135deg,#f59e0b,#ef4444)":"rgba(255,255,255,0.04)",color:(!loading&&script.trim()&&sel.size>0)?"#fff":"#334155",display:"inline-flex",alignItems:"center",gap:"6px"}}>
                {loading?<><span style={{width:"10px",height:"10px",borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",display:"inline-block",animation:"spin 0.7s linear infinite"}}/> Writing…</>:`⚡ Convert to ${sel.size} dialect${sel.size>1?"s":""}`}
              </button>
            </div>
          </div>
          {error&&<div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:"12px",padding:"12px 15px",color:"#fca5a5",fontSize:"12.5px",display:"flex",gap:"8px"}}><span>⚠</span><span>{error}</span></div>}
          {loading&&<LoadingCard tone={tone} contentType={contentType} platform={platform} length={length} label="Converting your script…" CARD={CARD} />}
        </>
      )}

      {/* ── STORY TAB ── */}
      {innerTab==="story"&&(
        <>
          <div style={{background:"rgba(168,85,247,0.05)",border:"1px solid rgba(168,85,247,0.12)",borderRadius:"12px",padding:"11px 14px",marginBottom:"12px",fontSize:"12px",color:"#c084fc",lineHeight:1.6}}>
            <strong style={{color:"#d8b4fe"}}>Story Mode:</strong> Kahani ka synopsis likhdo. Claude story ko samjhega — characters, conflict, emotion sab — aur phir <em>khud</em> har dialect mein original promo likhega. Yeh conversion nahi, creative writing hai.
          </div>
          <DialectPills selected={sel} onToggle={toggle} />
          <div style={{...CARD,border:"1px solid rgba(168,85,247,0.22)"}} className="ta-wrap">
            <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(168,85,247,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(168,85,247,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
                <span style={{fontSize:"12px"}}>📖</span>
                <span style={{fontSize:"10.5px",fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:"#a855f7"}}>Story / Synopsis</span>
              </div>
              <span style={{fontSize:"10.5px",color:"#4a3060"}}>{story.trim()?story.trim().split(/\s+/).length:0} words</span>
            </div>
            <div style={{padding:"16px 18px"}}>
              <textarea value={story} onChange={e=>setStory(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&e.ctrlKey)generate("story");}}
                placeholder={"Apni kahani yahan likho — jitni detail ho sake utni do.\n\nKya likhen:\n• Main character kaun hai aur uski situation kya hai?\n• Core conflict ya drama kya hai?\n• Emotional peak moment kya hai?\n• Kahani ka setting (gaon, sheher, parivaar)?\n• Koi specific scene jo promo mein aana chahiye?\n\nExample:\n\"Guddan ek 22 saal ki ladki hai jo Rajasthan ke ek chhote gaon mein apne bade bhai ke saath rehti hai. Baap ki maut ke baad ghar chalane ki zimmedari aa gayi hai. Ek din usse pata chalta hai ki gaon ki zameen kisi ne dhokhe se apne naam karwa li — aur woh shakhs uska chacha hai. Ab Guddan ko decide karna hai: chup rehna ya apne hi khandan se ladna.\""}
                style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"#e2e8f0",fontSize:"13.5px",resize:"none",lineHeight:1.9,fontFamily:"'Inter','Segoe UI',sans-serif",minHeight:"170px",boxSizing:"border-box"}}
              />
            </div>
            <div style={{padding:"11px 18px",borderTop:"1px solid rgba(168,85,247,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(168,85,247,0.03)",flexWrap:"wrap",gap:"8px"}}>
              <span style={{fontSize:"10.5px",color:"#4a3060"}}>⌨ Ctrl + Enter</span>
              <button onClick={()=>generate("story")} disabled={loading||!story.trim()||sel.size===0} className={(!loading&&story.trim()&&sel.size>0)?"pb pb-ready":""} style={{padding:"9px 22px",borderRadius:"10px",border:"none",cursor:(!loading&&story.trim()&&sel.size>0)?"pointer":"not-allowed",fontWeight:700,fontSize:"12.5px",background:(!loading&&story.trim()&&sel.size>0)?"linear-gradient(135deg,#a855f7,#7c3aed)":"rgba(255,255,255,0.04)",color:(!loading&&story.trim()&&sel.size>0)?"#fff":"#334155",display:"inline-flex",alignItems:"center",gap:"6px",boxShadow:(!loading&&story.trim()&&sel.size>0)?"0 0 20px rgba(168,85,247,0.35)":"none",transition:"all 0.2s"}}>
                {loading?<><span style={{width:"10px",height:"10px",borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",display:"inline-block",animation:"spin 0.7s linear infinite"}}/> Writing…</>:`✨ Create promo for ${sel.size} dialect${sel.size>1?"s":""}`}
              </button>
            </div>
          </div>

          {/* Story Bible */}
          <div style={{...CARD,border:"1px solid rgba(168,85,247,0.15)",marginBottom:"12px"}}>
            <button onClick={()=>setShowBible(p=>!p)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 18px",background:"rgba(168,85,247,0.04)",border:"none",cursor:"pointer",textAlign:"left",borderBottom:showBible?"1px solid rgba(168,85,247,0.1)":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{fontSize:"12px"}}>📚</span>
                <span style={{fontSize:"10.5px",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",color:"#a855f7"}}>Story Bible</span>
                <span style={{fontSize:"9px",color:"#6b3fa0",fontStyle:"italic"}}>(deep context — optional but recommended)</span>
              </div>
              <span style={{fontSize:"10px",color:"#6b3fa0"}}>{showBible?"▲ Hide":"▼ Add Details"}</span>
            </button>
            {showBible&&(
              <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:"10px"}}>
                {[
                  {k:"protagonist",    label:"Protagonist",          ph:"Name, age, background — who are they?"},
                  {k:"protaGoal",      label:"Protagonist's Goal",   ph:"What do they want? What drives them?"},
                  {k:"protaFlaw",      label:"Protagonist's Flaw",   ph:"Internal wound or weakness that creates conflict"},
                  {k:"antagonist",     label:"Antagonist",           ph:"Who or what is opposing them?"},
                  {k:"antaGoal",       label:"Antagonist's Goal",    ph:"What does the antagonist want?"},
                  {k:"twist",          label:"Key Twist",            ph:"The reveal or turn that changes everything"},
                  {k:"climax",         label:"Climax Moment",        ph:"The peak moment — the scene to tease in promo"},
                  {k:"usp",            label:"Unique Selling Point",  ph:"What makes this show different from others?"},
                  {k:"themes",         label:"Themes",               ph:"e.g. izzat, betrayal, mother-daughter bond"},
                  {k:"cast",           label:"Cast",                 ph:"Lead actors, supporting cast"},
                ].map(({k,label,ph})=>(
                  <div key={k}>
                    <div style={{fontSize:"9.5px",fontWeight:700,color:"#6b3fa0",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"4px"}}>{label}</div>
                    <input value={storyBible[k]} onChange={e=>upBible(k,e.target.value)} placeholder={ph}
                      style={{width:"100%",background:"rgba(0,0,0,0.28)",border:"1px solid rgba(168,85,247,0.12)",borderRadius:"7px",padding:"7px 11px",color:"#94a3b8",fontSize:"11.5px",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
                      onFocus={e=>e.target.style.borderColor="rgba(168,85,247,0.4)"}
                      onBlur={e=>e.target.style.borderColor="rgba(168,85,247,0.12)"}
                    />
                  </div>
                ))}
                <div>
                  <div style={{fontSize:"9.5px",fontWeight:700,color:"#6b3fa0",letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:"4px"}}>Key Dialogues</div>
                  <textarea value={storyBible.keyDialogues} onChange={e=>upBible("keyDialogues",e.target.value)}
                    placeholder={"Memorable lines from the show to reference:\n\"Chacha, tune zameen hi nahi — apna rishta bhi bech diya.\"\n\"Maa ki kasam hai tujhe — ab peeche mat mud.\""}
                    rows={3}
                    style={{width:"100%",background:"rgba(0,0,0,0.28)",border:"1px solid rgba(168,85,247,0.12)",borderRadius:"7px",padding:"7px 11px",color:"#94a3b8",fontSize:"11.5px",outline:"none",fontFamily:"inherit",boxSizing:"border-box",resize:"vertical",lineHeight:1.6}}
                    onFocus={e=>e.target.style.borderColor="rgba(168,85,247,0.4)"}
                    onBlur={e=>e.target.style.borderColor="rgba(168,85,247,0.12)"}
                  />
                </div>
              </div>
            )}
          </div>

          {error&&<div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:"12px",padding:"12px 15px",color:"#fca5a5",fontSize:"12.5px",display:"flex",gap:"8px"}}><span>⚠</span><span>{error}</span></div>}
          {loading&&<LoadingCard tone={tone} contentType={contentType} platform={platform} length={length} label="Story samajhke promo likh raha hoon…" CARD={CARD} />}
        </>
      )}

      {/* ── OUTPUT TAB ── */}
      {innerTab==="output"&&(
        <>
          {!results&&!loading&&(
            <div style={{...CARD,textAlign:"center",padding:"52px 24px"}}>
              <div style={{fontSize:"32px",marginBottom:"12px"}}>✨</div>
              <div style={{fontSize:"14px",fontWeight:700,color:"#334155",marginBottom:"6px"}}>Koi output abhi nahi hai</div>
              <div style={{fontSize:"12px",color:"#1e293b"}}>Script ya Story tab mein jao aur promo generate karo</div>
            </div>
          )}
          {loading&&<LoadingCard tone={tone} contentType={contentType} platform={platform} length={length} label="Promo likh raha hoon…" CARD={CARD} />}
          {results&&(
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",background:"rgba(34,197,94,0.05)",border:"1px solid rgba(34,197,94,0.13)",borderRadius:"13px",padding:"12px 16px",flexWrap:"wrap",gap:"8px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{fontSize:"18px"}}>✅</span>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:700,color:"#f1f5f9"}}>{ids.length} dialect{ids.length>1?"s":""} · {CONTENT_TYPES.find(c=>c.id===contentType)?.label}</div>
                    <div style={{fontSize:"10px",color:"#475569"}}>{TONES.find(t=>t.id===tone)?.icon} {TONES.find(t=>t.id===tone)?.label} · {PLATFORMS.find(p=>p.id===platform)?.icon} {PLATFORMS.find(p=>p.id===platform)?.label} · {LENGTHS.find(l=>l.id===length)?.label} · {INTENSITIES.find(i=>i.id===intensity)?.label}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:"7px"}}>
                  <button onClick={copyAll} className="gb" style={{...GHOST,color:copied==="all"?"#22c55e":"#64748b"}}>{copied==="all"?"✓ Copied!":"Copy All"}</button>
                  <button onClick={()=>{setResults(null);setCopied("");}} className="gb" style={{...GHOST}}>Clear</button>
                </div>
              </div>
              <PromoResultCards results={results} selIds={ids} copied={copied} onCopy={copy} />
            </>
          )}
        </>
      )}

      {/* History Panel */}
      {showHist&&(
        <>
          <div onClick={()=>setShowHist(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.52)",zIndex:40,backdropFilter:"blur(4px)"}} />
          <div className="hist-panel" style={{position:"fixed",top:0,right:0,width:"340px",height:"100vh",background:"rgba(7,7,15,0.82)",backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",borderLeft:"1px solid rgba(255,255,255,0.09)",zIndex:50,display:"flex",flexDirection:"column",boxShadow:"-8px 0 40px rgba(0,0,0,0.6)"}}>
            <div style={{padding:"16px 18px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <div style={{fontSize:"13px",fontWeight:800,color:"#f1f5f9"}}>Recent Generations</div>
              <div style={{display:"flex",gap:"7px"}}>
                {history.length>0&&<button onClick={clearHist} className="gb" style={{padding:"4px 10px",borderRadius:"7px",border:"1px solid rgba(239,68,68,0.2)",cursor:"pointer",fontSize:"10px",background:"transparent",color:"#ef4444"}}>Clear</button>}
                <button onClick={()=>setShowHist(false)} className="gb" style={{padding:"4px 10px",borderRadius:"7px",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",fontSize:"11px",background:"transparent",color:"#64748b"}}>✕</button>
              </div>
            </div>
            <div style={{flex:1,overflow:"auto",padding:"8px"}}>
              {history.length===0
                ?<div style={{padding:"44px 20px",textAlign:"center",color:"#334155",fontSize:"12px"}}><div style={{fontSize:"26px",marginBottom:"8px"}}>📭</div>No generations yet</div>
                :history.map(h=>{
                  const t=TONES.find(x=>x.id===h.tone);
                  const ct=CONTENT_TYPES.find(x=>x.id===h.contentType);
                  const plt=PLATFORMS.find(x=>x.id===h.platform);
                  const d=new Date(h.ts);
                  return(
                    <div key={h.id} className="hist-item" onClick={()=>loadEntry(h)} style={{padding:"11px",borderRadius:"11px",border:"1px solid rgba(255,255,255,0.05)",marginBottom:"7px",background:"rgba(255,255,255,0.01)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
                        <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
                          <span style={{fontSize:"9px",background:h.mode==="story"?"rgba(168,85,247,0.1)":"rgba(100,116,139,0.1)",border:`1px solid ${h.mode==="story"?"rgba(168,85,247,0.2)":"rgba(100,116,139,0.2)"}`,color:h.mode==="story"?"#a855f7":"#64748b",padding:"1px 6px",borderRadius:"4px",fontWeight:700}}>{h.mode==="story"?"📖 Story":"📄 Script"}</span>
                          <span style={{fontSize:"9px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.15)",color:"#f59e0b",padding:"1px 6px",borderRadius:"4px",fontWeight:600}}>{t?.icon} {t?.label}</span>
                          <span style={{fontSize:"9px",background:"rgba(168,85,247,0.08)",border:"1px solid rgba(168,85,247,0.15)",color:"#a855f7",padding:"1px 6px",borderRadius:"4px",fontWeight:600}}>{ct?.label}</span>
                          {plt&&<span style={{fontSize:"9px",background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.15)",color:"#06b6d4",padding:"1px 6px",borderRadius:"4px",fontWeight:600}}>{plt.icon}</span>}
                        </div>
                        <span style={{fontSize:"9px",color:"#1e293b",flexShrink:0,marginLeft:"4px"}}>{d.getDate()} {d.toLocaleString("en",{month:"short"})} {d.getHours()}:{String(d.getMinutes()).padStart(2,"0")}</span>
                      </div>
                      <div style={{fontSize:"11.5px",color:"#4a5568",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.script.slice(0,70)}{h.script.length>70?"…":""}</div>
                      <div style={{fontSize:"9px",color:"#334155",marginTop:"3px"}}>{h.selIds.map(id=>DIALECTS.find(d=>d.id===id)?.sub).filter(Boolean).join(" · ")}</div>
                    </div>
                  );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════
   ROOT APP
══════════════════════════════════ */
export default function App() {
  /* Tab switching */
  const [activeTab, setActiveTab]   = useState("converter");
  const [tabAnim,   setTabAnim]     = useState(null);  // {from, to, phase:"exit"|"enter"}
  const animTimerRef = useRef(null);

  const switchTab = (newTab) => {
    if(newTab===activeTab||tabAnim) return;
    const from=activeTab;
    const toRight=TABS.findIndex(t=>t.id===newTab)>TABS.findIndex(t=>t.id===from);
    setTabAnim({from,to:newTab,toRight,phase:"exit"});
    clearTimeout(animTimerRef.current);
    animTimerRef.current=setTimeout(()=>{
      setActiveTab(newTab);
      setTabAnim(a=>a?{...a,phase:"enter"}:null);
      setTimeout(()=>setTabAnim(null),260);
    },200);
  };

  const getContentStyle=()=>{
    if(!tabAnim) return {animation:"none"};
    const {toRight,phase}=tabAnim;
    if(phase==="exit")  return {animation:`${toRight?"tabExitLeft":"tabExitRight"} 0.2s ease both`};
    if(phase==="enter") return {animation:`${toRight?"tabEnterRight":"tabEnterLeft"} 0.26s cubic-bezier(.16,1,.3,1) both`};
    return {};
  };

  const ROOT={fontFamily:"'Inter','Segoe UI',sans-serif",background:"#07070f",minHeight:"100vh",color:"#fff",position:"relative",isolation:"isolate"};
  const TOPBAR={padding:"0 28px",height:"60px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(7,7,15,0.65)",backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",position:"sticky",top:0,zIndex:10,borderBottom:"1px solid rgba(255,255,255,0.07)",boxShadow:"0 1px 0 rgba(245,158,11,0.12),0 8px 32px rgba(0,0,0,0.6),inset 0 -1px 0 rgba(255,255,255,0.04)"};
  const GHOST={padding:"5px 12px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",fontWeight:600,fontSize:"11px",background:"transparent",color:"#64748b"};

  /* ── Main ── */
  return (
    <div style={ROOT}><AmbientBg/><LanguageBg/><style>{CSS}</style>
      <div style={{position:"relative",zIndex:1}}>

        {/* Topbar */}
        <div style={TOPBAR} className="topbar">
          <Logo />
          <div className="live-dot" style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"11.5px",color:"#22c55e",background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.18)",padding:"4px 11px",borderRadius:"20px"}}>
            <span style={{width:"5px",height:"5px",borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/>
            <span className="api-label">Connected</span>
          </div>
        </div>

        {/* Main Content */}
        <div style={{maxWidth:"780px",margin:"0 auto",padding:"36px 22px 80px"}} className="main">

          {/* Title */}
          <div style={{textAlign:"center",marginBottom:"28px"}}>
            <h1 className="ruhi-title" style={{margin:0,fontWeight:900,letterSpacing:"-3px",lineHeight:1,userSelect:"none"}}>RUHI</h1>
          </div>

          {/* Tab Bar */}
          <TabBar active={activeTab} onSwitch={switchTab} />

          {/* Tab Content */}
          <div style={{...getContentStyle(),willChange:"transform,opacity"}}>
            {activeTab==="converter" ? <ConverterTab key="converter" /> : <PromoTab key="promo" />}
          </div>

        </div>

        {/* Footer */}
        <div style={{borderTop:"1px solid rgba(255,255,255,0.04)",padding:"16px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"7px"}} className="footer-wrap">
          <div style={{fontSize:"11.5px",fontWeight:500,display:"flex",alignItems:"center",gap:"5px",flexWrap:"wrap"}}>
            <span style={{color:"#334155"}}>Powered by</span>
            <span className="gold-shine">Claude</span>
            <span style={{color:"#1e293b"}}>·</span>
            <span className="gold-shine">Built for OTT Promo Team</span>
            <span style={{color:"#1e293b"}}>by</span>
            <span className="gold-shine">Manik Prajapati</span>
          </div>
          <div style={{fontSize:"10.5px",color:"#1e293b"}}>{DIALECTS.length} dialects · 2 modes</div>
        </div>
      </div>
    </div>
  );
}
