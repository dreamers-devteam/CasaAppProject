const { EmbedBuilder } = require("discord.js");
const prefixes = ["ca", "!ca", "!", "c!", "caca", "Caca", "Ca", "c", "C", "casa", "Casa"];
let activeInvites = new Map(); 
// Simpan data invite: key = inviterId, value = { invite, channelId }

module.exports = {
  data: {
  name: "invitevc",
  description: "Mengundang someone ke voice bukan undangan nikah woi",
  category: "utility",
  author: "Clevone Team"
  },
  async run(message, client) {
    const prefix = prefixes.find(p => message.content.startsWith(p));
    if (!prefix) return;

    const arg = message.content.slice(prefix.length).trim().split(/ +/);
    const command = (arg.shift() || "").toLowerCase();
    const validCommands = ["ajak", "inv", "invite", "undang"];
    
    if (!validCommands.includes(command)) return;
    
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply("❗| **Kamu harus mention orang yang mau kamu undang ke voice**\nContoh : `ca invite @user`");
    }

    const member = message.member;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      return message.reply("Kamu harus berada di voice channel terlebih dahulu");
    }

    try {
      // Buat invite hanya untuk 1 kali pakai
      const invite = await voiceChannel.createInvite({
        maxUses: 1,
        maxAge: 0, 
        unique: true,
        reason: `Undangan voice dari : ${message.author.tag}`
      });

      // Simpan ke map
      activeInvites.set(member.id, { invite, channelId: voiceChannel.id });

      await target.send(
        `Hawo <@${target.id}> !,\n` +
        `***Kamu baru saja diajak untuk voice bareng oleh*** **${message.author.tag}**\n` +
        `Silahkan klik linknya buat join : ${invite.url}`
      );
      await message.reply(`**Undangan telah berhasil dikirim ke ${target.tag} via DM!\ndah di undang ko tinggal nunggu dia join, itupun kalau dia mau🤭**`);

    } catch (error) {
      console.error(error);
      return message.reply("_Failed to create invitation / send invitation make sure target DM is open_");
    }
  },
      
      setupListener(client) {
    client.on("channelDelete", async (channel) => {
      for (const [inviterId, data] of activeInvites.entries()) {
        if (data.channelId === channel.id) {
          try {
            await data.invite.delete("Voice Channel udah ga ada, undangan-nya kadaluarsa");
            activeInvites.delete(inviterId);
            console.log(`Invite untuk channel ${channel.name} dihapus karena channel dihapus`);
          } catch (err) {
            console.warn("Gagal menghapus invite:", err);
          }
        }
      }
    });
  }
};