const axios = require('axios');

async function run() {
  console.log("Starting Weekly Analytics Report (Short.io)...");

  const apiKey = process.env.SHORTIO_API_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // UPDATED: Your exact Payhip destination URLs
  const linksToTrack = [
    { 
      name: "Weekly Gold Roadmap", 
      shortUrl: "https://ljc.s.gy/roadmap", // Update this to your actual Short.io link
      originalUrl: "https://payhip.com/b/9Y4Mb" 
    },
    { 
      name: "Gold Trader's Blueprint", 
      shortUrl: "https://ljc.s.gy/blueprint", 
      originalUrl: "https://payhip.com/b/fteFc" 
    },
    { 
      name: "Mastering Swing Trading", 
      shortUrl: "https://ljc.s.gy/swing", 
      originalUrl: "https://payhip.com/b/dGWiO" 
    },
    { 
      name: "Limitless Club Bundle", 
      shortUrl: "https://ljc.s.gy/bundle", 
      originalUrl: "https://payhip.com/b/XsFC7" 
    },
    { 
      name: "Limitless App / Other", 
      shortUrl: "https://ljc.s.gy/app", 
      originalUrl: "https://payhip.com/LimitlessJourneysClub" // Update this if your 5th link points somewhere else!
    }
  ];

  let reportMessage = "📊 *WEEKLY LINK ANALYTICS REPORT*\n\n";
  let totalClicks = 0;

  try {
    // Fetch all links and their stats from Short.io
    console.log("Fetching data from Short.io...");
    const response = await axios.get('https://api.short.io/links', {
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json"
      }
    });

    const allLinks = response.data.links || [];

    for (const target of linksToTrack) {
      // Find the matching short link in the Short.io data by comparing originalUrl
      const matchedLink = allLinks.find(l => l.originalUrl === target.originalUrl);
      
      if (matchedLink) {
        const clicks = matchedLink.clicks || 0;
        totalClicks += clicks;
        reportMessage += `🔗 *${target.name}*\n`;
        reportMessage += `Clicks: ${clicks}\n`;
        reportMessage += `Link: ${matchedLink.shortURL}\n\n`;
      } else {
        reportMessage += `🔗 *${target.name}*\n`;
        reportMessage += `Clicks: ⚠️ Link not found (Check Short.io setup)\n\n`;
      }
    }

    reportMessage += `━━━━━━━━━━━━━━━━━━\n`;
    reportMessage += `🏆 *TOTAL CLICKS:* ${totalClicks}\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━━\n\n`;
    reportMessage += `💡 *ACTION ITEM:* Focus your energy this week on the platform with the highest clicks!`;

    console.log("Sending report to Telegram...");
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: reportMessage,
      parse_mode: "Markdown"
    });

    console.log("✅ Analytics report sent successfully!");
  } catch (error) {
    console.error("❌ Fatal Error:", error.response ? error.response.data : error.message);
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: `❌ Analytics Report Failed:\n\`\`\`${error.message}\`\`\``,
      parse_mode: "Markdown"
    });
  }
}

run();
