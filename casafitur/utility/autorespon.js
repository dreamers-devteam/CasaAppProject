const fs = require("fs");
const hasPermission = require("../../permissions.js");

const prefixes = ["ca", "!ca", "!", "c!", "caca", "Caca", "Ca", "c", "C", "casa", "Casa"];

const allowedRoles = [
  "1415575422233481267", 
  "1415581785693098070",
  "1457115429528014960"
];

/* --------------- 📌 File Path 📌 --------------- */
const RESPON_CHANNEL = "./casafitur/utility/database/yappingchat.json";
const RESPONSES_FILE = "./casafitur/utility/database/responses.json";

/* --------------- 📶 STATE 📶 --------------- */
let activeChannels = new Set();
let responsesCache = [];
let responsesMtime = 0;

/* --------------- ⬇️ Helper ⬇️ --------------- */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* --------------- 🔂 Load Respon ( Auto Reaload ) 🔂 --------------- */
function loadResponses() {
  try {
    const stat = fs.statSync(RESPONSES_FILE);
    if (stat.mtimeMs !== responsesMtime) {
      const raw = fs.readFileSync(RESPONSES_FILE, "utf8");
      const json = JSON.parse(raw);
      responsesCache = Array.isArray(json) ? json : [];
      responsesMtime = stat.mtimeMs;
    }
  } catch (err) {
    console.error("🔁 | Gagal load responses.json, gagal konek aku hehe😁:", err.message);
    responsesCache = [];
  }
  return responsesCache;
}

/* --------------- ⬇️ Load / Save Channel Status ⬇️ --------------- */
function loadChannelStatus() {
  try {
    if (fs.existsSync(RESPON_CHANNEL)) {
      const data = JSON.parse(fs.readFileSync(RESPON_CHANNEL, "utf8"));
      if (Array.isArray(data)) activeChannels = new Set(data);
    }
  } catch (err) {
    console.error("🧐 | Gagal membaca status channel, mataku kayanya minus deh🤓:", err.message);
    activeChannels = new Set();
  }
}

function saveChannelStatus() {
  try {
    fs.writeFileSync(RESPON_CHANNEL, JSON.stringify([...activeChannels], null, 2));
  } catch (err) {
    console.error("📥 | Gagal menyimpan status channel, aduh lupa lagi hehehe😅:", err.message);
  }
}

// ===== INIT =====
loadChannelStatus();

// ===== MODULE =====
module.exports = {
  data: {
    name: "autorespon",
    description: "AutoRespon yang akan membalas yappingan mu secara otomatis",
    category: "utility",
    author: "Dreams Akanza"
  },

  async run(message) {
    if (!message || message.author.bot) return;

    const text = message.content;
    if (!text || typeof text !== "string") return;

    const content = text.toLowerCase();

    // ===== COMMAND HANDLER =====
    const prefixUsed = prefixes.find(p =>
      content.startsWith(p.toLowerCase())
    );

    if (prefixUsed) {
      const args = content.slice(prefixUsed.length).trim().split(/ +/);
      const command = args.shift();

      const validCommands = ["autorespon", "ar", "respon", "yapping", "💭"];
      if (!validCommands.includes(command)) return;

      if (!hasPermission(message, allowedRoles)) {
        return message.channel.send(
          "❗ **Akses Ditolak**\nKamu tidak punya izin untuk mengatur AutoResponder, kamu juga tidak berhak menentukan pilihannya"
        );
      }

      const mentionedChannel = message.mentions.channels.first();
      const arg = args[0];
      const targetChannel = mentionedChannel || message.channel;
      const channelId = targetChannel.id;

      // === NONAKTIFKAN SEMUA CHANNEL ===
      if (arg === "all") {
        activeChannels.clear();
        saveChannelStatus();
        return message.channel.send(
          "<:OFF:1461333390883160156> | ***AutoRespon telah Nonaktif di seluruh channel***\nCape ga sih yapping mulu mending ngopi dulu☕ #RELAXBRO!"
        );
      }

/* --------------- ⬇️ On/Off Channel ⬇️ --------------- */
      if (activeChannels.has(channelId)) {
        activeChannels.delete(channelId);
        saveChannelStatus();
        return message.channel.send(
          `<:OFF:1461333390883160156> | ***AutoRespon telah Nonaktif di ${targetChannel}***\nSaatnya beristirahat karena sampai sini chat mu saja belum direspon oleh dia🙃`
        );
      } else {
        activeChannels.add(channelId);
        saveChannelStatus();
        return message.channel.send(
          `<:ON:1461333477092753502> **AutoRespon Aktifkan di channel - ${targetChannel}**\nchat kamu pasti direspon ga seperti dia yang ga pernah sama sekali respon kamu🙂`
        );
      }
    }

/* --------------- ⬇️ AutoYapping ⬇️ --------------- */
    if (!activeChannels.has(message.channel.id)) return;

    const responses = loadResponses();
    if (!responses.length) return;

    // === 1 KEYWORD → 1 RESPON RANDOM ===
    for (const item of responses) {
      if (
        typeof item?.trigger !== "string" ||
        typeof item?.response !== "string"
        ) continue;

  const trigger = item.trigger.toLowerCase();
  if (!content.includes(trigger)) continue;

      const sameTriggerResponses = responses.filter(r => 
      typeof r?.trigger === "string" &&
  r.trigger.toLowerCase() === trigger &&
  typeof r?.response === "string"
  );
      if (!sameTriggerResponses.length) return;

      const picked =
  sameTriggerResponses[Math.floor(Math.random() * sameTriggerResponses.length)];

let replyText = picked.response;

if (picked.mention === true) {
  replyText = replyText.replace("{user}", `<@${message.author.id}>`);
}

try {
  if (picked.reply === true) {
    await message.reply({ content: replyText });
  } else {
    await message.channel.send(replyText);
  }
} catch (err) {
  console.error("Gagal mengirim AutoRespon:", err);}

      break; // ⛔ STOP setelah satu keyword ketemu
    }
  }
};