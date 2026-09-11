# Neon Nonogram (neon-nonogram)

> 一句话卖点：**无广告的 Nonogram，解谜攒霓虹像素画**——数字线索推出像素图，零猜测设计保证每一关都能纯逻辑通关，解开的画进你的霓虹图鉴。

- **缝合来源**：Nonogram/Picross（数字线索逻辑填格）+ 像素涂色收集（Pixel Art 类爆款收集画册 meta）
- **目标玩家**：被 App 端广告轰炸逼走的 nonogram 玩家（r/nonograms 近期多帖求"无广告版"，原话 "I despise ads"）；Picross 老玩家；收集癖休闲玩家；通勤碎片时间人群
- **单局时长**：1-3 分钟/题（5×5）；12 题图鉴 + 每日一题

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——搜 "nonogram online" 前排站点题库庞大但界面陈旧、广告密、无收集 meta；App 端头部（Nonograms Katana/Pixelogic）靠订阅或一次性付费去广告。本作：

1. **零猜测设计**——12 题全部经行解传播求解器验证：**不猜一格即可纯逻辑通关**（App 端大量题库需要猜测/试错，与"逻辑谜题"的公平性冲突）。这是可验证的产品承诺，写进 FAQ。
2. **霓虹像素画图鉴（收集 meta）**——解开的每题是一幅霓虹像素画，进图鉴墙；把"解谜"和"集齐 12 幅画"两个动力叠在一起。→ 满足红线"组合两个已有玩法"（picross × 像素涂色收集）。
3. **无广告/无体力/无付费墙**——直接回应 [r/nonograms "Ad free nonogram apps?"（"I despise ads"）](https://www.reddit.com/r/nonograms/comments/1pvqv2c/ad_free_nonogram_apps/) 与 [r/AndroidGaming 求无广告 nonogram 帖](https://www.reddit.com/r/AndroidGaming/comments/t20bit/nonogrampicrosshanjie_without_ads/)。→ 满足红线"解决 Reddit 上有人抱怨找不到的问题"。
4. **移动端大格 + 双语**——5×5 大格触屏（>=44px 等效命中区）、中英 i18n；多数 web nonogram 对手机不友好。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 3/5 | "nonogram / picross / picture cross" 常青稳定词，无爆款浪头但无季节性 |
| 竞争空白 | 3/5 | App 供给强、web 供给弱；"零猜测+收集图鉴+双语"组合无供给 |
| 变现意图 | 3/5 | 中等会话+每日回访 |
| 开发成本低 | 5/5 | DOM 网格+线索运行时推导，12 幅像素画**策划已提供并求解器验证**；emoji/程序化配色零素材 |
| 复访价值 | 4/5 | 每日一题+图鉴收集（12 格集齐） |
| **合计** | **18/25** | 超过 17 分入队线 |

---

## 一、调研依据（2026-09-12）

### 需求挖掘（本轮）
| 来源 | 原声/事实 | 信号 |
|---|---|---|
| [r/nonograms "Ad free nonogram apps?"](https://www.reddit.com/r/nonograms/comments/1pvqv2c/ad_free_nonogram_apps/) | "searching for good nonogram apps… the problem is I despise ads" | 去广告是第一诉求 |
| [r/AndroidGaming 求无广告帖](https://www.reddit.com/r/AndroidGaming/comments/t20bit/nonogrampicrosshanjie_without_ads/) | "doesn't mind paying, just wants few or no ads with lots of puzzles" | 付费意愿存在=品质需求真实 |
| [独立开发者帖 "free daily nonogram app, no ads and no energy system"](https://www.reddit.com/r/nonograms/comments/1ryetqh/i_made_a_free_daily_nonogram_app_new_puzzle_every/) | 该帖以"无广告+无体力"作为核心卖点宣传 | 卖点被市场验证有效 |

### 热门拆解
| 游戏 | 核心循环 | 短板（机会） | 借什么 |
|---|---|---|---|
| **Nonograms Katana / Pixelogic**（App 头部） | 行列数字→推理填格→完成像素画 | 广告/订阅墙；手机竖屏适配一般 | 线索交互（行列表头数字）、✗标记辅助 |
| **Pixel Art 涂色类**（超休闲大品类） | 按数字涂色→像素画完成→图鉴收集 | 无逻辑挑战，纯涂色很快腻 | "画进图鉴"的收集闭环 |
| **web 端 nonogram 站**（多姓"picture cross"） | 同规则 | 界面老旧、题库需猜测、无本地化 | 前车之鉴 |

### 同构分析（饱和度）
- App 端饱和（数百款），卷题库数量与主题包；web 端供给老旧。
- "无广告+零猜测+收集图鉴+双语"四件套在 web 端无供给；零猜测是可被求解器证明的硬承诺（竞品做不到/不敢承诺）。

### 异构分析（NeonPlay 现有 14+ 款的缺口）
现状：躲避×2、街机×2、静态益智×4、roguelite×1（+每日）、关卡滑块解谜×1、棋盘×1、idle×1、合成发现×1、拖块消行×1（在建）、词分组×1（pending）。
- **缺口：图像逻辑题=0 款**——现有脑力系全是符号/数字/文字操作，Nonogram 是"看图推理"，视觉动线不同；且是全站第二个"无失败压力"游戏（错格不判负，zen 兼容）。
- 收集 meta 与 Neon Alchemy 图鉴呼应但载体不同（像素画 vs 元素），形成站点"图鉴双壁"。

### 组合为何成立
- Nonogram 的多巴胺在"完成瞬间的图像浮现"——天然就是像素画，收集画册 meta 顺水推舟，不添加任何人工系统。
- 零猜测题库由策划侧求解器保证（本方法论已三度交付：Block Jam 关卡/Alchemy 配方/本作题库），开发零内容负担。
- 5×5 小题适配碎片时间+移动端，与站内长会话游戏（idle）形成时长互补。

---

## 二、玩法设计

### 规则（MVP 共 5 条）
1. 5×5 网格，行/列表头显示连续格数线索（如 `2 1`）；点击填格、再点变 ✗ 标记、再点清除（三态循环）。
2. **无失败判定**：填错不扣任何东西；全部行/列满足线索时（或点击"检查"）判定完成——完成即该像素画解锁进图鉴。填错格在完成检查时以红闪标出，可改。
3. **零猜测保证**：12 题全部行解传播可解（求解器验证），新手引导文案明示"每一步都可以推出来"。
4. 模式：**图鉴**（12 题任选，已解显示彩色像素画，未解显示❓）/**每日一题**（日期哈希 `daysSinceEpoch % 12` 选板，全球同题，完成打当日戳）。
5. 进度存 localStorage（`np_nn_save`：已解锁图鉴/每日完成日戳）；"重置图鉴"二次确认。

### 核心循环（4 步）
1. **读线索**：行列数字→推理某行/列的确定格（大数字=几乎满行，0=全空）。
2. **填格**：确定格填实、排除格打 ✗（✗ 是思考痕迹，也算分？不，✗ 只是辅助）。
3. **浮现**：最后一格落下，像素画完整显现+霓虹上色动画。
4. **收集**：画进图鉴，进度 +1/12；明天来解每日题。

### 题库数据（12 题，行解求解器验证：全部唯一可解且零猜测；难度=传播轮数，即纯逻辑推理步数）

```js
// 每题 5 行字符串，'#'=实格 '.'=空；线索由程序运行时从解图推导（勿手写线索）
// difficulty 为求解器传播轮数（2-5），决定图鉴排序
const PUZZLES = [
 {n:1,  d:2, name:'Bell',   emoji:'🔔', color:'#ffd54a', rows:['..#..','.###.','#####','.....','..#..']},
 {n:2,  d:2, name:'Cup',    emoji:'☕', color:'#ff9e40', rows:['.###.','.###.','.###.','..#..','.###.']},
 {n:3,  d:2, name:'Flower', emoji:'🌸', color:'#ff2d95', rows:['#.#.#','#####','.###.','..#..','..#..']},
 {n:4,  d:2, name:'Skull',  emoji:'💀', color:'#ffffff', rows:['.###.','#####','#.#.#','.###.','#.#.#']},
 {n:5,  d:3, name:'Gem',    emoji:'💎', color:'#00e5ff', rows:['..#..','.###.','#####','.###.','..#..']},
 {n:6,  d:3, name:'Heart',  emoji:'❤️', color:'#ff2d95', rows:['.#.#.','#####','#####','.###.','..#..']},
 {n:7,  d:3, name:'Invader',emoji:'👾', color:'#39ff88', rows:['..#..','.###.','#####','#.#.#','#...#']},
 {n:8,  d:3, name:'Rocket', emoji:'🚀', color:'#7c4dff', rows:['..#..','.###.','.###.','.###.','#.#.#']},
 {n:9,  d:3, name:'Tree',   emoji:'🌲', color:'#39ff88', rows:['..#..','.###.','#####','..#..','..#..']},
 {n:10, d:4, name:'Key',    emoji:'🔑', color:'#ffd54a', rows:['.##..','#..#.','.##..','..#..','..##.']},
 {n:11, d:5, name:'Bolt',   emoji:'⚡', color:'#00e5ff', rows:['...#.','..##.','.###.','###..','#....']},
 {n:12, d:5, name:'Note',   emoji:'🎵', color:'#ff2d95', rows:['..##.','..#.#','..#..','.##..','###..']},
];
```

图鉴墙：12 格，未解=❓暗格，已解=霓虹色像素画+emoji+名称；集齐触发全图鉴金框+彩带。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 点格三态循环（空→实→✗→空）；长按快速标 ✗；表头点按高亮对应行/列 |
| 鼠标 | 同触屏连点；右键=✗ |
| 键盘 | 方向键移动光标 → Space 三态循环 → X 直接标 ✗ → Enter 检查完成 |

### 美术方向（霓虹色板）
- 底 `#0a0a18` 深空；网格玻璃拟态面板，格线 `#1e2a4a`；线索数字=等宽字体青 `#00e5ff`，已满足的行/列线索自动变暗灰（App 级体验细节）。
- 填实格=该题专属霓虹色（每题 color 字段）+ fill 弹跳入场；✗=暗红 `#ff2d95` 半透明。
- 完成瞬间：整图逐格 stagger 上色（对角线波次）+ 全图外发光呼吸 + 「PICTURE UNLOCKED」坠落标题 + 彩带（复用站内 confetti）。
- 图鉴墙：已解画格 hover 抬升发光；每日题顶部「TODAY'S PICTURE」金框卡（复用聚光灯样式）。

### 商业化
- **广告位**：落地页构建器默认注入位照旧；游戏内零插屏——"no ads" 是本作对 Reddit 诉求的直接回答，写进 FAQ。
- **留存钩子**：每日一题（全球同题+🔥streak 联动）、图鉴 12 格集齐、解题连击（连续 N 天完成每日，P2 记录）。P2：7×7/10×10 题包（策划求解器验证后交付）、彩色 nonogram 变体。

---

## 三、SEO

**关键词簇**：`nonogram online free` / `picross browser` / `picture cross puzzle` / `nonogram no ads` / `griddler game online` / `daily nonogram` / `japanese crossword puzzle`。标题建议：`Neon Nonogram — Free Online Nonogram (No Ads, No Guessing, Daily Puzzle)`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Neon Nonogram?** — A free picture-logic puzzle: use the row and column number clues to fill cells and reveal hidden neon pixel art. No download, no account.
2. **Do I ever need to guess?** — Never. All 12 puzzles are solver-verified to be solvable by pure logic, step by step — a fairness promise most nonogram apps can't make.
3. **Is it really ad-free?** — Yes. No interstitials, no energy systems, no paywalls; your gallery progress saves automatically in your browser.
4. **Can I play on mobile?** — Yes: big touch-friendly cells, three-tap marking (fill / cross / clear), full keyboard support on desktop, and a new daily picture every day.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 Minesweeper 与 Neon Alchemy（逻辑/收集向互链）。

---

## 四、MVP 范围（开发 Agent 一轮 ≤15 分钟）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；DOM 网格（无 canvas）。
- 本文档 `PUZZLES` 数组原样粘贴（求解器已验证，勿改位图）；线索运行时从位图推导（行/列游程），**QA 断言每题行解可解**（复用求解器逻辑 20 行内）。
- 三态填格、✗ 辅助、"检查"完成判定+错格红闪、图鉴墙（❓→彩色像素画）、每日模式（日期哈希+当日戳）、localStorage（`np_nn_save`）+重置二次确认。
- 动效：完成 stagger 上色+「PICTURE UNLOCKED」+彩带；线索自动变暗；UI 文案内嵌 L 字典（`np_lang` 联动）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位。

**不做（明确砍掉）**：自动纠错（实时标红错格）、计时器、7×7 题包、彩色变体、音效、每日提示系统。
**超时降级顺序**：先砍每日模式（保图鉴主线）→ 再砍线索变暗 → 三态格可降为两态（填/空，✗ 砍掉）。

---

## 五、验收标准

1. 线上 `/neon-nonogram/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. **玩法验证红线（LESSONS 第 9 条）**：qa_playtest 按 Heart 位图坐标逐格点击填实（含先误点一格再改的路径）→ 断言完成判定触发「PICTURE UNLOCKED」且图鉴 ❤️ 解锁；全程 `window.onerror` 零报错。纯布局 pass 不算可玩。
3. 线索正确性：表头数字与位图推导一致；错格在"检查"时红闪且不误判完成；✗ 格不计入完成条件。
4. 每日模式按日期哈希选板、当日戳、次日切换；图鉴 12 格随解锁点亮（❓→画）；刷新与重开浏览器进度保留（`np_nn_save`）；重置有二次确认。
5. 移动端三态点按命中准确（含 ≥44px 等效区），键盘方向键+Space 可完整通关第 1 题。
6. UI 文案走 L 字典（`np_lang` 联动）；线索满足变暗生效。
7. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过。

---

### 附：策划备选池（供后续轮次）
- **Tile Match 羊了个羊式**（层叠三消+7 格托盘）：热度高但 z 轴点击/层叠渲染 MVP 风险偏大，待流水线富余时上——观察。
- **zh 词谜板包**（Word Hive 中文双关组）：内容轮候选。
- **本作 7×7 题包**：求解器方法论直接复用，策划供题即可——内容轮候选。
- **Water Sort zen / Screw 解谜**：继续观察。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-12 · 题库 12 题经行解传播求解器验证（唯一可解/零猜测/难度 2-5 传播轮数），16 候选中 4 个需猜测的已剔除 · 需求来源：r/nonograms、r/AndroidGaming*

已实现:2026-09-12 https://seyrs1985.github.io/neonplay/neon-nonogram/ （MVP全量:12题位图+运行时游程线索+三态格+检查红闪+图鉴墙+每日哈希+存档;QA验证Heart 16格逐格通关→面板+图鉴解锁+当日戳）
