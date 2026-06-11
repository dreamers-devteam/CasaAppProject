const defaultAllowedUsers = [
  "1296607581363634210", // Dreams [ Clevone Dev ]
  "759257347351904267", // Zhii [ Vice President ]
  "1400713584320712764", // AreaDreamers [ Backup Account]
  "1392358815596412949", // Masjii [ Backup Account ]
  "1250772631162978316" // Anzaa [ Mentri / Right Hand ]
  ];
  
  const defaultAllowedRoles = [
    "1415575422233481267", // Founder
    "1461611666126147584", // VP - Vice President
    "1435671899865743511", // DC - Dreamers Crew
    "1457115429528014960", // Division Tech
    "1456873822694277150", // Member Elite - Donatur Role
    "1456874530906574929", // Si Juragan - Donatur Role
    "1456874150491590759", // Sultan Server - Donatur Role
    "1428730690702151802", // Bangswan - Donatur Role
];
 
module.exports = function hasPermission(message, allowedUsers, allowedRoles) {
  if (!message || !message.author) return false;

  // 1️⃣ Ambil list fallback jika parameter tidak disediakan
  const users = Array.isArray(allowedUsers) && allowedUsers.length > 0
    ? allowedUsers
    : defaultAllowedUsers;

  const roles = Array.isArray(allowedRoles) && allowedRoles.length > 0
    ? allowedRoles
    : defaultAllowedRoles;

  // 2️⃣ Jika pengirim adalah bot → tolak
  if (message.author.bot) return false;

  // 3️⃣ Cek apakah user ID termasuk daftar global / lokal
  if (users.includes(message.author.id)) return true;

  // 4️⃣ Cek apakah user punya role yang diizinkan
  if (message.member && message.member.roles?.cache) {
    const hasRole = message.member.roles.cache.some((role) =>
      roles.includes(role.id)
    );
    if (hasRole) return true;
  }

  // 5️⃣ Tidak punya izin
  return false;
};

// Ekspor juga default list supaya bisa dipakai global lain kalau perlu
module.exports.defaultAllowedUsers = defaultAllowedUsers;
module.exports.defaultAllowedRoles = defaultAllowedRoles;
