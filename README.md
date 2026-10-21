# 米菲读读 · Miffy Reads

一个米菲配色与手绘风的小小英语阅读角。纯静态 HTML / CSS / JavaScript，无构建步骤，直接部署到 GitHub Pages。

打开首页就是一份排好版的文章流；点开文章可以查词、标注六级词汇、整段翻译、收藏句子、调字号，读完后打卡。所有阅读记录、生词和收藏都保存在浏览器本地。

## 有什么

- **文章流首页**：每天一期，约 10 篇；头条置顶，其余与编辑部精选交错排列。
- **干净的阅读页**：衬线正文、可调字号（16–26px）、阅读进度、上次读到哪儿会记住。
- **六级词虚线标注**：自动标注本地六级词表中的词；正文任意单词也都可以点开查词。
- **生词标记**：收藏过的词会在正文里带一层浅黄色高亮，下次阅读也能看见。
- **查词卡**：中文释义（本地词表）、英文释义（Datamuse）、音标、朗读、加入生词本。
- **整段翻译**：正文每段右上角有「译」按钮，点击后调用 MyMemory 翻译该段，译文显示在段落下方；结果会缓存在本地，重复阅读不重复消耗接口额度。
- **收藏**：收藏文章、选中句子收藏金句。
- **生词本**：搜索、删除、朗读，导出为带 BOM 的 UTF-8 `.txt`。
- **打卡花园**：读完一篇即可打卡，展示连续天数、一年热力图、累计数据和米菲风里程碑。
- **书架**：收藏的文章 / 读完的文章；即使每日文章轮换，也能从本地快照重新打开。
- **移动端**：紧凑的悬浮底部标签栏；手机端隐藏顶部品牌栏，把更多屏幕留给正文；保留字号控件与查词底部抽屉。
- **离线可用的核心**：词表、文章、阅读记录都在本地；英文释义和翻译是增强项。

## 本地预览

因为使用了 `fetch()` 和 ES Modules，不能直接双击 `index.html`。请起一个静态服务器：

```bash
# 任选一种
npx serve .
python -m http.server 4173
```

然后打开 `http://localhost:4173/`。

无 Node 依赖，不需要 `npm install` 来运行站点。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库（公开或私有均可，Pages 可用性取决于你的账户计划）。
2. 把本目录所有文件推到仓库的 `main` 分支。
3. 打开仓库 **Settings → Pages**，Source 选择 **Deploy from a branch**，Branch 选 `main`，目录选 `/ (root)`，保存。
4. 等一两分钟，访问 `https://<你的用户名>.github.io/<仓库名>/`。

页面用的是 hash 路由（`#/read/...`），不需要额外的 404 重写规则，放在子路径下也能正常工作。

## 每天自动更新

仓库包含：

- `scripts/fetch-daily.mjs`：零依赖的 Node 脚本，抓取文章并写入 `data/daily/`。
- `.github/workflows/daily.yml`：每天北京时间 06:10 左右运行，并自动提交新数据。

工作流首次使用前请确认：

- 仓库的 **Actions** 已启用；
- **Settings → Actions → General → Workflow permissions** 允许 **Read and write permissions**（工作流里也声明了 `contents: write`）；
- 需要时可以在 Actions 页面手动点 **Run workflow** 测试。

本地运行抓取脚本需要 Node.js 18+（不需要安装任何依赖）；站点本身不需要 Node。

### 目前的内容源

| 来源 | 许可 | 说明 |
| --- | --- | --- |
| NASA | 公有领域 | 美国联邦机构内容；脚本会清洗页面导航、署名行，并截取正文 |
| The Conversation | CC BY-ND 4.0 | 保留全文与署名，不做内容改写；抓取失败时自动跳过 |
| 编辑部原创 | 本站原创 | `data/articles.json` 中的 8 篇文章 |

抓取脚本会按来源交错、去重，最多取 10 篇；前端再补入精选文章组成约 10 篇的一期。脚本对有内容许可要求的来源保留署名和许可信息，阅读页底部会展示。

**增加内容源**：编辑 `scripts/fetch-daily.mjs` 里的 `SOURCES` 数组，新增一个对象，填入 `feed`、`name`、`license`、`licenseLabel`、`take` 和 `defaultCategory`。请只添加允许再分发全文的 RSS/Atom 源，并遵守对方的署名和许可要求。若某个源失败，脚本会继续处理其他源；全部失败时不会改动数据。

**手动加一篇文章**：直接编辑 `data/articles.json`，或者复制 `data/daily/latest.json` 的结构手动新增每日文件。字段示例：

```json
{
  "id": "ed-example",
  "title": "A Small Essay About Reading",
  "dek": "One sentence that makes you want to read on.",
  "category": "文化",
  "tags": ["阅读"],
  "date": "2026-10-21",
  "publishedAt": "2026-10-21T08:00:00+08:00",
  "source": { "name": "Miffy Reads 编辑部", "license": "原创", "url": "" },
  "cover": "books",
  "accent": "yellow",
  "paragraphs": ["First paragraph...", "Second paragraph..."]
}
```

- `cover` 可选：`flower`、`books`、`leaf`、`pencil`、`orbit`、`cup`、`star`、`wave`、`bulb`。
- `accent` 可选：`pink`、`yellow`、`green`、`blue`、`lilac`、`orange`。
- 外部文章请把 `source.name` 写成来源名，并加上 `external: true`、`source.url` 和正确的 `license`。
- 每日文件格式：`{ "date": "YYYY-MM-DD", "generatedAt": "...", "articles": [...] }`，前端读取 `data/daily/latest.json`。

## 数据与判断规则

- **今日刊**：以 `data/daily/latest.json` 的北京日期为批次日期；当日抓取的文章优先成刊，不足 10 篇时用编辑部文章补足，再交错排列。抓取失败时显示「精选刊」。
- **字号**、生词、句子、收藏、阅读进度、打卡记录和文章快照存在 `localStorage`，键名以 `miffy.` 开头。清除浏览器数据会清空这些记录。
- **打卡**：同一天同一篇文章只计一次；读完按钮触发打卡并记录连续天数。连续天数在当天未打卡时按截至昨天的连续记录展示。
- **生词导出**：导出的 txt 包含序号、单词、音标、释义、来源文章和收录日期；使用 UTF-8 BOM，Windows 记事本打开不乱码。
- **词典与翻译**：中文优先使用本地 CET-6 词表；词表外的词和整段翻译使用 MyMemory 免费接口。英文释义使用 Datamuse（数据来自 Wiktionary，CC BY-SA）。查词/翻译时会把对应文本发送给这些免费接口；不需要 API Key。免费额度有限，段落译文会缓存在 `localStorage` 中。接口不可用时仍然可以查看本地释义和使用词典链接。

## 自定义

- **配色**：`assets/css/style.css` 顶部 `:root` 里的颜色变量。
- **字体**：拉丁字体已自托管在 `assets/fonts/`（SIL Open Font License，许可文件在 `licenses/`）；中文走系统字体，可以在 `--font-ui` / `--font-display` / `--font-read` 中添加。
- **词表**：`data/cet6.json`，格式为 `[word, phonetic, chineseMeaning]`。当前词表来自 [mahavivo/english-wordlists](https://github.com/mahavivo/english-wordlists) 的 CET6 列表，共 2219 条；公开使用前请自行确认词表授权。
- **期数**：`assets/js/data.js` 的 `buildIssue` 决定每日入选与补位逻辑，`slice(0, 10)` 控制每期上限。
- **抓取数量/来源**：`scripts/fetch-daily.mjs`。

## 目录

```
index.html
assets/
  css/style.css
  js/            app.js, art.js, data.js, dict.js, store.js, words.js
  fonts/         自托管 WOFF2 与 SIL OFL 许可
  favicon.svg
data/
  articles.json  编辑部原创文章
  cet6.json      六级词表
  daily/         每日抓取结果（latest.json + 日期归档）
scripts/
  fetch-daily.mjs
.github/workflows/daily.yml
```

## 声明

- 插画为本项目原创绘制的米菲风格致敬作品，与米菲（Miffy / Nijntje）权利方 Mercis bv 无关，也不包含任何官方素材。
- 外部文章按各自许可署名展示；如需公开部署，请确认所选用内容源的使用条款。
- 本项目为个人学习与阅读练习用途，不构成对任何词典、翻译接口或内容源的商业授权。
