const axios = require('axios');

async function run() {
  console.log("Starting Weekly Analytics Report...");

  const token = process.env.BITLY_API_TOKEN;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // UPDATED: Use 'bit.ly/...' format (Official Bitly API v4 standard)
  const linksToTrack = [
    { name: "Weekly Gold Roadmap", url: "bit.ly/LJ-Roadmap" },
    { name: "Gold Trader's Blueprint", url: "bit.ly/LJ-Blueprint" },
    { name: "Mastering Swing Trading", url: "bit.ly/LJ-SwingTrading" },
    { name: "Limitless Club Bundle", url: "bit.ly/458wzTk" },
    { name: "Limitless App / Other", url: "bit.ly/3SVR575" }
  ];

  let reportMessage = "📊 *WEEKLY LINK ANALYTICS REPORT*\n\n";
  let totalClicks = 0;

  for (const link of linksToTrack) {
    try {
      // Bitly API v4 expects the format: /v4/bitlinks/bit.ly/xxxxx/clicks
      const apiUrl = `https://api-ssl.bitly.com/v4/bitlinks/${link.url}/clicks?unit=week&units=4`;
      console.log(`Fetching: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const clicks = response.data.link_clicks || 0;
      totalClicks += clicks;
      
      reportMessage += `🔗 *${link.name}*\n`;
      reportMessage += `Clicks: ${clicks}\n\n`;
      
    } catch (error) {
      const status = error.response ? error.response.status : 'No Response';
      const data = error.response ? error.response.data : error.message;
      console.log(`❌ ERROR for ${link.name}: Status ${status}`, JSON.stringify(data, null, 2));
      
      reportMessage += `🔗 *${link.name}*\n`;
      reportMessage += `Clicks: ⚠️ Error (Status: ${status})\n\n`;
    }
  }

  reportMessage += `━━━━━━━━━━━━━━━━━━\n`;
  reportMessage += `🏆 *TOTAL CLICKS THIS WEEK:* ${totalClicks}\n`;
  reportMessage += `━━━━━━━━━━━━━━━━━━\n\n`;
  reportMessage += `💡 *ACTION ITEM:* Focus your energy this week on the platform with the highest clicks!`;

  console.log("Sending report to Telegram...");
  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: reportMessage,
    parse_mode: "Markdown"
  });

  console.log("✅ Analytics report sent successfully!");
}

run().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
