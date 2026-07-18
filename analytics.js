const axios = require('axios');

async function run() {
  console.log("Starting Weekly Analytics Report...");

  const token = process.env.BITLY_API_TOKEN;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // REPLACE THESE WITH YOUR ACTUAL 5 BITLY LINKS
  const linksToTrack = [
    { name: "Telegram Bundle", url: "https://bit.ly/LJ-Bundle-TG" },
    { name: "Discord Bundle", url: "https://bit.ly/LJ-Bundle-DC" },
    { name: "Social Media Bundle", url: "https://bit.ly/LJ-Bundle-SOCIAL" },
    { name: "Free Roadmap", url: "https://bit.ly/LJ-Roadmap" },
    { name: "Limitless App", url: "https://bit.ly/LJ-App" }
  ];

  let reportMessage = "📊 *WEEKLY LINK ANALYTICS REPORT*\n\n";
  let totalClicks = 0;

  for (const link of linksToTrack) {
    try {
      // Bitly API requires the full URL to fetch metrics
      const response = await axios.get(`https://api-ssl.bitly.com/v4/bitlinks/${encodeURIComponent(link.url)}/clicks?unit=week&units=4`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const clicks = response.data.link_clicks || 0;
      totalClicks += clicks;
      
      // Add to report
      reportMessage += `🔗 *${link.name}*\n`;
      reportMessage += `Clicks: ${clicks}\n\n`;
      
    } catch (error) {
      console.log(`Could not fetch data for ${link.name}. It might be a custom short link.`);
      reportMessage += `🔗 *${link.name}*\nClicks: Data unavailable\n\n`;
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
