const {
  SlashCommandBuilder,
  ChannelType,
  Events
} = require("discord.js");
const fs = require("fs");

const DATA_FILE = "./database/the-data/attachmentOnly.json";

/* ========== DATA HANDLER ========== */
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ channels: [] }, null, 2));
}

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
/* ================================= */

/* ========== SLASH COMMAND ========== */
const data = new SlashCommandBuilder()
  .setName("attachment-only")
  .setDescription("Kalau diaktifkan fitur ini bikin kamu gabisa kirim pesan kecuali ada foto, video, atau audionya")
  .addStringOption(opt =>
    opt
      .setName("status")
      .setDescription("Mau aktifin atau matiin nih?")
      .setRequired(true)
      .addChoices(
        { name: "Aktifin", value: "enable" },
        { name: "Matiin", value: "disable" }
      )
  )
  .addChannelOption(opt =>
    opt
      .setName("channel")
      .setDescription("Mau digunain di channel dimana fiturnya?")
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText)
  );

/* ========== INTERACTION HANDLER ========== */
async function execute(interaction) {
  const status = interaction.options.getString("status");
  const channel = interaction.options.getChannel("channel");

  const dataFile = loadData();

  if (status === "enable") {
    if (!dataFile.channels.includes(channel.id)) {
      dataFile.channels.push(channel.id);
      saveData(dataFile);
    }

    return interaction.reply({
      content: `<:ON:1461333477092753502> | **Attachment-only sudah diaktifkan di - ${channel}**`,
      ephemeral: false
    });
  }

  if (status === "disable") {
    dataFile.channels = dataFile.channels.filter(id => id !== channel.id);
    saveData(dataFile);

    return interaction.reply({
      content: `<:OFF:1461333390883160156> | **Attachment-only telah dinonaktifkan di - ${channel}**`,
      ephemeral: false
    });
  }
}

/* ========== MESSAGE LISTENER ========== */
function registerMessageListener(client) {
  client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    if (!message.guild) return;

    // thread dikecualikan
    if (message.channel.isThread()) return;

    const dataFile = loadData();
    if (!dataFile.channels.includes(message.channel.id)) return;

    // hapus pesan tanpa attachment
    if (message.attachments.size === 0) {
      try {
        await message.delete();
      } catch {}
    }
  });
}

/* ========== EXPORT ========== */
module.exports = {
  data,
  execute,
  registerMessageListener
};
