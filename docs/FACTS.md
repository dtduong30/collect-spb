# FACTS (grep, do not read in full)
<!-- One fact per line: - [tag] fact. Tags: deploy, env, bug, trap, ruling, cmd, id, decision -->
- [deploy] Worker runs on the tribox Cloudflare account, not the personal one; `npx wrangler whoami` before deploy.
- [trap] DISCORD_TOKEN is a user (self-bot) token: ToS ban risk.
- [decision] context-art-pulse/ is independent of the collect Worker; shares the repo only.
- [decision] art-pulse app = source of truth; offline-first PWA (Next.js + Dexie/IndexedDB) on Vercel + Neon, own /api/sync, last-write-wins; one-way Discord sync via real bot (not self-bot).
- [decision] Main screen = search box + filters (performer, tag, collection, status, SFW/NSFW, kind). Look: Letterboxd dark; minimal motion; 2-column on desktop.
- [ruling] Discord 2026-11-25: created forums 🔍sites + 🔞sites-nsfw, added tags to phim-việt-đỉnk-kout + blockbuster-boulevard. sites-catalog + shadow-archive to archive only after app import.
- [trap] shadow-archive/Safe-text holds notepad links + password-like lines: import as secret, never post to Discord, delete from Discord after import.
- [cmd] DevTools scripts: distool/{dump-tabs,dump-discord,setup-cinematic}.js (setup DRY_RUN default true). Prototype ref: docs/superpowers/specs/art-pulse-prototype/ (extract.py builds raw/data.js).
- [trap] Discord user API: /guilds/:id/threads/active is bot-only (403); find RestAPI by probing /users/@me, intl Proxy module fakes get/post/del.
- [trap] collect-spb GitHub repo is PUBLIC: never commit raw dumps, real names/links, or secrets; raw/ is in .gitignore.
