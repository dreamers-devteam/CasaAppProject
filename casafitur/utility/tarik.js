const allowedRoles = [
  "1415575422233481267", // Founder
  "1461611666126147584", // VP - Vice President
  "1435671899865743511", // DC - Dreamers Crew
  "1457115429528014960", // Division Tech
  "1456873822694277150", // Member Elite - Donatur Role
  "1456874530906574929", // Si Juragan - Donatur Role
  "1456874150491590759", // Sultan Server - Donatur Role
  "1428730690702151802", // Bangswan - Donatur Role
];

const hasPermission = require("../../permissions.js");
const prefixes = ["ca", "!ca", "!", "c!", "caca", "Caca", "Ca", "c", "C", "casa", "Casa"];

module.exports = {
  data: {
    name: "tarik",
    description: "Memindahkan user lain dari voice channel ke voice lain",
    category: "utility",
    author: "Dreams Akanza"
  },

  async run(message) {
    if (message.author.bot) return;

    // Cek apakah pesan pakai salah satu prefix
    const prefix = prefixes.find(p => message.content.startsWith(p));
    if (!prefix) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const validCommands = ["tarik", "pindahin", "move"];

    if (!validCommands.includes(command)) return;
    if (!hasPermission(message, allowedRoles)) {
      return message.reply("❗| **Error Akses ditolak**\nKamu ga punya akses buat pake fitur");
    }

    const member = message.mentions.members.first();
    if (!member) {
      return message.reply(
        "⚠️ Kamu harus mention user yang ingin dipindahkan\nContoh: `ca tarik @user` atau `ca tarik @user #channel`"
      );
    }

    let targetChannel = message.mentions.channels.first();
    if (!targetChannel) {
      targetChannel = message.member.voice.channel;
    }

    if (!targetChannel || !targetChannel.isVoiceBased()) {
      return message.reply("❓ | **Eh ini harus pindahin kemana orang nya channel yang kamu maksud ga valid😑**");
    }

    if (!member.voice.channel) {
      return message.reply("📵 | **Orangnya lagi ga di voice jadi ga bisa aku pindahin**");
    }

    try {
      await member.voice.setChannel(targetChannel);
      await message.reply(`${member.user.tag} _Successfully moved to_ ${targetChannel.name}`);
    } catch (err) {
      console.error(err);
      await message.reply("***Gagal buat mindahin user***\n**Note : pastiin dulu aku udah dikasih izin buat mindahin orangnya, cuman mindahin dari voice ko bukan mindahin dia dari hati yang lain😃**");
    }
  }
};
