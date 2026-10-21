let wordMap = new Map();
let loaded = false;

export function isWordsReady() {
  return loaded;
}

export async function loadWords() {
  const res = await fetch('data/cet6.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`CET-6 word list failed: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.words)) throw new Error('CET-6 word list is malformed');
  wordMap = new Map();
  for (const [word, phonetic, meaning] of data.words) {
    if (!word) continue;
    wordMap.set(String(word).toLowerCase(), {
      word: String(word),
      phonetic: phonetic || '',
      meaning: meaning || '',
    });
  }
  loaded = true;
  return wordMap.size;
}

export function getEntry(base) {
  if (!base) return null;
  return wordMap.get(String(base).toLowerCase()) || null;
}

function endings(word) {
  const set = new Set();
  if (word.length < 3) return set;
  const add = (value) => {
    if (value && value.length >= 3) set.add(value);
  };
  if (word.endsWith("'s")) add(word.slice(0, -2));
  const rules = [
    [/ies$/, 'y'], [/ied$/, 'y'], [/ves$/, 'f'], [/ves$/, 'fe'],
    [/ing$/, ''], [/ing$/, 'e'], [/ed$/, ''], [/ed$/, 'e'],
    [/es$/, ''], [/s$/, ''],
    [/ly$/, ''], [/er$/, ''], [/er$/, 'e'], [/est$/, ''], [/est$/, 'e'],
  ];
  for (const [re, rep] of rules) if (re.test(word)) add(word.replace(re, rep));
  for (const suffix of ['ed', 'ing', 'er', 'est']) {
    if (!word.endsWith(suffix)) continue;
    const stem = word.slice(0, -suffix.length);
    if (/([bcdfgklmnprstvz])\1$/.test(stem)) add(stem.slice(0, -1));
  }
  return set;
}

export function findBase(token) {
  if (!token) return null;
  const clean = String(token).toLowerCase().replace(/’/g, "'").replace(/^[^a-z]+|[^a-z']+$/g, '');
  if (clean.length < 3) return null;
  if (wordMap.has(clean)) return clean;
  const first = endings(clean);
  for (const candidate of first) if (wordMap.has(candidate)) return candidate;
  for (const candidate of first) {
    for (const second of endings(candidate)) {
      if (wordMap.has(second)) return second;
    }
  }
  return null;
}

const TOKEN_RE = /[A-Za-z]+(?:['’\-][A-Za-z]+)*/g;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeToken(token) {
  return String(token || '').toLowerCase().replace(/’/g, "'").replace(/^[^a-z]+|[^a-z']+$/g, '');
}

export function renderTokenized(text, savedKeys = new Set()) {
  let out = '';
  let last = 0;
  const source = String(text || '');
  for (const match of source.matchAll(TOKEN_RE)) {
    const raw = match[0];
    out += escapeHtml(source.slice(last, match.index));
    const base = findBase(raw);
    const normalized = normalizeToken(raw);
    const saved = Boolean((base && savedKeys.has(base)) || (normalized && savedKeys.has(normalized)));
    if (base || saved) {
      const classes = ['word-token'];
      if (base) classes.push('cet6-word');
      if (!base) classes.push('saved-word');
      if (saved) classes.push('is-saved');
      out += `<button type="button" class="${classes.join(' ')}" data-word="${escapeHtml(raw)}" data-base="${escapeHtml(base || normalized)}" title="点击查词">${escapeHtml(raw)}</button>`;
    } else {
      out += escapeHtml(raw);
    }
    last = match.index + raw.length;
  }
  out += escapeHtml(source.slice(last));
  return out;
}

export function analyzeArticle(article, savedKeys = new Set()) {
  const paragraphs = Array.isArray(article?.paragraphs) ? article.paragraphs : [];
  const bases = new Set();
  for (const paragraph of paragraphs) {
    for (const match of String(paragraph).matchAll(TOKEN_RE)) {
      const base = findBase(match[0]);
      if (base) bases.add(base);
    }
  }
  return {
    count: bases.size,
    bases,
    html: paragraphs.map((p) => renderTokenized(p, savedKeys)),
  };
}

const countCache = new WeakMap();

export function countCet6(article) {
  if (!article || typeof article !== 'object') return 0;
  if (countCache.has(article)) return countCache.get(article);
  const bases = new Set();
  for (const paragraph of article.paragraphs || []) {
    for (const match of String(paragraph).matchAll(TOKEN_RE)) {
      const base = findBase(match[0]);
      if (base) bases.add(base);
    }
  }
  countCache.set(article, bases.size);
  return bases.size;
}

export function splitMeaning(meaning = '') {
  let clean = String(meaning).replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  let pos = '';
  const posMatch = clean.match(/^([a-z]+\.(?:\s*[&/]\s*[a-z]+\.)*)\s*/i);
  if (posMatch) {
    pos = posMatch[1];
    clean = clean.slice(posMatch[0].length).trim();
  }
  const parts = clean
    .split(/\s(?=\d+\.\s)/)
    .map((part) => part.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
  if (!parts.length) return pos ? [pos] : [];
  if (pos) parts[0] = `${pos} ${parts[0]}`;
  return parts;
}

export function wordCount(article) {
  const text = (article?.paragraphs || []).join(' ');
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export function readingMinutes(article) {
  const words = wordCount(article);
  return Math.max(2, Math.round(words / 170));
}
