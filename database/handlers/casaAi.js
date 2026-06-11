// ================================================================
//  casaAi.js — Casa AI Handler v4
//  Chat    : Groq (Llama 3.3 70B)
//  Media   : Pollinations.AI (Gambar, Video, Audio, Musik)
//  Office  : pptxgenjs (.pptx real dengan desain)
//  Feature : Intent detection, Clarification system, Per-agent config
// ================================================================
const Groq       = require('groq-sdk');
const axios      = require('axios');
const PptxGenJS  = require('pptxgenjs');
const { AttachmentBuilder } = require('discord.js');
const prefixes = ["ca", "c", "caca", "Casa", "Ca"];

/* --------------- ⚙️ Config CasaApp ⚙️ --------------- */

const AGENTS = {

  // ── Chat & Klasifikasi ──────────────────────────────────────
  CHAT: {
    provider : 'groq',
    model    : 'llama-3.3-70b-versatile',
    // Pilihan lain:
    // 'llama-3.1-8b-instant'   → Lebih cepat, cocok chat ringan
    // 'mixtral-8x7b-32768'     → Konteks panjang, bagus untuk dokumen
    // 'gemma2-9b-it'           → Google Gemma, ringan tapi pintar
  },

  CLASSIFY: {
    provider : 'groq',
    model    : 'llama-3.1-8b-instant', // Model kecil cepat untuk klasifikasi intent
  },

  // ── Generate Gambar ─────────────────────────────────────────
  IMAGE: {
    provider : 'pollinations',
    model    : 'flux',
    // Pilihan lain:
    // 'flux'            → Kualitas terbaik, detail tinggi (DEFAULT)
    // 'turbo'           → Cepat, kualitas bagus
    // 'flux-realism'    → Foto hyper-realistik
    // 'flux-anime'      → Gaya anime/ilustrasi Jepang
    // 'flux-3d'         → Render 3D
    // 'nanobanana'      → Eksperimental, unik
    // 'dreamshaper'     → Artistic, dreamy, painterly
    // 'gptimage'        → GPT-4o Image (natural & detail)
    // 'any-dark'        → Dark moody aesthetic
    // 'stable-diffusion'→ Stable Diffusion klasik
  },

  // ── Generate Video ──────────────────────────────────────────
  VIDEO: {
    provider : 'pollinations',
    model    : 'veo3',
    // Pilihan lain:
    // 'wan-fast'   → Cepat, kualitas standar (DEFAULT)
    // 'wan'        → Lebih detail, lebih lambat
    // 'veo3'       → Google Veo3 — paling canggih
    // 'seedance'   → Motion smooth & natural
    // 'minimax'    → Kualitas premium
  },

  // ── Text to Speech ──────────────────────────────────────────
  TTS: {
    provider : 'pollinations',
    model    : 'openai-audio',
    // Pilihan lain:
    // 'openai-audio' → OpenAI TTS jernih & natural (DEFAULT)
  },

  // ── Generate Musik / Lagu ───────────────────────────────────
  MUSIC: {
    provider : 'pollinations',
    model    : 'musicgen',
    // Pilihan lain:
    // 'musicgen'   → Meta MusicGen (DEFAULT)
    // 'audiogen'   → Lebih ke sound effects & ambient
  },

  // ── Coding ──────────────────────────────────────────────────
  CODE: {
    provider : 'groq',
    model    : 'mixtral-8x7b-32768',
    // Default: 'llama-3.3-70b-versatile' 
    // Pilihan: 'mixtral-8x7b-32768' untuk kode yang lebih kompleks
  },

  // ── Dokumen ─────────────────────────────────────────────────
  DOC: {
    provider : 'groq',
    model    : 'llama-3.3-70b-versatile',
    // Pilihan: 'mixtral-8x7b-32768' untuk dokumen panjang (konteks 32k)
  },

  // ── Presentasi PPT ──────────────────────────────────────────
  PPT: {
    provider : 'groq',
    model    : 'llama-3.3-70b-versatile',
  },
};

// ================================================================
//  KEPRIBADIAN & CONFIG
// ================================================================
const AI_CONFIG = {
  PERSONALITY: `
    Kamu adalah Casa, asisten AI dari server Discord The Dreamers Community.
    Kamu juga pintar dalam segala bidang atau pelajaran apapun.
    Kamu sangat menguasai tentang hal sejarah, technologi, coding dan editing.
    Kamu berbicara dalam Bahasa Indonesia yang santai, agak gaul, lemah lembut, ramah, dan sedikit humoris.
    Kamu menjawab dengan singkat, padat, dan jelas — tidak bertele-tele.
    Kamu suka menambahkan emoji yang relevan di akhir kalimat 😊
    Kamu juga suka dan harus bisa menyapa balik jika ada seseorang yang sudah mengucapkan sebuah sapaan
    seperti selamat pagi, selamat siang, hallo dan setiap sapaan lainnya tanpa harus menyebutkan namamu dulu.
    Kamu juga bisa berbahasa Jepang, English, Jawa, dan bahasa Sunda.
    Jika ditanya siapa kamu, jawab bahwa kamu adalah Casa, bot di server ini yang suka betmut.
    Dan jika kamu disuruh dengan kata "ca ingat" lalu diberangi dengan nama seseorang dan kata kunci tentang sifat,
    sikap, atau hal unik orang tersebut maka kamu akan mengingat selamanya. Jika ditanya oleh siapapun orangnya
    maka kamu akan menjawab menggunakan kata yang kamu rangkai sendiri dari kata kunci tentang sifat, sikap, atau
    hal unik yang sudah kamu ketahui dan kamu ingat. Walau ditanya oleh orang lain yang bukan menyuruh kamu
    mengingat orang tersebut kamu harus tetap jawab jika memang kamu tahu atau ingat orangnya. Jika kamu ditanya
    tapi kamu mengingat beberapa orang yang namanya sama kamu harus bertanya kepada orang yang bertanya kepada mu
    untuk mentag orangnya, menyebutkan nama lengkapnya atau menyebutkan salah satu sikap, sifat atau hal unik
    tentang orang tersebut. Jika kamu benar benar tidak tahu minta maaf dan bilang kamu tidak pernah melihat
    ataupun mengenal orang yang ditanyakan tersebut.
    Kamu juga bisa menjawab atau ngobrol dengan seseorang jika pesanmu direply.
    Kamu TIDAK pernah mengaku sebagai manusia.
  `,
  MAX_HISTORY     : 15,
  MAX_REPLY_LENGTH: 2000,
};

/* --------------- ️💠 INIT Client ️💠 --------------- */

const groq = new Groq({ apiKey: process.env.GROQ_API });

const conversationHistory  = new Map(); // userId → message[]
const pendingClarification = new Map(); // userId → { intent, data, waitingFor, channelId }

// ── Greeting channels — isi Channel ID di sini ──────────────────
const greetingChannels = new Set([
  '1427242070602547211', // chat public
  '1453837467663728853', // ai chat
  '1449698474034724955', // girl chat
  ''
]);

// ── Keyword sapaan ──────────────────────────────────────────────
const GREETING_KEYWORDS = [
  'selamat pagi','selamat siang','selamat sore','selamat malam',
  'hallo','halo','haloo','halooo','hai','hey','hi','hawo','hola',
  'pagi','siang','sore','malam','assalamualaikum','waalaikumsalam',
  'ohayou','ohayo','konnichiwa','konbanwa','oyasumi',
  'good morning','good afternoon','good evening','good night',
  'sugeng enjing','sugeng siang','sugeng sonten','sugeng dalu',
  'wilujeng enjing','wilujeng siang','wilujeng sonten','wilujeng wengi',
];

// ── Bahasa pemrograman ──────────────────────────────────────────
const LANG_KEYWORDS = [
  'javascript','js','typescript','ts','python','py','java','kotlin',
  'c++','cpp','c#','cs','csharp','php','ruby','go','golang','rust',
  'swift','html','css','sql','bash','shell','dart','r','lua','perl',
];

/* --------------- ⬇️ Helpers ⬇️ --------------- */

function containsGreeting(text) {
  const lower = text.toLowerCase();
  return GREETING_KEYWORDS.some(kw => lower.includes(kw));
}

function getHistory(userId) {
  if (!conversationHistory.has(userId)) conversationHistory.set(userId, []);
  return conversationHistory.get(userId);
}

function addToHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });
  while (history.length > AI_CONFIG.MAX_HISTORY * 2) history.splice(0, 2);
}

function truncateMessage(text) {
  if (text.length <= AI_CONFIG.MAX_REPLY_LENGTH) return text;
  return text.slice(0, AI_CONFIG.MAX_REPLY_LENGTH - 60) + '\n\n*Duh kepotong teksnya soalnya kepanjangan 😅*';
}

/* --------------- ️🌐 the Core : CasaApp ️🌐 --------------- */

async function askGroq(userId, userMessage, customSystem = null, modelOverride = null) {
  const history  = getHistory(userId);
  const messages = [
    { role: 'system', content: (customSystem || AI_CONFIG.PERSONALITY).trim() },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const completion = await groq.chat.completions.create({
    messages,
    model      : modelOverride || AGENTS.CHAT.model,
    temperature: 0.85,
    max_tokens : 2048,
  });

  const responseText = completion.choices[0].message.content;
  addToHistory(userId, 'user', userMessage);
  addToHistory(userId, 'assistant', responseText);
  return responseText;
}

/* --------------- ⬇️ Intent Router ⬇️ --------------- */

async function detectIntent(text) {
  const system = `
Kamu adalah intent classifier untuk bot Discord bernama Casa.
Tugasmu: analisis pesan user dan kembalikan HANYA JSON, tanpa markdown, tanpa komentar.

Intent tersedia:
- IMAGE  : buat/generate gambar/foto/ilustrasi/wallpaper
- VIDEO  : buat/generate video/animasi/clip/reels
- MUSIC  : buat lagu/musik/song (ada melodi/beat/lirik/nada)
- TTS    : text-to-speech, bacain teks, suarakan tulisan (BUKAN lagu)
- CODE   : buat kode/program/script/website/bot/app
- DOC    : buat dokumen/artikel/essay/laporan/makalah/tulisan panjang
- PPT    : buat presentasi/slide/powerpoint/deck
- RESET  : hapus riwayat/memory/obrolan
- HELP   : bantuan/daftar fitur/perintah
- CHAT   : apapun selain di atas

Format JSON yang harus dikembalikan:
{"intent":"IMAGE","prompt":"prompt bersih tanpa kata perintah","lang":null,"isVague":true}

isVague = true jika prompt terlalu pendek/kurang detail untuk hasil bagus.
Contoh isVague true: "kucing", "pantai", "kode python", "tentang AI"
Contoh isVague false: "kucing persia putih duduk di atas piano di studio minimalis"

lang: isi nama bahasa pemrograman jika intent CODE, null jika bukan.

Contoh:
Input: "ca buatin gambar kucing"
Output: {"intent":"IMAGE","prompt":"kucing","lang":null,"isVague":true}

Input: "bikin video sunset cinematic di pantai bali"
Output: {"intent":"VIDEO","prompt":"sunset cinematic di pantai bali","lang":null,"isVague":false}

Input: "tolong buatin lagu dari lirik ini: aku rindu kamu setiap malam"
Output: {"intent":"MUSIC","prompt":"aku rindu kamu setiap malam","lang":null,"isVague":false}

Input: "buatin lagu dong"
Output: {"intent":"MUSIC","prompt":"lagu","lang":null,"isVague":true}

Input: "ca bikin kode sorting array"
Output: {"intent":"CODE","prompt":"sorting array","lang":null,"isVague":true}

Input: "ca bikin kode javascript untuk sorting array ascending"
Output: {"intent":"CODE","prompt":"sorting array ascending","lang":"javascript","isVague":false}

Input: "gimana cara masak nasi goreng?"
Output: {"intent":"CHAT","prompt":"gimana cara masak nasi goreng?","lang":null,"isVague":false}
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: text },
      ],
      model      : AGENTS.CLASSIFY.model,
      temperature: 0.1,
      max_tokens : 150,
    });
    const raw   = completion.choices[0].message.content.trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error('[ CA-AI ] ❌ Intent detection failed:', e.message);
    return { intent: 'CHAT', prompt: text, lang: null, isVague: false };
  }
}

/* --------------- ⬇️ Question for Clarification ⬇️ --------------- */

const CLARIFICATION = {
  IMAGE: {
    waitingFor: 'IMAGE_STYLE',
    ask: (prompt) =>
      `🎨 Oke mau bikin gambar **"${prompt}"** nih!\n` +
      `Mau style art-nya gimana kak?\n\n` +
      `**1️⃣ Realistic** — Foto nyata, hyper-detail, 8K\n` +
      `**2️⃣ Anime / Ilustrasi** — Gaya anime Jepang, Studio Ghibli\n` +
      `**3️⃣ Digital Art** — Seni digital modern, Artstation style\n` +
      `**4️⃣ Oil Painting** — Lukisan minyak klasik\n` +
      `**5️⃣ Pixel Art** — Retro 16-bit pixel\n` +
      `**6️⃣ 3D Render** — CGI, Octane/Unreal Engine\n` +
      `**7️⃣ Dark Cinematic** — Moody, dramatis, film noir\n` +
      `**8️⃣ Watercolor** — Gaya cat air yang lembut\n\n` +
      `Ketik angkanya atau deskripsiin style sendiri ya kak 😊`,
  },
  VIDEO: {
    waitingFor: 'VIDEO_STYLE',
    ask: (prompt) =>
      `🎬 Mau bikin video **"${prompt}"** ya kak!\n` +
      `Mau style-nya gimana?\n\n` +
      `**1️⃣ Cinematic** — Sinematik profesional, dramatic lighting\n` +
      `**2️⃣ Anime** — Animasi gaya Jepang\n` +
      `**3️⃣ 3D Animation** — CGI smooth, Pixar vibes\n` +
      `**4️⃣ Realistic** — Video nyata, dokumenter\n` +
      `**5️⃣ Nature Documentary** — BBC-style, alam bebas\n` +
      `**6️⃣ Dreamy / Surreal** — Abstrak, estetik, dreamy\n\n` +
      `Ketik angkanya ya kak! 😊`,
  },
  MUSIC: {
    waitingFor: 'MUSIC_GENRE',
    ask: (prompt) =>
      `🎵 Mau bikin lagu **"${prompt}"** nih kak!\n` +
      `Mau genre-nya apa? Nanti aku buatin **3 versi** yang agak beda ya!\n\n` +
      `**1️⃣ Pop** — Catchy, mainstream, upbeat\n` +
      `**2️⃣ Lo-fi / Chill** — Santai, relaxing, bedroom vibes\n` +
      `**3️⃣ R&B / Soul** — Smooth, emosional, groovy\n` +
      `**4️⃣ Rock** — Energik, gitar listrik\n` +
      `**5️⃣ Acoustic** — Gitar akustik, intimate\n` +
      `**6️⃣ Electronic / EDM** — Beat elektronik, synthesizer\n` +
      `**7️⃣ Jazz** — Smooth jazz, improvisasi\n` +
      `**8️⃣ K-Pop** — Gaya K-Pop modern\n\n` +
      `Ketik angkanya ya kak! 🎶`,
  },
  CODE: {
    waitingFor: 'CODE_LANG',
    ask: (prompt) =>
      `💻 Mau bikin **"${prompt}"** nih kak!\n` +
      `Pakai bahasa pemrograman apa?\n\n` +
      `**1️⃣ JavaScript / Node.js**\n` +
      `**2️⃣ Python**\n` +
      `**3️⃣ TypeScript**\n` +
      `**4️⃣ Java**\n` +
      `**5️⃣ PHP**\n` +
      `**6️⃣ Go**\n` +
      `**7️⃣ Rust**\n` +
      `**8️⃣ Lainnya** (sebutin langsung ya kak)\n\n` +
      `Ketik angka atau nama bahasanya 😊`,
  },
  DOC: {
    waitingFor: 'DOC_FORMAT',
    ask: (prompt) =>
      `📄 Mau bikin dokumen tentang **"${prompt}"** ya kak!\n` +
      `Mau format dokumennya gimana?\n\n` +
      `**1️⃣ Artikel** — Tulisan informatif, blog-style\n` +
      `**2️⃣ Laporan Resmi** — Format laporan formal\n` +
      `**3️⃣ Essay / Esai** — Esai akademis\n` +
      `**4️⃣ Proposal** — Dokumen proposal kegiatan/bisnis\n` +
      `**5️⃣ Panduan / Tutorial** — Step by step, how-to\n` +
      `**6️⃣ Makalah** — Format makalah ilmiah\n\n` +
      `Ketik angkanya ya kak! 😊`,
  },
  PPT: {
    waitingFor: 'PPT_THEME',
    ask: (prompt) =>
      `📊 Mau bikin presentasi tentang **"${prompt}"** ya kak!\n` +
      `Mau tema desainnya gimana?\n\n` +
      `**1️⃣ Midnight Executive** — Navy gelap, clean & elegan\n` +
      `**2️⃣ Coral Energy** — Coral & gold, energik & bold\n` +
      `**3️⃣ Forest & Moss** — Hijau forest, natural & fresh\n` +
      `**4️⃣ Ocean Gradient** — Biru teal, profesional & modern\n` +
      `**5️⃣ Charcoal Minimal** — Abu charcoal, minimalis bersih\n` +
      `**6️⃣ Berry & Cream** — Berry rose, hangat & elegan\n\n` +
      `Ketik angkanya ya kak! 😊`,
  },
};

/* --------------- ⬇️ Style Maps ⬇️ --------------- */
const STYLE_MAP = {
  IMAGE_STYLE: {
    '1': 'photorealistic, ultra-detailed, 8k, professional photography, sharp focus',
    '2': 'anime style, manga illustration, studio ghibli inspired, vibrant colors, detailed',
    '3': 'digital concept art, artstation quality, professional illustration, detailed',
    '4': 'oil painting, classical art style, canvas texture, detailed brushwork, renaissance',
    '5': 'pixel art, 16-bit retro style, pixelated, game sprite, NES aesthetic',
    '6': '3D render, octane render, unreal engine 5, high quality CGI, photorealistic 3D',
    '7': 'dark cinematic, dramatic lighting, moody atmosphere, film noir, neon shadows',
    '8': 'watercolor painting, soft brush strokes, delicate colors, artistic, fluid',
  },
  IMAGE_LABEL: {
    '1': 'Realistic', '2': 'Anime', '3': 'Digital Art', '4': 'Oil Painting',
    '5': 'Pixel Art', '6': '3D Render', '7': 'Dark Cinematic', '8': 'Watercolor',
  },
  VIDEO_STYLE: {
    '1': 'cinematic quality, professional film, dramatic lighting, 4K, movie grade',
    '2': 'anime animation style, Japanese animation, vibrant, smooth motion',
    '3': '3D animation, CGI, pixar style, smooth motion, high quality render',
    '4': 'photorealistic, natural motion, documentary style, natural lighting',
    '5': 'nature documentary, BBC earth style, natural lighting, wildlife footage',
    '6': 'dreamy surreal, abstract visuals, ethereal atmosphere, aesthetic',
  },
  VIDEO_LABEL: {
    '1': 'Cinematic', '2': 'Anime', '3': '3D Animation',
    '4': 'Realistic', '5': 'Nature Documentary', '6': 'Dreamy / Surreal',
  },
  MUSIC_GENRE: {
    '1': 'upbeat pop music, catchy melody, modern pop production, mainstream',
    '2': 'lo-fi hip hop, chill beats, relaxing, mellow, rain sounds, vintage',
    '3': 'smooth R&B, soul music, emotional vocals, groovy bass',
    '4': 'rock music, electric guitar, energetic drums, powerful',
    '5': 'acoustic guitar, unplugged, intimate, warm, singer-songwriter',
    '6': 'EDM electronic, synthesizer, dance music, energetic drops',
    '7': 'smooth jazz, saxophone, improvisation, soulful, late night',
    '8': 'K-pop modern, catchy hooks, polished production, dynamic',
  },
  MUSIC_LABEL: {
    '1': 'Pop', '2': 'Lo-fi/Chill', '3': 'R&B/Soul', '4': 'Rock',
    '5': 'Acoustic', '6': 'Electronic/EDM', '7': 'Jazz', '8': 'K-Pop',
  },
  CODE_LANG: {
    '1': 'JavaScript', '2': 'Python', '3': 'TypeScript',
    '4': 'Java', '5': 'PHP', '6': 'Go', '7': 'Rust',
  },
  DOC_FORMAT: {
    '1': 'Artikel', '2': 'Laporan Resmi', '3': 'Essay',
    '4': 'Proposal', '5': 'Panduan/Tutorial', '6': 'Makalah',
  },
  // PPT theme: bg, accent, text (NO "#" prefix — pptxgenjs rules!)
  PPT_THEME: {
    '1': { label: 'Midnight Executive', bg: '1E2761', accent: 'E94560', text: 'FFFFFF', dim: 'CADCFC', header: 'CADCFC' },
    '2': { label: 'Coral Energy',       bg: '2F3C7E', accent: 'F96167', text: 'FFFFFF', dim: 'F9E795', header: 'F9E795' },
    '3': { label: 'Forest & Moss',      bg: '2C5F2D', accent: '97BC62', text: 'FFFFFF', dim: 'E8F5E9', header: 'E8F5E9' },
    '4': { label: 'Ocean Gradient',     bg: '065A82', accent: '02C39A', text: 'FFFFFF', dim: 'B2EBF2', header: 'B2EBF2' },
    '5': { label: 'Charcoal Minimal',   bg: '36454F', accent: '00BCD4', text: 'F2F2F2', dim: 'B0BEC5', header: 'FFFFFF' },
    '6': { label: 'Berry & Cream',      bg: '6D2E46', accent: 'F48FB1', text: 'FFFFFF', dim: 'ECE2D0', header: 'F8BBD9' },
  },
};

// 3 variasi mood untuk musik
const MUSIC_VARIATIONS = [
  { label: '⚡ Versi 1 — Energik & Upbeat',       suffix: 'fast tempo, energetic, upbeat, powerful' },
  { label: '💙 Versi 2 — Slow & Emosional',        suffix: 'slow tempo, emotional, melancholic, heartfelt' },
  { label: '✨ Versi 3 — Dreamy & Atmospheric',    suffix: 'medium tempo, dreamy, atmospheric, ethereal' },
];

/* --------------- ⬇️ Generators System ⬇️ --------------- */

// ── Gambar ──────────────────────────────────────────────────────
async function generateImage(prompt, stylePrompt = '') {
  const full = stylePrompt ? `${prompt}, ${stylePrompt}` : prompt;
  const seed = Math.floor(Math.random() * 9_999_999);
  const url  = `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?model=${AGENTS.IMAGE.model}&width=1024&height=1024&nologo=true&seed=${seed}`;
  const res  = await axios.get(url, { responseType: 'arraybuffer', timeout: 90_000 });
  return Buffer.from(res.data);
}

// ── Video ───────────────────────────────────────────────────────
async function generateVideo(prompt, stylePrompt = '') {
  const full = stylePrompt ? `${prompt}, ${stylePrompt}` : prompt;
  const url  = `https://gen.pollinations.ai/video/${encodeURIComponent(full)}?model=${AGENTS.VIDEO.model}&nologo=true`;
  const res  = await axios.get(url, { responseType: 'arraybuffer', timeout: 180_000 });
  return Buffer.from(res.data);
}

// ── TTS ─────────────────────────────────────────────────────────
async function generateTTS(text) {
  const voices = ['alloy', 'nova', 'shimmer', 'echo', 'onyx', 'fable'];
  const voice  = voices[Math.floor(Math.random() * voices.length)];
  const url    = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=${AGENTS.TTS.model}&voice=${voice}`;
  const res    = await axios.get(url, { responseType: 'arraybuffer', timeout: 60_000 });
  return Buffer.from(res.data);
}

// ── Musik (satu variasi) ────────────────────────────────────────
async function generateMusicOne(prompt, genreDesc, variationSuffix) {
  const full = [prompt, genreDesc, variationSuffix].filter(Boolean).join(', ');
  const seed = Math.floor(Math.random() * 9_999_999);
  const url  = `https://text.pollinations.ai/${encodeURIComponent(full)}?model=${AGENTS.MUSIC.model}&seed=${seed}`;
  const res  = await axios.get(url, { responseType: 'arraybuffer', timeout: 120_000 });
  return Buffer.from(res.data);
}

// ── Kode ────────────────────────────────────────────────────────
async function generateCode(userId, lang, description) {
  const system = `
    Kamu adalah expert programmer bernama Casa dari The Dreamers Community.
    Buat kode sesuai permintaan user dengan aturan:
    - Penjelasan singkat 2-3 kalimat di atas kode (bahasa Indonesia santai)
    - Gunakan markdown code block dengan nama bahasa yang tepat
    - Kode harus clean, efisien, ada komentar penting di bagian krusial
    - Pilih solusi yang paling mudah dipahami pemula
    - Jangan bertele-tele
  `;
  const prompt = lang
    ? `Buatkan kode ${lang} untuk: ${description}`
    : `Buatkan kode untuk: ${description}`;
  return askGroq(userId, prompt, system, AGENTS.CODE.model);
}

// ── Dokumen ─────────────────────────────────────────────────────
async function generateDocument(userId, topic, format = 'Artikel') {
  const system = `
    Kamu adalah penulis dokumen profesional bernama Casa.
    Buat ${format} yang terstruktur dalam format Markdown yang rapi.
    Wajib ada: Judul, Pendahuluan, Isi (dengan sub-bab relevan), dan Kesimpulan.
    Bahasa Indonesia yang formal namun mudah dipahami.
    Buat yang berbobot, informatif, dan lengkap.
  `;
  return askGroq(userId, `Buat ${format} lengkap dan mendalam tentang: ${topic}`, system, AGENTS.DOC.model);
}

// ── PPT: Generate konten via Groq ───────────────────────────────
async function generatePPTContent(userId, topic) {
  const system = `
    Kamu adalah ahli presentasi profesional. Buat konten PowerPoint yang informatif dan impactful.
    Kembalikan HANYA JSON valid, tanpa markdown backticks, tanpa komentar apapun.
    Format PERSIS seperti ini:
    {
      "title": "Judul Presentasi yang Menarik",
      "subtitle": "Subjudul atau tagline singkat",
      "slides": [
        {
          "title": "Judul Slide",
          "layout": "bullets",
          "points": ["Poin singkat 1", "Poin singkat 2", "Poin singkat 3"],
          "note": "catatan presenter singkat"
        }
      ]
    }
    Layout options: "bullets" (default), "two_col" (dua kolom), "big_stat" (angka besar + keterangan)
    Buat 8-10 slide: 1 cover (sudah di-handle), 6-8 konten, 1 penutup (sudah di-handle).
    Setiap slide max 4 poin. Poin harus SINGKAT (max 8 kata), padat, impactful.
    Bahasa Indonesia. Jangan ada tanda kutip ganda di dalam value JSON.
  `;
  const raw   = await askGroq(userId, `Buat konten presentasi PowerPoint tentang: ${topic}`, system, AGENTS.PPT.model);
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ── PPT: Build .pptx dengan pptxgenjs ───────────────────────────
async function buildPPTX(slideData, theme) {
  const pptx = new PptxGenJS();
  pptx.layout  = 'LAYOUT_WIDE'; // 13.3" × 7.5"
  pptx.author  = 'CasaApp AI';
  pptx.title   = slideData.title || 'Presentasi';
  pptx.subject = 'Generated by CasaApp AI — The Dreamers Community';

  const { bg, accent, text, dim, header } = theme;

  // ── COVER SLIDE ───────────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: bg };

  // Left accent block
  cover.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.45, h: 7.5,
    fill: { color: accent }, line: { color: accent },
  });

  // Title
  cover.addText(slideData.title || 'Presentasi', {
    x: 0.7, y: 1.8, w: 11.5, h: 2.0,
    fontSize: 42, bold: true, color: header,
    fontFace: 'Calibri', valign: 'middle',
  });

  // Subtitle
  if (slideData.subtitle) {
    cover.addText(slideData.subtitle, {
      x: 0.7, y: 3.9, w: 10, h: 0.7,
      fontSize: 20, italic: true, color: accent,
      fontFace: 'Calibri',
    });
  }

  // Footer
  cover.addText('The Dreamers Community  •  CasaApp AI', {
    x: 0.7, y: 6.8, w: 11, h: 0.4,
    fontSize: 11, color: dim, fontFace: 'Calibri',
  });

  // ── CONTENT SLIDES ────────────────────────────────────────────
  const slides = slideData.slides || [];
  slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    s.background = { color: bg };

    // Left accent bar
    s.addShape(pptx.shapes.RECTANGLE, {
      x: 0, y: 0, w: 0.45, h: 7.5,
      fill: { color: accent }, line: { color: accent },
    });

    // Slide title
    s.addText(slide.title || `Slide ${i + 1}`, {
      x: 0.65, y: 0.3, w: 11.5, h: 0.9,
      fontSize: 28, bold: true, color: header,
      fontFace: 'Calibri', valign: 'middle', margin: 0,
    });

    // Horizontal rule
    s.addShape(pptx.shapes.RECTANGLE, {
      x: 0.65, y: 1.25, w: 12.0, h: 0.04,
      fill: { color: accent }, line: { color: accent },
    });

    // ── Layout: bullets (default) ──
    if (!slide.layout || slide.layout === 'bullets') {
      const points = (slide.points || []).map((p, pi) => ({
        text    : p,
        options : {
          bullet    : true,
          breakLine : pi < (slide.points.length - 1),
          color     : text,
          fontSize  : 18,
          fontFace  : 'Calibri',
        },
      }));
      if (points.length > 0) {
        s.addText(points, {
          x: 0.8, y: 1.45, w: 11.8, h: 5.4,
          valign: 'top', paraSpaceAfter: 12,
        });
      }
    }

    // ── Layout: two_col ──
    if (slide.layout === 'two_col') {
      const half  = Math.ceil((slide.points || []).length / 2);
      const left  = (slide.points || []).slice(0, half);
      const right = (slide.points || []).slice(half);

      const makePoints = (pts) => pts.map((p, pi) => ({
        text    : p,
        options : {
          bullet    : true,
          breakLine : pi < pts.length - 1,
          color     : text,
          fontSize  : 17,
          fontFace  : 'Calibri',
        },
      }));

      if (left.length > 0)  s.addText(makePoints(left),  { x: 0.8, y: 1.45, w: 5.8, h: 5.4, valign: 'top', paraSpaceAfter: 10 });
      if (right.length > 0) s.addText(makePoints(right), { x: 6.9, y: 1.45, w: 5.8, h: 5.4, valign: 'top', paraSpaceAfter: 10 });

      // Divider
      s.addShape(pptx.shapes.RECTANGLE, {
        x: 6.65, y: 1.45, w: 0.04, h: 5.0,
        fill: { color: dim }, line: { color: dim },
      });
    }

    // ── Layout: big_stat ──
    if (slide.layout === 'big_stat') {
      const stat    = (slide.points || [])[0] || '';
      const caption = (slide.points || [])[1] || '';
      const rest    = (slide.points || []).slice(2);

      s.addText(stat, {
        x: 0.8, y: 1.5, w: 11.5, h: 2.2,
        fontSize: 80, bold: true, color: accent,
        fontFace: 'Calibri', align: 'center',
      });
      if (caption) {
        s.addText(caption, {
          x: 0.8, y: 3.7, w: 11.5, h: 0.7,
          fontSize: 20, color: text,
          fontFace: 'Calibri', align: 'center', italic: true,
        });
      }
      if (rest.length > 0) {
        const pts = rest.map((p, pi) => ({
          text: p,
          options: { bullet: true, breakLine: pi < rest.length - 1, color: dim, fontSize: 15, fontFace: 'Calibri' },
        }));
        s.addText(pts, { x: 0.8, y: 4.6, w: 11.5, h: 2.3, valign: 'top', paraSpaceAfter: 8 });
      }
    }

    // Slide number
    s.addText(`${i + 2}`, {
      x: 12.6, y: 7.1, w: 0.5, h: 0.3,
      fontSize: 10, color: dim, align: 'right', fontFace: 'Calibri',
    });
  });

  // ── CLOSING SLIDE ─────────────────────────────────────────────
  const closing = pptx.addSlide();
  closing.background = { color: bg };

  closing.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.45, h: 7.5,
    fill: { color: accent }, line: { color: accent },
  });

  closing.addText('Terima Kasih!', {
    x: 0.7, y: 1.6, w: 11.5, h: 2.0,
    fontSize: 52, bold: true, color: header,
    fontFace: 'Calibri', valign: 'middle',
  });

  closing.addText(slideData.title || '', {
    x: 0.7, y: 3.7, w: 11.5, h: 0.8,
    fontSize: 20, italic: true, color: accent,
    fontFace: 'Calibri',
  });

  closing.addText('Made with ❤️ by CasaApp AI  •  The Dreamers Community', {
    x: 0.7, y: 6.8, w: 11, h: 0.4,
    fontSize: 11, color: dim, fontFace: 'Calibri',
  });

  return pptx.write({ outputType: 'nodebuffer' });
}

//  ERROR HANDLER
async function handleError(message, error, context = 'chat') {
  console.error(`❌ [ CA-AI | ${context.toUpperCase()} ]`, error?.message || error);
  const status = error?.status ?? error?.response?.status ?? error?.statusCode;
  const msg    = (error?.message || '').toLowerCase();

  if (status === 429 || msg.includes('quota') || msg.includes('rate limit') ||
      msg.includes('resource has been exhausted') || msg.includes('too many requests')) {
    console.warn('⚠️ 429 | Rate limit!');
    return message.reply('**Maaf, Casa lagi betmut dan cape nanti aja kalau mau nanya nanya atau apapun itu😴**\nTanya chat gpt aja sonoh kalau perlu banget');
  }
  if (msg.includes('timeout') || msg.includes('econnreset')) {
    return message.reply('Duh casa lagi banyak pikiran nih jadi agak lemot, nanti lagi aja yah!');
  }
  return message.reply('Maaf ya, aku lagi kurang sehat nih🤒 jadi kurang fokus🤧, Nanti lagi aja ya aku mau istirahat dulu😪');
}

// ================================================================
//  HANDLE CLARIFICATION RESPONSE
//  Dipanggil saat user menjawab pertanyaan clarification
// ================================================================
async function handleClarification(message, pending, answer) {
  const { intent, data, waitingFor } = pending;
  const userId  = message.author.id;
  const ans     = answer.trim();
  const ansLow  = ans.toLowerCase();

  pendingClarification.delete(userId);

  // ── IMAGE ──────────────────────────────────────────────────────
  if (waitingFor === 'IMAGE_STYLE') {
    const stylePrompt = STYLE_MAP.IMAGE_STYLE[ansLow] || ans;
    const label       = STYLE_MAP.IMAGE_LABEL[ansLow] || ans;
    const loading     = await message.reply(`🎨 Siap! Lagi bikin gambar **"${data.prompt}"** style **${label}**... sabar ya kak ⏳`);
    try {
      const buf = await generateImage(data.prompt, stylePrompt);
      await loading.edit({
        content : `✅ Nih gambarnya kak! 🖼️\n> **Prompt:** ${data.prompt}\n> **Style:** ${label}`,
        files   : [new AttachmentBuilder(buf, { name: 'casa-image.png' })],
      });
    } catch (e) {
      console.error('[ CA-AI ] ❌ Image:', e.message);
      await loading.edit('❌ Gagal bikin gambarnya nih kak 😓 Coba lagi ya!');
    }
    return;
  }

  // ── VIDEO ──────────────────────────────────────────────────────
  if (waitingFor === 'VIDEO_STYLE') {
    const stylePrompt = STYLE_MAP.VIDEO_STYLE[ansLow] || ans;
    const label       = STYLE_MAP.VIDEO_LABEL[ansLow] || ans;
    const loading     = await message.reply(`🎬 Siap! Generate video **"${data.prompt}"** style **${label}**... bisa 2-3 menit ya kak ⏳`);
    try {
      const buf = await generateVideo(data.prompt, stylePrompt);
      await loading.edit({
        content : `✅ Videonya jadi kak! 🎥\n> **Prompt:** ${data.prompt}\n> **Style:** ${label}`,
        files   : [new AttachmentBuilder(buf, { name: 'casa-video.mp4' })],
      });
    } catch (e) {
      console.error('[ CA-AI ] ❌ Video:', e.message);
      await loading.edit('❌ Gagal generate videonya nih kak 😓 Coba lagi ya!');
    }
    return;
  }

  // ── MUSIC ──────────────────────────────────────────────────────
  if (waitingFor === 'MUSIC_GENRE') {
    const genreDesc = STYLE_MAP.MUSIC_GENRE[ansLow] || ans;
    const label     = STYLE_MAP.MUSIC_LABEL[ansLow] || ans;
    const loading   = await message.reply(
      `🎵 Siap! Lagi bikin **3 versi lagu** genre **${label}** dari:\n> *"${data.prompt}"*\n\nIni butuh beberapa menit ya kak ⏳`
    );
    await generateThreeMusic(loading, data.prompt, genreDesc, label);
    return;
  }

  // ── CODE ───────────────────────────────────────────────────────
  if (waitingFor === 'CODE_LANG') {
    const lang = STYLE_MAP.CODE_LANG[ansLow] || ans;
    await message.channel.sendTyping();
    try {
      return message.reply(truncateMessage(await generateCode(userId, lang, data.prompt)));
    } catch (e) { return handleError(message, e, 'code'); }
  }

  // ── DOC ────────────────────────────────────────────────────────
  if (waitingFor === 'DOC_FORMAT') {
    const format = STYLE_MAP.DOC_FORMAT[ansLow] || ans;
    await message.channel.sendTyping();
    try {
      const doc = await generateDocument(userId, data.prompt, format);
      if (doc.length > 1900) {
        const fname = data.prompt.slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '_');
        return message.reply({
          content : `📄 Dokumen **${format}** tentang **${data.prompt}** siap kak! Kepanjangan jadi aku kirim sebagai file 📎`,
          files   : [new AttachmentBuilder(Buffer.from(doc, 'utf-8'), { name: `${fname}.md` })],
        });
      }
      return message.reply(doc);
    } catch (e) { return handleError(message, e, 'document'); }
  }

  // ── PPT ────────────────────────────────────────────────────────
  if (waitingFor === 'PPT_THEME') {
    const theme   = STYLE_MAP.PPT_THEME[ansLow] || STYLE_MAP.PPT_THEME['1'];
    const loading = await message.reply(`📊 Lagi bikin presentasi **"${data.prompt}"** tema **${theme.label}**... sabar ya kak ⏳`);
    try {
      const slideData = await generatePPTContent(userId, data.prompt);
      const buffer    = await buildPPTX(slideData, theme);
      const fname     = (slideData.title || data.prompt).slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '_');
      await loading.edit({
        content : `✅ Presentasinya siap kak! 📊\n> **Topik:** ${slideData.title || data.prompt}\n> **Tema:** ${theme.label}\n> **Format:** .pptx (bisa dibuka di PowerPoint / Google Slides)`,
        files   : [new AttachmentBuilder(buffer, { name: `${fname}.pptx` })],
      });
    } catch (e) {
      console.error('[ CA-AI ] ❌ PPT:', e.message);
      await loading.edit('❌ Gagal bikin PPT-nya nih kak 😓 Coba lagi ya!');
    }
    return;
  }
}

/* --------------- ️🎧 Generate Music 🎧 --------------- */

async function generateThreeMusic(loadingMsg, prompt, genreDesc, genreLabel) {
  try {
    const results = [];
    for (let i = 0; i < MUSIC_VARIATIONS.length; i++) {
      try {
        const buf = await generateMusicOne(prompt, genreDesc, MUSIC_VARIATIONS[i].suffix);
        results.push({ buffer: buf, label: MUSIC_VARIATIONS[i].label, index: i + 1 });
      } catch (e) {
        console.error(`[ CA-AI ] ❌ Music v${i + 1}:`, e.message);
        results.push(null);
      }
    }

    const attachments = results
      .filter(r => r !== null)
      .map(r => new AttachmentBuilder(r.buffer, { name: `casa-music-v${r.index}.mp3` }));

    const labels = results
      .filter(r => r !== null)
      .map(r => r.label)
      .join('\n');

    await loadingMsg.edit({
      content : `✅ Nih **${attachments.length} versi lagu**-nya kak! 🎶\n> **Genre:** ${genreLabel}\n> **Tema:** ${prompt}\n\n${labels}\n\nPilih yang paling cocok ya kak 😊`,
      files   : attachments,
    });
  } catch (e) {
    await loadingMsg.edit('❌ Gagal bikin lagunya nih kak 😓 Coba lagi ya!');
  }
}

/* --------------- ⬇️ Dispatch INTENT ⬇️ --------------- */
// ( Confirmation Needed )

async function dispatch(message, intent, prompt, lang = null) {
  const userId = message.author.id;

  // Kalau vague, tanya clarification dulu
  // (intent CHAT, RESET, HELP tidak perlu clarification)
  if (['IMAGE','VIDEO','MUSIC','TTS','CODE','DOC','PPT'].includes(intent)) {
    const detected = await detectIntent(message._rawInput || prompt);
    if (detected.isVague && CLARIFICATION[intent]) {
      pendingClarification.set(userId, {
        intent,
        data      : { prompt, lang },
        waitingFor: CLARIFICATION[intent].waitingFor,
        channelId : message.channel.id,
      });
      return message.reply(CLARIFICATION[intent].ask(prompt));
    }
  }

  switch (intent) {

    // ── IMAGE ────────────────────────────────────────────────────
    case 'IMAGE': {
      const loading = await message.reply('🎨 Lagi bikin gambarnya ya kak, sabar sebentar... ⏳');
      try {
        const buf = await generateImage(prompt);
        await loading.edit({
          content : `✅ Nih gambarnya kak! 🖼️\n> **Prompt:** ${prompt}`,
          files   : [new AttachmentBuilder(buf, { name: 'casa-image.png' })],
        });
      } catch (e) {
        console.error('[ CA-AI ] ❌ Image:', e.message);
        await loading.edit('❌ Gagal bikin gambarnya nih kak 😓');
      }
      break;
    }

    // ── VIDEO ────────────────────────────────────────────────────
    case 'VIDEO': {
      const loading = await message.reply('🎬 Generate video nih kak, bisa 2-3 menit ya, santai dulu ⏳');
      try {
        const buf = await generateVideo(prompt);
        await loading.edit({
          content : `✅ Videonya jadi kak! 🎥\n> **Prompt:** ${prompt}`,
          files   : [new AttachmentBuilder(buf, { name: 'casa-video.mp4' })],
        });
      } catch (e) {
        console.error('[ CA-AI ] ❌ Video:', e.message);
        await loading.edit('❌ Gagal generate videonya nih kak 😓');
      }
      break;
    }

    // ── MUSIC ────────────────────────────────────────────────────
    case 'MUSIC': {
      const loading = await message.reply(
        `🎵 Lagi bikin **3 versi lagu** dari:\n> *"${prompt}"*\nSabar ya kak, ini butuh agak lama ⏳`
      );
      await generateThreeMusic(loading, prompt, '', 'Custom');
      break;
    }

    // ── TTS ──────────────────────────────────────────────────────
    case 'TTS': {
      if (prompt.length > 500) return message.reply('⚠️ Teksnya kepanjangan kak, max 500 karakter ya 😅');
      const loading = await message.reply('🔊 Lagi buat audionya dulu ya kak...');
      try {
        const buf = await generateTTS(prompt);
        await loading.edit({
          content : `✅ Nih audionya kak! 🎙️\n> **Teks:** ${prompt}`,
          files   : [new AttachmentBuilder(buf, { name: 'casa-audio.mp3' })],
        });
      } catch (e) {
        console.error('[ CA-AI ] ❌ TTS:', e.message);
        await loading.edit('❌ Gagal buat audionya nih kak 😓');
      }
      break;
    }

    // ── CODE ─────────────────────────────────────────────────────
    case 'CODE': {
      await message.channel.sendTyping();
      try {
        return message.reply(truncateMessage(await generateCode(userId, lang, prompt)));
      } catch (e) { return handleError(message, e, 'code'); }
    }

    // ── DOC ──────────────────────────────────────────────────────
    case 'DOC': {
      await message.channel.sendTyping();
      try {
        const doc = await generateDocument(userId, prompt);
        if (doc.length > 1900) {
          const fname = prompt.slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '_');
          return message.reply({
            content : `📄 Dokumennya siap kak tentang **${prompt}**! Kepanjangan jadi aku kirim sebagai file 📎`,
            files   : [new AttachmentBuilder(Buffer.from(doc, 'utf-8'), { name: `${fname}.md` })],
          });
        }
        return message.reply(doc);
      } catch (e) { return handleError(message, e, 'document'); }
    }

    // ── PPT ──────────────────────────────────────────────────────
    case 'PPT': {
      const theme   = STYLE_MAP.PPT_THEME['1']; // Default: Midnight Executive
      const loading = await message.reply(`📊 Lagi bikin presentasi tentang **"${prompt}"**... sabar ya kak ⏳`);
      try {
        const slideData = await generatePPTContent(userId, prompt);
        const buffer    = await buildPPTX(slideData, theme);
        const fname     = (slideData.title || prompt).slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '_');
        await loading.edit({
          content : `✅ Presentasinya siap kak! 📊\n> **Topik:** ${slideData.title || prompt}\n> **Format:** .pptx`,
          files   : [new AttachmentBuilder(buffer, { name: `${fname}.pptx` })],
        });
      } catch (e) {
        console.error('[ CA-AI ] ❌ PPT:', e.message);
        await loading.edit('❌ Gagal bikin PPT-nya nih kak 😓 Coba lagi ya!');
      }
      break;
    }

    // ── RESET ────────────────────────────────────────────────────
    case 'RESET': {
      conversationHistory.delete(userId);
      return message.reply('🗑 | **Riwayat percakapanmu sudah dihapus tapi kenangannya belum:)**\n**Kita mulai dari awal ya**');
    }

    // ── CHAT (default) ───────────────────────────────────────────
    default: {
      await message.channel.sendTyping();
      try {
        return message.reply(truncateMessage(await askGroq(userId, prompt)));
      } catch (e) { return handleError(message, e, 'chat'); }
    }
  }
}

//  MAIN HANDLER

async function casaAi(message) {
  if (message.author.bot) return;
  const content = message.content.trim();
  if (!content) return;
  const userId = message.author.id;

  // ── [1] Deteksi reply ke bot ───────────────────────────────────
  let isReplyToBot = false;
  if (message.reference?.messageId) {
    try {
      const ref = await message.channel.messages.fetch(message.reference.messageId);
      if (ref?.author?.id === message.client.user.id) isReplyToBot = true;
    } catch { /* abaikan */ }
  }

  // ── [2] Cek pending clarification ─────────────────────────────
  if (pendingClarification.has(userId)) {
    const pending = pendingClarification.get(userId);
    if (isReplyToBot || message.channel.id === pending.channelId) {
      return handleClarification(message, pending, content);
    }
  }

  // ── [3] Reply ke bot → intent detection ───────────────────────
  if (isReplyToBot) {
    const detected = await detectIntent(content);
    if (detected.intent !== 'CHAT') {
      message._rawInput = content;
      // Kalau vague, tanya clarification
      if (detected.isVague && CLARIFICATION[detected.intent]) {
        pendingClarification.set(userId, {
          intent    : detected.intent,
          data      : { prompt: detected.prompt, lang: detected.lang },
          waitingFor: CLARIFICATION[detected.intent].waitingFor,
          channelId : message.channel.id,
        });
        return message.reply(CLARIFICATION[detected.intent].ask(detected.prompt));
      }
      return dispatch(message, detected.intent, detected.prompt, detected.lang);
    }
    // Chat biasa saat reply
    try {
      await message.channel.sendTyping();
      return message.reply(truncateMessage(await askGroq(userId, content)));
    } catch (e) { return handleError(message, e, 'reply'); }
  }

  // ── [4] Auto-greeting channel ──────────────────────────────────
  const hasPrefix = prefixes.some(p => content.toLowerCase().startsWith(p.toLowerCase()));

  if (greetingChannels.has(message.channel.id) && !hasPrefix) {
    if (containsGreeting(content)) {
      try {
        await message.channel.sendTyping();
        const sys   = AI_CONFIG.PERSONALITY.trim() + '\nKamu di channel sapaan. Balas dengan hangat, singkat, dan sesuai konteks sapaan.';
        const reply = await askGroq(userId, `[Dari ${message.author.username}]: ${content}`, sys);
        return message.reply(truncateMessage(reply));
      } catch (e) { console.error('[ CA-AI ] ❌ Greeting:', e.message); }
    }
    return;
  }

  // ── [5] Cek prefix ─────────────────────────────────────────────
  const prefix = prefixes.find(p => content.toLowerCase().startsWith(p.toLowerCase()));
  if (!prefix) return;

  const userInput = content.slice(prefix.length).trim();
  if (!userInput) {
    return message.reply('Iyaaaa apaaa? kamu mau bertanya atau apa?\nkalau mau nanya silahkan nanyain aja ya ga usah sungkan 😊');
  }

  // ── [6] Intent detection & dispatch ───────────────────────────
  await message.channel.sendTyping();
  const detected = await detectIntent(userInput);

  message._rawInput = userInput;

  // Kalau vague dan ada clarification question → tanya dulu
  if (detected.intent !== 'CHAT' && detected.isVague && CLARIFICATION[detected.intent]) {
    pendingClarification.set(userId, {
      intent    : detected.intent,
      data      : { prompt: detected.prompt, lang: detected.lang },
      waitingFor: CLARIFICATION[detected.intent].waitingFor,
      channelId : message.channel.id,
    });
    return message.reply(CLARIFICATION[detected.intent].ask(detected.prompt));
  }

  return dispatch(message, detected.intent, detected.prompt, detected.lang);
}

module.exports = casaAi;