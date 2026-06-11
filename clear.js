require("dotenv").config({ path: './settings.env' });
const { REST, Routes } = require("discord.js");

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Clearing GLOBAL commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [] }
    );

    console.log("Clearing GUILD commands...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: [] }
    ); 

    console.log("✅ All slash commands cleared!");
  } catch (err) {
    console.error(err);
  }
})();
