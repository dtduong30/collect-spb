// Paste in DevTools Console AFTER unlocking the note. Read-only: never saves the note.
// Downloads <host>-<note>.txt with every tab as "===== TAB: name =====".
(async () => {
  const TAB_SELECTOR = ''; // set manually if auto-detect finds 0 tabs, e.g. '.tab-item'
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const visible = (el) => el && el.offsetParent !== null;
  const label = (el) => el.innerText.replace(/[×✕✖]/g, '').trim();
  const editorText = (root = document) => {
    const els = [...root.querySelectorAll('textarea, [contenteditable="true"], .CodeMirror, .cm-content, .ProseMirror')].filter(visible);
    const el = els.sort((a, b) => b.offsetHeight - a.offsetHeight)[0];
    if (!el) return null;
    if (el.CodeMirror) return el.CodeMirror.getValue();
    return el.value ?? el.innerText;
  };

  const out = [];
  const jq = [...document.querySelectorAll('.ui-tabs-nav li a')]; // protectedtext (jQuery UI tabs)
  if (!TAB_SELECTOR && jq.length) {
    for (const a of jq) {
      const ta = document.querySelector(a.getAttribute('href'))?.querySelector('textarea');
      if (ta) out.push([label(a), ta.value]);
    }
  } else {
    const tabs = [...document.querySelectorAll(TAB_SELECTOR || '[role="tab"]')].filter(visible);
    if (!tabs.length) {
      // single-note sites (hypernotepad…): read the one visible editor
      const t = editorText();
      if (t == null) return console.warn('No tabs and no editor found. Inspect the text box, tell Claude its selector.');
      out.push(['main', t]);
    }
    for (const t of tabs) {
      t.click();
      await sleep(500);
      out.push([label(t), editorText() ?? '']);
    }
  }
  if (!out.length) return console.warn('Nothing read.');

  const text = out.map(([n, c]) => `===== TAB: ${n} =====\n${c.trim()}\n`).join('\n');
  const name = `${location.hostname.replace(/^www\./, '').split('.')[0]}-${(location.pathname.slice(1) || 'note').replace(/\W+/g, '_')}.txt`;
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: name });
  a.click();
  console.table(out.map(([n, c]) => ({ tab: n, lines: c.split('\n').filter(Boolean).length })));
  console.log(`Saved ${name} (${out.length} tabs)`);
})();
