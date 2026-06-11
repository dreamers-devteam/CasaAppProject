// commands/download.js (improved auto-discover endpoints + safer replies)
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const os = require('os');

const RAPIDAPI_KEY = '521b3dda8bmsh6c1b1c01ced76bdp1fa773jsnd9febdf8ef48';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

// possible host values observed on RapidAPI for similar APIs
const HOST_CANDIDATES = [
  'all-social-media-video-downloader.p.rapidapi.com',
  'social-download-all-in-one.p.rapidapi.com',
  'all-in-one-video-downloader.p.rapidapi.com',
  'download-all-in-one.p.rapidapi.com',
  'social-media-video-downloader.p.rapidapi.com',
];

// possible endpoint paths to try (note: order matters - most likely first)
const PATH_CANDIDATES = [
  '/download',
  '/v1/social/media',
  '/v1/social/autolink',
  '/v1/social/media',
  '/v1/social',
  '/api/download',
  '/v1/social/download',
  '/v1/socials/download',
  '/v1/social-media',
  '/v1/media',
  '/api/v1/download'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('download')
    .setDescription('Download foto/video dari YouTube, TikTok, Instagram, Facebook, atau Pinterest.')
    .addStringOption(o => o.setName('platform').setDescription('Pilih platform').setRequired(true)
      .addChoices(
        { name: 'YouTube', value: 'youtube' },
        { name: 'TikTok', value: 'tiktok' },
        { name: 'Instagram', value: 'instagram' },
        { name: 'Facebook', value: 'facebook' },
        { name: 'Pinterest', value: 'pinterest' },
      ))
    .addStringOption(o => o.setName('url').setDescription('Link video / foto (gunakan full link, bukan shortlink)').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const platform = interaction.options.getString('platform');
    const url = interaction.options.getString('url');

    try {
      if (!/^https?:\/\//i.test(url)) {
        return await interaction.editReply('URL tidak valid. Harus diawali http/https.');
      }

      // YOUTUBE - use ytdl-core
      if (platform === 'youtube') {
        if (!ytdl.validateURL(url)) {
          return await interaction.editReply('URL YouTube tidak valid.');
        }

        const info = await ytdl.getInfo(url);
        const video = info.videoDetails;
        const meta = {
          title: video.title || 'YouTube Video',
          author: (video.author && video.author.name) || 'Unknown',
          views: video.viewCount || 'Unknown',
          uploadDate: video.uploadDate || 'Unknown',
        };

        const filename = sanitize(`${meta.title}-${meta.author}.mp4`);
        const filePath = path.join(os.tmpdir(), filename);

        // download best video stream
        const stream = ytdl(url, { quality: 'highestvideo' });
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream);

        await new Promise((resolve, reject) => {
          stream.on('end', resolve);
          stream.on('error', reject);
          writeStream.on('error', reject);
        });

        const size = fs.statSync(filePath).size;
        if (size > MAX_UPLOAD_BYTES) {
          await interaction.editReply(`**${meta.title}**
• Author: ${meta.author}
• Views: ${meta.views}
• Upload: ${meta.uploadDate}
File terlalu besar (${(size/1024/1024).toFixed(2)} MB). Saya tidak bisa mengunggah ke Discord. Simpan di: \`${filePath}\``);
        } else {
          const attachment = new AttachmentBuilder(filePath);
          await interaction.editReply({ content: `✅ **${meta.title}**\n• Author: ${meta.author}\n• Views: ${meta.views}\n• Upload: ${meta.uploadDate}`, files: [attachment] });
        }

        try { fs.unlinkSync(filePath); } catch (e) {}
        return;
      }

      // For other platforms: try multiple host+path combos
      let resp = null;
      let usedHost = null;
      let usedPath = null;
      for (const host of HOST_CANDIDATES) {
        for (const p of PATH_CANDIDATES) {
          const fullUrl = `https://${host}${p}`;
          try {
            const r = await axios.post(fullUrl, { url }, {
              headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': host,
              },
              timeout: 20000,
              validateStatus: s => s < 500 // let us handle 4xx
            });

            // if 200 and response body looks like media, accept it
            if (r.status >= 200 && r.status < 300) {
              resp = r;
              usedHost = host;
              usedPath = p;
              break;
            }

            // try next
          } catch (err) {
            console.log(`Error calling ${fullUrl}:`, err.message);
            // try next
          }
        }
        if (resp) break;
      }

      if (!resp) {
        return await interaction.editReply(
          'Gagal menemukan endpoint RapidAPI yang cocok ' +
          'Silakan buka dashboard RapidAPI (EndPoints tab) untuk "Social Download All In One" dan pastikan host + path yang benar — atau kirim saya teks contoh cURL dari playground supaya saya bisa sesuaikan.'
        );
      }

      console.log('Successful endpoint:', usedHost + usedPath);

      const data = resp.data;
      // normalize possible shapes: many APIs return data.medias / data.data / data.files
      let mediaArray = data.medias || data.data?.medias || data.files || data.data?.files || data.downloads || data.data;
      if (!Array.isArray(mediaArray)) {
        // sometimes returned as object with "media" or "result"
        if (Array.isArray(data)) mediaArray = data;
        else if (data.media) mediaArray = Array.isArray(data.media) ? data.media : [data.media];
        else if (data.data && Array.isArray(data.data)) mediaArray = data.data;
        else mediaArray = [];
      }

      if (!mediaArray.length) {
        // send a short, safe message (do not dump huge JSON)
        console.log('API returned but no media array. Full response:', JSON.stringify(data).slice(0, 2000));
        return await interaction.editReply('API berhasil diakses tapi tidak menemukan media yang bisa diunduh. Coba gunakan full link (bukan shortlink) atau kirim contoh response dari playground RapidAPI.');
      }

      // pick first media with url
      const media = mediaArray.find(m => m.url || m.download || m.link) || mediaArray[0];
      const fileUrl = media.url || media.download || media.link;
      const quality = media.quality || media.resolution || 'unknown';
      const type = media.type || media.mime || 'video';
      const title = sanitize(data.title || data.name || 'download');

      if (!fileUrl) {
        return await interaction.editReply('Tidak menemukan URL file pada response API.');
      }

      // try HEAD to get size
      let fileSize = 0;
      try {
        const head = await axios.head(fileUrl, { timeout: 15000 });
        fileSize = parseInt(head.headers['content-length'] || '0', 10);
      } catch (e) {
        fileSize = 0;
      }

      if (fileSize > MAX_UPLOAD_BYTES) {
        return await interaction.editReply(`Ditemukan media: **${title}**\n• Type: ${type}\n• Quality: ${quality}\nUkuran ${(fileSize/1024/1024).toFixed(2)} MB melebihi batas unggah. Berikut direct link:\n${fileUrl}`);
      }

      // download and send
      const ext = path.extname(new URL(fileUrl).pathname) || '.mp4';
      const tmpPath = path.join(os.tmpdir(), `${title}${ext}`);
      const writer = fs.createWriteStream(tmpPath);
      const streamResp = await axios({ url: fileUrl, method: 'GET', responseType: 'stream', timeout: 30000 });
      streamResp.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const attachment = new AttachmentBuilder(tmpPath);
      await interaction.editReply({ content: `**${title}**\n• Type: ${type}\n• Quality: ${quality}`, files: [attachment] });

      try { fs.unlinkSync(tmpPath); } catch (e) {}

    } catch (err) {
      console.error('Download command error:', err);
      // reply safely
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(`Terjadi error: ${err.message}`);
        } else {
          await interaction.reply(`Terjadi error: ${err.message}`);
        }
      } catch (e) {
        console.error('Failed to send error reply:', e);
      }
    }
  }
};

function sanitize(s) {
  return String(s).replace(/[\\/:*?"<>|]/g, '_').slice(0, 180);
}
