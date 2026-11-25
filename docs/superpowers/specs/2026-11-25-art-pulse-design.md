# art-pulse: design

Date: 2026-11-25 · Side: personal · Status: draft v2 (builder check folded in), waiting for author approval
Prototype and verdict: `prototypes/art-pulse-ui/` (git-excluded), `VERDICT.md`

## 1. Intent

The author keeps a personal film catalog, mostly adult, spread across online notepads (protectedtext, sealnotes, hypernotepad), many of them with several tabs, and across the "Cinematic Realm" category of their Discord server. Today it is about 860 one-line entries: links with free-text descriptors (`link - name, tag, tag`), codes (`SSIS-698`, `FC2-PPV-…`), film titles, titles to look up later, and folder links (Mega, Drive, Yandex, Fshare). The lines are messy: duplicated, spelled inconsistently, with and without Vietnamese diacritics, and with no structure. That makes them hard to search and to filter.

**art-pulse** replaces the notepads and becomes the single place to save and find things to watch:
- It is the **source of truth**. The notepad and Discord content is imported once.
- It works **offline** on iPhone, Android, Mac and Windows, and syncs in the background when online.
- It is **calm by default**. It opens on a short, curated home, not a wall of 800 items.
- It keeps Discord forums up to date **one way** (app → Discord), so the server stays browsable.

Success: the author stops writing in notepads, finds any saved thing in a few keystrokes, and opening the app on the phone in public shows nothing NSFW.

## 2. Goals, non-goals, anti-goals

**Goals (v1)**
- One-time import of all notepad and Discord dumps, with dedupe, normalisation and an inbox for anything uncertain.
- 3 spaces + inbox UI (Xem / Người / Nguồn / Hộp thư), search-first, SFW by default.
- Quick add that takes notepad-style lines, with a live parse preview.
- Offline-first, with sync across devices.
- One-way Discord sync of chosen items into the reworked forums.
- Server-side title fetch for links that have no description.

**Non-goals (v1)**
- The Music and Book categories of the server (the model stays generic; nothing is built for them).
- External metadata (TMDB, posters, thumbnails).
- Multi-user use, sharing, or public pages.
- Discord → app sync (edits made in Discord never come back).
- Native apps or app-store builds.

**Anti-goals (failure even if it "works")**
- NSFW content visible in SFW mode, or on screen right after opening the app.
- Any secret item (notepad links, passwords, keys) posted to Discord or shown without unlocking.
- Losing an edit made offline.
- The user's device fetching third-party adult sites in the background (no image proxying, no favicons, no client-side title fetch).
- A home screen that shows hundreds of items, or filters that list every tag at once.
- Using the Discord user token (self-bot). Only an official bot is allowed.

## 3. Constraints

- Free tiers only: Vercel Hobby and Neon Free. Vercel Hobby cron runs **at most once a day**, so nothing time-sensitive may depend on cron.
- Lives in this repo at `context-art-pulse/`, independent of the existing collect Worker (`src/`). The Vercel project's root directory is `context-art-pulse/`.
- iOS keeps PWA storage reliably only when the app is installed to the Home Screen. iOS has no Background Sync API, so on iPhone sync happens when the app opens, when it comes back to the foreground, when the network returns, and every few minutes while it is open.
- Vercel's Acceptable Use Policy (last updated 2026-04-21, read 2026-11-25) does not name legal adult content. It bans "obscene", "sexually exploitative" and non-consensual intimate content, and for non-Enterprise plans "objectionable purpose". None of these terms is defined. Mitigation: login-only, `noindex`, text and links only, no media hosted or proxied. The remaining risk is accepted. The database is Neon, which is plain Postgres and not tied to Vercel, so the fallback is moving **only the app host**. The data layer is unchanged.
- Raw dumps live in `context-art-pulse/raw/` (git-excluded through `.git/info/exclude`) and are never committed. Test fixtures use made-up lines.

## 4. Approaches considered

| | Approach | Trade-off | Verdict |
|---|---|---|---|
| A | PWA + IndexedDB (Dexie) + our own `/api/sync` (outbox, server change cursor, last write wins per row) on Vercel + Neon | ~200 lines of sync code we own; the same row edited offline on 2 devices → the later edit wins | **Chosen**: single user, rare conflicts, no extra service |
| B | Same app plus a sync engine (PowerSync / ElectricSQL) | Robust sync, but one more account, free-tier limits and setup | Overkill for one user |
| C | CRDT (Yjs / Automerge) | Merges concurrent edits, but heavy and awkward to query in Postgres | Not worth it |

UI: round 1 tried 3 layouts (dense list / card grid / command palette). All were rejected as cluttered because they showed everything at once. Round 2's "3 spaces + inbox" was accepted.

Discord: a webhook was ruled out because it cannot edit a post's title or tags, or delete threads. An official bot called over REST from the server is used instead.

## 5. Decided by the author

1. The app is the source of truth. Notepads and Discord are imported once.
2. Approach A sync. Devices: iPhone, Android, Mac, Windows.
3. Scope: the Cinematic Realm (Film) category only.
4. Finding things = searching the author's own catalog. No external lookups.
5. Main screen = search + filters, in the 3 spaces + inbox form (VERDICT round 2).
6. Look: Letterboxd-like dark, minimal motion, performance first, large type and spacing (16px base, rows about 60px, mobile touch targets ≥ 44px).
7. Desktop is 2 columns (list + detail). Mobile is 1 column with a bottom tab bar, and detail opens as a full screen.
8. Inbox for uncertain imports, triaged in the app (grouped by reason, with bulk and one-by-one actions).
9. 18+ mode is locked by PIN or Face ID. **SFW is the default.**
10. Discord rework (already done on 2026-11-25): new forums `🔍sites` and `🔞sites-nsfw`, and tags added to `⭐phim-việt-đỉnk-kout` and `🍿blockbuster-boulevard`. `sites-catalog` and `shadow-archive` get archived only **after** the import is verified. The Safe-text messages get deleted from Discord after import.
11. The server fetches page titles for links with no description.
12. On a person's page, items are grouped by site.
13. Discord after import = **option A**: link the existing posts, and backfill only the two new site forums once. Films and videos are not reposted. (Rejected: B, repost about 800 items and delete the old posts, because it floods Discord and loses history. C, no backfill, because the new site forums would stay empty.)

## 6. Design

### 6.1 Domain model

Every saved thing is an **item**. Items reference people, tags, a site and a collection.

| Concept | Meaning |
|---|---|
| item.type | `watch` (something to watch) or `source` (where things live). The UI branches only on `type`. |
| item.kind | `video`, `film`, `code`, `query` (title to look up), `note` → watch. `site`, `folder` → source. |
| person | A performer. Has aliases. "Kayden kross" and "Kayden Kross" are the same person. |
| tag | A descriptor in one **group**: `gu` (taste: must try, old but gold…), `body`, `vùng` (region/language), `thể loại` (genre), `khác` (other). Has aliases (`vu to` = `vú to`). |
| site | A host family. Mirrors collapse into one site: porn93.cc and porn93.vip; missav.live and missav123.com (trailing digits are stripped only when ≥ 5 letters remain, so porn00 ≠ porn93). Folder hosts map to fixed names: Mega, Google Drive, Yandex Disk, Fshare, PikPak, TeraBox, Bunkr. |
| collection | The original notepad tab or Discord thread name (Lost tape, Chỉ quạt, Drive Mega…). Keeps context. Shown only in detail and in search. |
| status | `Sẽ xem` / `Đang xem` / `Đã xem`, plus free-text `progress` ("tập 2, 5:43"). |
| inbox | A non-empty reason means the item waits in the inbox and is not in the library. |
| secret | Hidden. Lives only in the 🔒 vault (visible in 18+ mode after unlock). Never posted to Discord. |
| archived | Soft-hidden everywhere except "Lưu trữ" and search with a filter. |

### 6.2 Database (Neon Postgres)

Arrays of ids on `items` instead of join tables, so one item is one row to sync (last write wins per row).

```sql
create table items (
  id text primary key,                 -- ULID, generated on the device
  type text not null, kind text not null,
  title text not null, url text, url_canon text, code text,
  people text[] not null default '{}', tags text[] not null default '{}',
  site_id text, collection_id text,
  status text, progress text, note text,
  nsfw boolean not null, secret boolean not null default false,
  inbox text not null default '', archived boolean not null default false,
  fetched_title text, title_fetch text,  -- null|pending|ok|failed|blocked
  title_fetch_attempts int not null default 0,
  post_to_discord boolean not null default false,
  sources jsonb not null default '[]',   -- [{origin, group, raw, pos}] original lines
  added_at timestamptz not null,         -- import order or created time
  updated_at timestamptz not null, deleted_at timestamptz,
  seq bigint not null                    -- server change cursor
);
create unique index on items (url_canon) where url_canon is not null and deleted_at is null;
create unique index on items (code) where code is not null and deleted_at is null;
create index on items using gin (people); create index on items using gin (tags);
create index on items (seq);

create table people   (id text primary key, name text not null, aliases text[] not null default '{}',
                       merged_into text, updated_at timestamptz not null, deleted_at timestamptz, seq bigint not null);
create table tags     (id text primary key, name text not null, grp text not null, aliases text[] not null default '{}',
                       merged_into text, updated_at timestamptz not null, deleted_at timestamptz, seq bigint not null);
create table sites    (id text primary key, name text not null, domains text[] not null, folder boolean not null,
                       nsfw boolean not null, updated_at timestamptz not null, deleted_at timestamptz, seq bigint not null);
create table collections (id text primary key, name text not null, updated_at timestamptz not null, deleted_at timestamptz, seq bigint not null);

create sequence change_seq;            -- every write sets seq = nextval('change_seq')

create table discord_posts (item_id text primary key, channel_id text not null, thread_id text,
                            message_id text, managed boolean not null, posted_hash text, synced_at timestamptz);
create table person_threads (person_id text primary key, thread_id text not null);   -- existing pỏn-corn performer posts
create table site_posts (site_id text primary key, channel_id text not null, thread_id text not null);  -- backfilled site posts
create table discord_queue (id bigserial primary key, item_id text not null, op text not null,  -- upsert|delete
                            attempts int not null default 0, last_error text, created_at timestamptz default now());
```

Merging a person or tag: rewrite the ids in every affected item, add the loser's name to the winner's `aliases`, and set the loser's `merged_into` plus a tombstone (`deleted_at`). Devices receive all of these through sync.

### 6.3 Client (PWA)

- Next.js (App Router, TypeScript). The app is a client-rendered shell. A service worker caches the shell so the app opens offline.
- Dexie stores the same tables as the server, plus `outbox` (`{id, table, row}`) and `meta` (`cursor`, PIN hash, lock state, last filters).
- **The UI reads only from Dexie.** Writes go to Dexie **and** the outbox in one transaction, then a sync is triggered.
- MiniSearch index, built at start and kept updated on writes:
  - fields `title, fetched_title, code, people, tags, url, collection, note`;
  - boosts code ×3, people ×3, title ×2, tags ×1.5, url ×0.5;
  - `prefix: true`, fuzzy 0.2 for terms longer than 4 characters, AND combine;
  - `processTerm` strips diacritics (`đ→d`);
  - ranking: multiply by 1.3 for `Sẽ xem`/`Đang xem` and by 0.6 for inbox items.
  Target: under 10 ms for 5,000 items on a mid phone.
- Long lists render only the rows on screen (`content-visibility` or a small windowing helper).

### 6.4 Sync protocol

`POST /api/sync` with body `{ cursor, changes: [{ table, row }] }` returns `{ cursor, changes: [{ table, row }] }`.

1. The server applies incoming rows **one at a time**, comparing `updated_at` (`updated_at` comes from the device clock):
   - incoming newer → write the row with `seq = nextval`;
   - stored row newer → ignore it (that row comes back in the pull);
   - tie → keep the incoming row.
   Deletes are rows with `deleted_at` set.
2. It returns every row with `seq > cursor` across all tables, paged at 500, plus the new cursor (the max `seq` sent).
3. The client clears the pushed outbox entries only after a 2xx response, then applies the pulled rows. A pulled row overwrites the local one, unless the local row has a newer unsynced outbox entry.
4. Triggers: app open, regained focus/visibility, the `online` event, a 3-minute interval while visible, after each local write (debounced 1 s), and Background Sync where supported (Android Chrome).
5. Unique conflicts (the same `url_canon` or `code` created on 2 devices): the server keeps the existing row, merges the incoming row's `sources`/`people`/`tags` into it, and tombstones the incoming id. The device then receives both rows.

### 6.5 Auth and privacy

- One password. `APP_PASSWORD_HASH` is a scrypt hash (Node `crypto`) and `SESSION_SECRET` signs the cookie. The cookie is httpOnly, Secure, SameSite=Lax and lasts 1 year per device. Every `/api/*` route needs it. The login page has a basic rate limit (5 tries per minute per IP, in memory, best effort).
- `noindex` and `robots.txt` disallow all. No analytics.
- **18+ lock (device-only):**
  - PIN (4–6 digits, hashed in Dexie `meta`).
  - Face ID / fingerprint through a WebAuthn platform authenticator when available. This is a local gate only. The data is not encrypted at rest, which is accepted.
  - Locked state is the default after app start and after 5 minutes without interaction. Locking clears revealed secrets and closes NSFW detail.
  - In SFW mode, NSFW items are filtered out of **every** list, count, search result, person and site. People and sites that only have NSFW items disappear.
- Secret items sync to devices like every other item, but are shown only inside the 🔒 vault. They are excluded from global search unless the vault is open, and are never queued for Discord.

### 6.6 Importer

`context-art-pulse/scripts/import.ts`, run locally with `DATABASE_URL`:

1. Reads the dumps:
   - `raw/*.txt`, notepad dumps where tab sections start with `===== TAB: name =====`;
   - `raw/discord-cinematic-realm.json`, from `prototypes/notepad-dump/dump-discord.js`.
2. Uses the **same parser module** as quick add (`lib/parse.ts`). Rules are validated in the prototype (`prototypes/art-pulse-ui/parse.js`):
   - markdown `[label](url)`, `label url`, `url - desc, desc`;
   - bare domains;
   - codes (`FC2-PPV-n`, `ABC-123`, with a stop-list for `tap`, `phim`, `top`…);
   - film-forum threads → `film`, with applied forum tags → status and genre tags;
   - performer threads in `pỏn-corn` → person;
   - `Context tìm sau` → `query`;
   - `Safe-text`, notepad URLs and password-like lines → `secret`;
   - a "GirlsDoPorn" mention → inbox reason "Cần bạn quyết".
3. Deduplicates on `url_canon` (strip `www`, tracking params and the trailing `/`; site-mirror aware), then on `code`, then on kind + folded title. Merged lines keep every source.
4. Assigns `added_at` from the Discord timestamp, or for notepad lines from file order (a later line counts as newer).
5. Decides the inbox reason (`Cần bạn quyết`, `Có phải tên người?`, `Tiêu đề cần tìm`, `Không rõ là gì`, `Link chưa có mô tả`). Everything else goes into the library.
6. Writes a review report (`raw/import-report.json` with counts per reason, merges and near-duplicates) and runs in **dry-run by default**. `--apply` writes to Neon.
7. Is idempotent: running it again matches on keys and never duplicates.

Measured on the real dumps: 862 lines → 819 items (36 merged), about 445 inbox items before the title fetch, 23 people, 145 tags and 153 sites.

### 6.7 Title fetch (server)

- Candidates: items where `kind = 'video'`, there is no description (`title` came from the URL slug or id) and `title_fetch` is null.
- Fetch: server-side GET (8 s timeout, 1 MB cap, browser-like User-Agent, no cookies). Parse `og:title` and fall back to `<title>`. Strip site-name suffixes (`- Pornhub.com`, `| xxx`). Store the result in `fetched_title` and set `title_fetch`. The original title stays as the fallback.
- If a usable title came back and the inbox reason was "Link chưa có mô tả", clear the reason so the item joins the library. It shows the fetched title, and search indexes it.
- Runs:
  - (a) from the importer in batches after `--apply`;
  - (b) after each sync for newly created items (`waitUntil`, at most 10 per call);
  - (c) from the daily cron as a sweep (at most 50).
- Blocked or failed fetches are not retried more than 3 times in total.

### 6.8 Discord sync (server)

- Official bot (Developer Portal application). Secrets: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`. Permissions in the guild: View Channel, Send Messages, Create Public Threads, Send Messages in Threads, Manage Threads (edit title and tags, archive).
- Each item has `post_to_discord` (default **off** for imports, **on** for quick add, editable in detail). Secret items never post.
- Routing (channel ids are config, matched once by name and stored in env/config):

| Item | Target |
|---|---|
| film, not nsfw, Vietnamese (tag `vùng=việt` or the original channel) | `⭐phim-việt-đỉnk-kout` forum: one post per film, tags = status + genre |
| film, not nsfw, other | `🍿blockbuster-boulevard`, same shape |
| nsfw watch item with a person who has a post in `pỏn-corn` | a message in that person's post |
| nsfw watch item, no person | a new `pỏn-corn` post (title = item title), gu tags mapped to the forum's existing tags |
| source, not nsfw | `🔍sites`: one post per site (items of the site are messages inside it) |
| source, nsfw | `🔞sites-nsfw`, same |

- **After import (option A):**
  - The importer writes `discord_posts` rows for existing posts:
    - each film-forum thread → its film item, with `managed = false`;
    - each performer thread in `pỏn-corn` → that person (`person_threads(person_id, thread_id)`).
  - Existing posts were made by the author's account, so the bot **cannot edit their title or tags**. For these unmanaged posts the bot only appends a message: status changes become "Trạng thái: Đã xem", and new items of that person become a message in the person's thread.
  - Items that the bot posts itself are `managed = true` and get full title, tag and archive control.
  - A one-shot local script `scripts/discord-backfill.ts` creates one post per non-secret site in `🔍sites` / `🔞sites-nsfw`, with the site's links as messages (about 150 posts at 1 request/second, about 5–10 minutes). It is dry-run by default, resumable and idempotent through `discord_posts`.
  - Imported watch items keep `post_to_discord = false` unless toggled.
  - A film toggled on that already has an unmanaged post **never** gets a second post.
- The queue (`discord_queue`) is filled on relevant item writes and drained after each sync (`waitUntil`, at most 10 jobs, 1 request per second) and by the daily cron.
- `posted_hash` skips no-op edits.
- A move between channels (nsfw flip, film reclassified) = delete the old post or message, then create a new one.
- Item deleted or archived → archive the thread, or delete the message.
- A job fails 5 times → it stays in the queue with `last_error`, and the app's settings page shows "Discord: N lỗi".
- App tag names map to forum tag ids. Tags missing from the forum are written in the message body (a forum allows at most 20 tags).

### 6.9 UI

Spaces (mobile: bottom tab bar; desktop: tabs under the header):

- **Xem**: home with **Đang xem dở**, **Sẽ xem** and **Mới thêm**, 5 rows each with "xem hết ›", plus "Tất cả".
  - The full list has filters: status, kind (video / film / code) and one row per tag group. Each tag group shows the top 5 tags with count ≥ 2, then "+N".
  - Sort: newest / A–Z.
- **Người**: a grid of people with a count and their top 2 tags.
  - A person's page shows their items **grouped by site** (Sxyprn 3 · Pornhub 2 …), with watch items first.
- **Nguồn**: Folders (by host) and Sites (top 12, then "tất cả"). Each shows its domains, link count and how many wait in the inbox.
  - A site's page lists its items.
  - 🔒 Két appears only when unlocked.
- **Hộp thư**: progress bar; merge suggestions for people and tags (trigram ≥ 0.72; a name that contains the other is not a suggestion); groups by reason.
  - Each reason group has **Phân loại từng mục**, **Giữ hết** and **Lưu trữ hết**, plus **Lưu trữ theo site** inside a group.
  - One-by-one triage shows the original line, the parsed guess and the fetched title. Actions: `G` keep, `S` keep + Sẽ xem, `A` archive, `→` skip; "👤 X là người"; type a tag + Enter.
- **Search** replaces the space content while the box is not empty. Results are grouped Người / Xem / Nguồn, and inbox items are marked ⏳.
- **Detail** (right pane on desktop, full screen on mobile):
  - kind, title (fetched title if present), link, code, people chips (→ person), tags, status buttons, progress, site chip, collection;
  - a free-text **note**;
  - the "post to Discord" toggle and its target, sources (collapsed), archive / restore.
- **Quick add** (header `+`, mobile floating button, key `n`): textarea, one item per line, with a live preview per line showing kind, people, tags and destination (→ Xem / Nguồn / Người mới / Hộp thư · reason / "Đã có: … → gộp nguồn").
  - Options: "Sẽ xem" (default on); "18+" (only in 18+ mode).
  - **nsfw = site.nsfw OR toggle.** A URL on a site already marked NSFW is always saved as NSFW, even from SFW mode. The preview says "18+ (site)" and the item does not appear in SFW. Text-only lines added in SFW mode are SFW. (Builder-check call: it protects anti-goal 1.)
  - **Kind is changeable in the preview** (a tap cycles video / film / code / query / person).
  - Text-only lines typed here are `film` (SFW) or `query` (18+) and never go to the inbox. `⌘↵` saves. Adding a single item opens its detail.
- Header: search (`/`), `+`, mode pill (SFW / 18+ 🔓), sync dot (green = synced; orange = offline or pending, with the count in its tooltip).
- Visual: Letterboxd palette (`#14181c` bg, green `#00e054` accent, orange for pending), system font, 16px base. Motion: 150 ms fade only, honouring `prefers-reduced-motion`. No `backdrop-filter` on any ancestor of `position: fixed` elements (it broke the mobile tab bar in the prototype).

## 7. Acceptance criteria

1. The importer dry-run on the real dumps reports ≥ 800 items, merges, the inbox per reason and near-duplicates. `--apply` twice gives the same row count (idempotent).
2. On a fresh install the app opens in **SFW mode** and no NSFW title, person or site is visible on any screen, count or search result.
3. After unlocking with the PIN, 18+ content appears. After 5 minutes without interaction, or a reload, it is locked again.
4. Airplane mode: add 3 items, edit a status, archive 1 → the UI updates instantly and the sync dot shows 5 pending. Back online → pending reaches 0 within 10 s, and a second device sees the changes after its next sync.
5. The same item edited on 2 offline devices → the later `updated_at` wins on both after sync. No crash and no duplicate.
6. Quick add with a URL that already exists (mirror domain or tracking params included) shows "Đã có" and creates no new item.
7. Search finds `Malkova` from `malcova`, `vú to` from `vu to`, and `FC2-PPV-3692007` from `fc2 3692007`, in under 50 ms on an iPhone for the full data set.
8. The inbox shows the reason groups with counts. Bulk archive and one-by-one triage update the counts, and the triaged items show up in the right space.
9. Title fetch: after import, at least half of the "Link chưa có mô tả" items either get a title or are marked failed/blocked. None of these fetches is made from the device.
10. Discord backfill dry-run lists about 150 site posts and no secret item. A real run creates them once; running it again creates nothing new. A new video for a person with an existing thread appears as a message in that thread.
11. Discord: creating a film with post_to_discord on → a post appears in the right forum with the status tag. Editing its title or status updates the same post. A secret item never creates a queue job.
12. Mobile (iPhone Home Screen PWA): the bottom tab bar is fixed, touch targets are ≥ 44px, and there is no horizontal scroll at 375px.
13. The parser unit tests (made-up fixtures for every rule in 6.6) pass. `next build` is green.

## 7b. Calls made after the builder check (author can override)

- **Deterministic ids for people, tags and sites:** `p_<folded name>`, `t_<folded name>`, `s_<site key>`. The same person or tag created offline on two devices converges to one row instead of two.
- **Unknown NSFW defaults to true** for imported notepad lines. Discord channels and the "Lành mạnh" thread set it explicitly.
- `items.post_to_discord` and `title_fetch_attempts` were added to the schema.
- Gaps in the `seq` cursor from concurrent transactions are ignored (single user). The pull uses `seq > cursor` and the cursor is the max `seq` returned.
- Deleting the Safe-text messages and archiving the old channels is a **hand-run runbook**, not code.
- Nsfw for quick add follows the site's flag (see 6.9).

## 8. Left to the builder

- The project layout inside `context-art-pulse/`, the component structure, and the CSS approach (plain CSS or CSS modules; no UI kit is needed).
- The SQL access library (`@neondatabase/serverless` with raw SQL is enough) and the migration tool (plain `.sql` files are enough).
- The service-worker tooling (hand-written or `next-pwa`/Serwist), as long as offline open works on iOS.
- The ULID library and the windowing helper.
- The exact title-cleanup regexes and the Discord message formatting.
- A settings page (logout, change PIN, Discord error count, re-run title fetch, export JSON backup). Keep it minimal.

## 9. Open risks

- Vercel's policy is vague ("obscene", "objectionable purpose", see Constraints). If Vercel objects, move the Next.js app to another host (Cloudflare via OpenNext, or Netlify) and keep Neon. Do **not** switch to D1: the schema uses Postgres features (arrays + GIN, jsonb, sequences, partial unique indexes).
- Sites blocking server fetches → the title fetch helps less than estimated. The inbox bulk-by-site actions are the fallback.
- The Discord API for user-created forum posts: the bot can only edit posts **it** created. The existing performer posts in `pỏn-corn` were made by the author's account, so the bot can add messages to them but not edit their titles or tags.
