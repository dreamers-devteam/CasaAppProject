const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection,
} = require("@discordjs/voice");
const fs = require("fs");
const path = require("path");
const hasPermision = require("../../permissions.js");
const prefixes = ["ca", "!ca", "!", "c!", "caca", "Caca", "Ca", "c", "C", "casa", "Casa"];

const allowedRoles = [
  "1415575422233481267", // Founder
  "1461611666126147584", // VP - Vice President
  "1435671899865743511", // DC - Dreamers Crew
  "1457115429528014960", // Division Tech
];

const DEFAULT_VOICE_CHANNEL_ID = "1415573862514692125";
const AUDIO_FILE = path.resolve(
  __dirname,
  "./database/pin-music/fly-lanarmx.mp3"
);

// simpan connection global (penting!)
let voiceConnection = null;

module.exports = {
  data: {
    name: "gawe",
    description: "Bot akan bekerja dan pergi ke tempat kerja nya",
    category: "utility",
    author: "Dreams Akanza",
  },

  async run(message) {
    const prefix = prefixes.find((p) =>
      message.content.startsWith(p)
    );
    if (!prefix) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = (args.shift() || "").toLowerCase();

    const validCommands = ["gawe", "kerja", "join", "work", "👜"];
    if (!validCommands.includes(command)) return;

    if (!hasPermision(message, allowedRoles)) {
      return message.reply(
        "❗| **Error Akses ditolak**\nKamu ga berhak ngatur aku😤😒");}

    const member = message.member;
    const channel =
      member.voice.channel ??
      message.guild.channels.cache.get(DEFAULT_VOICE_CHANNEL_ID);

    if (!channel) {
      return message.reply(
        "🧐 | ***Mana sih tempat gawe nya ga nemu aku😤***"
      );
    }

    if (!fs.existsSync(AUDIO_FILE)) {
      return message.reply("❌ | File musik tidak ditemukan");
    }

    try {
      // kalau masih ada connection lama → destroy dulu
      const oldConnection = getVoiceConnection(channel.guild.id);
      if (oldConnection) oldConnection.destroy();

      voiceConnection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfMute: false,
        selfDeaf: true,
      });

      const player = createAudioPlayer();
      const resource = createAudioResource(AUDIO_FILE);

      voiceConnection.subscribe(player);
      player.play(resource);

      player.on("error", (err) => {
        console.error("😵 | Error player:", err.message);
        if (voiceConnection) {
          voiceConnection.destroy();
          voiceConnection = null;
        }
      });

      return message.reply(
        "**Iyaww aku gawe ko tenang aja ga bakal bolos😌**"
      );
    } catch (err) {
      console.error(
        "Gagal absen kerja😕, dahlah mending balik aja bersantay dulu⛱️",
        err
      );
    }
  },
};

/* ===============================
   AUTO CLEANUP SAAT BOT MATI
================================ */

// CTRL + C
process.on("SIGINT", () => {
  if (voiceConnection) voiceConnection.destroy();
  process.exit(0);
});

// kill / restart server
process.on("SIGTERM", () => {
  if (voiceConnection) voiceConnection.destroy();
  process.exit(0);
});

// error tak terduga
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  if (voiceConnection) voiceConnection.destroy();
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  if (voiceConnection) voiceConnection.destroy();
});
