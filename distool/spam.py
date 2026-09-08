import os
import random
import time

import requests

CHANNEL_ID = "753197813743222784"
URL = f"https://discord.com/api/v9/channels/{CHANNEL_ID}/messages"
CONTENTS = [":catyes:", ":pepsansang:", ":nice:"]
HEADERS = {
    "Authorization": os.environ["DISCORD_TOKEN"],
    "Content-Type": "application/json",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) discord/0.0.402 "
        "Chrome/138.0.7204.251 Electron/37.6.0 Safari/537.36"
    ),
}


def send_message():
    payload = {
        "mobile_network_type": "unknown",
        "content": random.choice(CONTENTS),
        "nonce": str(random.randint(10**17, 10**18 - 1)),
        "tts": False,
        "flags": 0,
    }
    resp = requests.post(URL, headers=HEADERS, json=payload)
    print(resp.status_code, resp.text[:200])


if __name__ == "__main__":
    try:
        while True:
            send_message()
            time.sleep(10)
    except KeyboardInterrupt:
        pass
