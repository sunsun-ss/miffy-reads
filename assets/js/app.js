import {
  icon,
  bunnyHead,
  bunnyReading,
  bunnyThumbs,
  bunnyShelf,
  flowerSvg,
  coverArt,
  rosePlant,
} from './art.js';
import { loadArticles, buildIssue, categoryOrder } from './data.js';
import * as store from './store.js';
import {
  loadWords,
  analyzeArticle,
  countCet6,
  getEntry,
  findBase,
  splitMeaning,
  readingMinutes,
} from './words.js';
import { fetchDetails, speak, englishSummary, translateParagraph } from './dict.js';

const root = document.getElementById('app');
const overlayRoot = document.getElementById('overlay-root');
const toastRoot = document.getElementById('toast-root');
const ACCENTS = new Set(['pink', 'yellow', 'green', 'blue', 'lilac', 'orange']);
const NAV_ITEMS = [
  { key: 'feed', href: '#/', label: '今日', icon: 'feed' },
  { key: 'shelf', href: '#/shelf', label: '书架', icon: 'shelf' },
  { key: 'words', href: '#/words', label: '生词本', icon: 'words' },
  { key: 'checkin', href: '#/checkin', label: '打卡', icon: 'checkin' },
];
const MILESTONES = [3, 7, 14, 30, 60, 100];

const app = {
  articles: [],
  byId: new Map(),
  issue: null,
  currentArticle: null,
  route: { name: 'feed', id: null },
  ui: {
    filter: '全部',
    search: '',
    shelfTab: 'saved',
    wordTab: 'words',
    wordGroup: 'date',
    wordQuery: '',
    quoteQuery: '',
    exportMonthKey: '',
  },
  cleanup: [],
  pendingQuote: null,
  previousRoute: null,
  hubRoute: null,
  hasRendered: false,
  isTouch: false,
  suppressClick: false,
  lookup: null,
  lookupToken: 0,
  refreshReaderProgress: null,
};

init();

function init() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  app.isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  document.documentElement.style.setProperty('--reader-size', `${store.state.fontSize}px`);
  bindGlobalEvents();
  boot();
}

async function boot() {
  try {
    const [data] = await Promise.all([loadArticles(), loadWords()]);
    app.articles = data.articles;
    app.byId = data.byId;
    app.issue = buildIssue(app.articles);
    window.addEventListener('hashchange', onRouteChange);
    onRouteChange();
  } catch (error) {
    console.error(error);
    renderFatal(error);
  }
}

/* ---------------------------------------------------------- helpers */

function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  const url = String(value || '').trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

function accent(article) {
  return ACCENTS.has(article?.accent) ? article.accent : 'yellow';
}

function sourceShort(article) {
  if (!article.external) return '编辑部原创';
  const license = article.source.licenseLabel || article.source.license;
  return license ? `${article.source.name} · ${license}` : article.source.name;
}

function sourceFull(article) {
  const link = safeUrl(article.source.url);
  const name = link
    ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(article.source.name)} ${icon('linkOut', 13)}</a>`
    : esc(article.source.name);
  const license = article.source.licenseLabel || article.source.license;
  return `${name}${license ? `（${esc(license)}）` : ''}`;
}

function dateCn(date = new Date()) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 · 星期${weekdays[date.getDay()]}`;
}

function resolveArticle(id) {
  if (!id) return null;
  return app.byId.get(id) || store.getSnapshot(id);
}

function resolveIds(ids) {
  const seen = new Set();
  const list = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const article = resolveArticle(id);
    if (article) {
      seen.add(id);
      list.push(article);
    }
  }
  return list;
}

function countForDay(key) {
  const day = store.state.days[key];
  if (!day) return 0;
  return Number(day.count) || (Array.isArray(day.ids) ? day.ids.length : 0);
}

function heatLevel(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function buildWeeks(count) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonday = mondayOf(today);
  const start = new Date(thisMonday);
  start.setDate(start.getDate() - (count - 1) * 7);
  const weeks = [];
  let lastLabel = '';
  for (let w = 0; w < count; w += 1) {
    const days = [];
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      days.push(date);
    }
    let label = '';
    const firstOfMonth = days.find((d) => d.getDate() === 1);
    if (firstOfMonth) label = `${firstOfMonth.getMonth() + 1}月`;
    else if (w === 0) label = `${days[0].getMonth() + 1}月`;
    if (label === lastLabel) label = '';
    if (label) lastLabel = label;
    weeks.push({ days, label });
  }
  return weeks;
}

function clearToast() {
  clearTimeout(toast._timer);
  toastRoot.innerHTML = '';
}

function toast(message, iconName = 'check') {
  toastRoot.innerHTML = `<div class="toast" role="status">${icon(iconName, 18)}<span>${esc(message)}</span></div>`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toastRoot.innerHTML = '';
  }, 2400);
}

/* ---------------------------------------------------------- shell */

function renderHeader(active) {
  const stats = store.getStats();
  const checked = store.isCheckedToday();
  return `<header class="site-header">
    <div class="header-inner">
      <a class="brand" href="#/" aria-label="米菲读读首页">
        <span class="brand-mark">${bunnyHead('brand-bunny')}</span>
        <span class="brand-text">
          <span class="brand-name">Miffy Reads</span>
          <span class="brand-sub">米菲读读 · READING ROOM</span>
        </span>
      </a>
      <nav class="site-nav" aria-label="主导航">
        ${NAV_ITEMS.map((item) => `<a href="${item.href}" class="${active === item.key ? 'is-active' : ''}">${icon(item.icon, 17)}<span>${item.label}</span></a>`).join('')}
      </nav>
      <a class="streak-chip ${checked ? 'is-lit' : ''}" href="#/checkin" aria-label="前往打卡花园">
        ${icon('flame', 17)}
        <span>${stats.streak > 0 ? `连续 ${stats.streak} 天` : '还没打卡'}</span>
      </a>
    </div>
  </header>`;
}

function renderTabbar(active) {
  return `<nav class="tabbar" aria-label="底部导航">
    ${NAV_ITEMS.map((item) => `<a href="${item.href}" class="${active === item.key ? 'is-active' : ''}">${icon(item.icon, 21)}<span>${item.label}</span></a>`).join('')}
  </nav>`;
}

function renderFooter() {
  return `<footer class="site-footer">
    <div class="footer-bunny">${bunnyHead()}</div>
    <p class="footer-title">米菲读读 · Miffy Reads</p>
    <p class="footer-line">用一杯奶茶的时间，读完一个世界。</p>
    <p class="footer-small">编辑部原创内容 + NASA（公有领域）等公开授权来源 · 插画为原创米菲风格致敬作品，与 Mercis bv 无关</p>
    <p class="footer-small">© ${new Date().getFullYear()} Miffy Reads · 一份个人阅读练习</p>
  </footer>`;
}

function renderPageHead(title, description, action = '') {
  return `<div class="page-head">
    <div class="page-head-copy">
      <p class="eyebrow">MIFFY READS</p>
      <h1>${title}<span class="title-flower">${flowerSvg('#F08A2E')}</span></h1>
      <p class="page-desc">${description}</p>
    </div>
    ${action ? `<div class="page-head-action">${action}</div>` : ''}
  </div>`;
}

function emptyState({ art = 'shelf', title, text, action = '' }) {
  const artwork = art === 'bunny' ? bunnyHead() : art === 'reading' ? bunnyReading() : bunnyShelf();
  return `<div class="empty-state">
    <div class="empty-art ${art === 'bunny' ? 'is-head' : ''}">${artwork}</div>
    <h3>${title}</h3>
    <p>${text}</p>
    ${action ? `<div class="empty-action">${action}</div>` : ''}
  </div>`;
}

/* ---------------------------------------------------------- routing */

function routeHash(route) {
  if (!route || route.name === 'feed') return '#/';
  return `#/${route.name}${route.id ? `/${encodeURIComponent(route.id)}` : ''}`;
}

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  if (!raw) return { name: 'feed', id: null };
  const parts = raw.split('/');
  const name = parts[0];
  const id = parts.length > 1 ? decodeURIComponent(parts.slice(1).join('/')) : null;
  if (['read', 'shelf', 'words', 'checkin'].includes(name)) return { name, id };
  return { name: 'feed', id: null };
}

function onRouteChange() {
  cleanupPage();
  closeWordPop();
  hideSelection();
  closeOverlay();
  closeTagEditor();
  clearToast();
  if (app.hasRendered) {
    if (app.route.name !== 'read') app.hubRoute = { ...app.route };
    app.previousRoute = { ...app.route };
  }
  app.route = parseRoute();
  app.hasRendered = true;
  app.currentArticle = null;
  document.body.dataset.route = app.route.name;
  document.body.classList.toggle('is-reader', app.route.name === 'read');
  window.scrollTo(0, 0);
  renderRouteContent();
  updateDocumentTitle();
}

function renderRouteContent({ keepScroll = false } = {}) {
  const y = window.scrollY;
  cleanupPage();
  if (app.route.name === 'read') renderReader(app.route.id);
  else if (app.route.name === 'shelf') renderShelfPage();
  else if (app.route.name === 'words') renderWordsPage();
  else if (app.route.name === 'checkin') renderCheckinPage();
  else renderFeedPage();
  if (keepScroll) window.scrollTo(0, y);
}

function updateDocumentTitle() {
  let title = '米菲读读 · 每天一点点六级阅读';
  if (app.route.name === 'read') {
    const article = resolveArticle(app.route.id);
    title = article ? `${article.title} · 米菲读读` : '文章迷路了 · 米菲读读';
  } else if (app.route.name === 'shelf') title = '我的书架 · 米菲读读';
  else if (app.route.name === 'words') title = '生词本 · 米菲读读';
  else if (app.route.name === 'checkin') title = '打卡花园 · 米菲读读';
  document.title = title;
}

function cleanupPage() {
  for (const fn of app.cleanup.splice(0)) {
    try { fn(); } catch { /* cleanup should never break navigation */ }
  }
  app.refreshReaderProgress = null;
}

function onCleanup(fn) {
  app.cleanup.push(fn);
}

/* ---------------------------------------------------------- feed */

function renderFeedPage() {
  const hero = app.issue.hero;
  root.innerHTML = `${renderHeader('feed')}
    <main class="page feed-page">
      <div class="feed-topline">
        <span class="today-label">${dateCn()}</span>
        <span class="today-note">${flowerSvg('#F08A2E', 'tip-flower')} 今天也读一点点。</span>
      </div>
      ${hero ? renderHero(hero) : ''}
      ${renderFeedTools()}
      <div class="feed-layout">
        <section class="feed-main" aria-label="文章推送">
          <div id="feed-stream">${renderFeedStream()}</div>
        </section>
        ${renderSidebar()}
      </div>
    </main>
    ${renderFooter()}
    ${renderTabbar('feed')}`;
  updateHeroVisibility();
}

function renderHero(article) {
  const saved = store.isBookmarked(article.id);
  return `<section class="hero" id="hero">
    <div class="hero-copy">
      <div class="hero-eyebrow">
        <span class="hero-pill">${flowerSvg('#FFFDF8')} 本期头条</span>
        <span class="hero-category">${esc(article.category)}</span>
      </div>
      <h1 lang="en"><a href="#/read/${encodeURIComponent(article.id)}">${esc(article.title)}</a></h1>
      <p class="hero-dek" lang="en">${esc(article.dek || '')}</p>
      <div class="hero-meta">
        <span>${icon('clock', 15)} ${readingMinutes(article)} 分钟</span>
        <span>${icon('words', 15)} ${countCet6(article)} 个六级词</span>
        <span>${icon('bookOpen', 15)} ${sourceShort(article)}</span>
      </div>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#/read/${encodeURIComponent(article.id)}">开始阅读 ${icon('arrowRight', 17)}</a>
        <button class="btn btn-ghost btn-bookmark ${saved ? 'is-saved' : ''}" data-act="bookmark" data-id="${esc(article.id)}" data-label-saved="已收藏" data-label-unsaved="收藏这篇文章" aria-pressed="${saved}">
          ${icon('bookmark', 17)}<span class="bookmark-label">${saved ? '已收藏' : '收藏这篇文章'}</span>
        </button>
      </div>
    </div>
    <a class="hero-art" href="#/read/${encodeURIComponent(article.id)}" aria-label="阅读本期头条：${esc(article.title)}">
      <span class="hero-arch"></span>
      ${bunnyReading('hero-bunny')}
      <span class="hero-stamp"><span>今日刊</span><strong>${app.issue.issue.length}</strong> 篇</span>
      <span class="hero-flower hero-flower-a">${flowerSvg('#F4C9C5')}</span>
      <span class="hero-flower hero-flower-b">${flowerSvg('#C9DFB0')}</span>
    </a>
  </section>`;
}

function renderFeedTools() {
  const categories = categoryOrder(app.articles);
  const counts = new Map();
  for (const article of app.articles) counts.set(article.category, (counts.get(article.category) || 0) + 1);
  return `<div class="feed-toolbar">
    <div class="chips" role="group" aria-label="按主题筛选">
      <button class="chip ${app.ui.filter === '全部' ? 'is-active' : ''}" data-act="filter" data-filter="全部" aria-pressed="${app.ui.filter === '全部'}">全部 <span>${app.articles.length}</span></button>
      ${categories.map((category) => `<button class="chip ${app.ui.filter === category ? 'is-active' : ''}" data-act="filter" data-filter="${esc(category)}" aria-pressed="${app.ui.filter === category}">${esc(category)} <span>${counts.get(category) || 0}</span></button>`).join('')}
    </div>
    <label class="search-field feed-search">
      ${icon('search', 18)}
      <input id="feed-search" type="search" placeholder="搜标题、主题或单词…" value="${esc(app.ui.search)}" autocomplete="off" aria-label="搜索文章">
    </label>
  </div>`;
}

function isFiltering() {
  return app.ui.filter !== '全部' || app.ui.search.trim().length > 0;
}

function filterArticles() {
  const category = app.ui.filter;
  const query = app.ui.search.trim().toLowerCase();
  return app.articles.filter((article) => {
    if (category !== '全部' && article.category !== category) return false;
    if (!query) return true;
    const haystack = `${article.title} ${article.dek} ${article.category} ${(article.tags || []).join(' ')} ${article.source.name} ${article.paragraphs.join(' ')}`.toLowerCase();
    return haystack.includes(query);
  });
}

function renderFeedStream() {
  if (isFiltering()) {
    const results = filterArticles();
    const subtitle = [
      app.ui.filter !== '全部' ? `主题 · ${app.ui.filter}` : '',
      app.ui.search.trim() ? `搜索 · “${app.ui.search.trim()}”` : '',
    ].filter(Boolean).join(' · ');
    return `<div class="stream-head">
      <div><p class="eyebrow">FILTERED STACK</p><h2>筛选结果 <span class="stream-count">${results.length} 篇</span></h2></div>
      <span class="stream-hint">${esc(subtitle)}</span>
    </div>
    ${results.length
      ? `<div class="article-list">${results.map((article, i) => renderCard(article, i + 1)).join('')}</div>`
      : emptyState({
        title: '这一格还没有文章',
        text: '换一个主题或者搜索词试试，米菲再去书架后面找找。',
        action: '<button class="btn btn-primary btn-small" data-act="reset-filter">看看全部文章</button>',
      })}
    <div class="feed-finish"><span>${flowerSvg('#F08A2E')}</span><p>筛选不会打乱你的阅读记录。</p></div>`;
  }

  const issue = app.issue;
  const extra = issue.extra;
  return `<div class="stream-head">
    <div><p class="eyebrow">YOUR DAILY STACK</p><h2>${issue.label} <span class="stream-count">${issue.issue.length} 篇</span></h2></div>
    <span class="stream-hint">头条已置顶 · ${issue.freshCount > 0 ? `${issue.label === '今日刊' ? '今日' : '最近'}抓取 ${issue.freshCount} 篇` : '编辑部精选'}</span>
  </div>
  <div class="article-list">
    ${issue.stream.map((article, i) => renderCard(article, i + 1)).join('')}
  </div>
  ${extra.length ? `<div class="section-divider"><span>更多文章 · ${extra.length}</span><i>${flowerSvg('#F4C9C5')}</i></div>
  <div class="article-list">${extra.map((article, i) => renderCard(article, issue.stream.length + i + 1, { compact: true })).join('')}</div>` : ''}
  <div class="feed-finish"><span>${flowerSvg('#F08A2E')}</span><p>今天这一叠就到这里，读完记得去花园里打卡。</p><a href="#/checkin">打开打卡花园 ${icon('arrowRight', 15)}</a></div>`;
}

function renderCard(article, number, { compact = false } = {}) {
  const saved = store.isBookmarked(article.id);
  const read = store.getRead(article.id);
  const finished = Boolean(read?.finishedAt);
  const progress = Math.min(100, Math.max(0, Number(read?.progress) || 0));
  const isNew = article.external && article.date === app.issue.issueDate;
  const minutes = readingMinutes(article);
  return `<article class="article-card ${compact ? 'is-compact' : ''} ${finished ? 'is-finished' : ''}">
    <a class="card-link" href="#/read/${encodeURIComponent(article.id)}">
      <div class="card-thumb">
        ${coverArt(article)}
        <span class="thumb-index">${String(number).padStart(2, '0')}</span>
        <span class="thumb-cat accent-${accent(article)}">${esc(article.category)}</span>
        ${isNew ? '<span class="thumb-new">今日</span>' : ''}
        ${finished ? `<span class="read-stamp">${icon('check', 12)} 读完</span>` : ''}
      </div>
      <div class="card-copy">
        <p class="card-kicker">${esc(article.external ? article.source.name : '编辑部原创')} <span>·</span> ${store.prettyDate(article.date)}</p>
        <h3 lang="en">${esc(article.title)}</h3>
        <p class="card-dek" lang="en">${esc(article.dek || '')}</p>
        <div class="card-meta">
          <span>${icon('clock', 14)} ${minutes} 分钟</span>
          <span>${icon('words', 14)} 六级词 ${countCet6(article)}</span>
          ${saved ? '<span class="saved-note">已在书架</span>' : ''}
        </div>
        ${progress > 0 && !finished ? `<div class="card-progress" aria-label="阅读进度 ${progress}%"><span style="width:${progress}%"></span></div>` : ''}
      </div>
    </a>
    <button class="card-save ${saved ? 'is-saved' : ''}" data-act="bookmark" data-id="${esc(article.id)}" aria-pressed="${saved}" aria-label="${saved ? '取消收藏' : '收藏文章'}">${icon('bookmark', 18)}</button>
  </article>`;
}

function updateHeroVisibility() {
  const hero = document.getElementById('hero');
  if (hero) hero.hidden = isFiltering();
}

function updateFeedFilterUI() {
  document.querySelectorAll('.chip[data-filter]').forEach((chip) => {
    const active = chip.dataset.filter === app.ui.filter;
    chip.classList.toggle('is-active', active);
    chip.setAttribute('aria-pressed', String(active));
  });
  updateHeroVisibility();
  const stream = document.getElementById('feed-stream');
  if (stream) stream.innerHTML = renderFeedStream();
}

function renderSidebar() {
  const stats = store.getStats();
  const checked = store.isCheckedToday();
  const todayRead = store.todayCount();
  const words = store.state.words.slice(0, 4);
  const weeks = buildWeeks(8);
  const saved = store.state.bookmarks.length;
  const finished = store.getFinishedIds().length;

  return `<aside class="sidebar" id="sidebar">
    <section class="side-card card-sun">
      <span class="side-flower">${flowerSvg('#F4C9C5')}</span>
      <div class="side-head"><h3>${icon('flame', 18)} 打卡花园</h3><a href="#/checkin">看看</a></div>
      <div class="streak-mini">
        <div>
          <p class="streak-num">${stats.streak}<span>天</span></p>
          <p class="side-copy">${checked ? `今天已点亮 · ${todayRead} 篇` : '读一篇，就点亮今天'}</p>
        </div>
        <div class="mini-bunny">${bunnyThumbs()}</div>
      </div>
      <div class="mini-heat" aria-label="最近八周打卡记录">
        ${weeks.map((week) => week.days.map((date) => renderMiniCell(date)).join('')).join('')}
      </div>
      <a class="side-link" href="#/checkin">${checked ? '去花园走走' : '看看我的热力图'} ${icon('arrowRight', 15)}</a>
    </section>

    <section class="side-card card-sky">
      <div class="side-head"><h3>${icon('words', 18)} 生词口袋</h3><span class="side-badge">${store.state.words.length}</span></div>
      ${words.length
        ? `<div class="word-pills">${words.map((word) => `<a href="#/words" class="word-pill">${esc(word.word)}</a>`).join('')}</div>`
        : `<p class="side-copy">点开文章里的虚线词，它就会住进这里。</p>`}
      <a class="side-link" href="#/words">翻开生词本 ${icon('arrowRight', 15)}</a>
    </section>

    <section class="side-card card-blush">
      <div class="side-head"><h3>${icon('shelf', 18)} 我的书架</h3><a href="#/shelf">打开</a></div>
      <div class="shelf-mini">
        <div class="book-spines" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <p class="side-copy"><strong>${saved}</strong> 篇收藏<br><strong>${finished}</strong> 篇读完</p>
      </div>
      <a class="side-link" href="#/shelf">去看看书架 ${icon('arrowRight', 15)}</a>
    </section>
  </aside>`;
}

function refreshSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && app.route.name === 'feed') {
    sidebar.outerHTML = renderSidebar();
  }
}

function renderMiniCell(date) {
  const key = store.dateKey(date);
  const today = store.dateKey();
  const future = key > today;
  const count = countForDay(key);
  const level = future ? 'is-future' : `lv${heatLevel(count)}`;
  return `<span class="mini-cell ${level} ${key === today ? 'is-today' : ''}" title="${date.getMonth() + 1}月${date.getDate()}日 · ${count ? `读完 ${count} 篇` : '无记录'}"></span>`;
}

/* ---------------------------------------------------------- reader */

function renderReader(id) {
  const article = resolveArticle(id);
  if (!article) {
    root.innerHTML = `${renderHeader('')}<main class="page"><div class="not-found">
      ${bunnyShelf()}
      <h1>这篇文章迷路了</h1>
      <p>它可能被收回书架，或者链接抄错了一个字母。</p>
      <a class="btn btn-primary" href="#/">回到今日刊 ${icon('arrowRight', 17)}</a>
    </div></main>${renderFooter()}${renderTabbar('')}`;
    return;
  }

  app.currentArticle = article;
  store.saveSnapshot(article);
  store.startReading(article.id);
  onCleanup(() => store.endReading());
  const analyzed = analyzeArticle(article, store.savedWordKeys());
  const saved = store.isBookmarked(article.id);
  const read = store.getRead(article.id);
  const minutes = readingMinutes(article);
  const paragraphs = analyzed.html.map((html, i) => `<div class="para-block" data-para-index="${i}">
        <p class="${i === 0 ? 'lead' : ''}">${html}</p>
        <button class="para-tr" type="button" data-act="translate-para" title="翻译这一段" aria-label="翻译第 ${i + 1} 段" aria-expanded="false" lang="zh-CN">译</button>
        <div class="para-translation" aria-live="polite" hidden></div>
      </div>`).join('');
  const next = findNextArticle(article);
  const source = sourceFull(article);

  root.innerHTML = `<div class="reader-shell">
    <div class="reader-progress"><span id="reader-progress"></span></div>
    <header class="reader-top">
      <div class="reader-bar">
        <button class="icon-btn reader-back" data-act="back" aria-label="返回">${icon('arrowLeft', 21)}</button>
        <div class="reader-bar-title"><span>${esc(article.category)}</span><i></i><span>${minutes} 分钟</span></div>
        <span class="reader-pct" id="reader-pct">0%</span>
        <div class="font-group" role="group" aria-label="调整字号">
          <button class="font-btn" data-act="font" data-step="-1" aria-label="缩小字号">A−</button>
          <button class="font-btn font-reset" data-act="font-reset" aria-label="恢复默认字号" title="恢复默认字号">A</button>
          <button class="font-btn" data-act="font" data-step="1" aria-label="放大字号">A+</button>
        </div>
        <button class="icon-btn reader-save ${saved ? 'is-saved' : ''}" data-act="bookmark" data-id="${esc(article.id)}" aria-label="${saved ? '取消收藏' : '收藏文章'}" aria-pressed="${saved}">${icon('bookmark', 19)}</button>
      </div>
    </header>

    <main class="reader">
      <header class="article-head accent-${accent(article)}">
        <div class="article-kicker">
          <span class="category-chip">${esc(article.category)}</span>
          <span>${esc(article.external ? article.source.name : '编辑部原创')}</span>
          <span class="dot">·</span>
          <span>${store.prettyDate(article.date)}</span>
        </div>
        <h1 lang="en">${esc(article.title)}</h1>
        <p class="article-dek" lang="en">${esc(article.dek || '')}</p>
        <div class="article-meta">
          <span>${icon('clock', 15)} ${minutes} 分钟</span>
          <span>${icon('words', 15)} ${analyzed.count} 个六级词</span>
          ${safeUrl(article.source.url) ? `<a href="${esc(safeUrl(article.source.url))}" target="_blank" rel="noopener noreferrer">${icon('linkOut', 14)} 读原文</a>` : ''}
        </div>
        <div class="vocab-legend">
          <span class="legend-word">deliberate</span>
          <span>虚线是六级词；点任意单词都能查</span>
        </div>
      </header>

      <article class="prose" id="prose" lang="en">${paragraphs}</article>

      <section class="read-end">
        <div class="read-end-art">${bunnyThumbs()}</div>
        <div class="read-end-copy">
          <p class="eyebrow">THE END</p>
          <h2>这篇读完啦。</h2>
          <p>每一次读完，都会在打卡花园里留下一格小小的颜色。</p>
          <div class="read-actions">
            <button class="btn btn-primary" data-act="checkin" data-id="${esc(article.id)}">${icon('check', 18)} 读完打卡</button>
            <button class="btn btn-ghost ${saved ? 'is-saved' : ''}" data-act="bookmark" data-id="${esc(article.id)}" data-label-saved="已收藏" data-label-unsaved="收藏这篇" aria-pressed="${saved}">
              ${icon('bookmark', 17)}<span class="bookmark-label">${saved ? '已收藏' : '收藏这篇'}</span>
            </button>
          </div>
          <div class="read-source">
            <span>来源：${source}</span>
            ${article.external ? '<span class="source-license">按原许可署名展示 · 点词标注与排版为本站附加</span>' : '<span class="source-license">本文为编辑部原创内容</span>'}
          </div>
        </div>
      </section>

      ${next ? `<a class="next-read" href="#/read/${encodeURIComponent(next.id)}">
        <div>
          <p class="eyebrow">NEXT READ</p>
          <h3>${esc(next.title)}</h3>
          <span>${esc(next.category)} · ${readingMinutes(next)} 分钟</span>
        </div>
        <span class="next-arrow">${icon('arrowRight', 22)}</span>
      </a>` : ''}

      <div class="reader-foot">
        <a href="#/">${icon('arrowLeft', 15)} 回到今日刊</a>
        <span>${flowerSvg('#F4C9C5')} 慢慢读，比较快。</span>
      </div>
    </main>

    <button class="float-finish" id="float-finish" data-act="checkin" data-id="${esc(article.id)}">${icon('check', 18)} 读完打卡</button>
  </div>`;

  bindReader(article, read);
}

function findNextArticle(article) {
  const issue = app.issue?.issue || [];
  const issueIndex = issue.findIndex((a) => a.id === article.id);
  if (issueIndex >= 0 && issue[issueIndex + 1]) return issue[issueIndex + 1];
  const index = app.articles.findIndex((a) => a.id === article.id);
  if (index >= 0) {
    for (let i = index + 1; i < app.articles.length; i += 1) {
      if (app.articles[i].id !== article.id) return app.articles[i];
    }
    if (app.articles[0] && app.articles[0].id !== article.id) return app.articles[0];
  }
  return null;
}

function bindReader(article, readState) {
  const bar = document.getElementById('reader-progress');
  const pct = document.getElementById('reader-pct');
  const floater = document.getElementById('float-finish');
  const prose = document.getElementById('prose');
  let lastSave = 0;
  let ticking = false;

  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / max) * 100))) : 0;
    if (bar) bar.style.width = `${progress}%`;
    if (pct) pct.textContent = `${progress}%`;
    if (floater) floater.classList.toggle('is-visible', progress >= 85);
    const now = Date.now();
    if (now - lastSave > 800) {
      store.setProgress(article.id, progress);
      lastSave = now;
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  app.refreshReaderProgress = update;
  window.addEventListener('scroll', onScroll, { passive: true });
  const restore = readState?.progress && !readState.finishedAt && readState.progress > 4 && readState.progress < 97;
  requestAnimationFrame(() => {
    if (restore) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, (readState.progress / 100) * max);
      toast('回到上次读到的地方', 'bookmark');
    }
    update();
  });

  const onSelect = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!prose.contains(range.commonAncestorContainer)) return;
    const text = selection.toString().replace(/\s+/g, ' ').trim();
    if (text.length < 6) return;
    if (app.isTouch) {
      app.suppressClick = true;
      clearTimeout(app._suppressClickTimer);
      app._suppressClickTimer = setTimeout(() => { app.suppressClick = false; }, 350);
    }
    setTimeout(() => showSelectionBubble(article, prose, text), 10);
  };
  prose.addEventListener('mouseup', onSelect);
  prose.addEventListener('touchend', onSelect);
  document.addEventListener('selectionchange', onSelect);

  onCleanup(() => {
    window.removeEventListener('scroll', onScroll);
    prose.removeEventListener('mouseup', onSelect);
    prose.removeEventListener('touchend', onSelect);
    document.removeEventListener('selectionchange', onSelect);
    app.suppressClick = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / max) * 100))) : 0;
    store.setProgress(article.id, progress);
  });
}

function showSelectionBubble(article, prose, cachedText = '') {
  const selection = window.getSelection();
  const text = cachedText || (selection && !selection.isCollapsed ? selection.toString().replace(/\s+/g, ' ').trim() : '');
  if (text.length < 6) {
    hideSelection();
    return;
  }
  const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
  if (range && !prose.contains(range.commonAncestorContainer)) {
    hideSelection();
    return;
  }
  const rect = range ? range.getBoundingClientRect() : null;
  if (document.querySelector('.word-pop')) closeWordPop();
  app.pendingQuote = { text, articleId: article.id, articleTitle: article.title };

  let bubble = document.getElementById('sel-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'sel-bubble';
    bubble.className = 'sel-bubble';
    bubble.innerHTML = `<button data-act="save-quote">${icon('star', 16)} 收藏这句</button>`;
    document.body.appendChild(bubble);
  }
  bubble.hidden = false;
  if (window.innerWidth <= 680 || !rect) {
    bubble.style.left = '50%';
    bubble.style.top = 'auto';
    bubble.style.bottom = '88px';
    bubble.style.transform = 'translateX(-50%)';
  } else {
    bubble.style.bottom = 'auto';
    bubble.style.transform = 'none';
    const width = bubble.offsetWidth || 132;
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
    let top = rect.top - 48;
    if (top < 10) top = rect.bottom + 12;
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
  }
}

function hideSelection() {
  const bubble = document.getElementById('sel-bubble');
  if (bubble) bubble.hidden = true;
  app.pendingQuote = null;
}

function savePendingQuote() {
  if (!app.pendingQuote) return;
  const saved = store.addQuote(app.pendingQuote);
  hideSelection();
  if (window.getSelection) window.getSelection().removeAllRanges();
  toast(saved ? '句子收进金句本啦' : '这句话已经收藏过啦', 'star');
}

/* ---------------------------------------------------------- word popover */

function openWordPop(button) {
  const word = button.dataset.word || button.dataset.base;
  const base = button.dataset.base || lookupBase(word);
  if (!word || !base) return;
  openWordPopFor(word, base, button.getBoundingClientRect());
}

function lookupBase(word) {
  return findBase(word) || String(word || '').toLowerCase().replace(/[^a-z'’-]/g, '');
}

function wordAtPoint(x, y) {
  const prose = document.getElementById('prose');
  if (!prose) return null;
  let range = null;
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (position) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
    }
  }
  if (!range) return null;
  const node = range.startContainer;
  if (!node || node.nodeType !== 3 || !prose.contains(node)) return null;
  const text = node.nodeValue || '';
  const offset = range.startOffset;
  const wordRe = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;
  let match;
  let found = null;
  while ((match = wordRe.exec(text))) {
    const end = match.index + match[0].length;
    if (offset >= match.index && offset <= end) {
      found = { word: match[0], start: match.index, end };
      break;
    }
  }
  if (!found) return null;
  const wordRange = document.createRange();
  wordRange.setStart(node, found.start);
  wordRange.setEnd(node, found.end);
  return { word: found.word, rect: wordRange.getBoundingClientRect() };
}

function openWordPopFor(word, base, anchorRect) {
  hideSelection();
  closeWordPop();

  const entry = getEntry(base);
  const savedEntry = store.findSavedWord(base);
  const saved = store.isWordSaved(base);
  const article = app.currentArticle;
  const localMeaning = entry?.meaning || '';
  const savedTranslation = savedEntry?.translation || '';
  const savedEnglish = savedEntry?.english || '';
  const token = (app.lookupToken += 1);
  app.lookup = {
    base,
    word,
    phonetic: entry?.phonetic || savedEntry?.phonetic || '',
    meaning: localMeaning,
    translation: savedTranslation,
    english: savedEnglish,
    defs: [],
    audio: '',
    saved,
    articleId: article?.id || '',
    articleTitle: article?.title || '',
  };

  const backdrop = document.createElement('div');
  backdrop.className = 'word-backdrop';
  const pop = document.createElement('div');
  pop.className = 'word-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', `查词：${word}`);
  pop.style.visibility = 'hidden';
  pop.innerHTML = `<button class="pop-close" data-act="pop-close" aria-label="关闭">${icon('close', 18)}</button>
    <div class="pop-head">
      <div>
        <h3>${esc(word)}</h3>
        <p class="pop-phon">${entry?.phonetic ? `/${esc(entry.phonetic)}/` : '<span class="pop-loading">音标加载中…</span>'}</p>
        ${base !== word.toLowerCase() ? `<p class="pop-base">原形 · ${esc(base)}</p>` : ''}
      </div>
      <button class="pop-speak" data-act="speak" aria-label="朗读 ${esc(word)}">${icon('speaker', 19)}</button>
    </div>
    <div class="pop-block">
      <span class="pop-label">${localMeaning ? '六级中文释义' : '中文释义'}</span>
      <div id="pop-zh">${localMeaning ? renderSenses(localMeaning) : savedTranslation ? `<p class="zh-main">${esc(savedTranslation)}</p>` : '<p class="pop-loading">正在翻译…</p>'}</div>
    </div>
    <div class="pop-block">
      <span class="pop-label">英文释义 · Datamuse</span>
      <div id="pop-en">${savedEnglish ? `<p>${esc(savedEnglish)}</p>` : '<p class="pop-loading">正在翻词典…</p>'}</div>
    </div>
    <button class="pop-add ${saved ? 'is-saved' : ''}" data-act="pop-add">
      ${saved ? `${icon('check', 16)} 已加入生词本` : `${icon('plus', 16)} 加入生词本`}
    </button>
    <div class="pop-foot">
      <a href="https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(base)}" target="_blank" rel="noopener noreferrer">Cambridge ${icon('linkOut', 12)}</a>
      <a href="https://dict.youdao.com/result?word=${encodeURIComponent(base)}&lang=en" target="_blank" rel="noopener noreferrer">有道词典 ${icon('linkOut', 12)}</a>
    </div>`;
  document.body.appendChild(backdrop);
  document.body.appendChild(pop);

  if (window.innerWidth <= 680) {
    pop.classList.add('is-sheet');
  } else {
    const rect = anchorRect || { left: window.innerWidth / 2, right: window.innerWidth / 2, top: 120, bottom: 120, width: 0, height: 0 };
    const width = Math.min(340, window.innerWidth - 24);
    const height = pop.offsetHeight;
    let top = rect.bottom + 10;
    if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 10);
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.min(Math.max(12, left), window.innerWidth - width - 12);
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
  }
  pop.style.visibility = 'visible';
  pop.querySelector('.pop-close')?.focus({ preventScroll: true });

  const onScroll = () => closeWordPop();
  window.addEventListener('scroll', onScroll, { passive: true, once: true });

  fetchDetails(base, { needTranslation: !localMeaning && !savedTranslation }).then((details) => {
    if (token !== app.lookupToken || !app.lookup || app.lookup.base !== base) return;
    app.lookup.phonetic = app.lookup.phonetic || details.phonetic || '';
    app.lookup.translation = details.translation || app.lookup.translation || '';
    app.lookup.defs = details.defs || [];
    app.lookup.english = englishSummary(details.defs || []);
    app.lookup.audio = details.audio || '';
    const phon = pop.querySelector('.pop-phon');
    if (phon && app.lookup.phonetic) phon.textContent = `/${app.lookup.phonetic}/`;
    const zh = pop.querySelector('#pop-zh');
    if (zh && !localMeaning && !savedTranslation) {
      const translation = details.translation || app.lookup.translation;
      zh.innerHTML = translation
        ? `<p class="zh-main">${esc(translation)}</p>`
        : '<p class="pop-empty">没有查到中文翻译，可以点下方词典继续查。</p>';
    }
    const en = pop.querySelector('#pop-en');
    if (en) {
      en.innerHTML = details.defs?.length
        ? `<ul class="pop-defs">${details.defs.map((item) => `<li>${item.pos ? `<em>${esc(item.pos)}.</em> ` : ''}${esc(item.def)}</li>`).join('')}</ul>`
        : '<p class="pop-empty">暂时没有英文释义，可以点下方词典继续查。</p>';
    }
    const addBtn = pop.querySelector('.pop-add');
    if (addBtn && app.lookup.saved) {
      store.enrichWord(base, {
        phonetic: app.lookup.phonetic,
        translation: app.lookup.translation,
        english: app.lookup.english,
      });
    }
  }).catch(() => {
    if (token !== app.lookupToken) return;
    const en = pop.querySelector('#pop-en');
    if (en) en.innerHTML = '<p class="pop-empty">网络好像在小憩，点下方词典也能查。</p>';
    const zh = pop.querySelector('#pop-zh');
    if (zh && !localMeaning) zh.innerHTML = '<p class="pop-empty">暂时没有翻译。</p>';
  });
}

function renderSenses(meaning) {
  const senses = splitMeaning(meaning);
  return senses.map((sense) => `<p>${esc(sense)}</p>`).join('');
}

function closeWordPop() {
  document.querySelector('.word-pop')?.remove();
  document.querySelector('.word-backdrop')?.remove();
  app.lookup = null;
  app.lookupToken += 1;
}

function toggleCurrentWord() {
  if (!app.lookup) return;
  const { base, word, phonetic, meaning, translation, english, articleId, articleTitle } = app.lookup;
  const result = store.toggleWord({
    base,
    word: base || word,
    phonetic,
    meaning,
    translation,
    english,
    articleId,
    articleTitle,
  });
  app.lookup.saved = result.saved;
  refreshReaderWords();
  const button = document.querySelector('.pop-add');
  if (button) {
    button.classList.toggle('is-saved', result.saved);
    button.innerHTML = result.saved
      ? `${icon('check', 16)} 已加入生词本`
      : `${icon('plus', 16)} 加入生词本`;
  }
  toast(result.saved ? '收进生词本啦' : '已从生词本取出', result.saved ? 'words' : 'trash');
}

function refreshReaderWords() {
  if (app.route.name !== 'read' || !app.currentArticle) return;
  const prose = document.getElementById('prose');
  if (!prose) return;
  const y = window.scrollY;
  const analyzed = analyzeArticle(app.currentArticle, store.savedWordKeys());
  const translations = new Map();
  prose.querySelectorAll('.para-block').forEach((block) => {
    const index = block.dataset.paraIndex;
    const panel = block.querySelector('.para-translation');
    if (panel) {
      translations.set(index, {
        hidden: panel.hidden,
        html: panel.innerHTML,
      });
    }
  });
  prose.querySelectorAll('.para-block').forEach((block, index) => {
    const paragraph = block.querySelector('p');
    if (paragraph && analyzed.html[index] != null) paragraph.innerHTML = analyzed.html[index];
    const panel = block.querySelector('.para-translation');
    const state = translations.get(block.dataset.paraIndex);
    if (panel && state) {
      panel.hidden = state.hidden;
      panel.innerHTML = state.html;
    }
  });
  window.scrollTo(0, y);
}

function playCurrentWord() {
  if (!app.lookup) return;
  if (app.lookup.audio) {
    const audio = new Audio(app.lookup.audio);
    audio.play().catch(() => speak(app.lookup.word));
    return;
  }
  const ok = speak(app.lookup.word || app.lookup.base);
  if (!ok) toast('这个浏览器暂时不会发音', 'speaker');
}

/* ---------------------------------------------------------- check-in */

function openCheckin(article) {
  if (!article) return;
  const result = store.checkIn(article);
  const week = lastSevenDays();
  const copy = result.counted
    ? (result.streak > 1 ? `连续第 ${result.streak} 天，花园里又多了一朵小花。` : '从今天开始，米菲陪你一天读一点。')
    : '今天已经点亮啦，这篇就不重复计数了。';

  overlayRoot.innerHTML = `<div class="checkin-layer">
    <div class="checkin-backdrop" data-act="close-overlay"></div>
    <div class="checkin-modal" role="dialog" aria-modal="true" aria-labelledby="checkin-title" tabindex="-1">
      <button class="checkin-close" data-act="close-overlay" aria-label="关闭">${icon('close', 20)}</button>
      <span class="ci-flower f1">${flowerSvg('#F08A2E')}</span>
      <span class="ci-flower f2">${flowerSvg('#B7DCEB')}</span>
      <span class="ci-flower f3">${flowerSvg('#F4C9C5')}</span>
      <span class="ci-flower f4">${flowerSvg('#C9DFB0')}</span>
      <div class="ci-bunny">${bunnyThumbs()}</div>
      <p class="eyebrow">READING CHECK-IN</p>
      <h2 id="checkin-title">${result.counted ? '打卡成功！' : '今天已经打过卡啦'}</h2>
      <p class="ci-copy">${copy}</p>
      <div class="ci-metrics">
        <div><strong>${result.streak}</strong><span>连续天数</span></div>
        <div><strong>${result.count}</strong><span>今日篇数</span></div>
      </div>
      <div class="ci-week">
        ${week.map((day) => `<div class="ci-day ${day.on ? 'is-on' : ''} ${day.today ? 'is-today' : ''}">
          <span class="ci-dot">${day.on ? icon('check', 12) : ''}</span>
          <span class="ci-label">${day.label}</span>
        </div>`).join('')}
      </div>
      <div class="ci-actions">
        <button class="btn btn-primary" data-act="goto-checkin">看看我的花园 ${icon('arrowRight', 17)}</button>
        <button class="btn btn-ghost" data-act="close-overlay">再读一会儿</button>
      </div>
    </div>
  </div>`;
  document.body.classList.add('no-scroll');
  app.overlayKey = (event) => {
    if (event.key === 'Escape') closeOverlay();
  };
  document.addEventListener('keydown', app.overlayKey);
  overlayRoot.querySelector('.checkin-modal')?.focus({ preventScroll: true });
  overlayRoot.querySelector('.checkin-close')?.focus({ preventScroll: true });
}

function lastSevenDays() {
  const labels = ['日', '一', '二', '三', '四', '五', '六'];
  const days = [];
  const todayKey = store.dateKey();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = store.dateKey(d);
    days.push({
      key,
      on: Boolean(store.state.days[key]),
      today: key === todayKey,
      label: labels[d.getDay()],
    });
  }
  return days;
}

function closeOverlay() {
  const layer = document.querySelector('.checkin-layer');
  if (layer) layer.remove();
  document.body.classList.remove('no-scroll');
  if (app.overlayKey) {
    document.removeEventListener('keydown', app.overlayKey);
    app.overlayKey = null;
  }
}

/* ---------------------------------------------------------- check-in page */

/** 本周（周一起）七天：日期 key、周几、阅读秒数。 */
function weekTimeRows() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = mondayOf(today);
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return labels.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const key = store.dateKey(date);
    return { key, label, seconds: store.getDayTime(key), isToday: key === store.dateKey() };
  });
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function exportMonth() {
  const key = app.ui.exportMonthKey || currentMonthKey();
  const [y, m] = key.split('-').map(Number);
  const rows = store.getMonthTimes(y, m);
  const total = rows.reduce((sum, r) => sum + r.seconds, 0);
  const activeDays = rows.filter((r) => r.seconds > 0).length;
  const head = [
    'Miffy Reads · 米菲读读 阅读时长记录',
    `月份：${y} 年 ${m} 月`,
    `导出日期：${store.dateKey()}`,
    '----------------------------------------',
    '日期              阅读时长',
  ];
  const body = rows.map((r) => {
    const [year, month, day] = r.key.split('-');
    return `${r.key}   ${r.seconds > 0 ? store.formatClock(r.seconds) : '未阅读'}`;
  });
  const foot = [
    '----------------------------------------',
    `本月累计：${store.formatDuration(total)}（${total} 秒）`,
    `有阅读天数：${activeDays} 天`,
    `日均：${activeDays ? store.formatDuration(Math.round(total / activeDays)) : '—'}`,
    '',
    '每天一点点，慢慢读，比较快。',
  ];
  downloadTextFile(`miffy-reading-time-${key}.txt`, [...head, ...body, ...foot].join('\r\n'));
  toast('本月阅读时长已导出', 'download');
}

function shiftExportMonth(offset) {
  const key = app.ui.exportMonthKey || currentMonthKey();
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, m - 1 + offset, 1);
  app.ui.exportMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  renderRouteContent({ keepScroll: true });
}

/** 本周阅读时长板块：花草随时长增高繁茂。 */
function renderWeekGarden() {
  const rows = weekTimeRows();
  const weekTotal = rows.reduce((sum, r) => sum + r.seconds, 0);
  const today = rows.find((r) => r.isToday) || rows[rows.length - 1];
  const monthKey = app.ui.exportMonthKey || currentMonthKey();
  const [my, mm] = monthKey.split('-').map(Number);
  const monthLabel = `${my} 年 ${mm} 月`;
  return `<section class="garden-card">
    <div class="heat-head">
      <div>
        <p class="eyebrow">WEEKLY READING TIME</p>
        <h2>阅读时长花园</h2>
      </div>
      <p class="garden-week-total">本周共读 ${store.formatDuration(weekTotal)}</p>
    </div>
    <div class="garden-row">
      ${rows.map((row) => `<div class="garden-day ${row.isToday ? 'is-today' : ''}" title="${row.label} ${row.seconds > 0 ? store.formatDuration(row.seconds) : '还没读'}" data-day="${row.key}" data-seconds="${row.seconds}">
        <div class="garden-plot">${rosePlant(row.seconds)}</div>
        <span class="garden-day-label">${row.label}</span>
        <span class="garden-day-time">${row.seconds > 0 ? store.formatDuration(row.seconds) : '—'}</span>
      </div>`).join('')}
    </div>
    <div class="garden-foot">
      <span class="garden-today">今天已读 ${store.formatDuration(today.seconds)}</span>
      <div class="garden-export">
        <button class="btn btn-ghost btn-icon-only" data-act="month-prev" aria-label="上个月" title="上个月">${icon('arrowLeft', 15)}</button>
        <button class="btn btn-ghost btn-small" data-act="export-month">${icon('download', 15)} 导出 ${esc(monthLabel)}</button>
        <button class="btn btn-ghost btn-icon-only" data-act="month-next" aria-label="下个月" title="下个月">${icon('arrowRight', 15)}</button>
      </div>
    </div>
    <div class="garden-legend">
      <div class="legend-plant">${rosePlant(900)}</div>
      <div class="legend-copy">
        <p class="legend-title">满级玫瑰</p>
        <p class="legend-desc">每天读满 15 分钟，玫瑰就会为你盛开。</p>
        <p class="legend-quote">「每天一点点，慢慢读，比较快。」</p>
      </div>
    </div>
  </section>`;
}

function renderCheckinPage() {
  const stats = store.getStats();
  const checked = store.isCheckedToday();
  const todayRead = store.todayCount();
  const weeks = buildWeeks(52);
  const headlineCopy = stats.streak === 0
    ? '第一朵花，从今天开始。'
    : checked
      ? '今天已经点亮，保持这份小小的坚持。'
      : '今天还没打卡，别让花园里的小火苗熄掉。';
  const detail = checked
    ? `今天 · 已读 ${todayRead} 篇`
    : '今天还没有记录，读一篇就能点亮。';

  root.innerHTML = `${renderHeader('checkin')}
    <main class="page checkin-page">
      <div class="page-head">
        <div class="page-head-copy">
          <p class="eyebrow">YOUR READING GARDEN</p>
          <h1>打卡花园<span class="title-flower">${flowerSvg('#C9DFB0')}</span></h1>
          <p class="page-desc">不追求完美，只记录你坐下来读过的每一天。</p>
        </div>
        <div class="page-head-action">
          <a class="btn btn-ghost" href="#/">去读今天的文章 ${icon('arrowRight', 17)}</a>
        </div>
      </div>

      <section class="streak-hero">
        <div class="streak-copy">
          <p class="eyebrow">READING STREAK</p>
          <p class="streak-big">${stats.streak}<span>天</span></p>
          <p class="streak-headline">${headlineCopy}</p>
          <p class="streak-sub">累计打卡 ${stats.totalDays} 天 · 读完 ${stats.articlesRead} 篇文章 · 收下 ${stats.words} 个生词</p>
          ${!checked ? '<a class="btn btn-primary btn-small" href="#/">读一篇，点亮今天</a>' : ''}
        </div>
        <div class="streak-art">
          <span class="hero-flower hero-flower-a">${flowerSvg('#F4C9C5')}</span>
          <span class="hero-flower hero-flower-b">${flowerSvg('#B7DCEB')}</span>
          ${bunnyThumbs()}
        </div>
      </section>

      <div class="stats-row">
        ${[
          ['flame', '连续打卡', stats.streak, '天', 'sun'],
          ['checkin', '累计打卡', stats.totalDays, '天', 'sky'],
          ['bookOpen', '读完文章', stats.articlesRead, '篇', 'mint'],
          ['words', '生词口袋', stats.words, '个', 'blush'],
        ].map(([iconName, label, value, unit, tone]) => `<div class="stat-card tone-${tone}">
          <span class="stat-icon">${icon(iconName, 20)}</span>
          <strong>${value}<small>${unit}</small></strong>
          <span>${label}</span>
        </div>`).join('')}
      </div>

      ${renderWeekGarden()}

      <section class="heat-card">
        <div class="heat-head">
          <div>
            <p class="eyebrow">READING FOOTPRINT</p>
            <h2>阅读足迹</h2>
          </div>
          <div class="heat-legend" aria-label="颜色越深读书越多">
            <span>少</span>${[0, 1, 2, 3].map((level) => `<i class="lv${level}"></i>`).join('')}<span>多</span>
          </div>
          <p class="heat-swipe">左右滑动，看看最近一年</p>
        </div>
        <div class="heat-scroll">
          <div class="heat-inner">
            <div class="heat-months" aria-hidden="true">
              <span class="heat-spacer"></span>
              <div class="heat-month-row">${weeks.map((week) => `<span>${week.label || ''}</span>`).join('')}</div>
            </div>
            <div class="heat-main">
              <div class="heat-dows" aria-hidden="true">
                ${['一', '', '三', '', '五', '', '日'].map((label) => `<span>${label}</span>`).join('')}
              </div>
              <div class="heat-grid">
                ${weeks.map((week) => `<div class="heat-col">${week.days.map((date) => renderHeatCell(date)).join('')}</div>`).join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="heat-detail" id="heat-detail">
          <span class="heat-detail-dot"></span>${esc(detail)}
        </div>
        ${stats.totalDays === 0 ? `<div class="heat-empty">
          <span>${flowerSvg('#F8E3A8')}</span>
          <p>花园还是空的，读完第一篇就会亮起第一格。</p>
          <a class="btn btn-primary btn-small" href="#/">去读第一篇</a>
        </div>` : ''}
      </section>

      <section class="milestone-card">
        <div class="heat-head">
          <div>
            <p class="eyebrow">LITTLE MILESTONES</p>
            <h2>小小的里程碑</h2>
          </div>
          <p class="milestone-hint">每一朵花都算数</p>
        </div>
        <div class="milestone-row">
          ${MILESTONES.map((days, index) => {
            const achieved = stats.totalDays >= days;
            const colors = ['#F08A2E', '#F4C9C5', '#C9DFB0', '#B7DCEB', '#D8CCEA', '#F7DFA2'];
            return `<div class="milestone ${achieved ? 'is-achieved' : ''}">
              <span>${flowerSvg(achieved ? colors[index % colors.length] : '#EFE5D4')}</span>
              <strong>${days} 天</strong>
              <small>${achieved ? '已开花' : '继续读'}</small>
            </div>`;
          }).join('')}
        </div>
      </section>
    </main>
    ${renderFooter()}
    ${renderTabbar('checkin')}`;
  requestAnimationFrame(() => {
    const scroller = document.querySelector('.heat-scroll');
    if (scroller && scroller.scrollWidth > scroller.clientWidth) scroller.scrollLeft = scroller.scrollWidth;
  });
}

function renderHeatCell(date) {
  const today = store.dateKey();
  const key = store.dateKey(date);
  const future = key > today;
  const count = countForDay(key);
  const level = future ? 'is-future' : `lv${heatLevel(count)}`;
  const label = `${date.getMonth() + 1}月${date.getDate()}日 · ${count ? `读完 ${count} 篇` : '没有记录'}`;
  return `<button type="button" class="heat-cell ${level} ${key === today ? 'is-today' : ''}" data-act="heat-day" data-day="${key}" data-count="${count}" title="${label}" aria-label="${label}" ${future ? 'disabled' : ''}></button>`;
}

/* ---------------------------------------------------------- shelf */

function renderShelfPage() {
  const savedIds = store.state.bookmarks;
  const finishedIds = store.getFinishedIds();
  const saved = resolveIds(savedIds);
  const finished = resolveIds(finishedIds);
  const tab = app.ui.shelfTab;
  const current = tab === 'saved' ? saved : finished;

  root.innerHTML = `${renderHeader('shelf')}
    <main class="page shelf-page">
      ${renderPageHead('我的书架', '把想再读一遍的东西，留在伸手就能拿到的地方。', '<a class="btn btn-ghost" href="#/">再去挑几篇 ' + icon('arrowRight', 16) + '</a>')}
      <div class="tab-row" role="tablist" aria-label="书架分类">
        <button class="tab ${tab === 'saved' ? 'is-active' : ''}" data-act="shelf-tab" data-tab="saved" role="tab" aria-selected="${tab === 'saved'}">${icon('bookmark', 16)} 我收藏的 <span>${saved.length}</span></button>
        <button class="tab ${tab === 'read' ? 'is-active' : ''}" data-act="shelf-tab" data-tab="read" role="tab" aria-selected="${tab === 'read'}">${icon('bookOpen', 16)} 我读过的 <span>${finished.length}</span></button>
      </div>
      ${current.length
        ? `<div class="shelf-grid">${current.map((article) => renderShelfCard(article, tab)).join('')}</div>`
        : (tab === 'saved'
          ? emptyState({
            title: '收藏架还空着',
            text: '遇到喜欢的文章，点一下右上角的小书签，它就会住在这里。',
            action: '<a class="btn btn-primary btn-small" href="#/">去挑一篇文章</a>',
          })
          : emptyState({
            art: 'reading',
            title: '还没有读完的记录',
            text: '点开一篇文章，读到最后，按下「读完打卡」就会出现在这里。',
            action: '<a class="btn btn-primary btn-small" href="#/">开始第一篇</a>',
          }))}
    </main>
    ${renderFooter()}
    ${renderTabbar('shelf')}`;
}

function renderShelfCard(article, tab) {
  const saved = store.isBookmarked(article.id);
  const read = store.getRead(article.id);
  const finished = Boolean(read?.finishedAt);
  const progress = Math.min(100, Math.max(0, Number(read?.progress) || 0));
  const meta = finished && read.finishedAt
    ? `读完于 ${store.prettyDate(new Date(read.finishedAt))}`
    : `收录于 ${store.prettyDate(new Date(article.publishedAt))}`;
  return `<article class="shelf-card">
    <a class="shelf-cover" href="#/read/${encodeURIComponent(article.id)}" aria-label="阅读 ${esc(article.title)}">
      ${coverArt(article)}
      <span class="thumb-cat accent-${accent(article)}">${esc(article.category)}</span>
      ${finished ? `<span class="read-stamp">${icon('check', 12)} 读完</span>` : ''}
    </a>
    <div class="shelf-copy">
      <p class="card-kicker">${esc(article.external ? article.source.name : '编辑部原创')} <span>·</span> ${store.prettyDate(article.date)}</p>
      <h3><a href="#/read/${encodeURIComponent(article.id)}">${esc(article.title)}</a></h3>
      <p class="shelf-meta">${meta} · ${readingMinutes(article)} 分钟</p>
      ${progress > 0 && !finished ? `<div class="card-progress"><span style="width:${progress}%"></span></div>` : ''}
      <div class="shelf-actions">
        <a class="btn btn-primary btn-small" href="#/read/${encodeURIComponent(article.id)}">${finished ? '再读一遍' : '继续阅读'}</a>
        ${tab === 'saved' && saved ? `<button class="text-btn" data-act="bookmark" data-id="${esc(article.id)}" aria-label="移出收藏">${icon('trash', 15)} 移出收藏</button>` : ''}
      </div>
    </div>
  </article>`;
}

/* ---------------------------------------------------------- words & quotes */

function renderWordsPage() {
  const tab = app.ui.wordTab;
  const isWords = tab === 'words';
  const wordCount = store.state.words.length;
  const quoteCount = store.state.quotes.length;
  const action = `<button class="btn btn-ghost" data-act="${isWords ? 'export-words' : 'export-quotes'}">${icon('download', 17)} ${isWords ? '导出 TXT' : '导出金句'}</button>`;

  root.innerHTML = `${renderHeader('words')}
    <main class="page words-page">
      ${renderPageHead('生词本', '把遇见过的词慢慢收好，它们会在某一天派上用场。', action)}
      <div class="tab-row" role="tablist" aria-label="生词与句子">
        <button class="tab ${isWords ? 'is-active' : ''}" data-act="word-tab" data-tab="words" role="tab" aria-selected="${isWords}">${icon('words', 16)} 生词 <span>${wordCount}</span></button>
        <button class="tab ${!isWords ? 'is-active' : ''}" data-act="word-tab" data-tab="quotes" role="tab" aria-selected="${!isWords}">${icon('quote', 16)} 金句 <span>${quoteCount}</span></button>
      </div>
      <div class="words-toolbar">
        <label class="search-field wide">
          ${icon('search', 18)}
          <input id="${isWords ? 'word-search' : 'quote-search'}" type="search" placeholder="${isWords ? '搜索单词、释义或标签…' : '搜索收藏的句子…'}" value="${esc(isWords ? app.ui.wordQuery : app.ui.quoteQuery)}" autocomplete="off" aria-label="${isWords ? '搜索生词' : '搜索句子'}">
        </label>
        ${isWords ? `<div class="word-controls">
          <div class="segmented" role="group" aria-label="分类方式">
            <button type="button" class="${app.ui.wordGroup === 'date' ? 'is-active' : ''}" data-act="word-group" data-group="date" aria-pressed="${app.ui.wordGroup === 'date'}">按日期</button>
            <button type="button" class="${app.ui.wordGroup === 'tag' ? 'is-active' : ''}" data-act="word-group" data-group="tag" aria-pressed="${app.ui.wordGroup === 'tag'}">按标签</button>
          </div>
          <p class="words-tip">只显示常用释义 · 点 # 标签可分类</p>
        </div>` : '<p class="words-tip">选中喜欢的句子收藏，可导出 TXT。</p>'}
      </div>
      <div id="${isWords ? 'word-list' : 'quote-list'}">
        ${isWords ? renderWordList() : renderQuoteList()}
      </div>
    </main>
    ${renderFooter()}
    ${renderTabbar('words')}`;
}

function shortWordMeaning(word) {
  const senses = splitMeaning(word.meaning || '');
  const value = senses[0] || word.translation || word.english || '（暂无释义，点词查一下）';
  return String(value).replace(/\s+/g, ' ').trim();
}

function wordDateLabel(key) {
  if (key === 'unknown') return '更早';
  const today = store.dateKey();
  const yesterday = store.dateKey(store.addDays(new Date(), -1));
  if (key === today) return '今天';
  if (key === yesterday) return '昨天';
  const currentYear = new Date().getFullYear();
  return store.prettyDate(key, key.startsWith(String(currentYear)) ? {} : { year: 'numeric' });
}

function groupWords(list) {
  const groups = [];
  if (app.ui.wordGroup === 'tag') {
    const map = new Map();
    for (const word of list) {
      const tag = String(word.tag || '').trim();
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag).push(word);
    }
    const tags = [...map.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    if (map.has('')) tags.push('');
    for (const tag of tags) {
      groups.push({ label: tag ? `# ${tag}` : '未分类', words: map.get(tag) });
    }
  } else {
    const map = new Map();
    for (const word of list) {
      let key = 'unknown';
      if (word.addedAt) {
        const date = new Date(word.addedAt);
        if (!Number.isNaN(date.getTime())) key = store.dateKey(date);
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(word);
    }
    const keys = [...map.keys()].filter((key) => key !== 'unknown').sort((a, b) => b.localeCompare(a));
    if (map.has('unknown')) keys.push('unknown');
    for (const key of keys) {
      groups.push({ label: wordDateLabel(key), words: map.get(key) });
    }
  }
  return groups;
}

function renderWordList() {
  const all = store.state.words;
  if (!all.length) {
    return emptyState({
      art: 'bunny',
      title: '生词本还是空的',
      text: '阅读时点任意单词，就能把它收进这个小小的口袋。',
      action: '<a class="btn btn-primary btn-small" href="#/">去读一篇文章</a>',
    });
  }
  const query = app.ui.wordQuery.trim().toLowerCase();
  const filtered = query
    ? all.filter((word) => `${word.word} ${word.base} ${word.tag || ''} ${word.meaning} ${word.translation} ${word.english}`.toLowerCase().includes(query))
    : all;
  if (!filtered.length) {
    return emptyState({ art: 'bunny', title: '没有找到这个词', text: '换个拼写、释义或标签试试。' });
  }
  const groups = groupWords(filtered);
  return `<div class="list-count" id="word-result-count">${filtered.length} 个词 · ${app.ui.wordGroup === 'tag' ? '按标签' : '按日期'}</div>
    ${groups.map((group) => `<section class="word-group">
      <div class="word-group-head"><h3>${esc(group.label)}</h3><span>${group.words.length}</span></div>
      <div class="word-rows">${group.words.map(renderWordRow).join('')}</div>
    </section>`).join('')}`;
}

function renderWordRow(word) {
  const tag = String(word.tag || '').trim();
  const meaning = shortWordMeaning(word);
  return `<div class="word-row">
    <div class="word-row-main">
      <div class="word-row-title">
        <h3 lang="en">${esc(word.word)}</h3>
        ${word.phonetic ? `<span class="word-row-phon">/${esc(word.phonetic)}/</span>` : ''}
      </div>
      <p class="word-row-meaning" title="${esc(meaning)}">${esc(meaning)}</p>
    </div>
    <div class="word-row-actions">
      <button class="word-tag-btn ${tag ? '' : 'is-empty'}" type="button" data-act="edit-word-tag" data-id="${esc(word.id)}" aria-label="${tag ? `标签：${esc(tag)}` : '设置标签'}" title="${tag ? `标签：${esc(tag)}` : '设置标签'}">#${tag ? ` ${esc(tag)}` : '<span class="tag-label-text"> 标签</span>'}</button>
      <button class="icon-btn tiny" type="button" data-act="speak-word" data-word="${esc(word.word)}" aria-label="朗读 ${esc(word.word)}">${icon('speaker', 15)}</button>
      <button class="icon-btn tiny danger" type="button" data-act="remove-word" data-id="${esc(word.id)}" aria-label="删除 ${esc(word.word)}">${icon('trash', 15)}</button>
    </div>
  </div>`;
}

function openTagEditor(id) {
  const word = store.state.words.find((item) => item.id === id);
  if (!word) return;
  const current = String(word.tag || '').trim();
  const tags = [...new Set(store.state.words.map((item) => String(item.tag || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));

  overlayRoot.innerHTML = `<div class="tag-layer">
    <div class="tag-backdrop" data-act="close-tag-editor"></div>
    <div class="tag-modal" role="dialog" aria-modal="true" aria-labelledby="tag-title">
      <button class="tag-close" type="button" data-act="close-tag-editor" aria-label="关闭">${icon('close', 19)}</button>
      <p class="eyebrow">WORD TAG</p>
      <h2 id="tag-title">给「${esc(word.word)}」分类</h2>
      <p class="tag-hint">一个词放一个标签即可，可以按考试、主题或自己的习惯来分。</p>
      ${tags.length ? `<div class="tag-options">${tags.map((tag) => `<button class="tag-choice ${tag === current ? 'is-current' : ''}" type="button" data-act="set-word-tag" data-id="${esc(word.id)}" data-tag="${esc(tag)}"># ${esc(tag)}</button>`).join('')}</div>` : ''}
      <div class="tag-input-row">
        <input id="tag-input" type="text" maxlength="16" placeholder="新标签，比如：考研" value="${esc(current)}" autocomplete="off" aria-label="标签名称">
        <button class="btn btn-primary btn-small" type="button" data-act="save-word-tag" data-id="${esc(word.id)}">保存</button>
      </div>
      ${current ? `<button class="tag-clear" type="button" data-act="clear-word-tag" data-id="${esc(word.id)}">${icon('trash', 14)} 清除标签</button>` : ''}
    </div>
  </div>`;
  document.body.classList.add('no-scroll');
  const input = overlayRoot.querySelector('#tag-input');
  input?.focus({ preventScroll: true });
  input?.select();
}

function closeTagEditor() {
  overlayRoot.querySelector('.tag-layer')?.remove();
  document.body.classList.remove('no-scroll');
}

function renderQuoteList() {
  const all = store.state.quotes;
  const query = app.ui.quoteQuery.trim().toLowerCase();
  const list = query
    ? all.filter((quote) => `${quote.text} ${quote.articleTitle}`.toLowerCase().includes(query))
    : all;
  if (!all.length) {
    return emptyState({
      art: 'reading',
      title: '还没有收藏句子',
      text: '读到喜欢的句子时，选中它，点一下「收藏这句」。',
      action: '<a class="btn btn-primary btn-small" href="#/">去读一篇文章</a>',
    });
  }
  if (!list.length) {
    return emptyState({ art: 'bunny', title: '没有找到这句话', text: '换个关键词试试。' });
  }
  return `<div class="list-count">${list.length} 句</div>
    <div class="quote-list">${list.map((quote) => `<article class="quote-card">
      <span class="quote-mark">${icon('quote', 22)}</span>
      <p class="quote-text">${esc(quote.text)}</p>
      <div class="quote-foot">
        ${quote.articleId ? `<a href="#/read/${encodeURIComponent(quote.articleId)}">${esc(quote.articleTitle || '回到原文')} ${icon('arrowRight', 13)}</a>` : '<span>来自阅读</span>'}
        <span>${store.prettyDate(new Date(quote.addedAt))}</span>
        <button class="text-btn" data-act="remove-quote" data-id="${esc(quote.id)}">${icon('trash', 14)} 删除</button>
      </div>
    </article>`).join('')}</div>`;
}

function downloadTextFile(filename, content) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportWords() {
  const words = store.state.words;
  if (!words.length) {
    toast('生词本还是空的，先去收几个词吧', 'words');
    return;
  }
  const today = store.dateKey();
  const head = [
    'Miffy Reads · 米菲读词本',
    `导出日期：${today}`,
    `共计：${words.length} 个生词`,
    '----------------------------------------',
    '',
  ];
  const body = words.map((word, index) => {
    const lines = [
      `${String(index + 1).padStart(2, '0')}. ${word.word}${word.phonetic ? `  /${word.phonetic}/` : ''}`,
    ];
    const tag = String(word.tag || '').trim();
    if (tag) lines.push(`    标签：${tag}`);
    lines.push(`    释义：${shortWordMeaning(word)}`);
    if (word.addedAt) lines.push(`    收录：${store.dateKey(new Date(word.addedAt))}`);
    return lines.join('\r\n');
  }).join('\r\n\r\n');
  downloadTextFile(`miffy-words-${today}.txt`, `${head.join('\r\n')}${body}\r\n`);
  toast('生词本已经收进 txt 啦', 'download');
}

function exportQuotes() {
  const quotes = store.state.quotes;
  if (!quotes.length) {
    toast('金句本还是空的，先去收藏几句吧', 'quote');
    return;
  }
  const today = store.dateKey();
  const head = [
    'Miffy Reads · 米菲金句本',
    `导出日期：${today}`,
    `共计：${quotes.length} 句`,
    '----------------------------------------',
    '',
  ];
  const body = quotes.map((quote, index) => [
    `${String(index + 1).padStart(2, '0')}. “${quote.text}”`,
    `    来源：${quote.articleTitle || '阅读'}`,
    `    收录：${store.dateKey(new Date(quote.addedAt))}`,
  ].join('\r\n')).join('\r\n\r\n');
  downloadTextFile(`miffy-quotes-${today}.txt`, `${head.join('\r\n')}${body}\r\n`);
  toast('金句已经收进 txt 啦', 'download');
}

/* ---------------------------------------------------------- global events */

function bindGlobalEvents() {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('input', onDocumentInput);
  document.addEventListener('keydown', onDocumentKeydown);
  window.addEventListener('pagehide', () => store.endReading());
}

function onDocumentClick(event) {
  if (app.suppressClick && !event.target.closest('#sel-bubble')) {
    app.suppressClick = false;
    return;
  }
  app.suppressClick = false;
  const internalLink = event.target.closest('a[href^="#/read/"]');
  if (internalLink && app.route.name === 'read') {
    event.preventDefault();
    location.replace(internalLink.getAttribute('href'));
    return;
  }
  const actionEl = event.target.closest('[data-act]');
  if (actionEl) {
    handleAction(actionEl, event);
    return;
  }
  const pendingBubble = Boolean(app.pendingQuote && document.getElementById('sel-bubble') && !document.getElementById('sel-bubble').hidden);
  const wordEl = pendingBubble ? null : event.target.closest('.cet6-word, .saved-word');
  if (wordEl) {
    event.preventDefault();
    openWordPop(wordEl);
    return;
  }
  if (!pendingBubble && app.route.name === 'read' && event.target.closest('#prose') && !event.target.closest('.cet6-word, .saved-word')) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      const hit = wordAtPoint(event.clientX, event.clientY);
      if (hit) {
        event.preventDefault();
        openWordPopFor(hit.word, lookupBase(hit.word), hit.rect);
        return;
      }
    }
  }
  const currentSelection = window.getSelection();
  const hasActiveSelection = Boolean(app.pendingQuote && currentSelection && !currentSelection.isCollapsed && currentSelection.rangeCount > 0);
  if (!event.target.closest('.word-pop') && !event.target.closest('.sel-bubble') && !hasActiveSelection) {
    closeWordPop();
    hideSelection();
  }
}

function onDocumentInput(event) {
  if (event.target.id === 'feed-search') {
    app.ui.search = event.target.value;
    updateFeedFilterUI();
  } else if (event.target.id === 'word-search') {
    app.ui.wordQuery = event.target.value;
    const host = document.getElementById('word-list');
    if (host) host.innerHTML = renderWordList();
  } else if (event.target.id === 'quote-search') {
    app.ui.quoteQuery = event.target.value;
    const host = document.getElementById('quote-list');
    if (host) host.innerHTML = renderQuoteList();
  }
}

function onDocumentKeydown(event) {
  if (event.key === 'Enter' && event.target?.id === 'tag-input') {
    event.preventDefault();
    const save = document.querySelector('.tag-modal [data-act="save-word-tag"]');
    if (save) handleAction(save, event);
    return;
  }
  if (event.key === 'Escape') {
    if (document.querySelector('.tag-layer')) {
      closeTagEditor();
      return;
    }
    if (document.querySelector('.checkin-layer')) {
      closeOverlay();
      return;
    }
    if (document.querySelector('.word-pop')) {
      closeWordPop();
      return;
    }
    if (document.querySelector('.sel-bubble:not([hidden])')) {
      hideSelection();
    }
  }
}

function handleAction(element, event) {
  const act = element.dataset.act;
  if (!act) return;
  if (!['pop-add', 'speak', 'pop-close', 'save-quote'].includes(act)) {
    closeWordPop();
    hideSelection();
  }
  switch (act) {
    case 'bookmark': {
      event.preventDefault();
      const article = resolveArticle(element.dataset.id);
      if (!article) return;
      const saved = store.toggleBookmark(article);
      syncBookmarkUI(article.id, saved);
      toast(saved ? '已放进书架' : '已从书架取出', saved ? 'star' : 'shelf');
      if (app.route.name === 'shelf') renderRouteContent({ keepScroll: true });
      if (app.route.name === 'feed') refreshSidebar();
      break;
    }
    case 'checkin': {
      event.preventDefault();
      const article = resolveArticle(element.dataset.id) || app.currentArticle;
      if (article) openCheckin(article);
      break;
    }
    case 'back': {
      event.preventDefault();
      const target = app.hubRoute || { name: 'feed' };
      location.replace(routeHash(target));
      break;
    }
    case 'font': {
      event.preventDefault();
      const step = Number(element.dataset.step) || 0;
      const size = store.setFontSize(store.state.fontSize + step);
      document.documentElement.style.setProperty('--reader-size', `${size}px`);
      toast(`字号 ${size}px`, 'words');
      window.requestAnimationFrame(() => {
        app.refreshReaderProgress?.();
      });
      break;
    }
    case 'font-reset': {
      event.preventDefault();
      const size = store.setFontSize(20);
      document.documentElement.style.setProperty('--reader-size', `${size}px`);
      toast('字号恢复 20px', 'words');
      window.requestAnimationFrame(() => app.refreshReaderProgress?.());
      break;
    }
    case 'pop-close': {
      event.preventDefault();
      closeWordPop();
      break;
    }
    case 'pop-add': {
      event.preventDefault();
      toggleCurrentWord();
      break;
    }
    case 'speak': {
      event.preventDefault();
      playCurrentWord();
      break;
    }
    case 'speak-word': {
      event.preventDefault();
      speak(element.dataset.word);
      break;
    }
    case 'translate-para': {
      event.preventDefault();
      const block = element.closest('.para-block');
      if (!block) break;
      const panel = block.querySelector('.para-translation');
      const button = block.querySelector('.para-tr');
      const paragraph = block.querySelector('p');
      if (!panel || !button) break;
      if (!panel.hidden) {
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
        button.classList.remove('is-open');
        button.title = '翻译这一段';
        break;
      }
      panel.hidden = false;
      panel.classList.remove('is-error');
      button.setAttribute('aria-expanded', 'true');
      button.classList.add('is-open');
      button.title = '收起这一段译文';
      if (block.dataset.translationLoaded === 'true') break;
      if (block.dataset.translating === 'true') break;
      block.dataset.translating = 'true';
      const closeButton = `<button class="para-tr-close" type="button" data-act="translate-para" aria-label="收起译文">${icon('close', 14)}</button>`;
      panel.innerHTML = `<div class="para-tr-head"><span class="para-tr-label" title="机器翻译由有道提供，失败时使用 MyMemory">中文译文 · 机器翻译</span>${closeButton}</div><p class="para-tr-loading">米菲正在翻译这一段…</p>`;
      button.disabled = true;
      button.textContent = '…';
      const source = paragraph ? paragraph.textContent.replace(/s+/g, ' ').trim() : '';
      translateParagraph(source).then((translation) => {
        panel.innerHTML = `<div class="para-tr-head"><span class="para-tr-label" title="机器翻译由有道提供，失败时使用 MyMemory">中文译文 · 机器翻译</span>${closeButton}</div><div class="para-tr-text" lang="zh-CN">${esc(translation)}</div>`;
        block.dataset.translationLoaded = 'true';
      }).catch((error) => {
        console.error(error);
        panel.classList.add('is-error');
        panel.innerHTML = `<div class="para-tr-head"><span class="para-tr-label">翻译没有成功</span>${closeButton}</div><p class="para-tr-error">翻译服务暂时不可用，可能是免费额度用完了。稍后再点「译」试试。</p>`;
      }).finally(() => {
        delete block.dataset.translating;
        button.disabled = false;
        button.textContent = '译';
      });
      break;
    }
    case 'close-overlay': {
      event.preventDefault();
      closeOverlay();
      break;
    }
    case 'goto-checkin': {
      event.preventDefault();
      closeOverlay();
      location.replace('#/checkin');
      break;
    }
    case 'filter': {
      event.preventDefault();
      app.ui.filter = element.dataset.filter || '全部';
      updateFeedFilterUI();
      break;
    }
    case 'reset-filter': {
      event.preventDefault();
      app.ui.filter = '全部';
      app.ui.search = '';
      const input = document.getElementById('feed-search');
      if (input) input.value = '';
      updateFeedFilterUI();
      break;
    }
    case 'shelf-tab': {
      event.preventDefault();
      app.ui.shelfTab = element.dataset.tab === 'read' ? 'read' : 'saved';
      renderRouteContent({ keepScroll: true });
      break;
    }
    case 'word-tab': {
      event.preventDefault();
      app.ui.wordTab = element.dataset.tab === 'quotes' ? 'quotes' : 'words';
      renderRouteContent({ keepScroll: true });
      break;
    }
    case 'word-group': {
      event.preventDefault();
      app.ui.wordGroup = element.dataset.group === 'tag' ? 'tag' : 'date';
      document.querySelectorAll('.segmented [data-act="word-group"]').forEach((btn) => {
        const active = btn.dataset.group === app.ui.wordGroup;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      const host = document.getElementById('word-list');
      if (host) host.innerHTML = renderWordList();
      break;
    }
    case 'edit-word-tag': {
      event.preventDefault();
      openTagEditor(element.dataset.id);
      break;
    }
    case 'close-tag-editor': {
      event.preventDefault();
      closeTagEditor();
      break;
    }
    case 'set-word-tag': {
      event.preventDefault();
      const tag = (element.dataset.tag || '').trim();
      if (store.setWordTag(element.dataset.id, tag)) {
        closeTagEditor();
        toast(tag ? `已归到 #${tag}` : '已清除标签', 'words');
        renderRouteContent({ keepScroll: true });
      }
      break;
    }
    case 'save-word-tag': {
      event.preventDefault();
      const input = document.getElementById('tag-input');
      const tag = input ? input.value.trim() : '';
      if (store.setWordTag(element.dataset.id, tag)) {
        closeTagEditor();
        toast(tag ? `已设置标签 #${tag}` : '已清除标签', 'words');
        renderRouteContent({ keepScroll: true });
      }
      break;
    }
    case 'clear-word-tag': {
      event.preventDefault();
      if (store.setWordTag(element.dataset.id, '')) {
        closeTagEditor();
        toast('已清除标签', 'words');
        renderRouteContent({ keepScroll: true });
      }
      break;
    }
    case 'export-quotes': {
      event.preventDefault();
      exportQuotes();
      break;
    }
    case 'remove-word': {
      event.preventDefault();
      const word = store.state.words.find((item) => item.id === element.dataset.id);
      store.removeWord(element.dataset.id);
      toast(word ? `把 ${word.word} 移出生词本啦` : '已移出生词本', 'trash');
      renderRouteContent({ keepScroll: true });
      break;
    }
    case 'remove-quote': {
      event.preventDefault();
      store.removeQuote(element.dataset.id);
      toast('句子已删除', 'trash');
      renderRouteContent({ keepScroll: true });
      break;
    }
    case 'export-words': {
      event.preventDefault();
      exportWords();
      break;
    }
    case 'month-prev': {
      event.preventDefault();
      shiftExportMonth(-1);
      break;
    }
    case 'month-next': {
      event.preventDefault();
      shiftExportMonth(1);
      break;
    }
    case 'export-month': {
      event.preventDefault();
      exportMonth();
      break;
    }
    case 'save-quote': {
      event.preventDefault();
      savePendingQuote();
      break;
    }
    case 'heat-day': {
      event.preventDefault();
      const key = element.dataset.day;
      const count = Number(element.dataset.count) || 0;
      document.querySelectorAll('.heat-cell.is-selected').forEach((cell) => cell.classList.remove('is-selected'));
      element.classList.add('is-selected');
      const detail = document.getElementById('heat-detail');
      if (detail) {
        detail.innerHTML = `<span class="heat-detail-dot"></span><strong>${store.prettyDate(key)}</strong> · ${count ? `读完 ${count} 篇` : '这天没有阅读记录'}`;
      }
      break;
    }
    case 'retry': {
      event.preventDefault();
      location.reload();
      break;
    }
    default:
      break;
  }
}

function syncBookmarkUI(id, saved) {
  document.querySelectorAll('[data-act="bookmark"]').forEach((button) => {
    if (button.dataset.id !== id) return;
    button.classList.toggle('is-saved', saved);
    button.setAttribute('aria-pressed', String(saved));
    const label = button.querySelector('.bookmark-label');
    if (label) {
      label.textContent = saved
        ? (button.dataset.labelSaved || '已收藏')
        : (button.dataset.labelUnsaved || '收藏');
    }
    button.setAttribute('aria-label', saved ? '取消收藏' : '收藏文章');
  });
}

/* ---------------------------------------------------------- fatal */

function renderFatal(error) {
  root.innerHTML = `<div class="fatal-page">
    <div class="fatal-bunny">${bunnyShelf()}</div>
    <p class="eyebrow">OOPS</p>
    <h1>今天的文章还在路上</h1>
    <p>浏览器没能读到文章数据。请确认是通过 GitHub Pages 或本地服务器打开，而不是直接双击 index.html。</p>
    <p class="fatal-detail">${esc(error?.message || '未知错误')}</p>
    <button class="btn btn-primary" data-act="retry">再试一次 ${icon('arrowRight', 17)}</button>
  </div>`;
}
