const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const hasPermission = require("../../permissions.js")
const allowedUsers = [
  "1296607581363634210", // Owner ID | Dreams Akanza
  "1250772631162978316"  // Another User | Vayy
];
/**
 * Runtime storage autothread
 * key: channelId
 * value: {
 *   archiveDuration: number,
 *   requireAttachment: boolean,
 *   threadName: string
 * }
 */
const autoThreadConfig = new Map();

let listenerAttached = false;

/* --------------- ⬇️ Utility ⬇️ --------------- */

function formatThreadName(template, message) {
  return template
    .replace(/{user}/gi, message.author.username)
    .replace(/{channel}/gi, message.channel.name)
    .replace(/{date}/gi, new Date().toISOString().split("T")[0]);
}

function attachListener(interaction) {
  if (listenerAttached) return;
  listenerAttached = true;

  const client = interaction.client;

  client.on("messageCreate", async (message) => {
    if (
      message.author.bot ||
      !message.guild ||
      !autoThreadConfig.has(message.channel.id)
    ) return;

    const cfg = autoThreadConfig.get(message.channel.id);

    if (cfg.requireAttachment && message.attachments.size === 0) return;

    try {
      await message.startThread({
        name: formatThreadName(cfg.threadName, message),
        autoArchiveDuration: cfg.archiveDuration,
        reason: "AutoThread System",
      });
    } catch (err) {
      console.error("[AutoThread] Error:", err.message);
    }
  });
}

/* --------------- ⬇️ Helper ⬇️ --------------- */

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autothread")
    .setDescription("Kelola fitur AutoThread, fitur yang dapat menampung komentar, tanggapan, roastingan")
    .addSubcommand(sub =>
      sub
        .setName("set")
        .setDescription("Aktifkan atau nonaktifkan fitur AutoThread")
        .addStringOption(option =>
          option
            .setName("status")
            .setDescription("Mau nyalain atau matiin AutoThread nya nih?")
            .setRequired(true)
            .addChoices(
              { name: "Nyalain", value: "enable" },
              { name: "Matiin", value: "disable" }
            )
        )
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Target channel AutoThread")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option =>
          option
            .setName("archive")
            .setDescription("Waktu archive thread")
            .addChoices(
              { name: "1 Jam", value: "60" },
              { name: "1 Hari", value: "1440" },
              { name: "3 Hari", value: "4320" },
              { name: "1 Minggu", value: "10080" }
            )
        )
        .addBooleanOption(option =>
          option
            .setName("require_attachment")
            .setDescription("Thread hanya dibuat jika ada attachment")
        )
        .addStringOption(option =>
          option
            .setName("nama_thread")
            .setDescription("Nama thread ( {user}, {channel}, {date} )")
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("Lihat daftar channel yang menggunakan AutoThread")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    attachListener(interaction);
    
      if (!allowedUsers.includes(interaction.user.id)) {
        return interaction.reply({
          content: "❗  **Error Akses Ditolak!**\nKamu gap punya akses buat pake fitur ini wleeee😜👆",
          ephemeral: true
        });
      }

    const sub = interaction.options.getSubcommand();

/* --------------- ⬇️ List AutoThread ⬇️ --------------- */
    if (sub === "list") {
      if (autoThreadConfig.size === 0) {
        return interaction.reply({
          content: "❌ | Belum ada channel yang mengaktifkan AutoThread",
          ephemeral: true,
        });
      }

/* --------------- ⬇️ Embed List AutoThread ⬇️ --------------- */
      const embed = new EmbedBuilder()
        .setTitle("💭 - AutoThread List - 💭")
        .setColor(0x00ffcc)
        .setDescription(
          [...autoThreadConfig.entries()]
            .map(([channelId, cfg], i) => {
              return `**${i + 1}. <#${channelId}>**
• ⏳ | **Archive: ${cfg.archiveDuration} menit**
• 🖼 | **Require Attachment: ${cfg.requireAttachment}**
• 🏷 | **Nama Thread: \`${cfg.threadName}\`**`;
            })
            .join("\n\n")
        )
        .setFooter({
          text: "AutoThread System • CasaApp",
        })
        .setTimestamp();
/* --------------- ⬇️ Batas Embed ⬇️ --------------- */

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }

/* --------------- ⬇️ Gunakan AutoThread ⬇️ --------------- */
    if (sub === "set") {
      const status = interaction.options.getString("status");
      const channel = interaction.options.getChannel("channel");

/* --------------- ⬇️ Matikan AutoThread ⬇️ --------------- */
      if (status === "disable") {
        autoThreadConfig.delete(channel.id);
        return interaction.reply({
          content: `<:OFF:1461333390883160156> | **AutoThread berhasil dimatiin di channel - ${channel}**`,
          ephemeral: true,
        });
      }

/* --------------- ⬇️ Nyalain AutoThread ⬇️ --------------- */
      const archive = interaction.options.getString("archive");
      const requireAttachment =
        interaction.options.getBoolean("require_attachment");
      const threadName =
        interaction.options.getString("nama_thread");

      if (!archive || requireAttachment === null || !threadName) {
        return interaction.reply({
          content:
            "⚠️ | **Untuk menyalakan fitur AutoThread, kamu __wajib__ mengisi:\n`archive`, `require attachment`, dan `nama thread`**\nKalau mau nyalain tinggal isi aja apa susahnya sih mageran banget jadi orang😠",
          ephemeral: true,
        });
      }

      autoThreadConfig.set(channel.id, {
        archiveDuration: Number(archive),
        requireAttachment,
        threadName,
      });

      return interaction.reply({
        content:
          `<:ON:1461333477092753502> | **AutoThread berhasil dinyalain di channel - ${channel}!**\n\n` +
          `🏷 | **Nama Thread: \`${threadName}\`**\n` +
          `⏳ | **Archive: ${archive} menit**\n` +
          `🖼 | **Require Attachment: ${requireAttachment}**\n\n***©Casa App26***`,
        ephemeral: true,
      });
    }
  },
};
