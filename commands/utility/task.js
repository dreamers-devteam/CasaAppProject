const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { addReminder, getUserReminders, removeReminder } = require("../../database/handlers/remindHandler.js");

function isValidDateYYYYMMDD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function isValidTimeHHMM(s) {
  return /^\d{2}:\d{2}$/.test(s);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pengingat")
    .setDescription("Atur to do list mu / pengingat mu")
    .addSubcommand(sub =>
      sub
        .setName("buat")
        .setDescription("Buat pengingat atau to do list baru")
        .addStringOption(opt =>
          opt
            .setName("deskripsi")
            .setDescription("Deskripsi pengingat / to do list mu")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName("waktu")
            .setDescription("Atur waktu (Contoh: 04:50) format 24 jam Jam:Menit (ini opsional aja)")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName("tanggal")
            .setDescription("Atur tanggal (Contoh: 2025-10-15)")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("Liat semua pengingat / to do list yang pernah kamu buat")
    )
    .addSubcommand(sub =>
      sub
        .setName("hapus")
        .setDescription("Hapus pengingat atau to do list mu berdasarkan nomer urutnya")
        .addIntegerOption(opt =>
          opt
            .setName("no")
            .setDescription("Masukin nomer urut pemgingat atau to do list mu yang mau dihapus")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === "buat") {
      const description = interaction.options.getString("deskripsi");
      const waktu = interaction.options.getString("waktu"); // optional
      const tanggal = interaction.options.getString("tanggal"); // optional

      // validate
      if (waktu && !isValidTimeHHMM(waktu)) {
        return interaction.reply({ content: "**Format waktu invalid, gunakan HH:MM / Jam:Menit (24-jam)**\n***Contoh : 04:50**", ephemeral: false });
      }
      if (tanggal && !isValidDateYYYYMMDD(tanggal)) {
        return interaction.reply({ content: "**Format tanggal invalid, gunakan YYYY-MM-DD / Tahun-Bulan-Tanggal**\n***Contoh : 2025-10-15***", ephemeral: false });
      }

      if (tanggal) {
        // one-time reminder (date + optional time)
        addReminder(userId, { type: "once", date, time: time || null, deskripsi });
      } else {
        // if no date provided, but time provided — still save as once for that day? (we save as once without date is ambiguous)
        // For clarity: if no date provided, we save as recurring every day at time if time provided.
        if (waktu) {
          addReminder(userId, { type: "recurring", tanggal, days: ["everyday"], deskripsi });
        } else {
          // neither date nor time -> invalid
          return interaction.reply({ content: "Kamu harus menyediakan setidaknya tanggal atau waktu", ephemeral: true });
        }
      }

      return interaction.reply({
        content: `❗ **Pengingat ditambahkan**\n\nTugas / Deskripsi : ${deskripsi}\n\n${date ? `📅 Tanggal: ${tanggal}\n\n` : ""}${waktu ? `🕰 Waktu : ${waktu}\n\n` : ""}`,
        ephemeral: false,
      });
    }

    if (sub === "list") {
      const reminders = getUserReminders(userId);
      if (!reminders.length)
        return interaction.reply({ content: "_Kamu belum punya pengingat atau reminder apapun_", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle("List pengingat / to do list mu")
        .setColor("Green")
        .setDescription(
          reminders
            .map((r, i) => `**${i + 1}.** ${r.deskripsi} — ${r.tanggal || "-"} ${r.waktu ? "- " + r.waktu : ""} (${r.type})`)
            .join("\n")
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "hapus") {
      const index = interaction.options.getInteger("no") - 1;
      const reminders = getUserReminders(userId);
      if (!reminders[index])
        return interaction.reply({ content: "_Nomer pengingat / to do list mu tidak valid, silahkan di cek lagi dulu udah bener atau belum_", ephemeral: true });

      removeReminder(userId, index);
      return interaction.reply({ content: "***Pengingat mu berhasil dihapus***", ephemeral: true });
    }
  },
};