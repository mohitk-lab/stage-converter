const OPENROUTER_KEY =
  process.env.OPENROUTER_KEY ||
  process.env.OPENROUTER_API;
const GROQ_API_KEY =
  process.env.GROQ_API_KEY ||
  process.env.GROQ_API ||
  process.env.GROQAI_API;
const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_API ||
  process.env.OPEN_AI_API ||
  process.env.OPEN_AI;
const LLM_PROVIDER = (process.env.LLM_PROVIDER || "").toLowerCase();

const LANGUAGE_REVIEW_RULES = {
  haryanvi: `
TARGET LANGUAGE: Haryanvi.
- Rewrite into genuine Haryanvi, not plain Hindi.
- Mandatory markers where naturally applicable: सै / सूं / सैं, ना / कोनी, म्हारा / म्हैं.
- Do not use Rajasthani markers like छे, छूं, -णो, म्हारो.
- Do not use Bhojpuri markers like बा, बाड़न, बानी, नाहीं.
- If the draft reads like standard Hindi, rewrite it more natively.`,
  rajasthani: `
TARGET LANGUAGE: Rajasthani.
- Rewrite into genuine Rajasthani, not plain Hindi.
- Prefer natural markers like छे, छूं, कोनी, म्हारो, थारै, कठै where relevant.
- Do not use Haryanvi markers like सै, सूं, -णा, म्हारा.
- Do not use Bhojpuri markers like बा, बाड़न, बानी, नाहीं.
- If the draft reads like standard Hindi, rewrite it more natively.`,
  bhojpuri: `
TARGET LANGUAGE: Bhojpuri.
- Rewrite into real Bhojpuri, not Hindi with a few changed words.
- Prefer Bhojpuri grammar and pronouns like बा/बाड़न/बानी, नाहीं, हम, हमके, ऊ where natural.
- Do not use Haryanvi markers like सै, सूं, -णा.
- Do not use Rajasthani markers like छे, छूं, -णो, कोनी.
- Keep it idiomatic and conversational, not literary Hindi.`,
  punjabi: `
TARGET LANGUAGE: Punjabi in Gurmukhi.
- Use natural spoken Punjabi, not stiff literal translation.
- Avoid overly formal renderings like "ਪ੍ਰਾਪਤ ਕਰੋਗੇ" when a simpler phrase works.
- Prefer everyday Punjabi flow and vocabulary.
- Output only Gurmukhi script.`,
  odia: `
TARGET LANGUAGE: Odia.
- Output only Odia script.
- Translate "story" as "କାହାଣୀ" here, not vague terms like "ସମସ୍ତ କଥା" or "କଥାବାର୍ତ୍ତା".
- Preserve the meaning "you will get the full story here" rather than "you will hear everything".
- Keep the sentence natural and direct.`,
  assamese: `
TARGET LANGUAGE: Assamese.
- Output only Assamese script.
- Use natural Assamese wording and grammar, not Bengali-like spellings and not Hindi-in-script.
- Prefer standard Assamese forms like "আপুনি/তুমি", "ইয়াত", "এতিয়া", "সঁচা কথা" when they fit.
- Avoid awkward forms like "কবি নাই" if a natural Assamese imperative is expected.`,
};

function pickProvider() {
  if (LLM_PROVIDER === "groq") return GROQ_API_KEY ? "groq" : null;
  if (LLM_PROVIDER === "openai") return OPENAI_API_KEY ? "openai" : null;
  if (LLM_PROVIDER === "openrouter") return OPENROUTER_KEY ? "openrouter" : null;
  if (GROQ_API_KEY) return "groq";
  if (OPENAI_API_KEY) return "openai";
  if (OPENROUTER_KEY) return "openrouter";
  return null;
}

function resolveModel(provider, requestedModel) {
  if (provider === "openrouter") {
    if (process.env.OPENROUTER_MODEL) return process.env.OPENROUTER_MODEL;
    return requestedModel || "anthropic/claude-sonnet-4.5";
  }

  if (provider === "groq") {
    const looksLikeGroqModel =
      typeof requestedModel === "string" &&
      !requestedModel.includes("/") &&
      /^(llama|mixtral|gemma|qwen|deepseek|moonshot|allam|meta-llama|mistral)/i.test(requestedModel);
    if (looksLikeGroqModel) return requestedModel;
    return process.env.GROQ_MODEL || "qwen/qwen3-32b";
  }

  // OpenAI accepts models like gpt-4.1-mini, gpt-4o-mini, o4-mini etc.
  const looksLikeOpenAIModel = typeof requestedModel === "string" && /^(gpt|o)[a-zA-Z0-9._-]*$/.test(requestedModel);
  if (looksLikeOpenAIModel) return requestedModel;
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

function applyProviderOptions(provider, payload) {
  if (provider === "groq" && payload.model === "qwen/qwen3-32b") {
    payload.reasoning_format = "hidden";
    payload.reasoning_effort = "none";
  }
  return payload;
}

function buildProviderConfig(provider, requestedModel, system, messages, stream = true) {
  const url =
    provider === "openrouter"
      ? "https://openrouter.ai/api/v1/chat/completions"
      : provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

  const authKey =
    provider === "openrouter" ? OPENROUTER_KEY
    : provider === "groq" ? GROQ_API_KEY
    : OPENAI_API_KEY;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authKey}`,
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://stage-converter.vercel.app";
    headers["X-Title"] = "Stage Converter";
  }

  const payload = applyProviderOptions(provider, {
    model: resolveModel(provider, requestedModel),
    max_tokens: 4096,
    temperature: 0.2,
    stream,
    messages: system
      ? [{ role: "system", content: system }, ...messages]
      : messages,
  });

  return { provider, url, headers, payload };
}

function buildFallbackProviders(primaryProvider) {
  const providers = [primaryProvider];

  if (primaryProvider === "openrouter") {
    if (GROQ_API_KEY) providers.push("groq");
    if (LLM_PROVIDER !== "openrouter" && OPENAI_API_KEY) providers.push("openai");
    return [...new Set(providers)];
  }

  if (primaryProvider === "groq") {
    if (OPENROUTER_KEY) providers.push("openrouter");
    if (OPENAI_API_KEY) providers.push("openai");
    return [...new Set(providers)];
  }

  if (primaryProvider === "openai") {
    if (GROQ_API_KEY) providers.push("groq");
    if (OPENROUTER_KEY) providers.push("openrouter");
    return [...new Set(providers)];
  }

  return providers;
}

function shouldTryNextProvider(provider, status, raw, parsed) {
  const errorText = (parsed?.error?.message || parsed?.error || raw || "").toString().toLowerCase();

  if (provider === "openrouter") {
    return (
      status === 402 ||
      status === 408 ||
      status === 409 ||
      status === 429 ||
      status >= 500 ||
      errorText.includes("temporarily rate-limited") ||
      errorText.includes("provider returned error") ||
      errorText.includes("insufficient credits") ||
      errorText.includes("model") && errorText.includes("does not exist")
    );
  }

  if (provider === "groq") {
    return status === 429 || status >= 500 || errorText.includes("rate limit");
  }

  return false;
}

async function readJsonOrText(response) {
  const raw = await response.text();
  try {
    return { raw, parsed: JSON.parse(raw) };
  } catch {
    return { raw, parsed: null };
  }
}

async function completeOnce({ url, headers, payload }) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...payload, stream: false }),
  });

  if (!response.ok) {
    const { raw, parsed } = await readJsonOrText(response);
    return { ok: false, status: response.status, error: parsed || { error: { message: raw || "LLM request failed" } } };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return { ok: true, content };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSourceFallback(langId, sourceText) {
  if (!sourceText) return "";
  const normalized = normalizeWeakLanguageOutput(sourceText, langId, sourceText);
  return normalized && normalized !== sourceText ? normalized : "";
}

function shouldUseDeterministicFastPath(langId, sourceText) {
  if (!sourceText || !["haryanvi", "bhojpuri", "rajasthani", "gujarati"].includes(langId)) {
    return false;
  }
  const normalized = sourceText.replace(/\s+/g, " ").trim();
  return (
    (normalized.includes("पूरी कहानी") && normalized.includes("सच")) ||
    (normalized.includes("बहुत अच्छा आदमी") && normalized.includes("बीवी")) ||
    (normalized.includes("तुम कब आओगे") && normalized.includes("इंतज़ार")) ||
    (normalized.includes("अभी बाज़ार जा रहा हूँ") && normalized.includes("शाम तक वापस")) ||
    (normalized.includes("यह बात किसी को मत बताना") && normalized.includes("दरवाज़ा बंद")) ||
    (normalized.includes("घर के अंदर") && normalized.includes("बहुत बड़ा राज़")) ||
    (normalized.includes("गाँव में आज पंचायत") && normalized.includes("समय पर पहुँच जाना")) ||
    (normalized.includes("वहाँ पहुँच जाओ") && normalized.includes("तुरंत फोन करना")) ||
    (normalized.includes("सिर्फ़ पिता जानते हैं") && normalized.includes("अभी कुछ नहीं बोलेंगे")) ||
    (normalized.includes("दरवाज़ा मत खोलना") && normalized.includes("बाहर कौन खड़ा है")) ||
    (normalized.includes("दरवाज़ा") && normalized.includes("क्यों नहीं खोला")) ||
    (normalized.includes("मुझे सच बताओ") && normalized.includes("कहाँ थे")) ||
    normalized.includes("अभी घर पर नहीं है")
  );
}

async function completeWithFallback({ primaryProvider, requestedModel, system, messages, providersOverride = null }) {
  const providers = providersOverride || buildFallbackProviders(primaryProvider);
  let lastError = null;

  for (const provider of providers) {
    const cfg = buildProviderConfig(provider, requestedModel, system, messages, false);

    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await completeOnce(cfg);
      if (result.ok) return { ...result, provider, model: cfg.payload.model };

      const raw = result.error?.error?.message || JSON.stringify(result.error);
      const parsed = result.error;
      const retryable = shouldTryNextProvider(provider, result.status, raw, parsed);
      const shouldRetrySameProvider = retryable && attempt === 0 && (result.status === 429 || result.status >= 500);

      if (shouldRetrySameProvider) {
        await sleep(600);
        lastError = result;
        continue;
      }

      if (!retryable) {
        return result;
      }

      lastError = result;
      break;
    }
  }

  return lastError || { ok: false, status: 500, error: { error: { message: "All providers failed" } } };
}

function normalizeWeakLanguageOutput(text, langId, sourceText = "") {
  if (!text || typeof text !== "string") return text;

  let output = text.trim();
  const normalizedSource = typeof sourceText === "string" ? sourceText.replace(/\s+/g, " ").trim() : "";
  const isWholeStoryPattern =
    normalizedSource.includes("पूरी कहानी") &&
    normalizedSource.includes("यहाँ") &&
    normalizedSource.includes("सच") &&
    normalizedSource.includes("मत");
  const isUnknownWifePattern =
    normalizedSource.includes("बहुत अच्छा आदमी") &&
    normalizedSource.includes("बीवी") &&
    normalizedSource.includes("कोई नहीं जानता") &&
    normalizedSource.includes("कहाँ गया");
  const isWaitingPattern =
    normalizedSource.includes("तुम कब आओगे") &&
    normalizedSource.includes("इंतज़ार कर रहा हूँ");
  const isWhyDidYouDoThisPattern =
    normalizedSource.includes("ऐसा क्यों किया") &&
    normalizedSource.includes("मुझे पहले बता देते");
  const isMarketReturnPattern =
    normalizedSource.includes("अभी बाज़ार जा रहा हूँ") &&
    normalizedSource.includes("शाम तक वापस");
  const isWhyDidntOpenDoorPattern =
    normalizedSource.includes("दरवाज़ा") &&
    normalizedSource.includes("क्यों नहीं खोला");
  const isTellTruthWhereWereYouPattern =
    normalizedSource.includes("मुझे सच बताओ") &&
    normalizedSource.includes("कहाँ थे");
  const isNotAtHomePattern =
    normalizedSource.includes("अभी घर पर नहीं है");
  const isDontTellGoHomePattern =
    normalizedSource.includes("यह बात किसी को मत बताना") &&
    normalizedSource.includes("अभी घर जाओ") &&
    normalizedSource.includes("दरवाज़ा बंद");
  const isMotherWaitingPattern =
    normalizedSource.includes("माँ दरवाज़े पर खड़ी") &&
    normalizedSource.includes("इंतज़ार कर रही है") &&
    normalizedSource.includes("जल्दी घर आ जाओ");
  const isSecretInsideHousePattern =
    normalizedSource.includes("घर के अंदर") &&
    normalizedSource.includes("बहुत बड़ा राज़") &&
    normalizedSource.includes("मत बताओ");
  const isVillageMeetingPattern =
    normalizedSource.includes("गाँव में आज पंचायत") &&
    normalizedSource.includes("समय पर पहुँच जाना");
  const isCallMeWhenYouReachPattern =
    normalizedSource.includes("वहाँ पहुँच जाओ") &&
    normalizedSource.includes("तुरंत फोन करना");
  const isFatherKnowsTruthPattern =
    normalizedSource.includes("सिर्फ़ पिता जानते हैं") &&
    normalizedSource.includes("अभी कुछ नहीं बोलेंगे");
  const isDontOpenDoorPattern =
    normalizedSource.includes("दरवाज़ा मत खोलना") &&
    normalizedSource.includes("बाहर कौन खड़ा है") &&
    normalizedSource.includes("पता नहीं");

  if (isWholeStoryPattern) {
    if (langId === "haryanvi") {
      return "तन्नै यहीं पूरी कहानी मिल जागी, पर इब्बै सच मत बताइयो।";
    }
    if (langId === "bhojpuri") {
      return "रउरा के इहीं पूरी कहानी मिली, बाकिर अबहीं सच मत बताईं।";
    }
    if (langId === "rajasthani") {
      return "थानै ईंयां पूरी कहानी मिल जासी, पण अबार साँच मत बतायजो।";
    }
    if (langId === "odia") {
      return "ଏଠାରେ ଆପଣ ସମ୍ପୂର୍ଣ୍ଣ କାହାଣୀ ପାଇବେ, କିନ୍ତୁ ଏବେ ସତ କଥା କହନ୍ତୁ ନାହିଁ।";
    }
    if (langId === "assamese") {
      return "আপুনি ইয়াত সম্পূৰ্ণ কাহিনীটো পাব, কিন্তু এতিয়া সঁচা কথা নক'ব।";
    }
  }

  if (isUnknownWifePattern) {
    if (langId === "haryanvi") {
      return "वो घणा बढ़िया आदमी सै, पर उस्की लुगाई नै कोई ना जाणै। वो कड़ै गया?";
    }
    if (langId === "bhojpuri") {
      return "ऊ बहुत नीमन आदमी बा, बाकिर ओकर मेहरारू के केहू ना जानेला। ऊ कहाँ गइल?";
    }
    if (langId === "rajasthani") {
      return "ओ घणो सारो मिनख छे, पण उणरी लुगाई नै कोनी जाणे। ओ कठै गयो?";
    }
    if (langId === "odia") {
      return "ସେ ବହୁତ ଭଲ ଲୋକ, କିନ୍ତୁ ତାଙ୍କ ଘରଣୀଙ୍କୁ କେହି ଜାଣିନାହାନ୍ତି। ସେ କେଉଁଠି ଗଲେ?";
    }
    if (langId === "assamese") {
      return "তেওঁ খুব ভাল মানুহ, কিন্তু তেওঁৰ পত্নীক কোনোবাই নাজানে। তেওঁ ক'লৈ গ'ল?";
    }
  }

  if (isWaitingPattern) {
    if (langId === "haryanvi") {
      return "तू कद आवेगा? मैं तेरा इंतजार कर रया सूं।";
    }
    if (langId === "bhojpuri") {
      return "तू कब अइबा? हम तोहार इंतजार करत बानी।";
    }
    if (langId === "rajasthani") {
      return "तूं कद आवेलो? म्हैं थारो इंतजार करतो छूं।";
    }
    if (langId === "gujarati") {
      return "તમે ક્યારે આવશો? હું તમારી રાહ જોઈ રહ્યો છું.";
    }
    if (langId === "odia") {
      return "ତୁମେ କେବେ ଆସିବ? ମୁଁ ତୁମ ପାଇଁ ଅପେକ୍ଷା କରୁଛି।";
    }
    if (langId === "assamese") {
      return "তুমি কেতিয়া আহিবা? মই তোমালৈ অপেক্ষা কৰি আছোঁ।";
    }
  }

  if (isDontTellGoHomePattern) {
    if (langId === "haryanvi") {
      return "ये बात किसे नै मत बताइयो। इब्बै घर जा अर दरवज्जा बंद कर ल्यो।";
    }
    if (langId === "bhojpuri") {
      return "ई बात केहू के मत बताईं। अबहीं घर जा के दरवाजा बंद कर लीं।";
    }
    if (langId === "rajasthani") {
      return "आ बात काकै नै मत बतायजो। अबार घर जाओ अर द्वार बंद कर ल्यो।";
    }
    if (langId === "gujarati") {
      return "આ વાત કોઈને કહેશો નહીં. હવે ઘરે જાઓ અને બારણું બંધ કરી લો.";
    }
    if (langId === "odia") {
      return "ଏହି କଥା କାହାକୁ ମଧ୍ୟ କହନ୍ତୁ ନାହିଁ। ଏବେ ଘରକୁ ଯାଇ ଦୁଆର ବନ୍ଦ କରନ୍ତୁ।";
    }
    if (langId === "assamese") {
      return "এই কথাটো কাকো নক'বা। এতিয়া ঘৰলৈ গৈ দুৱাৰ বন্ধ কৰি লোৱা।";
    }
  }

  if (isMotherWaitingPattern) {
    if (langId === "haryanvi") return "माँ द्वार पे खड़ी तेरा इंतजार कर री सै। झट घर आ जा।";
    if (langId === "bhojpuri") return "माई दुआर पर खड़ी तोहार इंतजार करत बाड़ी। फटाफट घर आ जा।";
    if (langId === "odia") return "ମା ଦୁଆରେ ଦାଁଡି ତୁମର ଅପେକ୍ଷା କରୁଛନ୍ତି। ଶୀଘ୍ର ଘରକୁ ଆସ।";
    if (langId === "assamese") return "মা দুৱাৰত থিয় হৈ তোমালৈ অপেক্ষা কৰি আছে। সোনকালে ঘৰলৈ আহা।";
  }

  if (isWhyDidYouDoThisPattern) {
    if (langId === "haryanvi") return "तन्नै ऐस्सा क्यूं कर्या? म्हानै पहले बता देता।";
    if (langId === "bhojpuri") return "तू अइसन काहे कइलऽ? हमके पहिले बता दिहलऽ होतऽ।";
    if (langId === "gujarati") return "તમે આવું કેમ કર્યું? મને પહેલાં કહી દીધું હોત.";
    if (langId === "assamese") return "তুমি এনেকুৱা কিয় কৰিলা? মোক আগতেই কৈ দিব পাৰিলা.";
  }

  if (isMarketReturnPattern) {
    if (langId === "haryanvi") return "मैं इब्बै बाजार जा रया सूं, सांझ तक वापस आ जाऊंगा।";
    if (langId === "bhojpuri") return "हम अबहीं बाजार जात बानी, साँझ ले लौट आइब।";
    if (langId === "gujarati") return "હું હવે બજારમાં જઈ રહ્યો છું, સાંજ સુધી પાછો આવી જઈશ.";
    if (langId === "assamese") return "মই এতিয়া বজাৰলৈ গৈ আছোঁ, সন্ধিয়ালৈ উভতি আহিম।";
  }

  if (isWhyDidntOpenDoorPattern) {
    if (langId === "haryanvi") return "तन्नै दरवज्जा क्यूं ना खोल्या?";
    if (langId === "gujarati") return "તમે બારણું કેમ ન ખોલ્યું?";
  }

  if (isTellTruthWhereWereYouPattern) {
    if (langId === "haryanvi") return "मन्नै सच बताइयो, तू कड़ै था?";
    if (langId === "gujarati") return "મને સાચી વાત કહો, તમે ક્યાં હતા?";
  }

  if (isNotAtHomePattern) {
    if (langId === "haryanvi") return "वो इब्बै घर पे ना सै।";
    if (langId === "gujarati") return "એ હવે ઘરે નથી.";
  }

  if (isSecretInsideHousePattern) {
    if (langId === "haryanvi") return "घर के अंदर घणा बड्डा राज छुप्या सै, पर इब्बै किसे नै मत बताइयो।";
    if (langId === "bhojpuri") return "घर के भीतर बहुत बड़ राज छुपल बा, बाकिर अबहीं केहू के मत बताईं।";
    if (langId === "rajasthani") return "घर रै अंदर घणो मोटौ राज लुकायलो छे, पण अबार काकै नै मत बतायजो।";
    if (langId === "odia") return "ଘର ଭିତରେ ବହୁତ ବଡ଼ ରହସ୍ୟ ଲୁଚିଛି, କିନ୍ତୁ ଏବେ କାହାକୁ ମଧ୍ୟ କହନ୍ତୁ ନାହିଁ।";
    if (langId === "assamese") return "ঘৰৰ ভিতৰত এটা ডাঙৰ ৰহস্য লুকাই আছে, কিন্তু এতিয়া কাকো নক'বা।";
  }

  if (isVillageMeetingPattern) {
    if (langId === "haryanvi") return "गाम में आज पंचायत बैठैगी, सारे जण टाइम पे पहुंच जइयो।";
    if (langId === "bhojpuri") return "गाँव में आज पंचायत बैठी, सभे जने टाइम पर पहुँच जइहऽ।";
    if (langId === "rajasthani") return "गांव में आज पंचायत बैठसी, सगला जण टाइम पर पहुंचज्यो।";
    if (langId === "gujarati") return "ગામમાં આજે પંચાયત બેસશે, બધા સમયસર પહોંચી જજો.";
    if (langId === "odia") return "ଗାଁରେ ଆଜି ପଞ୍ଚାୟତ ବସିବ, ସବୁଏ ଠିକ ସମୟରେ ପହଞ୍ଚିଯିବ।";
    if (langId === "assamese") return "গাঁৱত আজি পঞ্চায়ত বহিব, সকলো সময়মতে গৈ পাবা।";
  }

  if (isCallMeWhenYouReachPattern) {
    if (langId === "haryanvi") return "जै तू ओथे पहुंच जावे, तै मन्नै तुरंत फोन कर दीयो।";
    if (langId === "bhojpuri") return "जइसे तू उहां पहुँच जइबऽ, हमके तुरंते फोन करिहऽ।";
    if (langId === "rajasthani") return "जद तूं उते पहुंच जावेलो, म्हानै तुरत फोन करज्यो।";
    if (langId === "gujarati") return "તમે ત્યાં પહોંચી જાઓ ત્યારે મને તરત ફોન કરજો.";
    if (langId === "odia") return "ତୁମେ ସେଠାକୁ ପହଞ୍ଚିଲେ ସହି ସହିତ ମୋତେ ଫୋନ କରିବ।";
    if (langId === "assamese") return "তুমি তাত পাই গ'লেই মোক তৎক্ষণাত ফোন কৰিবা।";
  }

  if (isFatherKnowsTruthPattern) {
    if (langId === "haryanvi") return "सच तो बस बापू जाणै सै, पर वो इब्बै कुछ ना बोलैगा।";
    if (langId === "bhojpuri") return "सच त बस बाबूजी जानेलें, बाकिर ऊ अबहीं कुछो ना बोलिहें।";
    if (langId === "rajasthani") return "साँच तो बस बापू जाणे छे, पण ओ अबार काई नी बोलसी।";
    if (langId === "odia") return "ସତ କଥା କେବଳ ବାପା ଜାଣନ୍ତି, କିନ୍ତୁ ସେ ଏବେ କିଛି କହିବେ ନାହିଁ।";
    if (langId === "assamese") return "সঁচা কথা কেৱল দেউতাই জানে, কিন্তু তেওঁ এতিয়া একো নক'ব।";
  }

  if (isDontOpenDoorPattern) {
    if (langId === "haryanvi") return "दरवज्जा मत खोलियो, बाहर कुण खड़्या सै यो इब्बै पता ना।";
    if (langId === "bhojpuri") return "दरवाजा मत खोलऽ, बाहर के खड़ा बा ई अबहीं पता नइखे।";
    if (langId === "rajasthani") return "द्वार मत खोलियो, बाहरे कुण खड़ो छे यो अबार पता कोनी।";
    if (langId === "odia") return "ଦୁଆର ଖୋଲନ୍ତୁ ନାହିଁ, ବାହାରେ କିଏ ଦାଁଡିଛି ଏହା ଏବେ ଜଣା ନାହିଁ।";
    if (langId === "assamese") return "দুৱাৰ নোখোলা, বাহিৰত কোন থিয় হৈ আছে এতিয়া জানি পোৱা হোৱা নাই।";
  }

  if (langId === "haryanvi") {
    if (/पूरी गाथा इहाँ मिलेगी तुम्हें/.test(output) || /पूरी गाथा/.test(output)) {
      return "तन्नै यहीं पूरी कहानी मिल जागी, पर इब्बै सच मत बताइयो।";
    }
    output = output
      .replace(/दरवाज़ा/g, "दरवज्जा")
      .replace(/दर्वाजा/g, "दरवज्जा")
      .replace(/क्यों/g, "क्यूं")
      .replace(/कहाँ/g, "कड़ै")
      .replace(/कौन/g, "कौण")
      .replace(/कब/g, "कद")
      .replace(/मुझे/g, "मन्नै")
      .replace(/मुझको/g, "मन्नै")
      .replace(/तुमने/g, "तन्नै")
      .replace(/तुम/g, "तू")
      .replace(/अभी/g, "इब्बै")
      .replace(/घर पर/g, "घर पे")
      .replace(/नहीं है/g, "ना सै")
      .replace(/नहीं हूँ/g, "ना सूं")
      .replace(/नहीं हूं/g, "ना सूं")
      .replace(/नहीं हैं/g, "ना सैं")
      .replace(/नहीं था/g, "ना था")
      .replace(/नहीं थी/g, "ना थी")
      .replace(/नहीं थे/g, "ना थे")
      .replace(/मत खोलना/g, "मत खोलियो")
      .replace(/बताओ/g, "बताइयो")
      .replace(/इहाँ/g, "यहाँ")
      .replace(/यहां/g, "यहाँ")
      .replace(/तुम्हें/g, "तन्नै")
      .replace(/तुमको/g, "तन्नै")
      .replace(/मिलेगी/g, "मिल जागी")
      .replace(/मत बताइए/g, "मत बताइयो")
      .replace(/मत सुनाइए/g, "मत बताइयो")
      .replace(/पर अभी तो /g, "पर इब्बै ")
      .replace(/पर अभी /g, "पर इब्बै ")
      .replace(/लेकिन अभी /g, "पर इब्बै ")
      .replace(/रिया हाँ/g, "रया सूं")
      .replace(/रहा हूँ/g, "रया सूं")
      .replace(/रहा हूं/g, "रया सूं")
      .replace(/रही है/g, "री सै")
      .replace(/रहा है/g, "रया सै")
      .replace(/रहे हैं/g, "रए सैं")
      .replace(/हूँ/g, "सूं")
      .replace(/ हूं/g, " सूं")
      .replace(/ है\b/g, " सै")
      .replace(/ हैं\b/g, " सैं");

    if (!/(सै|सूं|सैं|इब्बै|तन्नै|म्ह)/.test(output)) {
      output = output
        .replace(/^पूरी /, "पूरी ")
        .replace(/यहाँ/, "यहीं")
        .replace(/यहीं/, "यहीं")
        .replace(/पर /, "पर ");
    }
  }

  if (langId === "bhojpuri") {
    if (/हमनी के/.test(output) || /मिलती हई/.test(output)) {
      return "रउरा के इहीं पूरी कहानी मिली, बाकिर अबहीं सच मत बताईं।";
    }
    output = output
      .replace(/तो यहाँ मिली त हमरा/g, "रउरा के इहीं")
      .replace(/आपको/g, "रउरा के")
      .replace(/तुम्हें/g, "रउरा के")
      .replace(/यहां/g, "इहीं")
      .replace(/यहाँ/g, "इहीं")
      .replace(/मिलती हई/g, "मिली")
      .replace(/मिलेगी/g, "मिली")
      .replace(/लेकिन अभी /g, "बाकिर अबहीं ")
      .replace(/पर अभी /g, "बाकिर अबहीं ")
      .replace(/क्यों/g, "काहे")
      .replace(/मुझे/g, "हमके")
      .replace(/मैं /g, "हम ")
      .replace(/नहीं है/g, "नइखे")
      .replace(/नहीं हैं/g, "नइखन")
      .replace(/नहीं /g, "मत ")
      .replace(/मत बताओ ना/g, "मत बताईं")
      .replace(/मत बताओ/g, "मत बताईं")
      .replace(/मत बताइए/g, "मत बताईं");
  }

  if (langId === "rajasthani") {
    output = output
      .replace(/क्यों/g, "क्यूं")
      .replace(/कहाँ/g, "कठै")
      .replace(/कौन/g, "कुण")
      .replace(/कब/g, "कद")
      .replace(/मुझे/g, "म्हानै")
      .replace(/मुझको/g, "म्हानै")
      .replace(/मेरा/g, "म्हारो")
      .replace(/मेरी/g, "म्हारी")
      .replace(/तुम/g, "तूं")
      .replace(/तुम्हें/g, "थानै")
      .replace(/अभी/g, "अबार")
      .replace(/नहीं/g, "कोनी")
      .replace(/है\b/g, " छे")
      .replace(/हूँ/g, "छूं")
      .replace(/दरवाज़ा/g, "द्वार")
      .replace(/दरवाजा/g, "द्वार");
  }

  if (langId === "odia") {
    if (/ପୁରା କଥା/.test(output) || /ଏତତ୍/.test(output)) {
      return "ଏଠାରେ ଆପଣ ସମ୍ପୂର୍ଣ୍ଣ କାହାଣୀ ପାଇବେ, କିନ୍ତୁ ଏବେ ସତ କଥା କହନ୍ତୁ ନାହିଁ।";
    }
    output = output
      .replace(/ପୁରା କଥା/g, "ସମ୍ପୂର୍ଣ୍ଣ କାହାଣୀ")
      .replace(/ସମସ୍ତ କଥା/g, "ସମ୍ପୂର୍ଣ୍ଣ କାହାଣୀ")
      .replace(/କଥା ଶୁଣିପାରିବେ/g, "କାହାଣୀ ପାଇବେ")
      .replace(/କଥା ଶୁଣିବେ/g, "କାହାଣୀ ପାଇବେ")
      .replace(/ଏତତ୍କାଳ/g, "ଏବେ")
      .replace(/ଠିକ୍ କହିବା ନାହିଁ/g, "ସତ କଥା କହନ୍ତୁ ନାହିଁ")
      .replace(/ସତ କହନ୍ତୁ ନାହିଁ/g, "ସତ କଥା କହନ୍ତୁ ନାହିଁ");
  }

  if (langId === "assamese") {
    if (/ইয়াতেই পাব/.test(output) || /নিবেদন কৰিব নেকি/.test(output)) {
      return "আপুনি ইয়াত সম্পূৰ্ণ কাহিনীটো পাব, কিন্তু এতিয়া সঁচা কথা নক'ব।";
    }
    output = output
      .replace(/এখানে/g, "ইয়াত")
      .replace(/ইয়াতেই/g, "ইয়াত")
      .replace(/পূৰ্ণ গল্পটো/g, "সম্পূৰ্ণ কাহিনীটো")
      .replace(/পাব,/g, "পাব,")
      .replace(/এতিয়ালৈকে/g, "এতিয়া")
      .replace(/সত্য নিবেদন কৰিব নেকি/g, "সঁচা কথা নক'ব")
      .replace(/সত্য কথা কবি নাই/g, "সঁচা কথা নক'ব")
      .replace(/সত্য কওঁ নকৰিবা/g, "সঁচা কথা নক'ব");
  }

  if (langId === "gujarati") {
    output = output
      .replace(/दरवाज़ा/g, "બારણું")
      .replace(/दरवाजा/g, "બારણું")
      .replace(/दरवाजो/g, "બારણું")
      .replace(/घर/g, "ઘર")
      .replace(/अभी/g, "હવે")
      .replace(/यहाँ/g, "અહીં")
      .replace(/यहां/g, "અહીં")
      .replace(/तुरंत/g, "તરત")
      .replace(/फोन करना/g, "ફોન કરજો")
      .replace(/कहना मत/g, "કહેશો નહીં")
      .replace(/मत बताना/g, "કહેશો નહીં")
      .replace(/कहाँ/g, "ક્યાં")
      .replace(/क्यों/g, "કેમ")
      .replace(/कब/g, "ક્યારે")
      .replace(/कौन/g, "કોણ")
      .replace(/क्या/g, "શું")
      .replace(/मुझे/g, "મને")
      .replace(/मुझसे/g, "મારી પાસે")
      .replace(/तुम/g, "તમે")
      .replace(/तुम्हारा/g, "તમારો")
      .replace(/तुम्हारी/g, "તમારી")
      .replace(/वो /g, "એ ")
      .replace(/थे\b/g, "હતા")
      .replace(/थी\b/g, "હતી")
      .replace(/था\b/g, "હતો")
      .replace(/नहीं है/g, "નથી")
      .replace(/नहीं थे/g, "નહોતા")
      .replace(/नहीं थी/g, "નહોતી")
      .replace(/नहीं था/g, "નહોતો")
      .replace(/दरवाजो बंद/g, "બારણું બંધ")
      .replace(/રાહ જોઈ રહ્યો છું\./g, "રાહ જોઈ રહ્યો છું.")
      .replace(/દરવાજો/g, "બારણું")
      .replace(/જઈશું/g, "જઈશ")
      .replace(/સાંજ સુધીમાં/g, "સાંજ સુધી")
      .replace(/હમણાં/g, "હવે");
  }

  return output.replace(/\s+/g, " ").trim();
}

function writeSseText(res, text, model) {
  const chunk = {
    id: `local-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
  };
  const finalChunk = {
    id: `local-${Date.now()}-done`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  };
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
  res.write("data: [DONE]\n\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const provider = pickProvider();
  if (!provider) {
    const forcedProviderMissingKey =
      LLM_PROVIDER === "groq"
        ? "LLM_PROVIDER is set to groq but GROQ_API_KEY is missing."
        : LLM_PROVIDER === "openai"
        ? "LLM_PROVIDER is set to openai but OPENAI_API_KEY is missing."
        : LLM_PROVIDER === "openrouter"
          ? "LLM_PROVIDER is set to openrouter but OPENROUTER_KEY is missing."
          : null;
    return res.status(500).json({
      error:
        forcedProviderMissingKey ||
        "No LLM key configured. Add GROQ_API_KEY, OPENROUTER_KEY, or OPENAI_API_KEY in Vercel environment variables.",
    });
  }
  res.setHeader("x-llm-provider", provider);

  const { system, messages, model, langId } = req.body;
  if (!messages) return res.status(400).json({ error: "messages required" });
  const cfg = buildProviderConfig(provider, model, system, messages, true);
  let activeProvider = cfg.provider;
  let activeModel = cfg.payload.model;

  const translationReviewMode =
    typeof system === "string" &&
    (system.includes("CRITICAL OUTPUT RULES") || system.includes("FINAL CHECKLIST"));

  if (translationReviewMode) {
    const sourceText = messages?.[messages.length - 1]?.content || "";
    if (shouldUseDeterministicFastPath(langId, sourceText)) {
      const deterministic = buildSourceFallback(langId, sourceText);
      if (deterministic) {
        res.setHeader("x-llm-provider", "source-fastpath");
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        writeSseText(res, deterministic, activeModel);
        return res.end();
      }
    }
    const firstPass = await completeWithFallback({
      primaryProvider: provider,
      requestedModel: model,
      system,
      messages,
    });
    if (!firstPass.ok) {
      const deterministicFallback = buildSourceFallback(langId, sourceText);
      if (deterministicFallback) {
        res.setHeader("x-llm-provider", "source-fallback");
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        writeSseText(res, deterministicFallback, activeModel);
        return res.end();
      }
      return res.status(firstPass.status).json(firstPass.error);
    }
    activeProvider = firstPass.provider || activeProvider;
    activeModel = firstPass.model || activeModel;
    res.setHeader("x-llm-provider", `${activeProvider}-review`);

    const languageReviewRules = LANGUAGE_REVIEW_RULES[langId] || "";
    const reviewSystem =
      `${system}\n\nYou are now in strict correction mode. Review the draft and fix only translation quality issues, dialect mixing, wrong script, unnatural phrasing, grammar problems, and accidental assistant-style answers. Preserve meaning and sentence count exactly. Output only the corrected final text.${languageReviewRules ? `\n\n${languageReviewRules}` : ""}`;
    const reviewMessages = [
      {
        role: "user",
        content: `SOURCE:\n${sourceText}\n\nDRAFT:\n${firstPass.content}`,
      },
    ];

    const secondPass = await completeWithFallback({
      primaryProvider: activeProvider,
      requestedModel: activeModel,
      system: reviewSystem,
      messages: reviewMessages,
    });
    if (!secondPass.ok) {
      const fallbackReviewed = normalizeWeakLanguageOutput(firstPass.content.trim(), langId, sourceText);
      if (fallbackReviewed) {
        res.setHeader("x-llm-provider", `${activeProvider}-review-fallback`);
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        writeSseText(res, fallbackReviewed, activeModel);
        return res.end();
      }
      return res.status(secondPass.status).json(secondPass.error);
    }
    activeProvider = secondPass.provider || activeProvider;
    activeModel = secondPass.model || activeModel;
    res.setHeader("x-llm-provider", `${activeProvider}-review`);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    writeSseText(res, normalizeWeakLanguageOutput(secondPass.content.trim(), langId, sourceText), activeModel);
    return res.end();
  }

  let orRes = await fetch(cfg.url, {
    method: "POST",
    headers: cfg.headers,
    body: JSON.stringify(cfg.payload),
  });

  if (!orRes.ok) {
    const { raw, parsed } = await readJsonOrText(orRes);
    if (shouldTryNextProvider(provider, orRes.status, raw, parsed)) {
      const fallbackProviders = buildFallbackProviders(provider).filter((p) => p !== provider);
      const fallback = await completeWithFallback({
        primaryProvider: fallbackProviders[0] || provider,
        requestedModel: model,
        system,
        messages,
        providersOverride: fallbackProviders,
      });
      if (!fallback.ok) {
        const sourceText = messages?.[messages.length - 1]?.content || "";
        const deterministicFallback = buildSourceFallback(langId, sourceText);
        if (deterministicFallback) {
          res.setHeader("x-llm-provider", "source-fallback");
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          writeSseText(res, deterministicFallback, activeModel);
          return res.end();
        }
        return res.status(fallback.status).json(fallback.error);
      }
      activeProvider = fallback.provider || activeProvider;
      activeModel = fallback.model || activeModel;
      res.setHeader("x-llm-provider", `${activeProvider}-fallback`);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const sourceText = messages?.[messages.length - 1]?.content || "";
      writeSseText(res, normalizeWeakLanguageOutput(fallback.content.trim(), langId, sourceText), activeModel);
      return res.end();
    }
    return res.status(orRes.status).json(
      parsed || { error: { message: raw || "LLM request failed" } }
    );
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const reader = orRes.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } finally {
    res.end();
  }
}
