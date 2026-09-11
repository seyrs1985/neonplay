# Neon Block Jam (neon-block-jam)

> 一句话卖点：**无计时器的 Color Block Jam**——滑动霓虹方块穿过同色闸门，没有倒计时、没有广告墙、没有体力条，只有纯粹的排序解谜和无限撤销。

- **缝合来源**：Unblock Me / Rush Hour（正交滑块 + 网格拥堵）+ Color Block Jam（颜色闸门 + 出场顺序谜题）[+ Wordle 式每日一关（P2 留存钩子）]
- **目标玩家**：25-45 岁休闲解谜主力（Color Block Jam 核心画像，女性偏多）；被计时器/广告劝退的原 CBJ 玩家（Reddit 明示在找替代品）
- **单局时长**：30 秒-3 分钟/关；10 关渐进 + 每日一关（P2）

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——搜 "color block jam online" 的前 3 名全是带计时器+插屏广告的原版 HTML5 嵌入（GameDistribution 官方 embed 及门户镜像）。本作：

1. **无计时器、无失败惩罚、无广告墙**——直接解决 Reddit 上真实存在的未满足需求：r/puzzlevideogames 有玩家发帖求"和 Color Block Jam 一样但去掉计时器"（原话：核心解谜 "soothing and mind numbing"，但 "the timer causes a lot of anxiety"）；r/SwagBucks 同类讨论获 307 赞；有玩家 "paid for no ads"。→ 满足红线"解决 Reddit/Quora 上有人抱怨找不到好方案的问题"。
2. **无限撤销 + 步数星级**——用"复读式学习"替代"逼氪提示"：做错不惩罚，冲三星才需要优化。原版用卡关卖提示，我们反着设计。
3. **组合创新**——满足红线"组合两个已有玩法"：Rush Hour 的滑块手感 × CBJ 的彩门顺序谜题，再加网页原生特性（秒开零下载、键盘可达、免登录进度存档）。

## 一、调研依据（2026-09-11）

### 需求挖掘（本轮新增动作）
| 来源 | 原声 | 信号 |
|---|---|---|
| [r/puzzlevideogames 求荐帖](https://www.reddit.com/r/puzzlevideogames/comments/1ibozjo/can_anyone_recommend_a_game_identical_to_color/) | "Can anyone recommend a game identical to Color Block Jam [without the timer]… the timer causes a lot of anxiety" | 精准需求，无 web 供给 |
| [r/SwagBucks 讨论串](https://www.reddit.com/r/SwagBucks/comments/1f0z7k6/beware_wood_blocks/) | 求 "Color Block Jam without a timer" 的讨论 307 赞 | 需求规模 |
| [r/AndroidGaming 无广告求荐帖](https://www.reddit.com/r/AndroidGaming/comments/1lji8jc/seeking_pleasant_challenging_puzzle_games_no_ads/) | "Seeking pleasant challenging puzzle games — no ads" | zen 定位有受众 |
| r/FreeCash 用户评论 | "I paid for no ads" | 广告痛点真实 |

### 热门拆解
| 游戏 | 核心循环 | 操作 | 节奏/商业化 |
|---|---|---|---|
| **Color Block Jam**（Rollic/Gybe，2025-2026 最热休闲解谜，美区 iOS 畅销 Top50） | 滑动彩块让同色块从同色闸门出场 → 过关 → 下一关难度递增 | 纯拖拽 | 单关 1-3 分钟；计时器+卡关卖提示+插屏 |
| **Unblock Me / Rush Hour 类**（常青 sliding puzzle） | 挪开挡路块让目标块到出口 | 拖拽 | 单关 30 秒；经典无计时模式受欢迎 |
| **Block Slide 等 web 克隆**（zapgames 等门户） | 复刻 CBJ | 拖拽 | 换皮无差异；依赖 portal 流量 |

### 同构分析（饱和度）
- CBJ 的 web 供给 = **原版嵌入**（[GameDistribution 官方 embed](https://gamedistribution.com/games/color-block-jam/)，各 "unblocked" 镜像站多为此源）+ **换皮克隆**（[Block Slide](https://zapgames.io/block-slide)、GirlsGoGames/GamesGames 版）——全都带计时器/广告，卷的是 portal 分发而非体验。
- 移动端竞品（Block Slider: Color Jam、Move the Block 等）卷关卡数量与主题皮肤。
- **"无计时 zen 版"在 web 端零供给**，而需求帖就挂在那。机会窗口：做 Google 结果里唯一"no timer"定位的那一个。

### 异构分析（NeonPlay 现有 10 款的缺口）
现状：躲避×2（Neon Tide / Flappy Dash）、街机×2（Snake / Breakout）、静态益智×4（2048 / Minesweeper / Memory Pairs / Tic Tac Toe）、roguelite×1（Brickstorm）。
- **缺口：无关卡制游戏**——现有所有游戏都是单盘面/无尽模式，没有"第 1 关→第 N 关+星级收集"的进度型产品，D1 回访靠新鲜感而非完成度。
- 本作补上**关卡进度+星级**模型，受众（纯解谜、低 APM、偏女性）与现有动作向玩家互补。

### 组合为何成立
- 滑块是全民操作，零教学成本；彩门引入"顺序"维度，让拥堵从"挪开就行"升级为"谁先走"的规划谜题——两个机制天然咬合（闸门=带颜色的出口墙）。
- 程序规则极简（网格+矩形+颜色判断），无物理引擎、无动画状态机复杂度，是全站实现风险最低的新品类。
- zen 定位与站内高刺激动作游戏形成节奏互补，拉长全站会话时长。

---

## 二、玩法设计

### 规则（MVP 全部规则，共 5 条）
1. 6×6 网格；方块为 1×1 或 2×1（横向/纵向），各带一种颜色。
2. 点选方块后沿轴向拖动/按键滑动（一次一格，可连滑）；路径上不能穿过其他方块。
3. **闸门**（door）位于外框上的开口，带颜色：**异色方块不能进入闸门格**（视为墙）；**同色方块的任一格进入闸门格即整块消失**。
4. 场上方块全部清空 = 过关。步数 ≤ par 得 3★，≤ par+2 得 2★，通关 1★。
5. 无计时器。撤销无限次、免费；重开本关随时可用。

### 核心循环（4 步）
1. **观察**：识别拥堵中心与各色闸门位置，判断出场顺序。
2. **腾挪**：先送"挡路的块"出场，给中心块让路（门墙逼你排顺序）。
3. **清场**：同色块滑入闸门逐个消失，连消有粒子反馈。
4. **结算**：步数对比 par 出星级 → 下一关 / 重打冲三星。

### 关卡数据（10 关，已脚本验证：L1-L5 为 BFS 最优解，L6-L10 为已验证可行解，par=参考步数）

坐标系：col 0-5 左→右，row 0-5 上→下。闸门记法 `[边, 索引]`：`T/i`=顶行第 i 列 → 格 (i,0)；`B/i`=底行 → (i,5)；`L/i`=左列 → (0,i)；`R/i`=右列 → (5,i)。

```js
// doors: 颜色 -> [[边,索引],...]；blocks: [颜色, col, row, w, h]
const LEVELS = [
 {par:1,  doors:{A:[['R',3]]}, blocks:[['A',2,3,1,1]]},
 {par:3,  doors:{B:[['L',0]],A:[['R',4]]}, blocks:[['B',4,4,1,1],['A',1,4,1,1]]},
 {par:3,  doors:{A:[['R',1]],B:[['L',3]],C:[['T',2]]}, blocks:[['A',0,1,2,1],['B',4,3,1,1],['C',2,4,1,1]]},
 {par:4,  doors:{A:[['R',2]],B:[['L',5]],C:[['T',3]]}, blocks:[['A',3,2,1,1],['B',4,2,1,1],['C',3,4,1,1]]},
 {par:7,  doors:{A:[['T',1]],B:[['B',4]],C:[['L',2]],D:[['R',0]]}, blocks:[['A',1,2,1,2],['B',4,4,1,1],['C',3,1,1,1],['D',0,0,1,1]]},
 {par:7,  doors:{A:[['R',2]],B:[['T',1]],C:[['B',4]],D:[['T',3]],E:[['B',2]]}, blocks:[['A',2,2,1,1],['B',1,1,1,1],['C',2,3,1,1],['D',3,2,1,1],['E',0,1,1,1]]},
 {par:8,  doors:{A:[['T',0]],B:[['B',5]],C:[['R',3]],D:[['L',1]],E:[['B',1]]}, blocks:[['A',2,2,1,1],['B',4,1,1,1],['C',3,3,1,1],['D',1,4,1,1],['E',0,5,1,1]]},
 {par:11, doors:{A:[['R',1]],B:[['T',5]],C:[['L',3]],D:[['B',0]],E:[['T',2]],F:[['B',3]]}, blocks:[['A',3,1,1,1],['B',5,3,1,1],['C',2,4,1,1],['D',0,4,1,1],['E',1,2,1,1],['F',2,3,1,1]]},
 {par:11, doors:{A:[['R',1]],B:[['T',5]],C:[['L',3]],D:[['B',0]],E:[['T',2]],F:[['B',3]]}, blocks:[['A',4,1,1,1],['B',5,4,1,1],['C',2,3,1,1],['D',1,4,1,1],['E',1,3,1,1],['F',2,4,1,1]]},
 {par:13, doors:{A:[['R',1]],B:[['T',5]],C:[['L',3]],D:[['B',0]],E:[['T',2]],F:[['B',3]],G:[['B',4]]}, blocks:[['A',4,1,1,1],['B',5,4,1,1],['C',2,3,1,1],['D',1,4,1,1],['E',1,3,1,1],['F',2,4,1,1],['G',3,2,1,1]]},
];
```

L6 示意图（理解门墙与排序）：
```
          [B门]      [D门]        ← 顶部开口 col1/col3
      c0   c1   c2   c3   c4   c5
 r0   .    .    .    .    .    .
 r1   E    .    .    .    .    .
 r2   .    .    A    D    .   [A门]
 r3   .    .    C    .    .    .
 r4   .    .    .    .    .    .
 r5   .    .  [E门]   .  [C门]   .
```
参考解（7 步）：B↑出门 → D↑出门 → A→出门 → C→↓出门 → E→↓出门。注意 E 若先动会被 B 挡住、A 必须等 D 离开 (3,2)——顺序就是谜题。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 点选方块高亮 → 沿轴向拖动，逐格吸附；非法位移红闪回弹；`touch-action:none` |
| 鼠标 | 同触屏（点选+拖动）；再点空白或 Esc 取消选择 |
| 键盘 | 方向键移动光标框选方块 → Enter 确认 → 方向键逐格滑动 → Enter 确认/再次 Enter 取消；U=撤销，R=重开 |

### 美术方向（霓虹色板）
- 底 `#0a0a18` 深空 + 呼吸网格；棋盘玻璃拟态面板（复用 2048/Memory Pairs 规范）。
- 方块四色霓虹：A 青 `#00e5ff`、B 品红 `#ff2d95`、C 琥珀 `#ffd54a`、D 石灰 `#a8ff60`、E/F/G 沿用色轮（紫 `#7c4dff`、橙 `#ff9e40`、绿 `#39ff88`）。
- 闸门=外框上的同色发光缺口（box-shadow glow + 缺口呼吸动画），提示"同色才可出"。
- 反馈：选中块辉光抬升、滑动 lerp 缓动+拖尾、消块粒子迸发+缺口闪光、三星结算星芒；全站零外部素材惯例。

### 商业化
- **广告位**：落地页构建器默认注入位（页头横幅）照旧；过关面板预留"看广告获取提示（高亮下一步）"激励位**注释结构**，AdSense 接入后启用——注意：提示用步数Hints（每关 3 次免费）双轨，不做广告墙。
- **留存钩子**：星级收集（回冲低星关）+ 全关卡进度 localStorage 免登录续玩 + 连消 combo 飘字 + 每日一关（固定种子生成，P2）+ 分享关卡码（`?lv=BASE64`，P2）。

---

## 三、SEO

**关键词簇**：`color block jam online free` / `block jam no timer` / `block jam unblocked` / `sliding color block puzzle` / `relaxing block puzzle no ads` / `unblock puzzle game online`。标题建议：`Neon Block Jam — Free Online Color Block Puzzle (No Timer)`。长尾打点：Google 前 3 全带计时器，"no timer" 修饰词构成差异化抓取点。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Neon Block Jam?** — A free browser sliding puzzle: slide neon blocks through their matching color gates until the board is clear. No download, no signup.
2. **Is there a timer or lives?** — No. It's deliberately timer-free with unlimited free undo; the only "score" is a move count vs par for stars.
3. **Can I play on mobile?** — Yes, touch-drag controls, responsive layout, works offline-friendly in any modern browser; keyboard is fully supported on desktop.
4. **How do I get 3 stars?** — Finish at or under par. Tip: clear the blocks that block others' gates first, and keep the center open as long as possible.

落地页同款要求：VideoGame schema、game-first 首屏、面包屑、推荐位挂 2048 与 Minesweeper（解谜向互链）。

---

## 四、MVP 范围（开发 Agent 一轮 ≤15 分钟）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；棋盘 6×6 canvas 或 DOM 网格皆可（DOM 更省时：CSS grid + transform 动画）。
- 上文 10 关数据原样粘贴（已验证，勿改动坐标）；关卡选择页（网格缩略图+星星）+ 线性解锁（通关 i 解锁 i+1，星级不锁）。
- 5 条规则完整实现；撤销栈 + 重开 + 过关面板（星级/下一关）+ 进度 localStorage（`np_nbj_progress`）。
- 消块粒子 + 选中辉光 + 非法红闪；游戏内文案走内嵌 L 字典 + `localStorage.np_lang`（首版英文即可，键位预留 zh，与站点🌐联动）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位。

**不做（明确砍掉）**：每日一关、关卡码分享、Hints 提示系统、音效、成就、额外关卡包。
**超时降级顺序**：先砍星级（只留通关进度）→ 再砍键盘光标模式（保触屏/鼠标拖动）→ 关卡选择页可降为"上一关/下一关"。

---

## 五、验收标准

1. 线上 `/neon-block-jam/` HTTP 200；**375×667 下游戏框首屏 58vh**（LESSONS 第 4 条一票否决项）；无控制台报错。
2. 10 关全部可通且 par 与本文档一致；规则 3 的门墙判定正确（异色不可入闸门格、同色触门整块消失）。
3. 触屏拖动逐格吸附流畅；键盘光标模式可完整通关第 1-2 关；撤销/重开即时生效。
4. 星级按 ≤par=3★ / ≤par+2=2★ 判定；刷新页面后进度与星级保留（`np_nbj_progress`）。
5. 游戏内文案为 L 字典键位（`np_lang` 联动可切换则加分）；站点 chrome i18n 正常。
6. IndexNow 提交新 URL；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`。
7. iOS Safari + 桌面 Chrome 冒烟通过；关卡数组与文档逐字一致（diff 校验）。

---

### 附：策划备选池（供后续轮次，本轮未采用原因）
- **Idle Breakout（放置×打砖块）**：品类缺口大、留存模型最强；但与站内 Breakout/Brickstorm 同族，连续三款弹球会审美疲劳——建议隔 2-3 轮再做。
- **Water Sort zen 版**：同样的"无计时 zen"楔子可复制，web 供给饱和度高于 block jam——备选。
- **Suika×2048 物理合成**：需求大但 HTML5 克隆数百个，无差异化楔子——按红线暂不做。
- **Screw/螺丝解谜**：2024-2026 上升期，但关卡手工制作成本高，不适合 15 分钟轮次——观察。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-11 · 关卡数据经脚本验证（BFS 最优解 L1-5 / 模拟可行解 L6-10）· 需求来源：r/puzzlevideogames、r/SwagBucks、r/AndroidGaming；市场来源：GameDistribution/Sensor Tower/Mobidictum*
