// Shared parser + model builder (prototype of the real importer / quick-add parser).
// Output: { items, people, sites, tags, suggestions, stats }
(function () {
  const fold = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const key = (s) => fold(s).replace(/[^a-z0-9]/g, '');
  const cleanName = (s) => (s || '').replace(/[^\p{L}\p{N}\s\-.:/!&']/gu, '').replace(/:$/, '').trim();
  const titleCase = (s) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

  const URL_RE = /https?:\/\/[^\s)\]]+/;
  const MD_RE = /^\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)\s*(.*)$/;
  const BARE_DOMAIN = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/i;
  const CODE_RE = /^(fc2[- ]?ppv[- ]?\d{5,8}|[a-z]{2,6}[- ]?\d{3,5})\b\s*(.*)$/i;
  const CODE_STOP = new Set(['tap', 'top', 'phim', 'duong', 'missav', 'part', 'ep', 'full', 'best', 'pic']);
  const NOTEPAD = /sealnotes|hypernotepad|protectedtext/i;
  const PERF_THREADS = new Set(['Alyx Star', 'Kayden kross', 'Blake Blossoms', 'Kylie Shay']);
  const STATUS = { 'da xem': 'Đã xem', 'se xem': 'Sẽ xem', 'chua xem': 'Sẽ xem', 'dag xem do': 'Đang xem', 'dang xem do': 'Đang xem' };

  // folder hosts get a fixed site; every other host collapses mirrors by label (porn93.cc = porn93.vip, missav123 = missav)
  const FOLDER_SITES = [[/mega\.nz/, 'Mega'], [/drive\.google|docs\.google/, 'Google Drive'], [/disk\.yandex/, 'Yandex Disk'], [/fshare/, 'Fshare'], [/mypikpak/, 'PikPak'], [/terabox/, 'TeraBox'], [/bunkr\./, 'Bunkr']];
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  function siteOf(url) {
    const h = host(url);
    for (const [re, name] of FOLDER_SITES) if (re.test(h)) return { key: key(name), name, folder: true, domain: h };
    const parts = h.split('.'); const label = (parts.length > 2 && parts[0].length <= 3 ? parts[1] : parts[0]) || h;
    const bare = label.replace(/\d+$/, ''); const k = bare.length >= 5 ? bare : label; // missav123 -> missav, but porn93 != porn00
    return { key: k, name: k.charAt(0).toUpperCase() + k.slice(1), folder: false, domain: h };
  }
  const canonUrl = (u) => { try { const x = new URL(u); [...x.searchParams.keys()].filter((k) => /^utm_|^pvs$|^fbclid$/.test(k)).forEach((k) => x.searchParams.delete(k)); const s = siteOf(u); return (s.key + x.pathname.replace(/\/$/, '') + x.search + x.hash).toLowerCase(); } catch { return u.toLowerCase(); } };

  // tag groups keep the filter list short: one row per group, top values only
  const TAG_GROUPS = [
    ['gu', /must|gu|old but gold|perfect|ngon|xinh|oke|đẹp|dep|hay|top|best|luu tru|lưu trữ/],
    ['body', /vu|vú|mong|mông|dit|đít|ngực|nguc|da |da$|dang|dáng|tits|ass|boob|chân|chan/],
    ['vùng', /viet|việt|asia|jav|au my|âu mỹ|french|korea|han|nhật|nhat|china|trung|thai|latina|arab/],
    ['thể loại', /milf|anal|teen|lesbian|amateur|pov|cosplay|massage|hentai|vintage|sex art|tàu|tau|hài|hành động|hoạt hình|giả tưởng|kinh dị|tâm lý|cổ trang|phim/],
  ];
  const tagGroup = (t) => (TAG_GROUPS.find(([, re]) => re.test(t.toLowerCase())) || ['khác'])[0];
  const isName = (s) => /^[A-Z][a-zA-Z'.-]+(\s+[A-Za-z][a-zA-Z'.-]+){1,2}$/.test(s) && !/\b(of|and|the|vu|da|link|full|hot|best|new)\b/i.test(s);
  const normCode = (c) => { const m = c.match(/^fc2[- ]?ppv[- ]?(\d+)$/i); if (m) return 'FC2-PPV-' + m[1]; const n = c.match(/^([a-z]+)[- ]?(\d+)$/i); return n[1].toUpperCase() + '-' + n[2]; };
  function collectionOf(r) {
    if (r.src === 'discord') return cleanName(r.grp) || cleanName(r.ch);
    if (r.grp === 'main') return r.src.replace(/^(\w+)-n?_?(\w{4}).*/, '$1 $2');
    return cleanName(r.grp);
  }
  const slugTitle = (url) => {
    const seg = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
    const slug = decodeURIComponent(seg).replace(/\.(html?|php)$/, '').replace(/[-_]+/g, ' ').replace(/\b\d{4,}\b/g, '').trim();
    return slug.length < 4 || /^[0-9a-z]{10,}$/i.test(slug) || /^(index|search|view video|post)$/i.test(slug) ? '' : slug.charAt(0).toUpperCase() + slug.slice(1);
  };

  // one raw line -> one draft item. `confident` decides inbox vs. library.
  function parseLine(r) {
    const it = { kind: 'note', title: '', url: '', code: '', people: [], tags: [], status: '', progress: '', nsfw: true, secret: false,
      collection: collectionOf(r), sources: [{ src: r.src, grp: r.grp, raw: r.t }], ts: r.ts || null, notes: r.notes || [], titleFromSlug: false };
    if (r.nsfw === false && !/🔞/.test(r.grp)) it.nsfw = false;
    if (/Lành mạnh/.test(r.grp)) it.nsfw = false;
    for (const t of r.tags || []) { const s = STATUS[fold(t).replace(/[^a-z ]/g, '').trim()]; if (s) it.status = s; else if (t) it.tags.push(t.toLowerCase()); }
    if (r.film) {
      it.kind = 'film'; it.title = r.t; it.nsfw = false;
      const p = it.notes.find((n) => /t[aậ]p\s*\d|\d+p\d+/i.test(n)); if (p) { it.progress = p; it.status ||= 'Đang xem'; }
      it.url = (it.notes.join(' ').match(URL_RE) || [''])[0];
      return it;
    }
    const t = r.t; let desc = '';
    const md = t.match(MD_RE), u = t.match(URL_RE);
    if (md) { it.title = md[1].trim(); it.url = md[2]; desc = md[3]; }
    else if (u) { it.url = u[0]; it.title = t.slice(0, u.index).replace(/(link xem|link)\s*:?\s*$/i, '').replace(/[\s\-–:|]+$/, '').trim(); desc = t.slice(u.index + u[0].length).replace(/^[\s\-–:|,]+/, ''); }
    else if (BARE_DOMAIN.test(t)) it.url = 'https://' + t.toLowerCase();
    if (it.url) {
      const s = siteOf(it.url), path = new URL(it.url).pathname.replace(/\/$/, '');
      it.site = s;
      it.kind = NOTEPAD.test(s.domain) ? 'site' : s.folder ? 'folder' : path === '' ? 'site' : 'video';
      if (NOTEPAD.test(s.domain)) it.secret = true;
      for (const tok of desc.split(/,|\s+-\s+/).map((x) => x.trim()).filter(Boolean)) {
        if (isName(tok)) it.people.push(titleCase(tok));
        else if (fold(tok) === 'chua xem') it.status = 'Sẽ xem';
        else if (/^[a-z]{3,}\s+[a-z]{3,}$/.test(tok) && !/\b(vu|to|da|trang|mong|dit|xinh|oke|dep|dang|vua|nho|fake|ngon|hot|sex|xem|hay|tam|must|try|old|gold|star|art|gu|sao|len|nhanh|tau|luu|tru|chung|nhan)\b/.test(fold(tok))) { it.maybe = titleCase(tok); it.tags.push(tok.toLowerCase()); }
        else if (tok.length <= 28) it.tags.push(tok.toLowerCase());
        else it.title ||= tok;
      }
      if (!it.title && it.people.length) it.title = it.people.join(' & ');
      if (!it.title && it.kind === 'video') { it.title = slugTitle(it.url); it.titleFromSlug = true; }
      if (!it.title) it.title = it.kind === 'site' ? s.domain : s.name + ' · ' + (path.split('/').pop() || '').slice(0, 14);
    } else {
      const c = t.match(CODE_RE);
      if (c && !CODE_STOP.has(fold(c[1]).replace(/[^a-z]/g, '')) && t.length < 60) {
        it.kind = 'code'; it.code = normCode(c[1].replace(/\s+/g, '')); it.title = it.code;
        if (c[2] && isName(titleCase(c[2]))) it.people.push(titleCase(c[2])); else if (c[2]) it.tags.push(c[2].toLowerCase());
      } else {
        it.title = t;
        if (/tìm sau/i.test(r.grp)) it.kind = 'query';
        else if (r.ch === '📌note' || /phim/i.test(r.grp)) { it.kind = 'film'; it.nsfw = r.nsfw ?? false; it.title = titleCase(t); }
        else if (isName(t) && t.length < 30) { it.kind = 'person'; it.people.push(titleCase(t)); }
        else if (r.src === 'app') it.kind = r.nsfw ? 'query' : 'film'; // typed on purpose: a title to watch / to look up
      }
    }
    if (r.perfThread && PERF_THREADS.has(r.grp) && !it.people.some((p) => key(p) === key(r.grp))) it.people.push(titleCase(r.grp));
    if (/Safe-text/.test(r.grp) || /^[0-9a-f]{12,}$/i.test(t) || /^[a-z]+\s+-\s+\d{3,}$/.test(t)) it.secret = true;
    if (/girlsdoporn/i.test(t)) it.flag = 'GirlsDoPorn: nội dung từ vụ án ép buộc, cần bạn tự quyết';
    return it;
  }

  // rule: confident items go straight to the library, the rest wait in the inbox
  function inboxReason(it) {
    if (it.flag) return 'Cần bạn quyết';
    if (it.maybe) return 'Có phải tên người?';
    if (it.kind === 'query') return 'Tiêu đề cần tìm';
    if (it.kind === 'note') return 'Không rõ là gì';
    if (it.kind === 'video' && !it.people.length && !it.tags.length && (it.titleFromSlug || !it.title)) return 'Link chưa có mô tả';
    return '';
  }

  const trigrams = (s) => { const x = '  ' + key(s) + ' '; const g = new Set(); for (let i = 0; i < x.length - 2; i++) g.add(x.slice(i, i + 3)); return g; };
  const sim = (a, b) => { const A = trigrams(a), B = trigrams(b); let n = 0; for (const g of A) if (B.has(g)) n++; return (2 * n) / (A.size + B.size); };

  const itemKey = (it) => (it.url ? 'u:' + canonUrl(it.url) : it.code ? 'c:' + it.code : it.kind + ':' + key(it.title));
  function build(raw) {
    const items = [], byKey = new Map(); let merged = 0;
    for (const r of raw) {
      if (!r.t || /^(close tab|=+)$/i.test(r.t)) continue;
      const it = parseLine(r);
      const k = itemKey(it);
      const prev = byKey.get(k);
      if (prev) { merged++; prev.sources.push(...it.sources); prev.tags.push(...it.tags); prev.people.push(...it.people); prev.status ||= it.status; prev.secret ||= it.secret; continue; }
      it.id = items.length + 1; byKey.set(k, it); items.push(it);
    }
    // people + tags: alias by folded key, prefer spelling with diacritics / most used
    const people = new Map(), tags = new Map(), sites = new Map();
    const bump = (map, name, extra) => { const k = key(name); if (!k) return null; const cur = map.get(k) || { key: k, name, n: 0, ...extra }; if (/[^\x00-\x7f]/.test(name) && !/[^\x00-\x7f]/.test(cur.name)) cur.name = name; cur.n++; map.set(k, cur); return k; };
    for (const it of items) {
      if (it.kind === 'person') { it.inbox = ''; }
      it.peopleKeys = [...new Set(it.people.map((p) => bump(people, p, { items: [] })))].filter(Boolean);
      it.tagKeys = [...new Set(it.tags.map((t) => bump(tags, t, { group: tagGroup(t) })))].filter(Boolean);
      if (it.site) { const s = sites.get(it.site.key) || { key: it.site.key, name: it.site.name, folder: it.site.folder, domains: new Set(), n: 0, nsfw: false }; s.domains.add(it.site.domain); s.n++; s.nsfw ||= it.nsfw; sites.set(it.site.key, s); it.siteKey = it.site.key; }
      it.type = ['site', 'folder'].includes(it.kind) ? 'source' : 'watch';
      it.inbox = it.kind === 'person' ? '' : inboxReason(it);
    }
    for (const it of items) for (const k of it.peopleKeys) people.get(k).items.push(it.id);
    // person-name items (bare "Mia Malkova" lines) become people, not library items
    const lib = items.filter((it) => it.kind !== 'person');
    // near-duplicate people -> merge suggestions for the inbox
    const suggestions = [];
    for (const [kind, map] of [['person', people], ['tag', tags]]) {
      const xs = [...map.values()];
      for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) { const A = key(xs[i].name), B = key(xs[j].name); if (A.includes(B) || B.includes(A)) continue; // "đít to" ⊂ "đít to vú to" is a combo, not a typo
        const s = sim(xs[i].name, xs[j].name); if (s >= 0.72) suggestions.push({ kind, a: xs[i].key, b: xs[j].key, score: s }); }
    }
    const stats = { lines: raw.length, items: lib.length, merged, inbox: lib.filter((i) => i.inbox).length, people: people.size, tags: tags.size, sites: sites.size };
    return { items: lib, people, tags, sites, suggestions, stats };
  }

  window.AP = { fold, key, parseLine, build, tagGroup, siteOf, inboxReason, itemKey };
})();
