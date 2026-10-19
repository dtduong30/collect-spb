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
  },
};
