const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Makes the bot say something.')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message to send')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // atur default permission

  async execute(interaction) {
    const message = interaction.options.getString('message');

    // Kirim pesan ke channel tanpa reply ke command
    await interaction.channel.send(message);

    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();
  }
};
