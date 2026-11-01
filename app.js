/* Moodread: one script for the whole site.
   1) theme (runs immediately so the page never flashes the wrong colours)
   2) one function per page, started by <body data-page="..."> */

/* Moodread site-wide theme: load this in <head> on every page. */
(function () {
  var KEY = 'mr:theme';
  var THEMES = [['light', '#FAF3EA', 'Light'], ['sepia', '#F4ECD8', 'Sepia'], ['forest', '#E8EFE6', 'Forest'], ['dark', '#1C181B', 'Dark']];

  function get() {
    try {
      var t = localStorage.getItem(KEY);
      if (t && THEMES.some(function (x) { return x[0] === t; })) return t;
    } catch (e) {}
    return 'light';
  }
  function apply(t) {
    document.documentElement.dataset.theme = t;
    document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }
  function set(t) {
    try { localStorage.setItem(KEY, t); } catch (e) {}
    apply(t);
  }

  document.documentElement.dataset.theme = get();     // runs before the page paints, so no flash
  window.MRTheme = { get: get, set: set, list: THEMES };

  // keep other open tabs in sync
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(get()); });

  document.addEventListener('DOMContentLoaded', function () {
    var slot = document.getElementById('theme-slot');
    if (!slot) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-btn';
    btn.setAttribute('aria-label', 'Change theme');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a10 10 0 110-20c5.5 0 10 3.6 10 8 0 3-2 4-4 4h-2a2 2 0 00-1 3.7c.6.6.6 1.5.2 2.1A2.5 2.5 0 0112 22z"/><path d="M7.5 11h.01M10.5 7h.01M15.5 7.5h.01"/></svg>';

    var pop = document.createElement('div');
    pop.className = 'theme-pop';
    pop.hidden = true;
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.v = t[0];
      b.title = t[2];
      b.setAttribute('aria-label', t[2] + ' theme');
      b.style.background = t[1];
      b.onclick = function () { set(t[0]); };
      pop.appendChild(b);
    });

    function mark() {
      pop.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === get()); });
    }
    btn.onclick = function (e) {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
      btn.setAttribute('aria-expanded', String(!pop.hidden));
    };
    document.addEventListener('click', function (e) {
      if (!pop.hidden && !slot.contains(e.target)) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('themechange', mark);
    mark();
    slot.appendChild(btn);
    slot.appendChild(pop);
  });
})();

const MR_PAGES = {};

/* ============ index page ============ */
MR_PAGES.index = function () {
const sb = supabase.createClient(
  'https://hyknwejzijdejxwugllg.supabase.co',
  'sb_publishable_AkUpwGSWQwMX3iV_qMrXfw_FlKNBbhN'
);

/* ================= Config ================= */
let IS_LOGGED_IN = false;       // set automatically from your Supabase session
const LOGIN_URL = 'log.html';     // point to your login page
const API = 'https://openlibrary.org';
const COVER = id => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
const $ = id => document.getElementById(id);

const subj = name => n => `${API}/subjects/${name}.json?limit=${n}`;
const SOURCES = {
  week:    { label: 'This week',  kind: 'trending', url: n => `${API}/trending/weekly.json?limit=${n}` },
  month:   { label: 'This month', kind: 'trending', url: n => `${API}/trending/monthly.json?limit=${n}` },
  romance: { label: 'Romance',    kind: 'subject',  url: subj('romance') },
  mystery: { label: 'Mystery',    kind: 'subject',  url: subj('mystery') },
  fantasy: { label: 'Fantasy',    kind: 'subject',  url: subj('fantasy') }
};

/* What each chip searches for */
const MOODS = {
  'Cozy': 'cozy mystery', 'Dark Academia': 'dark academia', 'Heartbreaking': 'heartbreaking',
  'Beach Read': 'beach read', 'Slow Burn': 'slow burn romance', 'Plot Twist': 'plot twist thriller'
};
const SUBJECTS = {
  'Fantasy':'fantasy','Sci-Fi':'science fiction','Mystery':'mystery','Thriller':'thriller','Horror':'horror',
  'Romance':'romance','Historical Fiction':'historical fiction','Literary Fiction':'literary fiction',
  'Young Adult':'young adult','Adventure':'adventure','Dystopian':'dystopia','Humor':'humor',
  'Classics':'classic literature','Graphic Novels':'graphic novels','Short Stories':'short stories',
  'Poetry':'poetry','Crime':'crime','Magical Realism':'magic realism',"Children's":"children's stories",
  'Biography & Memoir':'biography','Self-Help':'self-help','History':'history','Science':'science',
  'Business':'business','Psychology':'psychology','Philosophy':'philosophy','True Crime':'true crime',
  'Travel':'travel','Health & Wellness':'health','Spirituality':'spirituality','Cooking':'cooking',
  'Politics':'politics','Art & Design':'art','Technology':'technology','Personal Finance':'finance',
  'Essays':'essays','Nature':'nature'
};

/* ================= Helpers ================= */
function normalise(kind, w) {
  return kind === 'subject'
    ? { key: w.key, title: w.title, author: ((w.authors || [])[0] || {}).name, cover: w.cover_id, year: w.first_publish_year }
    : { key: w.key, title: w.title, author: (w.author_name || [])[0], cover: w.cover_i, year: w.first_publish_year };
}

function svgIcon(id) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'i');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', '#i-' + id);
  svg.appendChild(use);
  return svg;
}

function bookCard(b, i, showRank) {
  const card = document.createElement('div');
  card.className = 'book';

  const cover = document.createElement('div');
  cover.className = 'cover';
  if (showRank || b.free) {
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = b.free ? 'Free' : '#' + (i + 1);
    cover.appendChild(rank);
  }
  cover.appendChild(document.createTextNode(b.title));
  const coverSrc = b.coverUrl || (b.cover ? COVER(b.cover) : null);
  if (coverSrc) {
    const img = document.createElement('img');
    img.src = coverSrc;
    img.alt = 'Cover of ' + b.title;
    img.loading = 'lazy';
    img.onerror = () => img.remove();
    cover.appendChild(img);
  }

  const detail = 'book.html?key=' + encodeURIComponent(b.key) +
                 '&title=' + encodeURIComponent(b.title) +
                 '&author=' + encodeURIComponent(b.author || '') +
                 '&cover=' + encodeURIComponent(b.cover || '');
  const coverLink = document.createElement('a');
  coverLink.className = 'cover-link';
  coverLink.href = detail;
  coverLink.setAttribute('aria-label', 'About ' + b.title);
  coverLink.appendChild(cover);
  const h = document.createElement('h3');
  const hl = document.createElement('a');
  hl.href = detail;
  hl.textContent = b.title;
  h.appendChild(hl);
  const by = document.createElement('p');
  by.textContent = b.author || 'Unknown author';
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = b.free ? 'Free to read' : (b.year ? 'First published ' + b.year : '');

  const btn = document.createElement('a');
  btn.className = 'read-btn' + (IS_LOGGED_IN ? ' open' : '');
  if (IS_LOGGED_IN) {
    btn.href = 'read.html?title=' + encodeURIComponent(b.title) +
               '&author=' + encodeURIComponent(b.author || '') +
               '&ol=' + encodeURIComponent(b.key) +
               '&cover=' + encodeURIComponent(b.cover || '') +
               (b.gid ? '&gid=' + b.gid : '');
    btn.textContent = 'Read now';
  } else {
    btn.href = LOGIN_URL;
    btn.append(svgIcon('lock'), 'Log in to read');
  }

  const acts = document.createElement('div');
  acts.className = 'acts';
  acts.appendChild(btn);
  if (IS_LOGGED_IN) {
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'save-btn';
    save.dataset.key = b.key;
    save.setAttribute('aria-label', 'Save to shelf');
    save.appendChild(svgIcon('bookmark'));
    paintSave(save);
    save.onclick = e => { e.stopPropagation(); openShelfMenu(save, b); };
    acts.appendChild(save);
  }

  card.append(coverLink, h, by, meta, acts);
  return card;
}

function showSkeleton(target, n = 5) {
  target.replaceChildren(...Array.from({ length: n }, () => {
    const d = document.createElement('div'); d.className = 'sk'; return d;
  }));
}

function showMessage(target, text, retryFn) {
  const box = document.createElement('div');
  box.className = 'err';
  box.textContent = text;
  if (retryFn) {
    const retry = document.createElement('button');
    retry.className = 'btn btn-solid';
    retry.textContent = 'Try again';
    retry.onclick = retryFn;
    box.append(document.createElement('br'), retry);
  }
  target.replaceChildren(box);
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

/* ================= Trending tabs ================= */
const grid = $('trending-grid');
const cache = {};
let reqId = 0;
let currentTab = 'week';

async function loadBooks(name) {
  const my = ++reqId;
  showSkeleton(grid);
  try {
    if (!cache[name]) {
      const src = SOURCES[name];
      const data = await getJSON(src.url(20));
      cache[name] = (data.works || [])
        .map(w => normalise(src.kind, w))
        .filter(b => b.cover && b.title)
        .slice(0, 5);
    }
    if (my !== reqId) return;
    if (!cache[name].length) throw new Error('empty');
    grid.replaceChildren(...cache[name].map((b, i) => bookCard(b, i, true)));
  } catch (e) {
    if (my === reqId) showMessage(grid, "Couldn't load books right now.", () => loadBooks(name));
  }
}

$('tabs').addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  currentTab = tab.dataset.src;
  document.querySelectorAll('#tabs .tab').forEach(t => t.classList.toggle('on', t === tab));
  loadBooks(currentTab);
});

/* ================= Results section (search / genres / view all) ================= */
const R = { sec: $('results'), title: $('res-title'), sub: $('res-sub'), grid: $('results-grid'), more: $('res-more'), close: $('res-close') };
let resToken = 0;
let loadMore = null;

function openResults(title) {
  $('trending').hidden = true;      // results replace the trending section
  R.sec.hidden = false;
  R.title.textContent = title;
  R.sub.textContent = '';
  R.more.hidden = true;
  showSkeleton(R.grid, 10);
  R.sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Search: works for any text or a subject query, 20 books per page */
async function startSearch(q, label) {
  const my = ++resToken;
  openResults('Results for “' + label + '”');
  let page = 0, shown = 0;

  loadMore = async () => {
    R.more.disabled = true;
    try {
      const data = await getJSON(`${API}/search.json?q=${encodeURIComponent(q)}&limit=20&page=${page + 1}&fields=key,title,author_name,cover_i,first_publish_year`);
      if (my !== resToken) return;
      const books = (data.docs || []).filter(d => d.title).map(d => normalise('trending', d));
      if (page === 0) {
        if (!books.length) { showMessage(R.grid, 'No books found. Try different words.'); R.sub.textContent = ''; return; }
        R.grid.replaceChildren();
      }
      page++;
      R.grid.append(...books.map((b, i) => bookCard(b, shown + i, false)));
      shown += books.length;
      const total = data.numFound || shown;
      R.sub.textContent = `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} books`;
      R.more.textContent = 'Load more books';
      R.more.hidden = !books.length || page * 20 >= total;
    } catch (e) {
      if (my !== resToken) return;
      if (page === 0) showMessage(R.grid, "Couldn't load books right now.", () => startSearch(q, label));
      else { R.more.textContent = 'Try again'; R.more.hidden = false; }
    } finally {
      R.more.disabled = false;
    }
  };
  loadMore();
}

/* View all trending: fetch up to 100 for the active tab, reveal 20 at a time */
async function startViewAll() {
  const my = ++resToken;
  const src = SOURCES[currentTab];
  openResults('All trending · ' + src.label);
  try {
    const data = await getJSON(src.url(100));
    if (my !== resToken) return;
    const books = (data.works || []).map(w => normalise(src.kind, w)).filter(b => b.title);
    if (!books.length) throw new Error('empty');
    let shown = 0;
    R.grid.replaceChildren();
    loadMore = () => {
      const next = books.slice(shown, shown + 20);
      R.grid.append(...next.map((b, i) => bookCard(b, shown + i, true)));
      shown += next.length;
      R.sub.textContent = `Showing ${shown} of ${books.length} books`;
      R.more.hidden = shown >= books.length;
    };
    loadMore();
  } catch (e) {
    if (my === resToken) showMessage(R.grid, "Couldn't load books right now.", startViewAll);
  }
}

/* ================= Wire everything up ================= */
$('search-form').addEventListener('submit', e => {
  e.preventDefault();
  const q = $('q').value.trim();
  if (!q) { $('q').focus(); return; }
  startSearch(q, q);
});

$('view-all').addEventListener('click', startViewAll);
R.more.addEventListener('click', () => loadMore && loadMore());
R.close.addEventListener('click', () => {
  resToken++;
  R.sec.hidden = true;
  $('trending').hidden = false;     // bring trending back
  $('trending').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* Mood chips (hero) and genre chips (Browse by genre) */
document.querySelectorAll('.chip').forEach(c => { c.tabIndex = 0; c.setAttribute('role', 'button'); });
function chipSearch(chip) {
  const label = chip.textContent.trim();
  if (chip.closest('.genres')) {
    const subject = SUBJECTS[label] || label.toLowerCase();
    $('q').value = label;
    startSearch(`subject:"${subject}"`, label);
  } else {
    const q = MOODS[label] || label;
    $('q').value = q;
    startSearch(q, label);
  }
}
document.addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) chipSearch(c); });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('chip')) chipSearch(e.target);
});

function updateNav(session) {
  const name = (session.user.user_metadata || {}).full_name || session.user.email;
  document.querySelectorAll('.actions, .m-actions').forEach(box => {
    box.replaceChildren();
    const who = document.createElement('span');
    who.className = 'who-name';
    who.textContent = name;
    who.style.cssText = 'font-size:13.5px;font-weight:500;color:var(--soft);align-self:center';
    const out = document.createElement('button');
    out.className = 'btn btn-out';
    out.textContent = 'Log out';
    out.onclick = async () => { await sb.auth.signOut(); location.reload(); };
    box.append(who, out);
  });
}

/* Hamburger menu */
const burger = $('burger'), mmenu = $('mobile-menu');
function setMenu(open) {
  burger.setAttribute('aria-expanded', open);
  mmenu.hidden = !open;
}
burger.addEventListener('click', () => setMenu(mmenu.hidden));
mmenu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
window.addEventListener('resize', () => { if (window.innerWidth > 700) setMenu(false); });

function applyMember(session) {
  $('cta-guest').hidden = true;
  $('cta-member').hidden = false;
  const full = (session.user.user_metadata || {}).full_name || '';
  const first = full.split(' ')[0] || (session.user.email || '').split('@')[0];
  $('m-title').textContent = 'Welcome back, ' + first;
  document.querySelectorAll('.api-note').forEach(n => { n.textContent = 'Live data from Open Library.'; });
  try {
    const reading = [...SHELF.values()].filter(r => r.status === 'reading' && r.title)
      .sort((x, y) => new Date(y.updated_at) - new Date(x.updated_at))[0];
    const last = reading
      ? { title: reading.title, author: reading.author, ol: reading.ol_key, page: reading.page || 1, total: reading.total || '?' }
      : JSON.parse(localStorage.getItem('mr:last') || 'null');
    if (last && last.title) {
      $('m-sub').textContent = `You were reading “${last.title}”, page ${last.page} of ${last.total}.`;
      const c = $('m-continue');
      c.href = 'read.html?title=' + encodeURIComponent(last.title) +
               '&author=' + encodeURIComponent(last.author || '') +
               '&ol=' + encodeURIComponent(last.ol || '') +
               (String(last.ol || '').startsWith('pg:') ? '&gid=' + last.ol.slice(3) : '');
      c.hidden = false;
    }
  } catch (e) {}
}
$('m-find').addEventListener('click', e => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => $('q').focus(), 450);
});

/* ================= My Shelf (Supabase) ================= */
const SHELF = new Map();          // ol_key -> row
let CURRENT_USER = null;
const STATUS_LABEL = { want: 'Want to read', reading: 'Reading', finished: 'Finished' };

async function loadShelf() {
  const { data, error } = await sb.from('shelf').select('ol_key,title,author,status,page,total,updated_at');
  if (error) { console.error('Could not load shelf:', error); return; }
  data.forEach(r => SHELF.set(r.ol_key, r));
}

function paintSave(btn) {
  const r = SHELF.get(btn.dataset.key);
  btn.classList.toggle('on', !!r);
  btn.title = r ? STATUS_LABEL[r.status] : 'Save to shelf';
}
function refreshSaveButtons(key) {
  document.querySelectorAll('.save-btn').forEach(b => { if (b.dataset.key === key) paintSave(b); });
}

let toastT;
function toast(text) {
  let t = $('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

async function setShelfStatus(b, status) {
  if (!status) {
    const { error } = await sb.from('shelf').delete().eq('ol_key', b.key);
    if (error) { console.error(error); return toast("Couldn't update your shelf"); }
    SHELF.delete(b.key);
    toast('Removed from your shelf');
  } else {
    const row = {
      user_id: CURRENT_USER.id, ol_key: b.key, title: b.title, author: b.author || null,
      cover_id: b.cover || null, status, updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('shelf').upsert(row, { onConflict: 'user_id,ol_key' });
    if (error) { console.error(error); return toast("Couldn't save. Try again."); }
    SHELF.set(b.key, Object.assign({}, SHELF.get(b.key) || {}, row));
    toast('Saved to ' + STATUS_LABEL[status]);
  }
  refreshSaveButtons(b.key);
}

let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
function openShelfMenu(anchor, b) {
  closeMenu();
  const cur = (SHELF.get(b.key) || {}).status;
  const m = document.createElement('div');
  m.className = 'shelf-menu';
  Object.keys(STATUS_LABEL).forEach(k => {
    const it = document.createElement('button');
    it.type = 'button';
    it.textContent = STATUS_LABEL[k];
    if (cur === k) it.classList.add('on');
    it.onclick = () => { closeMenu(); setShelfStatus(b, k); };
    m.appendChild(it);
  });
  if (cur) {
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'rm';
    rm.textContent = 'Remove from shelf';
    rm.onclick = () => { closeMenu(); setShelfStatus(b, null); };
    m.appendChild(rm);
  }
  document.body.appendChild(m);
  menuEl = m;
  const r = anchor.getBoundingClientRect();
  const w = m.offsetWidth, h = m.offsetHeight;
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - 6 - h);
  m.style.top = top + 'px';
  m.style.left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)) + 'px';
}
document.addEventListener('click', e => { if (menuEl && !menuEl.contains(e.target) && !e.target.closest('.save-btn')) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
window.addEventListener('scroll', closeMenu, true);

/* ================= Free-to-read classics (Project Gutenberg) =================
   A fixed list, so it shows instantly. Each entry: [Gutenberg id, title, author] */
const CLASSICS = [
  [1342, 'Pride and Prejudice', 'Jane Austen'],
  [84, 'Frankenstein', 'Mary Shelley'],
  [11, "Alice's Adventures in Wonderland", 'Lewis Carroll'],
  [345, 'Dracula', 'Bram Stoker'],
  [1661, 'The Adventures of Sherlock Holmes', 'Arthur Conan Doyle'],
  [2701, 'Moby Dick', 'Herman Melville'],
  [1260, 'Jane Eyre', 'Charlotte Brontë'],
  [64317, 'The Great Gatsby', 'F. Scott Fitzgerald'],
  [174, 'The Picture of Dorian Gray', 'Oscar Wilde'],
  [120, 'Treasure Island', 'Robert Louis Stevenson'],
  [768, 'Wuthering Heights', 'Emily Brontë'],
  [43, 'Dr Jekyll and Mr Hyde', 'Robert Louis Stevenson'],
  [514, 'Little Women', 'Louisa May Alcott'],
  [2554, 'Crime and Punishment', 'Fyodor Dostoevsky'],
  [98, 'A Tale of Two Cities', 'Charles Dickens'],
  [35, 'The Time Machine', 'H. G. Wells']
];
function loadClassics() {
  $('classics-grid').replaceChildren(...CLASSICS.map(([id, title, author]) => bookCard({
    key: 'pg:' + id, gid: id, free: true, cover: null, year: null, title, author,
    coverUrl: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`
  }, 0, false)));
}

async function initAuth() {
  let session = null;
  try {
    const { data, error } = await sb.auth.getSession();
    if (error) console.error('Supabase session error:', error);
    session = data && data.session;
  } catch (e) {
    console.error('Supabase failed to load:', e);
  }
  IS_LOGGED_IN = !!session;          // must be set BEFORE books render
  if (session) { CURRENT_USER = session.user; await loadShelf(); updateNav(session); applyMember(session); }
  loadBooks('week');                 // books always load, even if Supabase fails
  loadClassics();
  const qp = new URLSearchParams(location.search);       // links from the book page: ?subject=... or ?q=...
  if (qp.get('subject')) { $('q').value = qp.get('subject'); startSearch(`subject:"${qp.get('subject')}"`, qp.get('subject')); }
  else if (qp.get('q')) { $('q').value = qp.get('q'); startSearch(qp.get('q'), qp.get('q')); }
}
initAuth();
};

/* ============ log page ============ */
MR_PAGES.log = function () {
if (!window.supabase) alert('Supabase library did not load. Check your internet.');

const sb = supabase.createClient(
  'https://hyknwejzijdejxwugllg.supabase.co',
  'sb_publishable_AkUpwGSWQwMX3iV_qMrXfw_FlKNBbhN'
);

const $ = id => document.getElementById(id);
const HOME = new URL('index.html', location.href).href;

function say(id, text, ok) {
  const el = $(id);
  el.textContent = text;
  el.className = 'msg ' + (ok ? 'ok' : 'err');
}

// Already logged in? Skip the login page.
sb.auth.getSession().then(({ data }) => { if (data.session) location.href = HOME; });

// LOG IN
$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.submitter; btn.disabled = true;
  const { error } = await sb.auth.signInWithPassword({
    email: $('li-email').value.trim(),
    password: $('li-pass').value
  });
  btn.disabled = false;
  if (error) return say('login-msg', error.message, false);
  location.href = HOME;
});

// SIGN UP
$('signup-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.submitter; btn.disabled = true;
  const { data, error } = await sb.auth.signUp({
    email: $('su-email').value.trim(),
    password: $('su-pass').value,
    options: {
      data: { full_name: $('su-name').value.trim() },
      emailRedirectTo: HOME
    }
  });
  btn.disabled = false;
  if (error) return say('signup-msg', error.message, false);
  if (data.session) location.href = HOME;
  else say('signup-msg', 'Check your email to confirm your account.', true);
});
};

/* ============ read page ============ */
MR_PAGES.read = function () {
const SB_URL = 'https://hyknwejzijdejxwugllg.supabase.co';
const SB_KEY = 'sb_publishable_AkUpwGSWQwMX3iV_qMrXfw_FlKNBbhN';
const sb = supabase.createClient(SB_URL, SB_KEY);
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const wantTitle = params.get('title') || '';
const wantAuthor = params.get('author') || '';
const olKey = params.get('ol') || '';
const coverParam = Number(params.get('cover')) || null;
const gid = Number(params.get('gid')) || null;     // Project Gutenberg id (skips the title search)

let pages = [], cur = 0, bookId = null, wpp = 350, userId = null, syncT = null;

/* ---------- Reading preferences ---------- */
const DEFAULTS = { font: "'Lora',Georgia,serif", fs: 19, lh: 18, w: 680 };
let prefs = Object.assign({}, DEFAULTS);
try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem('mr:prefs') || '{}')); } catch (e) {}

function applyPrefs() {
  const root = document.documentElement.style;
  root.setProperty('--font', prefs.font);
  root.setProperty('--fs', prefs.fs + 'px');
  root.setProperty('--lh', prefs.lh / 10);
  root.setProperty('--w', prefs.w + 'px');
  $('fs').value = prefs.fs; $('fs-v').textContent = prefs.fs + 'px';
  $('lh').value = prefs.lh; $('lh-v').textContent = (prefs.lh / 10).toFixed(1);
  document.querySelectorAll('#themes button').forEach(b => b.classList.toggle('on', b.dataset.v === MRTheme.get()));
  document.querySelectorAll('#fonts button').forEach(b => b.classList.toggle('on', b.dataset.v === prefs.font));
  document.querySelectorAll('#widths button').forEach(b => b.classList.toggle('on', Number(b.dataset.v) === prefs.w));
  try { localStorage.setItem('mr:prefs', JSON.stringify(prefs)); } catch (e) {}
}
function setPref(k, v) { prefs[k] = v; applyPrefs(); }

$('themes').onclick = e => { const b = e.target.closest('button'); if (b) MRTheme.set(b.dataset.v); };
document.addEventListener('themechange', applyPrefs);
$('fonts').onclick = e => { const b = e.target.closest('button'); if (b) setPref('font', b.dataset.v); };
$('widths').onclick = e => { const b = e.target.closest('button'); if (b) setPref('w', Number(b.dataset.v)); };
$('fs').oninput = e => setPref('fs', Number(e.target.value));
$('lh').oninput = e => setPref('lh', Number(e.target.value));
$('aa').onclick = () => {
  const open = $('panel').hidden;
  $('panel').hidden = !open;
  $('aa').setAttribute('aria-expanded', open);
};
document.addEventListener('click', e => {
  if (!$('panel').hidden && !e.target.closest('#panel') && !e.target.closest('#aa')) {
    $('panel').hidden = true; $('aa').setAttribute('aria-expanded', false);
  }
});
applyPrefs();

/* ---------- States ---------- */
function showState(h, text, btnText, btnHref) {
  const box = $('state');
  box.hidden = false; $('page').hidden = true; $('nav').hidden = true;
  box.replaceChildren();
  const h2 = document.createElement('h2'); h2.textContent = h;
  const p = document.createElement('p'); p.textContent = text;
  box.append(h2, p);
  if (btnText) {
    const a = document.createElement('a');
    a.className = 'btn'; a.href = btnHref; a.textContent = btnText;
    if (btnHref.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
    box.appendChild(a);
  }
}

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/* 1. Find the book on Project Gutenberg (Gutendex API) */
async function findBook() {
  if (gid) return { id: gid, title: wantTitle, authors: [{ name: wantAuthor }] };
  const q = encodeURIComponent((wantTitle + ' ' + wantAuthor).trim());
  const res = await fetch(`https://gutendex.com/books/?search=${q}&languages=en`);
  if (!res.ok) throw new Error('search');
  const data = await res.json();
  const t = norm(wantTitle);
  return (data.results || []).find(b => {
    const bt = norm(b.title);
    return bt && t && (bt.includes(t) || t.includes(bt));
  });
}

/* 2. Download the text (our Supabase function first, free proxies as backup) */
async function fetchText(id, token) {
  try {
    const r = await fetch(`${SB_URL}/functions/v1/book-text?id=${id}`, {
      headers: { Authorization: 'Bearer ' + token, apikey: SB_KEY }
    });
    if (r.ok) { const t = await r.text(); if (t.length > 2000) return t; }
  } catch (e) {}
  const target = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
  const routes = [
    u => u,
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`
  ];
  for (const route of routes) {
    try {
      const r = await fetch(route(target));
      if (!r.ok) continue;
      const t = await r.text();
      if (t.length > 2000) return t;
    } catch (e) {}
  }
  throw new Error('text');
}

/* 3. Clean the text, spot chapter headings, cut into pages */
const HEAD = /^(chapter|book|part|volume|letter|act|scene|canto|stave)\s+[\dIVXLCivxlc]+\b/i;
function isHeading(t) {
  if (t.length > 70) return false;
  if (HEAD.test(t)) return true;
  return t.length >= 3 && /[A-Z]/.test(t) && !/[a-z]/.test(t);
}

function toPages(raw) {
  let t = raw.replace(/\r/g, '');
  const s = t.search(/\*\*\* ?START OF[^\n]*\n/);
  if (s > -1) t = t.slice(t.indexOf('\n', s) + 1);
  const e = t.search(/\*\*\* ?END OF/);
  if (e > -1) t = t.slice(0, e);
  const paras = t.trim().split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);

  const out = []; let page = [], size = 0, prevHead = false, words = 0;
  for (const p of paras) {
    const h = isHeading(p);
    words += p.split(' ').length;
    if (h && size > 800) { out.push(page); page = []; size = 0; }   // chapters start on a fresh page
    page.push({ t: p, h, drop: prevHead && !h });
    size += p.length; prevHead = h;
    if (size > 2200) {
      let carry = null;
      if (page[page.length - 1].h) carry = page.pop();             // never end a page on a heading
      out.push(page);
      page = carry ? [carry] : []; size = carry ? carry.t.length : 0;
    }
  }
  if (page.length) out.push(page);
  wpp = Math.max(150, Math.round(words / Math.max(out.length, 1)));
  return out;
}

/* Keep the user's shelf in step with their reading (works across devices) */
function syncShelf() {
  if (!olKey || !userId || !pages.length) return;
  clearTimeout(syncT);
  syncT = setTimeout(async () => {
    const row = {
      user_id: userId, ol_key: olKey, title: wantTitle, author: wantAuthor || null,
      status: cur === pages.length - 1 ? 'finished' : 'reading',
      page: cur + 1, total: pages.length, updated_at: new Date().toISOString()
    };
    if (coverParam) row.cover_id = coverParam;
    const { error } = await sb.from('shelf').upsert(row, { onConflict: 'user_id,ol_key' });
    if (error) console.error('Shelf sync failed:', error);
  }, 900);
}

/* 4. Show a page */
function timeLeft() {
  const pagesLeft = pages.length - cur - 1;
  if (pagesLeft <= 0) return 'The end';
  const mins = Math.max(1, Math.round(pagesLeft * wpp / 230));
  return mins >= 60 ? `~${Math.floor(mins / 60)}h ${mins % 60}m left` : `~${mins} min left`;
}

function render(dir) {
  const box = $('page');
  box.replaceChildren(...pages[cur].map(it => {
    const el = document.createElement(it.h ? 'h2' : 'p');
    el.textContent = it.t;
    if (it.h) el.className = 'chap'; else if (it.drop) el.className = 'drop';
    return el;
  }));
  box.classList.remove('a-next', 'a-prev');
  if (dir) { void box.offsetWidth; box.classList.add(dir > 0 ? 'a-next' : 'a-prev'); }
  $('count').textContent = `Page ${cur + 1} of ${pages.length} · ${timeLeft()}`;
  $('bar').style.width = ((cur + 1) / pages.length * 100) + '%';
  $('prev').disabled = cur === 0;
  $('next').disabled = cur === pages.length - 1;
  try { localStorage.setItem('mr:pos:' + bookId, cur); } catch (e) {}
  syncShelf();
  try { localStorage.setItem('mr:last', JSON.stringify({ title: wantTitle, author: wantAuthor, ol: olKey, page: cur + 1, total: pages.length })); } catch (e) {}
  window.scrollTo({ top: 0 });
}
function go(n) { if (n >= 0 && n < pages.length) { const d = n > cur ? 1 : -1; cur = n; render(d); } }

$('prev').onclick = () => go(cur - 1);
$('next').onclick = () => go(cur + 1);
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') go(cur + 1);
  if (e.key === 'ArrowLeft') go(cur - 1);
});
let tx = null;
document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
document.addEventListener('touchend', e => {
  if (tx === null || !pages.length) return;
  const dx = e.changedTouches[0].clientX - tx; tx = null;
  if (dx < -60) go(cur + 1);
  if (dx > 60) go(cur - 1);
}, { passive: true });

(async () => {
  const { data } = await sb.auth.getSession();
  if (!data.session) { location.href = 'log.html'; return; }
  userId = data.session.user.id;

  if (!wantTitle) return showState('No book chosen', 'Go back and pick a book to read.', 'Back to books', 'index.html');
  $('title').textContent = wantTitle;
  $('author').textContent = wantAuthor;
  document.title = wantTitle + ' – Moodread';

  let step = 'search';
  const olLink = olKey && !olKey.startsWith('pg:') ? 'https://openlibrary.org' + olKey : 'index.html';
  try {
    const book = await findBook();
    if (!book) {
      return showState('Not free to read here', 'This book is still under copyright, so we can only read public-domain books on Moodread for now.', 'Preview on Open Library', olLink);
    }
    bookId = book.id;
    $('title').textContent = book.title;
    $('author').textContent = ((book.authors || [])[0] || {}).name || wantAuthor;

    step = 'text';
    const text = await fetchText(book.id, data.session.access_token);
    pages = toPages(text);
    if (!pages.length) throw new Error('empty');
    let start = Number(localStorage.getItem('mr:pos:' + bookId)) || 0;
    if (olKey) {
      try {
        const { data: row } = await sb.from('shelf').select('page,status').eq('ol_key', olKey).maybeSingle();
        if (row && row.page) start = row.status === 'finished' ? 0 : row.page - 1;
      } catch (e) {}
    }
    cur = Math.max(0, Math.min(start, pages.length - 1));
    $('state').hidden = true; $('page').hidden = false; $('nav').hidden = false;
    render(0);
  } catch (e) {
    showState("Couldn't load this book",
      step === 'search' ? "We couldn't reach the book catalogue (Gutendex). Please try again in a moment."
                        : "We found the book but couldn't download its text. Please try again in a moment.",
      'Try again', location.href);
  }
})();
};

/* ============ shelf page ============ */
MR_PAGES.shelf = function () {
const sb = supabase.createClient(
  'https://hyknwejzijdejxwugllg.supabase.co',
  'sb_publishable_AkUpwGSWQwMX3iV_qMrXfw_FlKNBbhN'
);
const $ = id => document.getElementById(id);
const COVER = id => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
const LABEL = { want: 'Want to read', reading: 'Reading', finished: 'Finished' };
const EMPTY = {
  reading:  ['Nothing in progress', 'Open any book and it shows up here with your progress.'],
  want:     ['Your wishlist is empty', 'Tap the bookmark on any book to save it for later.'],
  finished: ['No finished books yet', 'Books you reach the last page of land here.']
};
let rows = [], tab = 'reading';

function card(r) {
  const el = document.createElement('div');
  el.className = 'book';

  const cover = document.createElement('div');
  cover.className = 'cover';
  cover.appendChild(document.createTextNode(r.title));
  const pg = (r.ol_key || '').startsWith('pg:') ? r.ol_key.slice(3) : null;
  const coverSrc = pg ? `https://www.gutenberg.org/cache/epub/${pg}/pg${pg}.cover.medium.jpg` : (r.cover_id ? COVER(r.cover_id) : null);
  if (coverSrc) {
    const img = document.createElement('img');
    img.src = coverSrc;
    img.alt = 'Cover of ' + r.title;
    img.loading = 'lazy';
    img.onerror = () => img.remove();
    cover.appendChild(img);
  }

  const detail = 'book.html?key=' + encodeURIComponent(r.ol_key) + '&title=' + encodeURIComponent(r.title) +
                 '&author=' + encodeURIComponent(r.author || '') + '&cover=' + encodeURIComponent(r.cover_id || '');
  const coverLink = document.createElement('a');
  coverLink.className = 'cover-link'; coverLink.href = detail; coverLink.appendChild(cover);
  const h = document.createElement('h3');
  const hl = document.createElement('a'); hl.href = detail; hl.textContent = r.title; h.appendChild(hl);
  const by = document.createElement('p'); by.textContent = r.author || 'Unknown author';
  el.append(coverLink, h, by);

  if (r.status === 'reading' && r.total) {
    const pct = Math.round((r.page || 1) / r.total * 100);
    const bar = document.createElement('div'); bar.className = 'prog';
    const fill = document.createElement('i'); fill.style.width = pct + '%';
    bar.appendChild(fill);
    const meta = document.createElement('div'); meta.className = 'pmeta';
    meta.textContent = `Page ${r.page || 1} of ${r.total} · ${pct}%`;
    el.append(bar, meta);
  }

  const read = document.createElement('a');
  read.className = 'read-btn';
  read.textContent = r.status === 'reading' ? 'Continue' : r.status === 'finished' ? 'Read again' : 'Start reading';
  read.href = 'read.html?title=' + encodeURIComponent(r.title) +
              '&author=' + encodeURIComponent(r.author || '') +
              '&ol=' + encodeURIComponent(r.ol_key) +
              '&cover=' + encodeURIComponent(r.cover_id || '') +
              ((r.ol_key || '').startsWith('pg:') ? '&gid=' + r.ol_key.slice(3) : '');

  const mv = document.createElement('select');
  mv.className = 'mv';
  mv.setAttribute('aria-label', 'Move to another list');
  Object.keys(LABEL).forEach(k => {
    const o = document.createElement('option');
    o.value = k; o.textContent = LABEL[k]; o.selected = k === r.status;
    mv.appendChild(o);
  });
  mv.onchange = () => move(r, mv.value);

  const rm = document.createElement('button');
  rm.type = 'button'; rm.className = 'rm'; rm.textContent = 'Remove';
  rm.onclick = () => remove(r);

  el.append(read, mv, rm);
  return el;
}

function render() {
  document.querySelectorAll('.tab').forEach(t => {
    const n = rows.filter(r => r.status === t.dataset.s).length;
    t.querySelector('b').textContent = n;
    t.classList.toggle('on', t.dataset.s === tab);
  });
  const list = rows.filter(r => r.status === tab);
  if (!list.length) {
    const box = document.createElement('div');
    box.className = 'empty';
    const h = document.createElement('h3'); h.textContent = EMPTY[tab][0];
    const p = document.createElement('p'); p.textContent = EMPTY[tab][1];
    const a = document.createElement('a'); a.className = 'btn btn-solid'; a.href = 'index.html'; a.textContent = 'Find books';
    box.append(h, p, a);
    $('grid').replaceChildren(box);
    return;
  }
  $('grid').replaceChildren(...list.map(card));
}

async function move(r, status) {
  const { error } = await sb.from('shelf').update({ status, updated_at: new Date().toISOString() }).eq('id', r.id);
  if (error) { console.error(error); alert("Couldn't update that book. Please try again."); return render(); }
  r.status = status;
  render();
}
async function remove(r) {
  if (!confirm('Remove “' + r.title + '” from your shelf?')) return;
  const { error } = await sb.from('shelf').delete().eq('id', r.id);
  if (error) { console.error(error); alert("Couldn't remove it. Please try again."); return; }
  rows = rows.filter(x => x !== r);
  render();
}

$('tabs').addEventListener('click', e => {
  const t = e.target.closest('.tab');
  if (t) { tab = t.dataset.s; render(); }
});
$('logout').onclick = async () => { await sb.auth.signOut(); location.href = 'index.html'; };

(async () => {
  const { data } = await sb.auth.getSession();
  if (!data.session) { location.href = 'log.html'; return; }
  const u = data.session.user;
  $('who').textContent = (u.user_metadata || {}).full_name || u.email;

  const { data: list, error } = await sb.from('shelf').select('*').order('updated_at', { ascending: false });
  if (error) {
    console.error(error);
    $('grid').innerHTML = '';
    const d = document.createElement('div'); d.className = 'empty';
    d.textContent = "Couldn't load your shelf. Check that the shelf table was created in Supabase.";
    $('grid').appendChild(d);
    return;
  }
  rows = list;
  tab = ['reading', 'want', 'finished'].find(s => rows.some(r => r.status === s)) || 'reading';
  render();
})();
};

/* ============ book page ============ */
MR_PAGES.book = function () {
const sb = supabase.createClient(
  'https://hyknwejzijdejxwugllg.supabase.co',
  'sb_publishable_AkUpwGSWQwMX3iV_qMrXfw_FlKNBbhN'
);
const $ = id => document.getElementById(id);
const enc = encodeURIComponent;
const API = 'https://openlibrary.org';
const COVER = id => `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
const LABEL = { want: 'Want to read', reading: 'Reading', finished: 'Finished' };

/* ---------- What are we looking at? ---------- */
const P = new URLSearchParams(location.search);
const key = P.get('key') || '';
let gid = Number(P.get('gid')) || 0;
if (!gid && key.startsWith('pg:')) gid = Number(key.slice(3)) || 0;
const isPG = !!gid;
const SHELF_KEY = isPG ? 'pg:' + gid : key;

const st = {
  title: P.get('title') || '', author: P.get('author') || '', cover: Number(P.get('cover')) || null,
  coverUrl: isPG ? `https://www.gutenberg.org/cache/epub/${gid}/pg${gid}.cover.medium.jpg` : null,
  year: null, desc: '', subjects: [], rating: null, downloads: null
};
let session = null, shelfStatus = null, descFailed = false;

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}
function cleanDesc(d) {
  const t = typeof d === 'string' ? d : (d && d.value) || '';
  return t.split(/\r?\n-{4,}/)[0].replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
}
function tidyAuthor(a) {
  return a && a.includes(',') ? a.split(',').map(x => x.trim()).reverse().join(' ') : a;
}

let toastT;
function toast(text) {
  let t = $('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = text; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Rendering ---------- */
function renderHeader() {
  document.title = (st.title || 'Book') + ' – Moodread';
  $('title').textContent = st.title || 'Book';
  $('by').textContent = st.author ? 'by ' + st.author : '';
  $('badge').hidden = !isPG;

  const c = $('cover');
  c.replaceChildren(document.createTextNode(st.title || ''));
  const src = st.coverUrl || (st.cover ? COVER(st.cover) : null);
  if (src) {
    const img = document.createElement('img');
    img.src = src; img.alt = 'Cover of ' + st.title;
    img.onerror = () => img.remove();
    c.appendChild(img);
  }

  const facts = [];
  if (st.year) facts.push('First published ' + st.year);
  if (st.rating) facts.push(`${st.rating.average.toFixed(1)} ★ · ${st.rating.count.toLocaleString()} ratings`);
  if (st.downloads) facts.push(st.downloads.toLocaleString() + ' recent downloads');
  $('facts').replaceChildren(...facts.map(f => {
    const s = document.createElement('span'); s.className = 'fact'; s.textContent = f; return s;
  }));
}

function renderDesc() {
  const d = $('desc'), more = $('more');
  if (!st.desc) {
    d.textContent = descFailed ? "We couldn't load the description right now. Please try again in a moment." : 'No description is available for this book yet.';
    d.className = 'desc muted'; more.hidden = true; return;
  }
  d.textContent = st.desc;
  d.className = 'desc' + (st.desc.length > 420 ? ' clamp' : '');
  more.hidden = st.desc.length <= 420;
  more.textContent = 'Read more';
}
$('more').onclick = () => {
  const d = $('desc');
  const open = d.classList.toggle('clamp');
  $('more').textContent = open ? 'Read more' : 'Show less';
};

function renderSubjects() {
  const box = $('subjects');
  box.replaceChildren(...st.subjects.map(s => {
    const a = document.createElement('a');
    a.href = 'index.html?subject=' + enc(s);
    a.textContent = s;
    return a;
  }));
  $('subj-block').hidden = !st.subjects.length;
}

function readHref() {
  return 'read.html?title=' + enc(st.title) + '&author=' + enc(st.author || '') +
         '&ol=' + enc(SHELF_KEY) + '&cover=' + enc(st.cover || '') + (isPG ? '&gid=' + gid : '');
}

function renderActions() {
  const box = $('actions');
  box.replaceChildren();
  if (!session) {
    const r = document.createElement('a'); r.className = 'btn btn-solid btn-lg'; r.href = 'log.html'; r.textContent = 'Log in to read';
    const s = document.createElement('a'); s.className = 'btn btn-out btn-lg'; s.href = 'log.html#signup'; s.textContent = 'Create free account';
    box.append(r, s);
    return;
  }
  const read = document.createElement('a');
  read.className = 'btn btn-solid btn-lg'; read.href = readHref();
  read.textContent = shelfStatus === 'reading' ? 'Continue reading' : 'Read now';
  box.appendChild(read);

  const pick = document.createElement('div');
  pick.className = 'shelfpick';
  const lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = 'Shelf:';
  pick.appendChild(lbl);
  Object.keys(LABEL).forEach(k => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opt' + (shelfStatus === k ? ' on' : ''); b.textContent = LABEL[k];
    b.onclick = () => setStatus(k);
    pick.appendChild(b);
  });
  if (shelfStatus) {
    const rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'rmlink'; rm.textContent = 'Remove';
    rm.onclick = () => setStatus(null);
    pick.appendChild(rm);
  }
  box.appendChild(pick);
}

async function setStatus(status) {
  if (!status) {
    const { error } = await sb.from('shelf').delete().eq('ol_key', SHELF_KEY);
    if (error) { console.error(error); return toast("Couldn't update your shelf"); }
    shelfStatus = null; toast('Removed from your shelf');
  } else {
    const row = {
      user_id: session.user.id, ol_key: SHELF_KEY, title: st.title, author: st.author || null,
      cover_id: st.cover || null, status, updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('shelf').upsert(row, { onConflict: 'user_id,ol_key' });
    if (error) { console.error(error); return toast("Couldn't save. Try again."); }
    shelfStatus = status; toast('Saved to ' + LABEL[status]);
  }
  renderActions();
}

function renderAuth() {
  const box = $('auth');
  box.replaceChildren();
  if (session) {
    const u = session.user;
    const who = document.createElement('span'); who.className = 'who-name';
    who.textContent = (u.user_metadata || {}).full_name || u.email;
    const out = document.createElement('button'); out.className = 'btn btn-out'; out.textContent = 'Log out';
    out.onclick = async () => { await sb.auth.signOut(); location.reload(); };
    box.append(who, out);
  } else {
    const a = document.createElement('a'); a.className = 'btn btn-out'; a.href = 'log.html'; a.textContent = 'Log in';
    const b = document.createElement('a'); b.className = 'btn btn-solid'; b.href = 'log.html#signup'; b.textContent = 'Sign up free';
    box.append(a, b);
  }
}

/* ---------- Loading details ---------- */
async function loadOL() {
  const w = await getJSON(API + key + '.json');
  st.title = w.title || st.title;
  st.desc = cleanDesc(w.description);
  st.subjects = (w.subjects || []).slice(0, 16);
  if (!st.cover && w.covers) st.cover = w.covers.find(c => c > 0) || null;
  const m = String(w.first_publish_date || '').match(/\d{4}/);
  if (m) st.year = m[0];
  if (!st.author && w.authors && w.authors[0] && w.authors[0].author) {
    try { st.author = (await getJSON(API + w.authors[0].author.key + '.json')).name || ''; } catch (e) {}
  }
  try {
    const rt = await getJSON(API + key + '/ratings.json');
    if (rt.summary && rt.summary.count) st.rating = rt.summary;
  } catch (e) {}
}

async function loadPG() {
  const b = await getJSON('https://gutendex.com/books/' + gid);
  if (!st.title) st.title = b.title.split(/[;:]/)[0].trim();
  if (!st.author) st.author = tidyAuthor(((b.authors || [])[0] || {}).name || '');
  st.coverUrl = (b.formats && b.formats['image/jpeg']) || st.coverUrl;
  st.downloads = b.download_count || null;
  const subs = [...(b.subjects || []), ...(b.bookshelves || []).map(x => x.replace(/^Browsing:\s*/, ''))]
    .map(x => x.split(' -- ')[0].trim()).filter(Boolean);
  st.subjects = [...new Set(subs)].slice(0, 14);
  renderHeader();
  // Gutenberg has no blurbs, so borrow the description and year from Open Library
  try {
    const s = await getJSON(`${API}/search.json?title=${enc(st.title)}&author=${enc(st.author)}&limit=1&fields=key,first_publish_year`);
    const d = (s.docs || [])[0];
    if (d) {
      st.year = d.first_publish_year || null;
      st.desc = cleanDesc((await getJSON(API + d.key + '.json')).description);
    }
  } catch (e) {}
}

/* Fallback: Google Books has a description for almost every title */
function htmlToText(h) {
  const t = (h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
  return new DOMParser().parseFromString(t, 'text/html').body.textContent.trim();
}
async function loadGoogle() {
  const q = 'intitle:"' + st.title + '"' + (st.author ? ' inauthor:"' + st.author + '"' : '');
  const data = await getJSON('https://www.googleapis.com/books/v1/volumes?q=' + enc(q) + '&maxResults=5&printType=books');
  const norm = x => (x || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const t = norm(st.title);
  const vols = (data.items || []).map(i => i.volumeInfo || {}).filter(v => v.description);
  const v = vols.find(x => { const n = norm(x.title); return n && t && (n.includes(t) || t.includes(n)); }) || vols[0];
  if (!v) return;
  if (!st.desc) st.desc = htmlToText(v.description);
  if (!st.rating && v.averageRating && v.ratingsCount) st.rating = { average: v.averageRating, count: v.ratingsCount };
  if (!st.subjects.length && v.categories) st.subjects = [...new Set(v.categories.flatMap(c => c.split(' / ')))].slice(0, 12);
}

async function loadRelated() {
  const skip = /accessible|daisy|protected|in library|large type|reading level|nyt|new york times|open_syllabus/i;
  const topic = st.subjects.find(s => s.length <= 32 && !skip.test(s));
  if (!topic) return;
  try {
    const data = await getJSON(`${API}/search.json?q=${enc('subject:"' + topic + '"')}&limit=30&fields=key,title,author_name,cover_i`);
    const items = (data.docs || [])
      .filter(d => d.cover_i && d.title && d.key !== key && d.title !== st.title).slice(0, 12);
    if (!items.length) return;
    $('rel-sub').textContent = 'Other books about ' + topic.toLowerCase();
    $('rel').replaceChildren(...items.map(d => {
      const a = document.createElement('a');
      a.className = 'rel';
      a.href = 'book.html?key=' + enc(d.key) + '&title=' + enc(d.title) +
               '&author=' + enc((d.author_name || [])[0] || '') + '&cover=' + d.cover_i;
      const c = document.createElement('div'); c.className = 'c';
      const img = document.createElement('img'); img.src = COVER(d.cover_i); img.alt = 'Cover of ' + d.title; img.loading = 'lazy';
      c.appendChild(img);
      const h = document.createElement('h3'); h.textContent = d.title;
      const p = document.createElement('p'); p.textContent = (d.author_name || [])[0] || '';
      a.append(c, h, p);
      return a;
    }));
    $('related').hidden = false;
  } catch (e) {}
}

$('back').onclick = () => { history.length > 1 ? history.back() : (location.href = 'index.html'); };

(async () => {
  if (!key && !gid) {
    $('title').textContent = 'Book not found';
    $('desc').textContent = 'We could not tell which book you wanted. Go back and pick one.';
    $('cover').replaceChildren();
    return;
  }
  renderHeader();           // instant, from the link
  $('desc').textContent = 'Loading…';

  try {
    const { data } = await sb.auth.getSession();
    session = data.session;
    if (session) {
      const { data: row } = await sb.from('shelf').select('status').eq('ol_key', SHELF_KEY).maybeSingle();
      shelfStatus = row ? row.status : null;
    }
  } catch (e) { console.error(e); }
  renderAuth();
  renderActions();

  let mainFailed = false, googleFailed = false;
  try {
    if (isPG) await loadPG(); else await loadOL();
  } catch (e) { console.warn('Open Library / Gutenberg details failed:', e); mainFailed = true; }

  if (!st.desc || !st.subjects.length) {
    try { await loadGoogle(); } catch (e) { console.warn('Google Books failed:', e); googleFailed = true; }
  }
  descFailed = !st.desc && mainFailed && googleFailed;
  renderHeader(); renderDesc(); renderSubjects(); renderActions();
  loadRelated();
})();
};

/* start the right page */
document.addEventListener('DOMContentLoaded', function () {
  var run = MR_PAGES[document.body.dataset.page];
  if (run) run();
});