#!/usr/bin/env node
/**
 * 每日文章更新脚本（零依赖，Node 18+）
 *
 * 从可再分发的公开内容源抓取文章，生成 data/daily/YYYY-MM-DD.json 与
 * data/daily/latest.json，供纯静态站点读取。
 *
 * 默认来源：
 *  - NASA：美国联邦机构内容，一般属于公有领域
 *  - The Conversation：CC BY-ND 4.0（转载需署名、不得修改）
 *
 * 某个来源抓取失败时会自动跳过；没有任何文章生成时以非零状态退出。
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAILY_DIR = path.join(ROOT, 'data', 'daily');
const USER_AGENT = 'MiffyReads/1.0 (+https://github.com/; personal reading project)';

const SOURCES = [
  {
    id: 'nasa',
    name: 'NASA',
    feed: 'https://www.nasa.gov/feed/',
    license: 'Public Domain',
    licenseLabel: '公有领域',
    allowTrim: true,
    take: 8,
    defaultCategory: '科学',
  },
  {
    id: 'conversation',
    name: 'The Conversation',
    feed: 'https://theconversation.com/us/articles.atom',
    license: 'CC BY-ND 4.0',
    licenseLabel: 'CC BY-ND 4.0',
    allowTrim: false,
    take: 4,
    defaultCategory: '社会',
  },
];

const CATEGORY_STYLE = {
  科学: [{ accent: 'blue', cover: 'star' }, { accent: 'lilac', cover: 'orbit' }, { accent: 'yellow', cover: 'bulb' }],
  环境: [{ accent: 'green', cover: 'leaf' }, { accent: 'blue', cover: 'wave' }],
  科技: [{ accent: 'lilac', cover: 'orbit' }, { accent: 'blue', cover: 'bulb' }, { accent: 'orange', cover: 'pencil' }],
  健康: [{ accent: 'pink', cover: 'flower' }],
  文化: [{ accent: 'yellow', cover: 'books' }, { accent: 'orange', cover: 'cup' }],
  社会: [{ accent: 'orange', cover: 'cup' }, { accent: 'blue', cover: 'books' }],
  校园: [{ accent: 'blue', cover: 'pencil' }, { accent: 'green', cover: 'leaf' }],
};

function styleFor(category, title) {
  const options = CATEGORY_STYLE[category] || CATEGORY_STYLE.科学;
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return options[hash % options.length];
}

const STOP_PARAGRAPH = [
  /^stay up[- ]to[- ]date/i,
  /^for more information/i,
  /^for information about/i,
  /^more information (about|on)/i,
  /^image credit/i,
  /^credits?:/i,
  /^story by/i,
  /^read more/i,
  /^subscribe/i,
  /^follow us/i,
  /^click here/i,
  /^download/i,
  /^watch:/i,
  /^the post .* appeared first on/i,
  /^share this article/i,
  /^republish this article/i,
];

function decodeEntities(input = '') {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’',
    ldquo: '“', rdquo: '”', middot: '·', copy: '©', reg: '®', trade: '™',
  };
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => safeChar(parseInt(n, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

function safeChar(code) {
  try { return String.fromCodePoint(code); } catch { return ''; }
}

function tag(block, name) {
  const open = block.indexOf(`<${name}`);
  if (open < 0) return '';
  const start = block.indexOf('>', open) + 1;
  const end = block.indexOf(`</${name}>`, start);
  return end < 0 ? '' : block.slice(start, end);
}

function attr(block, name, attribute) {
  const m = block.match(new RegExp(`<${name}[^>]*\\b${attribute}=["']([^"']+)["']`, 'i'));
  return m ? m[1] : '';
}

const CREDIT_SENTENCE = [
  /image (by|credit)/i,
  /photo(graph)? (by|credit)/i,
  /illustration (by|credit)/i,
  /story by/i,
  /using .*data from/i,
];

function stripCreditSentences(text) {
  const sentences = text.match(/[^.!?]+[.!?]+["”']?\s*|[^.!?]+$/g) || [text];
  return sentences
    .filter((s) => !CREDIT_SENTENCE.some((re) => re.test(s)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitLongParagraph(text, maxChars = 720) {
  if (text.length <= maxChars) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["”']?\s*|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > maxChars) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function htmlToParagraphs(html) {
  let decoded = decodeEntities(html || '').trim();
  if (/&lt;\/?p&gt;/.test(decoded)) decoded = decodeEntities(decoded);
  decoded = decoded
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, ' ');

  let parts = [...decoded.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
  if (!parts.length) {
    parts = decoded
      .replace(/<(br|\/div|\/li|\/h[1-6]|\/blockquote)[^>]*>/gi, '\n')
      .split(/\n{1,}/);
  }

  const seen = new Set();
  const result = [];
  for (const raw of parts) {
    let text = decodeEntities(raw.replace(/<[^>]+>/g, ' '))
      .replace(/\u00a0/g, ' ')
      .replace(/[\u200b-\u200d\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length < 55) continue;
    if (!/[A-Za-z]{3}/.test(text)) continue;
    if (/^https?:\/\//i.test(text)) continue;
    if (STOP_PARAGRAPH.some((re) => re.test(text))) break;
    text = stripCreditSentences(text);
    if (text.length < 55) continue;
    for (const chunk of splitLongParagraph(text)) {
      const key = chunk.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(chunk);
    }
  }
  return result;
}

function countWords(paragraphs) {
  return paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
}

function trimStory(paragraphs, maxWords = 720) {
  const kept = [];
  let words = 0;
  for (const p of paragraphs) {
    const w = p.split(/\s+/).filter(Boolean).length;
    if (words + w > maxWords && kept.length >= 6) break;
    kept.push(p);
    words += w;
    if (kept.length >= 14) break;
  }
  return kept;
}

function makeDek(paragraphs, fallback = '') {
  const first = paragraphs.find((p) => !/^editor[’']s note/i.test(p)) || fallback;
  if (!first) return '';
  const clean = first.replace(/\s+/g, ' ').trim();
  if (clean.length <= 180) return clean;
  const cut = clean.slice(0, 175);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (stop > 60 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '') + '…');
}

function guessCategory(title, rawCats, fallback) {
  const hay = `${title} ${rawCats}`.toLowerCase();
  const rules = [
    ['环境', /(earth|climate|cyclone|ocean|weather|water|flood|glacier|ecosystem|environment|wildfire|atmosphere)/],
    ['健康', /(health|medicine|medical|sleep|brain|disease|vaccine|nutrition|psycholog)/],
    ['校园', /(university|college|student|school|campus)/],
    ['科学', /(space|astronom|telescope|galaxy|planet|mars|moon|webb|hubble|physics|biology|rocket|research)/],
    ['科技', /(technology|engineering|engineer|robot|software|artificial intelligence|\bai\b|nuclear|aircraft|spacecraft|satellite|laser|semiconductor|helicopter|rover)/],
    ['社会', /(society|politics|policy|economy|education|community|law\b|cities|urban|accords)/],
    ['文化', /(culture|art\b|history|book|literature|music|museum|film|architecture)/],
  ];
  for (const [cat, re] of rules) if (re.test(hay)) return cat;
  return fallback;
}

function slugify(title) {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 58);
}

function shanghaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

function toIso(value, fallback = new Date()) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback.toISOString() : d.toISOString();
}

function extractItems(xml, source) {
  const isAtom = /<entry[\s>]/.test(xml);
  const blocks = isAtom
    ? [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0])
    : [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]);

  const items = [];
  for (const block of blocks) {
    const title = decodeEntities(tag(block, 'title')).replace(/\s+/g, ' ').trim();
    if (!title) continue;
    let link = decodeEntities(tag(block, 'link')).trim();
    if (!link) {
      link = attr(block, 'link', 'href') || decodeEntities(tag(block, 'guid')).trim();
    }
    if (!/^https?:\/\//.test(link)) continue;

    const rawCats = [...block.matchAll(/<(?:category|dc:subject)(?:\s[^>]*)?>([\s\S]*?)<\/(?:category|dc:subject)>/gi)]
      .map((m) => decodeEntities(m[1]))
      .join(', ');

    const contentRaw = isAtom
      ? (tag(block, 'content') || tag(block, 'summary'))
      : (tag(block, 'content:encoded') || tag(block, 'description'));
    const summaryRaw = isAtom ? tag(block, 'summary') : tag(block, 'description');

    const paragraphs = htmlToParagraphs(contentRaw || summaryRaw);
    if (!paragraphs.length) continue;
    const words = countWords(paragraphs);
    if (words < 140) continue;

    const titleIsApod = /^APOD\b/i.test(title);
    if (titleIsApod) continue;

    const dateRaw = isAtom
      ? (tag(block, 'published') || tag(block, 'updated'))
      : (tag(block, 'pubDate') || tag(block, 'dc:date'));
    const publishedAt = toIso(decodeEntities(dateRaw));

    const category = guessCategory(title, rawCats, source.defaultCategory);
    const finalParagraphs = source.allowTrim
      ? trimStory(paragraphs)
      : paragraphs.slice(0, 24);

    const cleanTitle = decodeEntities(title).replace(/\s*[|–-]\s*NASA.*$/i, '').trim();
    const dekSource = decodeEntities(summaryRaw.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const dek = makeDek(finalParagraphs, dekSource.length > 30 ? dekSource : '');

    items.push({
      id: `${source.id}-${slugify(cleanTitle)}`,
      title: cleanTitle,
      dek,
      category,
      tags: [source.name],
      date: publishedAt.slice(0, 10),
      publishedAt,
      source: {
        name: source.name,
        license: source.license,
        licenseLabel: source.licenseLabel,
        url: link,
      },
      cover: styleFor(category, cleanTitle).cover,
      accent: styleFor(category, cleanTitle).accent,
      paragraphs: finalParagraphs,
      external: true,
    });
  }
  return items;
}

async function fetchFeed(source) {
  const res = await fetch(source.feed, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const items = extractItems(xml, source);
  if (!items.length) throw new Error('no usable items');
  return items.slice(0, source.take * 2);
}

function interleave(pools, limit = 10) {
  const picked = [];
  const seen = new Set();
  const take = (item) => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    picked.push(item);
    return true;
  };
  const queues = pools.map((p) => p.slice());
  let added = true;
  while (picked.length < limit && added) {
    added = false;
    for (const q of queues) {
      if (picked.length >= limit) break;
      if (q.length && take(q.shift())) added = true;
    }
  }
  if (picked.length < limit) {
    const rest = pools.flat().filter((x) => !seen.has(x.id));
    rest.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    for (const item of rest) {
      if (picked.length >= limit) break;
      take(item);
    }
  }
  return picked
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}

async function updateIndex(date) {
  const indexPath = path.join(DAILY_DIR, 'index.json');
  let index = { dates: [] };
  try {
    index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    if (!Array.isArray(index.dates)) index = { dates: [] };
  } catch { /* first run */ }
  if (!index.dates.some((d) => (typeof d === 'string' ? d : d.date) === date)) {
    index.dates.unshift({ date, generatedAt: new Date().toISOString() });
  }
  index.dates.sort((a, b) => String(b.date || b).localeCompare(String(a.date || a)));
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2) + '\n');
}

async function main() {
  await fs.mkdir(DAILY_DIR, { recursive: true });
  const pools = [];
  const failed = [];

  for (const source of SOURCES) {
    try {
      const items = await fetchFeed(source);
      pools.push(items);
      console.log(`[ok] ${source.name}: ${items.length} 篇候选`);
    } catch (err) {
      failed.push(source.name);
      console.warn(`[skip] ${source.name}: ${err.message}`);
    }
  }

  let articles = interleave(pools, 10);
  if (!articles.length) {
    console.error('没有抓到可用文章，保留现有数据。');
    process.exitCode = 1;
    return;
  }

  articles = articles.map((a, i) => ({ ...a, order: i }));
  // 文件名与前端「今日刊」判断统一按北京时间，避免 UTC 与本地日期错位。
  const date = shanghaiDateKey();
  const payload = {
    generatedAt: new Date().toISOString(),
    date,
    failedSources: failed,
    articles,
  };

  const dayFile = path.join(DAILY_DIR, `${date}.json`);
  await fs.writeFile(dayFile, JSON.stringify(payload, null, 2) + '\n');
  await fs.writeFile(path.join(DAILY_DIR, 'latest.json'), JSON.stringify(payload, null, 2) + '\n');
  await updateIndex(date);

  console.log(`[done] ${articles.length} 篇文章已写入 ${path.relative(ROOT, dayFile)} 与 latest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
