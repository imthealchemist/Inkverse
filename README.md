# SOLID INK NOVEL 📖

A modern, **mobile-first novel reading & publishing platform** (MVP).

## Run

```bash
node server.js          # → http://localhost:3000
```

Requires Node 18+ (`npm install` once — two dependencies: `pg`, `@supabase/supabase-js`).
Data persists in `db.json` locally, or in PostgreSQL/Supabase when configured
(auto-seeded on first run either way). To reset local data: delete `db.json` and restart.

## Storage backends

SOLID INK NOVEL auto-selects its datastore at startup (priority order):

| Environment | Storage | Notes |
|---|---|---|
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | **Supabase** | tables + book-cover Storage — recommended |
| `DATABASE_URL` set | PostgreSQL | any managed Postgres (e.g. Neon) |
| Neither | `db.json` file | zero-config, ideal for local dev |

On first boot an empty database is seeded with the demo library automatically.
**Secret keys live only on the backend** (Railway variables) — the frontend never sees them.

### Supabase setup (free tier)

1. Create a free project at https://supabase.com.
2. **SQL Editor → New query** → paste the contents of `supabase/schema.sql` → **Run**.
   This creates the 10 app tables with locked-down RLS and the public `covers` bucket.
3. Copy **Project URL** and the **service_role** key (Settings → API).
4. On Railway set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` → redeploy.

Covers are uploaded through the backend (validated: JPG/PNG/WebP, max **5 MB**)
and stored in Supabase Storage; novels, chapters and user data live in Supabase tables.

## Email verification (Gmail-style confirmation links)

When an email provider is configured, new accounts receive a **confirmation link
by email** and cannot log in until they click it (link expires in 24 h; resend is
rate-limited to one per 2 minutes). Without any config, accounts are
auto-confirmed (frictionless local dev).

> ⚠️ **Railway blocks outbound SMTP** (ports 25/465/587), so Gmail SMTP times out
> there. On Railway use one of the free **HTTPS email APIs** below instead —
> they send over port 443, which Railway allows.

### Option A — Brevo (recommended: 300 emails/day free)

1. Sign up free at https://www.brevo.com → **SMTP & API → API Keys → create a v3 key** (all email scopes).
2. Railway variables:
   - `EMAIL_PROVIDER` = `brevo`
   - `BREVO_API_KEY` = the key you created
   - `MAIL_FROM` = `SOLID INK NOVEL <you@yourdomain.com>` (any sender address; verify it in Brevo → *Senders* if prompted)

### Option B — SendGrid (100 emails/day free)

1. Sign up free at https://sendgrid.com → **Settings → API Keys → Create** (Mail Send scope).
2. Verify your sender address once under **Settings → Sender Authentication → Single Sender**.
3. Railway variables: `EMAIL_PROVIDER=sendgrid`, `SENDGRID_API_KEY=…`, `MAIL_FROM=… <verified-sender>`.

### Option C — Resend (100/day free)

Railway variables: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=…`, `MAIL_FROM=…`.
Note: Resend's free tier without a verified domain can only email *your own* address.

### Local / other hosts — SMTP (e.g. Gmail)

`SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=<your gmail>`,
`SMTP_PASS=<Gmail App Password>`, `MAIL_FROM=…`.
(Google Account → Security → 2-Step Verification → **App passwords**.)
Set `SMTP_HOST=console` to log emails to stdout instead of sending (testing).

## Deploying: Railway (host) + Supabase (free database)

The app is Railway-ready out of the box (reads `$PORT`, binds `0.0.0.0`, zero build step).

1. **Railway** — New Project → Deploy from GitHub repo → select this repository.
   Start Command: `node server.js` (no build command needed).
2. **Railway → Variables** → add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   (run `supabase/schema.sql` in Supabase first — see above).
3. **Settings → Networking → Generate Domain** for your public URL.

Stories posted by any user are stored in Supabase and visible to everyone,
surviving every restart and redeploy.

> Alternatives: PostgreSQL via `DATABASE_URL` (e.g. free Neon.tech), or a Railway
> Volume at `/data` with `DB_PATH=/data/db.json` for the JSON store.

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
- Follow writers; report novels/chapters (incl. copyright concerns)
- **Offline downloads**: ⬇ any novel to the device (IndexedDB), read in the *Downloaded* section with no internet
- **Installable PWA**: add to home screen, works offline

**Writers** (`Join as a Writer` in the main menu)
- Separate writer dashboard with stats
- Create/manage novels: cover upload (**JPG/PNG/WebP, max 5 MB**, validated client + server-side), title, description, multi-genre
- **Copyright attestation**: writers must confirm they hold the rights to publish before creating a novel
- Built-in rich-text editor (bold/italic/headings/quotes/lists), word count
- Save drafts, publish/unpublish, edit and delete chapters

**Verified writers**
- Verified ✓ badge shown across the app
- Writers submit verification requests; only admins approve/reject

**Admin / moderation**
- Overview stats, user management (roles, ban, manual verify), verification queue,
  novel moderation (feature/hide/delete), chapter moderation, genre management
- **Reports queue**: reader reports (incl. copyright) with dismiss / remove-content actions,
  hiding or deleting problematic novels/chapters, and banning problematic accounts

## Architecture

```
server.js            HTTP server: static files + REST API (/api/*); Supabase/PostgreSQL/JSON datastore
seed.js              demo dataset (users, novels, chapters, follows, reports…)
db.json              local JSON datastore (created automatically when no DB env is set)
supabase/schema.sql  one-time Supabase setup (tables + covers bucket)
public/              SPA frontend (hash router, vanilla JS — no build step)
public/sw.js         service worker (PWA, offline caching)
public/manifest.webmanifest  PWA manifest (install + icons)
public/icons/        app icons (192/512, incl. maskable)
```

The datastore layer is isolated inside `server.js` (`db`, `saveDB`), so backends
are swappable without touching route handlers. Cover uploads and all Supabase
calls happen server-side only; the service_role key is never exposed to the
browser. API responses are plain JSON, ready for a future native mobile app.

## Future-proofing hooks (not yet implemented)

- `novels` documents can take `price` / `premium` fields for monetization
- Coin/subscription tables can hang off `users` without schema changes
- Chapters already carry `status`, allowing scheduled/paid-gating states later
