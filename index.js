require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const puppeteer = require("puppeteer");
const express = require("express");

const app = express();
app.get("/", (req, res) => res.send("Bot aktif!"));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let pages = [];
let refreshInterval;
let isRunning = false;

client.once("ready", () => {
  console.log(`Bot ${client.user.tag} olarak giriş yaptı.`);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!")) return;

  const [command, ...args] = message.content.trim().split(" ");

  if (command === "!komutlar") {
    return message.channel.send(`
🛠 **Kullanılabilir Komutlar:**

📺 \`!izlenme <link> <sayı>\`
• Belirtilen linke izleyici gönderir (sayısı kadar sekme açılır).
• Örnek: \`!izlenme https://youtube.com/video 5\`

⏹️ \`!durdur\`
• Açık tüm sekmeleri kapatır ve işlemi durdurur.

🎬 \`!eylemler\`
• Aktif olan izleyici işlemlerini listeler.

📃 \`!komutlar\`
• Bu komutları tekrar listeler.
    `);
  }

  if (command === "!izlenme") {
    const [link, countStr] = args;
    const count = parseInt(countStr);

    if (!link || isNaN(count) || count <= 0 || count > 20) {
      return message.channel.send("Lütfen geçerli bir link ve 1-20 arasında sayı girin. Örnek: `!izlenme https://... 5`");
    }

    if (isRunning) {
      return message.channel.send("Zaten bir izleme işlemi aktif. Durdurmak için `!durdur` yaz.");
    }

    isRunning = true;
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    message.channel.send(`🎥 ${count} adet sekme açılıyor ve ${link} izleniyor.`);

    for (let i = 0; i < count; i++) {
      const page = await browser.newPage();
      await page.goto(link, { waitUntil: "networkidle2" });
      pages.push(page);
    }

    refreshInterval = setInterval(async () => {
      for (const page of pages) {
        try {
          await page.reload({ waitUntil: "networkidle2" });
        } catch (err) {
          console.error("Yenileme hatası:", err.message);
        }
      }
    }, 10000);
  }

  if (command === "!eylemler") {
    if (!isRunning || pages.length === 0) {
      return message.channel.send("Şu anda aktif bir işlem yok.");
    }
    return message.channel.send(`🟢 Şu anda ${pages.length} sekme aktif olarak yenileniyor.`);
  }

  if (command === "!durdur") {
    if (!isRunning) return message.channel.send("Zaten durdurulmuş.");

    clearInterval(refreshInterval);
    for (const page of pages) {
      try {
        await page.close();
      } catch (err) {
        console.error("Sayfa kapatma hatası:", err.message);
      }
    }
    pages = [];
    isRunning = false;
    return message.channel.send("⛔ Tüm sekmeler kapatıldı, izleme durduruldu.");
  }
});

client.login(process.env.TOKEN);
