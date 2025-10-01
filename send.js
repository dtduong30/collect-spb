import { sendMessage } from "./discord-api.js";

const channelId = process.env.CHANNEL_ID;
const content = process.env.CONTENT || "$collect";

if (!channelId) {
  console.error("❌ CHANNEL_ID env not set");
  process.exit(1);
}

await sendMessage(channelId, content);
