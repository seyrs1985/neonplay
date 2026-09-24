# Neon Daily Hub（neon-daily-hub）

> 一句话卖点：**全站一个理由天天回来**——首页"Today's Challenges"中枢聚合所有游戏的每日模式与全站 🔥streak：玩哪款都在养同一条连击，Duolingo 效应搬进游戏门户。

- **类型**：现有游戏功能增强（站点级中枢，非新游戏）
- **评分卡**：搜索需求 2/5 ｜ 竞争空白 4/5 ｜ 变现意图 4/5 ｜ 开发成本低 3/5 ｜ 复访价值 5/5 = **18/25 ✓入队**
  - 搜索需求 2（诚实分）：内部功能不靠搜索流量——价值在留存侧
  - 竞争空白 4/5：**游戏门户业内无跨游戏统一每日/streak 体系**（调研证实该模式只存在于单 app 内）
  - 复访价值 5/5：把 18+ 个独立"每日模式"编织成一个 habits 表面——任何一款的每日完成都点亮全站连击
- **红线回答（比游戏门户多做了什么）**：所有门户（Poki/CrazyGames/Armor）的游戏互不相干、无跨游戏目标；我们做 **Duolingo 式中枢**——统一每日挑战清单、跨游戏 🔥streak、里程碑徽章，玩家的"今天任务"横跨整个作品集。留存研究背书：该模式让 Duolingo 日留存翻倍、12%→55%。

## 调研依据（真实来源）

- [Deconstructor of Fun – Duolingo Streaks 解析](https://duolingo.deconstructoroffun.com)：Classic Streaks + Freezes + Friend Streaks 的组合让每日回归"必然发生"，**日留存 ×2**
- [StriveCloud – Duolingo 游戏化案例](https://www.strivecloud.io)：streak+每日任务+联赛让留存 **12%→55%**
- [Xtremepush – 7 大忠诚度机制](https://www.xtremepush.com)：streak/challenges 为跨品类忠诚度驱动器（可迁移至游戏门户）
- [Yu-kai Chou – Streak 设计五步](https://yukaichou.com)：连续行为计数+期望动作的 habit loop 设计框架

## 同构分析（饱和度）

单 app 内的每日/streak 体系（Duolingo/Wordle/Chess.com daily puzzle）已充分验证；**门户级跨游戏聚合**供给几乎为零（大门户各游戏独立运营）。风险：跨游戏数据一致性（各游戏每日 done 的键名/格式不一致）——需注册表收敛。

## 异构分析（与站内互补）

站内已有大量"每日模式"资产：brickstorm-daily / wordle daily / nonogram daily / sudoku daily / link daily / mahjong / typing daily / alchemy daily / stack daily / worms daily... **每个都是孤岛**。中枢把它们变成"一站式每日任务清单"：玩家完成任意 3 个=全站任务达成。这是对已有资产的零素材聚合，边际成本极低而留存杠杆极高。

## 核心循环

1. 首页"Today's Challenges"卡：列出 N 个每日模式（图标+游戏名+完成态✓），每完成一个即场点亮
2. **全站 streak**：`np_streak` 每日完成 ≥1 个挑战即 +1（跨游戏累计，断日清零）；🔥 显示于首页与大厅
3. 里程碑：3/7/14/30 天全站 streak 徽章（⭐🥇👑💎）+ "本周完成 X/Y 挑战"进度条
4. 未来钩子（P2 预留）：streak freeze（断日保护券）+ 完成全部每日的全勤闪光

## 数值/实现要点

- **每日注册表**：games.py 每游戏元数据新增 `daily: {doneKey, check}` 字段（data 驱动，中枢不硬编码游戏名）；现有各游戏每日键逐一接入（wordle/nonogram/sudoku/link/typing/brickstorm/alchemy/stack/worms/runner/td...）
- 中枢面板：首页新 section（桌面横排卡片、移动端纵向紧凑列表）；完成态读取各游戏 `doneKey` 的当日日期比对
- `np_streak` 结构：`{count, lastDate, best}`；`window.__qaState()` → `{streak, todayDone:[...], total}` 全量断言
- 兼容：无每日模式的游戏不进清单；新游戏上线按注册表自动加入

## 双端操作

- 纯浏览型面板（无操作输入）；卡片点击跳对应游戏；移动端紧凑列表首屏不挤占游戏位（游戏框优先原则）

## 美术方向（霓虹规范）

- `#0a0a18` 底上玻璃拟态卡（与聚光灯卡同语言）；未完成挑战 cyan 呼吸点、已完成金色 ✓；streak 🔥 数字 violet 渐变放大
- 全勤日：面板顶部 "PERFECT DAY" 金色闪光；零外部素材

## 商业化与留存钩子

- 本方案**就是**留存钩子本体（Duolingo 效应的直接移植）；落地页广告位照旧

## SEO 关键词簇

无搜索意图（内部功能）——引流价值在回访率对排名的间接增益

## 验收标准

- 375×667 首屏：Today's Challenges 紧凑可见且不挤占游戏位；触屏卡片点击跳转正常
- 文案全英文进内嵌 `var L={en,zh}` + data-i18n（np_lang 键）；无控制台报错
- `engine/qa_tests/neon-daily-hub.mjs`：注册表读取、完成态判定（含跨日重置）、streak 跨日 +1/断日清零（mock 日期）、里程碑徽章切换、全量 `__qaState` 断言
- 部署前 `node engine/qa_playtest.mjs --slug neon-daily-hub`（站点级面板走主页 QA 路径）PASS
