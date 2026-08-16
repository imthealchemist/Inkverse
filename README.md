# InkVerse 📖

A modern, **mobile-first novel reading & publishing platform** (MVP).

## Run

```bash
node server.js          # → http://localhost:3000
```

No dependencies required (Node 18+). Data persists in `db.json` (auto-seeded on first run).
To reset all data: delete `db.json` and restart.

## Deploying to Railway

The app is Railway-ready out of the box (reads `$PORT`, binds `0.0.0.0`, zero build step).

1. **New Project → Deploy from GitHub repo** → select this repository.
2. Railway auto-detects Node. Set **Start Command**: `node server.js` (leave Build Command empty).
3. **Important — persistence:** Railway's filesystem is ephemeral. Without a volume, all
   accounts/novels reset on every deploy. Add one:
   - Service → **Settings → Volumes → Mount Volume** → mount path `/data`
   - **Variables** → add `DB_PATH=/data/db.json`
4. **Settings → Networking → Generate Domain** to get your public URL.

On first boot the demo dataset (incl. the admin account) is seeded automatically.

> The same works on Render/Fly/Koyeb: any host that runs `node server.js` with a
> persistent volume + `DB_PATH` env var.

## Demo accounts (password for all: `demo123`)

| Role | Email | What to try |
|---|---|---|
| 📖 Reader | `reader@demo.app` | Home feed, bookmarks, reading history, follow writers |
| ✍️ Verified Writer | `writer@demo.app` | Writer dashboard, create novels, rich-text chapter editor, drafts → publish |

> An admin account is also seeded. Its credentials are intentionally **not** published here — ask the maintainer for them.

## Feature map

**Readers**
- Sign up / log in (token auth, hashed passwords)
- Home dashboard: Featured carousel, Latest updates, Recommended for you (genre-based on history/bookmarks)
- Browse by genre collections; sort by most read / newest / recently updated
- Search by title, author, or genre
- Novel page: cover, synopsis, genres, author profile + verified badge, chapter list, follow/bookmark
- Distraction-free chapter reader: Paper / Sepia / Night themes, font-size controls, prev/next, chapter list
- Bookmarks + automatic reading history with "Continue reading"
- Follow writers; report novels/chapters

**Writers** (`Join as a Writer` in the main menu)
- Separate writer dashboard with stats
- Create/manage novels: cover upload (auto-resized), title, description, multi-genre
- Built-in rich-text editor (bold/italic/headings/quotes/lists), word count
- Save drafts, publish/unpublish, edit and delete chapters

**Verified writers**
- Verified ✓ badge shown across the app
- Writers submit verification requests; only admins approve/reject

**Admin**
- Overview stats, user management (roles, ban, manual verify), verification queue,
  novel moderation (feature/hide/delete), chapter moderation, genre management,
  and reported-content queue (dismiss or remove content)

## Architecture

```
server.js   zero-dependency HTTP server: static files + REST API (/api/*)
seed.js     demo dataset (users, novels, chapters, follows, reports…)
db.json     JSON datastore (created automatically)
public/     SPA frontend (hash router, vanilla JS — no build step)
```

The datastore layer is isolated inside `server.js` (`db`, `saveDB`) so it can be
swapped for Postgres/Mongo without touching route handlers. API responses are
plain JSON, ready for a future mobile app.

## Future-proofing hooks (not yet implemented)

- `novels` documents can take `price` / `premium` fields for monetization
- Coin/subscription tables can hang off `users` without schema changes
- Chapters already carry `status`, allowing scheduled/paid-gating states later
