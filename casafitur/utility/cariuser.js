const prefixes = ["ca", "!ca", "!", "c!", "caca", "Caca", "Ca", "c", "C", "casa", "Casa"];

module.exports = {
  data: {
  name: "cariuser",
  description: "Cari user apakah sedang berada di voice channel atau tidak.",
  category: "utility",
  author: "Clevone Team"
},

  async run(message) {
    const prefix = prefixes.find(p => message.content.startsWith(p));
    if (!prefix) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const validCommands = ["cari", "find", "voice"]

    if (!validCommands.includes(command)) return;
    // cek input user (mention atau nama)
    let targetUser =
      message.mentions.users.first() ||
      message.guild.members.cache.find(
        (m) =>
          m.user.username.toLowerCase() === args.join(" ").toLowerCase() ||
          m.displayName.toLowerCase() === args.join(" ").toLowerCase()
      )?.user;

    if (!targetUser) {
      return message.channel.send(
        "❌ | ***Silahkan mention/tag user yang ingin dicari***\n Contoh: `ca cari @seoranguser` atau `ca voice @someoneuser"
      );
    }

    const member = await message.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return message.channel.send("❔| _User tidak ditemuka di server ini_");
    }

    const voiceChannel = member.voice.channel;

    if (voiceChannel) {
      message.channel.send(
        `🔎 ${targetUser} **Sedang berada divoice** ${voiceChannel}`
      );
    } else {
      message.channel.send(
        `❕| ${targetUser} ***Sedang tidak berada di voice manapun***`
      );
    }
  },
};
