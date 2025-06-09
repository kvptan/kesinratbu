require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const express = require("express");
const puppeteer = require("puppeteer");
const app = express();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot aktif!"));
app.listen(PORT, () => console.log(`Web sunucusu çalışıyor: ${PORT}`));

// İzleyici kontrol
let viewers = [];
let isWatching = false;

async function createViewer(link) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(link);

  const interval = setInterval(async () => {
    try {
      await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
    } catch (e) {
      console.error("Sayfa yenileme hatası:", e);
    }
  }, 10000); // 10 saniyede bir yenile

  viewers.push({ browser, page, interval });
}

async function stopViewers() {
  for (const viewer of viewers) {
    clearInterval(viewer.interval);
    await viewer.browser.close();
  }
  viewers = [];
  isWatching = false;
}

client.on("ready", () => {
  console.log(`Bot giriş yaptı: ${client.user.tag}`);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot || !msg.content.startsWith("!")) return;

  const args = msg.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  if (command === "!izlenme") {
    const url = args[1];
    const count = parseInt(args[2]) || 1;

    if (!url || !url.startsWith("http")) {
      return msg.reply("❌ Lütfen geçerli bir link girin. Örnek: `!izlenme https://site.com 5`");
    }

    if (count > 50) return msg.reply("⚠️ Maksimum 50 izleyici açabilirsiniz.");
    if (isWatching) return msg.reply("❌ Zaten izlenme işlemi başlatıldı. Önce `!durdur` ile durdurun.");

    isWatching = true;
    msg.reply(`✅ ${count} izleyici başlatılıyor...`);

    for (let i = 0; i < count; i++) {
      createViewer(url);
    }
  }

  if (command === "!durdur") {
    if (!isWatching) return msg.reply("❌ Şu anda çalışan bir izlenme işlemi yok.");
    await stopViewers();
    msg.reply("🛑 Tüm izleyiciler durduruldu.");
  }

  if (command === "!komutlar" || command === "!yardım") {
    msg.reply(`
📜 **Komutlar Menüsü**
━━━━━━━━━━━━━━━━━━
🔹 \`!izlenme <link> <sayı>\` → Belirtilen linke izleyici gönderir. Örn: \`!izlenme https://site.com 5\`
🔹 \`!durdur\` → Açılmış olan tüm izleyicileri kapatır.
🔹 \`!komutlar\` → Yardım menüsünü gösterir.
━━━━━━━━━━━━━━━━━━
⚠️ Uyarı: Render'da maksimum 50 izleyici önerilir.
`);
  }
});

client.login(process.env.TOKEN);
