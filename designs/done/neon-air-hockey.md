# Neon Air Hockey (neon-air-hockey)

> 一句话卖点：**一台手机，两人开战**——指尖拖动击球器，冰球弹射对决；单人虐 AI 三档，双人同屏决胜负，每天全球同一套"AI 参数"挑战。

- **缝合来源**：Air Hockey Challenge/Glow Hockey（指尖冰球对决）× JindoBlu 双人同屏合集（一台设备两人玩）× 日期种子 AI 挑战（brickstorm-daily 模式）
- **目标玩家**：朋友/情侣/亲子同乐人群（同屏 2P 是休闲搜索巨头品类）；想虐 AI 的单人玩家；公交/课堂/聚餐场景
- **单局时长**：先到 7 球，2-5 分钟

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——"2 player games" 品类巨头环伺（[twoplayergames.org 月访问百万级](https://www.semrush.com/website/twoplayergames.org/overview/)、[Air Hockey Challenge 50M+ 下载](https://play.google.com/store/apps/details?id=com.airhockey.xtreme&hl=en_US)），但 web 端供给两极：门户版广告密、无留存；App 版逼下载。本作：

1. **同屏双人 + 单人 AI 双模式**——真多点触控（两人各拖各的击球器互不抢触点），单人打 AI 三档；多数 web 冰球只有单人对墙。→ 满足红线"组合两个已有玩法"（指尖冰球 × 同屏双人社交玩法）。
2. **每日 AI 挑战全球同参数**——`mulberry32(YYYYMMDD)` 生成当日 AI 速度/误差/攻击性参数：全球玩家打的是**同一个 AI**，5 球制胜差即成绩，可比可晒。→ 解决痛点：品类留存全靠广告位刷新，无每日/无成长。
3. **段位锚定 AI 难度**——青铜到传奇按"击败哪档 AI、是否零封"判定，成长路径明确。
4. **社交裂变向量**——站内 17 款全是单人；同屏 2P 是唯一"拉朋友一起玩"的获客引擎（双人游戏搜索为巨头品类）。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 4/5 | "2 player games"/"air hockey" 常青大词；同屏双人品类 App 端 50M+ 下载背书 |
| 竞争空白 | 3/5 | 冰球游戏多；"干净 web 版+真多点触控 2P+每日同参数 AI+段位"组合无供给 |
| 变现意图 | 3/5 | 中短局；2P 场景黏性高（两人一起玩=双人会话） |
| 开发成本低 | 4/5 | 圆-圆/圆-墙碰撞全站已验证（Breakout 心智）；AI 状态机简单；零素材 |
| 复访价值 | 3/5 | 每日 AI 挑战+段位晋升；双人场景随社交发生 |
| **合计** | **17/25** | 达到入队线（组合价值加权：全站首个 PvP/社交向量） |

---

## 一、调研依据（2026-09-14）

### 热门拆解（含留存机制）
| 游戏 | 核心循环 | **留存机制** | 借鉴→本土化 |
|---|---|---|---|
| **Air Hockey Challenge**（Mobirix，50M+ 下载） | 拖击球器→进球→先到 7 | AI 难度阶梯+锦标赛 | AI 难度阶梯保留；锦标赛改"每日同参数 AI" |
| **Glow Hockey 2**（同屏 2P 经典） | 同上+双人同屏 | 发光视觉+双人社交 | 霓虹视觉规范本站已有 |
| **JindoBlu 2 Player Games**（4.8★/411K 评） | 多迷你游戏合集同屏对战 | 合集轮换+双人社交 | "一台手机两人玩"的场景定位 |

### 同构分析（饱和度）
- 冰球游戏数量多，卷 3D/皮肤/物理花活；web 门户版普遍单人对墙+插屏广告。
- 无人在意的维度：多点触控质量（两人同时拖不抢触点）、AI 可比性（每日同参数）、成长体系。
- 需求侧：同屏双人品类头部 App 数据（50M+/411K 评）证明场景真实且高频（朋友/情侣/亲子）。

### 异构分析（NeonPlay 现有 17 款的缺口）
现状四类分区+pending 八款（反应/体育/三消/节奏/接龙/画线/跑酷/数独）。
- **缺口：PvP/同屏对战=0 款**—— tic-tac-toe 与 connect-four 虽有 2P 模式但为回合制棋类；"实时对抗"是空白；**社交裂变向量**（A 拉来 B 一起玩）全站为零。
- 受众：学生/情侣/亲子——纯增量场景（"一起玩"发生在有第二个人的时刻）。

### 组合为何成立
- 冰球规则 3 秒讲完（把球打进对面门），物理全用站内已验证的圆-圆/圆-墙碰撞；AI 只需"追球+回防+偶尔失误"三态状态机。
- 多点触控是唯一技术要点（pointerId 分轨），实现清晰。
- 2P 模式自带传播：每局都有旁观者与再战欲（"再来一把"）——分享卡打"挑战你的朋友"。

---

## 二、玩法设计

### 规则（MVP 共 7 条）
1. 竖屏球桌 480×720：上下各一个球门（门宽 160px），玩家击球器限定在各自半场拖动（触屏跟随，限速防瞬移）。
2. 冰球：圆-墙全反弹（门缝除外）、圆-击球器碰撞传递击球器速度（拖得快打得狠）、冰面摩擦 0.995/帧、速度封顶 1400px/s（防隧穿：子步进 240Hz）。
3. 进球：冰球中心越过门线→得分，冰球回中圈发球（失分方开球）；**先到 7 球获胜**。
4. AI 三档（参数表：最大移速/预判误差/进攻性）：Easy 慢速常失误 / Normal 稳健回防 / Hard 快速预判+主动进攻。
5. **每日 AI 挑战**：`mulberry32(YYYYMMDD)` 生成 AI 三参数+球桌配色，**先到 5 球制**，净胜球=成绩；全球同参数。当日可反复挑战。
6. **2P 同屏**：上半场触点归 P2、下半场归 P1（pointerId 分轨），规则同 AI 模式（先到 7）。
7. 中场冻结 1 秒（进球后），发球前 3-2-1 倒计时（首球）。

### 段位阶梯（按击败的 AI 档位与条件，生涯累计判定）
| 段位 | 条件 |
|---|---|
| 🏆 传奇 | 击败 Hard 且零封（7:0） |
| 🥇 大师 | 击败 Hard AI |
| 💎 钻石 | 击败 Normal 零封 ×3 场 |
| 🥈 白金 | 击败 Normal ×5 场 |
| 🟡 黄金 | 击败 Easy 零封 ×3 场 |
| ⚪ 白银 | 击败 Easy ×3 场 |
| 🟤 青铜 | 完成 1 场 |

### 核心循环（4 步）
1. **对峙**：冰球在两器之间弹射，攻防瞬间转换。
2. **发力**：拖动速度=击球力量——大力抽射 vs 轻挡回防的选择。
3. **破门**：角度撕开空档，7 球定胜负（"再来一把"实时发生）。
4. **晋升**：虐完 Easy 上 Normal，段位逐级晋升；明天挑战全球同参数的每日 AI。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 下半场拖动击球器（P1）/上半场（P2）；多点触控互不干扰；击球器限速（防瞬移作弊） |
| 鼠标 | 单人对 AI：拖动下半场击球器 |
| 键盘 | 单人辅助：←→ 移动击球器（左右横移+自动小幅回防，可达性底线） |

### 美术方向（霓虹色板）
- 球桌=`#0a0a18` 冰面+青 `#00e5ff` 中圈/门区描线+呼吸网格；球门=品红 `#ff2d95` 发光凹槽。
- 击球器：P1 青、P2 金 `#ffd54a`、AI=紫 `#7c4dff`（按段位换色）；冰球=白色辉光圆盘+速度拖尾。
- 进球=球门爆闪+震屏+大字 "GOAL!"；连得分=连击胶囊；碰撞火花沿法线喷溅。
- 每日挑战开场卡：`DAILY AI #N —— 全球同参数`（复用聚光灯样式）；胜利=confetti+段位徽章判定动画。

---

## 三、长线留存设计（五件套逐项）

### ① 个人进度
- **MVP**：生涯统计（总局/胜场/进球失球/零封数）+ 段位实时判定展示。
- **R1**：成就徽章墙 8 枚——处子胜 / 零封初体验 / 三连胜 / 击败 Normal / 击败 Hard / 传奇零封 / 每日挑战首胜 / 百球先生（生涯进球 100）。
- **R2**：击球器皮肤 3 套（霓虹环→彗星→脉冲星）+ 冰球拖尾配色，徽章解锁。

### ② 个人排行榜
- **MVP**：Top10 本地榜（对手=AI 档位或 2P、比分、日期）+ 每周胜场（`YYYY-Www`）；结构含 `date`/`dailyDate` 字段为全局榜预留。
- **R1**：目标线——挑战 AI 前显示"对 Normal 历史战绩 5 胜 2 负"；每日挑战历史净胜球曲线。
- **R2**：ghost——每日 AI 挑战显示"个人最佳净胜球"目标线。

### ③ 一键分享
- **MVP**：结算面板"分享"→ canvas 成绩卡（比分/AI 档位或"2P 对战"/日期+`seyrs1985.github.io/neonplay` 链接）→ Web Share API→剪贴板降级：`🏒 Neon Air Hockey 7:4 击败 Normal AI 💎钻石 | 链接`；2P 模式文案：`同屏对决 7:5，不服再来！`。
- **R1**：每日分享带 `#NeonAirHockeyDaily 09-14` 标签；段位晋升卡。
- **R2**：连零封里程碑卡。

### ④ 回访钩子
- **MVP**：**每日 AI 挑战**（日期种子全球同参数，当日净胜球最优计戳）+ **游戏内连胜**（`np_neon-air-hockey_streak`，每日挑战胜利计，月度补签卡 1 张）。
- **R1**：连胜日历热力格+断签提醒；每日挑战战绩历史表。
- **R2**：每日 3 小任务（胜 1 场 / 完成每日 AI / 零封 1 场）。

### ⑤ 目标阶梯
- **MVP**：七段位（见上表，AI 档位条件制）+ 结算"距下一段位还差 XX"。
- **R1**：徽章墙与段位合并展示；击败 Hard 解锁第二皮肤（衔接收集）。
- **R2**：月度赛季归档；"专家 AI"第四档（传奇段位守门员）。

### 存档键名清单（规范 `np_<slug>_<key>`，全部 JSON 字符串）
| 键 | 数据结构 | 分期 |
|---|---|---|
| `np_neon-air-hockey_best` | `{"rank":"diamond","winsVsHard":2,"date":"2026-09-14"}` | MVP |
| `np_neon-air-hockey_top10` | `[{"opp":"normal|hard|p2","scoreUs":7,"scoreThem":4,"date":".."}] ≤10` | MVP |
| `np_neon-air-hockey_daily` | `{"date":"2026-09-14","diff":3,"done":true}` | MVP |
| `np_neon-air-hockey_streak` | `{"count":3,"last":"2026-09-14","best":7,"protect":1}` | MVP |
| `np_neon-air-hockey_stats` | `{"games":14,"wins":9,"goalsFor":68,"goalsAgainst":41,"shutouts":2}` | MVP |
| `np_neon-air-hockey_weekly` | `{"weekKey":"2026-W37","wins":5}` | MVP（展示可 R1） |
| `np_neon-air-hockey_badges` | `["first_win","shutout","..."]` | R1 |
| `np_neon-air-hockey_settings` | `{"skin":"classic","sound":true}` | R2 |

---

## 四、商业化
- **广告位**：落地页构建器默认注入位照旧；游戏内零插屏——对抗局插屏即毁。
- P2 预留：结算面板"看激励广告=下一场对 AI 得分 +1 开局"按钮位注释（2P 模式不提供，保证公平）。

---

## 五、SEO

**关键词簇**：`air hockey game online free` / `2 player games one device` / `air hockey 2 player` / `table hockey game` / `games to play with friends on one phone` / `air hockey unblocked`。标题建议：`Neon Air Hockey — Free 2-Player Air Hockey (Same Device + AI)`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Neon Air Hockey?** — A free air hockey game in your browser: drag your mallet, slam the puck, first to 7 wins. Play vs AI or 2-player on the same screen.
2. **Can two people play on one phone?** — Yes! True multi-touch: each player drags their own mallet on their half. No download, no account.
3. **What is the Daily AI?** — Every day the AI gets a new seeded personality (same worldwide). Beat it by 5 goals and your point differential goes on the board.
4. **Is my progress saved?** — Yes: wins, rank and daily results save automatically on your device; share your score card in one tap.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 Connect Four 与 Tic Tac Toe（对抗系互链）。

---

## 六、MVP 范围（开发 Agent 一轮 ≤15 分钟，含留存基线）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；canvas（复用站内 bootstrap+DPR）。
- 物理：冰球圆-墙反弹+门线判定+击球器圆-圆速度传递（击球器速度由 pointer 位移差估计）+240Hz 子步进+限速；击球器半场约束+限速。
- 模式：vs AI（Easy/Normal 两档状态机：追球/回防/失误率）+ 2P 同屏（pointerId 分轨多点触控）+ 每日 AI（种子参数，5 球制）。
- **留存基线（模板硬性要求）**：best/Top10/weekly/daily/streak（月度补签卡）/stats 六键按清单，局终即存+10s 自动存；分享卡 canvas+Web Share API→剪贴板降级；段位判定展示。
- 动效：进球爆闪+震屏+GOAL 大字、碰撞火花、冰球拖尾；中英 i18n（np_core）；`__qaState/__qa`（含 `__qa.puck()` 读冰球状态、`__qa.aiMove()` 单步 AI、种子确定性断言）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位。

**不做（明确砍掉）**：音效、第三档 AI（Hard，R1）、障碍物冰桌变体、皮肤、徽章墙、小任务、zen 模式、锦标赛。
**超时降级顺序**：先砍 2P 同屏（保 AI 模式与每日）→ 再砍 daily 种子参数（AI 固定参数）→ 物理与七球制不可砍。

---

## 七、留存路线图 R1/R2

- **R1（1-2 个后续轮次）**：成就徽章墙 8 枚（np_neon-air-hockey_badges）、Hard AI 第三档、对 AI 历史战绩目标线、连胜日历热力格+断签提醒、每日分享带日期标签。
- **R2**：每日 3 小任务、击球器/冰球皮肤 3 套（徽章解锁）、专家 AI 第四档、ghost 净胜球目标线、月度赛季归档、激励广告开局 +1 球位启用。

---

## 八、验收标准

1. 线上 `/neon-air-hockey/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. **玩法验证红线（LESSONS 第 9 条）**：qa_playtest 用 `__qa` 强制冰球入上门→断言 AI 得分与发球重置；`__qa.puck()` 配合脚本击球→断言玩家得分、7 球制胜与结算面板；全程 `window.onerror` 零报错。纯布局 pass 不算可玩。
3. **多点触控 QA（本作特有红线）**：合成两个 pointerId 同时拖动上下半场击球器→断言两器各自跟随互不干扰；单点拖动越界→断言半场约束生效。
4. **留存验收（模板硬性要求）**：
   - 刷新后 best/Top10/streak/daily 戳不丢（逐键核对第三节清单）；
   - 连胜跨天 +1/断档归 1/补签卡消耗（改本地时间验证）；
   - 每日种子确定性：同日两次加载 AI 参数（速度/误差/进攻性）一致；
   - 分享卡可生成（canvas 非 blank）含站点链接，剪贴板降级可用；
   - 全部存档键名与第三节清单一一对应。
5. 数值正确性：先到 7/每日 5 球制、冰球限速 1400px/s、击球器限速生效、段位条件判定正确。
6. 物理底线：冰球无隧穿（子步进）、 AI 不卡墙角死循环、60fps 稳定、时间基驱动后台不失步。
7. UI 文案走 np_core L 字典（`np_lang` 联动）；键盘模式可完成一局。
8. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过（iOS 多点触控重点验证）。

---

### 附：策划备选池（供后续轮次）
- **Solitaire Golf / Onet 连连看**（16/25 如实分）：等 neon-solitaire/存量 R1 消化后再议。
- **Plinko / Pinball / Bubble Shooter**：饱和或成本受限——暂缓。
- **R1/R2 内容轮**：八款待追加（reflex-rush/neon-hoops/tile-rush/neon-beats/neon-doodle/rooftop-rush/neon-sudoku 徽章皮肤主题 + word-hive 中文包 + nonogram 7×7）——重申：建议 ops 新游戏与存量 R1 交替排期，pending 队列 8 份已远超消化速度。
- **同屏双人合集**：若本作数据好，"Neon 2P 合集"（冰球+井字+四子+更多）是天然续作方向。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-14 · 需求佐证：Mobirix Air Hockey Challenge 50M+ 下载、JindoBlu 双人合集 4.8★/411K 评、twoplayergames.org 月访问百万级 · 技术先例：Breakout 圆-矩碰撞、connect-four 2P 模式*

> 已实现:2026-09-15 https://seyrs1985.github.io/neonplay/neon-air-hockey/
