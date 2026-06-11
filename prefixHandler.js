const fs = require("fs");
const path = require("path");

// Load semua command prefix dari folder commands
const commands = new Map();
const commandsPath = path.join(__dirname, "casafitur");

fs.readdirSync(commandsPath).forEach(category => {
  const categoryPath = path.join(commandsPath, category);

  // pastikan ini folder
  if (!fs.statSync(categoryPath).isDirectory()) return;

  const commandFiles = fs.readdirSync(categoryPath)
    .filter(file => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(categoryPath, file);
    try {
      const command = require(filePath);
      if (!command || typeof command.run !== "function") {
        console.warn(`[prefixHandler] Skip file tidak valid: ${filePath}`);
        continue;
      }
      commands.set(command.data?.name || file, command);
    } catch (err) {
      console.error(`[prefixHandler] Gagal load ${file}:`, err.message);
    }
  }
});

module.exports = async (message) => {
  if (!message || message.author?.bot) return;
  for (const [, command] of commands) {
    try {
      await command.run(message);
    } catch (err) {
      console.error(`Error di command prefix ${command.data?.name}:`, err);
    }
  }
};
