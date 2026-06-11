const readline = require("readline");
const chalk = require("chalk");
const os = require("os");
const fs = require("fs");
const { execSync } = require("child_process");
require('dotenv').config({ path: './settings.env' });

const ipFilePath = "./database/the-data/securedata.json";
const cooldownFile = "./database/the-data/cooldownOS.json";

const DEFAULT_TIMEOUT_MS = Number(process.env.STAGE_TIMEOUT_MS) || 30000; 
const COOLDOWN_SECONDS = Number(process.env.COOLDOWN_SECONDS) || 60; 
  
// Fungsi untuk mengambil IP lokal
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

function checkCooldown() {
  if (fs.existsSync(cooldownFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(cooldownFile, "utf8"));
      const now = Date.now();
      if (now < data.expiresAt) {
        const remaining = Math.ceil((data.expiresAt - now) / 1000);
        console.log(chalk.redBright(`The system is locked by Oceans Secure System\nYou are currently in the cooldown phase. Please try again after ${remaining} seconds`));
        process.exit(1);
      } else {
        // cooldown expired, hapus file
        try { fs.unlinkSync(cooldownFile); } catch {}
      }
    } catch (e) {
      try { fs.unlinkSync(cooldownFile); } catch {}
    }
  }
}

function setCooldown(seconds = COOLDOWN_SECONDS) {
  const expiresAt = Date.now() + seconds * 1000;
  try { fs.writeFileSync(cooldownFile, JSON.stringify({ expiresAt }), "utf8"); } catch (e) {}
  console.log(chalk.redBright(`Failed verify system will be locked for ${seconds} seconds`));
}

// Visible input with timeout. Returns string or null (if timeout)
function secureInput(promptText, timeoutMs = 0) {
  return new Promise((resolve) => {
    let answered = false;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

    // jika timeoutMs > 0, buat timer
    let timer = null;
    if (timeoutMs && timeoutMs > 0) {
      timer = setTimeout(() => {
        if (answered) return;
        answered = true;
        try { process.stdout.write("\n"); } catch {}
        console.log(chalk.bold.red("Opportunity expires App will not run and App/Server will be shut down again!"));
        try { rl.close(); } catch {}
        resolve(null); // tanda timeout
      }, Number(timeoutMs));
    }

  
process.stdout.write(chalk.yellowBright(promptText));
    rl.question(`Please enter password : `, (answer) => {
      if (answered) {
        try { rl.close(); } catch {}
        return;
      }
      answered = true;
      if (timer) clearTimeout(timer);
      try { rl.close(); } catch {}
      resolve((answer || "").trim());
    });
  });
}

// Main System Secured
async function oceansSecureSystem() {
  checkCooldown();

  const passwords = [
    { envKey: "CASA_PASSWORD", label: "Phase 1", timeout: 0 },
    { envKey: "OCEANS_SECURITY", label: "Phase 2", timeout: DEFAULT_TIMEOUT_MS },
    { envKey: "VERIFY_PASS", label: "Phase 3", timeout: DEFAULT_TIMEOUT_MS },
  ];

  const currentIP = getLocalIP();
  let lastIP = null;
  if (fs.existsSync(ipFilePath)) {
    try { lastIP = JSON.parse(fs.readFileSync(ipFilePath, "utf8")).ip; } catch {}
  }

  if (lastIP && lastIP === currentIP) {
    console.log(chalk.greenBright(`Welcome Again Dev! - ${currentIP}`));
    return true;
  }

  for (const { envKey, label, timeout } of passwords) {
    const expected = process.env[envKey];
    if (!expected) {
      console.log(chalk.red(`${label} 404 | Could not find password!`));
      process.exit(1);
    }

    let attempts = 0;
    let success = false;

    while (attempts < 2 && !success) {
      const input = await secureInput(`${label} Please enter password : `, timeout);
      if (input === null) { // timeout
        setCooldown(COOLDOWN_SECONDS);
        process.exit(1);
      }

      if (input === expected) {
        console.log(chalk.bold.green(`${label} Correct Password will system will proceed to the next stage\n`));
        success = true;
      } else {
        attempts++;
        const left = 2 - attempts;
        console.log(chalk.bold.red(`${label} Wrong Password! Attempts: ${attempts}/2`));
        if (attempts >= 2) {
          setCooldown(COOLDOWN_SECONDS);
          console.log(chalk.redBright("Attempts exhausted and The system will be shutdown again"));
          process.exit(1);
        } else {
          console.log(chalk.bold.yellow(`Left to chance : ${left}`));
        }
      }
    }
  }

  // simpan ip terakhir
  try { fs.writeFileSync(ipFilePath, JSON.stringify({ ip: currentIP }), "utf8"); } catch (e) {}

  console.log(chalk.bold.green("The security stage has been successfully passed, the entire bot system has been successfully activated and the bot will be running soon\nWelcome my Dev!\n"));
  return true;
}

module.exports = { oceansSecureSystem };