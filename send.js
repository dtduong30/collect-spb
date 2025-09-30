// send.js
import axios from "axios";

const TOKEN = process.env.DISCORD_TOKEN;  // read from GitHub Secrets
const CHANNEL_ID = process.env.CHANNEL_ID;

async function sendCollect() {
  try {
    const url = `https://discord.com/api/v9/channels/${CHANNEL_ID}/messages`;

    const res = await axios.post(
      url,
      { content: "$collect" },
      {
        headers: {
          "Authorization": `Bot ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Sent $collect at", new Date().toISOString());
  } catch (err) {
    console.error("❌ Error sending:", err.response?.data || err.message);
  }
}

await sendCollect();
