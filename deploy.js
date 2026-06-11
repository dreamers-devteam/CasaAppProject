require("dotenv").config({ path: './settings.env' });
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "commands");

fs.readdirSync(commandsPath).forEach(category => {
  const files = fs
    .readdirSync(`${commandsPath}/${category}`)
    .filter(f => f.endsWith(".js"));

  for (const file of files) {
    const command = require(`${commandsPath}/${category}/${file}`);
    if (command.data) {
      commands.push(command.data.toJSON());
    }
  }
});

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Deploying slash commands...");
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands deployed!");
  } catch (err) {
    console.error(err);
  }
})();
