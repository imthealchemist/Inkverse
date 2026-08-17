/* ================= SOLID INK NOVEL SPA ================= */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const timeAgo = iso => {
  if (!iso) return '';
  const d = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(d / 60000); if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
  const days = Math.floor(h / 24); if (days < 30) return days + 'd ago';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtNum = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n || 0);

const GENRE_ICON = { Romance: '💘', Mythical: '🐉', Fantasy: '🪄', Action: '⚡', Adventure: '🧭', Mystery: '🕵️', Thriller: '🗡️', 'Sci-Fi': '🚀', Comedy: '😄', Drama: '🎭', Horror: '👁️', Historical: '🏛️' };
const gIcon = g => GENRE_ICON[g] || '📚';

const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  browse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  library: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'
};
const vBadge = `<svg class="vbadge" viewBox="0 0 20 20" aria-label="Verified" title="Verified writer"><circle cx="10" cy="10" r="9" fill="#3b82f6"/><path d="M6 10.4l2.4 2.4L14 7.4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ---------------- api & state ---------------- */
const App = { token: localStorage.getItem('iv_token') || null, user: null, genres: [], pendingRoute: null, readerState: { novel: null } };

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (App.token) headers['Authorization'] = 'Bearer ' + App.token;
  const res = await fetch('/api' + path, { method: opts.method || 'GET', headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && App.token) { App.token = null; App.user = null; localStorage.removeItem('iv_token'); }
    const err = new Error(data.error || ('Request failed (' + res.status + ')'));
    err.status = res.status;
    throw err;
  }
  return data;
}
async function loadMeta() {
  try { App.genres = (await api('/genres')).genres; } catch (e) { /* non-fatal */ }
}
async function loadMe() {
  if (!App.token) return;
  try { const d = await api('/auth/me'); App.user = { ...d.user, followers: d.followers, following: d.following, verificationPending: d.verificationPending }; }
  catch (e) { App.token = null; App.user = null; localStorage.removeItem('iv_token'); }
}

/* ---------------- sanitize ---------------- */
function cleanHtml(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html || '');
  t.content.querySelectorAll('script,style,iframe,object,embed,link,meta,form').forEach(n => n.remove());
  t.content.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => {
      const n = a.name.toLowerCase();
      if (n.startsWith('on') || n === 'srcdoc' || ((n === 'href' || n === 'src') && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
    });
  });
  return t.innerHTML;
}

/* ---------------- chrome ---------------- */
function renderTabbar(active) {
  const tabs = [['home', 'Home', '#/home'], ['browse', 'Browse', '#/browse'], ['search', 'Search', '#/search'], ['library', 'Library', '#/library'], ['profile', 'You', '#/profile']];
  $('#tabbar').innerHTML = tabs.map(([k, label, href]) =>
    `<a class="tab ${active === k ? 'active' : ''}" href="${href}">${I[k]}<span>${label}</span></a>`).join('');
}
function openDrawer() {
  const u = App.user;
  const link = (icon, label, href) => `<a class="menu-item" href="${href}">${icon}<span>${label}</span></a>`;
  let items = link(I.home, 'Home', '#/home') + link(I.browse, 'Browse', '#/browse') + link(I.library, 'My Library', '#/library');
  let userBlock = `<div class="d-user"><div class="avatar s40" style="background:${u ? u.avatarColor : '#334155'}">${u ? esc(initials(u.name)) : '?'}</div>
    <div><div class="dn">${u ? esc(u.name) + (u.verified ? ' ' + vBadge : '') : 'Guest'}${u ? ` <span class="badge role">${u.role}</span>` : ''}</div>
    <div class="de">${u ? esc(u.email) : 'Sign in to unlock everything'}</div></div></div>`;
  if (!u) {
    items += link(I.pen, 'Sign in / Join', '#/auth');
    items += `<button class="menu-item accent" data-action="goto" data-href="#/auth">${I.pen}<span>Join as a Writer</span></button>`;
  } else {
    if (u.role === 'reader') items += `<button class="menu-item accent" data-action="join-writer">${I.pen}<span>Join as a Writer</span></button>`;
    else items += link(I.pen, 'Writer Dashboard', '#/writer');
    if (u.role === 'admin') items += link(I.shield, 'Admin Panel', '#/admin');
    items += `<button class="menu-item danger-l" data-action="logout">${I.logout}<span>Log out</span></button>`;
  }
  $('#drawer-root').innerHTML = `<div class="drawer-back"><div class="drawer">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="brand"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 5c2.5-1.6 5-1.6 8 0 3-1.6 5.5-1.6 8 0v13c-2.5-1.6-5-1.6-8 0-3-1.6-5.5-1.6-8 0z" fill="#8b5cf6"/></svg><span style="font-size:15px;letter-spacing:.02em">SOLID INK <b>NOVEL</b></span></span>
    <button class="icon-btn" data-action="drawer-close">${I.x}</button></div>${userBlock}${items}</div></div>`;
}
function closeDrawer() { $('#drawer-root').innerHTML = ''; }
const initials = name => String(name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('');

/* ---------------- toast & modal ---------------- */
let toastTimer;
function toast(msg, type) {
  $('#toast').innerHTML = `<div class="toast ${type || ''}">${esc(msg)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').innerHTML = '', 2800);
}
function openModal(title, bodyHtml) {
  $('#modal-root').innerHTML = `<div class="modal-back"><div class="modal">
    <div class="modal-h"><h3>${title}</h3><button class="icon-btn" data-action="modal-close">${I.x}</button></div>
    <div class="modal-b">${bodyHtml}</div></div></div>`;
}
function closeModal() { $('#modal-root').innerHTML = ''; }
function confirmModal(title, msg, label, onYes) {
  openModal(title, `<p>${msg}</p><div class="row"><button class="btn ghost" style="flex:1" data-action="modal-close">Cancel</button><button class="btn danger" style="flex:1" id="cf-yes">${esc(label)}</button></div>`);
  $('#cf-yes').onclick = () => { closeModal(); onYes(); };
}

/* ---------------- shared components ---------------- */
function coverImg(n, cls = 'cover') {
  return n.cover ? `<img class="${cls}" src="${esc(n.cover)}" alt="${esc(n.title)} cover" loading="lazy">` : `<div class="${cls} cover-ph">${esc((n.title || '?')[0])}</div>`;
}
function novelCard(n) {
  return `<a class="ncard" href="#/novel/${n.id}"><div class="cover-wrap">${coverImg(n)}${n.featured ? '<span class="flag">Featured</span>' : ''}</div>
    <div class="ncard-t">${esc(n.title)}</div><div class="ncard-s">${esc(n.authorName)} · ${n.chapterCount} ch</div></a>`;
}
function genreChips(genres) {
  return genres.map(g => `<a class="chip" href="#/browse?genre=${encodeURIComponent(g)}">${gIcon(g)} ${esc(g)}</a>`).join('');
}

/* ---------------- router ---------------- */
function parseHash() {
  const h = (location.hash || '#/home').replace(/^#/, '');
  const [pathPart, queryPart] = h.split('?');
  return { seg: pathPart.split('/').filter(Boolean), query: new URLSearchParams(queryPart || '') };
}
async function route() {
  document.body.classList.remove('reader-mode');
  closeDrawer(); closeModal();
  const { seg, query } = parseHash();
  const r = seg[0] || 'home';
  window.scrollTo(0, 0);
  try {
    if (r === 'home') return await vHome();
    if (r === 'browse') return await vBrowse(query);
    if (r === 'search') return await vSearch(query);
    if (r === 'library') return await guard(() => vLibrary());
    if (r === 'profile') return await guard(() => vProfile());
    if (r === 'auth') return vAuth();
    if (r === 'author' && seg[1]) return await vAuthor(seg[1]);
    if (r === 'novel' && seg[1]) return await vNovel(seg[1]);
    if (r === 'read' && seg[2]) return await vReader(seg[2]);
    if (r === 'writer') return await guard(() => vWriterHome(), ['writer', 'admin']);
    if (r === 'manage' && seg[1]) return await guard(() => vManage(seg[1]), ['writer', 'admin']);
    if (r === 'editor' && seg[1] === 'new' && seg[2]) return await guard(() => vEditorNew(seg[2]), ['writer', 'admin']);
    if (r === 'editor' && seg[1] === 'ch' && seg[2]) return await guard(() => vEditorChapter(seg[2]), ['writer', 'admin']);
    if (r === 'admin') return await guard(() => vAdmin(query), ['admin']);
    return await vHome();
  } catch (e) {
    $('#view').innerHTML = `<div class="page"><div class="center"><p>${esc(e.message)}</p><a class="btn ghost" href="#/home">Go home</a></div></div>`;
  }
}
function guard(fn, roles) {
  if (!App.user) { App.pendingRoute = location.hash; location.hash = '#/auth'; return; }
  if (roles && !roles.includes(App.user.role)) { toast('You do not have access to that area', 'error'); nav('#/home'); return; }
  return fn();
}
/* navigate without double-rendering when the hash is already current */
function nav(hash) { if (location.hash === hash) route(); else location.hash = hash; }

/* ================= VIEWS ================= */

/* ---------- auth ---------- */
let authMode = 'login';
async function vAuth() {
  if (App.user) { location.hash = '#/home'; return; }
  document.body.classList.add('no-tabbar');
  $('#tabbar').innerHTML = '';
  $('#view').innerHTML = `<div class="page"><div class="auth-wrap">
    <div class="auth-brand"><div class="big">SOLID INK <b>NOVEL</b></div><p>Read boldly. Write bravely.<br>Your next favorite story lives here.</p></div>
    <div class="auth-tabs">
      <button class="auth-tab ${authMode === 'login' ? 'active' : ''}" data-authmode="login">Log in</button>
      <button class="auth-tab ${authMode === 'signup' ? 'active' : ''}" data-authmode="signup">Create account</button>
    </div>
    <form data-form="auth" class="card">
      ${authMode === 'signup' ? `<div class="field"><label>Full name</label><input class="input" name="name" required minlength="2" placeholder="e.g. Ada Nwosu"></div>` : ''}
      <div class="field"><label>Email</label><input class="input" name="email" type="email" required placeholder="you@example.com" autocomplete="email"></div>
      <div class="field"><label>Password</label><input class="input" name="password" type="password" required minlength="6" placeholder="At least 6 characters" autocomplete="${authMode === 'login' ? 'current-password' : 'new-password'}"></div>
      <button class="btn full" type="submit">${authMode === 'login' ? 'Log in' : 'Create my account'}</button>
    </form>
  </div></div>`;
}

/* ---------- home ---------- */
async function vHome() {
  document.body.classList.remove('no-tabbar');
  renderTabbar('home');
  const d = await api('/novels/home');
  const u = App.user;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const writerCta = (u && u.role === 'reader') ? `
    <div class="banner" style="margin-top:26px"><div style="font-size:26px">✍️</div>
      <div class="bt spacer"><b>Have a story to tell?</b><br>Publish chapters, build readers, and get verified.</div>
      <button class="btn sm" data-action="join-writer">Join as a Writer</button></div>` : '';
  $('#view').innerHTML = `<div class="page">
    <div style="margin-bottom:14px"><div class="muted small">${u ? esc(greet) + ', ' + esc(u.name.split(' ')[0]) + ' 👋' : 'Welcome to SOLID INK NOVEL 👋'}</div>
    <h1 style="font-size:21px;font-weight:800;letter-spacing:-.02em">What will you read today?</h1></div>
    ${d.featured.length ? `<div class="section-h"><h2>Featured</h2></div>
    <div class="hscroll">${d.featured.map(n => `<a class="hero" href="#/novel/${n.id}">${coverImg(n).replace('class="cover"', 'class=""')}<div class="overlay"></div>
      <div class="hero-b"><div class="hero-g">${n.genres.slice(0, 3).map(g => `<span>${esc(g)}</span>`).join('')}</div>
      <h3>${esc(n.title)}</h3><p>${esc(n.authorName)} · ${n.chapterCount} chapters · ${fmtNum(n.views)} views</p>
      <span class="btn sm">Start reading</span></div></a>`).join('')}</div>` : ''}
    ${writerCta}
    <div class="section"><div class="section-h"><h2>Latest updates</h2><a href="#/browse?sort=updated">See all</a></div>
      <div class="hscroll">${d.latest.map(novelCard).join('')}</div></div>
    <div class="section"><div class="section-h"><h2>${u ? 'Recommended for you' : 'Popular now'}</h2><a href="#/browse">See all</a></div>
      <div class="novel-grid">${d.recommended.map(novelCard).join('')}</div></div>
    <div class="section"><div class="section-h"><h2>Browse by genre</h2><a href="#/browse">All genres</a></div>
      <div class="chips nowrap">${App.genres.map(g => `<a class="chip" href="#/browse?genre=${encodeURIComponent(g.name)}">${gIcon(g.name)} ${esc(g.name)}${d.genreCounts[g.name] ? ` <span class="faint">${d.genreCounts[g.name]}</span>` : ''}</a>`).join('')}</div></div>
  </div>`;
}

/* ---------- browse ---------- */
async function vBrowse(query) {
  document.body.classList.remove('no-tabbar');
  renderTabbar('browse');
  const genre = query.get('genre') || '';
  const sort = query.get('sort') || 'popular';
  const counts = genre ? null : (await api('/novels/home')).genreCounts;
  const d = await api('/novels?genre=' + encodeURIComponent(genre) + '&sort=' + encodeURIComponent(sort));
  $('#view').innerHTML = `<div class="page">
    <h1 style="font-size:21px;font-weight:800;letter-spacing:-.02em;margin-bottom:14px">${genre ? esc(genre) + ' ' + gIcon(genre) : 'Browse collections'}</h1>
    ${!genre ? `<div class="genre-grid" style="margin-bottom:22px">${App.genres.map(g => `
      <a class="genre-tile" href="#/browse?genre=${encodeURIComponent(g.name)}"><span class="gi">${gIcon(g.name)}</span>
      <span class="gn">${esc(g.name)}</span>${counts && counts[g.name] ? `<span class="gc">${counts[g.name]} stories</span>` : ''}</a>`).join('')}</div>` : ''}
    <div class="row" style="margin-bottom:14px">
      ${genre ? `<a class="chip" href="#/browse">${I.x.replace('width="24"', '')} Clear filter</a>` : ''}
      <span class="spacer"></span>
      <select class="input" style="width:auto;padding:8px 32px 8px 12px" data-browse-sort>
        <option value="popular" ${sort === 'popular' ? 'selected' : ''}>Most read</option>
        <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Newest</option>
        <option value="updated" ${sort === 'updated' ? 'selected' : ''}>Recently updated</option>
      </select>
    </div>
    ${d.novels.length ? `<div class="novel-grid">${d.novels.map(novelCard).join('')}</div>` : `<div class="empty">No novels here yet.<br><span class="small">Be the first — join as a writer!</span></div>`}
  </div>`;
}

/* ---------- search ---------- */
let searchTimer;
async function vSearch(query) {
  document.body.classList.remove('no-tabbar');
  renderTabbar('search');
  const q = query.get('q') || '';
  $('#view').innerHTML = `<div class="page">
    <h1 style="font-size:21px;font-weight:800;margin-bottom:14px">Search</h1>
    <div class="row" style="background:var(--surface);border:1.5px solid var(--line);border-radius:14px;padding:4px 6px 4px 14px">
      <span style="color:var(--faint);display:flex">${I.search}</span>
      <input id="search-input" class="input" style="border:none;background:transparent;padding:10px 8px" placeholder="Search by title, author or genre…" value="${esc(q)}">
      ${q ? `<button class="icon-btn" data-action="clear-search">${I.x}</button>` : ''}
    </div>
    <div id="search-results" style="margin-top:18px"><div class="loader"></div></div>
  </div>`;
  const input = $('#search-input');
  input.focus();
  const run = async () => {
    const val = input.value.trim();
    const box = $('#search-results');
    if (!box) return;
    if (!val) { box.innerHTML = `<div class="center">${I.book}<p>Search across titles, authors and genres.</p></div>`; return; }
    history.replaceState(null, '', '#/search?q=' + encodeURIComponent(val));
    try {
      const d = await api('/novels?q=' + encodeURIComponent(val));
      box.innerHTML = d.novels.length
        ? `<div class="muted small" style="margin-bottom:10px">${d.novels.length} result${d.novels.length > 1 ? 's' : ''} for “${esc(val)}”</div>
           ${d.novels.map(n => `<a class="lrow" href="#/novel/${n.id}" style="display:flex">${coverImg(n)}
             <div style="flex:1;min-width:0"><div class="lrow-t">${esc(n.title)}</div>
             <div class="lrow-s">${esc(n.authorName)}${n.authorVerified ? ' ' + vBadge : ''} · ${n.genres.map(esc).join(', ')}</div>
             <div class="lrow-s">${n.chapterCount} chapters · ${fmtNum(n.views)} views</div></div></a>`).join('')}`
        : `<div class="empty">Nothing found for “${esc(val)}”.</div>`;
    } catch (e) { box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  };
  input.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(run, 280); });
  await run();
}

/* ---------- novel detail ---------- */
async function vNovel(id) {
  document.body.classList.remove('no-tabbar');
  renderTabbar('');
  const d = await api('/novels/' + id);
  const n = d.novel;
  const a = d.author;
  const u = App.user;
  const isOwner = u && (u.id === n.authorId || u.role === 'admin');
  const hist = d.history;
  const readLabel = hist && hist.chapterId ? 'Continue reading' : 'Start reading';
  const firstCh = d.chapters.find(c => c.status === 'published');
  const readHref = hist && hist.chapterId ? `#/read/${n.id}/${hist.chapterId}` : firstCh ? `#/read/${n.id}/${firstCh.id}` : null;
  $('#view').innerHTML = `
  <div class="novel-head"><img class="bgimg" src="${esc(n.cover || '')}" alt="" onerror="this.style.display='none'"><div class="bgfade"></div>
    <div class="novel-head-in">${coverImg(n)}
      <div style="flex:1;min-width:0">
        <div class="chips" style="margin-bottom:8px">${n.genres.map(g => `<a class="chip" href="#/browse?genre=${encodeURIComponent(g)}">${esc(g)}</a>`).join('')}</div>
        <h1>${esc(n.title)}</h1>
        <div class="novel-meta"><span class="row" style="gap:5px">${I.eye} ${fmtNum(n.views)}</span><span>${n.chapterCount} chapters</span><span>${fmtNum(n.wordCount)} words</span></div>
        <a class="author-row" href="#/author/${a ? a.id : ''}">
          <span class="avatar s32" style="background:${a ? a.avatarColor : '#334155'}">${a ? esc(initials(a.name)) : '?'}</span>
          <span style="flex:1;min-width:0;text-align:left"><span style="font-weight:700;font-size:13.5px">${a ? esc(a.name) : 'Unknown'} ${a && a.verified ? vBadge : ''}</span><br>
          <span style="font-size:11.5px;opacity:.75">${a ? fmtNum(a.followers) + ' followers' : ''}</span></span>
          ${u && a && u.id !== a.id ? `<button class="btn xs ${d.isFollowingAuthor ? 'active-state' : 'outline'}" data-action="follow" data-user="${a.id}" data-following="${d.isFollowingAuthor}" onclick="event.preventDefault()">${d.isFollowingAuthor ? 'Following' : 'Follow'}</button>` : ''}
        </a>
      </div>
    </div>
  </div>
  <div class="page" style="max-width:760px">
    <div class="row" style="gap:9px;margin:16px 0">
      ${readHref ? `<a class="btn" style="flex:1.4" href="${readHref}">${readLabel}</a>` : `<button class="btn" style="flex:1.4" disabled>No chapters yet</button>`}
      ${u ? `<button class="btn ghost" style="flex:1" data-action="bookmark" data-novel="${n.id}" data-bm="${n.bookmarked}">${n.bookmarked ? '🔖 Bookmarked' : '🔖 Bookmark'}</button>` : `<a class="btn ghost" style="flex:1" href="#/auth">🔖 Bookmark</a>`}
      ${isOwner ? `<a class="btn ghost" href="#/manage/${n.id}">Manage</a>` : ''}
    </div>
    ${u && u.id !== n.authorId ? `<div class="small faint" style="margin-bottom:14px"><button class="pill-link" style="padding:0" data-action="report" data-type="novel" data-id="${n.id}">${I.flag.replace(/width="\d+" height="\d+"/, 'width="13" height="13"')} Report this novel</button></div>` : ''}
    <h2 style="font-size:15px;font-weight:800;margin-bottom:6px">Synopsis</h2>
    <p class="muted" style="font-size:14px;line-height:1.65">${esc(n.description || 'No description provided.')}</p>
    <div class="divider"></div>
    <div class="section-h"><h2>Chapters (${d.chapters.filter(c => c.status === 'published').length})</h2>${isOwner ? `<a href="#/manage/${n.id}">Manage</a>` : ''}</div>
    ${d.chapters.length ? d.chapters.map((c, i) => c.status === 'published'
      ? `<a class="chapter-item" href="#/read/${n.id}/${c.id}"><span class="num">${i + 1}</span>
         <span style="flex:1;min-width:0"><span class="ct">${esc(c.title)}</span><br><span class="cs">${fmtNum(c.wordCount)} words · ${timeAgo(c.updatedAt)}</span></span>
         ${hist && hist.chapterId === c.id ? '<span class="badge featured">Reading</span>' : ''}</a>`
      : (isOwner ? `<div class="chapter-item" style="opacity:.6"><span class="num">${i + 1}</span><span style="flex:1"><span class="ct">${esc(c.title)}</span><br><span class="cs">Draft · ${timeAgo(c.updatedAt)}</span></span><span class="badge draft">Draft</span></div>` : '')).join('')
    : `<div class="empty">No chapters published yet — check back soon.</div>`}
  </div>`;
}

/* ---------- reader ---------- */
async function vReader(chapterId) {
  document.body.classList.add('reader-mode');
  const d = await api('/chapters/' + chapterId);
  App.readerState.novel = d.novel.id;
  if (App.user) api('/me/history', { method: 'POST', body: { novelId: d.novel.id, chapterId: d.chapter.id } }).catch(() => {});
  const theme = localStorage.getItem('iv_rtheme') || 'paper';
  const fs = parseInt(localStorage.getItem('iv_rfs') || '18', 10);
  $('#view').innerHTML = `<div class="reader ${theme}" id="reader-root" style="--rfs:${fs}px">
    <div class="reader-top">
      <a class="icon-btn" href="#/novel/${d.novel.id}" aria-label="Back to novel">${I.back}</a>
      <div class="rt-title">${esc(d.novel.title)} · Ch. ${d.num}/${d.total}</div>
      <button class="icon-btn" data-action="reader-list" aria-label="Chapters">${I.list}</button>
      <button class="icon-btn" data-action="reader-settings" aria-label="Settings">${I.settings}</button>
    </div>
    <div class="reader-body">
      <h1>${esc(d.chapter.title)}</h1>
      <div class="rd-meta">Chapter ${d.num} of ${d.total} · ${fmtNum(d.chapter.wordCount)} words · updated ${timeAgo(d.chapter.updatedAt)}</div>
      <div class="reader-content">${cleanHtml(d.chapter.content)}</div>
      <div class="reader-foot">
        ${d.prev ? `<a class="btn ghost" href="#/read/${d.novel.id}/${d.prev.id}">← ${esc(d.prev.title.length > 16 ? d.prev.title.slice(0, 16) + '…' : d.prev.title)}</a>` : '<span style="flex:1"></span>'}
        ${d.next ? `<a class="btn" style="flex:1.2" href="#/read/${d.novel.id}/${d.next.id}">Next chapter →</a>` : `<a class="btn ghost" href="#/novel/${d.novel.id}">Back to novel</a>`}
      </div>
      <div style="text-align:center;margin-top:22px">
        <button class="pill-link" data-action="report" data-type="chapter" data-id="${d.chapter.id}">${I.flag.replace(/width="\d+" height="\d+"/, 'width="13" height="13"')} Report chapter</button>
      </div>
    </div>
  </div>`;
}
function readerSettingsModal() {
  const theme = localStorage.getItem('iv_rtheme') || 'paper';
  const fs = parseInt(localStorage.getItem('iv_rfs') || '18', 10);
  openModal('Reading settings', `
    <p style="margin-bottom:8px">Theme</p>
    <div class="row" style="margin-bottom:16px">
      ${[['paper', 'Paper', '#f7f2e7', '#2c2620'], ['sepia', 'Sepia', '#e9d8bd', '#43341f'], ['night', 'Night', '#0d0f16', '#cdd3e0']].map(([k, label, bg, fg]) =>
        `<button class="btn sm ${theme === k ? '' : 'ghost'}" style="flex:1;background:${theme === k ? '' : bg};color:${theme === k ? '' : fg};border:1px solid var(--line)" data-rtheme="${k}">${label}</button>`).join('')}
    </div>
    <p style="margin-bottom:8px">Font size <span class="muted" id="rfs-label">${fs}px</span></p>
    <div class="row">
      <button class="btn ghost sm" data-rfs="-1">A−</button>
      <button class="btn ghost sm" data-rfs="1">A+</button>
    </div>`);
}
function readerListModal() {
  const root = $('#reader-root'); if (!root) return;
  const novelId = App.readerState.novel;
  api('/novels/' + novelId).then(d => {
    openModal('Chapters', d.chapters.filter(c => c.status === 'published').map((c, i) =>
      `<a class="chapter-item" href="#/read/${novelId}/${c.id}"><span class="num">${i + 1}</span><span style="flex:1"><span class="ct">${esc(c.title)}</span><br><span class="cs">${fmtNum(c.wordCount)} words</span></span></a>`).join('') || '<div class="empty">No chapters.</div>');
  }).catch(e => toast(e.message, 'error'));
}

/* ---------- library ---------- */
async function vLibrary() {
  document.body.classList.remove('no-tabbar');
  renderTabbar('library');
  const d = await api('/me/library');
  $('#view').innerHTML = `<div class="page">
    <h1 style="font-size:21px;font-weight:800;margin-bottom:14px">My Library</h1>
    ${d.history.length ? `<div class="section-h"><h2>Continue reading</h2></div>` + d.history.slice(0, 5).map(h => `
      <div class="lrow">${coverImg(h.novel)}
        <div style="flex:1;min-width:0"><div class="lrow-t">${esc(h.novel.title)}</div>
        <div class="lrow-s">Ch. ${h.chapterNum || '?'} of ${h.totalChapters} — ${esc(h.chapterTitle)}</div>
        <div class="lrow-s faint">${timeAgo(h.at)}</div></div>
        <a class="btn sm" href="#/read/${h.novel.id}/${h.chapterId}">Resume</a></div>`).join('') : ''}
    <div class="section-h" style="margin-top:22px"><h2>Bookmarks (${d.bookmarks.length})</h2></div>
    ${d.bookmarks.length ? d.bookmarks.map(b => `
      <div class="lrow">${coverImg(b)}
        <div style="flex:1;min-width:0"><a href="#/novel/${b.id}" class="lrow-t" style="display:block">${esc(b.title)}</a>
        <div class="lrow-s">${esc(b.authorName)} · ${b.chapterCount} chapters</div></div>
        <button class="icon-btn" data-action="bookmark" data-novel="${b.id}" data-bm="true" data-reload="1" title="Remove bookmark">${I.x}</button></div>`).join('')
    : `<div class="empty">No bookmarks yet.<br><span class="small">Tap 🔖 on any novel to save it here.</span></div>`}
  </div>`;
}

/* ---------- profile (self) ---------- */
async function vProfile() {
  document.body.classList.remove('no-tabbar');
  renderTabbar('profile');
  await loadMe();
  const u = App.user;
  const following = (await api('/me/following')).following;
  $('#view').innerHTML = `<div class="page" style="max-width:640px">
    <div class="profile-head">
      <div class="avatar s72" style="background:${u.avatarColor}">${esc(initials(u.name))}</div>
      <h2>${esc(u.name)} ${u.verified ? vBadge : ''}</h2>
      <div class="row" style="justify-content:center"><span class="badge role">${u.role}</span>${u.banned ? '<span class="badge hidden">suspended</span>' : ''}</div>
      ${u.bio ? `<p class="bio">${esc(u.bio)}</p>` : ''}
      <div class="profile-stats">
        <div><b>${u.following}</b><span>Following</span></div>
        <div><b>${u.followers}</b><span>Followers</span></div>
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center">
        <button class="btn sm ghost" data-action="edit-profile">Edit profile</button>
        ${u.role === 'reader' ? `<button class="btn sm" data-action="join-writer">✍️ Join as a Writer</button>` : `<a class="btn sm" href="#/writer">Writer dashboard</a>`}
        ${u.role === 'admin' ? `<a class="btn sm ghost" href="#/admin">Admin panel</a>` : ''}
        <button class="btn sm ghost" data-action="logout">Log out</button>
      </div>
    </div>
    ${u.role === 'writer' && !u.verified ? `
      <div class="banner" style="margin-top:16px"><div style="font-size:24px">✅</div>
      <div class="bt spacer"><b>${u.verificationPending ? 'Verification pending review' : 'Get verified'}</b><br>
      ${u.verificationPending ? 'An admin will review your request shortly.' : 'Verified writers get a ✓ badge and reader trust.'}</div>
      ${u.verificationPending ? '' : `<button class="btn sm" data-action="request-verification">Request</button>`}</div>` : ''}
    <div class="section-h" style="margin-top:22px"><h2>Following (${following.length})</h2></div>
    ${following.length ? following.map(f => `
      <div class="lrow"><span class="avatar s40" style="background:${f.avatarColor}">${esc(initials(f.name))}</span>
        <div style="flex:1;min-width:0"><a href="#/author/${f.id}" class="lrow-t" style="display:block">${esc(f.name)} ${f.verified ? vBadge : ''}</a>
        <div class="lrow-s">${f.novelCount} novels · ${f.followers} followers</div></div>
        <button class="btn xs active-state" data-action="follow" data-user="${f.id}" data-following="true" data-reload="1">Following</button></div>`).join('')
    : `<div class="empty">You haven't followed any writers yet.</div>`}
  </div>`;
}

/* ---------- author (public) ---------- */
async function vAuthor(id) {
  document.body.classList.remove('no-tabbar');
  renderTabbar('');
  const d = await api('/users/' + id);
  const u = App.user;
  $('#view').innerHTML = `<div class="page" style="max-width:840px">
    <div class="profile-head">
      <div class="avatar s72" style="background:${d.user.avatarColor || '#334155'}">${esc(initials(d.user.name))}</div>
      <h2>${esc(d.user.name)} ${d.user.verified ? vBadge : ''}</h2>
      <span class="badge role">${d.user.role}</span>
      ${d.user.bio ? `<p class="bio">${esc(d.user.bio)}</p>` : ''}
      <div class="profile-stats">
        <div><b>${d.novels.length}</b><span>Novels</span></div>
        <div><b>${d.followers}</b><span>Followers</span></div>
        <div><b>${d.followingCount}</b><span>Following</span></div>
      </div>
      ${u && u.id !== d.user.id ? `<button class="btn ${d.isFollowing ? 'active-state' : ''}" data-action="follow" data-user="${d.user.id}" data-following="${d.isFollowing}" data-reload="1">${d.isFollowing ? 'Following ✓' : '+ Follow writer'}</button>` : ''}
    </div>
    <div class="section-h" style="margin-top:20px"><h2>Novels</h2></div>
    ${d.novels.length ? `<div class="novel-grid">${d.novels.map(novelCard).join('')}</div>` : `<div class="empty">No published novels yet.</div>`}
  </div>`;
}

/* ---------- writer dashboard ---------- */
async function vWriterHome() {
  document.body.classList.remove('no-tabbar');
  renderTabbar('');
  const u = App.user;
  const d = await api('/novels?author=' + u.id + '&sort=updated');
  const mine = d.novels;
  const totalViews = mine.reduce((s, n) => s + n.views, 0);
  const totalCh = mine.reduce((s, n) => s + n.chapterCount, 0);
  $('#view').innerHTML = `<div class="page wide">
    <div class="row" style="margin-bottom:16px"><div><h1 style="font-size:21px;font-weight:800">Writer Dashboard</h1>
      <div class="muted small">${esc(u.name)} ${u.verified ? vBadge + ' <span class="badge approved" style="margin-left:4px">verified</span>' : '<span class="badge role">unverified</span>'}</div></div>
      <span class="spacer"></span><button class="btn sm" data-action="new-novel">${I.plus} New novel</button></div>
    ${u.role === 'writer' && !u.verified ? `<div class="banner"><div style="font-size:24px">✅</div>
      <div class="bt spacer"><b>${u.verificationPending ? 'Verification pending' : 'Get your verified badge'}</b><br>
      ${u.verificationPending ? 'An admin is reviewing your request.' : 'Verification is granted by admins after review.'}</div>
      ${u.verificationPending ? '' : `<button class="btn sm" data-action="request-verification">Request verification</button>`}</div>` : ''}
    <div class="stat-grid">
      <div class="stat"><div class="sv">${mine.length}</div><div class="sl">Novels</div></div>
      <div class="stat"><div class="sv">${totalCh}</div><div class="sl">Published chapters</div></div>
      <div class="stat"><div class="sv">${fmtNum(totalViews)}</div><div class="sl">Total views</div></div>
      <div class="stat"><div class="sv">${u.followers ?? '—'}</div><div class="sl">Followers</div></div>
    </div>
    <div class="section-h" style="margin-top:24px"><h2>Your novels</h2></div>
    ${mine.length ? `<div class="novel-grid">${mine.map(n => `
      <a class="ncard" href="#/manage/${n.id}"><div class="cover-wrap">${coverImg(n)}</div>
      <div class="ncard-t">${esc(n.title)}</div>
      <div class="ncard-s">${n.chapterCount} published · ${fmtNum(n.views)} views</div></a>`).join('')}
      <button class="ncard" style="border:2px dashed var(--line);border-radius:var(--r);min-height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--muted)" data-action="new-novel">
        <span style="width:44px;height:44px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center">${I.plus}</span>
        <span style="font-weight:700;font-size:13.5px">Create a new novel</span></button></div>`
    : `<div class="empty">You haven't created any novels yet.<br><br><button class="btn" data-action="new-novel">${I.plus} Create your first novel</button></div>`}
  </div>`;
}

/* ---------- novel create/edit modal ---------- */
function novelFormModal(existing) {
  const n = existing || { title: '', description: '', genres: [], cover: '' };
  const gid = 'nf-' + Math.random().toString(36).slice(2, 7);
  openModal(existing ? 'Edit novel' : 'Create a new novel', `
    <form data-form="${existing ? 'edit-novel' : 'create-novel'}" data-novel="${existing ? existing.id : ''}">
      <div class="field"><label>Cover image</label>
        <div class="cover-upload">
          <div class="cu-prev" id="${gid}-prev">${n.cover ? `<img src="${esc(n.cover)}">` : 'No cover'}</div>
          <div style="flex:1"><input type="file" id="${gid}-file" accept="image/*" style="display:none">
          <button type="button" class="btn ghost sm" id="${gid}-btn">Upload cover</button>
          <div class="hint">JPG/PNG. It will be resized automatically.</div></div>
        </div></div>
      <div class="field"><label>Title</label><input class="input" name="title" required minlength="2" maxlength="120" value="${esc(n.title)}" placeholder="e.g. The Starless Road"></div>
      <div class="field"><label>Description</label><textarea class="input" name="description" rows="4" maxlength="2000" placeholder="A short synopsis readers see on your novel page…">${esc(n.description)}</textarea></div>
      <div class="field"><label>Genres (pick up to 5)</label>
        <div class="chips" id="${gid}-genres">${App.genres.map(g => `<button type="button" class="chip selectable ${n.genres.includes(g.name) ? 'active' : ''}" data-genre="${esc(g.name)}">${gIcon(g.name)} ${esc(g.name)}</button>`).join('')}</div>
      </div>
      <button class="btn full" type="submit">${existing ? 'Save changes' : 'Create novel'}</button>
    </form>`);
  let coverData = n.cover || '';
  $('#' + gid + '-btn').onclick = () => $('#' + gid + '-file').click();
  $('#' + gid + '-file').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      coverData = await fileToDataUrl(f, 640);
      $('#' + gid + '-prev').innerHTML = `<img src="${coverData}">`;
      window.__pendingCover = coverData;
    } catch (err) { toast('Could not read that image', 'error'); }
  };
  window.__pendingCover = coverData;
  window.__novelCoverGetter = () => window.__pendingCover;
}
function fileToDataUrl(file, max = 640) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => rej(new Error('bad image'));
    img.src = url;
  });
}

/* ---------- manage novel ---------- */
async function vManage(novelId) {
  document.body.classList.remove('no-tabbar');
  renderTabbar('');
  const d = await api('/novels/' + novelId);
  const n = d.novel;
  const u = App.user;
  if (!u || (u.id !== n.authorId && u.role !== 'admin')) { toast('Not your novel', 'error'); location.hash = '#/writer'; return; }
  $('#view').innerHTML = `<div class="page" style="max-width:840px">
    <a class="pill-link" href="#/writer">${I.back.replace(/width="\d+" height="\d+"/, 'width="14" height="14"')} Writer dashboard</a>
    <div class="card" style="margin-top:12px">
      <div class="row" style="gap:14px;align-items:flex-start">
        <div style="width:76px;flex:none">${coverImg(n)}</div>
        <div style="flex:1;min-width:0"><h1 style="font-size:19px;font-weight:800">${esc(n.title)}</h1>
          <div class="muted small" style="margin-top:4px">${n.genres.map(esc).join(' · ') || 'No genres'} · ${fmtNum(n.views)} views · ${n.chapterCount} published</div>
          <div class="row" style="margin-top:10px;flex-wrap:wrap">
            <button class="btn sm ghost" data-action="edit-novel" data-novel="${n.id}">Edit info</button>
            <a class="btn sm ghost" href="#/novel/${n.id}">View page</a>
            <button class="btn sm ghost" style="color:#f87171" data-action="delete-novel" data-novel="${n.id}">Delete</button>
          </div></div>
      </div>
    </div>
    <div class="section-h" style="margin-top:20px"><h2>Chapters (${d.chapters.length})</h2>
      <button class="btn sm" data-action="new-chapter" data-novel="${n.id}">${I.plus} New chapter</button></div>
    ${d.chapters.length ? d.chapters.map((c, i) => `
      <div class="lrow" style="padding:13px"><span class="avatar s32" style="background:var(--surface2);color:#a78bfa">${i + 1}</span>
        <div style="flex:1;min-width:0"><div class="lrow-t">${esc(c.title)} <span class="badge ${c.status}">${c.status}</span></div>
        <div class="lrow-s">${fmtNum(c.wordCount)} words · updated ${timeAgo(c.updatedAt)}</div></div>
        <a class="btn xs ghost" href="#/editor/ch/${c.id}">Edit</a>
        ${c.status === 'published' ? `<a class="btn xs outline" href="#/read/${n.id}/${c.id}">Read</a>` : ''}
        <button class="icon-btn" data-action="delete-chapter" data-chapter="${c.id}" title="Delete chapter">${I.x}</button></div>`).join('')
    : `<div class="empty">No chapters yet. Write your first one!</div>`}
  </div>`;
}

/* ---------- chapter editor ---------- */
const ED_CMDS = [
  ['bold', '<b>B</b>', 'Bold'], ['italic', '<i>I</i>', 'Italic'], ['underline', '<u>U</u>', 'Underline'], ['strikeThrough', '<s>S</s>', 'Strikethrough'],
  ['h3', 'H', 'Heading'], ['p', '¶', 'Paragraph'], ['quote', '❝', 'Quote'], ['ul', '•≡', 'Bullet list'], ['clear', '⌫', 'Clear formatting']
];
function editorShell(novel, chapter) {
  document.body.classList.add('no-tabbar');
  $('#tabbar').innerHTML = '';
  $('#view').innerHTML = `<div class="page"><div class="editor-wrap">
    <div class="row" style="margin-bottom:10px">
      <a class="icon-btn" href="#/manage/${novel.id}">${I.back}</a>
      <div style="flex:1;min-width:0"><div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(novel.title)}</div>
      <div style="font-size:12px;color:var(--faint)" id="ed-status">${chapter ? 'Editing · ' + chapter.status : 'New chapter'}</div></div>
      <span class="small muted" id="ed-wc">0 words</span>
    </div>
    <input class="editor-title" id="ed-title" placeholder="Chapter title…" maxlength="140" value="${chapter ? esc(chapter.title) : ''}">
    <div class="ed-toolbar">${ED_CMDS.map(([k, label, tip]) => `<button type="button" data-ed="${k}" title="${tip}">${label}</button>`).join('')}</div>
    <div class="chedit" id="chedit" contenteditable="true" data-placeholder="Start writing…">${chapter ? cleanHtml(chapter.content) : '<p></p>'}</div>
    <div class="editor-foot">
      <button class="btn ghost" data-action="save-draft">${chapter && chapter.status === 'published' ? 'Unpublish → Draft' : 'Save draft'}</button>
      <span class="spacer"></span>
      <button class="btn" data-action="publish-chapter">Publish</button>
    </div>
  </div></div>`;
  const ed = $('#chedit');
  const countWords = t => t.split(/\s+/).filter(Boolean).length;
  const wc = () => { $('#ed-wc').textContent = countWords(ed.innerText) + ' words'; };
  wc(); ed.addEventListener('input', wc);
}
async function vEditorNew(novelId) {
  const d = await api('/novels/' + novelId);
  editorShell(d.novel, null);
  window.__editorCtx = { novelId, chapterId: null };
}
async function vEditorChapter(chapterId) {
  const d = await api('/chapters/' + chapterId);
  editorShell({ id: d.novel.id, title: d.novel.title }, d.chapter);
  window.__editorCtx = { novelId: d.novel.id, chapterId };
}

/* ---------- admin ---------- */
async function vAdmin(query) {
  document.body.classList.remove('no-tabbar');
  renderTabbar('');
  const tab = query.get('tab') || 'overview';
  const tabs = [['overview', 'Overview'], ['users', 'Users'], ['verifications', 'Verification'], ['novels', 'Novels'], ['chapters', 'Chapters'], ['genres', 'Genres'], ['reports', 'Reports']];
  $('#view').innerHTML = `<div class="page wide">
    <h1 style="font-size:21px;font-weight:800;margin-bottom:12px">🛡️ Admin Panel</h1>
    <div class="admin-tabs">${tabs.map(([k, label]) => `<a class="admin-tab ${tab === k ? 'active' : ''}" href="#/admin?tab=${k}">${label}<span class="cnt" id="cnt-${k}">…</span></a>`).join('')}</div>
    <div id="admin-body"><div class="loader"></div></div>
  </div>`;
  try {
    const ov = await api('/admin/overview');
    $('#cnt-overview').textContent = '·'; $('#cnt-users').textContent = ov.users; $('#cnt-verifications').textContent = ov.pendingVerifications;
    $('#cnt-novels').textContent = ov.novels; $('#cnt-chapters').textContent = ov.chapters; $('#cnt-genres').textContent = App.genres.length; $('#cnt-reports').textContent = ov.openReports;
    const box = $('#admin-body'); if (!box) return;
    if (tab === 'overview') return adminOverview(box, ov);
    if (tab === 'users') return adminUsers(box);
    if (tab === 'verifications') return adminVerifications(box);
    if (tab === 'novels') return adminNovels(box);
    if (tab === 'chapters') return adminChapters(box);
    if (tab === 'genres') return adminGenres(box);
    if (tab === 'reports') return adminReports(box);
  } catch (e) { $('#admin-body').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
async function adminOverview(box, ov) {
  box.innerHTML = `<div class="stat-grid">
    ${[['Users', ov.users], ['Writers', ov.writers], ['Novels', ov.novels], ['Chapters', ov.chapters], ['Total views', fmtNum(ov.totalViews)], ['Open reports', ov.openReports], ['Pending verifications', ov.pendingVerifications]].map(([l, v]) =>
      `<div class="stat"><div class="sv">${v}</div><div class="sl">${l}</div></div>`).join('')}
  </div>
  <div class="card" style="margin-top:14px"><b>Quick links</b>
    <p class="muted small" style="margin-top:6px">Approve verification requests in the <a href="#/admin?tab=verifications" style="color:#a78bfa;font-weight:700">Verification</a> tab,
    and review reader reports under <a href="#/admin?tab=reports" style="color:#a78bfa;font-weight:700">Reports</a>.</p></div>`;
}
async function adminUsers(box) {
  const d = await api('/admin/users');
  box.innerHTML = `<div class="row" style="margin-bottom:12px">
    <input class="input" id="admin-user-q" placeholder="Search users by name or email…" style="flex:1"></div>` +
    d.users.map(u => `<div class="admin-card" data-ucard="${u.id}">
      <div class="ac-top"><span class="avatar s40" style="background:${u.avatarColor}">${esc(initials(u.name))}</span>
        <div style="flex:1;min-width:0"><b>${esc(u.name)}</b> ${u.verified ? vBadge : ''} ${u.banned ? '<span class="badge hidden">banned</span>' : ''}<br>
        <span class="small muted">${esc(u.email)} · joined ${timeAgo(u.joinedAt)} · ${u.novelCount} novels · ${u.followers} followers</span></div></div>
      <div class="ac-actions">
        <select class="input" data-action="admin-role" data-user="${u.id}">
          ${['reader', 'writer', 'admin'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
        <button class="toggle ${u.verified ? 'on' : ''}" data-action="admin-verify" data-user="${u.id}" data-on="${u.verified}">✓ Verified</button>
        <button class="toggle ${u.banned ? 'on' : ''}" data-action="admin-ban" data-user="${u.id}" data-on="${u.banned}">${u.banned ? 'Unban' : 'Ban'}</button>
      </div></div>`).join('');
  $('#admin-user-q').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    $$('[data-ucard]').forEach(c => { c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  });
}
async function adminVerifications(box) {
  const d = await api('/admin/verifications');
  box.innerHTML = d.requests.length ? d.requests.map(v => `<div class="admin-card">
    <div class="ac-top"><b>${esc(v.userName)}</b><span class="badge ${v.status}">${v.status}</span><span class="spacer"></span><span class="small faint">${timeAgo(v.at)}</span></div>
    <div class="ac-body">“${esc(v.message || 'No message')}”<br><span class="small faint">${v.novelCount} novels on SOLID INK NOVEL</span></div>
    ${v.status === 'pending' ? `<div class="ac-actions">
      <button class="btn sm" data-action="verif-approve" data-id="${v.id}">Approve ✓</button>
      <button class="btn sm ghost" data-action="verif-reject" data-id="${v.id}">Reject</button></div>` : ''}
  </div>`).join('') : '<div class="empty">No verification requests.</div>';
}
async function adminNovels(box) {
  const d = await api('/admin/novels');
  box.innerHTML = d.novels.map(n => `<div class="admin-card">
    <div class="ac-top"><div style="width:42px;flex:none">${coverImg(n)}</div>
      <div style="flex:1;min-width:0"><a href="#/novel/${n.id}" style="font-weight:700">${esc(n.title)}</a> ${n.status === 'hidden' ? '<span class="badge hidden">hidden</span>' : ''} ${n.featured ? '<span class="badge featured">featured</span>' : ''}<br>
      <span class="small muted">${esc(n.authorName)} · ${n.genres.map(esc).join(', ')} · ${fmtNum(n.views)} views · ${n.chapterCount} ch</span></div></div>
    <div class="ac-actions">
      <button class="toggle ${n.featured ? 'on' : ''}" data-action="admin-feature" data-novel="${n.id}" data-on="${n.featured}">★ Featured</button>
      <button class="toggle ${n.status === 'hidden' ? 'on' : ''}" data-action="admin-hide" data-novel="${n.id}" data-on="${n.status === 'hidden'}">${n.status === 'hidden' ? 'Unhide' : 'Hide'}</button>
      <button class="toggle" data-action="admin-delete-novel" data-novel="${n.id}" style="color:#f87171;border-color:#7f1d1d">Delete</button>
    </div></div>`).join('') || '<div class="empty">No novels.</div>';
}
async function adminChapters(box) {
  const d = await api('/admin/chapters');
  box.innerHTML = d.chapters.map(c => `<div class="admin-card"><div class="ac-top">
    <div style="flex:1;min-width:0"><b>${esc(c.title)}</b> <span class="badge ${c.status}">${c.status}</span><br>
    <span class="small muted">${esc(c.novelTitle)} · ${fmtNum(c.wordCount)} words · updated ${timeAgo(c.updatedAt)}</span></div>
    <a class="btn xs ghost" href="#/novel/${c.novelId}">Novel</a>
    <button class="toggle" data-action="admin-delete-chapter" data-chapter="${c.id}" style="color:#f87171;border-color:#7f1d1d">Delete</button>
  </div></div>`).join('') || '<div class="empty">No chapters.</div>';
}
async function adminGenres(box) {
  box.innerHTML = `<div class="card"><form data-form="add-genre" class="row" style="gap:8px">
      <input class="input" name="name" placeholder="New genre name (e.g. Poetry)" required minlength="2" style="flex:1">
      <button class="btn sm" type="submit">${I.plus} Add</button></form>
    <div class="chips" style="margin-top:14px" id="genre-chips">${App.genres.map(g => `<span class="chip">${gIcon(g.name)} ${esc(g.name)}
      <button data-action="genre-del" data-id="${g.id}" style="color:#f87171;display:inline-flex;margin-left:2px">${I.x.replace(/width="\d+" height="\d+"/, 'width="12" height="12"')}</button></span>`).join('')}</div></div>`;
}
async function adminReports(box) {
  const d = await api('/admin/reports');
  box.innerHTML = d.reports.length ? d.reports.map(r => `<div class="admin-card">
    <div class="ac-top"><span class="badge ${r.status}">${r.status}</span><b>${r.type === 'novel' ? '📕 Novel' : '📄 Chapter'}</b>
      ${r.targetLink ? `<a href="${r.targetLink}" style="font-weight:700">${esc(r.targetTitle)}</a>` : `<span>${esc(r.targetTitle)}</span>`}
      <span class="spacer"></span><span class="small faint">${timeAgo(r.at)}</span></div>
    <div class="ac-body">Reported by <b>${esc(r.reporterName)}</b>: “${esc(r.reason)}”</div>
    ${r.status === 'open' ? `<div class="ac-actions">
      <button class="btn sm ghost" data-action="report-dismiss" data-id="${r.id}">Dismiss</button>
      <button class="btn sm danger" data-action="report-remove" data-id="${r.id}">Remove content</button></div>` : ''}
  </div>`).join('') : '<div class="empty">No reports. The community is behaving 🎉</div>';
}

/* ================= ACTIONS ================= */
document.addEventListener('click', async e => {
  // Backdrop clicks: close only when the click lands on the backdrop itself,
  // never when it lands on modal/drawer content.
  const back = e.target.closest('.modal-back, .drawer-back');
  if (back && e.target === back) { closeModal(); closeDrawer(); return; }
  const el = e.target.closest('[data-action]');
  if (!el) {
    const am = e.target.closest('[data-authmode]');
    if (am) { authMode = am.dataset.authmode; vAuth(); return; }
    const rt = e.target.closest('[data-rtheme]');
    if (rt) { localStorage.setItem('iv_rtheme', rt.dataset.rtheme); const root = $('#reader-root'); if (root) root.className = 'reader ' + rt.dataset.rtheme; readerSettingsModal(); return; }
    const rf = e.target.closest('[data-rfs]');
    if (rf) {
      let fs = parseInt(localStorage.getItem('iv_rfs') || '18', 10) + parseInt(rf.dataset.rfs, 10);
      fs = Math.max(14, Math.min(26, fs));
      localStorage.setItem('iv_rfs', String(fs));
      const root = $('#reader-root'); if (root) root.style.setProperty('--rfs', fs + 'px');
      const lbl = $('#rfs-label'); if (lbl) lbl.textContent = fs + 'px';
      return;
    }
    const ed = e.target.closest('[data-ed]');
    if (ed) {
      e.preventDefault();
      $('#chedit').focus();
      const k = ed.dataset.ed;
      if (k === 'h3') document.execCommand('formatBlock', false, 'H3');
      else if (k === 'p') document.execCommand('formatBlock', false, 'P');
      else if (k === 'quote') document.execCommand('formatBlock', false, 'BLOCKQUOTE');
      else if (k === 'ul') document.execCommand('insertUnorderedList', false, null);
      else if (k === 'clear') { document.execCommand('removeFormat', false, null); document.execCommand('formatBlock', false, 'P'); }
      else document.execCommand(k, false, null);
      return;
    }
    const gsel = e.target.closest('[data-genre]');
    if (gsel) {
      if (gsel.classList.contains('active')) gsel.classList.remove('active');
      else if ($$('.modal [data-genre].active').length < 5) gsel.classList.add('active');
      else toast('Pick up to 5 genres', 'error');
      return;
    }
    return;
  }
  const a = el.dataset.action;
  try {
    if (a === 'drawer-close') closeDrawer();
    else if (a === 'goto') location.hash = el.dataset.href;
    else if (a === 'modal-close') closeModal();
    else if (a === 'clear-search') { location.hash = '#/search'; }
    else if (a === 'reader-settings') readerSettingsModal();
    else if (a === 'reader-list') readerListModal();
    else if (a === 'logout') {
      api('/auth/logout', { method: 'POST' }).catch(() => {});
      App.token = null; App.user = null; localStorage.removeItem('iv_token');
      toast('Logged out'); nav('#/home');
    }
    else if (a === 'join-writer') {
      if (!App.user) { App.pendingRoute = '#/writer'; location.hash = '#/auth'; return; }
      openModal('Join as a Writer', `<p>Unlock the writer dashboard: create novels, write chapters with the built-in editor, publish drafts, and grow your readership.</p>
        <div class="row"><button class="btn ghost" style="flex:1" data-action="modal-close">Not now</button>
        <button class="btn" style="flex:1" id="jw-yes">Become a writer</button></div>`);
      $('#jw-yes').onclick = async () => {
        const d = await api('/writer/join', { method: 'POST' });
        App.user = { ...App.user, ...d.user };
        closeModal(); toast('Welcome to the writer program! 🎉', 'ok');
        location.hash = '#/writer';
      };
    }
    else if (a === 'bookmark') {
      if (!App.user) { location.hash = '#/auth'; return; }
      const on = el.dataset.bm === 'true';
      const d = await api('/novels/' + el.dataset.novel + '/bookmark', { method: 'POST' });
      if (el.dataset.reload) { toast(d.bookmarked ? 'Bookmarked' : 'Removed from bookmarks', 'ok'); route(); return; }
      el.dataset.bm = String(d.bookmarked);
      el.innerHTML = d.bookmarked ? '🔖 Bookmarked' : '🔖 Bookmark';
      toast(d.bookmarked ? 'Added to your library 🔖' : 'Removed from bookmarks');
    }
    else if (a === 'follow') {
      if (!App.user) { location.hash = '#/auth'; return; }
      const d = await api('/users/' + el.dataset.user + '/follow', { method: 'POST' });
      if (el.dataset.reload) { toast(d.following ? 'Followed ✓' : 'Unfollowed'); route(); return; }
      el.dataset.following = String(d.following);
      el.textContent = d.following ? 'Following' : 'Follow';
      el.classList.toggle('active-state', d.following); el.classList.toggle('outline', !d.following);
      toast(d.following ? 'Following writer ✓' : 'Unfollowed');
    }
    else if (a === 'report') {
      if (!App.user) { App.pendingRoute = location.hash; location.hash = '#/auth'; return; }
      openModal('Report content', `<p>Tell us what's wrong with this ${el.dataset.type}. An admin will review it.</p>
        <form data-form="report" data-type="${el.dataset.type}" data-id="${el.dataset.id}">
        <div class="field"><label>Reason</label><select class="input" name="reason">
          <option>Spam or misleading</option><option>Inappropriate or offensive content</option><option>Copyright / plagiarism</option><option>Wrong genre or metadata</option><option>Other</option>
        </select></div>
        <button class="btn full" type="submit">Submit report</button></form>`);
    }
    else if (a === 'edit-profile') {
      const u = App.user;
      openModal('Edit profile', `<form data-form="edit-profile">
        <div class="field"><label>Name</label><input class="input" name="name" required minlength="2" value="${esc(u.name)}"></div>
        <div class="field"><label>Bio</label><textarea class="input" name="bio" rows="3" maxlength="500" placeholder="Tell readers about yourself…">${esc(u.bio)}</textarea></div>
        <button class="btn full" type="submit">Save</button></form>`);
    }
    else if (a === 'request-verification') {
      openModal('Request verification', `<p>Verification is reviewed by an admin. Briefly explain why your account should be verified — published works, audience size, external links, etc.</p>
        <form data-form="request-verification">
        <div class="field"><textarea class="input" name="message" rows="4" required minlength="20" maxlength="1000" placeholder="Why should SOLID INK NOVEL verify you?"></textarea></div>
        <button class="btn full" type="submit">Submit request</button></form>`);
    }
    /* writer */
    else if (a === 'new-novel') novelFormModal(null);
    else if (a === 'edit-novel') {
      const d = await api('/novels/' + el.dataset.novel);
      novelFormModal(d.novel);
    }
    else if (a === 'delete-novel') {
      confirmModal('Delete novel?', 'This permanently removes the novel and all of its chapters, bookmarks and reading history.', 'Delete forever', async () => {
        await api('/novels/' + el.dataset.novel, { method: 'DELETE' });
        toast('Novel deleted'); location.hash = '#/writer';
      });
    }
    else if (a === 'new-chapter') location.hash = '#/editor/new/' + el.dataset.novel;
    else if (a === 'delete-chapter') {
      confirmModal('Delete chapter?', 'Readers will lose access to this chapter permanently.', 'Delete chapter', async () => {
        await api('/chapters/' + el.dataset.chapter, { method: 'DELETE' });
        toast('Chapter deleted'); route();
      });
    }
    else if (a === 'save-draft' || a === 'publish-chapter') {
      const ctx = window.__editorCtx; if (!ctx) return;
      const title = $('#ed-title').value.trim();
      const content = $('#chedit').innerHTML;
      if (!title) { toast('Give the chapter a title first', 'error'); $('#ed-title').focus(); return; }
      const status = a === 'publish-chapter' ? 'published' : 'draft';
      let chapterId = ctx.chapterId;
      if (chapterId) await api('/chapters/' + chapterId, { method: 'PUT', body: { title, content, status } });
      else { const d = await api('/novels/' + ctx.novelId + '/chapters', { method: 'POST', body: { title, content, status } }); chapterId = d.chapter.id; window.__editorCtx.chapterId = chapterId; }
      $('#ed-status').textContent = 'Saved · ' + status;
      toast(status === 'published' ? 'Chapter published 🎉' : 'Saved as draft', 'ok');
      if (a === 'publish-chapter') location.hash = '#/manage/' + ctx.novelId;
    }
    /* admin */
    else if (a === 'admin-verify') { await api('/admin/users/' + el.dataset.user, { method: 'PUT', body: { verified: el.dataset.on !== 'true' } }); toast('Verification updated', 'ok'); route(); }
    else if (a === 'admin-ban') { await api('/admin/users/' + el.dataset.user, { method: 'PUT', body: { banned: el.dataset.on !== 'true' } }); toast('User updated', 'ok'); route(); }
    else if (a === 'verif-approve') { await api('/admin/verifications/' + el.dataset.id + '/approve', { method: 'POST' }); toast('Writer verified ✓', 'ok'); route(); }
    else if (a === 'verif-reject') { await api('/admin/verifications/' + el.dataset.id + '/reject', { method: 'POST' }); toast('Request rejected'); route(); }
    else if (a === 'admin-feature') { await api('/admin/novels/' + el.dataset.novel, { method: 'PUT', body: { featured: el.dataset.on !== 'true' } }); toast('Updated'); route(); }
    else if (a === 'admin-hide') { await api('/admin/novels/' + el.dataset.novel, { method: 'PUT', body: { status: el.dataset.on === 'true' ? 'published' : 'hidden' } }); toast('Updated'); route(); }
    else if (a === 'admin-delete-novel') {
      confirmModal('Delete novel?', 'This removes the novel and all its chapters for every user.', 'Delete', async () => {
        await api('/admin/novels/' + el.dataset.novel, { method: 'DELETE' }); toast('Novel deleted'); route();
      });
    }
    else if (a === 'admin-delete-chapter') {
      confirmModal('Delete chapter?', 'This removes the chapter for every reader.', 'Delete', async () => {
        await api('/admin/chapters/' + el.dataset.chapter, { method: 'DELETE' }); toast('Chapter deleted'); route();
      });
    }
    else if (a === 'genre-del') { await api('/admin/genres/' + el.dataset.id, { method: 'DELETE' }); await loadMeta(); toast('Genre removed'); route(); }
    else if (a === 'report-dismiss') { await api('/admin/reports/' + el.dataset.id + '/resolve', { method: 'POST', body: { action: 'dismiss' } }); toast('Report dismissed'); route(); }
    else if (a === 'report-remove') {
      confirmModal('Remove reported content?', 'The reported content will be deleted immediately.', 'Remove content', async () => {
        await api('/admin/reports/' + el.dataset.id + '/resolve', { method: 'POST', body: { action: 'remove' } }); toast('Content removed'); route();
      });
    }
  } catch (err) { toast(err.message, 'error'); }
});

document.addEventListener('change', async e => {
  const s = e.target.closest('[data-browse-sort]');
  if (s) {
    const { query } = parseHash();
    const genre = query.get('genre');
    location.hash = '#/browse?sort=' + s.value + (genre ? '&genre=' + encodeURIComponent(genre) : '');
    return;
  }
  const role = e.target.closest('[data-action="admin-role"]');
  if (role) {
    try { await api('/admin/users/' + role.dataset.user, { method: 'PUT', body: { role: role.value } }); toast('Role updated to ' + role.value, 'ok'); }
    catch (err) { toast(err.message, 'error'); }
  }
});

document.addEventListener('submit', async e => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  const fd = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  try {
    if (kind === 'auth') {
      const body = { email: fd.get('email'), password: fd.get('password') };
      if (authMode === 'signup') body.name = fd.get('name');
      const d = await api('/auth/' + authMode, { method: 'POST', body });
      App.token = d.token; localStorage.setItem('iv_token', d.token);
      await loadMe();
      toast(authMode === 'login' ? 'Welcome back! 👋' : 'Account created — welcome! 🎉', 'ok');
      const dest = App.pendingRoute && App.pendingRoute !== '#/auth' ? App.pendingRoute : '#/home';
      App.pendingRoute = null;
      nav(dest);
    }
    else if (kind === 'report') {
      await api('/reports', { method: 'POST', body: { type: form.dataset.type, targetId: form.dataset.id, reason: fd.get('reason') } });
      closeModal(); toast('Report submitted — thank you', 'ok');
    }
    else if (kind === 'edit-profile') {
      const d = await api('/me', { method: 'PUT', body: { name: fd.get('name'), bio: fd.get('bio') } });
      App.user = { ...App.user, ...d.user };
      closeModal(); toast('Profile saved', 'ok'); route();
    }
    else if (kind === 'request-verification') {
      await api('/writer/verification', { method: 'POST', body: { message: fd.get('message') } });
      closeModal(); toast('Verification request submitted', 'ok');
      await loadMe(); route();
    }
    else if (kind === 'create-novel' || kind === 'edit-novel') {
      const genres = $$('.modal [data-genre].active').map(b => b.dataset.genre);
      const body = { title: fd.get('title'), description: fd.get('description'), genres, cover: window.__novelCoverGetter ? window.__novelCoverGetter() : '' };
      if (!genres.length) { toast('Pick at least one genre', 'error'); if (btn) btn.disabled = false; return; }
      let id = form.dataset.novel;
      if (kind === 'create-novel') { const d = await api('/novels', { method: 'POST', body }); id = d.novel.id; }
      else await api('/novels/' + id, { method: 'PUT', body });
      closeModal(); toast(kind === 'create-novel' ? 'Novel created 🎉' : 'Novel updated', 'ok');
      location.hash = '#/manage/' + id;
    }
    else if (kind === 'add-genre') {
      await api('/admin/genres', { method: 'POST', body: { name: fd.get('name') } });
      await loadMeta(); toast('Genre added', 'ok'); route();
    }
  } catch (err) { toast(err.message, 'error'); if (btn) btn.disabled = false; }
});

/* ---------------- boot ---------------- */
$('#menu-btn').addEventListener('click', openDrawer);
window.addEventListener('hashchange', route);
(async function boot() {
  await Promise.all([loadMeta(), loadMe()]);
  route();
})();
