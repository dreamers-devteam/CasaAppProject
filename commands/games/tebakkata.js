const { SlashCommandBuilder } = require("discord.js");
const User = require("../../database/models/User"); // sesuaikan path ke model User.js
// Daftar kata
const wordList = [
  "kucing", "mobil", "sekolah", "komputer", "discord", "musik", "program", "indonesia", "game", "esport", "anime", "naruto", "valorant", "minecraft", "mobile legends", "merah putih", "tahu bulat", "jawa barat", "milk coffe", "matcha", "clevone", "indomilk", "semangka", "pingu app", "terbaik", "dreams", "genshin impact", "raja langit", "kumar", "layla", "bandung", "desember", "fried chicken", "cartoon network", "forsaken", "lutfi halimawan", "windah basudara", "miaw aug", "we bear bears", "alfamart", "demon slayer", "blue flowers", "ghost", "one punch men", "resident evil", "nasi goreng", "spotify", "bogor", "tiktok", "whatsapp", "kulkas"
  ];

// Clues untuk kata-kata
const clues = {
  "kucing": "Lucu",
  "mobil": "Kendaraan",
  "motor": "Kendaraan beroda",
  "sekolah": "Tempat belajar",
  "komputer": "Alat elektronik",
  "discord": "Aplikasi komunitas",
  "musik": "Bisa didengar",
  "program": "Kode berjalan",
  "indonesia": "Negara",
  "game": "Hiburan digital",
  "esport": "Kompetisi gaming",
  "anime": "Kartun Jepang",
  "naruto": "Ninja anime",
  "valorant": "Game FPS",
  "minecraft": "Game blok kotak",
  "mobile legends": "Game Moba",
  "merah putih": "Bendera",
  "tahu bulat": "Makanan",
  "jawa barat": "Provinsi",
  "milk coffe": "Minuman terenak",
  "matcha": "Minuman hijau",
  "clevone": "Team developer",
  "indomilk": "Susu indo",
  "semanngka": "Buah segar",
  "pingu app": "bot discord",
  "terbaik": "boboiboy",
  "dreams": "Si pengendali mimpi",
  "genshin impact": "Anime RPG",
  "raja langit": "Julukan Onic ID",
  "kumar": "Baxia loncat ga nih",
  "layla": "Hero tutorial ML",
  "bandung": "Lautan api",
  "desember": "Musim dingin",
  "fried chicken": "Makanan di KFC",
  "cartoon network": "Kartun",
  "forsaken": "Proplayer Valorant",
  "lutfi halimawan": "Streamer dan Founder 02H",
  "windah basudara": "Streamer el absen",
  "miaw aug": "Streamer anti toxic",
  "we bear bears": "Kartun beruang",
  "alfamart": "Minimarket",
  "demon slayer": "Tanjiro",
  "blue flowers": "Tumbuhan dan warna",
  "ghost":  "Judul lagu",
  "one punch men": "Si botak yang over power",
  "resident evil": "Game zombie",
  "nasi goreng": "Makanan sejuta umat",
  "spotify": "Aplikasi pemutar musik",
  "bogor": "Kota hujan",
  "tiktok": "Aplikasi scrolling",
  "whatsapp": "Aplikasi untuk chatting",
  "kulkas": "pendingin"
};

// Penyimpanan game aktif (per guild/channel, bukan per user)
const games = new Map();
function keyFor(interaction) {
  return `${interaction.guildId || "dm"}-${interaction.channelId}`;
}

// Acak huruf kata
function shuffleWord(word) {
  return word
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

// Hitung Levenshtein distance
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const command = new SlashCommandBuilder()
  .setName("tebakkata")
  .setDescription("Main tebak kata (kata acak)")
  .addSubcommand(sub =>
    sub.setName("start")
      .setDescription("Mulai permainan tebak kata")
      .addIntegerOption(opt =>
        opt.setName("tries")
          .setDescription("Jumlah percobaan (0/unset = unlimited)")
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName("stop").setDescription("Hentikan permainan aktif")
  );

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "start") {
    const tries = interaction.options.getInteger("tries");
    const reward = interaction.options.getInteger("reward") || 1000;
    const k = keyFor(interaction);

    if (games.has(k)) {
      return interaction.reply({
        content: "❌ Sudah ada permainan aktif di channel ini. Gunakan `/tebakkata stop` dulu",
        ephemeral: true,
      });
    }

    // default unlimited
    let attemptsLeft;
    if (tries === 0 || tries === null) attemptsLeft = Infinity;
    else attemptsLeft = tries;

    const word = wordList[Math.floor(Math.random() * wordList.length)];
    const shuffled = shuffleWord(word);
    const clue = clues[word] || "Tidak ada clue";

    await interaction.reply(
      `🎮 Tebak kata dimulai!\n` +
      `Tebaklah kata ini: **_${shuffled}_**\n` +
      `\n🔎 **Clue**: **${clue}**\n` +
      `Clue Reaction : ✅ Benar\n🤭 | Hampir benar \n😅 | Sedikit benar\n❌ | Salah\n` +
      (attemptsLeft === Infinity
        ? "Kamu punya kesempatan menebak **unlimited**."
        : `Kamu punya kesempatan menebak sebanyak **${attemptsLeft}**.`)
    );

    const channel = interaction.channel;
    const filter = (m) => !m.author.bot;
    const collector = channel.createMessageCollector({ filter, time: 1000 * 60 * 5 }); // 5 menit

    const game = { word, attemptsLeft, reward, collector };
    games.set(k, game);

    collector.on("collect", async (m) => {
      const g = games.get(k);
      if (!g) return;

      const guess = m.content.trim().toLowerCase();

      // cek menang
      if (guess === g.word.toLowerCase()) {
        collector.stop("won");
        games.delete(k);

        let userData = await User.findOne({ userId: m.author.id });
        if (!userData) userData = new User({ userId: m.author.id });
        userData.cash += g.reward;
        await userData.save();

        try { await m.react("✅"); } catch {}

        return m.reply(
          `🎉 Benar! ${m.author} berhasil menebak kata **${g.word}** dan mendapat 💰 **_${g.reward}_**`
        );
      }

      if (g.attemptsLeft !== Infinity) g.attemptsLeft -= 1;

      // cek kedekatan
      const distance = levenshtein(guess, g.word.toLowerCase());
      try {
        if (distance <= 2) await m.react("🤭");
        else if (distance <= 4) await m.react("😅");
        else await m.react("❌");
      } catch {}

      // cek kalah
      if (g.attemptsLeft === 0) {
        m.reply(`😢 Kesempatan habis. Kata yang benar adalah **${g.word}**.`);
        collector.stop("lost");
        games.delete(k);
        return;
      }

      if (g.attemptsLeft !== Infinity) {
        m.reply(`❌ Salah (Sisa percobaan: ${g.attemptsLeft}`);
      } else {
        m.reply("❌ Salah (Percobaan unlimited, ayo coba lagi!)");
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time" && games.has(k)) {
        const g = games.get(k);
        channel.send(`⏰ Waktu habis!! Kata yang benar adalah **${g.word}**.`);
        games.delete(k);
      }
    });

  } else if (sub === "stop") {
    const k = keyFor(interaction);
    const g = games.get(k);
    if (!g) {
      return interaction.reply({
        content: "**❓Tidak ada permainan aktif di channel ini**",
        ephemeral: true,
      });
    }
    g.collector.stop("stopped-by-user");
    games.delete(k);
    return interaction.reply({ content: "**Permainan dihentikan**", ephemeral: true });
  }
}

module.exports = {
  data: command,
  execute,
};
