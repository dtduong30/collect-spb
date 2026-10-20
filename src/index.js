async function notifyTelegram(env, text) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
  });
  if (!res.ok) console.error(`Telegram ${res.status}: ${await res.text()}`);
}

export default {
  async scheduled(event, env) {
    let error;
    try {
      const res = await fetch(`https://discord.com/api/v9/channels/${env.CHANNEL_ID}/messages`, {
        method: "POST",
        headers: {
          Authorization: env.DISCORD_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: env.CONTENT }),
      });
      if (!res.ok) error = `Discord ${res.status}: ${(await res.text()).slice(0, 300)}`;
    } catch (e) {
      error = `Discord request failed: ${e.message}`;
    }

    // Silent on success; only failures reach Telegram.
    if (!error) {
      console.log(`Sent "${env.CONTENT}" to channel ${env.CHANNEL_ID}`);
      return;
    }
    await notifyTelegram(env, `❌ collect-spb: "${env.CONTENT}" failed\n${error}`);
    // Throwing marks the cron run as failed in the dashboard.
    throw new Error(error);
  },
};
