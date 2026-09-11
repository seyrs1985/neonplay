# Word Hive (word-hive)

> 一句话卖点：**不限次的 Connections，提示不用出门搜**——16 个词藏 4 组联系，手工设计的陷阱难度曲线，卡关直接用内置三级提示，别再去 Google 搜答案了。

- **缝合来源**：NYT Connections（词分组核心循环）+ Wordle（每日一题/emoji 战绩分享）[+ zen 模式（站点无失败哲学）]
- **目标玩家**：NYT Connections 日活玩家（想多玩/被 archive 订阅墙挡住的人）；搜"connections hint"的卡关党（巨型搜索词=真实需求）；词谜/CozyGamers 人群
- **单局时长**：2-5 分钟/板；10 板图鉴 + 每日精选 + 无限洗牌模式

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——前排是 NYT 官方（每日一题、往期库订阅墙）与 unlimited 克隆群（多为随机/抓取题库，类别歧义多、无难度设计、广告密）。本作：

1. **内置三级提示阶梯**——"connections hint" 是每日巨量搜索词：玩家卡关被迫离场搜提示。我们把提示做进游戏（类别提示→组内一词→整组揭示，每板 3 次免费），**解决"卡关必须离开页面"这个被 Reddit/NYTGameHint 用户抱怨的真实问题**（"Why is there no archive? Why can't I erase answers?"）。→ 满足红线"解决 Reddit/Quora 上有人抱怨找不到好方案的问题"。
2. **手工陷阱设计 + 难度曲线**——10 套题板全部手工设计（表面歧义词做陷阱、黄→紫四档难度递进、每组附设计说明），区别于克隆站随机题库的类别歧义。→ 满足红线"组合两个已有玩法"（分组解谜 × 每日精选/emoji 分享）。
3. **Zen 模式**——无失误次数上限的开关（站点"无失败"哲学），对老年/休闲玩家零压力；每日模式保留经典 4 命规则供硬核玩家。
4. **免费 archive + 洗牌无限模式**——往期全部可玩、随机抽板重玩，对标订阅墙；站内 🔥streak/每日聚光灯直接联动。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 5/5 | "connections puzzle/hints/unlimited" 是每日巨量词，品类被 NYT 教育到全民皆知 |
| 竞争空白 | 2/5 | unlimited 克隆已存在（诚实扣分）；但"内置提示+手工陷阱+zen"组合无人做 |
| 变现意图 | 3/5 | 中等会话+每日回访 |
| 开发成本低 | 4/5 | 10 套题板**策划已提供并结构校验**，DOM 网格 UI 简单，零素材 |
| 复访价值 | 5/5 | 每日精选+图鉴收集+洗牌模式，强回访钩子 |
| **合计** | **19/25** | 超过 17 分入队线 |

---

## 一、调研依据（2026-09-11）

### 需求挖掘（本轮）
| 来源 | 原声/事实 | 信号 |
|---|---|---|
| [r/NYTConnections](https://www.reddit.com/r/NYTConnections/) | 社区自造"Connections Alternatives"每日重混题，玩家自发扩充题量 | 每日一题不够玩，社区在自行解决 |
| [archive 通关帖](https://www.reddit.com/r/NYTConnections/comments/1mksu93/i_finally_completed_all_the_puzzles_in_the_archive/) | 玩家趁 NYT Games **7 天免费试用**刷完全部往期题 | 往期库订阅墙真实挡人 |
| [NYTGameHint 用户提问](https://www.nytgamehint.com/conn) | "Why is there no archive? Why can't I erase answers and start over?" | 官方产品缺口清单=我们的功能清单 |
| "connections hint" 搜索行为 | 卡关玩家每日离场搜提示（第三方提示站成生态） | 内置提示=承接离场需求 |

### 热门拆解
| 游戏 | 核心循环 | 短板（机会） | 借什么 |
|---|---|---|---|
| **NYT Connections**（日活千万级） | 选 4 词→提交→对/错（4 命）→分组揭示→分享 emoji 战绩 | 每日 1 题、archive 付费、无提示、失误即死 | 核心规则、四色难度、分享格式 |
| **connectionsgame.org 等 unlimited 克隆** | 同规则+随机题 | 题库随机化导致类别歧义、无难度曲线、广告密 | "无限模式"形态 |
| **Wordle**（原型范式） | 每日一题+全球同题+emoji 战绩传播 | — | 每日仪式感与分享模板 |

### 同构分析（饱和度）
- 克隆供给已存在（connectionsgame.io/.org、connectionsunlimited.org、connect.game），卷的是题量与 daily 更新。
- 它们共同的弱区：题库质量（随机生成的类别常有多解歧义）、无提示（玩家离场搜答案）、无 zen 变体、纯英文站无本地化意识。
- 品类认知零成本——NYT 已完成市场教育，我们只需在体验维度做增量。

### 异构分析（NeonPlay 现有 11 款的缺口）
现状：躲避×2、街机×2、静态益智×4、roguelite×1（+每日挑战）、关卡解谜×1、棋盘×1；pending：idle×1、合成发现×1。
- **缺口：词类游戏=0 款**——英语站最大众的品类至今空白；词谜人群（NYT Games 用户画像）与现有动作/解谜玩家重叠度低，纯增量。
- 与 Neon Alchemy 组成"每日双拼"（每日合成+每日词组），站点每日矩阵成型，streak 消费场景再 +1。

### 组合为何成立
- 分组解谜的"啊哈"来自陷阱词的双关诱导——这是手工设计才能保证的质量维度（脚本可校验结构，语义由策划逐板背书），恰好是流水线里策划能加杠杆的环节。
- 每日精选提供仪式感，洗牌模式消化"还想再玩"的长尾——两种供给节奏互补，正好复用站内日期哈希基建。
- 纯 DOM 网格+查表判定，无物理无动画复杂度，15 分钟轮次无风险。

---

## 二、玩法设计

### 规则（MVP 共 6 条）
1. 4×4 网格 16 词；点选 4 词→提交；命中隐藏组则该组揭示（亮色横幅），未命中扣 1 命（共 4 命）并提示"差一个！"（恰好 3 词属同组时）。
2. 4 命耗尽→逐组揭示结算（失败可重试同板，不计入战绩）。
3. 难度四色：🟨直白 → 🟩进阶 → 🟦知识 → 🟪文字陷阱；揭示顺序即玩家找出顺序。
4. **内置提示阶梯**（每板 3 次，免费）：H1 揭示某剩余组的类别文字 → H2 揭示该组一个词 → H3 直接解出该组。用提示的通关战绩标记 💡（分享可见）。
5. 模式：**每日精选**（日期哈希 `daysSinceEpoch % 10` 选板，4 命规则，全球同题，当日完成标记）/**图鉴**（10 板任选）/**无尽洗牌**（随机板+随机重排，无命限制 zen 模式）。
6. 进度存 localStorage（`np_wh_save`：已通关板/每日完成日戳/stats）；Shuffle 按钮随时重排网格。

### 核心循环（4 步）
1. **扫描**：16 词里找表面联系的簇，注意陷阱词的诱导。
2. **试探**：选 4 词提交，用"差一个！"反馈修正。
3. **揭示**：四色横幅逐组点亮，🟪陷阱组最后破解最有快感。
4. **分享**：emoji 战绩贴到社交媒体，明天来打每日精选。

### 题板数据（10 板，策划手工设计+结构校验：每板 16 词/4 组×4/零跨组重复；语义唯一性逐板人工背书，陷阱设计见注释）

```js
// c: y黄(易) g绿 b蓝(知识) p紫(陷阱)  | label 附陷阱设计说明(注释)
const PUZZLES = [
 {n:1, groups:[ // 入门板：无陷阱
   {c:'y', en:'Planets',      zh:'行星', words:['MARS','VENUS','MERCURY','JUPITER']},
   {c:'g', en:'Metals',       zh:'金属', words:['IRON','GOLD','SILVER','COPPER']},
   {c:'b', en:'Fruits',       zh:'水果', words:['MANGO','PEACH','CHERRY','LEMON']},
   {c:'p', en:'Colors',       zh:'颜色', words:['CRIMSON','TEAL','INDIGO','IVORY']}]},
 {n:2, groups:[ // 陷阱：SPIDER/BAT/ANT 既是动物又是"-man"前缀
   {c:'y', en:'Colors',       zh:'颜色', words:['SCARLET','MAGENTA','CYAN','LILAC']},
   {c:'g', en:'Zoo animals',  zh:'动物园动物', words:['PANDA','FALCON','OTTER','LEMUR']},
   {c:'b', en:'Pizza toppings',zh:'披萨配料', words:['PEPPERONI','OLIVE','MUSHROOM','PINEAPPLE']},
   {c:'p', en:'___-man (heroes)',zh:'-man前缀(超级英雄)', words:['SPIDER','BAT','ANT','IRON']}]},
 {n:3, groups:[ // 陷阱：MAMMOTH 看似动物、BLUES 看似颜色
   {c:'y', en:'Ice cream flavors',zh:'冰淇淋口味', words:['VANILLA','CHOCOLATE','STRAWBERRY','PISTACHIO']},
   {c:'g', en:'Enormous',    zh:'巨大的', words:['HUGE','GIANT','MAMMOTH','COLOSSAL']},
   {c:'b', en:'Card games',  zh:'牌类游戏', words:['POKER','BRIDGE','SOLITAIRE','HEARTS']},
   {c:'p', en:'Music genres',zh:'音乐流派', words:['JAZZ','BLUES','PUNK','FUNK']}]},
 {n:4, groups:[ // 陷阱：PYTHON/RUBY 双栖编程与蛇/宝石，DIAMOND 双栖宝石与花色
   {c:'y', en:'Snakes',      zh:'蛇', words:['COBRA','VIPER','ADDER','BOA']},
   {c:'g', en:'Gems',        zh:'宝石', words:['OPAL','TOPAZ','GARNET','AMETHYST']},
   {c:'b', en:'Programming languages',zh:'编程语言', words:['PYTHON','JAVA','RUBY','PEARL']},
   {c:'p', en:'Card suits',  zh:'扑克花色', words:['HEART','DIAMOND','CLUB','SPADE']}]},
 {n:5, groups:[ // 陷阱：OLIVE/SAGE/MINT 看似食物，MOON/FLASH 看似夜/快
   {c:'y', en:'Birds',       zh:'鸟类', words:['RAVEN','ROBIN','FINCH','FALCON']},
   {c:'g', en:'Casino items',zh:'赌场物品', words:['SLOT','CHIP','DECK','BET']},
   {c:'b', en:'___light',    zh:'___光', words:['MOON','DAY','FLASH','SPOT']},
   {c:'p', en:'Shades of green',zh:'绿色系', words:['OLIVE','SAGE','MINT','LIME']}]},
 {n:6, groups:[ // 陷阱：CAT/GOLD/SWORD 是 ___fish 前缀，CANARY 看似宠物鸟
   {c:'y', en:'Instruments', zh:'乐器', words:['CELLO','FLUTE','TRUMPET','HARP']},
   {c:'g', en:'Pets',        zh:'宠物', words:['HAMSTER','PARROT','RABBIT','CANARY']},
   {c:'b', en:'Greek letters',zh:'希腊字母', words:['ALPHA','BETA','GAMMA','DELTA']},
   {c:'p', en:'___fish',     zh:'___鱼', words:['SWORD','STAR','CAT','GOLD']}]},
 {n:7, groups:[ // 陷阱：STEAM 看似蒸汽机、SAGE/MINT 看似颜色（呼应本站 Neon Alchemy 彩蛋）
   {c:'y', en:'Coffee drinks',zh:'咖啡', words:['LATTE','MOCHA','ESPRESSO','AMERICANO']},
   {c:'g', en:'Kitchen tools',zh:'厨具', words:['WHISK','LADLE','GRATER','TONGS']},
   {c:'b', en:'Herbs',       zh:'香草', words:['BASIL','THYME','SAGE','MINT']},
   {c:'p', en:'Cooking methods',zh:'烹饪方式', words:['BAKE','GRILL','STEAM','POACH']}]},
 {n:8, groups:[ // 陷阱：SNAKE 是本站游戏、SATURN 看似行星、BOXING 看似运动；站点梗=传播点
   {c:'y', en:'Animals',     zh:'动物', words:['ELEPHANT','GIRAFFE','ZEBRA','GAZELLE']},
   {c:'g', en:'Board games', zh:'桌游', words:['RISK','CLUE','OTHELLO','SORRY']},
   {c:'b', en:'Retro arcade games',zh:'复古街机游戏', words:['PONG','TETRIS','SNAKE','ASTEROIDS']},
   {c:'p', en:'Things with rings',zh:'有环的东西', words:['ONION','SATURN','TREE','BOXING']}]},
 {n:9, groups:[ // 陷阱：HAIL 看似打招呼、KNOT 看似绳结；回文组=紫卡文字游戏
   {c:'y', en:'Farm animals',zh:'农场动物', words:['GOAT','SHEEP','PIG','COW']},
   {c:'g', en:'Weather',     zh:'天气', words:['STORM','BLIZZARD','DRIZZLE','HAIL']},
   {c:'b', en:'Units of measure',zh:'计量单位', words:['INCH','OUNCE','FATHOM','KNOT']},
   {c:'p', en:'Palindromes', zh:'回文词', words:['LEVEL','KAYAK','ROTOR','CIVIC']}]},
 {n:10,groups:[ // 终局板：KEY 看似钥匙、CARD 看似扑克、KNIGHT=night 谐音、BISHOP 看似神职
   {c:'y', en:'Cheeses',     zh:'奶酪', words:['BRIE','EDAM','GOUDA','FETA']},
   {c:'g', en:'Dog commands',zh:'狗狗指令', words:['SIT','STAY','HEEL','FETCH']},
   {c:'b', en:'___board',    zh:'___板', words:['KEY','SKATE','CARD','CHALK']},
   {c:'p', en:'Chess pieces',zh:'国际象棋棋子', words:['PAWN','ROOK','BISHOP','KNIGHT']}]},
];
```

分享文案模板：`Word Hive #板号 {逐次猜测的 emoji 行（组色方块/❌）} {n} mistakes {💡?} → 链接`。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏/鼠标 | 点词选中（最多 4）→ Shuffle 重排 → Submit 提交 → 再点已选取消选择 |
| 键盘 | 方向键移动焦点 → Space 选中/取消 → Enter 提交，S 洗牌，H 用提示，U 撤销上一次选择 |
| 无障碍 | 词块 min-height 44px；焦点态辉光；`prefers-reduced-motion` 适配（站点规范） |

### 美术方向（霓虹色板）
- 底 `#0a0a18` 深空；词块=玻璃拟态圆角块，默认白字，选中=青 `#00e5ff` 边框辉光+微升起。
- 组揭示横幅按难度色：🟨 `#ffd54a` / 🟩 `#39ff88` / 🟦 `#00e5ff` / 🟪 `#ff2d95`，横幅弹跳入场+组名辉光大字。
- 失误：网格震屏+"差一个"时疑似组脉冲提示；命=蜂巢小格逐格熄灭（hive 主题）。
- 全部通关：蜂巢全亮+金色渐变标题+彩带（复用站内 confetti）；分享面板=战绩 emoji 预览+复制按钮。

### 商业化
- **广告位**：落地页构建器默认注入位照旧；游戏内零插屏。
- **留存钩子**：每日精选（全球同题+🔥streak 联动）、10 板图鉴完成度、无尽洗牌消磨长尾、提示战绩 💡 无污名化（鼓励用）。P2：zh 谜题板包（中文双关组，语言绑定需单独设计）、板数扩容至 20+。

---

## 三、SEO

**关键词簇**：`connections puzzle unlimited free` / `connections game like nyt` / `word grouping game` / `connections hints` / `nyt connections alternative` / `group the words puzzle` / `word hive game`。标题建议：`Word Hive — Free Unlimited Word Grouping Puzzle (Connections-Style, Built-in Hints)`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Word Hive?** — A free word puzzle: 16 words hide 4 groups of four that share a connection. Find them all before 4 mistakes. No account, plays in any browser.
2. **Is it unlimited?** — Yes: a featured daily board, a 10-puzzle library, and endless shuffle mode — no subscription, unlike some daily word games' archives.
3. **What if I'm stuck?** — Built-in three-level hints reveal a category, a word, or a whole group. No leaving the page, no ads, no shame.
4. **Can I play on mobile?** — Yes: tap-friendly grid, keyboard supported, progress saves automatically; share your result with emoji like you're used to.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 Neon Alchemy 与 2048（动脑向互链）。

---

## 四、MVP 范围（开发 Agent 一轮 ≤15 分钟）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；DOM 4×4 网格（无 canvas）。
- 本文档 `PUZZLES` 数组原样粘贴（已结构校验勿改词序）；核心玩法：选择/提交/正误判定/组揭示/4 命/差一个提示/失败逐组揭示。
- 三模式：每日精选（日期哈希）+ 图鉴选板 + 无尽洗牌（zen 无命）；内置提示三级；分享文案生成+剪贴板复制；localStorage（`np_wh_save`）。
- 动效：揭示横幅弹跳、失误震屏、通关 confetti；UI 文案内嵌 L 字典（`np_lang` 联动；题词本身 EN 属数据不翻译，落地页注明）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位。

**不做（明确砍掉）**：中文题板包（P2）、排行榜（无后端）、自定义题板编辑器、音效、暗黑/主题切换（站点已有基调）。
**超时降级顺序**：先砍提示阶梯（留 H1 类别提示一级）→ 再砍无尽洗牌 → 保每日+图鉴+核心判定主线。

---

## 五、验收标准

1. 线上 `/word-hive/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. **玩法验证红线（LESSONS 第 9 条）**：qa_playtest 合成事件按板 1 的 `['MARS','VENUS','MERCURY','JUPITER']` 逐词点击→Submit，断言 🟨 行星横幅揭示；再连错 4 次断言失败逐组揭示流程；全程 `window.onerror` 零报错。纯布局 pass 不算可玩。
3. 判定正确性：命中组揭示且从网格移除；"差一个"反馈在恰好 3 词同组时出现；4 命扣减与失败流程正确。
4. 三模式可用：每日板按日期哈希选取且当日完成有标记；图鉴 10 板可玩；无尽模式无命限制；改本地日期可切板。
5. 提示三级生效且每板限 3 次；刷新页面进度/战绩保留（`np_wh_save`）。
6. UI 文案走 L 字典（`np_lang` 联动）；词块触控 ≥44px、键盘可完整通关板 1。
7. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过。

---

### 附：策划备选池（供后续轮次）
- **Nonogram 每日谜题**：手工 5×5 可脚本验证唯一解——下轮头名备选。
- **zh 词谜板包**：本作的中文扩展（成语分类/谐音陷阱），需策划单独设计词组——内容轮候选。
- **Water Sort zen / Screw 解谜**：继续观察。
- **资料片**：本作 +10 板扩容包可作内容轮（策划供题+校验，流水线成熟做法）。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-11 · 题板 10 套经脚本结构校验（16 词/4 组×4/零跨组重复）+ 语义唯一性人工背书 · 需求来源：r/NYTConnections、NYTGameHint、archive 通关帖*
