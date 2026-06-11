const { ActivityType } = require("discord.js");

module.exports = async (client) => {
  // ⚙️ Pengaturan dasar
  const updateInterval = 3000; // teks berubah setiap 3 detik
  let index = 0;

  const statuses = [
    () => `🐧 Pingu App !`,
    () => `💻 Melayani ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} user`,
    () => `✨ Developed by Dreams Akanza x Clevone`,
    () => `🎮 P adu fitur boss!`,
    () => `🤭 Hai Manis 08 berapa nih`,
    () => `😉 Kiw cewek infokan ig mu dong`,
    () => `🥶 Aduh tirizzzz kiye brok`,
    () => `😂 2025 ngoding ko pake GPT`,
    () => `😜 Kumaha barudak wellll!`,
  ];

  // 🚀 Fungsi ubah status
  const updatePresence = () => {
    const text = statuses[index % statuses.length]();

    client.user.setPresence({
      activities: [
        {
          name: text,
          type: ActivityType.Streaming, // bisa diganti: Playing, Watching, Listening, Competing
        },
      ],
    });

    index++;
  };

  updatePresence();
  setInterval(updatePresence, updateInterval);
};