const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const rollSessions = new Map();

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Gacha member dari role")
    .addSubcommand(sub =>
      sub.setName("start")
        .setDescription("Mulai gacha")
        .addRoleOption(o =>
          o.setName("role").setDescription("Role target").setRequired(true))
    ),

  async execute(interaction) {
    const role = interaction.options.getRole("role");

    await interaction.guild.members.fetch();
    const members = role.members
      .filter(m => !m.user.bot)
      .map(m => m.user);

    if (members.length === 0) {
      return interaction.reply({
        content: "❌ Role ini tidak memiliki member",
        ephemeral: true
      });
    }

    // ===== EMBED LOADING =====
    const loadingEmbed = new EmbedBuilder()
      .setTitle("🎰 Gacha Dimulai!")
      .setDescription(
        members.map(u => `• ${u.username}`).join("\n")
      )
      .setColor("Yellow")
      .setFooter({ text: "Sedang mengacak..." });

    const msg = await interaction.reply({
      embeds: [loadingEmbed],
      fetchReply: true
    });

    // Delay dramatis 😈
    await sleep(4000);

    // ===== SETUP SESSION =====
    const pool = members.map(u => u.id);
    const picked = pool.splice(
      Math.floor(Math.random() * pool.length),
      1
    )[0];

    const sessionId = msg.id;

    rollSessions.set(sessionId, {
      ownerId: interaction.user.id,
      roleId: role.id,
      pool
    });

    const resultEmbed = new EmbedBuilder()
      .setTitle("🏆 Hasil Gacha Pertama")
      .setDescription(`🎉 <@${picked}>`)
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reroll_${sessionId}`)
        .setLabel("🔄 Reroll")
        .setStyle(ButtonStyle.Primary)
    );

    await msg.edit({
      embeds: [resultEmbed],
      components: [row]
    });
  },

  async handleButton(interaction) {
    if (!interaction.customId.startsWith("reroll_")) return;

    const sessionId = interaction.customId.split("_")[1];
    const session = rollSessions.get(sessionId);

    if (!session) {
      return interaction.reply({
        content: "❌ Session gacha sudah berakhir",
        ephemeral: true
      });
    }

    if (interaction.user.id !== session.ownerId) {
      return interaction.reply({
        content: "❌ Tombol ini hanya bisa dipakai pembuat gacha",
        ephemeral: true
      });
    }

    if (session.pool.length === 0) {
      rollSessions.delete(sessionId);
      return interaction.reply({
        content: "⚠️ Semua member sudah keluar dari gacha",
        ephemeral: true
      });
    }

    // Ambil 1 member saja
    const picked = session.pool.splice(
      Math.floor(Math.random() * session.pool.length),
      1
    )[0];

    const embed = new EmbedBuilder()
      .setTitle("🔄 Reroll Result")
      .setDescription(`🎯 <@${picked}>`)
      .setColor("Blue")
      .setFooter({
        text: `Sisa member: ${session.pool.length}`
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reroll_${sessionId}`)
        .setLabel("🔄 Reroll")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(session.pool.length === 0)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
