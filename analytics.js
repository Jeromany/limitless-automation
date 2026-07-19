const axios = require('axios');

async function run() {
  console.log("Starting Weekly Analytics Report (Short.io)...");

  const apiKey = process.env.SHORTIO_API_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const domainName = "ljc.s.gy"; 

  // Your exact Payhip destination URLs
  const linksToTrack = [
    { 
      name: "Weekly Gold Roadmap", 
      shortUrl: `https://${domainName}/roadmap`, 
      originalUrl: "https://payhip.com/b/9Y4Mb" 
    },
    { 
      name: "Gold Trader's Blueprint", 
      shortUrl: `https://${domainName}/blueprint`, 
      originalUrl: "https://payhip.com/b/fteFc" 
    },
    { 
      name: "Mastering Swing Trading", 
      shortUrl: `https://${domainName}/swing`, 
      originalUrl: "https://payhip.com/b/dGWiO" 
    },
    { 
      name: "Limitless Club Bundle", 
      shortUrl: `https://${domainName}/bundle`, 
      originalUrl: "https://payhip.com/b/XsFC7" 
    },
    { 
      name: "Limitless App / Other", 
      shortUrl: `https://${domainName}/app`, 
      originalUrl: "https://payhip.com/LimitlessJourneysClub" 
    }
  ];

  let reportMessage = "📊 *WEEKLY LINK ANALYTICS REPORT*\n\n";
  let totalClicks = 0;

  try {
    // STEP 1: Get the list of domains from Short.io
    console.log(`Fetching domains from Short.io...`);
    const domainResponse = await axios.get('https://api.short.io/api/domains', {
      headers: {
        "Authorization": apiKey,
        "accept": "application/json"
      }
    });
    
    // DEBUG: Print the ENTIRE raw response from Short.io to see what's really happening
    console.log("🔍 RAW SHORT.IO RESPONSE:", JSON.stringify(domainResponse.data, null, 2));
    
       // FIX: Short.io returns an array directly, not an object with a 'domains' key
   const domains = Array.isArray(domainResponse.data) ? domainResponse.data : (domainResponse.data.domains || []);
   console.log("🔍 DOMAINS FOUND:", domains.map(d => d.hostname));

    const targetDomain = domains.find(d => d.hostname === domainName);

    if (!targetDomain) {
      throw new Error(`Domain '${domainName}' not found. Please check the 'RAW SHORT.IO RESPONSE' in the logs above.`);
    }

    const domainId = targetDomain.id;
    console.log(`✅ Found domain ID for ${domainName}: ${domainId}`);

    // STEP 2: Get links using the numeric domain_id
    console.log(`Fetching links for domain ID: ${domainId}...`);
    const linksResponse = await axios.get(`https://api.short.io/api/links?domain_id=${domainId}`, {
      headers: {
        "Authorization": apiKey,
        "accept": "application/json"
      }
    });

       const allLinks = linksResponse.data.links || [];
console.log(`✅ Found ${allLinks.length} links in Short.io account.`);

// DEBUG: Print the ENTIRE first link object to see the EXACT property name Short.io uses
if (allLinks.length > 0) {
  console.log("🔍 EXACT SHORT.IO LINK DATA:", JSON.stringify(allLinks[0], null, 2));
}

    for (const target of linksToTrack) {
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
