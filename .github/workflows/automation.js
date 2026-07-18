const axios = require('axios');

async function run() {
  console.log("Starting Daily Gold Automation...");

  // 1. Get Secrets from GitHub Environment
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  const logoPublicId = process.env.CLOUDINARY_LOGO_ID;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const makeWebhook = process.env.MAKE_WEBHOOK_URL;

  // 2. Fetch Fresh Gold Data (with cache-buster)
  const currentTime = new Date().getTime();
  console.log("Fetching Gold data...");
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

  // 3. Calculate Indicators
  const closes = historical.map(d => d.close);
  const highs = historical.map(d => d.high);
  const lows = historical.map(d => d.low);
  
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  
  const support = Math.min(...lows);
  const resistance = Math.max(...highs);
  const range = resistance - support;
  const fib618 = (support + (range * 0.618)).toFixed(2);
  
  const currentPrice = closes[closes.length - 1];
  const previousPrice = closes[closes.length - 2];
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = ((priceChange / previousPrice) * 100).toFixed(2);
  const changeSign = priceChange >= 0 ? '+' : '';

  // 4. Build Chart Config
  const chartConfig = {
    type: 'line',
    data: {
      labels: historical.map(d => d.date.substring(5)),
      datasets: [
        { label: 'Gold Price', data: closes, borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.15)', borderWidth: 3, fill: true, pointRadius: 0, tension: 0.1 },
        { label: '20 EMA', data: ema20, borderColor: '#00BFFF', borderWidth: 2, pointRadius: 0, borderDash: [5, 5], fill: false },
        { label: '50 EMA', data: ema50, borderColor: '#FF1493', borderWidth: 2, pointRadius: 0, borderDash: [10, 5], fill: false },
        { label: `Support ($${support.toFixed(2)})`, data: Array(historical.length).fill(support), borderColor: '#00C853', borderWidth: 2, pointRadius: 0, fill: false },
        { label: `Resistance ($${resistance.toFixed(2)})`, data: Array(historical.length).fill(resistance), borderColor: '#FF3D00', borderWidth: 2, pointRadius: 0, fill: false },
        { label: `Fib 61.8% ($${fib618})`, data: Array(historical.length).fill(parseFloat(fib618)), borderColor: '#FFFF00', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, fill: false }
      ]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#FFFFFF', font: { size: 12 } } },
        title: { display: true, text: 'LIMITLESS JOURNEYS CLUB | "Trade Without Limits"', color: '#FFD700', font: { size: 20, weight: 'bold' } }
      },
      scales: {
        x: { ticks: { color: '#FFFFFF', maxTicksLimit: 8 }, grid: { color: '#333333' } },
        y: { position: 'right', ticks: { color: '#FFFFFF' }, grid: { color: '#333333' } }
      }
    },
    backgroundColor: '#000000', width: 1200, height: 800, format: 'png'
  };

  // 5. Get Chart URL
  console.log("Generating chart...");
  const chartResponse = await axios.post('https://quickchart.io/chart/create', { chart: chartConfig });
  const chartUrl = chartResponse.data.url;

  // 6. Upload to Cloudinary
  console.log("Uploading to Cloudinary...");
  const uploadResponse = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    file: chartUrl, upload_preset: uploadPreset, folder: 'gold_charts'
  });
  const publicId = uploadResponse.data.public_id;
  const finalImageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/l_${logoPublicId},w_200,g_south_east,x_20,y_20/${publicId}.png`;

  // 7. Format Message
  const aiAnalysis = `Gold is currently trading at $${currentPrice.toFixed(2)} (${changeSign}${priceChangePercent}%). The market is respecting the $${support.toFixed(2)} support and $${resistance.toFixed(2)} resistance levels. Watch for a reaction at the 61.8% Fib level ($${fib618}) during the NY session.`;
  
  const ebooks = [
    { title: "The Weekly Gold Roadmap", price: "$17", link: "https://bit.ly/LJ-Roadmap" },
    { title: "The Gold Trader's Blueprint", price: "$37", link: "https://bit.ly/LJ-Blueprint" },
    { title: "Mastering Swing Trading", price: "$27", link: "https://bit.ly/LJ-SwingTrading" },
    { title: "🔥 The Complete Limitless Trader Bundle (SAVE 45%)", price: "$37", link: "https://bit.ly/LJ-Bundle" }
  ];
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const ebook = ebooks[dayOfYear % ebooks.length];

  const finalMessage = `Gold Update: Market Analysis\n\nPrice: $${currentPrice.toFixed(2)} (${changeSign}${priceChangePercent}%)\n\n${aiAnalysis}\n\n---\nLIMITLESS JOURNEYS ACADEMY\nToday's Guide: ${ebook.title}\nPrice: ${ebook.price}\nGet it now: ${ebook.link}\n---\n\n#LimitlessJourneysClub #GoldTrading #SwingTrading #XAUUSD #ForexAnalysis`;

  // 8. Send to Telegram
  console.log("Sending to Telegram...");
  await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    chat_id: chatId,
    photo: finalImageUrl,
    caption: finalMessage,
    parse_mode: "Markdown"
  });

  // 9. (Optional) Send to Make.com for FB/IG
  if (makeWebhook && makeWebhook !== 'none') {
    console.log("Sending to Make.com...");
    await axios.post(makeWebhook, {
      caption: finalMessage,
      chartImageUrl: finalImageUrl
    });
  }

  console.log("✅ Automation completed successfully!");
}

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

run().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
