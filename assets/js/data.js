function normalizeArticle(raw, { daily = false, batchDate = '' } = {}) {
  if (!raw || !raw.id || !raw.title || !Array.isArray(raw.paragraphs) || !raw.paragraphs.length) return null;
  const source = typeof raw.source === 'string'
    ? { name: raw.source, license: '', url: '' }
    : { name: raw.source?.name || '未知来源', license: raw.source?.license || '', licenseLabel: raw.source?.licenseLabel || raw.source?.license || '', url: raw.source?.url || '' };
  const publishedAt = raw.publishedAt || `${raw.date || '2026-01-01'}T08:00:00+08:00`;
  const date = raw.date || String(publishedAt).slice(0, 10);
  return {
    ...raw,
    date,
    publishedAt,
    source,
    category: raw.category || '阅读',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    paragraphs: raw.paragraphs.map((p) => String(p).replace(/\s+/g, ' ').trim()).filter(Boolean),
    external: Boolean(raw.external) || !/编辑部/.test(source.name),
    daily: Boolean(daily || raw.daily),
    batchDate: batchDate || raw.batchDate || '',
  };
}

async function fetchJson(url, { optional = false } = {}) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (optional) return null;
    throw err;
  }
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function loadArticles() {
  const bundled = await fetchJson('data/articles.json');
  if (!Array.isArray(bundled)) throw new Error('文章数据格式不正确');
  const daily = await fetchJson('data/daily/latest.json', { optional: true });
  const dailyArticles = Array.isArray(daily?.articles) ? daily.articles : Array.isArray(daily) ? daily : [];
  const dailyBatchDate = daily?.date || '';

  const map = new Map();
  for (const raw of bundled) {
    const article = normalizeArticle(raw);
    if (article) map.set(article.id, article);
  }
  for (const raw of dailyArticles) {
    const article = normalizeArticle(raw, { daily: true, batchDate: dailyBatchDate });
    if (article) map.set(article.id, article);
  }
  if (!map.size) throw new Error('没有找到可阅读的文章');

  const articles = [...map.values()].sort((a, b) => {
    const diff = String(b.publishedAt).localeCompare(String(a.publishedAt));
    if (diff !== 0) return diff;
    return Number(b.featured || 0) - Number(a.featured || 0);
  });

  return {
    articles,
    byId: new Map(articles.map((a) => [a.id, a])),
    latestDailyDate: daily?.date || null,
  };
}

export function buildIssue(articles) {
  const editorials = articles.filter((a) => !a.external);
  const external = articles.filter((a) => a.external);
  // 期刊容量：当天文章优先，允许 10-30 篇；不足时用编辑部精选补齐
  const ISSUE_SIZE = 30;
  const fresh = articles
    .filter((a) => a.daily)
    .sort(sortNewest)
    .slice(0, ISSUE_SIZE);
  const newestDate = articles.reduce((latest, a) => (a.date > latest ? a.date : latest), '');
  const batchDate = fresh[0]?.batchDate || '';

  const used = new Set();
  const issue = [];
  for (const article of fresh) {
    issue.push(article);
    used.add(article.id);
  }

  if (issue.length < ISSUE_SIZE) {
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    const featured = editorials.find((a) => a.featured);
    const others = editorials.filter((a) => !a.featured).sort(sortNewest);
    const fixed = others.slice(0, 2);
    const rest = others.slice(2);
    const start = rest.length ? dayIndex % rest.length : 0;
    const rotated = [...rest.slice(start), ...rest.slice(0, start)];
    const picks = [featured, ...fixed, ...rotated].filter(Boolean);
    for (const article of picks) {
      if (issue.length >= ISSUE_SIZE) break;
      if (used.has(article.id)) continue;
      issue.push(article);
      used.add(article.id);
    }
  }

  if (issue.length < ISSUE_SIZE) {
    for (const article of articles) {
      if (issue.length >= ISSUE_SIZE) break;
      if (used.has(article.id)) continue;
      issue.push(article);
      used.add(article.id);
    }
  }

  let hero = issue.find((a) => a.featured) || issue[0] || null;
  if (!hero && editorials.length) hero = editorials[0];

  const rest = issue.filter((a) => a.id !== hero?.id);
  const dailyRest = rest.filter((a) => a.daily).sort(sortNewest);
  const editorRest = rest.filter((a) => !a.daily).sort(sortNewest);
  const stream = [];
  for (let i = 0; i < Math.max(dailyRest.length, editorRest.length); i += 1) {
    if (dailyRest[i]) stream.push(dailyRest[i]);
    if (editorRest[i]) stream.push(editorRest[i]);
  }
  const issueSorted = [...(hero ? [hero] : []), ...stream];
  const extra = articles.filter((a) => !used.has(a.id)).sort(sortNewest);

  const today = todayKey();
  let label = '精选刊';
  if (fresh.length) {
    label = batchDate === today ? '今日刊' : '最近一期';
  }

  return {
    hero,
    issue: issueSorted,
    stream,
    extra,
    label,
    issueDate: batchDate || newestDate,
    batchDate,
    freshCount: fresh.length,
  };
}

function sortNewest(a, b) {
  return String(b.publishedAt).localeCompare(String(a.publishedAt));
}

export function categoryOrder(articles) {
  const preferred = ['科学', '文化', '环境', '科技', '健康', '社会', '校园'];
  const present = new Set(articles.map((a) => a.category));
  const ordered = preferred.filter((c) => present.has(c));
  for (const category of present) {
    if (!ordered.includes(category)) ordered.push(category);
  }
  return ordered;
}
