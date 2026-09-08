// Paste in Discord app/browser DevTools console (Ctrl+Shift+I), while logged in.
// Stop with: clearTimeout(discordSpamTimeout)

const CONTENTS = ["https://cdn.discordapp.com/emojis/1478285896175321169.png", 
  "https://cdn.discordapp.com/emojis/1013508516163637380.webp", 
  "https://cdn.discordapp.com/emojis/871197791676948521.webp",
  "https://cdn.discordapp.com/emojis/870656473758302219.webp",
  "https://cdn.discordapp.com/emojis/1057419950790283304.webp",
  "https://cdn.discordapp.com/emojis/1063353464375218216.webp"
];
const TOKEN = "USE LATER"; // Network tab -> any request -> Authorization header
// fill with the channel IDs to cycle through, refer spb_channel_id.js
const CHANNEL_IDS = [];

let lastContent = null;
// ** ** or __ __
function pickContent() {
  const base = CONTENTS[Math.floor(Math.random() * CONTENTS.length)].replace(/\?size=64$/, "");
  const item = `${base}?size=64`;
  if (item === lastContent && CONTENTS.length > 1) return pickContent();
  return (lastContent = item);
}

function sendMessage() {
  fetch(`https://discord.com/api/v9/channels/${CHANNEL_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mobile_network_type: "unknown",
      content: pickContent(),
      nonce: String(Math.floor(Math.random() * 9e17) + 1e17),
      tts: false,
      flags: 0,
    }),
  }).then((r) => console.log(r.status));
}

function testSend(channelId, deleteDelay = 2000) {
  fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mobile_network_type: "unknown",
      content: pickContent(),
      nonce: String(Math.floor(Math.random() * 9e17) + 1e17),
      tts: false,
      flags: 0,
    }),
  })
    .then(async (r) => {
      if (!r.ok) throw new Error(`send failed: ${r.status} ${await r.text()}`);
      return r.json();
    })
    .then((msg) => {
      console.log("sent", channelId, msg.id, `- deleting in ${deleteDelay}ms`);
      setTimeout(() => {
        fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${msg.id}`, {
          method: "DELETE",
          headers: { Authorization: TOKEN },
        })
          .then(async (r) => {
            if (r.ok) console.log("delete success, count:", ++deleteCount);
            else console.log("delete", r.status, await r.text());
          })
          .catch((e) => console.error("delete request failed", e));
      }, deleteDelay);
    })
    .catch((e) => console.error("testSend failed", e));
}


let channelIndex = 0;
let sendCount = 0;
let deleteCount = 0;

// startSpam(1315, 1060) -> sends up to (targetCount - 1 - currentCount) messages
function startSpam(targetCount, currentCount) {
  const maxSends = targetCount - 1 - currentCount;
  channelIndex = 0;
  sendCount = 0;
  if (typeof discordSpamTimeout !== "undefined") clearTimeout(discordSpamTimeout);
  function scheduleMulti() {
    if (sendCount >= maxSends) {
      console.log(`reached max sends (${maxSends}), stopping`);
      return;
    }
    discordSpamTimeout = setTimeout(() => {
      const channelId = CHANNEL_IDS[channelIndex % CHANNEL_IDS.length];
      channelIndex++;
      sendCount++;
      testSend(channelId, 3000);
      scheduleMulti();
    }, 15000);
  }
  scheduleMulti();
}
