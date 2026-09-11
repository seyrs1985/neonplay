# Neon Block Blast（neon-block-blast）

> 一句话卖点：**Block Blast 的霓虹免广告版**——8×8 拖块消行 + 无体力墙 + 每日同题，一局 3 分钟的纯爽解压。

- **类型**：新游戏
- **评分卡**：搜索需求 5/5 ｜ 竞争空白 2/5 ｜ 变现意图 4/5 ｜ 开发成本低 5/5 ｜ 复访价值 4/5 = **20/25 ✓入队**
  - 搜索需求 5：Block Blast 系 2025-2026 全球手游下载量第一（5 亿+），"block blast online / unblocked" 长尾巨大
  - 开发成本低 5：网格+拖拽+消行全是成熟简单算法，复用站内 i18n/存档/QA 心智；零外部素材
- **红线回答（比 Google 前 3 名多做了什么）**：前排全是满屏插屏广告、逼内购、带体力墙的换皮克隆；我们做**零广告打断 + 无体力墙 + 每日同题挑战（复用 brickstorm-daily 的日期种子模式）+ 霓虹视觉**，同一玩法干净 10 倍。

## 调研依据（真实来源）

- [Poki 首页热门](https://poki.com/)：**Blocky Blast Puzzle 4.3★** 位列头部——网页端需求已被验证（2026-09 当期）
- [CrazyGames](https://www.crazygames.com/)：Block Blast 类常驻 Best Games；手机端霸榜进一步教育了搜索需求
- [r/incremental_games 周荐帖](https://www.reddit.com/r/incremental_games/comments/1v1au5f/what_games_are_you_playing_this_week_game/)：玩家对"干净、无骚扰"的网页版有持续表达（对满屏广告克隆的排斥）

## 同构分析（饱和度）

"Block Blast 克隆"在 web 端**数量**饱和，但质量两极：多数带激进广告/盗版素材/无移动端适配。差异化空间在体验质量而非玩法本身——玩法本身无版权问题（消行机制属公共领域，需避开原作的专有美术/名称）。

## 异构分析（站内缺口）

站内 11 款中益智类有 2048（合成）、扫雷（推理）、记忆翻牌（记忆），**唯独缺"拖块空间规划"**这一最大众品类；与 idle-neon-breaker（放置点击）无冲突。拖块消行与 2048 同为"上手 10 秒"型，可互相导流。

## 核心循环

1. 从 3 个候选形状中拖一个到 8×8 盘面（无重力，放哪算哪）
2. 放满整行/整列即消除（多行同消加倍得分），消除带粒子+音效反馈
3. 3 个形状都用完换下一组；任意形状无处可放 → 结束，结算分数+最佳分
4. 每日挑战：固定日期种子出形状序列，全球同题比分数

## 数值/实现要点

- 形状池：经典 19 种（1x1 到 L/T/S/Z/线），按种子洗牌出 3 个一组
- 得分：放置 = 格数分；消 1 行 10 分、同次多行 ×2/×3 递增；连消 combo 计数
- 无重力、无时间压力；游戏结束判定 = 3 形状均无合法位置
- `np_core.js`（npLang/npBest）直接复用；存档键 `nbb_best`、`nbb_daily_best_<date>`

## 双端操作

- 触屏：按住形状拖到盘面（拖起时显示投影落点），目标 ≥44px；拖起时页面禁滚动
- 鼠标：同拖拽；键盘（辅助）：Tab 选形状+方向键移动+Enter 放置

## 美术方向（霓虹规范）

- `#0a0a18` 深空底；8×8 盘面用 rgba 白 3% 格线；形状按类型着 cyan `#00e5ff` / violet `#7c4dff` / pink `#ff2d95` 三色系
- 消行：整行白闪 + 粒子沿行喷射（复用轻量粒子模式）；落块有 1 帧 scale 落感
- 零外部素材，全部 CSS/代码绘制

## 商业化与留存钩子

- 落地页广告位照旧；无插屏（差异化卖点）
- 留存：每日挑战（日期种子）+ 最佳分/每日最佳对比展示 + "Beat yesterday" 文案

## SEO 关键词簇

`block blast online free` / `block blast unblocked` / `block puzzle game no ads` / `block blast daily challenge` / `neon block puzzle`

## 验收标准

- 375×667 游戏框首屏可玩、拖块全程无页面滚动、触屏目标 ≥44px
- 文案全英文进内嵌 `var L={en,zh}` 字典（np_lang 键）
- 无控制台报错；`engine/qa_tests/neon-block-blast.mjs` 脚本化验证：放置→消行→分数递增→无路可放时结算面板弹出
- 部署前 `node engine/qa_playtest.mjs --slug neon-block-blast` PASS（移动端首屏一票否决照常）

已实现:2026-09-11 https://seyrs1985.github.io/neonplay/neon-block-blast/ （MVP全量:19形状/8×8拖块/整行列消除倍率+combo/每日种子同题/离线存档;QA验证放置→双消计分→死局结算全链）
