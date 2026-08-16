# InkVerse 📖

A modern, **mobile-first novel reading & publishing platform** (MVP).

## Run

```bash
node server.js          # → http://localhost:3000
```

Requires Node 18+ (`npm install` once — single dependency: `pg`).
Data persists in `db.json` locally, or in PostgreSQL when `DATABASE_URL` is set
(auto-seeded on first run either way). To reset local data: delete `db.json` and restart.

## Storage backends

InkVerse auto-selects its datastore at startup:

| Environment | Storage | How |
|---|---|---|
| No `DATABASE_URL` | `db.json` file | zero-config, ideal for local dev |
| `DATABASE_URL` set | **PostgreSQL** | recommended for production (e.g. free Neon.tech DB on Railway) |

On first boot an empty database is seeded with the demo library automatically.
PostgreSQL restarts/redeploys never lose data.

## Deploying: Railway (host) + Neon (free database)

The app is Railway-ready out of the box (reads `$PORT`, binds `0.0.0.0`, zero build step).

1. **Neon** — sign up free at https://neon.tech → create a project → copy the
   connection string (Dashboard → *Connect*).
2. **Railway** — New Project → Deploy from GitHub repo → select this repository.
   Start Command: `node server.js` (no build command needed).
3. **Railway → Variables** → add `DATABASE_URL` = your Neon connection string.
4. **Settings → Networking → Generate Domain** for your public URL.

That's it — stories posted by any user are stored in Neon and visible to everyone,
surviving every restart and redeploy.

> Alternative (no external DB): mount a Railway Volume at `/data` and set
> `DB_PATH=/data/db.json` to persist the JSON file instead.

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
server.js   HTTP server: static files + REST API (/api/*); JSON file or PostgreSQL datastore
seed.js     demo dataset (users, novels, chapters, follows, reports…)
db.json     local JSON datastore (created automatically when DATABASE_URL is absent)
public/     SPA frontend (hash router, vanilla JS — no build step)
```

The datastore layer is isolated inside `server.js` (`db`, `saveDB`) so it can be
swapped for Postgres/Mongo without touching route handlers. API responses are
plain JSON, ready for a future mobile app.

## Future-proofing hooks (not yet implemented)

- `novels` documents can take `price` / `premium` fields for monetization
- Coin/subscription tables can hang off `users` without schema changes
- Chapters already carry `status`, allowing scheduled/paid-gating states later
