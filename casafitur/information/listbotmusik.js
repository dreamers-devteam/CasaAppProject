const { EmbedBuilder } = require("discord.js");
const allowedUsers = ["1296607581363634210"];
const prefixes = ["ca", "!ca", "!", "c!", "caca", "Caca", "Ca", "c", "C", "casa", "Casa"];

module.exports = {
  data: {
    name: "listbotmusik",
    description: "Cek status semua bot musik di server",
    category: "information",
    Author: "Dreams Akanza",
  },

  async run(message) {
    const prefix = prefixes.find(p => message.content.startsWith(p));
    if (!prefix) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const validCommands = ["mbs", "listmusikbot", "botmusiklist", "statusmb"];
    if (!validCommands.includes(command)) return;

    if (!allowedUsers.includes(message.author.id)) {
      return message.reply("❗| **Error Akses Ditolak!**\nKamu tidak bisa mengakses perintah ini");
    }

    const musicBots = [
      { id: "1021732722479202304", name: "Hade", prefix: "h!" },
      { id: "1272954288477311011", name: "Prime", prefix: "h!" },
      { id: "411916947773587456", name: "Jockie Music", prefix: "m!" },
      { id: "412347257233604609", name: "Joko Music", prefix: "m!" },
      { id: "412347553141751808", name: "Juki Music", prefix: "m!" },
      { id: "412347780841865216", name: "Jono Music", prefix: "m!" },
      { id: "1259530981526868048", name: "Clawdy", prefix: "/play" },
      { id: "1449721663523655772", name: "Claude", prefix: "/play" },
    ];

    async function generateEmbed(guild) {
      const fields = await Promise.all(
        musicBots.map(async bot => {
          let member = null;
          try {
            member = await guild.members.fetch(bot.id);
          } catch {
            member = null;
          }

          const fieldName = `╭ <@${bot.id}> (${bot.prefix ?? ""})`;

          if (!member) {
            return {
              name: fieldName,
              value: `╰ 🟠 | Offline`,
              inline: false,
            };
          }

          const voiceChannel = member.voice?.channel;
          const status = voiceChannel
            ? `╰ 🔴 | In use - <#${voiceChannel.id}>`
            : `╰ 🟢 | Ready`;

          return {
            name: fieldName,
            value: status,
            inline: false,
          };
        })
      );

      return new EmbedBuilder()
        .setAuthor({
          name: "♫ List Bot Music / Status Bot Music",
          iconURL:
            "https://cdn.discordapp.com/attachments/1374005202146951209/1422577018737917994/standard_2.gif",
        })
        .setDescription(
          "\n**Lihat disini untuk mengetahui list bot musik, status bot, dan prefix yang digunakan**\n\n🟢 : Ready / Online\n🔴 : Sedang dipakai\n🟠 : Offline\n__Total Bot Musik : 8__\n**_Note : Status bot musik ini akan otomatis terrefresh / terupdate setiap 1 menit sekali_**"
        )
        .setColor("Blue")
        .addFields(fields)
        .setImage(
          "https://cdn.discordapp.com/attachments/1374005202146951209/1422571571666751589/standard_1.gif"
        )
        .setFooter({
          text: "©The Dreamers • CasaApp - Last Update >",
          iconURL:
            "https://cdn.discordapp.com/attachments/1374005202146951209/1422579667222925322/standard_3.gif",
        })
        .setTimestamp();
    }

    let sentMsg;
    try {
      const embed = await generateEmbed(message.guild);
      sentMsg = await message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("Failed send embed :", err);
      return message.reply(`Failed to send embed : ${err.message}`);
    }

    let lastStatus = "[]";
    const intervalMs = 5000;
    setInterval(async () => {
      try {
        const newEmbed = await generateEmbed(message.guild);
        const newStatus = JSON.stringify(newEmbed.data?.fields ?? []);
        if (newStatus !== lastStatus) {
          await sentMsg.edit({ embeds: [newEmbed] });
          lastStatus = newStatus;
        }
      } catch (err) {
        console.error("Failed to update embed :", err);
      }
    }, intervalMs);
  },
};
