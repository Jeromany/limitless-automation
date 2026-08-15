import os
import requests
import subprocess

# --- SOURCES (Single Source of Truth) ---
BRIEFING_URL = "https://raw.githubusercontent.com/jeromany/limitless-club-app/main/daily-briefing.json"
CHART_URL = "https://raw.githubusercontent.com/jeromany/limitless-club-app/main/chart.png"
LOGO_URL = "https://raw.githubusercontent.com/jeromany/limitless-club-app/main/logo.jpg"

GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
ELEVEN_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVEN_VOICE = os.environ.get("ELEVEN_VOICE_ID", "ktmJWjF5IjAfHmslWEWY")
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_CHAT = os.environ.get("TELEGRAM_CHAT_ID_PRIVATE", "")

def fetch_briefing():
    r = requests.get(BRIEFING_URL, timeout=15)
    r.raise_for_status()
    return r.json()

def download(url, path):
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    open(path, "wb").write(r.content)

def groq_chat(messages, temperature=0.7):
    r = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
        json={"model": "llama-3.3-70b-versatile", "messages": messages, "temperature": temperature},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()

def write_script(gold):
    tactical = gold.get('tacticalBias', 'neutral')
    prompt = f"""
You are Jasai, an institutional gold analyst, recording a 60-second vertical YouTube Short.
Today's data: price ${gold['currentPrice']} ({gold['priceChangePercent']}% today).
MACRO bias: {gold['bias']} (the long-term structural thesis).
TACTICAL bias: {tactical} (the short-term momentum based on EMAs).
support ${gold['support']}, resistance ${gold['resistance']}, 61.8 fib ${gold['fib618']}.
Full Analysis: {gold['analysis']}

Write the voiceover script (140-150 words, about 55 seconds spoken).
RULES:
- Write ALL numbers in spoken word form, rounded (example: "four thousand three hundred eighty dollars", never "$4,380.00").
- No symbols, no decimals, no emojis.
- Structure: Hook the listener by contrasting the Macro thesis with the Tactical momentum, give the current price, name one key level to watch, warn of the risk, sign-off "Follow for tomorrow's update."
- Sound like a calm institutional trader. Return ONLY the script text.
"""
    return groq_chat([{"role": "user", "content": prompt}])

def tts(text, out_path):
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE}",
        headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        json={"text": text, "model_id": "eleven_turbo_v2_5",
              "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}},
        timeout=120,
    )
    r.raise_for_status()
    open(out_path, "wb").write(r.content)

def build_video(chart, logo, audio, out):
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", chart,
        "-loop", "1", "-i", logo,
        "-i", audio,
        "-filter_complex",
        ("color=black:s=1080x1920[bg];"
         "[0:v]scale=1040:-2[ch];"
         "[bg][ch]overlay=(W-w)/2:(H-h)/2[t1];"
         "[1:v]scale=150:150[lg];"
         "[t1][lg]overlay=60:80[t2];"
         "[t2]drawtext=text='DAILY GOLD BRIEFING':fontcolor=0xFFD700:fontsize=64:x=(w-text_w)/2:y=300:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf[t3];"
         "[t3]drawtext=text='LIMITLESS JOURNEYS - TRADE WITHOUT LIMITS':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=1780:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest", "-t", "75",
        out,
    ]
    subprocess.run(cmd, check=True, capture_output=True)

def send_telegram(video_path, caption):
    url = f"https://api.telegram.org/bot{TG_TOKEN}/sendVideo"
    with open(video_path, "rb") as f:
        r = requests.post(url, data={"chat_id": TG_CHAT, "caption": caption},
                          files={"video": f}, timeout=120)
    print("Telegram:", r.status_code, r.text[:200])

def main():
    data = fetch_briefing()
    gold = data["gold"]
    download(CHART_URL, "chart.png")
    download(LOGO_URL, "logo.jpg")

    script = write_script(gold)
    print("SCRIPT:\n", script)

    tts(script, "voice.mp3")
    build_video("chart.png", "logo.jpg", "voice.mp3", "short.mp4")

    sign = "+" if gold["priceChangePercent"] > 0 else ""
    caption = (
        f"Daily Gold Briefing - {gold['bias'].upper()} bias\n"
        f"Gold {gold['currentPrice']} ({sign}{gold['priceChangePercent']}%)\n"
        f"Support {gold['support']} | Resistance {gold['resistance']}\n\n"
        "Full briefing in the Limitless app.\n"
        "#gold #xauusd #trading #limitlessjourneys"
    )
    send_telegram("short.mp4", caption)
    print("DONE")

if __name__ == "__main__":
    main()
