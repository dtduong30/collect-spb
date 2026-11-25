// Paste in Discord desktop DevTools Console while viewing ANY channel of the server.
// DRY_RUN = true only prints the plan. Set false and rerun to apply.
// Safe to rerun: existing channels are skipped, existing tags are kept (only missing ones are added).
// Never deletes or renames anything.
(async () => {
  const DRY_RUN = true;
  const CATEGORY = 'Cinematic Realm';

  const NEW_FORUMS = [
    { name: '🔍sites', nsfw: false, topic: 'Mỗi post = 1 site (SFW). Tiêu đề = tên site, nội dung = link + mô tả.',
      tags: ['Xem online', 'Tải về', 'Torrent', 'Ảnh', 'Phim Việt', 'Anime', 'Phụ đề', 'Review/DB', 'Miễn phí', 'Trả phí', 'Chết link'] },
    { name: '🔞sites-nsfw', nsfw: true, topic: 'Mỗi post = 1 site NSFW. Tiêu đề = tên site, nội dung = link + mô tả.',
      tags: ['Tube', 'JAV', 'Việt', 'Âu Mỹ', 'Châu Á', 'Ảnh', 'Tải về', 'Forum', 'Studio', 'Archive', 'Must try', 'Chết link'] },
  ];
  // tags to add to forums that already exist (matched by name, emoji ignored)
  const ADD_TAGS = {
    'phim-việt-đỉnk-kout': ['Hài', 'Hành động', 'Tâm lý', 'Kinh dị', 'Cổ trang', 'Phim bộ', 'Phim lẻ'],
    'blockbuster-boulevard': ['Sẽ xem', 'Đag xem dở', 'Đã xem', 'Kinh dị', 'Tâm lý', 'Phim bộ', 'Phim lẻ'],
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let req;
  webpackChunkdiscord_app.push([[Symbol()], {}, (r) => { if (Object.keys(r?.c || {}).length > Object.keys(req?.c || {}).length) req = r; }]);
  webpackChunkdiscord_app.pop();
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
  for (const c of candidates) { try { if ((await c.get({ url: '/users/@me' }))?.body?.id) { API = c; break; } } catch {} }
  if (!API) return console.error('RestAPI module not found.');

  const guildId = location.pathname.split('/')[2];
  if (!/^\d+$/.test(guildId)) return console.error('Open a channel of the server first.');
  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').trim();
  const channels = (await API.get({ url: `/guilds/${guildId}/channels` })).body;
  const cat = channels.find((c) => c.type === 4 && norm(c.name).includes(norm(CATEGORY)));
  if (!cat) return console.error(`Category "${CATEGORY}" not found.`);
  const inCat = channels.filter((c) => c.parent_id === cat.id);
  const tag = (name) => ({ name, moderated: false });

  for (const f of NEW_FORUMS) {
    if (f.tags.length > 20) { console.error(`${f.name}: >20 tags`); continue; }
    if (inCat.some((c) => norm(c.name) === norm(f.name))) { console.log(`= ${f.name} exists, skip`); continue; }
    console.log(`+ create forum ${f.name} nsfw=${f.nsfw} tags=[${f.tags.join(', ')}]`);
    if (DRY_RUN) continue;
    await API.post({ url: `/guilds/${guildId}/channels`, body: {
      name: f.name, type: 15, parent_id: cat.id, nsfw: f.nsfw, topic: f.topic,
      available_tags: f.tags.map(tag), default_forum_layout: 1, default_sort_order: 0,
    } });
    await sleep(1500);
  }

  for (const [name, wanted] of Object.entries(ADD_TAGS)) {
    const ch = inCat.find((c) => c.type === 15 && norm(c.name) === norm(name));
    if (!ch) { console.warn(`? forum ${name} not found, skip`); continue; }
    const have = ch.available_tags ?? [];
    const missing = wanted.filter((w) => !have.some((t) => norm(t.name) === norm(w)));
    if (!missing.length) { console.log(`= ${ch.name}: tags already there`); continue; }
    if (have.length + missing.length > 20) { console.error(`${ch.name}: would exceed 20 tags, skip`); continue; }
    console.log(`~ ${ch.name}: add [${missing.join(', ')}] (keeps ${have.length} existing)`);
    if (DRY_RUN) continue;
    // existing tags must be sent back with their ids, or Discord deletes them
    const keep = have.map(({ id, name, moderated, emoji_id, emoji_name }) => ({ id, name, moderated, emoji_id, emoji_name }));
    await API.patch({ url: `/channels/${ch.id}`, body: { available_tags: [...keep, ...missing.map(tag)] } });
    await sleep(1500);
  }
  console.log(DRY_RUN ? 'DRY RUN done. Check the plan, set DRY_RUN = false, rerun.' : 'Done. Drag the new forums to where you want them.');
})();
