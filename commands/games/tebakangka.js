// tebakangka.js
const { SlashCommandBuilder } = require('discord.js');
const User = require("../../database/models/User"); // sesuaikan dengan path model

const games = new Map();
function keyFor(interaction) {
  return `${interaction.guildId || 'dm'}-${interaction.user.id}`;
}

const command = new SlashCommandBuilder()
  .setName('tebakangka')
  .setDescription('Main tebak angka')
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Mulai permainan tebak angka')
      .addIntegerOption(opt => opt.setName('max').setDescription('Angka maksimum (default 100)').setRequired(false))
      .addIntegerOption(opt => opt.setName('tries').setDescription('Jumlah tebakan (default 5)').setRequired(false))
  )
  .addSubcommand(sub => sub.setName('stop').setDescription('Hentikan permainan aktif'));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'start') {
    const max = interaction.options.getInteger('max') || 100;
    const tries = interaction.options.getInteger('tries') || 5;
    const reward = interaction.options.getInteger('reward') || 1000;
    const k = keyFor(interaction);

    if (games.has(k)) {
      await interaction.reply({ content: '❌ Kamu sudah punya permainan aktif. Gunakan `/tebakangka stop` dulu.', ephemeral: true });
      return;
    }

    const target = Math.floor(Math.random() * max) + 1;
    await interaction.reply(`🎮 Permainan dimulai! Tebak angka 1–${max}. Kamu punya ${tries} percobaan.`);

    const channel = interaction.channel;
    const filter = (m) => m.author.id === interaction.user.id;
    const collector = channel.createMessageCollector({ filter, time: 1000 * 60 * 5 });

    const game = {
      target,
      attemptsLeft: tries,
      reward,
      channelId: channel.id,
      userId: interaction.user.id,
      collector,
    };

    games.set(k, game);

    collector.on('collect', async (m) => {
      const g = games.get(k);
      if (!g) return;
      const guess = parseInt(m.content, 10);
      if (Number.isNaN(guess)) return;

      g.attemptsLeft -= 1;

      if (guess === g.target) {
        // user menang
        collector.stop('won');
        games.delete(k);

        // update database
        let userData = await User.findOne({ userId: g.userId });
        if (!userData) userData = new User({ userId: g.userId });
        userData.cash += g.reward;
        await userData.save();

        m.reply(`🎉 Benar! Angkanya adalah **${g.target}**. Kamu menang! Hadiah: 💰 **_${g.reward} Pcash_**`);
        return;
      }

      if (g.attemptsLeft <= 0) {
        m.reply(`😢 Kesempatan habis. Angka yang benar adalah ${g.target}.`);
        collector.stop('lost');
        games.delete(k);
        return;
      }

      const hint = guess < g.target ? 'lebih besar' : 'lebih kecil';
      m.reply(`Salah — coba angka ${hint}. Sisa percobaan: ${g.attemptsLeft}`);
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time' && games.has(k)) {
        channel.send(`<@${interaction.user.id}> Waktu habis. Angkanya adalah ${target}.`);
        games.delete(k);
      }
    });

  } else if (sub === 'stop') {
    const k = keyFor(interaction);
    const g = games.get(k);
    if (!g) {
      await interaction.reply({ content: 'Tidak ada permainan aktif untukmu.', ephemeral: true });
      return;
    }
    g.collector.stop('stopped-by-user');
    games.delete(k);
    await interaction.reply({ content: 'Permainanmu dihentikan.', ephemeral: true });
  }
}

function handleMessage(message) {
  if (message.author.bot) return;
  const txt = message.content.trim().toLowerCase();
  if (txt === 'pin stoptebak') {
    const k = `${message.guildId || 'dm'}-${message.author.id}`;
    const g = games.get(k);
    if (g) {
      g.collector.stop('stopped-by-user');
      games.delete(k);
      message.reply('Permainan dihentikan.');
    }
  }
}

module.exports = {
  data: command,
  execute,
  handleMessage,
};
