require('dotenv').config({ path: './settings.env'});
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const figlet = require('figlet'); // Retaining figlet for cool ASCII art
const automodLogic = require('./automodLogic');
const chalk = require('chalk');
const readline = require('readline');
const { spawn } = require('child_process');
const prefixHandler = require('./prefixHandler.js');
const { oceansSecureSystem } = require('./database/handlers/os.js');
const { checkReminders } = require('./database/handlers/remindHandler.js');
const inviteVC = require('./casafitur/utility/invitevc.js');
const attachmentOnly = require('./commands/utility/attachmentOnly.js');
const casaAi = require('./database/handlers/casaAi.js')
const leaderboard = require('./database/handlers/topaktif.js')
const { startMoodRotation } = require('./database/handlers/moodCasa.js')

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates, // Voice states for music functionality
    GatewayIntentBits.GuildMessageReactions // For message reactions
  ]
});

require('./events/mailbox.js')(client);

// ======= Password Verification Before Run =======
(async () => {
  // console.log(chalk.yellowBright("Sebelum menjalankan all System Pingu App silahkan lewati 3-Phase Verify terlebih dahulu\nNote : setiap phase akan bertambah tingkat kesulitan verifikasinya dan jika gagal sistem akan di lock selama beberapa menit"));
  console.log(chalk.white("Security System by : OceansSecured"));
  await oceansSecureSystem();
  client.login(process.env.TOKEN);
  
 /*   const file = "./database/music/fly-lanarmx.mp3";
let player = null;
let isPaused = false;

// Jalankan pulseaudio (agar output bisa dipakai di Termux)
spawn("pulseaudio", ["--start", "--exit-idle-time=-1"]);

function playMusic() {
  if (player) {
    return;
  }

  player = spawn("mpg123", ["-o", "pulse", "-q", file]);

  player.on("close", () => {
    player = null;
    if (!isPaused) {
      playMusic();
    }
  });
}

// Fungsi pause
function pauseMusic() {
  if (!player) return;
  if (isPaused) return;

  player.kill("SIGSTOP"); // pause
  isPaused = true;
}

// Fungsi resume
function resumeMusic() {
  if (!player) return;
  if (!isPaused) return;

  player.kill("SIGCONT"); // lanjut
  isPaused = false;
}

// Fungsi atur volume (0–100)
function setVolume(level) {
  if (isNaN(level) || level < 0 || level > 100) {
    return;
  }
  spawn("pactl", ["set-sink-volume", "@DEFAULT_SINK@", `${level}%`]);
}

// Jalankan musik saat start
playMusic();

// Buat interface untuk membaca input user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("line", (input) => {
  const command = input.trim().toLowerCase();
  if (command === "h") {
    pauseMusic();
  } else if (command === "s") {
    resumeMusic();
  } else if (!isNaN(command)) {
    setVolume(parseInt(command));
  } else {
  }
}); */

// Cool ASCII banner for startup
figlet('C A S A !', (err, data) => {
  if (err) {
    console.log('Something went wrong with figlet...');
    console.dir(err);
    return;
  }
  
  console.log(chalk.cyanBright(data)); // Bisa di ubah warna
});

// MongoDB connection with a modern console message
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected ⇋ MongoDB GoogleCloud');
}).catch(err => console.error('MongoDB Connection: FAILED\n', err));

const delay = ms => new Promise(resolve=> setTimeout(resolve, ms));

function loading(message) {
  const frames = ["✧","✦"];
  let i = 0;
  
   const interval = setInterval(() => {
    process.stdout.write(`\r${frames[i = ++i % frames.length]} ${message}`);
   }, 500);
   
   return () => {
     clearInterval(interval);
     process.stdout.write(`\r${message}\n`);
   };
}
   
   const stop = loading("");
   
   setTimeout(() => {
     stop();
   }, 3000);
})();
// Command Handler
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath).forEach(category => {
  const commandFiles = fs.readdirSync(`${commandsPath}/${category}`).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(`${commandsPath}/${category}/${file}`);
    if (command.data && typeof command.data.toJSON === "function" && typeof command.execute === "function") {
    client.commands.set(command.data.name, command);
    } else {
      console.log(`[ indexjs ] skip non-slash command file: ${file}`);
}
    }
  });

// Event Handler
const eventsPath = path.join(__dirname, 'events');
fs.readdirSync(eventsPath).forEach(file => {
  const event = require(`${eventsPath}/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
});

client.on('messageCreate', automodLogic);
attachmentOnly.registerMessageListener(client);

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    if (!interaction.replied) {
      await interaction.reply({
        content: "**Terjadi kesalahan saat menjalankan command**",
        ephemeral: true
      });
    }
  }
});


// costum prefix Handler
client.on('messageCreate', async (message) => {
  await prefixHandler(message);
  await casaAi(message);
})

// Deploy-commands logic combined with index.js
const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

const deployCommands = async () => {
  try {
    console.log('Started refreshing application (/) commands');

    const commands = [];
    fs.readdirSync(commandsPath).forEach(category => {
      const commandFiles = fs.readdirSync(`${commandsPath}/${category}`).filter(file => file.endsWith('.js'));
      for (const file of commandFiles) {
        const command = require(`${commandsPath}/${category}/${file}`);
        commands.push(command.data.toJSON());
      }
    });

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands');

  
  } catch (error) {
    console.error('Failed to refresh application (/) commands:', error);
  }
};

// Initialize the bot and deploy commands

client.once('ready', async () => {
  checkReminders(client, { checkIntervalSec: 10, repeatTimes: 3, repeatDelayMs: 2000 });
  inviteVC.setupListener(client);
  startMoodRotation(client);

  console.log(`\nLogged in as ${client.user.tag}`);
  await delay(1000);
  
  console.log(`Casa App v3 Successfully run and ready to use`);
  await delay(2000);
 
  console.log(`\n━━━━━ Welcome My Dev!`);
  console.log(`Getting data Bot And Stats Bot Please Wait!`);
// loading 2
let chars = "████████████████████";
let bars = "░░░░░░░░░░░░░░░░░░░░";
let interval2 = setInterval(() => {
  process.stdout.write(`\r ${bars}`);
  bars += chars;
  if (bars.length > 20) bars = "";
}, 500);

await delay(200);
clearInterval(interval2);

  console.log(chalk.bold.green("\n╭━─┄┄⟢ CasaApp Info"));
  
function typewriter(text, delay = 50) {
  return new Promise((resolve) => {
    let i = 0;
    const interval3 = setInterval(() => {
      process.stdout.write(text[i]);
      i++;
      if (i >= text.length) {
        clearInterval(interval3);
        process.stdout.write("\n"); // new lines for continue
        resolve();
      }
    }, delay);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

await typewriter(chalk.bold.green(`┇ Username - ${client.user.tag}`), 60);

await typewriter(chalk.bold.green("┃ Ping - 24ms"), 60);

await typewriter(chalk.bold.green("┇ Version - V3@latest.Global"), 60);

await typewriter(chalk.bold.green("┇ Lib - Discord.js"), 60);

await typewriter(chalk.bold.green("┃ Database - MongoDB DreamersDatabase ( Google Cloud )"), 60);

await typewriter(chalk.bold.yellow("┇ > - + Self Mode + - <"), 60);

await typewriter(chalk.bold.green("┃ Support Link - trakteer.id/areadreamers"), 60);

await typewriter(chalk.bold.green("┇ Security System - OceansSecured"), 60);

await typewriter(chalk.bold.green("┃ Status - Very Good! RtS"), 60);

await typewriter(chalk.bold.green("┇ Owner - Dreams Akanza"), 60);

await typewriter(chalk.bold.cyan("┃ Author - Clevone Team x AreaDreamers"), 60);

console.log(chalk.bold.green("╰───╼ ©ClevoneTeam | Dreams Akanza • 2025"));
await delay(1000);

console.log(chalk.yellowBright("⡏⠉⠛⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⣿"));
console.log(chalk.yellowBright("⣿⠀⠀⠀⠈⠛⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠛⠉⠁⠀⣿"));
console.log(chalk.yellowBright("⣿⣧⡀⠀⠀⠀⠀⠙⠿⠿⠿⠻⠿⠿⠟⠿⠛⠉⠀⠀⠀⠀⠀⣸⣿"));
console.log(chalk.yellowBright("⣿⣿⣷⣄⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿"));
console.log(chalk.yellowBright("⣿⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⣴⣿⣿⣿⣿"));
console.log(chalk.yellowBright("⣿⣿⣿⡟⠀⠀⢰⣹⡆⠀⠀⠀⠀⠀⠀⣭⣷⠀⠀⠀⠸⣿⣿⣿⣿"));
console.log(chalk.yellowBright("⣿⣿⣿⠃⠀⠀⠈⠉⠀⠀⠤⠄⠀⠀⠀⠉⠁⠀⠀⠀⠀⢿⣿⣿⣿"));
console.log(chalk.yellowBright("⣿⣿⣿⢾⣿⣷⠀⠀⠀⠀⡠⠤⢄⠀⠀⠀⠠⣿⣿⣷⠀⢸⣿⣿⣿"));
console.log(chalk.yellowBright("⣿⣿⣿⡀⠉⠀⠀⠀⠀⠀⢄⠀⢀⠀⠀⠀⠀⠉⠉⠁⠀⠀⣿⣿⣿"));
console.log(chalk.yellowBright("⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿"));
console.log(chalk.yellowBright("⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿"));
console.log(chalk.bold.yellow("Powered By Clev Core"));

/* const startTime = Date.now();

await delay(1000);

// Time Function
process.stdout.write('\n\n\n');

// utility: format runtime dari startTime
function formatRuntime(startTime) {
  const now = Date.now();
  const uptime = now - startTime;
  const seconds = Math.floor((uptime / 1000) % 60);
  const minutes = Math.floor((uptime / (1000 * 60)) % 60);
  const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));

  return (days > 0 ? `${days}d ` : '') +
         (hours > 0 ? `${hours}h ` : '') +
         (minutes > 0 ? `${minutes}m ` : '') +
         `${seconds}s`;
}

function clearAndWrite(runtimeStr, clockStr) {
  // pindah ke area (2 baris ke atas dari posisi saat ini)
  process.stdout.write('\x1b[2A');
  // bersihkan baris pertama, tulis runtime
  process.stdout.write('\x1b[2K\r' + `╰╴╴╴╴⟞ ⏱ Runtime : ${runtimeStr}\n`);
  // bersihkan baris kedua, tulis clock
  process.stdout.write('\x1b[2K\r' + `╰╴╴╴╴⟞ ⏲ Clock  : ${clockStr} - WIB\n`);
}

const intervalRuntime = setInterval(() => {
  const runtimeStr = formatRuntime(startTime);
  const now = new Date();
  const localTime = now.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour12: true
  });

  clearAndWrite(runtimeStr, localTime);
}, 1000);

const intervalClock = setInterval(() => {
  const now = new Date();
  const localTime = now.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour12: true
  });
  const runtimeStr = formatRuntime(startTime);

  clearAndWrite(runtimeStr, localTime);
}, 1000); fungsi has been disable*/
deployCommands();
});
// Credit | Thanks To
// ©Clevone Team 2025 - All Right Reversed