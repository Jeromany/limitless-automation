const axios = require('axios');

async function run() {
  console.log("Starting Sunday Night Recap...");

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  const logoPublicId = process.env.CLOUDINARY_LOGO_ID;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const makeWebhook = process.env.MAKE_WEBHOOK_URL;
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;

  // 1. Fetch 1 Month of Daily Data to calculate the week's stats
  const currentTime = new Date().getTime();
  console.log("Fetching weekly Gold data...");
  const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=1mo&interval=1d&_=${currentTime}`, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const result = response.data.chart.result[0];
  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];
  
  const historical = timestamps.map((time, i) => ({
    date: new Date(time * 1000).toISOString().split('T')[0],
    close: quotes.close[i],
    high: quotes.high[i],
    low: quotes.low[i]
  })).filter(d => d.close !== null);

  // Get the last 5 trading days (approx 1 week)
  const last5Days = historical.slice(-5);
  const weekHigh = Math.max(...last5Days.map(d => d.high)).toFixed(2);
  const weekLow = Math.min(...last5Days.map(d => d.low)).toFixed(2);
  const weekOpen = last5Days[0].close;
  const currentPrice = last5Days[last5Days.length - 1].close;
  
  const weeklyChange = currentPrice - weekOpen;
  const weeklyChangePercent = ((weeklyChange / weekOpen) * 100).toFixed(2);
  const changeSign = weeklyChange >= 0 ? '+' : '';
  const emoji = weeklyChange >= 0 ? '🟢' : '';

  // 2. Build the Weekly Chart Config
  const chartConfig = {
    type: 'line',
    data: {
      labels: last5Days.map(d => d.date.substring(5)),
      datasets: [
        { label: 'Weekly Gold Price', data: last5Days.map(d => d.close), borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.2)', borderWidth: 4, fill: true, pointRadius: 5, pointBackgroundColor: '#FFD700', tension: 0.1 }
      ]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#FFFFFF', font: { size: 14 } } },
        title: { display: true, text: 'LIMITLESS JOURNEYS | WEEKLY GOLD WRAP-UP', color: '#FFD700', font: { size: 22, weight: 'bold' } }
      },
      scales: {
        x: { ticks: { color: '#FFFFFF', font: { size: 12 } }, grid: { color: '#333333' } },
        y: { position: 'right', ticks: { color: '#FFFFFF', font: { size: 12 } }, grid: { color: '#333333' } }
      }
    },
    backgroundColor: '#000000', width: 1200, height: 800, format: 'png'
  };

  // 3. Generate and Upload Chart
  console.log("Generating weekly chart...");
  const chartResponse = await axios.post('https://quickchart.io/chart/create', { chart: chartConfig });
  const chartUrl = chartResponse.data.url;

  console.log("Uploading to Cloudinary...");
  const uploadResponse = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    file: chartUrl, upload_preset: uploadPreset, folder: 'gold_charts'
  });
  const publicId = uploadResponse.data.public_id;
  const finalImageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/l_${logoPublicId},w_200,g_south_east,x_20,y_20/${publicId}.png`;

  // 4. Format the Sunday Wrap-Up Message
  const finalMessage = `📊 *WEEKLY GOLD WRAP-UP*\n\n${emoji} *Weekly Change:* $${changeSign}${weeklyChange.toFixed(2)} (${changeSign}${weeklyChangePercent}%)\n\n📈 *Week's High:* $${weekHigh}\n📉 *Week's Low:* $${weekLow}\n *Current Price:* $${currentPrice.toFixed(2)}\n\n━━━━━━━━━━━━━━━━━━\n *LIMITLESS JOURNEYS INSIGHT:*\nWhether Gold rallied or retraced this week, the key is to respect the structure. Mark this week's High and Low on your chart—these are your primary liquidity targets for the upcoming week.\n\n📚 *PREPARE FOR MONDAY:*\nGrab your free Weekly Roadmap and map your bias before the NY open:\nhttps://bit.ly/LJ-Roadmap\n━━━━━━━━━━━━━━━━━━\n\n#LimitlessJourneysClub #GoldTrading #WeeklyRecap #XAUUSD #ForexAnalysis`;

  // 5. Send to Telegram
  console.log("Sending to Telegram...");
  await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    chat_id: chatId,
    photo: finalImageUrl,
    caption: finalMessage,
    parse_mode: "Markdown"
  });

  // 6. Send to Make.com
  if (makeWebhook && makeWebhook !== 'none') {
    console.log("Sending to Make.com...");
    await axios.post(makeWebhook, {
      caption: finalMessage,
      chartImageUrl: finalImageUrl
    });
  }

  // 7. Send to Discord
  if (discordWebhook && discordWebhook !== 'none' && discordWebhook !== undefined) {
    console.log("Sending to Discord...");
    await axios.post(discordWebhook, {
      content: finalMessage,
      embeds: [{
        image: { url: finalImageUrl },
        color: 16766720 // Gold color
      }]
    });
  }

  console.log("✅ Sunday Recap completed successfully!");
}

run().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
