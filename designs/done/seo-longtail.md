# 程序化 SEO 长尾落地页（seo-longtail）

> 一句话卖点：**把已经写进设计文档的关键词簇变成页面**——每个意图查询一个专属落地页（"Ball x Pit browser alternative"直答这个意图），即时可玩，收割已被爆款教育好的搜索需求。

- **类型**：分发基建（build.py + games.py 代码变更）
- **来源**：用户运营决策直派（2026-09-11 流水线头脑风暴清单·分发段）。评分：搜索需求 4 / 竞争空白 3 / 变现意图 4 / 开发成本低 3 / 复访价值 1 = 15/25（基建直派）
- **差异化红线回答**：换皮克隆聚合站每游戏一个通用页；我们按搜索意图出变体页——alternative 页直接做同类对比、机制页直接讲差异点，配即时可玩，比 Google 前 3 名的"列表页+跳转"少两跳

## 范围（先小后大）

**首批只做 Brickstorm**（关键词簇现成：designs/done/brickstorm.md 第三节）：`ball x pit browser alternative`、`games like ball x pit free`、`vampire survivors breakout online` 三页。验证收录与点击后再铺全站。

## 实现

1. games.py 每款游戏新增 `variants` 字段：`[{kw_slug, title, desc, intro, faqs}]`——每页独立文案，**每页 unique 内容 ≥150 词**（该意图下的对比/怎么玩/FAQ），禁止纯模板薄页（doorway 风险）
2. build.py 生成变体页：复用现有落地页骨架 + 同一可玩 iframe + 页面互链（落地页 ↔ 变体页，落地页加"更多玩法入口"区块）
3. sitemap.xml 收录全部变体页；部署后跑 `python engine/ping_indexnow.py`

## 验收标准

- 变体页 URL 200、已进 sitemap、含 unique 文案与可玩 iframe
- 375×667：游戏框首屏可见、无横向滚动
- games.py 追加后 `python -c "import games"` 通过（LESSONS.md 第 1 条）

已实现:2026-09-11 https://seyrs1985.github.io/neonplay/brickstorm/ball-x-pit-browser-alternative/ 等3页（首批仅Brickstorm按方案范围执行;变体页200/进sitemap/独特文案234-211词/可玩iframe;后续视收录与点击再铺全站）
