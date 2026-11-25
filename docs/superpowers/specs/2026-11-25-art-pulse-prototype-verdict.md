# VERDICT: art-pulse UI prototype

**Question:** What should the main screen of the art-pulse app look like (search + filters), so that ~800 imported lines stay easy to read?

## Round 1 (index.html, 3 variants: list / card grid / command)
- Rejected: all three showed every item, kind, tag and collection at once. User: "too much, it looks cluttered".
- Kept: dark Letterboxd look, instant search with diacritics ignored, detail pane, quick add by pasting a line.

## Round 2 (app.html, chosen direction): "khá ổn" → "oke ổn"
- **3 spaces + inbox:** Xem (Đang xem dở / Sẽ xem / Mới thêm, 5 rows each) · Người (performer grid) · Nguồn (sites and folders grouped by site, mirrors merged) · Hộp thư (things the importer is unsure about).
- **SFW is the default mode for the whole app.** 18+ needs a PIN or Face ID and locks itself after 5 minutes idle. Secret items go in a 🔒 vault that only appears in 18+.
- **Inbox:** grouped by reason, with bulk keep / archive and one-by-one triage on keys (G / S / A / →). Merge suggestions for people and tags (trigram similarity ≥ 0.72; when one name contains the other it is a combo, not a typo).
- **Search:** MiniSearch with prefix, fuzzy and field boosts, run on diacritic-free text. Results are grouped People / Xem / Nguồn.
- **Larger UI:** 16px base font, rows about 60px tall, chips and buttons 34–42px, mobile tab bar 56px.
- **Quick add:** a + in the header, a floating button on mobile, and the `n` key. Live preview shows where each line will go: library / inbox / "already exists, merge" / new person. Each item has a free-text note field.
- Mobile trap: `backdrop-filter` on the sticky header made the fixed tab bar sit relative to the header. Do not put it on any ancestor of a `position:fixed` element.

## Agreed for the spec (user said yes)
- The server fetches `<title>` / `og:title` for links without a description, then re-checks whether they still need the inbox. Bulk-archive the inbox by site.
- On a person's page, items are grouped by site.
- Import order stands in for "date added" when a line has no timestamp.

## Known parser limits (fix in the real importer)
- A capitalised 3-word title typed on its own can be read as a person. The quick-add preview must let the user change the kind.
- Some descriptor phrases are read as people (e.g. "Deep Oil Massage"). The inbox catches them.
