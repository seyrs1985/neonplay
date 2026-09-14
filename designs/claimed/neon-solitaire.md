# Neon Solitaire（neon-solitaire）

> 一句话卖点：**Klondike 纸牌的霓虹零广告版**——3 秒开局、无账号、全站统一的每日挑战+🔥streak，把"日 ritual"级品类做成站内留存发动机。

- **类型**：新游戏
- **评分卡**：搜索需求 5/5 ｜ 竞争空白 2/5 ｜ 变现意图 5/5 ｜ 开发成本低 3/5 ｜ 复访价值 5/5 = **20/25 ✓入队**
  - 搜索需求 5："solitaire" 月搜索 1110 万-1660 万，**Google 全球关键词榜 Top 50 常客**（与 super bowl 同级）
  - 竞争空白 2（诚实分）：头部被 Google 自家内嵌游戏 + Solitaired/Arkadium 占据；空白在长尾（no-ads/unblocked/秒加载变体）
  - 变现意图 5：纸牌玩家是休闲游戏里**会话时长最长、回访最规律**的人群，页面广告库存天然大
  - 复访价值 5：每日 Klondike 是被几十年验证的 ritual 品类
- **红线回答（比 Google 前 3 名多做了什么）**：Google 自家版无任何进度/连击体系，Solitaired 要塞广告位、Arkadium 逼注册——我们零账号零打断，且每日挑战直接点亮**全站共享的 🔥streak**（玩纸牌也在养全站连击），这是单游戏站给不了的。

## 调研依据（真实来源）

- [SE Ranking – Top 100 Google Searches](https://seranking.com/blog/top-google-searches/)："solitaire cardgame" 单词月搜 224 万，solitaire 系词组霸榜
- [Search Engine Land – Google 在搜索结果内嵌 solitaire](https://searchengineland.com/google-rolls-new-solitaire-tic-tac-toe-games-directly-in-search-257547)：需求大到 Google 直接自己做——同时证明流量入口就在搜索框
- [Semrush – bubbleshooter.net 流量](https://www.semrush.com/website/bubbleshooter.net/overview/)：同品类门户月流量结构证明"品类词+长尾"可吃
- 多源交叉（Semrush/Backlinko/Exploding Topics 2026 当期数据）一致给出 solitaire 11.1M-16.6M 月搜

## 同构分析（饱和度）

Klondike 供给极多但两极：大站捆绑注册/广告/下载，小站质量差（无拖拽动画、移动端不可用）。"干净、快、双端、带每日体系"的单机版仍有生态位——本站 18 款游戏无一纸牌，是全站最大品类空白。

## 异构分析（与站内互补）

站内棋类（tic-tac-toe/connect-four）是对抗，word-hive 是词类；**单人纸牌的"长会话+日 ritual"属性**与现有款互补，直接喂饱全站 streak 体系（与 brickstorm-daily/每日数独同一留存框架，np_core 复用）。

## 核心循环

1. 发牌：7 列 tableau（1-7 张，顶张翻开）+ stock/waste + 4 个 foundation
2. 玩家拖牌：列间降序异色叠放、空列只收 K、foundation 升序同花色收 A→K；双击/双触自动飞上 foundation
3. stock 翻牌（抽 1 张模式，无限次循环）；无路可走可提示或重开
4. 全部 52 张上 foundation → 胜利动画（牌雨）→ 计时+步数结算 → 每日挑战同题（日期种子发牌）

## 数值/实现要点

- 52 张牌数据 = `{suit, rank, faceUp}`；规则校验纯函数化（`canDrop(target, cards)`）便于 QA 断言
- DOM 网格布局（复用 connect-four/nonogram 的 DOM 模式），CSS 渲染牌面（rank+suit 字符 ♠♥♦♣，零素材）
- 拖拽：pointer 事件（含 pointercancel）；双击自动上 foundation；无效操作红闪+低鸣（Neon Tide audio 模式）
- 胜利检测 = foundation 计数 52；`np_sol_save` 存每日进度/最佳记录；`np_core` i18n
- `window.__qaState()`：返回 `{stock, waste, foundations, tableau, moves}` 供 QA 断言

## 双端操作

- 触屏：拖牌 + 双触自动上 foundation；牌面/目标区 ≥44px；拖起时禁页面滚动
- 鼠标：同拖拽；键盘（辅助）：Tab 循环选牌、Enter 选中/放置、U 撤销

## 美术方向（霓虹规范）

- `#0a0a18` 深空底；牌面白底霓虹描边（黑桃/梅花 cyan `#00e5ff`，红心/方块 pink `#ff2d95`），牌背 violet `#7c4dff` 斜纹
- 落牌 1 帧 scale 落感、foundation 归位辉光脉冲、胜利全屏牌雨（CSS transform 粒子）
- 零外部素材，全部代码绘制

## 商业化与留存钩子

- 落地页广告位照旧，局内零打断（对大站的核心差异化）
- 留存：每日挑战（固定种子）+ 连胜天数+🃏当日戳 + 与全站 🔥streak 打通 + 最佳记录（最少步数/最短时长）

## SEO 关键词簇

`solitaire free online no ads` / `klondike solitaire play online` / `daily solitaire challenge` / `solitaire unblocked` / `neon solitaire`

## 验收标准

- 375×667 游戏框首屏可玩、拖牌无页面滚动、触屏目标 ≥44px
- 文案全英文进内嵌 `var L={en,zh}` 字典（np_lang 键）；无控制台报错
- `engine/qa_tests/neon-solitaire.mjs`：发牌合法性（28 张 tableau/24 张 stock）→ 列间合法移动 → 双击自动上 foundation → 强制胜利路径 → 牌雨+结算面板，全程 `__qaState` 断言
- 部署前 `node engine/qa_playtest.mjs --slug neon-solitaire` PASS（移动端首屏一票否决照常）
