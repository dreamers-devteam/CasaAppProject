const { ActivityType } = require('discord.js');

// ─── KONFIGURASI ─────────────────────────────────────────────
const STATUS_INTERVAL_MS = 10_000; // Ganti status setiap 10 detik
// ─────────────────────────────────────────────────────────────

/**
 *
 *  - state  : Teks yang muncul di bubble chat (bisa pakai emoji unicode)
 *  - status : 'online' | 'idle' | 'dnd' | 'invisible'
 * 
 **/
const STATUS_LIST = [
  { state: '😎 Casa Mode On Aktif',         status: 'idle' },
  { state: '😆 Casa Lagi GoodMood hehe',    status: 'idle' },
  { state: '😁 Managament Server Dreamers', status: 'idle' },
  { state: '✊ Letsgooo Dreamers!!',        status: 'idle' },
  { state: '😼 WeAreDreamers!',             status: 'idle' },
  { state: '😜 Dreamers Community nih Bos', status: 'idle' },
];

// ─────────────────────────────────────────────────────────────

function applyStatus(client, entry) {
  client.user.setPresence({
    status: entry.status,
    activities: [
      {
        type: ActivityType.Custom,
        name: 'custom',   // name wajib ada tapi tidak ditampilkan Discord
        state: entry.state,
      },
    ],
  });
}

/**
 * Mulai rotasi custom status otomatis.
 * Panggil di dalam event client.once('ready', ...) di index.js.
 *
 * @param {import('discord.js').Client} client
 * @returns {NodeJS.Timeout}
 */
function startMoodRotation(client) {
  if (!client?.user) {
    console.error('[Status] ✖ Client belum ready. Panggil di event "ready"!');
    return null;
  }

  let index = 0;
  applyStatus(client, STATUS_LIST[index]);

  const timer = setInterval(() => {
    index = (index + 1) % STATUS_LIST.length;
    applyStatus(client, STATUS_LIST[index]);
  }, STATUS_INTERVAL_MS);
  
  return timer;
}

module.exports = { startMoodRotation };