# art-pulse (context-art-pulse/)

App cá nhân để lưu và tìm phim, video, site, thư mục và diễn viên của category Discord "Cinematic Realm". Thay cho các notepad online (protectedtext, sealnotes, hypernotepad). Dạng PWA chạy offline, đồng bộ qua Vercel + Neon, và đăng một chiều lên các forum Discord.

Không liên quan tới Worker `$collect` ở `src/`; chỉ dùng chung repo.

## Trạng thái (2026-11-25)

**Stage 1: spec bản nháp v2, chờ duyệt. Chưa có code app.**

| File | Nội dung |
|---|---|
| `docs/superpowers/specs/2026-11-25-art-pulse-design.md` | **Spec**: mục tiêu, schema SQL, giao thức sync, import, title fetch, Discord, UI, 13 tiêu chí nghiệm thu |
| `docs/superpowers/specs/2026-11-25-art-pulse-prototype-verdict.md` | Kết quả 2 vòng prototype UI: cái gì được giữ, cái gì bị loại và vì sao |
| `docs/superpowers/specs/art-pulse-prototype/` | Prototype tham khảo: `app.html` (UI đã chốt), `parse.js` (luật parse đã kiểm trên dữ liệu thật), `extract.py`. **Code thật không import từ đây.** |
| `distool/dump-tabs.js`, `dump-discord.js`, `setup-cinematic.js` | Script chạy trong DevTools để dump notepad, dump Discord và tạo forum + tag |
| `docs/FACTS.md` | Các sự thật và bẫy (grep, không đọc hết) |

## Làm tiếp trên máy khác

1. Pull repo rồi đọc `STATUS.md` (hoặc gõ `/kickoff` trong Claude Code).
2. **Chép dữ liệu riêng tư sang bằng tay.** Dữ liệu không nằm trên git (`.gitignore` có `context-art-pulse/raw/`). Từ máy cũ, chép cả thư mục `context-art-pulse/raw/` (9 file: 8 `.txt` notepad và `discord-cinematic-realm.json`) qua AirDrop, USB hoặc file zip có mật khẩu. **Không** gửi qua GitHub, Discord hay chat.
   - Không chép được thì dump lại (xem "Dump lại dữ liệu" bên dưới).
   - Kiểm tra: `wc -l context-art-pulse/raw/*.txt` phải ra tổng khoảng 1029 dòng.
3. Xem prototype:
   ```bash
   python3 -I docs/superpowers/specs/art-pulse-prototype/extract.py   # sinh raw/data.js
   open docs/superpowers/specs/art-pulse-prototype/app.html           # cần mạng lần đầu để tải MiniSearch
   ```
   PIN 18+ trong prototype là `1234`. Chạy được là thấy 4 tab Xem / Người / Nguồn / Hộp thư, tab Hộp thư có số khoảng 445.
4. Đọc spec rồi **duyệt spec và 13 tiêu chí nghiệm thu**. Sau đó lập kế hoạch triển khai (`superpowers:writing-plans`).

## Dump lại dữ liệu (khi cần cập nhật `raw/`)

Mọi script đều chỉ đọc, chạy trong DevTools Console (Cmd+Option+J trên Chrome, Cmd+Option+I trên Discord desktop). Nếu bị chặn dán thì gõ `allow pasting` trước.

| Nguồn | Cách làm | Kết quả |
|---|---|---|
| protectedtext / sealnotes / hypernotepad | Mở note, mở khoá, rồi dán `distool/dump-tabs.js` | `~/Downloads/<site>-<note>.txt`; mỗi tab là một khối `===== TAB: tên =====` |
| Discord Cinematic Realm | Mở một kênh bất kỳ của server trên Discord desktop, rồi dán `distool/dump-discord.js` | `~/Downloads/discord-cinematic-realm.json` (nếu không tải được: `copy(JSON.stringify(__cinematicDump))` rồi `pbpaste > …`) |

Chuyển file vào thư mục dữ liệu:
```bash
find ~/Downloads -maxdepth 1 \( -name 'protectedtext-*.txt' -o -name 'sealnotes-*.txt' -o -name 'hypernotepad-*.txt' -o -name 'discord-cinematic-realm.json' \) -exec mv {} context-art-pulse/raw/ \;
```

## Discord (đã làm ngày 2026-11-25)

- `distool/setup-cinematic.js` đã tạo forum `🔍sites` và `🔞sites-nsfw`, đồng thời thêm tag cho `⭐phim-việt-đỉnk-kout` và `🍿blockbuster-boulevard`. Mặc định script để `DRY_RUN = true`; chạy lại vẫn an toàn.
- **Chưa làm** (chỉ làm sau khi import xong và đã kiểm tra): archive `sites-catalog` và `shadow-archive`, rồi xoá các tin trong thread Safe-text (có link notepad và dòng giống mật khẩu).
- App sẽ dùng **bot chính thức**, không dùng user token.

## Lưu ý

- **Repo này đang PUBLIC** và `raw/` đã được commit (theo quyết định của chủ repo, 2026-11-25). Đừng commit thêm secret mới như token hay `.env`. Test dùng dòng bịa.
- Chính sách của Vercel không cấm rõ nội dung người lớn hợp pháp, nhưng có các từ mơ hồ như "obscene" và "objectionable purpose". Xem mục Constraints trong spec.
