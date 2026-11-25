// Paste in Discord desktop DevTools Console (Cmd+Option+I) while viewing ANY channel of the server.
// Read-only. Dumps every channel + thread (active and archived) under CATEGORY into one JSON download.
(async () => {
  const CATEGORY = 'Cinematic Realm'; // matched case-insensitively, emoji ignored
  const DELAY = 1100;                 // ms between requests, keeps well under rate limits
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Discord's own REST client (same trick as distool/quest.js): uses your session, no token handling.
  let req;
  webpackChunkdiscord_app.push([[Symbol()], {}, (r) => { if (Object.keys(r?.c || {}).length > Object.keys(req?.c || {}).length) req = r; }]);
  webpackChunkdiscord_app.pop();
  // Proxy-backed modules (e.g. intl messages) answer any prop with a function, so shape checks
  // alone pick the wrong one. Collect candidates like quest.js findAPI, then keep the one that
  // actually returns your user from /users/@me.
  const candidates = [];
  for (const m of Object.values(req.c)) {
    try {
      const exp = m?.exports;
      if (!exp || typeof exp !== 'object') continue;
      for (const key of Object.keys(exp)) {
        const p = exp[key];
        if (p && typeof p.get === 'function' && typeof p.post === 'function' && typeof p.del === 'function' && !p._dispatcher) candidates.push(p);
      }
    } catch {}
  }
  let API;
  for (const c of candidates) {
    try { if ((await c.get({ url: '/users/@me' }))?.body?.id) { API = c; break; } } catch {}
  }
  if (!API) return console.error(`RestAPI module not found (${candidates.length} candidates tried).`);

  const get = async (url, query) => {
    for (let i = 0; i < 5; i++) {
      try { await sleep(DELAY); return (await API.get({ url, query })).body; }
      catch (e) {
        if (e?.status === 429) { const w = (e.body?.retry_after ?? 5) * 1000 + 500; console.warn(`429, wait ${w}ms`); await sleep(w); continue; }
        if ([400, 403, 404].includes(e?.status)) { console.warn(`skip ${url}: HTTP ${e.status}`); return null; }
        throw e;
      }
    }
    throw new Error(`gave up on ${url}`);
  };

  const guildId = location.pathname.split('/')[2];
  if (!/^\d+$/.test(guildId)) return console.error('Open a channel of the server first.');
  const channels = await get(`/guilds/${guildId}/channels`);
  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim();
  const cat = channels.find((c) => c.type === 4 && norm(c.name).includes(norm(CATEGORY)));
  if (!cat) return console.error(`Category "${CATEGORY}" not found. Categories:`, channels.filter((c) => c.type === 4).map((c) => c.name));
  const children = channels.filter((c) => c.parent_id === cat.id).sort((a, b) => a.position - b.position);

  // User accounts can't call the bot-only /guilds/:id/threads/active, so threads are found 3 ways
  // and merged by id. Every call that the channel type doesn't support is skipped (400/403/404).
  const search = async (chId, archived) => { // what the client uses for the threads browser
    const out = [];
    for (let offset = 0; ; ) {
      const r = await get(`/channels/${chId}/threads/search`, { archived, sort_by: 'last_message_time', sort_order: 'desc', limit: 25, offset });
      if (!r?.threads?.length) break;
      out.push(...r.threads);
      if (!r.has_more) break;
      offset += r.threads.length;
    }
    return out;
  };
  const archived = async (chId, kind) => {
    const out = []; let before;
    for (;;) {
      const r = await get(`/channels/${chId}/threads/archived/${kind}`, { limit: 100, ...(before && { before }) });
      if (!r?.threads?.length) break;
      out.push(...r.threads);
      if (!r.has_more) break;
      before = r.threads.at(-1).thread_metadata.archive_timestamp;
    }
    return out;
  };

  const messages = async (chId) => {
    const out = []; let before;
    for (;;) {
      const page = await get(`/channels/${chId}/messages`, { limit: 100, ...(before && { before }) });
      if (!page?.length) break;
      out.push(...page);
      before = page.at(-1).id;
    }
    return out.reverse();
  };
  const slim = (m) => ({
    id: m.id, ts: m.timestamp, edited: m.edited_timestamp, author: m.author?.username, content: m.content,
    attachments: m.attachments?.map((a) => a.url), embeds: m.embeds?.map((e) => ({ url: e.url, title: e.title, description: e.description })).filter((e) => e.url || e.title),
  });

  const HAS_MESSAGES = [0, 5];          // text, announcement
  const HAS_THREADS = [0, 5, 15, 16];   // + forum, media
  const dump = { guildId, category: cat.name, exportedAt: new Date().toISOString(), channels: [] };
  for (const ch of children) {
    const entry = { id: ch.id, name: ch.name, type: ch.type, nsfw: !!ch.nsfw, topic: ch.topic, availableTags: ch.available_tags?.map((t) => ({ id: t.id, name: t.name })), messages: [], threads: [] };
    if (!HAS_THREADS.includes(ch.type)) { console.log(`#${ch.name}: skipped (type ${ch.type})`); continue; }
    const raw = HAS_MESSAGES.includes(ch.type) ? await messages(ch.id) : [];
    entry.messages = raw.map(slim);

    const found = new Map();
    const add = (t) => t?.id && !found.has(t.id) && found.set(t.id, t);
    for (const m of raw) {
      add(m.thread);                                                     // thread started from a message
      if (m.type === 18 && m.message_reference?.channel_id) add({ id: m.message_reference.channel_id, name: m.content }); // "X started a thread"
    }
    for (const t of [...(await search(ch.id, false)), ...(await search(ch.id, true)), ...(await archived(ch.id, 'public')), ...(await archived(ch.id, 'private'))]) add(t);

    console.log(`#${ch.name}: ${entry.messages.length} msgs, ${found.size} threads`);
    for (const t of found.values()) {
      const msgs = (await messages(t.id)).map(slim);
      entry.threads.push({ id: t.id, name: t.name, archived: !!t.thread_metadata?.archived, appliedTags: t.applied_tags ?? [], messages: msgs });
      console.log(`  └ ${t.name}: ${msgs.length} msgs`);
    }
    dump.channels.push(entry);
  }

  window.__cinematicDump = dump; // fallback if download is blocked: copy(JSON.stringify(__cinematicDump))
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([JSON.stringify(dump, null, 1)], { type: 'application/json' })),
    download: `discord-${norm(cat.name).replace(/\s+/g, '-')}.json`,
  });
  document.body.append(a); a.click(); a.remove();
  console.table(dump.channels.map((c) => ({ channel: c.name, msgs: c.messages.length, threads: c.threads.length, threadMsgs: c.threads.reduce((s, t) => s + t.messages.length, 0) })));
  console.log(`Saved ${a.download}`);
})();
