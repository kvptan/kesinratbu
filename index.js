require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const puppeteer = require('puppeteer');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
  // ... diğer user-agent'lar (kısaltıldı, tam listeyi yukarıdaki koddan alabilirsin)
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Aktif izleyici eylemlerini tutar
// key = url, value = { url, active, viewers: [{id, browser}], count }
const actions = new Map();

async function simulateViewer(url, viewerId, action) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setUserAgent(getRandomUserAgent());
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log(`✅ İzleyici ${viewerId} yayın sayfasına bağlandı: ${url}`);

    action.viewers.push({ id: viewerId, browser });

    // İzleyici aktif olduğu sürece bekle
    while (action.active && action.viewers.some(v => v.id === viewerId)) {
      await new Promise(r => setTimeout(r, 5000));
    }

    // İzleyici kapatılıyor
    await browser.close();
    console.log(`❌ İzleyici ${viewerId} bağlantısı kapandı: ${url}`);

    // İzleyiciyi listeden çıkar
    action.viewers = action.viewers.filter(v => v.id !== viewerId);

    // Eğer izleyici kalmadıysa eylemi sil
    if (action.viewers.length === 0) {
      actions.delete(url);
      console.log(`⚠️ Eylem sona erdi ve silindi: ${url}`);
    }
  } catch (error) {
    console.error(`❌ İzleyici ${viewerId} hata verdi: ${error.message}`);
  }
}

client.on('ready', () => {
  console.log(`Bot aktif! Kullanıcı: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // Komut: !izlenme <url> <adet>
  if (content.startsWith('!izlenme')) {
    const parts = content.split(' ');
    if (parts.length < 3) {
      return message.reply('❗ Kullanım: !izlenme <yayın_linki> <izleyici_sayısı>');
    }

    const url = parts[1];
    const count = parseInt(parts[2]);
    if (isNaN(count) || count <= 0) {
      return message.reply('❗ Geçerli pozitif sayı girin.');
    }

    if (actions.has(url)) {
      return message.reply('❗ Bu link için zaten aktif bir izleyici eylemi var. Önce onu durdurun.');
    }

    // Yeni eylem oluştur
    const action = {
      url,
      active: true,
      viewers: [],
      count,
    };

    actions.set(url, action);

    message.reply(`🔄 ${url} adresi için ${count} izleyici simülasyonu başlatılıyor...`);

    // İzleyicileri başlat
    for (let i = 0; i < count; i++) {
      simulateViewer(url, i + 1, action);
      // Çok hızlı açarsan sorun olabilir, dilersen araya delay ekle
      await new Promise(r => setTimeout(r, 1000));
    }

    return;
  }

  // Komut: !dur <url>
  if (content.startsWith('!dur')) {
    const parts = content.split(' ');
    if (parts.length < 2) {
      return message.reply('❗ Kullanım: !dur <yayın_linki>');
    }
    const url = parts[1];
    const action = actions.get(url);
    if (!action) {
      return message.reply('❗ Bu link için aktif bir izleyici eylemi yok.');
    }

    action.active = false;

    message.reply(`🛑 ${url} adresindeki izleyici simülasyonu durduruldu.`);
    return;
  }
});

client.login(process.env.DISCORD_TOKEN);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
