export default {
  async scheduled(event, env) {
    const res = await fetch(`https://discord.com/api/v9/channels/${env.CHANNEL_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: env.DISCORD_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: env.CONTENT }),
    });

    // Throwing marks the cron run as failed in the dashboard.
    if (!res.ok) throw new Error(`Discord ${res.status}: ${await res.text()}`);
    console.log(`Sent "${env.CONTENT}" to channel ${env.CHANNEL_ID}`);

    const time = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `✅ collect-spb: sent "${env.CONTENT}" · ${time}`,
      }),
    });
    // Collect already succeeded, so a Telegram failure is logged, not thrown.
    if (!tg.ok) console.error(`Telegram ${tg.status}: ${await tg.text()}`);
  },
};
