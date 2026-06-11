// Author : Dreams Akanza
// Surface of Code

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const remindersPath = path.join(__dirname, "../../database/models/dataReminder.json");

function safeWrite(filePath, data) {
  fs.writeFileSync(filePath, data, { encoding: "utf8" });
}

function loadReminders() {
  try {
    if (!fs.existsSync(remindersPath)) {
      safeWrite(remindersPath, JSON.stringify({}, null, 2));
      return {};
    }
    const raw = fs.readFileSync(remindersPath, "utf8").trim();
    if (!raw) {
      safeWrite(remindersPath, JSON.stringify({}, null, 2));
      return {};
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed;
    throw new Error("reminders.json not object");
  } catch (err) {
    console.error("Failed load reminders.json (maybe corrupt). Reinit file. Error:", err && err.message ? err.message : err);
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = remindersPath + `.corrupt.${ts}`;
      try {
        const raw = fs.readFileSync(remindersPath, "utf8");
        safeWrite(backupPath, raw);
        console.warn(`Backup created: ${backupPath}`);
      } catch (e) {
        // ignore backup errors
      }
    } catch (e) {
      // ignore
    }
    try {
      safeWrite(remindersPath, JSON.stringify({}, null, 2));
    } catch (e) {
      console.error("Failed to reinitialize reminders file:", e);
    }
    return {};
  }
}

function saveReminders(data) {
  try {
    safeWrite(remindersPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save reminder:", err && err.message ? err.message : err);
  }
}

function normalizeReminder(rem) {
  if (!rem.id) rem.id = uuidv4();
  if (!rem.type) {
    if (rem.date) rem.type = "once";
    else rem.type = "recurring";
  }
  rem.description = rem.description || rem.task || "";
  rem.time = rem.time || null;
  rem.date = rem.date || null;
  return rem;
}

function addReminder(userId, reminderData) {
  const reminders = loadReminders();
  if (!reminders[userId]) reminders[userId] = [];
  const r = normalizeReminder(reminderData);
  reminders[userId].push(r);
  saveReminders(reminders);
  return r.id;
}

function removeReminderById(userId, id) {
  const reminders = loadReminders();
  if (!reminders[userId]) return false;
  const idx = reminders[userId].findIndex(r => r.id === id);
  if (idx === -1) return false;
  reminders[userId].splice(idx, 1);
  saveReminders(reminders);
  return true;
}

function removeReminder(userId, index) {
  const reminders = loadReminders();
  if (!reminders[userId]) return false;
  if (index < 0 || index >= reminders[userId].length) return false;
  const r = reminders[userId].splice(index, 1)[0];
  saveReminders(reminders);
  return true;
}

function getUserReminders(userId) {
  const reminders = loadReminders();
  return (reminders[userId] || []).map(normalizeReminder);
}

async function sendReminderRepeatedly(client, userId, reminder, times = 3, delay = 2000) {
  try {
    const user = await client.users.fetch(userId);
    if (!user) {
      console.warn(`User ${userId} not found when sending reminder ${reminder.id}`);
      return false;
    }
    for (let i = 0; i < times; i++) {
      try {
        await user.send(`❗**Excuse me sir, you have something I want to remind you of**: ${reminder.description}\n<@${userId}> _Sorry For Ping_`);
      } catch (e) {
        console.warn(`Failed to send DM to ${userId} (attempt ${i + 1}): ${e && e.message ? e.message : e}`);
      }
      if (i < times - 1) await new Promise(r => setTimeout(r, delay));
    }
    return true;
  } catch (err) {
    console.error(`Error when sendReminderRepeatedly to ${userId}:`, err);
    return false;
  }
}

const processing = new Set();

function checkReminders(client, options = {}) {
  const intervalSec = options.checkIntervalSec || 10;
  const repeatTimes = options.repeatTimes || 3;
  const repeatDelay = options.repeatDelayMs || 2000;

  setInterval(async () => {
    try {
      const reminders = loadReminders();
      const now = new Date();

      const nowISO = now.toISOString();
      const dayName = now.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
      const timeNowHHMM = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      let changed = false;

      for (const userId of Object.keys(reminders)) {
        const list = reminders[userId];
        for (let i = list.length - 1; i >= 0; i--) {
          const rem = normalizeReminder(list[i]);

          if (processing.has(rem.id)) continue;

          if (rem.type === "once" && rem.date) {
            let target;
            if (rem.time) {
              const combined = `${rem.date}T${rem.time}:00`;
              target = new Date(combined);
            } else {
              target = new Date(rem.date);
            }

            if (isNaN(target.getTime())) {
              console.warn(`Reminder ${rem.id} has invalid date/time (${rem.date} ${rem.time || ""}). Skipped (not removed).`);
              continue;
            }

            // allow small grace window (2 minutes) so near-simultaneous entries still trigger
            const diff = now.getTime() - target.getTime();
            if (diff >= 0 && diff < 1000 * 60 * 60 * 24 * 7) { // within 7 days past target (safety)
              processing.add(rem.id);
              await sendReminderRepeatedly(client, userId, rem, repeatTimes, repeatDelay);
              list.splice(i, 1);
              changed = true;
              processing.delete(rem.id);
              continue;
            } else {
              // not yet time
              continue;
            }
          } else {
            // recurring
            if (!rem.time || !rem.days) {
              // skip invalid recurring
              console.warn(`Recurring reminder ${rem.id} missing time/days, skipping`);
              continue;
            }
            if (rem.time === timeNowHHMM) {
              if (rem.days.includes("everyday") || rem.days.includes(dayName)) {
                processing.add(rem.id);
                console.log(`⏳ Triggering recurring reminder ${rem.id} for ${userId} at ${rem.time} on ${dayName}`);
                await sendReminderRepeatedly(client, userId, rem, repeatTimes, repeatDelay);
                // remove after sending per request
                list.splice(i, 1);
                changed = true;
                processing.delete(rem.id);
                continue;
              }
            }
          }
        }
      }

      if (changed) {
        try {
          // backup before saving
          const backupPath = remindersPath + ".bak";
          safeWrite(backupPath, JSON.stringify(reminders, null, 2));
        } catch (e) {
          console.warn("Could not write backup:", e && e.message ? e.message : e);
        }
        saveReminders(reminders);
      }
    } catch (err) {
      console.error("Error inside reminder checker loop:", err && err.stack ? err.stack : err);
    }
  }, intervalSec * 1000);
}

module.exports = {
  addReminder,
  removeReminder,
  removeReminderById,
  getUserReminders,
  checkReminders,
};

// Author : Dreams Akanza
// End of Code