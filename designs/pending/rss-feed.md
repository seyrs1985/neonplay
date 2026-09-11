# 全站新游戏 RSS 订阅（rss-feed）

> 一句话卖点：**把一次性访客变成可召回受众**——每款新游戏自动进 feed，订阅者零成本回流，站内第一次拥有"自有触达通道"。

- **类型**：自有受众通道（build.py 小改，可与 seo-longtail 同轮或独立小轮）
- **来源**：用户运营决策直派（2026-09-11 流水线头脑风暴清单·捕获段）。评分：搜索需求 1 / 竞争空白 2 / 变现意图 1 / 开发成本低 5 / 复访价值 3 = 12/25（基建直派，改动极小）

## 实现

1. build.py 生成 `docs/feed.xml`（RSS 2.0）：条目 = 每款游戏（title/link/desc/pubDate，pubDate 取注册表或 STATUS 中的上线日期），新游戏上线自动出现在 feed
2. 首页 `<head>` 加 `<link rel="alternate" type="application/rss+xml" title="NeonPlay New Games" href="/feed.xml">`
3. footer 加 "RSS" 链接（沿用站点 chrome i18n，data-i18n 补文案）

## 验收标准

- /feed.xml 200、合法 XML、含现有 9 款条目
- 首页 head 与 footer 引用在位；无控制台报错
