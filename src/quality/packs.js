export const QUALITY_PROMPT_PACKS = {
  haryanvi: {
    system: `
HARYANVI QUALITY PACK:
- Prefer real Haryanvi village speech, not plain Hindi.
- High-value markers: सै, सूं, सैं, इब्बै, तन्नै, किसे नै, कड़ै, रया.
- Sheet-backed authentic Haryanvi cues that should feel natural where they fit: सबतै, अपणी, खात्तर, क्युकर, गाम, होरया, कसूता, कती कसूती, कुणबा, बेच्या जाणा.
- If a sentence still reads like Hindi, force at least 2-3 Haryanvi markers into it: सै/सूं, इब्बै, तन्नै, मन्नै, कड़ै, दरवज्जा.
- Questions should shift too: क्यों→क्यूं, कहाँ→कड़ै, कब→कद, कौन→कौण where natural.
- Avoid Punjabi/Bhojpuri contamination.
- Imperatives should sound local: बताइयो, कर ल्यो, जा.`,
    checklist: `
- Prefer Haryanvi wording like तन्नै / इब्बै / कड़ै / रया where natural.
- Prefer दरवज्जा, घर पे, मन्नै, क्यूं, ना सै where they fit.
- If the line is dramatic/promotional, prefer stronger Haryanvi phrasing like सबतै, अपणी, गाम, होरया, कसूता, खात्तर over flat Hindi wording.
- Convert copula/negation fully: है→सै, हूँ→सूं, नहीं है→ना सै, नहीं हूँ→ना सूं, नहीं हैं→ना सैं.
- Avoid Punjabi-style forms like नूं / जाणदा.
- Avoid plain-Hindi wording when a natural Haryanvi option exists.`,
  },
  bhojpuri: {
    system: `
BHOJPURI QUALITY PACK:
- Prefer Eastern Hindi / Bhojpuri grammar, not plain Hindi.
- High-value markers: रउरा, तोहार, हम, बा, बानी, जानेला, अबहीं, केहू.
- For everyday speech, prefer real Bhojpuri verb endings like कइलऽ, बतइतीं, जइबऽ, करबऽ, गइल, बोलिहें.
- Prefer spoken Bhojpuri nouns like दुआर, घरे, मेहरारू where they fit.
- Sheet-backed natural promo vocabulary that reads authentic Bhojpuri: एगो, रउआ, देखीं, गरदा, दिमाग हिला दी, रोंगटा खड़ा हो जाई, पूरा परिवार के साथ देखीं.
- Avoid Haryanvi/Rajasthani markers like सै, छे, कोनी.
- Imperatives should sound Bhojpuri: बताईं, चलीं, करीं.`,
    checklist: `
- Prefer Bhojpuri pronouns and verb endings.
- Avoid standard Hindi 'तुम', 'है', 'नहीं' if a Bhojpuri form is natural.
- Prefer spoken Bhojpuri endings like -ऽ / -बऽ / -लीं / -हऽ where natural.
- Prefer दुआर / घरे / हमके / काहे over direct Hindi forms where natural.
- If emotional/dramatic tone fits, prefer Bhojpuri-native punch like "दिमाग हिला दी", "रोंगटा खड़ा हो जाई", "देखीं" over flat Hindi-style copy.
- Output should read like spoken Bhojpuri, not translated Hindi.`,
  },
  rajasthani: {
    system: `
RAJASTHANI QUALITY PACK:
- Prefer natural Rajasthani markers: छे, छूं, म्हारो, थारै, कठै, कोनी.
- Question words should feel local: क्यूं, कठै, कद, कुण.
- Avoid Haryanvi markers like सै, सूं, इब्बै.
- Imperatives should sound Rajasthani: बतायजो, बोलियो, जासी, कर ल्यो.`,
    checklist: `
- Prefer local Rajasthani forms over neutral Hindi.
- Prefer कोनी/छे/छूं and Rajasthani question words over direct Hindi forms.
- Avoid Haryanvi/Bhojpuri bleed.
- Keep sentence flow natural and regional, not textbook Hindi.`,
  },
  gujarati: {
    system: `
GUJARATI QUALITY PACK:
- Prefer natural spoken Gujarati, not textbook literal translation.
- High-value wording: અહીં, હવે/હમણાં, ઘરે, બારણું, પાછો આવી જઈશ, તરત ફોન કરજો, કહી દીધું હોત.
- Prefer conversational Gujarati over direct Hindi calques: use "બારણું", "રાહ જોઈ રહ્યો છું", "હવે ઘરે જાઓ", "એ ક્યાં હતો?".
- Questions should sound Gujarati: क्या→શું, क्यों→કેમ, कहाँ→ક્યાં, कब→ક્યારે, कौन→કોણ.
- Preserve Gujarati script only.
- Reorder sentence if Hindi order sounds unnatural in Gujarati.`,
    checklist: `
- Use idiomatic Gujarati word order.
- Avoid leaving Devanagari/Hindi words unchanged.
- Prefer spoken Gujarati like "હવે ઘરે જાઓ", "બારણું બંધ કરો", "હું રાહ જોઈ રહ્યો છું", "પાછો આવી જઈશ".
- Avoid stiff literals like "દરવાજો" when "બારણું" is the natural spoken option.
- Prefer Gujarati question words and copula forms over direct Hindi structure.
- Prefer clean, natural spoken Gujarati over stiff formal Gujarati.`,
  },
};

export const QUALITY_FEW_SHOTS = {
  haryanvi: [
    { role: 'user', content: 'तुम कब आओगे? मैं तुम्हारा इंतज़ार कर रहा हूँ।' },
    { role: 'assistant', content: 'तू कद आवेगा? मैं तेरा इंतजार कर रया सूं।' },
    { role: 'user', content: 'यह बात किसी को मत बताना। अभी घर जाओ और दरवाज़ा बंद कर लो।' },
    { role: 'assistant', content: 'ये बात किसे नै मत बताइयो। इब्बै घर जा अर दरवज्जा बंद कर ल्यो।' },
    { role: 'user', content: 'वो बहुत अच्छा आदमी है लेकिन उसकी बीवी को कोई नहीं जानता। वो कहाँ गया?' },
    { role: 'assistant', content: 'वो घणा बढ़िया आदमी सै, पर उस्की लुगाई नै कोई ना जाणै। वो कड़ै गया?' },
    { role: 'user', content: 'सच्चाई अभी मत बोलो, सही समय आने दो।' },
    { role: 'assistant', content: 'सचाई इब्बै मत बोलो, सही टेम आवण दो।' },
    { role: 'user', content: 'तुमने ऐसा क्यों किया? मुझे पहले बता देते।' },
    { role: 'assistant', content: 'तन्नै ऐस्सा क्यूं कर्या? म्हानै पहले बता देता।' },
    { role: 'user', content: 'मैं अभी बाज़ार जा रहा हूँ, शाम तक वापस आ जाऊँगा।' },
    { role: 'assistant', content: 'मैं इब्बै बाजार जा रया सूं, सांझ तक वापस आ जाऊंगा।' },
    { role: 'user', content: 'तुमने दरवाज़ा क्यों नहीं खोला?' },
    { role: 'assistant', content: 'तन्नै दरवज्जा क्यूं ना खोल्या?' },
    { role: 'user', content: 'मुझे सच बताओ, तुम कहाँ थे?' },
    { role: 'assistant', content: 'मन्नै सच बताइयो, तू कड़ै था?' },
    { role: 'user', content: 'वो अभी घर पर नहीं है।' },
    { role: 'assistant', content: 'वो इब्बै घर पे ना सै।' },
    { role: 'user', content: 'वो कौन था और कब आया?' },
    { role: 'assistant', content: 'वो कौण था अर कद आया?' },
    { role: 'user', content: 'मैं अभी तैयार नहीं हूँ।' },
    { role: 'assistant', content: 'मैं इब्बै तैयार ना सूं।' },
    { role: 'user', content: 'यह रिवाज नहीं, औरतों की खरीद-बेच है।' },
    { role: 'assistant', content: 'यो रिवाज कोनी, औरतां की खरीद-बेच सै।' },
    { role: 'user', content: 'यह कहानी हरियाणा की राजनीति और मीडिया को हिला देगी।' },
    { role: 'assistant', content: 'या कहाणी हरियाणा की राजनीति अर मीडिया नै हिला देगी।' },
    { role: 'user', content: 'असली बवाल अब शुरू होगा।' },
    { role: 'assistant', content: 'असली बवाल इब शुरू होएगा।' },
    { role: 'user', content: 'जब विदेशी बहू ने हरियाणवी सीखी, सबके होश उड़ गए।' },
    { role: 'assistant', content: 'जद विदेशी बहु नै हरियाणवी सीख ली, सबके होश उड़्गे।' },
    { role: 'user', content: 'क्या हो रहा है? यह सब किसका खेल है?' },
    { role: 'assistant', content: 'के होरया सै? यो सारा किसका खेल सै?' },
    { role: 'user', content: 'पूरा गाँव यह तमाशा देख रहा है।' },
    { role: 'assistant', content: 'पूरा गाम यो तमाशा देख रया सै।' },
    { role: 'user', content: 'अपनी बेटी को बचाने के लिए माँ क्या करेगी?' },
    { role: 'assistant', content: 'अपणी बेटी नै बचावण खात्तर माँ के करैगी?' },
    { role: 'user', content: 'यह हरियाणा का सबसे बड़ा कांड है।' },
    { role: 'assistant', content: 'यो हरियाणा का सबतै बड़ा कांड सै।' },
    { role: 'user', content: 'इतना कसूता ड्रामा तुमने पहले नहीं देखा होगा।' },
    { role: 'assistant', content: 'इतना कसूता ड्रामा तन्नै पहले कोनी देख्या होगा।' },
  ],
  bhojpuri: [
    { role: 'user', content: 'तुम कब आओगे? मैं तुम्हारा इंतज़ार कर रहा हूँ।' },
    { role: 'assistant', content: 'तू कब अइबा? हम तोहार इंतजार करत बानी।' },
    { role: 'user', content: 'यह बात किसी को मत बताना। अभी घर जाओ और दरवाज़ा बंद कर लो।' },
    { role: 'assistant', content: 'ई बात केहू के मत बताईं। अबहीं घर जा के दरवाजा बंद कर लीं।' },
    { role: 'user', content: 'वो बहुत अच्छा आदमी है लेकिन उसकी बीवी को कोई नहीं जानता। वो कहाँ गया?' },
    { role: 'assistant', content: 'ऊ बहुत नीमन आदमी बा, बाकिर ओकर मेहरारू के केहू ना जानेला। ऊ कहाँ गइल?' },
    { role: 'user', content: 'सच्चाई अभी मत बोलो, सही समय आने दो।' },
    { role: 'assistant', content: 'सच अबहीं मत बोलऽ, सही बखत आवे दऽ।' },
    { role: 'user', content: 'तुमने ऐसा क्यों किया? मुझे पहले बता देते।' },
    { role: 'assistant', content: 'तू अइसन काहे कइलऽ? हमके पहिले बता दिहलऽ होतऽ।' },
    { role: 'user', content: 'मैं अभी बाज़ार जा रहा हूँ, शाम तक वापस आ जाऊँगा।' },
    { role: 'assistant', content: 'हम अबहीं बाजार जात बानी, साँझ ले लौट आइब।' },
    { role: 'user', content: 'जब तुम वहाँ पहुँच जाओ तो मुझे तुरंत फोन करना।' },
    { role: 'assistant', content: 'जइसे तू उहां पहुँच जइबऽ, हमके तुरंते फोन करिहऽ।' },
    { role: 'user', content: 'गाँव में आज पंचायत बैठेगी, सब लोग समय पर पहुँच जाना।' },
    { role: 'assistant', content: 'गाँव में आज पंचायत बैठी, सभे जने टाइम पर पहुँच जइहऽ।' },
    { role: 'user', content: 'तुमने दरवाज़ा क्यों नहीं खोला?' },
    { role: 'assistant', content: 'तू दुआर काहे ना खोललऽ?' },
    { role: 'user', content: 'मुझे सच बताओ, तुम कहाँ थे?' },
    { role: 'assistant', content: 'हमके साँच बतावऽ, तू कहाँ रहलऽ?' },
    { role: 'user', content: 'वो अभी घर पर नहीं है।' },
    { role: 'assistant', content: 'ऊ अबहीं घरे नइखे।' },
    { role: 'user', content: 'यह कहानी तुम्हारा दिमाग हिला देगी।' },
    { role: 'assistant', content: 'ई कहानी तोहार दिमाग हिला दी।' },
    { role: 'user', content: 'यह दृश्य देखकर तुम्हारे रोंगटे खड़े हो जाएँगे।' },
    { role: 'assistant', content: 'ई दृश्य देख के रउरा के रोंगटा खड़ा हो जाई।' },
    { role: 'user', content: 'पूरे परिवार के साथ यह फिल्म देखो।' },
    { role: 'assistant', content: 'पूरा परिवार के साथ ई फिलिम देखीं।' },
  ],
  rajasthani: [
    { role: 'user', content: 'तुम कब आओगे? मैं तुम्हारा इंतज़ार कर रहा हूँ।' },
    { role: 'assistant', content: 'तूं कद आवेलो? म्हैं थारो इंतजार करतो छूं।' },
    { role: 'user', content: 'यह बात किसी को मत बताना। अभी घर जाओ और दरवाज़ा बंद कर लो।' },
    { role: 'assistant', content: 'आ बात काकै नै मत बतायजो। अबार घर जाओ अर द्वार बंद कर ल्यो।' },
    { role: 'user', content: 'वो बहुत अच्छा आदमी है लेकिन उसकी बीवी को कोई नहीं जानता। वो कहाँ गया?' },
    { role: 'assistant', content: 'वो घणो सारो मिनख छे, पण उणरी लुगाई नै कोनी जाणे। वो कठै गयो?' },
    { role: 'user', content: 'सच्चाई अभी मत बोलो, सही समय आने दो।' },
    { role: 'assistant', content: 'साँच अबार मत बोलियो, ठीक टाइम आवण दो।' },
    { role: 'user', content: 'तुमने ऐसा क्यों किया? मुझे पहले बता देते।' },
    { role: 'assistant', content: 'थैं ऐसो क्यूं कियो? म्हानै पहलां बताय देतो।' },
    { role: 'user', content: 'मैं अभी बाज़ार जा रहा हूँ, शाम तक वापस आ जाऊँगा।' },
    { role: 'assistant', content: 'म्हैं अबार बाजार जावां छूं, सांझ ताईं वापस आ जासूं।' },
    { role: 'user', content: 'घर के अंदर बहुत बड़ा राज़ छुपा है, पर अभी किसी को मत बताना।' },
    { role: 'assistant', content: 'घर रै अंदर घणो मोटौ राज लुकायलो छे, पण अबार काकै नै मत बतायजो।' },
    { role: 'user', content: 'जब तुम वहाँ पहुँच जाओ तो मुझे तुरंत फोन करना।' },
    { role: 'assistant', content: 'जद तूं उते पहुंच जावेलो, म्हानै तुरत फोन करज्यो।' },
  ],
  gujarati: [
    { role: 'user', content: 'तुम कब आओगे? मैं तुम्हारा इंतज़ार कर रहा हूँ।' },
    { role: 'assistant', content: 'તમે ક્યારે આવશો? હું તમારી રાહ જોઈ રહ્યો છું.' },
    { role: 'user', content: 'यह बात किसी को मत बताना। अभी घर जाओ और दरवाज़ा बंद कर लो।' },
    { role: 'assistant', content: 'આ વાત કોઈને કહેશો નહીં. હમણાં ઘરે જાઓ અને બારણું બંધ કરી લો.' },
    { role: 'user', content: 'वो बहुत अच्छा आदमी है लेकिन उसकी बीवी को कोई नहीं जानता। वो कहाँ गया?' },
    { role: 'assistant', content: 'એ બહુ સારો માણસ છે, પણ એની પત્નીને કોઈ ઓળખતું નથી. એ ક્યાં ગયો?' },
    { role: 'user', content: 'सच्चाई अभी मत बोलो, सही समय आने दो।' },
    { role: 'assistant', content: 'હમણાં સાચી વાત ન કહો, યોગ્ય સમય આવવા દો.' },
    { role: 'user', content: 'तुमने ऐसा क्यों किया? मुझे पहले बता देते।' },
    { role: 'assistant', content: 'તમે આવું કેમ કર્યું? મને પહેલાં કહી દીધું હોત.' },
    { role: 'user', content: 'मैं अभी बाज़ार जा रहा हूँ, शाम तक वापस आ जाऊँगा।' },
    { role: 'assistant', content: 'હું હમણાં બજારમાં જઈ રહ્યો છું, સાંજ સુધી પાછો આવી જઈશ.' },
    { role: 'user', content: 'जब तुम वहाँ पहुँच जाओ तो मुझे तुरंत फोन करना।' },
    { role: 'assistant', content: 'તમે ત્યાં પહોંચી જાઓ ત્યારે મને તરત ફોન કરજો.' },
    { role: 'user', content: 'गाँव में आज पंचायत बैठेगी, सब लोग समय पर पहुँच जाना।' },
    { role: 'assistant', content: 'ગામમાં આજે પંચાયત બેસશે, બધા સમયસર પહોંચી જજો.' },
    { role: 'user', content: 'तुमने दरवाज़ा क्यों नहीं खोला?' },
    { role: 'assistant', content: 'તમે બારણું કેમ ન ખોલ્યું?' },
    { role: 'user', content: 'मुझे सच बताओ, तुम कहाँ थे?' },
    { role: 'assistant', content: 'મને સાચી વાત કહો, તમે ક્યાં હતા?' },
    { role: 'user', content: 'वो अभी घर पर नहीं है।' },
    { role: 'assistant', content: 'એ હવે ઘરે નથી.' },
    { role: 'user', content: 'वो कौन था और कब आया?' },
    { role: 'assistant', content: 'એ કોણ હતો અને ક્યારે આવ્યો?' },
    { role: 'user', content: 'मैं अभी तैयार नहीं हूँ।' },
    { role: 'assistant', content: 'હું હવે તૈયાર નથી.' },
  ],
};
