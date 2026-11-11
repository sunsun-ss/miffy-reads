const PHRASE_URL = 'data/phrases.json';
const GAP_MAX = 4;
const WORD_RE = /[A-Za-z]+(?:['’\-][A-Za-z]+)*/g;
const SPACE_ONLY = /^\s+$/;

let entries = [];
let loaded = false;

const IRREGULAR = {
  be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
  have: ['has', 'had', 'having'],
  do: ['does', 'did', 'done', 'doing'],
  take: ['took', 'taken', 'taking'],
  make: ['made', 'making'],
  give: ['gave', 'given', 'giving'],
  get: ['got', 'gotten', 'getting'],
  come: ['came', 'coming'],
  go: ['went', 'gone', 'going'],
  find: ['found', 'finding'],
  keep: ['kept', 'keeping'],
  lead: ['led', 'leading'],
  bring: ['brought', 'bringing'],
  hold: ['held', 'holding'],
  run: ['ran', 'running'],
  stand: ['stood', 'standing'],
  pay: ['paid', 'paying'],
  think: ['thought', 'thinking'],
  see: ['saw', 'seen', 'seeing'],
  become: ['became', 'becoming'],
  grow: ['grew', 'grown', 'growing'],
  know: ['knew', 'known', 'knowing'],
  break: ['broke', 'broken', 'breaking'],
  choose: ['chose', 'chosen', 'choosing'],
  fall: ['fell', 'fallen', 'falling'],
  rise: ['rose', 'risen', 'rising'],
  show: ['showed', 'shown', 'showing'],
  write: ['wrote', 'written', 'writing'],
  lose: ['lost', 'losing'],
  meet: ['met', 'meeting'],
  spend: ['spent', 'spending'],
  build: ['built', 'building'],
  sell: ['sold', 'selling'],
  teach: ['taught', 'teaching'],
  tell: ['told', 'telling'],
  understand: ['understood', 'understanding'],
  wear: ['wore', 'worn', 'wearing'],
  win: ['won', 'winning'],
  put: ['putting'],
  cut: ['cutting'],
  set: ['setting'],
  seek: ['sought', 'seeking'],
  buy: ['bought', 'buying'],
  catch: ['caught', 'catching'],
  fight: ['fought', 'fighting'],
  hear: ['heard', 'hearing'],
  leave: ['left', 'leaving'],
  mean: ['meant', 'meaning'],
  send: ['sent', 'sending'],
  strike: ['struck', 'striking'],
};

const BASE_OF = new Map();
for (const [base, forms] of Object.entries(IRREGULAR)) {
  for (const form of forms) BASE_OF.set(form, base);
}

function normalizeWord(value) {
  return String(value || '').toLowerCase().replace(/’/g, "'");
}

function parsePattern(phrase) {
  return String(phrase).trim().split(/\s+/).filter(Boolean).map((raw) => {
    if (raw === '*') return { gap: true };
    return { word: normalizeWord(raw) };
  });
}

function displayLabel(phrase) {
  return String(phrase).replace(/\s*\*\s*/g, ' … ').replace(/\s+/g, ' ').trim();
}

function inflectionBases(word) {
  const out = new Set();
  if (word.length < 4) return out;
  if (word.endsWith('ies')) out.add(`${word.slice(0, -3)}y`);
  if (word.endsWith('ves')) {
    out.add(`${word.slice(0, -3)}f`);
    out.add(`${word.slice(0, -3)}fe`);
  }
  if (word.endsWith('ied')) out.add(`${word.slice(0, -3)}y`);
  if (word.endsWith('es')) out.add(word.slice(0, -2));
  if (word.endsWith('s') && !word.endsWith('ss')) out.add(word.slice(0, -1));
  if (word.endsWith('ed')) {
    out.add(word.slice(0, -2));
    out.add(word.slice(0, -1));
  }
  if (word.endsWith('ing')) {
    out.add(word.slice(0, -3));
    out.add(`${word.slice(0, -3)}e`);
  }
  const doubled = word.match(/^(.+?)([bcdfgklmnprstvz])\2(?:ed|ing|er|est)$/);
  if (doubled) out.add(`${doubled[1]}${doubled[2]}`);
  out.delete(word);
  return out;
}

function sameWord(patternWord, textWord) {
  if (patternWord === textWord) return true;
  if (BASE_OF.get(textWord) === patternWord) return true;
  for (const base of inflectionBases(textWord)) {
    if (base === patternWord) return true;
  }
  return false;
}

function tokenize(text) {
  const tokens = [];
  for (const match of String(text).matchAll(WORD_RE)) {
    tokens.push({
      raw: match[0],
      lower: normalizeWord(match[0]),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

function matchAt(source, tokens, index, pattern, patternIndex, previous) {
  if (patternIndex >= pattern.length) return index;
  const part = pattern[patternIndex];
  if (part.gap) {
    let cursor = index;
    let prev = previous;
    for (let count = 1; count <= GAP_MAX; count += 1) {
      if (cursor >= tokens.length) break;
      if (prev && !SPACE_ONLY.test(source.slice(prev.end, tokens[cursor].start))) break;
      prev = tokens[cursor];
      cursor += 1;
      const end = matchAt(source, tokens, cursor, pattern, patternIndex + 1, prev);
      if (end > 0) return end;
    }
    return -1;
  }
  if (index >= tokens.length) return -1;
  if (previous && !SPACE_ONLY.test(source.slice(previous.end, tokens[index].start))) return -1;
  if (!sameWord(part.word, tokens[index].lower)) return -1;
  return matchAt(source, tokens, index + 1, pattern, patternIndex + 1, tokens[index]);
}

function overlaps(a, b) {
  return a.start < b.end && a.end > b.start;
}

export function isPhrasesReady() {
  return loaded;
}

export async function loadPhrases() {
  try {
    const res = await fetch(PHRASE_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`phrase list failed: ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.phrases;
    if (!Array.isArray(list)) throw new Error('phrase list is malformed');
    entries = list
      .filter((item) => item && item.phrase && item.meaning)
      .map((item) => ({
        key: item.phrase,
        phrase: item.phrase,
        label: displayLabel(item.phrase),
        meaning: item.meaning,
        usage: item.usage || '',
        example: item.example || '',
        exampleZh: item.exampleZh || '',
        pattern: parsePattern(item.phrase),
        words: parsePattern(item.phrase).length,
      }))
      .sort((a, b) => b.words - a.words || a.phrase.localeCompare(b.phrase));
    loaded = true;
  } catch (error) {
    console.warn('Phrase list unavailable:', error);
    entries = [];
  }
  return entries.length;
}

export function findPhraseMatches(text) {
  const source = String(text || '');
  if (!loaded || !entries.length) return [];
  const tokens = tokenize(source);
  if (tokens.length < 2) return [];
  const found = [];
  for (const entry of entries) {
    if (entry.pattern.length > tokens.length) continue;
    for (let i = 0; i < tokens.length; i += 1) {
      const end = matchAt(source, tokens, i, entry.pattern, 0, null);
      if (end > i) {
        found.push({
          start: tokens[i].start,
          end: tokens[end - 1].end,
          entry,
        });
      }
    }
  }
  found.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  const chosen = [];
  for (const match of found) {
    if (chosen.some((other) => overlaps(other, match))) continue;
    chosen.push(match);
  }
  chosen.sort((a, b) => a.start - b.start);
  return chosen;
}

export function phraseSummary(entry) {
  return {
    key: entry.key,
    phrase: entry.label,
    meaning: entry.meaning,
    usage: entry.usage,
    example: entry.example,
    exampleZh: entry.exampleZh,
  };
}
