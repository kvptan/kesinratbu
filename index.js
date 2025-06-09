const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const puppeteer = require('puppeteer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let browser;
let pages = [];
let intervalId;

app.get('/', (req, res) => {
  res.send('Bot is running.');
});

client.once('ready', () => {
  console.log(`Bot giriş yaptı: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // !komutlar
  if (message.content === '!komutlar') {
    return message.reply(
      `📋 **Komutlar Listesi**\n\n` +
      `🔹 \`!izlenme <URL> <sayı>\`\n` +
      `  Belirtilen URL'yi verilen sayı kadar açar ve her 10 saniyede bir yeniler.\n\n` +
      `🔹 \`!durdur\`\n` +
      `  Tüm açık sayfaları kapatır ve işlemleri durdurur.\n\n` +
      `🔹 \`!eylemler\`\n` +
      `  Şu anda izlenen sayfaları ve toplam sayfa sayısını gösterir.\n\n` +
      `🔹 \`!komutlar\`\n` +
      `  Tüm mevcut komutları ve açıklamalarını listeler.`
    );
  }

  // !eylemler
  if (message.content === '!eylemler') {
    if (pages.length === 0) {
      return message.reply('🔍 Şu anda izlenen hiçbir sayfa yok.');
    }

    const list = pages.map((p, i) => `🔸 [${i + 1}] ${p.url}`).join('\n');
    return message.reply(`🎯 **Şu anda izlenen sayfalar (${pages.length})**:\n\n${list}`);
  }

  // !izlenme <url> <sayı>
  if (message.content.startsWith('!izlenme')) {
    const args = message.content.split(' ').slice(1);
    if (args.length !== 2) {
      return message.reply('❗ Doğru kullanım: `!izlenme <URL> <kaç sayfa açılsın>`');
    }

    const [url, countStr] = args;
    const count = parseInt(countStr);
    if (isNaN(count) || count <= 0 || count > 50) {
      return message.reply('❗ Sayfa sayısı 1 ile 50 arasında bir sayı olmalıdır.');
    }

    message.reply(`✅ ${count} adet izleyici ${url} adresine bağlanıyor ve her 10 saniyede bir yenilenecek.`);

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1280,720'
        ]
      });

      for (let i = 0; i < count; i++) {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        console.log(`Açıldı: ${url} [${i + 1}]`);
        pages.push({ url, page });
      }

      intervalId = setInterval(async () => {
        for (const { url, page } of pages) {
          try {
            await page.reload({ waitUntil: 'domcontentloaded' });
            console.log(`Yenilendi: ${url}`);
          } catch (err) {
            console.error(`Yenileme hatası (${url}):`, err.message);
          }
        }
      }, 10000);

    } catch (err) {
      console.error(err);
      message.reply('❌ Sayfalar açılırken hata oluştu.');
    }
  }

  // !durdur
  if (message.content === '!durdur') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    if (pages.length > 0) {
      for (const { page } of pages) {
        try {
          await page.close();
        } catch (err) {
          console.error('Sayfa kapatma hatası:', err.message);
        }
      }
      pages = [];
    }

    if (browser) {
      try {
        await browser.close();
        browser = null;
      } catch (err) {
        console.error('Tarayıcı kapatma hatası:', err.message);
      }
    }

    message.reply('⛔ Tüm işlemler durduruldu ve sayfalar kapatıldı.');
  }
});

app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
