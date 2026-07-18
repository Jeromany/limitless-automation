const axios = require('axios');

async function run() {
  console.log("Starting Weekly Analytics Report (Short.io)...");

  const apiKey = process.env.SHORTIO_API_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const domain = "ljc.s.gy"; // Your Short.io domain

  // Your exact Payhip destination URLs
  const linksToTrack = [
    { 
      name: "Weekly Gold Roadmap", 
      shortUrl: `https://${domain}/roadmap`, 
      originalUrl: "https://payhip.com/b/9Y4Mb" 
    },
    { 
      name: "Gold Trader's Blueprint", 
      shortUrl: `https://${domain}/blueprint`, 
      originalUrl: "https://payhip.com/b/fteFc" 
    },
    { 
      name: "Mastering Swing Trading", 
      shortUrl: `https://${domain}/swing`, 
      originalUrl: "https://payhip.com/b/dGWiO" 
    },
    { 
      name: "Limitless Club Bundle", 
      shortUrl: `https://${domain}/bundle`, 
      originalUrl: "https://payhip.com/b/XsFC7" 
    },
    { 
      name: "Limitless App / Other", 
      shortUrl: `https://${domain}/app`, 
      originalUrl: "https://payhip.com/LimitlessJourneysClub" 
    }
  ];

  let reportMessage = "📊 *WEEKLY LINK ANALYTICS REPORT*\n\n";
  let totalClicks = 0;

  try {
    // FIX: Added '/api/' to the URL path. The correct Short.io endpoint is /api/links
    console.log(`Fetching data from Short.io for domain: ${domain}...`);
    const response = await axios.get(`https://api.short.io/api/links?domain=${domain}`, {
      headers: {
        "Authorization": apiKey,
        "accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    const allLinks = response.data.links || [];
    console.log(`Found ${allLinks.length} links in Short.io account.`);

    for (const target of linksToTrack) {
      // Find the matching short link by comparing originalUrl
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
