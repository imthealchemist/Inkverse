#!/usr/bin/env node
/* SOLID INK NOVEL — novel reading & publishing platform (MVP)
   Zero-dependency Node.js server: static files + REST API + JSON datastore.
   Architecture note: the datastore layer (db object + saveDB) is isolated so it
   can be swapped for a real DB (Postgres/Mongo) later without touching routes. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUB = path.join(ROOT, 'public');
/* On ephemeral hosts (Railway, Render…) point DB_PATH at a mounted volume,
   e.g. DB_PATH=/data/db.json, so data survives restarts/redeploys. */
const DB_PATH = process.env.DB_PATH || path.join(ROOT, 'db.json');

/* ---------------- datastore ----------------
   Three backends, selected by environment at startup:
   - Supabase   when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (production)
                tables + cover Storage; secrets stay server-side only
   - PostgreSQL when DATABASE_URL is set
   - JSON file  (default, zero-config — local dev)
   All route handlers work against the same in-memory `db` object either way. */
const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const USE_PG = !USE_SUPABASE && !!process.env.DATABASE_URL;
const COLLECTIONS = ['users', 'sessions', 'genres', 'novels', 'chapters', 'bookmarks', 'history', 'follows', 'verifications', 'reports'];
let db;
let pgPool = null;
let supabase = null;
let persistChain = Promise.resolve();

function saveDB() {
  // Serialize writes so concurrent saves never interleave.
  if (USE_SUPABASE) { persistChain = persistChain.then(persistAllSupabase).catch(e => console.error('[db] persist error:', e.message)); return; }
  if (!USE_PG) { fs.writeFileSync(DB_PATH, JSON.stringify(db)); return; }
  persistChain = persistChain.then(persistAll).catch(e => console.error('[db] persist error:', e.message));
}

function loadDB() {
  if (fs.existsSync(DB_PATH)) { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); return; }
  db = require('./seed').build();
  saveDB();
  console.log('[seed] fresh database created');
}

/* ---- PostgreSQL backend ---- */
function rowsOf(c) {
  if (c === 'sessions') return Object.entries(db.sessions).map(([token, userId]) => ({ id: token, data: { token, userId } }));
  if (c === 'bookmarks') return db.bookmarks.map(b => ({ id: b.userId + ':' + b.novelId, data: b }));
  if (c === 'history') return db.history.map(h => ({ id: h.userId + ':' + h.novelId, data: h }));
  if (c === 'follows') return db.follows.map(f => ({ id: f.followerId + ':' + f.authorId, data: f }));
  return db[c].map(x => ({ id: x.id, data: x }));
}

async function persistAll() {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    for (const c of COLLECTIONS) {
      await client.query('DELETE FROM "' + c + '"');
      for (const r of rowsOf(c)) {
        await client.query('INSERT INTO "' + c + '" (id, data) VALUES ($1, $2)', [r.id, JSON.stringify(r.data)]);
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    throw e;
  } finally { client.release(); }
}

async function initPG() {
  const { Pool } = require('pg');
  const ssl = process.env.PGSSLMODE === 'disable' ? undefined : { rejectUnauthorized: false };
  pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl, max: 5 });
  await pgPool.query('SELECT 1'); // fail fast if unreachable
  for (const c of COLLECTIONS) {
    await pgPool.query('CREATE TABLE IF NOT EXISTS "' + c + '" (id TEXT PRIMARY KEY, data JSONB NOT NULL)');
  }
  db = { sessions: {} };
  for (const c of COLLECTIONS) {
    if (c === 'sessions') continue;
    const r = await pgPool.query('SELECT data FROM "' + c + '"');
    db[c] = r.rows.map(x => x.data);
  }
  const s = await pgPool.query('SELECT data FROM "sessions"');
  s.rows.forEach(x => { db.sessions[x.data.token] = x.data.userId; });
  if (!db.users.length) {
    db = require('./seed').build();
    await persistAll();
    console.log('[seed] seeded PostgreSQL with demo data');
  } else {
    console.log('[db] loaded from PostgreSQL: ' + db.users.length + ' users, ' + db.novels.length + ' novels, ' + db.chapters.length + ' chapters');
  }
}
const uid = () => crypto.randomBytes(8).toString('hex');
const now = () => new Date().toISOString();
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString('hex');
const stripTags = (html) => String(html || '').replace(/<[^>]*>/g, ' ');
const wordCount = (html) => stripTags(html).split(/\s+/).filter(Boolean).length;

/* ---------------- helpers ---------------- */
function httpError(code, msg) { const e = new Error(msg); e.code = code; return e; }
function json(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(b);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > 12 * 1024 * 1024) { reject(httpError(413, 'Payload too large')); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(httpError(400, 'Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}
function bearer(req) {
  const h = req.headers['authorization'] || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
function userOf(req) {
  const t = bearer(req);
  if (!t || !db.sessions[t]) return null;
  return db.users.find(u => u.id === db.sessions[t]) || null;
}
function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, verified: !!u.verified, emailVerified: u.emailVerified !== false, bio: u.bio || '', banned: !!u.banned, joinedAt: u.joinedAt, avatarColor: u.avatarColor };
}

/* ---------------- email (verification links) ----------------
   Providers (first match wins):
   - HTTP APIs over port 443 — REQUIRED on Railway, which blocks outbound SMTP.
     EMAIL_PROVIDER=brevo|sendgrid|resend + matching *_API_KEY (all have free tiers).
   - SMTP (nodemailer) — works on hosts that allow it; NOT on Railway.
   - SMTP_HOST=console — logs mail to stdout (dev/testing).
   With nothing configured, accounts are auto-confirmed (frictionless local dev). */
const SMTP_CONSOLE = process.env.SMTP_HOST === 'console';
const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || '').toLowerCase();
const HTTP_MAIL =
  (EMAIL_PROVIDER === 'brevo' && !!process.env.BREVO_API_KEY) ||
  (EMAIL_PROVIDER === 'sendgrid' && !!process.env.SENDGRID_API_KEY) ||
  (EMAIL_PROVIDER === 'resend' && !!process.env.RESEND_API_KEY);
const SMTP_ENABLED = SMTP_CONSOLE || HTTP_MAIL || !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

/* ---- Google OAuth ("Sign in with Google") ----
   Secrets (client secret) stay on the backend; the frontend only ever
   receives our own session token at the end of the flow. */
const GOOGLE_ENABLED = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const oauthStates = new Map(); // state -> expiry timestamp
function pruneStates() { const t = Date.now(); for (const [k, v] of oauthStates) if (v < t) oauthStates.delete(k); }

function parseFrom() {
  const raw = String(process.env.MAIL_FROM || process.env.SMTP_USER || '');
  const m = raw.match(/^([^<]*)<([^>]+)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: 'SOLID INK NOVEL', email: raw.trim() };
}

async function sendBrevo(to, subject, html) {
  const from = parseFrom();
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: { name: from.name || 'SOLID INK NOVEL', email: from.email }, to: [{ email: to }], subject, htmlContent: html })
  });
  if (!r.ok) throw new Error('Brevo ' + r.status + ': ' + (await r.text()).slice(0, 220));
}

async function sendSendGrid(to, subject, html) {
  const from = parseFrom();
  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.SENDGRID_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: from.email, name: from.name || 'SOLID INK NOVEL' }, subject, content: [{ type: 'text/html', value: html }] })
  });
  if (!r.ok) throw new Error('SendGrid ' + r.status + ': ' + (await r.text()).slice(0, 220));
}

async function sendResend(to, subject, html) {
  const from = parseFrom();
  const fromStr = from.name ? from.name + ' <' + from.email + '>' : from.email;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromStr, to: [to], subject, html })
  });
  if (!r.ok) throw new Error('Resend ' + r.status + ': ' + (await r.text()).slice(0, 220));
}

async function sendMail(to, subject, html) {
  if (SMTP_CONSOLE) {
    console.log('[mail:console] to=' + to + ' subject="' + subject + '" body: ' + html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    return;
  }
  if (EMAIL_PROVIDER === 'brevo' && process.env.BREVO_API_KEY) return sendBrevo(to, subject, html);
  if (EMAIL_PROVIDER === 'sendgrid' && process.env.SENDGRID_API_KEY) return sendSendGrid(to, subject, html);
  if (EMAIL_PROVIDER === 'resend' && process.env.RESEND_API_KEY) return sendResend(to, subject, html);
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_PORT) === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15000
  });
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html });
}

function appOrigin(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  return proto + '://' + req.headers.host;
}

function verifyEmailHtml(name, link) {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0b0d12;color:#e9ebf2;border-radius:12px">
  <h2 style="margin:0 0 4px">SOLID INK <span style="color:#8b5cf6">NOVEL</span></h2>
  <p style="color:#98a1b3;margin:0 0 20px">Read boldly. Write bravely.</p>
  <p>Hi ${name},</p>
  <p>Welcome! Please confirm your email address by clicking the button below. The link expires in 24 hours.</p>
  <p style="margin:26px 0"><a href="${link}" style="background:#8b5cf6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold">Confirm my email</a></p>
  <p style="color:#98a1b3;font-size:13px">If the button doesn't work, paste this link into your browser:<br>${link}</p>
  <p style="color:#6b7385;font-size:12px;margin-top:26px">If you didn't create this account, you can safely ignore this email.</p>
  </div>`;
}

function newVerifyToken(u) {
  u.verifyToken = crypto.randomBytes(24).toString('hex');
  u.verifyExpires = new Date(Date.now() + 24 * 36e5).toISOString();
  u.lastResendAt = now();
}
function followerCount(userId) { return db.follows.filter(f => f.authorId === userId).length; }
function followingCount(userId) { return db.follows.filter(f => f.followerId === userId).length; }

function novelById(id) { return db.novels.find(n => n.id === id); }
function userById(id) { return db.users.find(u => u.id === id); }
function chapterById(id) { return db.chapters.find(c => c.id === id); }

function enrichNovel(n, viewer) {
  const author = userById(n.authorId);
  const chs = db.chapters.filter(c => c.novelId === n.id && c.status === 'published');
  const lastCh = db.chapters.filter(c => c.novelId === n.id && c.status === 'published').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return {
    id: n.id, title: n.title, description: n.description, genres: n.genres, cover: n.cover,
    status: n.status, featured: !!n.featured, createdAt: n.createdAt,
    views: n.views || 0, wordCount: chs.reduce((s, c) => s + c.wordCount, 0),
    chapterCount: chs.length, latestChapterAt: lastCh ? lastCh.updatedAt : n.createdAt,
    authorId: n.authorId,
    authorName: author ? author.name : 'Unknown', authorVerified: author ? !!author.verified : false,
    bookmarked: viewer ? db.bookmarks.some(b => b.userId === viewer.id && b.novelId === n.id) : false
  };
}

function recommend(user, limit = 8) {
  const hist = db.history.filter(h => h.userId === user.id).map(h => h.novelId);
  const bm = db.bookmarks.filter(b => b.userId === user.id).map(b => b.novelId);
  const ids = [...new Set([...hist, ...bm])];
  const score = {};
  ids.forEach(id => { const n = novelById(id); if (n) n.genres.forEach(g => score[g] = (score[g] || 0) + 1); });
  const hasSignal = Object.keys(score).length > 0;
  return db.novels.filter(n => n.status === 'published')
    .map(n => ({ n, s: (hasSignal ? n.genres.reduce((a, g) => a + (score[g] || 0), 0) * 10 : 0) + Math.log((n.views || 0) + 1) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.n);
}

function canManageNovel(user, novel) {
  return user && (user.role === 'admin' || novel.authorId === user.id);
}

/* ---------------- router ---------------- */
const routes = [];
function route(method, pattern, handler, opts = {}) {
  routes.push({ method, re: new RegExp('^' + pattern + '$'), handler, opts });
}

/* ---- auth ---- */
route('POST', '/api/auth/signup', async ({ res, req, body }) => {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (name.length < 2) throw httpError(400, 'Please enter your name');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw httpError(400, 'Please enter a valid email');
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (db.users.some(u => u.email === email)) throw httpError(409, 'An account with this email already exists');
  const salt = crypto.randomBytes(8).toString('hex');
  const colors = ['#8b5cf6', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#e11d48', '#06b6d4', '#a3e635'];
  const u = { id: uid(), name, email, salt, passHash: hashPw(password, salt), role: 'reader', verified: false, bio: '', banned: false, joinedAt: now(), avatarColor: colors[Math.floor(Math.random() * colors.length)] };
  if (SMTP_ENABLED) { u.emailVerified = false; newVerifyToken(u); }
  else u.emailVerified = true;
  db.users.push(u);
  saveDB();
  if (SMTP_ENABLED) {
    const link = appOrigin(req) + '/#/verify?token=' + u.verifyToken;
    try { await sendMail(email, 'Confirm your SOLID INK NOVEL account', verifyEmailHtml(name, link)); }
    catch (e) { console.error('[mail] verification email failed:', e.message); }
    return json(res, 200, { emailVerificationRequired: true, user: publicUser(u) });
  }
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = u.id;
  saveDB();
  json(res, 200, { token, user: publicUser(u) });
});

route('POST', '/api/auth/login', ({ res, body }) => {
  const email = String(body.email || '').trim().toLowerCase();
  const u = db.users.find(x => x.email === email);
  if (!u || u.passHash !== hashPw(String(body.password || ''), u.salt)) throw httpError(401, 'Invalid email or password');
  if (u.banned) throw httpError(403, 'This account has been suspended');
  if (SMTP_ENABLED && u.emailVerified === false) {
    return json(res, 403, { error: 'Email not verified', unverified: true, email: u.email });
  }
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = u.id;
  saveDB();
  json(res, 200, { token, user: publicUser(u) });
});

route('GET', '/api/auth/verify-email', ({ res, query }) => {
  const t = String(query.get('token') || '');
  const u = db.users.find(x => x.verifyToken && x.verifyToken === t);
  if (!u) return json(res, 400, { ok: false, error: 'This confirmation link is invalid or has already been used.' });
  if (u.verifyExpires && new Date(u.verifyExpires) < new Date()) return json(res, 400, { ok: false, error: 'This confirmation link has expired. Request a new one from the login page.' });
  u.emailVerified = true; u.verifyToken = null; u.verifyExpires = null;
  saveDB();
  json(res, 200, { ok: true, name: u.name });
});

route('POST', '/api/auth/resend-verification', async ({ res, req, body }) => {
  const email = String(body.email || '').trim().toLowerCase();
  const u = db.users.find(x => x.email === email);
  // Don't reveal whether the account exists; just rate-limit real ones.
  if (!u || u.emailVerified !== false) return json(res, 200, { ok: true });
  if (u.lastResendAt && Date.now() - new Date(u.lastResendAt).getTime() < 120000) {
    throw httpError(429, 'Please wait 2 minutes before requesting another email.');
  }
  newVerifyToken(u);
  saveDB();
  const link = appOrigin(req) + '/#/verify?token=' + u.verifyToken;
  try { await sendMail(email, 'Confirm your SOLID INK NOVEL account', verifyEmailHtml(u.name, link)); }
  catch (e) { console.error('[mail] resend failed:', e.message); throw httpError(500, 'Could not send the email. Please try again later.'); }
  json(res, 200, { ok: true });
});

route('POST', '/api/auth/logout', ({ res, req }, ) => {
  const t = bearer(req);
  if (t) { delete db.sessions[t]; saveDB(); }
  json(res, 200, { ok: true });
}, { auth: true });

route('GET', '/api/auth/me', ({ res, user }) => {
  const pending = db.verifications.find(v => v.userId === user.id && v.status === 'pending');
  json(res, 200, { user: publicUser(user), followers: followerCount(user.id), following: followingCount(user.id), verificationPending: !!pending });
}, { auth: true });

route('PUT', '/api/me', ({ res, body, user }) => {
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) throw httpError(400, 'Name too short');
    user.name = name;
  }
  if (body.bio !== undefined) user.bio = String(body.bio).slice(0, 500);
  saveDB();
  json(res, 200, { user: publicUser(user) });
}, { auth: true });

/* ---- meta ---- */
route('GET', '/api/genres', ({ res }) => json(res, 200, { genres: db.genres, google: GOOGLE_ENABLED }));

/* ---- Google OAuth routes ---- */
route('GET', '/api/auth/google', ({ res, req }) => {
  if (!GOOGLE_ENABLED) throw httpError(400, 'Google sign-in is not configured');
  pruneStates();
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: appOrigin(req) + '/api/auth/google/callback',
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account'
  });
  res.writeHead(302, { Location: 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString() });
  res.end();
});

route('GET', '/api/auth/google/callback', async ({ res, req, query }) => {
  const origin = appOrigin(req);
  const finish = (hash) => { res.writeHead(302, { Location: origin + '/' + hash }); res.end(); };
  const fail = (msg) => finish('#/auth?gerror=' + encodeURIComponent(msg));
  try {
    if (!GOOGLE_ENABLED) return fail('Google sign-in is not configured');
    const state = String(query.get('state') || '');
    if (!state || !oauthStates.has(state) || oauthStates.get(state) < Date.now()) return fail('The sign-in session expired — please try again.');
    oauthStates.delete(state);
    if (query.get('error')) return fail('Google sign-in was cancelled.');
    const code = query.get('code');
    if (!code) return fail('Missing authorization code from Google.');

    // Exchange the code for tokens (server-to-server; client secret never leaves the backend)
    const tokRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: appOrigin(req) + '/api/auth/google/callback',
        grant_type: 'authorization_code'
      })
    });
    const tok = await tokRes.json().catch(() => ({}));
    if (!tokRes.ok || !tok.id_token) { console.error('[oauth] token exchange failed:', tok.error_description || tokRes.status); return fail('Could not complete Google sign-in.'); }

    // Decode + sanity-check the ID token (received directly from Google over TLS)
    const payload = JSON.parse(Buffer.from(tok.id_token.split('.')[1], 'base64url').toString());
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID || !['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss)) return fail('Invalid Google token.');
    if (!payload.email) return fail('This Google account has no email address.');

    const email = String(payload.email).toLowerCase();
    let u = db.users.find(x => x.email === email);
    if (!u) {
      const salt = crypto.randomBytes(8).toString('hex');
      const colors = ['#8b5cf6', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#e11d48', '#06b6d4', '#a3e635'];
      u = {
        id: uid(), name: String(payload.name || email.split('@')[0]).slice(0, 60), email, salt,
        passHash: hashPw(crypto.randomBytes(24).toString('hex'), salt), // random — login is via Google
        role: 'reader', verified: false, emailVerified: true, bio: '', banned: false,
        joinedAt: now(), avatarColor: colors[Math.floor(Math.random() * colors.length)],
        googleId: payload.sub, avatarUrl: payload.picture || ''
      };
      db.users.push(u);
    } else {
      if (u.banned) return fail('This account has been suspended.');
      u.googleId = payload.sub; // link Google to the existing account
      if (payload.picture && !u.avatarUrl) u.avatarUrl = payload.picture;
      u.emailVerified = true;
    }
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = u.id;
    saveDB();
    finish('#/oauth-done?token=' + token);
  } catch (e) {
    console.error('[oauth] google callback error:', e.message);
    fail('Google sign-in failed — please try again.');
  }
});

/* ---- users / follow ---- */
route('GET', '/api/users/(?<id>[^/]+)', ({ res, params, user }) => {
  const target = userById(params.id);
  if (!target) throw httpError(404, 'User not found');
  const novels = db.novels.filter(n => n.authorId === target.id && n.status === 'published').map(n => enrichNovel(n, user));
  json(res, 200, {
    user: { id: target.id, name: target.name, role: target.role, verified: !!target.verified, bio: target.bio, joinedAt: target.joinedAt, avatarColor: target.avatarColor },
    followers: followerCount(target.id), followingCount: followingCount(target.id),
    isFollowing: user ? db.follows.some(f => f.followerId === user.id && f.authorId === target.id) : false,
    novels
  });
});

route('POST', '/api/users/(?<id>[^/]+)/follow', ({ res, params, user }) => {
  if (params.id === user.id) throw httpError(400, 'You cannot follow yourself');
  if (!userById(params.id)) throw httpError(404, 'User not found');
  const i = db.follows.findIndex(f => f.followerId === user.id && f.authorId === params.id);
  if (i >= 0) db.follows.splice(i, 1); else db.follows.push({ followerId: user.id, authorId: params.id, at: now() });
  saveDB();
  json(res, 200, { following: i < 0, followers: followerCount(params.id) });
}, { auth: true });

/* ---- novels ---- */
route('GET', '/api/novels/home', ({ res, user }) => {
  const pub = db.novels.filter(n => n.status === 'published');
  const featured = pub.filter(n => n.featured).map(n => enrichNovel(n, user));
  const latest = [...pub].sort((a, b) => {
    const la = Math.max(a.createdAt, ...(db.chapters.filter(c => c.novelId === a.id && c.status === 'published').map(c => c.updatedAt)));
    const lb = Math.max(b.createdAt, ...(db.chapters.filter(c => c.novelId === b.id && c.status === 'published').map(c => c.updatedAt)));
    return String(lb).localeCompare(String(la));
  }).slice(0, 10).map(n => enrichNovel(n, user));
  const rec = recommend(user || { id: '__anon__' }, 8).map(n => enrichNovel(n, user));
  const counts = {};
  pub.forEach(n => n.genres.forEach(g => counts[g] = (counts[g] || 0) + 1));
  json(res, 200, { featured, latest, recommended: rec, genreCounts: counts });
});

route('GET', '/api/novels', ({ res, query, user }) => {
  let list = db.novels.filter(n => n.status === 'published');
  const q = (query.get('q') || '').trim().toLowerCase();
  const genre = query.get('genre');
  const author = query.get('author');
  const sort = query.get('sort') || 'popular';
  if (genre) list = list.filter(n => n.genres.some(g => g.toLowerCase() === genre.toLowerCase()));
  if (author) list = list.filter(n => n.authorId === author);
  if (q) list = list.filter(n => {
    const a = userById(n.authorId);
    return n.title.toLowerCase().includes(q) || (a && a.name.toLowerCase().includes(q)) || n.genres.some(g => g.toLowerCase().includes(q));
  });
  const enriched = list.map(n => enrichNovel(n, user));
  if (sort === 'newest') enriched.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else if (sort === 'updated') enriched.sort((a, b) => b.latestChapterAt.localeCompare(a.latestChapterAt));
  else enriched.sort((a, b) => b.views - a.views);
  json(res, 200, { novels: enriched.slice(0, 60) });
});

route('GET', '/api/novels/(?<id>[^/]+)', ({ res, params, user }) => {
  const n = novelById(params.id);
  if (!n) throw httpError(404, 'Novel not found');
  n.views = (n.views || 0) + 1; saveDB();
  const owner = canManageNovel(user, n);
  let chs = db.chapters.filter(c => c.novelId === n.id).sort((a, b) => a.order - b.order);
  if (!owner) chs = chs.filter(c => c.status === 'published');
  const author = userById(n.authorId);
  json(res, 200, {
    novel: enrichNovel(n, user),
    author: author ? { id: author.id, name: author.name, verified: !!author.verified, bio: author.bio, avatarColor: author.avatarColor, followers: followerCount(author.id) } : null,
    isFollowingAuthor: user && author ? db.follows.some(f => f.followerId === user.id && f.authorId === author.id) : false,
    chapters: chs.map(c => ({ id: c.id, title: c.title, status: c.status, order: c.order, updatedAt: c.updatedAt, wordCount: c.wordCount })),
    history: user ? (db.history.find(h => h.userId === user.id && h.novelId === n.id) || null) : null
  });
});

route('POST', '/api/novels', ({ res, body, user }) => {
  const title = String(body.title || '').trim();
  if (title.length < 2) throw httpError(400, 'Title is required');
  if (body.rightsConfirmed !== true) throw httpError(400, 'You must confirm you have the rights to publish this content');
  const genres = Array.isArray(body.genres) ? body.genres.map(g => String(g).trim()).filter(Boolean).slice(0, 5) : [];
  const n = {
    id: uid(), authorId: user.id, title,
    description: String(body.description || '').slice(0, 2000),
    genres, cover: body.cover ? String(body.cover).slice(0, 400000) : '',
    status: 'published', featured: false, views: 0, createdAt: now(),
    rightsConfirmed: true, rightsConfirmedAt: now()
  };
  db.novels.push(n); saveDB();
  json(res, 200, { novel: enrichNovel(n, user) });
}, { writer: true });

function putNovelHandler({ res, params, body, user }) {
  const n = novelById(params.id);
  if (!n) throw httpError(404, 'Novel not found');
  if (!canManageNovel(user, n)) throw httpError(403, 'Not allowed');
  if (body.title !== undefined) { const t = String(body.title).trim(); if (t.length < 2) throw httpError(400, 'Title too short'); n.title = t; }
  if (body.description !== undefined) n.description = String(body.description).slice(0, 2000);
  if (body.genres !== undefined && Array.isArray(body.genres)) n.genres = body.genres.map(g => String(g).trim()).filter(Boolean).slice(0, 5);
  if (body.cover !== undefined) n.cover = String(body.cover).slice(0, 400000);
  if (user.role === 'admin') {
    if (body.featured !== undefined) n.featured = !!body.featured;
    if (body.status !== undefined && ['published', 'hidden'].includes(body.status)) n.status = body.status;
  }
  saveDB();
  json(res, 200, { novel: enrichNovel(n, user) });
}
function deleteNovelHandler({ res, params, user }) {
  const n = novelById(params.id);
  if (!n) throw httpError(404, 'Novel not found');
  if (!canManageNovel(user, n)) throw httpError(403, 'Not allowed');
  deleteCoverObject(n.cover); // best-effort Supabase Storage cleanup
  db.novels = db.novels.filter(x => x.id !== n.id);
  db.chapters = db.chapters.filter(c => c.novelId !== n.id);
  db.bookmarks = db.bookmarks.filter(b => b.novelId !== n.id);
  db.history = db.history.filter(h => h.novelId !== n.id);
  db.reports = db.reports.filter(r => !(r.targetId === n.id));
  saveDB();
  json(res, 200, { ok: true });
}
route('PUT', '/api/novels/(?<id>[^/]+)', putNovelHandler, { auth: true });
route('DELETE', '/api/novels/(?<id>[^/]+)', deleteNovelHandler, { auth: true });
route('PUT', '/api/admin/novels/(?<id>[^/]+)', putNovelHandler, { admin: true });
route('DELETE', '/api/admin/novels/(?<id>[^/]+)', deleteNovelHandler, { admin: true });

/* ---- cover upload (validated server-side; stored in Supabase Storage when active) ---- */
const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB
route('POST', '/api/upload-cover', async ({ res, body, user }) => {
  const dataUrl = String(body.dataUrl || '');
  const m = dataUrl.match(/^data:(image\/(jpeg|jpg|png|webp));base64,(.+)$/i);
  if (!m) throw httpError(400, 'Cover must be a JPG, PNG or WebP image');
  const buf = Buffer.from(m[3], 'base64');
  if (!buf.length) throw httpError(400, 'Cover file is empty');
  if (buf.length > MAX_COVER_BYTES) throw httpError(400, 'Cover exceeds the 5 MB limit');
  if (!USE_SUPABASE) return json(res, 200, { url: dataUrl }); // JSON/PG backends keep inline data
  const ext = (m[2].toLowerCase() === 'jpg' ? 'jpeg' : m[2].toLowerCase());
  const path = user.id + '-' + Date.now() + '.' + (ext === 'jpeg' ? 'jpg' : ext);
  const { error } = await supabase.storage.from('covers').upload(path, buf, { contentType: 'image/' + ext, upsert: true });
  if (error) throw httpError(500, 'Cover upload failed: ' + error.message);
  const { data } = supabase.storage.from('covers').getPublicUrl(path);
  json(res, 200, { url: data.publicUrl });
}, { writer: true });

route('POST', '/api/novels/(?<id>[^/]+)/bookmark', ({ res, params, user }) => {
  if (!novelById(params.id)) throw httpError(404, 'Novel not found');
  const i = db.bookmarks.findIndex(b => b.userId === user.id && b.novelId === params.id);
  if (i >= 0) db.bookmarks.splice(i, 1); else db.bookmarks.push({ userId: user.id, novelId: params.id, at: now() });
  saveDB();
  json(res, 200, { bookmarked: i < 0 });
}, { auth: true });

/* ---- chapters ---- */
route('GET', '/api/chapters/(?<id>[^/]+)', ({ res, params, user }) => {
  const c = chapterById(params.id);
  if (!c) throw httpError(404, 'Chapter not found');
  const n = novelById(c.novelId);
  if (!n) throw httpError(404, 'Novel not found');
  const owner = canManageNovel(user, n);
  if (c.status !== 'published' && !owner) throw httpError(403, 'This chapter is not published');
  const pub = db.chapters.filter(x => x.novelId === n.id && x.status === 'published').sort((a, b) => a.order - b.order);
  const idx = pub.findIndex(x => x.id === c.id);
  json(res, 200, {
    chapter: { id: c.id, novelId: c.novelId, title: c.title, content: c.content, status: c.status, order: c.order, updatedAt: c.updatedAt, wordCount: c.wordCount },
    novel: { id: n.id, title: n.title, cover: n.cover, authorId: n.authorId },
    prev: idx > 0 ? { id: pub[idx - 1].id, title: pub[idx - 1].title } : null,
    next: idx >= 0 && idx < pub.length - 1 ? { id: pub[idx + 1].id, title: pub[idx + 1].title } : null,
    chapters: pub.map((x, i) => ({ id: x.id, title: x.title, num: i + 1 })),
    num: idx + 1, total: pub.length, canEdit: owner
  });
});

route('POST', '/api/novels/(?<id>[^/]+)/chapters', ({ res, params, body, user }) => {
  const n = novelById(params.id);
  if (!n) throw httpError(404, 'Novel not found');
  if (n.authorId !== user.id && user.role !== 'admin') throw httpError(403, 'Not allowed');
  const title = String(body.title || '').trim();
  if (!title) throw httpError(400, 'Chapter title is required');
  const maxOrder = db.chapters.filter(c => c.novelId === n.id).reduce((m, c) => Math.max(m, c.order), 0);
  const content = String(body.content || '');
  const c = {
    id: uid(), novelId: n.id, title, content,
    status: body.status === 'published' ? 'published' : 'draft',
    order: maxOrder + 1, createdAt: now(), updatedAt: now(), wordCount: wordCount(content)
  };
  db.chapters.push(c); saveDB();
  json(res, 200, { chapter: { id: c.id, title: c.title, status: c.status, order: c.order, wordCount: c.wordCount } });
}, { writer: true });

route('PUT', '/api/chapters/(?<id>[^/]+)', ({ res, params, body, user }) => {
  const c = chapterById(params.id);
  if (!c) throw httpError(404, 'Chapter not found');
  const n = novelById(c.novelId);
  if (!canManageNovel(user, n)) throw httpError(403, 'Not allowed');
  if (body.title !== undefined) { const t = String(body.title).trim(); if (!t) throw httpError(400, 'Title required'); c.title = t; }
  if (body.content !== undefined) { c.content = String(body.content); c.wordCount = wordCount(c.content); }
  if (body.status !== undefined && ['draft', 'published'].includes(body.status)) c.status = body.status;
  c.updatedAt = now();
  saveDB();
  json(res, 200, { chapter: { id: c.id, title: c.title, status: c.status, wordCount: c.wordCount } });
}, { auth: true });

function deleteChapterHandler({ res, params, user }) {
  const c = chapterById(params.id);
  if (!c) throw httpError(404, 'Chapter not found');
  const n = novelById(c.novelId);
  if (!canManageNovel(user, n)) throw httpError(403, 'Not allowed');
  db.chapters = db.chapters.filter(x => x.id !== c.id);
  db.history = db.history.filter(h => h.chapterId !== c.id);
  saveDB();
  json(res, 200, { ok: true });
}
route('DELETE', '/api/chapters/(?<id>[^/]+)', deleteChapterHandler, { auth: true });
route('DELETE', '/api/admin/chapters/(?<id>[^/]+)', deleteChapterHandler, { admin: true });

/* ---- library / history ---- */
route('GET', '/api/me/library', ({ res, user }) => {
  const bookmarks = db.bookmarks.filter(b => b.userId === user.id).sort((a, b) => b.at.localeCompare(a.at))
    .map(b => { const n = novelById(b.novelId); return n ? { ...enrichNovel(n, user), bookmarkedAt: b.at } : null; }).filter(Boolean);
  const history = db.history.filter(h => h.userId === user.id).sort((a, b) => b.at.localeCompare(a.at))
    .map(h => {
      const n = novelById(h.novelId); const c = chapterById(h.chapterId);
      if (!n) return null;
      const pub = db.chapters.filter(x => x.novelId === n.id && x.status === 'published').sort((a, b) => a.order - b.order);
      const num = c ? pub.findIndex(x => x.id === c.id) + 1 : 0;
      return { novel: enrichNovel(n, user), chapterId: h.chapterId, chapterTitle: c ? c.title : 'Unknown chapter', chapterNum: num, totalChapters: pub.length, at: h.at };
    }).filter(Boolean);
  json(res, 200, { bookmarks, history });
}, { auth: true });

route('POST', '/api/me/history', ({ res, body, user }) => {
  const { novelId, chapterId } = body;
  if (!novelById(novelId) || !chapterById(chapterId)) throw httpError(404, 'Not found');
  db.history = db.history.filter(h => !(h.userId === user.id && h.novelId === novelId));
  db.history.push({ userId: user.id, novelId, chapterId, at: now() });
  saveDB();
  json(res, 200, { ok: true });
}, { auth: true });

route('GET', '/api/me/following', ({ res, user }) => {
  const list = db.follows.filter(f => f.followerId === user.id)
    .map(f => { const u = userById(f.authorId); return u ? { ...publicUser(u), followers: followerCount(u.id), novelCount: db.novels.filter(n => n.authorId === u.id && n.status === 'published').length } : null; })
    .filter(Boolean);
  json(res, 200, { following: list });
}, { auth: true });

/* ---- writer ---- */
route('POST', '/api/writer/join', ({ res, user }) => {
  if (user.role === 'reader') { user.role = 'writer'; saveDB(); }
  json(res, 200, { user: publicUser(user) });
}, { auth: true });

route('POST', '/api/writer/verification', ({ res, body, user }) => {
  if (user.role === 'admin') throw httpError(400, 'Admins cannot request verification');
  if (user.verified) throw httpError(400, 'Already verified');
  if (db.verifications.some(v => v.userId === user.id && v.status === 'pending')) throw httpError(400, 'A request is already pending');
  db.verifications.push({ id: uid(), userId: user.id, message: String(body.message || '').slice(0, 1000), status: 'pending', at: now() });
  saveDB();
  json(res, 200, { ok: true });
}, { auth: true });

/* ---- reports ---- */
route('POST', '/api/reports', ({ res, body, user }) => {
  const { type, targetId, reason } = body;
  if (!['novel', 'chapter'].includes(type) || !targetId) throw httpError(400, 'Invalid report');
  if (type === 'novel' && !novelById(targetId)) throw httpError(404, 'Novel not found');
  if (type === 'chapter' && !chapterById(targetId)) throw httpError(404, 'Chapter not found');
  db.reports.push({ id: uid(), reporterId: user.id, type, targetId, reason: String(reason || 'No details given').slice(0, 1000), status: 'open', at: now() });
  saveDB();
  json(res, 200, { ok: true });
}, { auth: true });

/* ---- admin ---- */
route('GET', '/api/admin/overview', ({ res }) => {
  json(res, 200, {
    users: db.users.length,
    writers: db.users.filter(u => u.role === 'writer').length,
    novels: db.novels.length,
    chapters: db.chapters.length,
    openReports: db.reports.filter(r => r.status === 'open').length,
    pendingVerifications: db.verifications.filter(v => v.status === 'pending').length,
    totalViews: db.novels.reduce((s, n) => s + (n.views || 0), 0)
  });
}, { admin: true });

route('GET', '/api/admin/users', ({ res, query }) => {
  const q = (query.get('q') || '').toLowerCase();
  let list = [...db.users].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  if (q) list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.includes(q));
  json(res, 200, { users: list.map(u => ({ ...publicUser(u), followers: followerCount(u.id), novelCount: db.novels.filter(n => n.authorId === u.id).length })) });
}, { admin: true });

route('PUT', '/api/admin/users/(?<id>[^/]+)', ({ res, params, body, user }) => {
  const t = userById(params.id);
  if (!t) throw httpError(404, 'User not found');
  if (t.id === user.id && (body.role !== undefined || body.banned)) throw httpError(400, 'You cannot change your own role or ban yourself');
  if (body.role !== undefined && ['reader', 'writer', 'admin'].includes(body.role)) t.role = body.role;
  if (body.banned !== undefined) t.banned = !!body.banned;
  if (body.verified !== undefined) t.verified = !!body.verified;
  saveDB();
  json(res, 200, { user: publicUser(t) });
}, { admin: true });

route('GET', '/api/admin/verifications', ({ res }) => {
  const list = [...db.verifications].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1) || b.at.localeCompare(a.at))
    .map(v => { const u = userById(v.userId); return { ...v, userName: u ? u.name : '?', novelCount: db.novels.filter(n => n.authorId === v.userId).length }; });
  json(res, 200, { requests: list });
}, { admin: true });

route('POST', '/api/admin/verifications/(?<id>[^/]+)/approve', ({ res, params }) => {
  const v = db.verifications.find(x => x.id === params.id);
  if (!v) throw httpError(404, 'Request not found');
  v.status = 'approved';
  const u = userById(v.userId);
  if (u) { u.verified = true; if (u.role === 'reader') u.role = 'writer'; }
  saveDB();
  json(res, 200, { ok: true });
}, { admin: true });

route('POST', '/api/admin/verifications/(?<id>[^/]+)/reject', ({ res, params }) => {
  const v = db.verifications.find(x => x.id === params.id);
  if (!v) throw httpError(404, 'Request not found');
  v.status = 'rejected'; saveDB();
  json(res, 200, { ok: true });
}, { admin: true });

route('GET', '/api/admin/novels', ({ res }) => {
  json(res, 200, { novels: [...db.novels].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(n => enrichNovel(n, null)) });
}, { admin: true });

route('GET', '/api/admin/chapters', ({ res }) => {
  const list = [...db.chapters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100)
    .map(c => { const n = novelById(c.novelId); return { id: c.id, title: c.title, status: c.status, wordCount: c.wordCount, updatedAt: c.updatedAt, novelId: c.novelId, novelTitle: n ? n.title : '?' }; });
  json(res, 200, { chapters: list });
}, { admin: true });

route('GET', '/api/admin/reports', ({ res }) => {
  const list = [...db.reports].sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1) || b.at.localeCompare(a.at))
    .map(r => {
      const reporter = userById(r.reporterId);
      let targetTitle = '?', targetLink = null;
      if (r.type === 'novel') { const n = novelById(r.targetId); targetTitle = n ? n.title : '(deleted)'; targetLink = n ? '#/novel/' + n.id : null; }
      else { const c = chapterById(r.targetId); targetTitle = c ? c.title : '(deleted)'; targetLink = c ? '#/novel/' + c.novelId : null; }
      return { ...r, reporterName: reporter ? reporter.name : '?', targetTitle, targetLink };
    });
  json(res, 200, { reports: list });
}, { admin: true });

route('POST', '/api/admin/reports/(?<id>[^/]+)/resolve', ({ res, params, body }) => {
  const r = db.reports.find(x => x.id === params.id);
  if (!r) throw httpError(404, 'Report not found');
  if (body.action === 'remove') {
    if (r.type === 'novel') {
      db.novels = db.novels.filter(n => n.id !== r.targetId);
      db.chapters = db.chapters.filter(c => c.novelId !== r.targetId);
      db.bookmarks = db.bookmarks.filter(b => b.novelId !== r.targetId);
      db.history = db.history.filter(h => h.novelId !== r.targetId);
    } else {
      db.chapters = db.chapters.filter(c => c.id !== r.targetId);
      db.history = db.history.filter(h => h.chapterId !== r.targetId);
    }
    r.status = 'removed';
  } else r.status = 'dismissed';
  saveDB();
  json(res, 200, { ok: true });
}, { admin: true });

route('POST', '/api/admin/genres', ({ res, body }) => {
  const name = String(body.name || '').trim();
  if (name.length < 2) throw httpError(400, 'Genre name too short');
  if (db.genres.some(g => g.name.toLowerCase() === name.toLowerCase())) throw httpError(409, 'Genre already exists');
  const g = { id: uid(), name };
  db.genres.push(g); saveDB();
  json(res, 200, { genre: g });
}, { admin: true });

route('DELETE', '/api/admin/genres/(?<id>[^/]+)', ({ res, params }) => {
  db.genres = db.genres.filter(g => g.id !== params.id);
  saveDB();
  json(res, 200, { ok: true });
}, { admin: true });

route('GET', '/api/health', ({ res }) => json(res, 200, { ok: true, name: 'SOLID INK NOVEL', time: now() }));

/* ---------------- static ---------------- */
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function serveStatic(res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  const fp = path.normalize(path.join(PUB, pathname));
  if (!fp.startsWith(PUB)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(fp, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(PUB, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

/* ---------------- server ---------------- */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const p = u.pathname;
    if (p.startsWith('/api/')) {
      if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }); return res.end(); }
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = p.match(r.re);
        if (!m) continue;
        let body = {};
        if (req.method !== 'GET') body = await readBody(req);
        const user = userOf(req);
        if (r.opts.auth && !user) return json(res, 401, { error: 'Please sign in' });
        if (r.opts.writer && (!user || !(user.role === 'writer' || user.role === 'admin'))) return json(res, 403, { error: 'A writer account is required' });
        if (r.opts.admin && (!user || user.role !== 'admin')) return json(res, 403, { error: 'Admin access required' });
        return await r.handler({ res, req, params: m.groups || {}, query: u.searchParams, body, user });
      }
      return json(res, 404, { error: 'Endpoint not found' });
    }
    return serveStatic(res, p);
  } catch (e) {
    return json(res, e.code || 500, { error: e.message || 'Server error' });
  }
});

/* ---- Supabase backend (tables + cover Storage) ---- */
async function persistAllSupabase() {
  for (const c of COLLECTIONS) {
    const { error: delErr } = await supabase.from(c).delete().neq('id', '');
    if (delErr) throw delErr;
    const rows = rowsOf(c).map(r => ({ id: r.id, data: r.data }));
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from(c).upsert(rows.slice(i, i + 500));
      if (error) throw error;
    }
  }
}

async function initSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  // Node < 22 has no built-in WebSocket client — Supabase Realtime needs one,
  // so provide the `ws` package as the transport on older runtimes (e.g. Railway).
  const realtimeOpts = typeof globalThis.WebSocket === 'undefined' ? { transport: require('ws') } : {};
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }, realtime: realtimeOpts });
  // Verify tables exist (schema.sql must be run once in the Supabase SQL Editor)
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.error('[db] Supabase tables missing — run supabase/schema.sql once in the Supabase SQL Editor. (' + error.message + ')');
    process.exit(1);
  }
  db = { sessions: {} };
  for (const c of COLLECTIONS) {
    if (c === 'sessions') continue;
    const { data, error: e2 } = await supabase.from(c).select('data');
    if (e2) throw e2;
    db[c] = (data || []).map(x => x.data);
  }
  const { data: srows } = await supabase.from('sessions').select('data');
  (srows || []).forEach(x => { db.sessions[x.data.token] = x.data.userId; });
  if (!db.users.length) {
    db = require('./seed').build();
    await persistAllSupabase();
    console.log('[seed] seeded Supabase with demo data');
  } else {
    console.log('[db] loaded from Supabase: ' + db.users.length + ' users, ' + db.novels.length + ' novels, ' + db.chapters.length + ' chapters');
  }
  // Ensure the public covers bucket exists
  const { error: bErr } = await supabase.storage.createBucket('covers', { public: true });
  if (bErr && !/already exists|Bucket already exists|already been created/i.test(String(bErr.message))) {
    console.warn('[storage] could not create covers bucket:', bErr.message);
  }
}

function deleteCoverObject(url) {
  if (!USE_SUPABASE || !url || !url.includes('/covers/')) return;
  const m = String(url).match(/\/covers\/(.+)$/);
  if (m) supabase.storage.from('covers').remove([decodeURIComponent(m[1])]).catch(() => {});
}

async function boot() {
  try {
    if (USE_SUPABASE) await initSupabase();
    else if (USE_PG) await initPG();
    else loadDB();
  } catch (e) {
    console.error('[db] failed to initialize datastore:', e.message);
    process.exit(1);
  }
  const storageLabel = USE_SUPABASE ? 'Supabase' : USE_PG ? 'PostgreSQL' : 'JSON file';
  server.listen(PORT, '0.0.0.0', () =>
    console.log(`SOLID INK NOVEL running on http://0.0.0.0:${PORT} (storage: ${storageLabel})`));
}

/* Graceful shutdown: flush pending writes before Railway kills the process */
['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, async () => {
  try { await persistChain; if (pgPool) await pgPool.end(); } catch (_) { /* ignore */ }
  process.exit(0);
}));

boot();
