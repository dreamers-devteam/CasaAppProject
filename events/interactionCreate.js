const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");

const rollSessions = new Map();

function shuffle(arr) {
  return [...arr].sort(() => 0.5 - Math.random());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Gacha member dari role")
    .addSubcommand(sub =>
      sub.setName("start")
        .setDescription("Mulai gacha")
        .addRoleOption(o =>
          o.setName("role").setRequired(true))
        .addIntegerOption(o =>
          o.setName("jumlah")
            .setDescription("Jumlah pemenang (default: 1)")
            .setMinValue(1))
    )
    .addSubcommand(sub =>
      sub.setName("reset")
        .setDescription("Hapus semua member dari role")
        .addRoleOption(o =>
          o.setName("role").setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    /* ================= RESET ================= */
    if (sub === "reset") {
      const role = interaction.options.getRole("role");
      const bot = interaction.guild.members.me;

      if (!bot.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({
          content: "❌ Bot tidak punya izin Manage Roles",
          ephemeral: true,
        });
      }

      await interaction.deferReply();

      for (const m of role.members.values()) {
        await m.roles.remove(role).catch(() => {});
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🔁 Role Reset")
            .setDescription(`Semua member dihapus dari **${role.name}**`)
            .setColor("Red"),
        ],
      });
    }

    /* ================= START ================= */
    const role = interaction.options.getRole("role");
    const jumlah = interaction.options.getInteger("jumlah") ?? 1;

    await interaction.guild.members.fetch();

    const members = role.members
      .filter(m => !m.user.bot)
      .map(m => m.user);

    if (members.length === 0) {
      return interaction.reply({
        content: "❌ Role ini tidak memiliki member",
        ephemeral: true,
      });
    }

    if (jumlah > members.length) {
      return interaction.reply({
        content: "❌ Jumlah pemenang melebihi member role",
        ephemeral: true,
      });
    }

    const loadingEmbed = new EmbedBuilder()
      .setTitle("🎰 Gacha Dimulai!")
      .setDescription(`Mengambil ${jumlah} pemenang dari ${members.length} peserta...`)
      .setColor("Yellow");

    const msg = await interaction.reply({
      embeds: [loadingEmbed],
      fetchReply: true,
    });

    /* ===== PICK WINNER PERTAMA ===== */
    const pool = shuffle(members.map(u => u.id));
    const winners = pool.splice(0, jumlah);

    const sessionId = msg.id;

    rollSessions.set(sessionId, {
      ownerId: interaction.user.id,
      roleId: role.id,
      pool,
    });

    const resultEmbed = new EmbedBuilder()
      .setTitle("🏆 Hasil Gacha")
      .setDescription(
        winners.map((id, i) => `${i + 1}. <@${id}>`).join("\n")
      )
      .setColor("Green")
      .setFooter({ text: `Sisa member: ${pool.length}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reroll_${sessionId}`)
        .setLabel("🔄 Reroll (1)")
        .setStyle(ButtonStyle.Primary)
    );

    await msg.edit({
      embeds: [resultEmbed],
      components: [row],
    });
  },

  async handleButton(interaction) {
    if (!interaction.customId.startsWith("reroll_")) return;

    const sessionId = interaction.customId.split("_")[1];
    const session = rollSessions.get(sessionId);

    if (!session) {
      return interaction.reply({
        content: "❌ Session gacha sudah berakhir",
        ephemeral: true,
      });
    }

    if (interaction.user.id !== session.ownerId) {
      return interaction.reply({
        content: "❌ Tombol ini hanya untuk pembuat gacha",
        ephemeral: true,
      });
    }

    if (session.pool.length === 0) {
      rollSessions.delete(sessionId);
      return interaction.reply({
        content: "⚠️ Semua member sudah terpilih",
        ephemeral: true,
      });
    }

    const picked = session.pool.shift();

    const embed = new EmbedBuilder()
      .setTitle("🔄 Reroll Result")
      .setDescription(`🎯 <@${picked}>`)
      .setColor("Blue")
      .setFooter({ text: `Sisa member: ${session.pool.length}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reroll_${sessionId}`)
        .setLabel("🔄 Reroll (1)")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(session.pool.length === 0)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
