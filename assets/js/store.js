const STATE_KEY = 'miffy.reads.state.v1';
const SNAPSHOT_KEY = 'miffy.reads.articles.v1';
const MAX_SNAPSHOTS = 60;
const MAX_WORDS = 600;

const DEFAULT_STATE = {
  version: 1,
  words: [],
  quotes: [],
  bookmarks: [],
  reads: {},
  days: {},
  fontSize: 20,
};

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

function loadState() {
  try {
    const raw = safeGet(STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    const num = Number(parsed.fontSize);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      words: Array.isArray(parsed.words) ? parsed.words : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      reads: parsed.reads && typeof parsed.reads === 'object' ? parsed.reads : {},
      days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
      fontSize: Number.isFinite(num) ? Math.min(26, Math.max(16, num)) : 20,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export const state = loadState();

export function persist() {
  return safeSet(STATE_KEY, JSON.stringify(state));
}

function snapshots() {
  try {
    const parsed = JSON.parse(safeGet(SNAPSHOT_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object') return { articles: {}, order: [] };
    return {
      articles: parsed.articles && typeof parsed.articles === 'object' ? parsed.articles : {},
      order: Array.isArray(parsed.order) ? parsed.order : [],
    };
  } catch {
    return { articles: {}, order: [] };
  }
}

function persistSnapshots(data) {
  safeSet(SNAPSHOT_KEY, JSON.stringify(data));
}

export function saveSnapshot(article) {
  if (!article || !article.id) return;
  const data = snapshots();
  const { id, title, dek, category, tags, date, publishedAt, source, cover, accent, paragraphs, external, daily, batchDate } = article;
  if (!Array.isArray(paragraphs) || !paragraphs.length) return;
  data.articles[id] = { id, title, dek, category, tags, date, publishedAt, source, cover, accent, paragraphs, external, daily, batchDate };
  data.order = data.order.filter((x) => x !== id);
  data.order.push(id);
  while (data.order.length > MAX_SNAPSHOTS) {
    const drop = data.order.shift();
    if (!state.bookmarks.includes(drop) && !state.reads[drop]?.finishedAt) delete data.articles[drop];
  }
  persistSnapshots(data);
}

export function getSnapshot(id) {
  const data = snapshots();
  return data.articles[id] || null;
}

/* ---------- dates ---------- */

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function prettyDate(key, options = {}) {
  const date = typeof key === 'string' ? keyToDate(key) : key;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(date);
}

/* ---------- reading ---------- */

export function getRead(id) {
  return state.reads[id] || null;
}

export function setProgress(id, progress) {
  if (!id) return;
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const current = state.reads[id] || {};
  if (current.progress === pct) return;
  state.reads[id] = { ...current, progress: pct, lastReadAt: new Date().toISOString() };
  persist();
}

export function markFinished(article) {
  if (!article) return;
  saveSnapshot(article);
  const current = state.reads[article.id] || {};
  state.reads[article.id] = {
    ...current,
    progress: 100,
    finishedAt: current.finishedAt || new Date().toISOString(),
    lastReadAt: new Date().toISOString(),
  };
  persist();
}

export function checkIn(article) {
  saveSnapshot(article);
  const key = dateKey();
  const day = state.days[key] && typeof state.days[key] === 'object'
    ? { ids: Array.isArray(state.days[key].ids) ? [...state.days[key].ids] : [] }
    : { ids: [] };
  const counted = !day.ids.includes(article.id);
  if (counted) day.ids.push(article.id);
  day.count = day.ids.length;
  state.days[key] = day;

  const current = state.reads[article.id] || {};
  state.reads[article.id] = {
    ...current,
    progress: 100,
    finishedAt: current.finishedAt || new Date().toISOString(),
    lastReadAt: new Date().toISOString(),
  };
  persist();

  return {
    counted,
    count: day.count,
    streak: getStreak(),
    checkedToday: true,
  };
}

export function getStreak(now = new Date()) {
  let cursor = new Date(now);
  if (!state.days[dateKey(cursor)]) cursor = addDays(cursor, -1);
  let streak = 0;
  while (state.days[dateKey(cursor)]) {
    streak += 1;
    cursor = addDays(cursor, -1);
    if (streak > 5000) break;
  }
  return streak;
}

export function isCheckedToday() {
  return Boolean(state.days[dateKey()]);
}

export function todayCount() {
  const day = state.days[dateKey()];
  return day ? Number(day.count) || (Array.isArray(day.ids) ? day.ids.length : 0) : 0;
}

export function getStats() {
  const days = state.days;
  const dayKeys = Object.keys(days).filter((k) => days[k]);
  const totalDays = dayKeys.length;
  const articlesRead = Object.keys(state.reads).filter((id) => state.reads[id]?.finishedAt).length;
  const pages = dayKeys.reduce((sum, k) => sum + (Number(days[k].count) || (Array.isArray(days[k].ids) ? days[k].ids.length : 0)), 0);
  return {
    streak: getStreak(),
    totalDays,
    articlesRead,
    pages,
    words: state.words.length,
    quotes: state.quotes.length,
    bookmarks: state.bookmarks.length,
  };
}

export function getFinishedIds() {
  return Object.keys(state.reads)
    .filter((id) => state.reads[id]?.finishedAt)
    .sort((a, b) => String(state.reads[b].finishedAt).localeCompare(String(state.reads[a].finishedAt)));
}

/* ---------- bookmarks ---------- */

export function isBookmarked(id) {
  return state.bookmarks.includes(id);
}

export function toggleBookmark(article) {
  if (!article) return false;
  const idx = state.bookmarks.indexOf(article.id);
  if (idx >= 0) {
    state.bookmarks.splice(idx, 1);
    persist();
    return false;
  }
  saveSnapshot(article);
  state.bookmarks.unshift(article.id);
  persist();
  return true;
}

/* ---------- words ---------- */

function wordKey(value) {
  return String(value || '').toLowerCase().replace(/[’]/g, "'").trim();
}

export function savedWordKeys() {
  return new Set(state.words.flatMap((w) => [wordKey(w.id), wordKey(w.base), wordKey(w.word)]).filter(Boolean));
}

export function findSavedWord(key) {
  const k = wordKey(key);
  if (!k) return null;
  return state.words.find((w) => wordKey(w.id) === k || wordKey(w.base) === k || wordKey(w.word) === k) || null;
}

export function isWordSaved(key) {
  const k = wordKey(key);
  return state.words.some((w) => wordKey(w.id) === k || wordKey(w.base) === k || wordKey(w.word) === k);
}

export function toggleWord(entry) {
  if (!entry) return { saved: false };
  const key = wordKey(entry.base || entry.word);
  const idx = state.words.findIndex((w) => wordKey(w.id || w.base || w.word) === key || wordKey(w.word) === wordKey(entry.word));
  if (idx >= 0) {
    state.words.splice(idx, 1);
    persist();
    return { saved: false };
  }
  state.words.unshift({
    id: key,
    word: entry.word,
    base: entry.base || key,
    phonetic: entry.phonetic || '',
    meaning: entry.meaning || '',
    translation: entry.translation || '',
    english: entry.english || '',
    articleId: entry.articleId || '',
    articleTitle: entry.articleTitle || '',
    tag: '',
    addedAt: new Date().toISOString(),
  });
  if (state.words.length > MAX_WORDS) state.words.length = MAX_WORDS;
  persist();
  return { saved: true };
}

export function enrichWord(base, patch) {
  const key = wordKey(base);
  const target = state.words.find((w) => wordKey(w.id || w.base || w.word) === key);
  if (!target) return;
  let changed = false;
  for (const field of ['phonetic', 'meaning', 'translation', 'english']) {
    if (!target[field] && patch[field]) {
      target[field] = patch[field];
      changed = true;
    }
  }
  if (changed) persist();
}

export function removeWord(id) {
  const idx = state.words.findIndex((w) => w.id === id);
  if (idx >= 0) {
    state.words.splice(idx, 1);
    persist();
  }
}

export function setWordTag(id, tag) {
  const word = state.words.find((w) => w.id === id);
  if (!word) return false;
  const clean = String(tag || '')
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
  word.tag = clean;
  persist();
  return true;
}

/* ---------- quotes ---------- */

export function addQuote({ text, articleId = '', articleTitle = '' }) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length < 6) return false;
  if (state.quotes.some((q) => q.text === clean && q.articleId === articleId)) return false;
  state.quotes.unshift({
    id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    text: clean,
    articleId,
    articleTitle,
    addedAt: new Date().toISOString(),
  });
  persist();
  return true;
}

export function removeQuote(id) {
  const idx = state.quotes.findIndex((q) => q.id === id);
  if (idx >= 0) {
    state.quotes.splice(idx, 1);
    persist();
  }
}

/* ---------- settings ---------- */

export function setFontSize(size) {
  const value = Math.min(26, Math.max(16, Number(size) || 20));
  state.fontSize = value;
  persist();
  return value;
}
