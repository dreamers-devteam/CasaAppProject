const { spawn } = require("child_process");
const prefixes = ["ca", "!ca", "!", "c!", "caca", "Caca", "Ca", "c", "C", "casa", "Casa"];

const allowedUsers = ["1416820515225600010"];

module.exports = {
  data: {
    name: "restart",
    description: "🔁 Restart bot dan refresh update terbaru",
    author: "Dreams Akanza",
  },
    
  async run(message) {
    const prefix = prefixes.find(p => message.content.startsWith(p));
    if (!prefix) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = (args.shift() || "").toLowerCase();
    const validCommands = ["restart", "refresh"];
    if (!validCommands.includes(command)) return;
      if (!allowedUsers.includes(message.author.id)) {
        return await message.reply("**You Need Actived Override Mode**");
      }
      
    await message.reply("The bot will restart soon");

    // Tunggu sedikit agar pesan terkirim dulu sebelum restart
        setTimeout(() => {
      // Jalankan proses baru
      const subprocess = spawn("node", ["index.js"], {
        detached: true,  // proses berjalan independen
        stdio: "ignore"  // abaikan output agar tidak ganggu
      });

      subprocess.unref(); // biarkan proses tetap hidup setelah ini keluar
      process.exit(0); // matikan proses lama
    }, 2000);
  },
};