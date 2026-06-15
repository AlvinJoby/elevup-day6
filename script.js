/* ============================================================
   CINEVAULT — script.js
   ============================================================ */

/* ─── API CONFIGURATION ─────────────────────────────────── */
const CONFIG = {
  API_KEY: 'a483a00e0aaaec8d41e65a9befab0845',       // ← Replace with your TMDb v3 key
  BASE_URL: 'https://api.themoviedb.org/3',
  IMG_BASE: 'https://image.tmdb.org/t/p/',
  POSTER_SIZE: 'w500',
  BACKDROP_SIZE: 'w1280',
  THUMB_SIZE: 'w185',
};

/* ─── GENRE MAP ─────────────────────────────────────────── */
const GENRE_MAP = {
  28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',
  18:'Drama',14:'Fantasy',27:'Horror',10749:'Romance',878:'Sci-Fi',53:'Thriller',
  99:'Documentary',10402:'Music',9648:'Mystery',36:'History',10751:'Family',
};

/* ─── LOCAL STORAGE KEYS ────────────────────────────────── */
const LS = {
  FAVORITES:'cv_favorites',
  WATCHLIST:'cv_watchlist',
  RECENT:'cv_recent',
  THEME:'cv_theme',
  HISTORY:'cv_search_history',
};

/* ─── STATE ─────────────────────────────────────────────── */
const state = {
  favorites: loadLS(LS.FAVORITES, []),
  watchlist: loadLS(LS.WATCHLIST, []),
  recent: loadLS(LS.RECENT, []),
  searchHistory: loadLS(LS.HISTORY, []),
  currentMovieId: null,
  searchTimeout: null,
  suggestionIndex: -1,
  totalLoaded: 0,
  allLoadedMovies: [],
};

/* ─── DEMO DATA (used when no API key set) ──────────────── */
const DEMO_MOVIES = [
  {id:550,title:'Fight Club',release_date:'1999-10-15',vote_average:8.4,poster_path:null,genre_ids:[18,53],overview:'An insomniac office worker forms an underground fight club.',popularity:87},
  {id:13,title:'Forrest Gump',release_date:'1994-07-06',vote_average:8.5,poster_path:null,genre_ids:[18,35,10749],overview:'The presidencies of Kennedy and Johnson through the eyes of a simple man.',popularity:73},
  {id:120,title:'The Lord of the Rings: The Fellowship of the Ring',release_date:'2001-12-19',vote_average:8.3,poster_path:null,genre_ids:[12,14,18],overview:'A young hobbit is tasked with destroying a ring of ultimate power.',popularity:96},
  {id:155,title:'The Dark Knight',release_date:'2008-07-18',vote_average:8.5,poster_path:null,genre_ids:[28,18,80],overview:'Batman fights the Joker in Gotham City.',popularity:112},
  {id:238,title:'The Godfather',release_date:'1972-03-24',vote_average:8.7,poster_path:null,genre_ids:[18,80],overview:'The aging patriarch of an organized crime dynasty transfers control to his son.',popularity:91},
  {id:278,title:'The Shawshank Redemption',release_date:'1994-09-23',vote_average:8.7,poster_path:null,genre_ids:[18,80],overview:'Two imprisoned men bond over years, finding solace and eventual redemption.',popularity:85},
  {id:424,title:"Schindler's List",release_date:'1993-12-15',vote_average:8.6,poster_path:null,genre_ids:[18,36,53],overview:'A businessman saves Jewish refugees during the Holocaust.',popularity:78},
  {id:680,title:'Pulp Fiction',release_date:'1994-10-14',vote_average:8.5,poster_path:null,genre_ids:[18,80],overview:'Intertwining stories of crime in Los Angeles.',popularity:94},
  {id:240,title:'The Godfather Part II',release_date:'1974-12-20',vote_average:8.6,poster_path:null,genre_ids:[18,80],overview:'The early life and career of Vito Corleone.',popularity:76},
  {id:389,title:'12 Angry Men',release_date:'1957-04-10',vote_average:8.5,poster_path:null,genre_ids:[18],overview:'Twelve jurors deliberate the fate of an accused murderer.',popularity:58},
  {id:637,title:'Life is Beautiful',release_date:'1997-12-20',vote_average:8.5,poster_path:null,genre_ids:[18,35,10749],overview:'A Jewish man uses humor to shelter his son from the horrors of a Nazi concentration camp.',popularity:65},
  {id:129,title:'Spirited Away',release_date:'2001-07-20',vote_average:8.5,poster_path:null,genre_ids:[16,14,12],overview:'A young girl becomes trapped in a spirit world.',popularity:89},
  {id:769,title:'Goodfellas',release_date:'1990-09-19',vote_average:8.5,poster_path:null,genre_ids:[18,80],overview:'The story of Henry Hill and his life in the mob.',popularity:83},
  {id:372058,title:'Your Name.',release_date:'2016-08-26',vote_average:8.5,poster_path:null,genre_ids:[16,10749,18],overview:'Two strangers find themselves linked in a bizarre way.',popularity:97},
  {id:497,title:'The Green Mile',release_date:'1999-12-10',vote_average:8.5,poster_path:null,genre_ids:[18,80,99],overview:'A supernatural tale set on death row in 1930s Louisiana.',popularity:71},
  {id:311,title:'Once Upon a Time in the West',release_date:'1968-12-21',vote_average:8.5,poster_path:null,genre_ids:[18],overview:'A mysterious harmonica player teams up with a outlawed bandit.',popularity:62},
];

/* ─── UTILITIES ─────────────────────────────────────────── */
function loadLS(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) || def; } catch { return def; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function posterUrl(path, size = CONFIG.POSTER_SIZE) {
  return path ? `${CONFIG.IMG_BASE}${size}${path}` : null;
}
function backdropUrl(path) {
  return path ? `${CONFIG.IMG_BASE}${CONFIG.BACKDROP_SIZE}${path}` : null;
}
function formatMoney(n) {
  if (!n || n === 0) return '—';
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}
function formatRuntime(mins) {
  if (!mins) return '—';
  return `${Math.floor(mins/60)}h ${mins%60}m`;
}
function starRating(score) {
  const stars = Math.round((score / 2));
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}
function genreName(id) { return GENRE_MAP[id] || ''; }

/* ─── API ───────────────────────────────────────────────── */
async function api(path, params = {}) {
  if (!CONFIG.API_KEY || CONFIG.API_KEY === 'a483a00e0aaaec8d41e65a9befab0845') {
    throw new Error('NO_KEY');
  }
  const url = new URL(`${CONFIG.BASE_URL}${path}`);
  url.searchParams.set('api_key', CONFIG.API_KEY);
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ─── SKELETON HELPERS ──────────────────────────────────── */
function renderSkeletons(grid, count = 8) {
  grid.innerHTML = Array.from({length: count}, () =>
    `<div class="skeleton-card">
       <div class="skeleton-poster"></div>
       <div class="skeleton-info">
         <div class="skeleton-line"></div>
         <div class="skeleton-line short"></div>
       </div>
     </div>`
  ).join('');
}

/* ─── MOVIE CARD ────────────────────────────────────────── */
function createMovieCard(movie) {
  const isFav = state.favorites.some(f => f.id === movie.id);
  const isWatch = state.watchlist.some(w => w.id === movie.id);
  const poster = posterUrl(movie.poster_path);
  const year = movie.release_date ? movie.release_date.slice(0, 4) : '—';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '?';
  const genreId = movie.genre_ids?.[0];
  const genre = genreId ? genreName(genreId) : '';

  const card = document.createElement('div');
  card.className = 'movie-card reveal';
  card.setAttribute('role', 'article');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${movie.title}, ${year}, rated ${rating}`);
  card.dataset.id = movie.id;

  card.innerHTML = `
    <div class="card-poster-wrap">
      ${poster
        ? `<img class="card-poster" src="${poster}" alt="${movie.title} poster" loading="lazy" />`
        : `<div class="card-poster" style="background:linear-gradient(135deg,#1A1A3E,#2A1A2E);display:flex;align-items:center;justify-content:center;font-size:2rem;aspect-ratio:2/3;">🎬</div>`
      }
      <div class="card-rating">${rating}</div>
      <div class="card-overlay">
        <div class="card-quick-actions">
          <button class="card-quick-btn fav${isFav ? ' active' : ''}" data-id="${movie.id}" aria-label="${isFav ? 'Remove from' : 'Add to'} favourites">
            ${isFav ? '♥' : '♡'}
          </button>
          <button class="card-quick-btn watch${isWatch ? ' active' : ''}" data-id="${movie.id}" aria-label="${isWatch ? 'Remove from' : 'Add to'} watchlist">
            ${isWatch ? '✓ Saved' : '+ Watch'}
          </button>
        </div>
      </div>
    </div>
    <div class="card-info">
      <div class="card-title">${movie.title}</div>
      <div class="card-meta">
        <span class="card-year">${year}</span>
        ${genre ? `<span class="card-genre-tag">${genre}</span>` : ''}
      </div>
    </div>`;

  card.addEventListener('click', e => {
    if (e.target.closest('.card-quick-btn')) return;
    openModal(movie.id);
    addRecent(movie);
  });
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(movie.id); addRecent(movie); }
  });

  card.querySelector('.card-quick-btn.fav')?.addEventListener('click', e => {
    e.stopPropagation();
    toggleFavorite(movie, card);
  });
  card.querySelector('.card-quick-btn.watch')?.addEventListener('click', e => {
    e.stopPropagation();
    toggleWatchlist(movie, card);
  });

  setTimeout(() => card.classList.add('visible'), 10);
  return card;
}

function renderMovies(movies, grid) {
  grid.innerHTML = '';
  if (!movies.length) return;
  const frag = document.createDocumentFragment();
  movies.forEach((m, i) => {
    const card = createMovieCard(m);
    card.style.animationDelay = `${i * 35}ms`;
    frag.appendChild(card);
  });
  grid.appendChild(frag);
  state.totalLoaded = Math.max(state.totalLoaded, movies.length);
  state.allLoadedMovies = [...new Map([...state.allLoadedMovies, ...movies].map(m => [m.id, m])).values()];
  updateStats();
}

/* ─── FAVORITES & WATCHLIST ─────────────────────────────── */
function toggleFavorite(movie, cardEl) {
  const idx = state.favorites.findIndex(f => f.id === movie.id);
  if (idx === -1) {
    state.favorites.unshift(movie);
    toast(`Added "${movie.title}" to favourites`, 'success');
  } else {
    state.favorites.splice(idx, 1);
    toast(`Removed "${movie.title}" from favourites`, 'info');
  }
  saveLS(LS.FAVORITES, state.favorites);
  updateStats();
  if (cardEl) {
    const btn = cardEl.querySelector('.card-quick-btn.fav');
    const isFav = state.favorites.some(f => f.id === movie.id);
    if (btn) {
      btn.classList.toggle('active', isFav);
      btn.textContent = isFav ? '♥' : '♡';
    }
  }
  if (document.getElementById('favoritesSection').getAttribute('aria-hidden') !== 'true') {
    renderFavorites();
  }
  refreshRecommendations();
}
function toggleWatchlist(movie, cardEl) {
  const idx = state.watchlist.findIndex(w => w.id === movie.id);
  if (idx === -1) {
    state.watchlist.unshift(movie);
    toast(`Added "${movie.title}" to watchlist`, 'success');
  } else {
    state.watchlist.splice(idx, 1);
    toast(`Removed from watchlist`, 'info');
  }
  saveLS(LS.WATCHLIST, state.watchlist);
  updateStats();
  if (cardEl) {
    const btn = cardEl.querySelector('.card-quick-btn.watch');
    const isWatch = state.watchlist.some(w => w.id === movie.id);
    if (btn) {
      btn.classList.toggle('active', isWatch);
      btn.textContent = isWatch ? '✓ Saved' : '+ Watch';
    }
  }
}
function addRecent(movie) {
  state.recent = state.recent.filter(r => r.id !== movie.id);
  state.recent.unshift(movie);
  if (state.recent.length > 20) state.recent.pop();
  saveLS(LS.RECENT, state.recent);
  renderRecent();
}

/* ─── RECENT ────────────────────────────────────────────── */
function renderRecent() {
  const sec = document.getElementById('recentSection');
  const grid = document.getElementById('recentGrid');
  if (!state.recent.length) { sec.hidden = true; return; }
  sec.hidden = false;
  renderMovies(state.recent.slice(0, 8), grid);
}

/* ─── FAVORITES SECTION ─────────────────────────────────── */
function renderFavorites() {
  const grid = document.getElementById('favoritesGrid');
  const empty = document.getElementById('favsEmpty');
  const count = document.getElementById('favsCount');
  count.textContent = `${state.favorites.length} film${state.favorites.length !== 1 ? 's' : ''}`;
  if (!state.favorites.length) { grid.innerHTML = ''; empty.hidden = false; return; }
  empty.hidden = true;
  renderMovies(state.favorites, grid);
}

/* ─── WATCHLIST SECTION ─────────────────────────────────── */
function renderWatchlist() {
  const grid = document.getElementById('watchlistGrid');
  const empty = document.getElementById('watchlistEmpty');
  const count = document.getElementById('watchlistCount');
  count.textContent = `${state.watchlist.length} film${state.watchlist.length !== 1 ? 's' : ''}`;
  if (!state.watchlist.length) { grid.innerHTML = ''; empty.hidden = false; return; }
  empty.hidden = true;
  renderMovies(state.watchlist, grid);
}

/* ─── STATS ─────────────────────────────────────────────── */
function updateStats() {
  animateNumber('statMovies', state.totalLoaded);
  animateNumber('statFavs', state.favorites.length);
  animateNumber('statWatchlist', state.watchlist.length);
  if (state.allLoadedMovies.length) {
    const top = state.allLoadedMovies.reduce((a, b) => a.vote_average > b.vote_average ? a : b);
    document.getElementById('statTopRated').textContent = top.vote_average.toFixed(1);
  }
}
function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  if (diff === 0) return;
  let t = 0;
  const dur = 600;
  const step = () => {
    t += 16;
    el.textContent = Math.round(start + diff * Math.min(t / dur, 1));
    if (t < dur) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ─── LOAD SECTION ──────────────────────────────────────── */
async function loadSection(type, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  renderSkeletons(grid);
  try {
    let data;
    if (type === 'trending') {
      data = await api('/trending/movie/week');
    } else {
      data = await api(`/movie/${type}`, { page: 1 });
    }
    const movies = data.results || [];
    renderMovies(movies.slice(0, 10), grid);
    return movies;
  } catch (err) {
    if (err.message === 'NO_KEY') {
      renderMovies(DEMO_MOVIES.slice(0, 8), grid);
      return DEMO_MOVIES;
    }
    grid.innerHTML = `<p style="color:var(--text-muted);padding:20px">Failed to load movies. Check your connection.</p>`;
    return [];
  }
}

/* ─── HERO ───────────────────────────────────────────────── */
async function setupHero() {
  try {
    let movie;
    const trending = await api('/trending/movie/day').catch(() => null);
    if (trending?.results?.length) {
      const picks = trending.results.slice(0, 5);
      movie = picks[Math.floor(Math.random() * picks.length)];
    } else {
      movie = DEMO_MOVIES[Math.floor(Math.random() * 5)];
    }
    const bg = document.getElementById('heroBg');
    const heroTitle = document.getElementById('heroTitle');
    const heroTagline = document.getElementById('heroTagline');
    const heroMeta = document.getElementById('heroMeta');

    if (movie.backdrop_path) {
      bg.style.backgroundImage = `url(${backdropUrl(movie.backdrop_path)})`;
    }
    heroTitle.innerHTML = `${movie.title}<br/><em>Discover Cinema</em>`;
    heroTagline.textContent = movie.overview?.slice(0, 120) + '…' || 'A universe of cinema, curated for you.';
    heroMeta.innerHTML = `
      <div class="hero-meta-item"><span class="hero-meta-value">${movie.release_date?.slice(0,4) || '—'}</span><span>Year</span></div>
      <div class="hero-meta-item"><span class="hero-meta-value">★ ${movie.vote_average?.toFixed(1) || '?'}</span><span>Rating</span></div>
      <div class="hero-meta-item"><span class="hero-meta-value">${Math.round(movie.popularity || 0)}</span><span>Popularity</span></div>`;

    document.getElementById('exploreBtn').addEventListener('click', () => {
      openModal(movie.id);
      addRecent(movie);
    });
  } catch {
    // hero stays with default
  }
}

/* ─── HERO PARTICLES ────────────────────────────────────── */
function spawnParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 2;
    p.style.cssText = `
      width:${size}px;height:${size}px;
      left:${Math.random() * 100}%;
      animation-duration:${8 + Math.random() * 12}s;
      animation-delay:${Math.random() * 8}s;
      opacity:${Math.random() * 0.5 + 0.1};
    `;
    container.appendChild(p);
  }
}

/* ─── SEARCH ────────────────────────────────────────────── */
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');
const searchClear = document.getElementById('searchClear');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  searchClear.hidden = !q;
  clearTimeout(state.searchTimeout);
  if (!q) { hideSuggestions(); return; }
  state.searchTimeout = setTimeout(() => fetchSuggestions(q), 300);
});
searchInput.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') navigateSuggestions(1);
  else if (e.key === 'ArrowUp') navigateSuggestions(-1);
  else if (e.key === 'Enter') {
    const q = searchInput.value.trim();
    if (q) { hideSuggestions(); doSearch(q); saveSearchHistory(q); }
  } else if (e.key === 'Escape') hideSuggestions();
});
searchInput.addEventListener('focus', () => {
  const q = searchInput.value.trim();
  if (!q && state.searchHistory.length) showSearchHistory();
});
searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.hidden = true;
  hideSuggestions();
  clearSearchResults();
  searchInput.focus();
});

async function fetchSuggestions(q) {
  try {
    const data = await api('/search/movie', { query: q, page: 1 });
    renderSuggestions(data.results?.slice(0, 6) || [], q);
  } catch {
    renderSuggestions(
      DEMO_MOVIES.filter(m => m.title.toLowerCase().includes(q.toLowerCase())).slice(0, 5),
      q
    );
  }
}
function renderSuggestions(movies, q) {
  if (!movies.length) { hideSuggestions(); return; }
  searchSuggestions.innerHTML = movies.map(m => {
    const poster = posterUrl(m.poster_path, CONFIG.THUMB_SIZE);
    const year = m.release_date?.slice(0,4) || '';
    return `<div class="suggestion-item" role="option" data-id="${m.id}" data-title="${m.title}">
      ${poster ? `<img class="suggestion-poster" src="${poster}" alt="" loading="lazy"/>` : '<div class="suggestion-poster" style="background:var(--surface3)"></div>'}
      <div class="suggestion-info">
        <div class="suggestion-title">${m.title}</div>
        <div class="suggestion-year">${year}</div>
      </div>
    </div>`;
  }).join('');
  searchSuggestions.classList.add('visible');
  state.suggestionIndex = -1;

  searchSuggestions.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.id);
      const title = el.dataset.title;
      searchInput.value = title;
      hideSuggestions();
      openModal(id);
      saveSearchHistory(title);
    });
  });
}
function showSearchHistory() {
  if (!state.searchHistory.length) return;
  searchSuggestions.innerHTML = state.searchHistory.slice(0, 6).map(h =>
    `<div class="suggestion-item history-item" role="option" data-query="${h}">
       <div class="suggestion-info"><div class="suggestion-title">${h}</div></div>
     </div>`
  ).join('');
  searchSuggestions.classList.add('visible');
  searchSuggestions.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('click', () => {
      searchInput.value = el.dataset.query;
      hideSuggestions();
      doSearch(el.dataset.query);
    });
  });
}
function hideSuggestions() {
  searchSuggestions.classList.remove('visible');
  state.suggestionIndex = -1;
}
function navigateSuggestions(dir) {
  const items = [...searchSuggestions.querySelectorAll('.suggestion-item')];
  if (!items.length) return;
  items.forEach(i => i.classList.remove('active'));
  state.suggestionIndex = Math.max(-1, Math.min(items.length - 1, state.suggestionIndex + dir));
  if (state.suggestionIndex >= 0) {
    items[state.suggestionIndex].classList.add('active');
    searchInput.value = items[state.suggestionIndex].dataset.title || items[state.suggestionIndex].dataset.query || searchInput.value;
  }
}
function saveSearchHistory(q) {
  state.searchHistory = [q, ...state.searchHistory.filter(h => h !== q)].slice(0, 10);
  saveLS(LS.HISTORY, state.searchHistory);
}

async function doSearch(q) {
  const sec = document.getElementById('searchResultsSection');
  const grid = document.getElementById('searchResultsGrid');
  const empty = document.getElementById('searchEmpty');
  const title = document.getElementById('searchResultsTitle');

  sec.hidden = false;
  title.textContent = `Results for "${q}"`;
  renderSkeletons(grid);
  empty.hidden = true;

  try {
    const data = await api('/search/movie', { query: q });
    const movies = data.results || [];
    if (!movies.length) { grid.innerHTML = ''; empty.hidden = false; return; }
    renderMovies(applyFilters(movies), grid);
  } catch {
    const local = DEMO_MOVIES.filter(m => m.title.toLowerCase().includes(q.toLowerCase()));
    if (!local.length) { grid.innerHTML = ''; empty.hidden = false; return; }
    renderMovies(local, grid);
  }
  sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearSearchResults() {
  document.getElementById('searchResultsSection').hidden = true;
  document.getElementById('searchResultsGrid').innerHTML = '';
}

/* ─── FILTERS ────────────────────────────────────────────── */
function applyFilters(movies) {
  const genre = document.getElementById('genreFilter').value;
  const year = document.getElementById('yearFilter').value;
  const rating = document.getElementById('ratingFilter').value;
  const lang = document.getElementById('langFilter').value;
  const sort = document.getElementById('sortFilter').value;

  let filtered = movies;
  if (genre) filtered = filtered.filter(m => m.genre_ids?.includes(parseInt(genre)));
  if (year) filtered = filtered.filter(m => m.release_date?.startsWith(year));
  if (rating) filtered = filtered.filter(m => m.vote_average >= parseFloat(rating));
  if (lang) filtered = filtered.filter(m => m.original_language === lang);

  const [field, dir] = sort.split('.');
  filtered.sort((a, b) => {
    let av = field === 'title' ? a.title : (a[field] ?? 0);
    let bv = field === 'title' ? b.title : (b[field] ?? 0);
    if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return dir === 'asc' ? av - bv : bv - av;
  });
  return filtered;
}

function populateYears() {
  const sel = document.getElementById('yearFilter');
  const cur = new Date().getFullYear();
  for (let y = cur; y >= 1970; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    sel.appendChild(opt);
  }
}

document.getElementById('resetFilters').addEventListener('click', () => {
  ['genreFilter','yearFilter','ratingFilter','sortFilter','langFilter'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
  document.querySelector('.genre-pill[data-genre=""]').classList.add('active');
  loadAllSections();
});

['genreFilter','yearFilter','ratingFilter','sortFilter','langFilter'].forEach(id => {
  document.getElementById(id).addEventListener('change', loadAllSections);
});

document.querySelectorAll('.genre-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    const genreId = pill.dataset.genre;
    document.getElementById('genreFilter').value = genreId;
    loadAllSections();
  });
});

/* ─── LOAD ALL SECTIONS ─────────────────────────────────── */
async function loadAllSections() {
  await Promise.all([
    loadSection('trending', 'trendingGrid'),
    loadSection('popular', 'popularGrid'),
    loadSection('top_rated', 'topratedGrid'),
    loadSection('upcoming', 'upcomingGrid'),
    loadSection('now_playing', 'nowplayingGrid'),
  ]);
  updateStats();
  refreshRecommendations();
}

/* ─── RECOMMENDATIONS ───────────────────────────────────── */
async function refreshRecommendations() {
  const sec = document.getElementById('recsSection');
  const grid = document.getElementById('recsGrid');
  if (!state.favorites.length) { sec.hidden = true; return; }

  sec.hidden = false;
  const genreFreq = {};
  state.favorites.forEach(m => {
    (m.genre_ids || []).forEach(g => { genreFreq[g] = (genreFreq[g] || 0) + 1; });
  });
  const topGenre = Object.entries(genreFreq).sort((a,b) => b[1]-a[1])[0]?.[0];

  try {
    const data = await api('/discover/movie', {
      with_genres: topGenre,
      sort_by: 'popularity.desc',
      'vote_average.gte': 7,
    });
    const recs = (data.results || [])
      .filter(m => !state.favorites.some(f => f.id === m.id))
      .slice(0, 8);
    if (recs.length) renderMovies(recs, grid);
  } catch {
    const fallback = DEMO_MOVIES
      .filter(m => !state.favorites.some(f => f.id === m.id) && (m.genre_ids || []).includes(parseInt(topGenre)))
      .slice(0, 6);
    if (fallback.length) { renderMovies(fallback, grid); }
    else { sec.hidden = true; }
  }
}

/* ─── MODAL ─────────────────────────────────────────────── */
async function openModal(id) {
  state.currentMovieId = id;
  const overlay = document.getElementById('movieModal');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Reset
  ['modalTitle','modalTagline','modalOverview','modalBadges','modalMeta','modalCast','modalFacts','modalCompanies'].forEach(el => {
    document.getElementById(el).innerHTML = '';
  });
  document.getElementById('modalPoster').src = '';
  document.getElementById('modalBackdrop').style.backgroundImage = '';
  document.getElementById('similarGrid').innerHTML = '';

  try {
    const [detail, credits, videos, similar] = await Promise.all([
      api(`/movie/${id}`),
      api(`/movie/${id}/credits`),
      api(`/movie/${id}/videos`),
      api(`/movie/${id}/similar`),
    ]);
    renderModal(detail, credits, videos, similar);
  } catch {
    const demo = DEMO_MOVIES.find(m => m.id === id) || DEMO_MOVIES[0];
    renderModalBasic(demo);
  }
}

function renderModal(m, credits, videos, similar) {
  const isFav = state.favorites.some(f => f.id === m.id);
  const isWatch = state.watchlist.some(w => w.id === m.id);

  // Backdrop
  if (m.backdrop_path) {
    document.getElementById('modalBackdrop').style.backgroundImage = `url(${backdropUrl(m.backdrop_path)})`;
  }
  // Poster
  const posterEl = document.getElementById('modalPoster');
  posterEl.src = posterUrl(m.poster_path) || '';
  posterEl.alt = `${m.title} poster`;

  // Title
  document.getElementById('modalTitle').textContent = m.title;
  document.getElementById('modalTagline').textContent = m.tagline || '';

  // Badges
  document.getElementById('modalBadges').innerHTML =
    (m.genres || []).map(g => `<span class="badge badge-genre">${g.name}</span>`).join('') +
    `<span class="badge badge-lang">${(m.original_language || '').toUpperCase()}</span>`;

  // Meta
  document.getElementById('modalMeta').innerHTML = `
    <span class="modal-meta-item"><strong>${m.release_date?.slice(0,4) || '—'}</strong></span>
    <span class="modal-meta-item">${formatRuntime(m.runtime)}</span>
    <span class="modal-meta-item">${(m.production_countries?.[0]?.name) || ''}</span>`;

  // Rating
  const score = m.vote_average || 0;
  document.getElementById('modalRatingBar').innerHTML = `
    <span class="rating-stars">${starRating(score)}</span>
    <span class="rating-score">${score.toFixed(1)}</span>
    <div class="rating-track"><div class="rating-fill" style="width:0%"></div></div>`;
  setTimeout(() => {
    const fill = document.querySelector('.rating-fill');
    if (fill) fill.style.width = `${(score / 10) * 100}%`;
  }, 100);

  // Overview
  document.getElementById('modalOverview').textContent = m.overview || 'No overview available.';

  // Cast
  const cast = (credits.cast || []).slice(0, 8);
  if (cast.length) {
    document.getElementById('modalCast').innerHTML = `
      <h4>Cast</h4>
      <div class="cast-list">
        ${cast.map(p => {
          const photo = p.profile_path ? `${CONFIG.IMG_BASE}w185${p.profile_path}` : null;
          return `<div class="cast-item">
            ${photo ? `<img class="cast-photo" src="${photo}" alt="${p.name}" loading="lazy"/>` : '<div class="cast-photo" style="background:var(--surface3)"></div>'}
            <div class="cast-name">${p.name}</div>
            <div class="cast-role">${p.character || ''}</div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // Facts
  document.getElementById('modalFacts').innerHTML = `
    <h4>Quick Facts</h4>
    <div class="facts-grid">
      <div class="fact-item"><div class="fact-label">Budget</div><div class="fact-value">${formatMoney(m.budget)}</div></div>
      <div class="fact-item"><div class="fact-label">Revenue</div><div class="fact-value">${formatMoney(m.revenue)}</div></div>
      <div class="fact-item"><div class="fact-label">Popularity</div><div class="fact-value">${Math.round(m.popularity || 0)}</div></div>
      <div class="fact-item"><div class="fact-label">Votes</div><div class="fact-value">${(m.vote_count || 0).toLocaleString()}</div></div>
    </div>`;

  // Companies
  if (m.production_companies?.length) {
    document.getElementById('modalCompanies').innerHTML = `
      <h4>Production</h4>
      <div class="companies-list">
        ${m.production_companies.map(c => `<span class="company-name">${c.name}</span>`).join('')}
      </div>`;
  }

  // Favourite & watchlist buttons
  const favBtn = document.getElementById('modalFavBtn');
  const watchBtn = document.getElementById('modalWatchBtn');
  updateModalActionBtns(m, isFav, isWatch);

  favBtn.onclick = () => {
    const now = state.favorites.some(f => f.id === m.id);
    toggleFavorite(m, null);
    updateModalActionBtns(m, !now, state.watchlist.some(w => w.id === m.id));
  };
  watchBtn.onclick = () => {
    const now = state.watchlist.some(w => w.id === m.id);
    toggleWatchlist(m, null);
    updateModalActionBtns(m, state.favorites.some(f => f.id === m.id), !now);
  };

  // Trailer
  const trailerKey = videos.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')?.key;
  const trailerBtn = document.getElementById('modalTrailerBtn');
  if (trailerKey) {
    trailerBtn.hidden = false;
    trailerBtn.onclick = () => openTrailer(trailerKey);
  } else {
    trailerBtn.hidden = true;
  }

  // Similar
  const similarMovies = (similar.results || []).slice(0, 6);
  if (similarMovies.length) {
    renderMovies(similarMovies, document.getElementById('similarGrid'));
  } else {
    document.getElementById('modalSimilar').hidden = true;
  }
  document.getElementById('modalSimilar').hidden = !similarMovies.length;
}

function renderModalBasic(m) {
  document.getElementById('modalTitle').textContent = m.title;
  document.getElementById('modalOverview').textContent = m.overview || '';
  document.getElementById('modalMeta').innerHTML = `<span class="modal-meta-item"><strong>${m.release_date?.slice(0,4) || '—'}</strong></span>`;
  const score = m.vote_average || 0;
  document.getElementById('modalRatingBar').innerHTML = `<span class="rating-score">★ ${score.toFixed(1)}</span>`;
  document.getElementById('modalBadges').innerHTML = (m.genre_ids || []).map(g => `<span class="badge badge-genre">${genreName(g)}</span>`).join('');
  document.getElementById('modalFavBtn').onclick = () => toggleFavorite(m, null);
  document.getElementById('modalWatchBtn').onclick = () => toggleWatchlist(m, null);
  document.getElementById('modalTrailerBtn').hidden = true;
  document.getElementById('modalSimilar').hidden = true;
  updateModalActionBtns(m, state.favorites.some(f=>f.id===m.id), state.watchlist.some(w=>w.id===m.id));
}

function updateModalActionBtns(m, isFav, isWatch) {
  const favBtn = document.getElementById('modalFavBtn');
  const watchBtn = document.getElementById('modalWatchBtn');
  favBtn.classList.toggle('active', isFav);
  favBtn.innerHTML = `<span class="action-icon">${isFav ? '♥' : '♡'}</span> ${isFav ? 'Favourited' : 'Favourite'}`;
  watchBtn.innerHTML = `<span class="action-icon">${isWatch ? '✓' : '+'}</span> ${isWatch ? 'In Watchlist' : 'Watchlist'}`;
}

function closeModal() {
  const overlay = document.getElementById('movieModal');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.currentMovieId = null;
}
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('movieModal').addEventListener('click', e => {
  if (e.target === document.getElementById('movieModal')) closeModal();
});

/* ─── TRAILER ────────────────────────────────────────────── */
function openTrailer(key) {
  const overlay = document.getElementById('trailerModal');
  document.getElementById('trailerEmbed').innerHTML = `
    <iframe src="https://www.youtube.com/embed/${key}?autoplay=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}
function closeTrailer() {
  const overlay = document.getElementById('trailerModal');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.getElementById('trailerEmbed').innerHTML = '';
}
document.getElementById('trailerClose').addEventListener('click', closeTrailer);
document.getElementById('trailerModal').addEventListener('click', e => {
  if (e.target === document.getElementById('trailerModal')) closeTrailer();
});

/* ─── TOAST ─────────────────────────────────────────────── */
function toast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  container.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

/* ─── THEME ─────────────────────────────────────────────── */
function initTheme() {
  const saved = loadLS(LS.THEME, 'dark');
  applyTheme(saved);
}
function applyTheme(t) {
  document.body.setAttribute('data-theme', t);
  document.querySelector('.theme-icon').textContent = t === 'dark' ? '☀' : '☽';
  saveLS(LS.THEME, t);
}
document.getElementById('themeToggle').addEventListener('click', () => {
  const cur = document.body.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

/* ─── NAV ────────────────────────────────────────────────── */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
  document.getElementById('scrollTopBtn').hidden = window.scrollY < 400;
});

document.getElementById('scrollTopBtn').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelectorAll('.nav-link[data-section]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const sec = link.dataset.section;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    const favSec = document.getElementById('favoritesSection');
    const watchSec = document.getElementById('watchlistSection');
    favSec.hidden = sec !== 'favorites';
    watchSec.hidden = sec !== 'favorites';

    if (sec === 'favorites') {
      renderFavorites();
      renderWatchlist();
      favSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (sec === 'trending') {
      document.getElementById('trendingSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (sec === 'toprated') {
      document.getElementById('topratedSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (sec === 'genres') {
      document.getElementById('filtersSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    closeMobileMenu();
  });
});

document.querySelectorAll('.see-all').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const type = a.dataset.load;
    const map = {trending:'trendingGrid',popular:'popularGrid',top_rated:'topratedGrid',upcoming:'upcomingGrid',now_playing:'nowplayingGrid'};
    if (map[type]) loadMoreSection(type, map[type]);
  });
});

async function loadMoreSection(type, gridId) {
  const grid = document.getElementById(gridId);
  try {
    let data;
    if (type === 'trending') data = await api('/trending/movie/week', { page: 2 });
    else data = await api(`/movie/${type}`, { page: 2 });
    const more = data.results || [];
    more.forEach(m => {
      const card = createMovieCard(m);
      grid.appendChild(card);
    });
  } catch { toast('Could not load more movies', 'error'); }
}

/* ─── MOBILE MENU ───────────────────────────────────────── */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', open);
  mobileMenu.setAttribute('aria-hidden', !open);
});
function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', false);
}

/* ─── SEARCH BUTTON ─────────────────────────────────────── */
document.getElementById('navSearchBtn').addEventListener('click', () => {
  document.getElementById('searchInput').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ─── CLEAR RECENT ──────────────────────────────────────── */
document.getElementById('clearRecent')?.addEventListener('click', () => {
  state.recent = [];
  saveLS(LS.RECENT, []);
  document.getElementById('recentSection').hidden = true;
});

/* ─── CLEAR SEARCH ──────────────────────────────────────── */
document.getElementById('clearSearch')?.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.hidden = true;
  clearSearchResults();
});

/* ─── KEYBOARD SHORTCUTS ────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === '/' && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    searchInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (e.key === 'Escape') {
    if (document.getElementById('trailerModal').classList.contains('open')) closeTrailer();
    else if (document.getElementById('movieModal').classList.contains('open')) closeModal();
    else hideSuggestions();
  }
});

/* ─── CLICK OUTSIDE SUGGESTIONS ────────────────────────── */
document.addEventListener('click', e => {
  if (!e.target.closest('.search-box')) hideSuggestions();
});

/* ─── SCROLL REVEAL ─────────────────────────────────────── */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

function observeReveal() {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
}
const revealMO = new MutationObserver(observeReveal);
revealMO.observe(document.getElementById('mainContent'), { childList: true, subtree: true });

/* ─── API NOTICE ─────────────────────────────────────────── */
function checkApiKey() {
  if (!CONFIG.API_KEY || CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
    document.getElementById('apiNotice').hidden = false;
  }
}
document.getElementById('dismissNotice')?.addEventListener('click', () => {
  document.getElementById('apiNotice').hidden = true;
});

/* ─── BOOT ───────────────────────────────────────────────── */
async function init() {
  initTheme();
  populateYears();
  spawnParticles();
  checkApiKey();
  renderRecent();

  await Promise.all([
    setupHero(),
    loadAllSections(),
  ]);

  updateStats();
}

init();
