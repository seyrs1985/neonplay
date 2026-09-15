# Neon Stack（neon-stack）

> 一句话卖点：**休闲友好的霓虹落块消除**——10×20 经典堆叠+消行，40 行冲刺与每日种子两种玩法，移动端滑屏手势原生友好，没有硬核竞技压墙感。

- **类型**：新游戏
- **评分卡**：搜索需求 5/5 ｜ 竞争空白 2/5 ｜ 变现意图 4/5 ｜ 开发成本低 3/5 ｜ 复访价值 4/5 = **18/25 ✓入队**
  - 搜索需求 5："tetris online free" 属常青头部搜索（官方站+克隆海长期霸榜，需求被 40 年文化验证）
  - 竞争空白 2（诚实分）：克隆海密集；空白在"休闲向+移动端手势+每日种子"的组合位
  - 开发成本低 3：重力/旋转(简化 SRS)/消行/计分/等级全是有界实现（~500 行），但比近期方案大
- **红线回答（比官方站与克隆海多做了什么）**：官方站塞账号墙、硬核向 TETR.IO 吓退休闲玩家——我们做**移动端滑动手势原生**（左右滑移动/点按旋转/下滑硬降）+ **40 行冲刺与每日种子两种模式** + 全站 🔥streak 打通 + 霓虹假发光美学，3 秒开局零注册。

## 调研依据（真实来源）

- [Play 官方 Tetris 站](https://play.tetris.com/)：官方免费网页版存在=需求入口直达搜索结果首位
- [CrazyGames Tetris 合集](https://www.crazygames.com/t/tetris)：大量变体长期霸榜=网页端品类持续被消费
- [TETR.IO](https://tetr.io/) / [Jstris](https://jstris.jezevec10.com/)：**40 Lines 冲刺+排行榜**是成熟竞技纪律（40L 世界纪录 ~13.4s）——但都面向硬核社区，休闲移动端供给稀薄
- 高分文化：Twin Galaxies 与 Summoning Salt 纪录片证明该品类记录文化 40 年不衰

## 同构分析（饱和度）

克隆海：N-Blox、GoodOldTetris、OnlineTetris 等几十款，多数广告密集、无移动端手势优化、无每日体系。玩法机制本身属公共领域（落块+消行），需避开 Tetris® 商标与 Tetrimino 专有视觉。

## 异构分析（与站内互补）

站内 36 款中无任何落块堆叠类（block-blast 是拖块放置、brickstorm 是弹球）——这是最后一块最经典的益智街机拼图。与 2048/sudoku 同为"日 ritual"型，接全站 streak 框架顺理成章。

## 核心循环

1. 7 种四格块（简化 SRS 旋转+踢墙）重力下落，铺满整行即消除
2. 消行得分（1/2/3/4 行 = 100/300/500/800 × 等级）、每 10 行升一级（重力加速）
3. 两种模式：**Marathon**（无尽冲分）与 **Sprint 40**（清 40 行计时，站内最快纪录）
4. **每日种子**：UTC 日期哈希出 7-bag 块序，全球同局比冲刺时长

## 数值/实现要点

- 逻辑 10×20 网格、7-bag 随机器、简化踢墙（左右+单次上移）、锁定延迟 0.5s
- 触屏手势：左右滑=移动（网格吸附）、点按=顺时针旋转、下滑=软降、快速下滑=硬降；键盘=方向键+Z/X/Space
- 得分与等级公式经典化；`np_stack_best` 双模式最佳分/最快时长分开存
- `window.__qaState()` → `{board, piece, next, lines, level, score, mode}`；假发光描边（禁 shadowBlur）

## 双端操作

- 触屏：上述四手势，按钮落区 ≥44px；桌面：全键盘（←→↓移动/Z X 旋转/Space 硬降/P 暂停）

## 美术方向（霓虹规范）

- `#0a0a18` 深空底 + 10×20 网格 3% 白线；7 块 7 色（站内色板：cyan/violet/pink/gold/绿/橙/白）+ 消行白闪粒子 + 升级全屏脉冲
- 幽灵块（落点投影）半透明描边；零外部素材

## 商业化与留存钩子

- 落地页广告位照旧；留存：每日种子冲刺榜（本地最快+日期对比）+ 全站 streak + Marathon/Sprint 双模式互相导流

## SEO 关键词簇

`tetris online free no download` / `classic block puzzle game` / `40 lines sprint game` / `daily tetris challenge` / `neon block stacker`

## 验收标准

- 375×667 游戏框首屏可玩、四手势全程无页面滚动、按钮 ≥44px
- 文案全英文进内嵌 `var L={en,zh}`（np_lang 键）；无控制台报错；零外部请求
- `engine/qa_tests/neon-stack.mjs`：7-bag 覆盖 7 种块、旋转踢墙边界、消 1/2/3/4 行计分精确、等级加速、Sprint 40 行结算面板、每日种子两次加载一致（`__qaState` 断言）
- 部署前 `node engine/qa_playtest.mjs --slug neon-stack` PASS（移动端首屏一票否决照常）
