import axios from "axios";

const TOKEN = process.env.DISCORD_TOKEN;  // from GitHub Secret

export async function sendMessage(channelId, content) {
  try {
    const url = `https://discord.com/api/v9/channels/${channelId}/messages`;

    const res = await axios.post(
      url,
      { content },
      {
        headers: {
          "Authorization": `${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Sent "${content}" to channel ${channelId} at`, new Date().toISOString());
    return res.data;
  } catch (err) {
    console.error("❌ Error sending:", err.response?.data || err.message);
    throw err;
  }
}