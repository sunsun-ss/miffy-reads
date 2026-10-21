const CACHE_KEY = 'miffy.dict.cache.v1';
const MAX_CACHE = 160;

let cache = null;
const inFlight = new Map();

function loadCache() {
  if (cache) return cache;
  cache = new Map();
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    if (parsed && typeof parsed === 'object') {
      for (const [key, value] of Object.entries(parsed)) cache.set(key, value);
    }
  } catch { /* ignore */ }
  return cache;
}

function saveCache() {
  try {
    if (cache.size > MAX_CACHE) {
      const entries = [...cache.entries()].sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0));
      while (entries.length > MAX_CACHE) {
        const [key] = entries.shift();
        cache.delete(key);
      }
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(cache)));
  } catch { /* quota is not critical */ }
}

async function fetchJson(url, timeout = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchEnglish(base) {
  const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(base)}&md=dp&max=2`;
  const data = await fetchJson(url);
  if (!Array.isArray(data) || !data.length) return {};
  const entry = data.find((item) => String(item.word || '').toLowerCase() === base) || data[0];
  const defs = [];
  for (const raw of entry.defs || []) {
    const [pos, def] = String(raw).split('	');
    if (def && def.trim()) defs.push({ pos: (pos || '').trim(), def: def.trim() });
    if (defs.length >= 3) break;
  }
  return { defs };
}

async function fetchTranslation(base) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(base)}&langpair=en%7Czh-CN`;
  const data = await fetchJson(url);
  const text = data?.responseData?.translatedText;
  if (typeof text !== 'string' || !text.trim()) return '';
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(text)) return '';
  return text.trim();
}

/* ---------- paragraph translation ---------- */

const PARAGRAPH_CACHE_KEY = 'miffy.translate.cache.v1';
const PARAGRAPH_CACHE_LIMIT = 80;
let paragraphCache = null;

function loadParagraphCache() {
  if (paragraphCache) return paragraphCache;
  paragraphCache = new Map();
  try {
    const parsed = JSON.parse(localStorage.getItem(PARAGRAPH_CACHE_KEY) || '{}');
    if (parsed && typeof parsed === 'object') {
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') paragraphCache.set(key, value);
      }
    }
  } catch { /* ignore */ }
  return paragraphCache;
}

function persistParagraphCache() {
  try {
    const cache = loadParagraphCache();
    while (cache.size > PARAGRAPH_CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
    localStorage.setItem(PARAGRAPH_CACHE_KEY, JSON.stringify(Object.fromEntries(cache)));
  } catch { /* quota is not critical */ }
}

function paragraphKey(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${(hash >>> 0).toString(36)}-${text.length}`;
}

function decodeTranslationEntities(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_, number) => {
      try { return String.fromCodePoint(Number(number)); } catch { return ''; }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return ''; }
    })
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function splitForTranslation(text, max = 420) {
  const sentences = String(text).match(/[^.!?]+[.!?]+["”']?\s*|[^.!?]+$/g) || [String(text)];
  const chunks = [];
  let current = '';
  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const sentence of sentences) {
    if (sentence.length > max) {
      flush();
      let buffer = '';
      for (const word of sentence.trim().split(/\s+/)) {
        if ((buffer ? `${buffer} ${word}` : word).length > max) {
          if (buffer.trim()) chunks.push(buffer.trim());
          buffer = word;
        } else {
          buffer = buffer ? `${buffer} ${word}` : word;
        }
      }
      if (buffer.trim()) chunks.push(buffer.trim());
      continue;
    }
    if (current && current.length + sentence.length > max) flush();
    current += sentence;
  }
  flush();
  return chunks;
}

async function translateChunk(chunk) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en%7Czh-CN`;
  const data = await fetchJson(url, 15000);
  const translated = data?.responseData?.translatedText;
  if (typeof translated !== 'string' || !translated.trim()) {
    throw new Error('翻译服务没有返回内容');
  }
  if (/MYMEMORY WARNING|ALL AVAILABLE FREE TRANSLATIONS|QUERY LENGTH LIMIT|INVALID SOURCE/i.test(translated)) {
    throw new Error('翻译服务免费额度已用完或暂时不可用');
  }
  return decodeTranslationEntities(translated).trim();
}

/**
 * Translate a whole paragraph in sentence-sized chunks (MyMemory limits the
 * length of a single query). Successful results are cached locally so repeat
 * reads do not spend the free API quota again.
 */
export async function translateParagraph(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const cache = loadParagraphCache();
  const key = paragraphKey(clean);
  if (cache.has(key)) return cache.get(key);

  const chunks = splitForTranslation(clean);
  const translatedParts = [];
  for (const chunk of chunks) {
    translatedParts.push(await translateChunk(chunk));
  }
  const translation = translatedParts.join(' ').replace(/\s+/g, ' ').trim();
  cache.set(key, translation);
  persistParagraphCache();
  return translation;
}

/**
 * Look up a word. Chinese content is provided locally by the CET-6 list when
 * available; this adds English definitions, phonetics/audio and a translation
 * fallback for words outside the list.
 */
export async function fetchDetails(base, { needTranslation = true } = {}) {
  const key = String(base || '').toLowerCase();
  if (!key) return {};
  const cached = loadCache().get(key);
  if (cached) return cached;

  if (inFlight.has(key)) return inFlight.get(key);

  const task = (async () => {
    const [english, translation] = await Promise.allSettled([
      fetchEnglish(key),
      needTranslation ? fetchTranslation(key) : Promise.resolve(''),
    ]);
    const result = {
      phonetic: english.status === 'fulfilled' ? english.value.phonetic || '' : '',
      audio: english.status === 'fulfilled' ? english.value.audio || '' : '',
      defs: english.status === 'fulfilled' ? english.value.defs || [] : [],
      translation: translation.status === 'fulfilled' ? translation.value || '' : '',
      ts: Date.now(),
    };
    if (result.phonetic || result.audio || result.defs.length || result.translation) {
      loadCache().set(key, result);
      saveCache();
    }
    return result;
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, task);
  return task;
}

export function speak(text) {
  if (!text || typeof window.speechSynthesis === 'undefined') return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    const voice = window.speechSynthesis.getVoices().find((v) => /^en[-_]/i.test(v.lang) && /natural|google|samantha|aria/i.test(v.name));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function englishSummary(defs = []) {
  return defs
    .slice(0, 3)
    .map((item) => (item.pos ? `${item.pos}. ${item.def}` : item.def))
    .join(' ');
}
