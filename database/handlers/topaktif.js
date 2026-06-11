/* 'use strict';

// ╔══════════════════════════════════════════════════════════════════╗
//  commands/leaderboard.js
//  🏆  Member of the Month — Leaderboard System
//
//  ✅  @napi-rs/canvas  (npm install @napi-rs/canvas)
//  ✅  Compatible dengan permissions.js kamu
//  ✅  Satu file — semua config & logic di sini
//
//  CARA INTEGRASI KE index.js:
//  ─────────────────────────────────────────────────
//  Jika prefix handler kamu load command dari folder:
//    → Cukup letakkan file ini di folder commands/
//    → Tidak perlu ubah apapun di index.js
//    → Voice tracking & chat tracking mulai otomatis
//      saat command pertama kali dipakai
//
//  OPSIONAL (direkomendasikan untuk tracking sejak bot ready):
//  ─────────────────────────────────────────────────
//    const lb = require('./commands/leaderboard');
//    client.once('ready', () => lb._setup(client));
//
//  STRUKTUR FOLDER YANG DIBUTUHKAN:
//  ─────────────────────────────────────────────────
//    root/
//    ├── commands/
//    │   └── leaderboard.js       ← file ini
//    ├── permissions.js           ← milik kamu
//    ├── assets/
//    │   └── banner_template.png  ← letakkan template di sini
//    └── data/
//        └── leaderboard.json     ← dibuat otomatis
// ╚══════════════════════════════════════════════════════════════════╝

// ── Dependencies ─────────────────────────────────────────────────────
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const hasPermission = require('../../permissions.js'); // ← sesuaikan path jika perlu
const fs   = require('fs');
const path = require('path');

// ── @napi-rs/canvas (graceful fallback jika belum diinstall) ─────────
let _createCanvas = null;
let _loadImage    = null;
try {
    const napi   = require('@napi-rs/canvas');
    _createCanvas = napi.createCanvas;
    _loadImage    = napi.loadImage;
} catch (_) {
    console.warn('[Leaderboard] ⚠  @napi-rs/canvas tidak ditemukan.');
    console.warn('[Leaderboard]    Jalankan: npm install @napi-rs/canvas');
    console.warn('[Leaderboard]    Fitur leaderboard tetap normal, hanya banner tidak akan digenerate.');
}

// ════════════════════════════════════════════════════════════════════
//  ⚙️  KONFIGURASI — EDIT SEMUA PENGATURAN DI SINI
// ════════════════════════════════════════════════════════════════════
const CONFIG = {

    // Prefix bot (harus sama dengan prefix handler kamu)
    prefix: 'ca ',

    // ── Permission untuk 'ca topmember monthly' ─────────────────────
    // [] kosong = otomatis pakai defaultAllowedRoles dari permissions.js
    // Isi jika ingin role khusus berbeda: ['ROLE_ID_1', 'ROLE_ID_2']
    allowedRoles: [],

    // ── Role reward untuk pemenang bulanan ──────────────────────────
    winnerRoleId: 'MASUKKAN_ROLE_ID_WINNER_DISINI',

    // Cabut role dari pemenang bulan lalu saat ada pemenang baru?
    removeOldWinnerRole: true,

    // ── Channel pengumuman pemenang (fallback) ──────────────────────
    // Dipakai jika pesan leaderboard sebelumnya sudah dihapus
    announceChannelId: 'MASUKKAN_CHANNEL_ID_ANNOUNCE_DISINI',

    // ── Sistem poin ─────────────────────────────────────────────────
    points: {
        perChat:        1,  // poin per pesan chat
        perVoiceMinute: 1,  // poin dasar per menit voice
                            // (dikali jumlah member eligible di channel)
    },

    // ── Banner ──────────────────────────────────────────────────────
    // Letakkan file PNG template di path ini (relatif dari root bot):
    banner: {
        templatePath: path.join(__dirname, '..', 'assets', 'banner_template.png'),
        outputPath:   path.join(__dirname, '..', 'assets', 'banner_output'),
        fontFamily:   'Arial',

        // Koordinat LINGKARAN foto profil di template:
        // x, y = titik tengah (px) | radius = jari-jari (px)
        // → Buka template di Photoshop/GIMP, hover ke area lingkaran,
        //   catat nilai X & Y di toolbar lalu masukkan di sini
        circle: {
            x:      728,
            y:      400,
            radius: 130,
        },

        // Koordinat & style TEKS yang ditimpa di atas template:
        // x, y = posisi teks | size = ukuran font | color = hex | bold = true/false
        text: {
            username: { x: 728, y: 598, size: 42, color: '#FFFFFF', bold: true  },
            subtitle:  { x: 728, y: 648, size: 30, color: '#FFFFFF', bold: true  },
            points:    { x: 728, y: 694, size: 28, color: '#FFFFFF', bold: true  },
        },
    },

    // ── Tampilan Embed Leaderboard (ca topmember monthly) ───────────
    embedLeaderboard: {
        color:     0xFFD700,                    // warna sidebar (gold)
        title:    '🏆 MEMBER OF THE MONTH',
        footer:   '⟳ Diperbarui setiap hari  •  🔄 Reset setiap awal bulan',
        thumbnail: '',                          // URL gambar kecil pojok kanan (kosongkan jika tidak perlu)
    },

    // ── Tampilan Embed Poin Personal (ca point) ─────────────────────
    embedPoint: {
        color:  0xFFD700,
        title: '📊 Statistik Poin Kamu',
        footer: 'Gang Desa — Leaderboard System',
    },

    // ── Tampilan Embed Pengumuman Pemenang (otomatis tiap awal bulan)
    // Variabel yang tersedia: {username}  {month}  {points}
    embedWinner: {
        color: 0xFFD700,
        title: '🎊 MEMBER OF THE MONTH',
        message: [
            '✨ Selamat kepada **{username}**! ✨',
            '',
            'Kamu menjadi **Member Teraktif** bulan **{month}**',
            'dengan total **{points} poin**! 🎉',
            '',
            'Terima kasih sudah menjadi bagian aktif dari komunitas ini!',
            'Tetap semangat dan pertahankan prestasimu! 💪🔥',
        ].join('\n'),
    },

    // ── Label ────────────────────────────────────────────────────────
    monthNames: [
        'JANUARI', 'FEBRUARI', 'MARET',     'APRIL',
        'MEI',     'JUNI',     'JULI',      'AGUSTUS',
        'SEPTEMBER','OKTOBER', 'NOVEMBER',  'DESEMBER',
    ],
    rankEmojis: ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'],
};

// ════════════════════════════════════════════════════════════════════
//  💾  DATABASE  (JSON File + In-Memory Cache)
// ════════════════════════════════════════════════════════════════════
const DB_FILE = path.join(__dirname, '..', 'data', 'leaderboard.json');
let   _db     = null;   // in-memory cache
let   _dirty  = false;  // ada perubahan belum tersimpan?

function _monthKey(d) {
    // Format: "YYYY-MM"
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function _dbDefault() {
    return {
        monthly:        {},     // { userId: { chatPoints, voicePoints, username, avatar } }
        lifetime:       {},     // sama seperti monthly, tidak pernah di-reset
        currentMonth:   _monthKey(new Date()),
        leaderboardMsg: null,   // { channelId, messageId } — pesan embed aktif
        history:        [],     // arsip { month, winner } tiap bulan
    };
}

function _dbLoad() {
    if (_db) return _db;
    try {
        if (fs.existsSync(DB_FILE)) {
            _db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        } else {
            const dir = path.dirname(DB_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            _db = _dbDefault();
            fs.writeFileSync(DB_FILE, JSON.stringify(_db, null, 2));
        }
    } catch (e) {
        console.error('[Leaderboard] DB load error:', e.message);
        _db = _dbDefault();
    }
    return _db;
}

function _dbFlush() {
    if (!_db) return;
    try {
        const dir = path.dirname(DB_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DB_FILE, JSON.stringify(_db, null, 2));
        _dirty = false;
    } catch (e) {
        console.error('[Leaderboard] DB save error:', e.message);
    }
}

// Auto-save ke disk tiap 30 detik jika ada perubahan
setInterval(() => { if (_dirty && _db) _dbFlush(); }, 30_000);

// Force-save saat proses dihentikan agar tidak ada data yang hilang
process.on('exit',    () => { if (_dirty && _db) _dbFlush(); });
process.on('SIGINT',  () => { if (_dirty && _db) _dbFlush(); process.exit(0); });
process.on('SIGTERM', () => { if (_dirty && _db) _dbFlush(); process.exit(0); });

// ── Pastikan entry user ada di store ─────────────────────────────────
function _ensureUser(store, userId, username, avatar) {
    if (!store[userId]) {
        store[userId] = { chatPoints: 0, voicePoints: 0, username: '', avatar: '' };
    }
    if (username) store[userId].username = username;
    if (avatar)   store[userId].avatar   = avatar;
}

// ── DB: Tambah poin ──────────────────────────────────────────────────
function dbAddPoints(userId, type, amount, username, avatar) {
    const db  = _dbLoad();
    const key = type === 'chat' ? 'chatPoints' : 'voicePoints';
    _ensureUser(db.monthly,  userId, username, avatar);
    _ensureUser(db.lifetime, userId, username, avatar);
    db.monthly[userId][key]  += amount;
    db.lifetime[userId][key] += amount;
    _dirty = true;
}

// ── DB: Ambil top N berdasarkan poin bulan ini ───────────────────────
function dbGetTopMonthly(limit = 10) {
    const db = _dbLoad();
    return Object.entries(db.monthly)
        .map(([userId, d]) => ({
            userId,
            username:    d.username    || 'Unknown',
            avatar:      d.avatar      || '',
            chatPoints:  d.chatPoints  || 0,
            voicePoints: d.voicePoints || 0,
            totalPoints: (d.chatPoints || 0) + (d.voicePoints || 0),
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, limit);
}

// ── DB: Statistik lengkap satu user + peringkat ──────────────────────
function dbGetUserStats(userId) {
    const db = _dbLoad();
    const m  = db.monthly[userId]  || {};
    const l  = db.lifetime[userId] || {};

    // Hitung peringkat monthly
    const mList = Object.entries(db.monthly)
        .map(([id, d]) => ({ id, total: (d.chatPoints || 0) + (d.voicePoints || 0) }))
        .sort((a, b) => b.total - a.total);

    // Hitung peringkat lifetime
    const lList = Object.entries(db.lifetime)
        .map(([id, d]) => ({ id, total: (d.chatPoints || 0) + (d.voicePoints || 0) }))
        .sort((a, b) => b.total - a.total);

    const mIdx = mList.findIndex(x => x.id === userId);
    const lIdx = lList.findIndex(x => x.id === userId);

    return {
        monthly: {
            chatPoints:  m.chatPoints  || 0,
            voicePoints: m.voicePoints || 0,
            total:       (m.chatPoints || 0) + (m.voicePoints || 0),
            rank:        mIdx >= 0 ? mIdx + 1 : null,
        },
        lifetime: {
            chatPoints:  l.chatPoints  || 0,
            voicePoints: l.voicePoints || 0,
            total:       (l.chatPoints || 0) + (l.voicePoints || 0),
            rank:        lIdx >= 0 ? lIdx + 1 : null,
        },
    };
}

// ── DB: Reset bulanan ────────────────────────────────────────────────
function dbResetMonthly() {
    const db = _dbLoad();

    // Ambil info bulan yang baru saja selesai dari currentMonth (format "YYYY-MM")
    // SEBELUM db.currentMonth diubah
    const [storedYear, storedMonthNum] = db.currentMonth.split('-').map(Number);
    const prevMonthIdx = storedMonthNum - 1;   // 1-indexed → 0-indexed untuk CONFIG.monthNames
    const prevYear     = storedYear;

    // Simpan pemenang ke history
    const top    = dbGetTopMonthly(1);
    const winner = top[0] || null;

    if (winner) {
        db.history.push({
            month: db.currentMonth,
            winner: {
                userId:      winner.userId,
                username:    winner.username,
                avatar:      winner.avatar,
                totalPoints: winner.totalPoints,
                chatPoints:  winner.chatPoints,
                voicePoints: winner.voicePoints,
            },
        });
    }

    // Reset data monthly, lifetime TIDAK ikut di-reset
    db.monthly      = {};
    db.currentMonth = _monthKey(new Date());
    _dirty = true;
    _dbFlush(); // force-save langsung saat reset

    return { winner, prevMonthIdx, prevYear };
}

function dbGetCurrentMonth()          { return _dbLoad().currentMonth; }
function dbGetLeaderboardMsg()        { return _dbLoad().leaderboardMsg; }
function dbClearLeaderboardMsg()      { _dbLoad().leaderboardMsg = null; _dirty = true; _dbFlush(); }
function dbSetLeaderboardMsg(chId, msgId) {
    _dbLoad().leaderboardMsg = { channelId: chId, messageId: msgId };
    _dirty = true;
    _dbFlush();
}
function dbGetPreviousWinner() {
    const h = _dbLoad().history;
    return (h && h.length >= 2) ? (h[h.length - 2]?.winner || null) : null;
}

// ════════════════════════════════════════════════════════════════════
//  🖼️  BANNER GENERATOR  (@napi-rs/canvas)
// ════════════════════════════════════════════════════════════════════
async function generateBanner(username, totalPoints, monthName, avatarUrl) {
    if (!_createCanvas || !_loadImage) return null;

    const bc = CONFIG.banner;

    try {
        // Pastikan folder output ada
        if (!fs.existsSync(bc.outputPath))
            fs.mkdirSync(bc.outputPath, { recursive: true });

        // Cek keberadaan template
        if (!fs.existsSync(bc.templatePath)) {
            console.error('[Banner] Template tidak ditemukan:', bc.templatePath);
            console.error('[Banner] Letakkan banner_template.png di folder assets/');
            return null;
        }

        // Load template dari file (Buffer) — paling kompatibel dengan @napi-rs/canvas
        const templateBuf = fs.readFileSync(bc.templatePath);
        const template    = await _loadImage(templateBuf);
        const canvas      = _createCanvas(template.width, template.height);
        const ctx         = canvas.getContext('2d');

        // ── Gambar template sebagai latar ──────────────────────────
        ctx.drawImage(template, 0, 0);

        // ── Gambar foto profil dalam lingkaran ─────────────────────
        const { x: cx, y: cy, radius: r } = bc.circle;

        try {
            // @napi-rs/canvas mendukung load langsung dari URL
            const avUrl  = avatarUrl.includes('?') ? `${avatarUrl}&size=256` : `${avatarUrl}?size=256`;
            const avatar = await _loadImage(avUrl);

            // Clip ke bentuk lingkaran
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, cx - r, cy - r, r * 2, r * 2);
            ctx.restore();

            // Border emas di luar lingkaran
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
            ctx.lineWidth   = 5;
            ctx.stroke();
            ctx.restore();

        } catch (_avatarErr) {
            // Fallback: lingkaran abu-abu jika avatar gagal di-load
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(80, 80, 80, 0.7)';
            ctx.fill();
            ctx.restore();
        }

        // ── Helper: gambar teks dengan shadow ──────────────────────
        function drawText(text, cfg) {
            ctx.save();
            ctx.font         = `${cfg.bold ? 'bold ' : ''}${cfg.size}px "${bc.fontFamily}", Arial, sans-serif`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor  = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur   = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle    = cfg.color;
            ctx.fillText(text, cfg.x, cfg.y);
            ctx.restore();
        }

        // ── Teks overlay ───────────────────────────────────────────
        drawText(username,                               bc.text.username);
        drawText(`TOP CHAT BULAN ${monthName}`,          bc.text.subtitle);
        drawText(`Total Poin: ${fmtNum(totalPoints)}`,   bc.text.points);

        // ── Simpan & kembalikan path ────────────────────────────────
        const outFile = path.join(bc.outputPath, `winner_${Date.now()}.png`);
        fs.writeFileSync(outFile, canvas.toBuffer('image/png'));
        return outFile;

    } catch (e) {
        console.error('[Banner] Generate error:', e.message);
        return null;
    }
}

// ════════════════════════════════════════════════════════════════════
//  🎙️  VOICE TRACKING
// ════════════════════════════════════════════════════════════════════
const activeSessions = new Map(); // userId → { channelId, guildId }

function _isEligible(voiceState) {
    // Member dihitung hanya jika tidak self-mute, tidak self-deaf,
    // tidak server-mute, dan tidak server-deaf
    return (
        voiceState &&
        !voiceState.selfMute   &&
        !voiceState.selfDeaf   &&
        !voiceState.serverMute &&
        !voiceState.serverDeaf
    );
}

function _onVoiceUpdate(oldState, newState) {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const uid   = member.id;
    const wasIn = !!oldState.channelId;
    const isIn  = !!newState.channelId;

    if (!isIn) {
        // Keluar dari semua voice channel
        activeSessions.delete(uid);
    } else if (!wasIn) {
        // Baru masuk voice channel
        if (_isEligible(newState)) {
            activeSessions.set(uid, { channelId: newState.channelId, guildId: newState.guild.id });
        }
    } else {
        // Di dalam voice tapi ada perubahan state (mute/unmute/pindah channel)
        if (_isEligible(newState)) {
            activeSessions.set(uid, { channelId: newState.channelId, guildId: newState.guild.id });
        } else {
            activeSessions.delete(uid);
        }
    }
}

async function _tickVoice(client) {
    for (const [uid, sess] of activeSessions.entries()) {
        try {
            const guild = client.guilds.cache.get(sess.guildId);
            if (!guild) { activeSessions.delete(uid); continue; }

            const vc = guild.channels.cache.get(sess.channelId);
            if (!vc)  { activeSessions.delete(uid); continue; }

            const member = guild.members.cache.get(uid);
            if (!member?.voice?.channelId) { activeSessions.delete(uid); continue; }
            if (!_isEligible(member.voice)) { activeSessions.delete(uid); continue; }

            // Hitung member eligible di channel sebagai multiplier poin
            const eligibleCount = vc.members.filter(m =>
                !m.user.bot && _isEligible(m.voice)
            ).size;

            const pts = CONFIG.points.perVoiceMinute * Math.max(eligibleCount, 1);

            dbAddPoints(
                uid, 'voice', pts,
                member.user.username,
                member.user.displayAvatarURL({ forceStatic: true })
            );
        } catch (e) {
            console.error(`[Leaderboard] Voice tick error (${uid}):`, e.message);
        }
    }
}

// Scan voice channels yang sudah aktif saat bot baru ready
function _scanVoice(client) {
    let n = 0;
    for (const guild of client.guilds.cache.values()) {
        for (const ch of guild.channels.cache.values()) {
            if (!ch.isVoiceBased?.()) continue;
            for (const [, m] of ch.members) {
                if (m.user.bot) continue;
                if (_isEligible(m.voice)) {
                    activeSessions.set(m.id, { channelId: ch.id, guildId: guild.id });
                    n++;
                }
            }
        }
    }
    if (n > 0) console.log(`[Leaderboard] Voice scan: ${n} member aktif ditemukan.`);
}

// ════════════════════════════════════════════════════════════════════
//  🔄  LEADERBOARD MESSAGE UPDATE
// ════════════════════════════════════════════════════════════════════
async function _updateLeaderboardMsg(client) {
    const ref = dbGetLeaderboardMsg();
    if (!ref) return;

    try {
        const ch = await client.channels.fetch(ref.channelId).catch(() => null);
        if (!ch) { dbClearLeaderboardMsg(); return; }

        const msg = await ch.messages.fetch(ref.messageId).catch(() => null);
        if (!msg) { dbClearLeaderboardMsg(); return; }

        await msg.edit({ embeds: [_buildLeaderboardEmbed(dbGetTopMonthly(10))] });
    } catch (e) {
        console.error('[Leaderboard] Update pesan embed error:', e.message);
        dbClearLeaderboardMsg();
    }
}

// ════════════════════════════════════════════════════════════════════
//  🎉  RESET BULANAN + PENGUMUMAN PEMENANG
// ════════════════════════════════════════════════════════════════════
async function _doReset(client) {
    console.log('[Leaderboard] ══ Menjalankan reset bulanan ══');

    const { winner, prevMonthIdx, prevYear } = dbResetMonthly();
    const prevMonth = CONFIG.monthNames[prevMonthIdx];

    // Perbarui tampilan leaderboard (mulai bulan baru yang kosong)
    await _updateLeaderboardMsg(client).catch(() => {});

    if (!winner) {
        console.log('[Leaderboard] Tidak ada pemenang bulan ini.');
        return;
    }

    // Tentukan channel pengumuman
    const ref  = dbGetLeaderboardMsg();
    const chId = ref?.channelId || CONFIG.announceChannelId;

    let ch = null;
    try { ch = await client.channels.fetch(chId); } catch (_) {}

    if (!ch) {
        console.error('[Leaderboard] Channel pengumuman tidak ditemukan! Periksa announceChannelId di CONFIG.');
        return;
    }

    // Generate banner pemenang
    const bannerFile = await generateBanner(
        winner.username, winner.totalPoints, prevMonth, winner.avatar
    );

    // Build embed pengumuman
    const msgText = CONFIG.embedWinner.message
        .replace(/{username}/g, winner.username)
        .replace(/{month}/g,    `${prevMonth} ${prevYear}`)
        .replace(/{points}/g,   fmtNum(winner.totalPoints));

    const winEmbed = new EmbedBuilder()
        .setColor(CONFIG.embedWinner.color)
        .setTitle(CONFIG.embedWinner.title)
        .setDescription(msgText)
        .addFields(
            { name: '💬 Chat Points',  value: fmtNum(winner.chatPoints),  inline: true },
            { name: '🎙️ Voice Points', value: fmtNum(winner.voicePoints), inline: true },
            { name: '⭐ Total Points',  value: fmtNum(winner.totalPoints), inline: true },
        )
        .setTimestamp();

    const sendOpt = { embeds: [winEmbed] };

    if (bannerFile) {
        const att = new AttachmentBuilder(bannerFile, { name: 'winner.png' });
        winEmbed.setImage('attachment://winner.png');
        sendOpt.files = [att];
    }

    await ch.send(sendOpt).catch(e =>
        console.error('[Leaderboard] Kirim pengumuman error:', e.message)
    );

    // ── Beri / cabut role winner ──────────────────────────────────────
    if (CONFIG.winnerRoleId && CONFIG.winnerRoleId !== 'MASUKKAN_ROLE_ID_WINNER_DISINI') {
        try {
            const guild = ch.guild;

            // Cabut dari pemenang lama jika berbeda orang
            if (CONFIG.removeOldWinnerRole) {
                const prev = dbGetPreviousWinner();
                if (prev && prev.userId !== winner.userId) {
                    const prevM = await guild.members.fetch(prev.userId).catch(() => null);
                    if (prevM) {
                        await prevM.roles.remove(CONFIG.winnerRoleId).catch(() => {});
                        console.log(`[Leaderboard] Role dicabut dari: ${prev.username}`);
                    }
                }
            }

            // Beri ke pemenang baru
            const winM = await guild.members.fetch(winner.userId).catch(() => null);
            if (winM) {
                await winM.roles.add(CONFIG.winnerRoleId);
                console.log(`[Leaderboard] Role diberikan ke: ${winner.username}`);
            }
        } catch (e) {
            console.error('[Leaderboard] Role error:', e.message);
        }
    }

    console.log(
        `[Leaderboard] ✅ Reset selesai. Pemenang: ${winner.username} — ${fmtNum(winner.totalPoints)} poin`
    );
}

async function _checkReset(client) {
    if (_monthKey(new Date()) !== dbGetCurrentMonth()) {
        await _doReset(client).catch(e =>
            console.error('[Leaderboard] checkReset error:', e.message)
        );
    }
}

// ════════════════════════════════════════════════════════════════════
//  📋  EMBED BUILDERS
// ════════════════════════════════════════════════════════════════════
function fmtNum(n) {
    return Number(n || 0).toLocaleString('id-ID');
}

function _buildLeaderboardEmbed(top10) {
    const now    = new Date();
    const label  = `${CONFIG.monthNames[now.getMonth()]} ${now.getFullYear()}`;
    const nextMs = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

    let desc  = `📅 **Periode: ${label}**\n`;
        desc += `🔄 Reset: <t:${Math.floor(nextMs / 1000)}:R>\n\n`;

    if (top10.length === 0) {
        desc += '*Belum ada data. Mulai ngobrol dan join voice channel untuk dapat poin!*';
    } else {
        top10.forEach((m, i) => {
            const emoji = CONFIG.rankEmojis[i] ?? `${i + 1}.`;
            desc += `${emoji} **${m.username}**\n`;
            desc += `┣ 💬 Chat: **${fmtNum(m.chatPoints)}**  🎙️ Voice: **${fmtNum(m.voicePoints)}**\n`;
            desc += `┗ ⭐ Total: **${fmtNum(m.totalPoints)} poin**\n\n`;
        });
    }

    const embed = new EmbedBuilder()
        .setColor(CONFIG.embedLeaderboard.color)
        .setTitle(`${CONFIG.embedLeaderboard.title} — ${label}`)
        .setDescription(desc)
        .setFooter({ text: CONFIG.embedLeaderboard.footer })
        .setTimestamp();

    if (CONFIG.embedLeaderboard.thumbnail)
        embed.setThumbnail(CONFIG.embedLeaderboard.thumbnail);

    return embed;
}

// ════════════════════════════════════════════════════════════════════
//  🚀  INIT  (Lazy — otomatis saat command pertama digunakan)
// ════════════════════════════════════════════════════════════════════
let _initialized = false;

function _setup(client) {
    if (_initialized) return;
    _initialized = true;

    _dbLoad(); // pastikan DB ter-load ke cache
    _scanVoice(client);
    _checkReset(client).catch(() => {});

    // ── Register events ──────────────────────────────────────────────
    client.on('voiceStateUpdate', (oldState, newState) =>
        _onVoiceUpdate(oldState, newState)
    );

    // Track chat poin untuk semua pesan NON-command
    // (pesan command ditambahkan poinnya langsung di dalam execute())
    client.on('messageCreate', msg => {
        if (msg.author.bot || !msg.guild) return;
        const content = msg.content.trim().toLowerCase();
        if (content.startsWith(CONFIG.prefix.toLowerCase())) return; // skip command message
        dbAddPoints(
            msg.author.id, 'chat', CONFIG.points.perChat,
            msg.author.username,
            msg.author.displayAvatarURL({ forceStatic: true })
        );
    });

    // ── Interval tasks ───────────────────────────────────────────────
    setInterval(
        () => _tickVoice(client).catch(console.error),
        60_000               // voice poin setiap 1 menit
    );
    setInterval(
        () => _checkReset(client).catch(console.error),
        3_600_000            // cek reset setiap 1 jam
    );
    setInterval(
        () => _updateLeaderboardMsg(client).catch(console.error),
        86_400_000           // update embed leaderboard setiap 24 jam
    );

    // Update embed 5 detik setelah init (beri waktu bot fully cache)
    setTimeout(() => _updateLeaderboardMsg(client).catch(() => {}), 5_000);

    console.log('[Leaderboard] ✅ Sistem aktif!');
    console.log(`[Leaderboard]    Prefix  : "${CONFIG.prefix}"`);
    console.log(`[Leaderboard]    Command : ${CONFIG.prefix}topmember monthly  |  ${CONFIG.prefix}point`);
}

// ════════════════════════════════════════════════════════════════════
//  📝  COMMAND HANDLERS
// ════════════════════════════════════════════════════════════════════

// ── ca topmember monthly ─────────────────────────────────────────────
async function _cmdTopMember(message, client) {
    // Gunakan hasPermission dari permissions.js milik kamu
    // - allowedUsers: [] → pakai defaultAllowedUsers dari permissions.js
    // - allowedRoles: CONFIG.allowedRoles → [] berarti pakai defaultAllowedRoles
    if (!hasPermission(message, [], CONFIG.allowedRoles)) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF4444)
                    .setDescription('❌ Kamu tidak memiliki izin untuk menggunakan command ini.'),
            ],
        }).catch(() => {});
    }

    const top10 = dbGetTopMonthly(10);
    const embed = _buildLeaderboardEmbed(top10);

    // Jika sudah ada pesan leaderboard aktif → langsung edit
    const ref = dbGetLeaderboardMsg();
    if (ref) {
        try {
            const ch  = await client.channels.fetch(ref.channelId).catch(() => null);
            const msg = await ch?.messages.fetch(ref.messageId).catch(() => null);
            if (msg) {
                await msg.edit({ embeds: [embed] });
                return message.reply('✅ Leaderboard sudah diperbarui!').catch(() => {});
            }
        } catch (_) {}
        // Jika gagal fetch (pesan dihapus) → lanjut kirim baru
        dbClearLeaderboardMsg();
    }

    // Kirim pesan leaderboard baru
    const sent = await message.channel.send({ embeds: [embed] });
    dbSetLeaderboardMsg(message.channel.id, sent.id);

    // Hapus pesan command biar channel tetap bersih
    // (comment baris ini jika tidak ingin pesan command dihapus)
    message.delete().catch(() => {});
}

// ── ca point ─────────────────────────────────────────────────────────
async function _cmdPoint(message) {
    const stats = dbGetUserStats(message.author.id);
    const now   = new Date();
    const month = `${CONFIG.monthNames[now.getMonth()]} ${now.getFullYear()}`;
    const mRank = stats.monthly.rank  != null ? `#${stats.monthly.rank}`  : '—';
    const lRank = stats.lifetime.rank != null ? `#${stats.lifetime.rank}` : '—';

    const embed = new EmbedBuilder()
        .setColor(CONFIG.embedPoint.color)
        .setTitle(CONFIG.embedPoint.title)
        .setAuthor({
            name:    message.author.username,
            iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .addFields(
            {
                name: `📅 Bulan Ini — ${month}`,
                value: [
                    `💬 Chat Points       : **${fmtNum(stats.monthly.chatPoints)}**`,
                    `🎙️ Voice Points      : **${fmtNum(stats.monthly.voicePoints)}**`,
                    `⭐ Total Bulan Ini    : **${fmtNum(stats.monthly.total)}**`,
                    `🏅 Peringkat Bulan   : **${mRank}**`,
                ].join('\n'),
                inline: false,
            },
            {
                name: '🏆 Keseluruhan (Lifetime)',
                value: [
                    `💬 Total Chat          : **${fmtNum(stats.lifetime.chatPoints)}**`,
                    `🎙️ Total Voice         : **${fmtNum(stats.lifetime.voicePoints)}**`,
                    `⭐ Grand Total          : **${fmtNum(stats.lifetime.total)}**`,
                    `🌟 Peringkat Lifetime   : **${lRank}**`,
                ].join('\n'),
                inline: false,
            },
        )
        .setFooter({ text: CONFIG.embedPoint.footer })
        .setTimestamp();

    await message.reply({ embeds: [embed] }).catch(() => {});
}

// ════════════════════════════════════════════════════════════════════
//  📦  EXPORT
//  Format: array of command objects — terbaca oleh prefix handler
//
//  Prefix handler yang kompatibel (contoh umum):
//  ─────────────────────────────────────────────
//    const cmds = require('./commands/leaderboard');
//    // cmds adalah array, loop untuk register:
//    cmds.forEach(cmd => client.commands.set(cmd.name, cmd));
//
//    // Saat messageCreate:
//    // prefix = "ca ", content = "ca topmember monthly"
//    // args   = ["topmember", "monthly"]
//    // cmdName = args.shift() → "topmember"
//    // command.execute(message, args, client)  ← args = ["monthly"]
// ════════════════════════════════════════════════════════════════════

const commands = [
    {
        name: 'topmember',
        description: 'Tampilkan leaderboard Top-10 member teraktif bulan ini (mod/owner only)',
        execute: async (message, args, client) => {
            // Fallback: ambil client dari message jika tidak di-pass handler
            const _client = client || message.client;

            // Tambah poin chat untuk pesan command ini
            dbAddPoints(
                message.author.id, 'chat', CONFIG.points.perChat,
                message.author.username,
                message.author.displayAvatarURL({ forceStatic: true })
            );

            // Lazy init — setup voice, interval, dan event listener
            _setup(_client);

            // Hanya proses jika subcommand 'monthly'
            if (args[0]?.toLowerCase() === 'monthly') {
                await _cmdTopMember(message, _client).catch(e =>
                    console.error('[Leaderboard] topmember error:', e.message)
                );
            }
        },
    },
    {
        name: 'point',
        description: 'Lihat total poin dan peringkat kamu (semua member)',
        execute: async (message, args, client) => {
            const _client = client || message.client;

            // Tambah poin chat untuk pesan command ini
            dbAddPoints(
                message.author.id, 'chat', CONFIG.points.perChat,
                message.author.username,
                message.author.displayAvatarURL({ forceStatic: true })
            );

            // Lazy init
            _setup(_client);

            await _cmdPoint(message).catch(e =>
                console.error('[Leaderboard] point error:', e.message)
            );
        },
    },
];

module.exports = commands;

// _setup juga di-export agar bisa dipanggil dari index.js jika mau
// Contoh: require('./commands/leaderboard')._setup(client);
module.exports._setup = _setup; */