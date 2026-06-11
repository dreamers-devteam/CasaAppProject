const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  ChannelType,
  Events
} = require("discord.js");
const hasPermision = require("../permissions.js")

/* --------------- ⬇️ Konfigurasi ⬇️ --------------- */
const prefixes = ["ca", "!ca", "!", "c!", "caca", "Caca", "Ca", "c", "C", "casa", "Casa"];
const allowedRoles = [
  "1415575422233481267", // Founder
  "1461611666126147584", // VP - Vice President
  "1435671899865743511", // DC - Dreamers Crew
  "1457115429528014960", // Division Tech
];

module.exports = (client) => {

/* --------------- ⬇️ Command n Prefix Hamdler ⬇️ --------------- */

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const prefix = prefixes.find((p) =>
      message.content.startsWith(p)
    );
    if (!prefix) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = (args.shift() || "").toLowerCase();

    const validCommands = ["mailbox", "suggest", "saran/kritik", "saran", "pesan", "📧"];
    if (!validCommands.includes(command)) return;

    if (!hasPermision(message, allowedRoles)) {
      return message.reply(
        "❗| **Error Akses ditolak**\nKamu ga berhak ngatur aku😤😒");}

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_suggestion")
        .setLabel("📝 Kirim Saran/Kritik")
        .setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({
      content:
        "📪 | __***MailBox Dreamers***__\n" +
        "**Klik tombol di bawah untuk mengirimkan saran atau kritik**\n\n" +
        "_Note : Nama boleh dikosongkan ( __Opsional__ )_",
      components: [row]
    });
  });

/* --------------- ⬇️ Interaction Handler ⬇️ --------------- */

  client.on(Events.InteractionCreate, async (interaction) => {

/* --------------- ⬇️ Button untuk buka Mailbox ⬇️ --------------- */

    if (interaction.isButton() && interaction.customId === "open_suggestion") {

      const modal = new ModalBuilder()
        .setCustomId("suggestion_modal")
        .setTitle("Kotak Saran");

      const nameInput = new TextInputBuilder()
        .setCustomId("suggest_name")
        .setLabel("Nama (opsional)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const suggestionInput = new TextInputBuilder()
        .setCustomId("suggest_text")
        .setLabel("Saran / Kritik")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(suggestionInput)
      );

      return interaction.showModal(modal);
    }

/* --------------- ⬇️ Mailbox awal Submit ⬇️ --------------- */
    if (
      interaction.type === InteractionType.ModalSubmit &&
      interaction.customId === "suggestion_modal"
    ) {
      let name = interaction.fields.getTextInputValue("suggest_name");
      const suggestion = interaction.fields.getTextInputValue("suggest_text");

      if (!name || name.trim() === "") name = "Anonymous";

      const embed = new EmbedBuilder()
        .setTitle("📩 Pesan Baru")
        .setColor("#f3cb51")
        .addFields(
          { name: "👤 Nama :", value: name },
          { name: "✉️ Pesan :", value: suggestion }
        )
        .setFooter({
          text: "Dreamers Mailbox",
          iconURL: "https://cdn.discordapp.com/attachments/1400716003150921741/1461688161481523201/Logo_The_Dreamers.jpg?ex=696b76ae&is=696a252e&hm=d85809582003fed077d876bb68c426e9534d0bdced51fe706d8a8eac6fb80baf&"
        })
        .setTimestamp();

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("open_suggestion")
          .setLabel("📝 Kirim Saran/Kritik")
          .setStyle(ButtonStyle.Primary)
      );

      const sentMessage = await interaction.channel.send({
        embeds: [embed],
        components: [buttonRow]
      });

/* --------------- ⬇️ AutoThread ⬇️ --------------- */

      if (interaction.channel.type === ChannelType.GuildText) {
        await sentMessage.startThread({
          name: `🗣️ - Kolom Tanggapan`,
          autoArchiveDuration: 1440,
          reason: "Tempat menanggapi saran/kritik"
        });
      }

      return interaction.reply({
        content: "✅ | **Mantap! Pesan kamu berhasil dikirim!**\nTerima kasih ya sudah memberikan saran/kritik😄",
        ephemeral: true
      });
    }
  });
};
