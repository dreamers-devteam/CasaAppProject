const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000 % 60);
    const minutes = Math.floor(ms / (1000 * 60) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds) parts.push(`${seconds}s`);

    return parts.join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Menampilkan kondisi koneksi casa dan informasi internet casa'),
    async execute(interaction) {
      const uptime = formatDuration(interaction.client.uptime);
        const sent = await interaction.reply({ content: '**<a:pingruning:1488101838602371122> Pinging...**\n_please wait!_', fetchReply: true });
        const botLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle('<:netralping:1488101962292396152> Casa Network Info <:netralping:1488101962292396152>')
            .setDescription(`**<:goodping:1488099314445193267> | Bot Ping - _${botLatency}ms_**\n**<:goodping:1488099314445193267> | API Ping - _${apiLatency}ms_**\n**<a:clockrunning:1488102021776146592> | Runtime - _${uptime}_**\n_Connected to PT.Axis Telkom Indonesia_\n\nOverall Connetion : Sangat Cepat <a:pingruning:1488101838602371122>`)
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    },
};
