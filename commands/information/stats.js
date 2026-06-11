const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, version } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Displays bot statistics'),
    async execute(interaction) {
        const { client } = interaction;
        const uptime = formatDuration(client.uptime);
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.users.cache.size;
        const nodeVersion = process.version;
        const discordJsVersion = version;
        const cpumodel = "Intel® Xeon® W9-3495X ( Gen 4th )";
        const os = "Linux, Firefox OS by Mozilla"
        const overallRating = "Good!"

        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle('📊 - Casa App Statistics - 📊')
            .setDescription(`**Developed by Dreams Akanza & Clevone Team**\n\n**Uptime : ${uptime}**\n**Memory Usage : ${memoryUsage}**\n**Servers : Serving ${totalGuilds}**\n**Users : Serving ${totalUsers}**\n**Node.js : ${nodeVersion}**\n**discord.js : v${discordJsVersion}**\n**OS : ${os}**\n**CPU : ${cpumodel}**\n**Overall Rating : ${overallRating}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

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
