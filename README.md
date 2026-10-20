# collect-spb

Cloudflare Worker cron gửi `$collect` vào một channel Discord mỗi 2 tiếng (`0 */2 * * *`, UTC). Thay cho GitHub Action cũ (đã xoá 2026-10-19).

- Account Cloudflare: `duong.dangtuan@tribox.me's Account` (không phải account cá nhân).
- Code: `src/index.js`, config: `wrangler.toml`.
- `distool/` là các script chạy tay trong DevTools Discord, không liên quan Worker.

## Thông báo Telegram

Chỉ báo khi **lỗi**: Discord trả lỗi hoặc request không tới được → tin `❌ collect-spb: "$collect" failed` kèm status và nội dung lỗi, gửi qua bot `@rungdong_bot` (dùng chung với miracle). Chạy ổn thì im lặng.

Lượt lỗi cũng hiện `failed` trong dash → Workers → `collect-spb` → Logs.

## Secrets / biến

| Tên | Loại | Ghi chú |
|---|---|---|
| `DISCORD_TOKEN` | secret | Token tài khoản Discord (self-bot, có rủi ro bị khoá theo ToS Discord) |
| `CHANNEL_ID` | secret | Channel nhận `$collect` |
| `TELEGRAM_BOT_TOKEN` | secret | Token `@rungdong_bot` |
| `TELEGRAM_CHAT_ID` | secret | Chat nhận thông báo |
| `CONTENT` | var (`wrangler.toml`) | Mặc định `$collect` |

Đặt secret: `npx wrangler secret put <TÊN>`.

## Deploy

`.env` ở root (đã gitignore) chứa token Cloudflare của account tribox:

```
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=5dc36d58cab748149501801458d689e2
```

```bash
npx wrangler whoami   # phải là API Token + account tribox
npx wrangler deploy   # output phải có "schedule: 0 */2 * * *"
```

Xem log trực tiếp: `npx wrangler tail`.
