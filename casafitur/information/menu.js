const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const prefixes = ["ca", "!ca", "!", "c!", "caca", "Caca", "Ca", "c", "C", "casa", "Casa"];

/* --------------- ⬇️ Halaman Embed ⬇️ --------------- */
const pages = [
  // PAGE 0 - HOME
  {
    title: "CasaApp Menu",
    description: `**Casa App adalah sebuah bot discord dengan fitur Management Server dan Moderation yang memiliki cukup banyak fitur dan saat ini Casa App masih dalam tahap pengembangan / in Development**\n` +
      "***Gunakan tombol di bawah untuk melihat fitur bot***",
    color: "#3D4CF5",
    thumbnail: {
      url: "https://cdn.discordapp.com/attachments/1400716003150921741/1462407289368477809/20d744b0cf894d711d42e62a5cde3297.jpg?ex=696e146b&is=696cc2eb&hm=aac51d54135558967ea9b51d03c0481fcf67128e227141784438604e997a26e1&"
    },
    fields: [
      { name: "Prefix :", value: "**ca / !", inline: true },
      { name: "Versi :", value: "**v3.2.4@latest**", inline: true },
      { name: "Disupport oleh :", value: "**Lucid Dreamers Family**", inline: true },
      { name: "Dikembangkan oleh :", value: "**AreaDreamers with Clevone Team**", inline: true },
      { name: "Support link :", value: "**https://trakteer.id/areadreamers**", inline: true },
    ],
  },

  // PAGE 1
  {
    title: "🛠 Category Utility",
    description: "Fitur - Fitur khusus yang biasanya hanya bisa digunakan/diakses oleh Developer, Admin / Moderator, dan Owner Server",
    color: "#3DA8F5",
    fields: [
      { name: "AutoRespon", value: "**Fitur yang akan membalas yappingan mu dan para member secara otomatis**\n**Gunakan dengan command : ca autorespon #namachannel / ca autorespon**" },
      { name: "Tarik User", value: "**Fitur ini dapat memindahkan suatu user dari voice channel lain ke voicemu ( Fitur khusus yang memiliki role donatur server <#1442113833714974730>**\n**Gunakan dengan command : ca tarik @targetuser / ca move @usertarget**" },
      { name: "Cari User", value: "**Fitur ini dapat mencari suatu user / member sedang berada didalam voice atau tidaknya**\n**Gunakan dengan command : ca cari @targetuser / ca find @usertarget**" },
    ],
  },

  // PAGE 2
  {
    title: "📓 Category information",
    description: "Category untuk setiap fitur - fitur yang memberikan informasi atau menampilkan suatu informasi dan biasanya setiap fitur ini dapat di akses oleh seluruh member server",
    color: "#3DA8F5",
    fields: [
      { name: "Menu", value: "**Fitur ini dapat memberikan informasi kepadamu tentang bot dan fitur fitur lainnya**\n**Gunakan dengan command : ca menu**" },
      { name : "List bot Musik", value : "**Fitur ini dapat menampilkan seluruh list bot musik yang tersedia di server yang dapat digunakan oleh seluruh member**\n**Gunakan dengan command : ca mbs**" },
    ],
  },
];

/* --------------- ⬇️ Embed & Kuli Button ⬇️ --------------- */
function createEmbed(pageIndex) {
  const page = pages[pageIndex];

  const embed = new EmbedBuilder()
    .setTitle(page.title)
    .setDescription(page.description)
    .setColor(page.color)
    .setFooter({
      text: `Page ${pageIndex + 1} / ${pages.length}`,
    })
    .setTimestamp();

  if (page.thumbnail?.url) embed.setThumbnail(page.thumbnail.url);
  if (page.fields) embed.addFields(page.fields);
  return embed;
}


function createButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("menu_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("menu_home")
      .setLabel("🏠")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("menu_next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
  );
}

/* --------------- ⬇️ Command Export ⬇️ --------------- */

module.exports = {
  data: {
  name: "menuapp",
  description: "menampilkan pesona casa app hehe",
  category: "information",
  author: "Dreams Akanza",
  },

  async run(message) {
    const prefix = prefixes.find(p => message.content.startsWith(p));
    if (!prefix) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const validCommands = ["menu", "help", "📋", "listmenu", "fitur"]

    if (!validCommands.includes(command)) return;
    let currentPage = 0;

    const msg = await message.channel.send({
      embeds: [createEmbed(currentPage)],
      components: [createButtons()],
    });

    const collector = msg.createMessageComponentCollector({
      time: 1000 * 60 * 5,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "❌ | Maaf tapi tombol ini bukan untuk kamu\n```***Silahkan ketik ca menu untuk bisa mengakses menu ini juga***```",
          ephemeral: true,
        });
      }

      if (interaction.customId === "menu_back") {
        currentPage =
          currentPage > 0 ? currentPage - 1 : pages.length - 1;
      }

      if (interaction.customId === "menu_next") {
        currentPage =
          currentPage < pages.length - 1 ? currentPage + 1 : 0;
      }

      if (interaction.customId === "menu_home") {
        currentPage = 0;
      }

      await interaction.update({
        embeds: [createEmbed(currentPage)],
        components: [createButtons()],
      });
    });

    collector.on("end", () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  },
};
