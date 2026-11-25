"""Build context-art-pulse/raw/data.js (private, git-ignored) from the raw dumps, for the prototype app.html.
Run from the repo root:  python3 -I docs/superpowers/specs/art-pulse-prototype/extract.py"""
import json, re, glob, os
RAW = 'context-art-pulse/raw'
out = []
for f in sorted(glob.glob(RAW + '/*.txt')):
    src = os.path.basename(f)[:-4]; grp = 'main'
    for l in open(f, encoding='utf-8'):
        l = l.strip()
        m = re.search(r'===== TAB: (.*?)\s*=*$', l)
        if m: grp = m.group(1).strip(); continue
        if not l or set(l) <= set('=') or l.endswith('====='): continue
        out.append({'src': src, 'grp': grp, 'nsfw': None, 'tags': [], 't': l})
d = json.load(open(RAW + '/discord-cinematic-realm.json'))
FILM = ('⭐phim-việt-đỉnk-kout', '🍿blockbuster-boulevard')
for c in d['channels']:
    tagmap = {t['id']: t['name'] for t in (c.get('availableTags') or [])}
    for m in c['messages']:
        for l in (m['content'] or '').split('\n'):
            if l.strip(): out.append({'src': 'discord', 'ch': c['name'], 'grp': c['name'], 'nsfw': c['nsfw'], 'tags': [], 't': l.strip(), 'ts': m['ts']})
    for t in c['threads']:
        tags = [tagmap.get(x, '') for x in t['appliedTags']]
        if c['type'] == 15 and c['name'] in FILM:
            out.append({'src': 'discord', 'ch': c['name'], 'grp': c['name'], 'nsfw': False, 'tags': tags, 't': t['name'], 'film': True,
                        'ts': t['messages'][0]['ts'] if t['messages'] else None,
                        'notes': [l for m in t['messages'] for l in (m['content'] or '').split('\n') if l.strip()]})
            continue
        for m in t['messages']:
            for l in (m['content'] or '').split('\n'):
                if l.strip(): out.append({'src': 'discord', 'ch': c['name'], 'grp': t['name'], 'nsfw': c['nsfw'], 'tags': tags, 't': l.strip(), 'ts': m['ts'], 'perfThread': c['name'] == 'pỏn-corn'})
open(RAW + '/data.js', 'w', encoding='utf-8').write('window.RAW=' + json.dumps(out, ensure_ascii=False) + ';')
print(len(out), 'lines ->', RAW + '/data.js')
