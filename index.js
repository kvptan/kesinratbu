require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const puppeteer = require('puppeteer');
const express = require('express');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const app = express();
const PORT = process.env.PORT || 3000;

// Render ping için
app.get('/', (req, res) => {
  res.send('Bot Aktif!');
});

app.listen(PORT, () => {
  console.log(`Web sunucusu ${PORT} portunda çalışıyor`);
});

// Tarayıcı ve sekmelerin yönetimi
let browser;
let pages = [];
let refreshInterval;

// !izlenme komutu => !izlenme https://site.com 5
async function startWatching(url, count, message) {
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (let i = 0; i < count; i++) {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      pages.push(page);
    }

    message.channel.send(`🔁 ${count} sekme açıldı ve ${url} adresine gidildi. Sayfalar 10 saniyede bir yenilenecek.`);

    refreshInterval = setInterval(async () => {
      for (const page of pages) {
        try {
          await page.reload({ waitUntil: 'networkidle2' });
        } catch (err) {
          console.error('Yenileme hatası:', err.message);
        }
      }
    }, 10000);

  } catch (error) {
    console.error('Hata:', error.message);
    message.channel.send('❌ İzlenme başlatılamadı.');
  }
}

async function stopWatching(message) {
  try {
    if (refreshInterval) clearInterval(refreshInterval);
    for (const page of pages) await page.close();
    if (browser) await browser.close();

    pages = [];
    browser = null;
    message.channel.send('⛔ İzleme işlemi durduruldu.');
  } catch (error) {
    console.error('Durdurma hatası:', error.message);
    message.channel.send('❌ İzleme durdurulurken bir hata oluştu.');
  }
}

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!')) return;

  const args = message.content.trim().split(' ');
  const command = args[0].toLowerCase();

  if (command === '!izlenme') {
    if (args.length < 3) {
      return message.channel.send('❗ Doğru kullanım: `!izlenme <link> <sekmeSayısı>`');
    }
    const url = args[1];
    const count = parseInt(args[2]);

    if (!url.startsWith('http')) {
      return message.channel.send('❗ Geçerli bir bağlantı girin (http veya https ile başlamalı).');
    }

    if (isNaN(count) || count < 1 || count > 50) {
      return message.channel.send('❗ Lütfen 1-50 arasında bir sayı girin.');
    }

    startWatching(url, count, message);
  }

  else if (command === '!durdur') {
    stopWatching(message);
  }

  else if (command === '!komutlar') {
    message.channel.send(
      `📜 **Kullanılabilir Komutlar**\n\n` +
      `✅ \`!izlenme <link> <adet>\` → Verilen linki belirtilen sayıda sekmeyle izler, her 10 saniyede bir yeniler.\n` +
      `⛔ \`!durdur\` → Tüm sekmeleri kapatır ve yenilemeyi durdurur.\n` +
      `❓ \`!komutlar\` → Tüm komutları gösterir.`
    );
  }
});

client.once('ready', () => {
  console.log(`${client.user.tag} olarak giriş yapıldı.`);
});

client.login(process.env.TOKEN);
