# Rooftop Rush (rooftop-rush)

> 一句话卖点：**每天一条全球相同的死亡天台路线**——单指跳跃穿越霓虹天台，尖刺与断崖按今日种子排布，背版、提速、刷新纪录，跑酷也有 Track of the Day。

- **缝合来源**：Canabalt/Subway Surfers 系自动跑酷（单键跳跃+距离计分）× Level Devil 式陷阱背版（固定路线可学习）× Trackmania「Track of the Day」（日期种子固定路线+竞速榜）
- **目标玩家**：跑酷/竞速玩家（Poki 上 Subway Surfers 常驻第一）；speedrun 文化人群（同一条路线练到极致的乐趣）；单指碎片时间玩家
- **单局时长**：经典无限局 20-90 秒（距离制）；每日路线固定 14 块 ≈ 8,400px（约 25-35 秒完赛）

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——跑酷品类的 web 供给全部是"随机无限"形态：Subway Surfers 网页版/Spike 系跑酷的关卡随机生成，玩家永远在打新图，**没有"练同一条路线"的竞速留存**。本作：

1. **每日固定路线（Track of the Day）**——`mulberry32(YYYYMMDD)` 从已验证关卡块池排出当日固定路线（全球同题）：同一组断崖、同一串尖刺，今天没背下来明天继续练——把 Trackmania 的"每日赛道竞速"文化带给网页跑酷。随机跑酷做不到（图每天都不同），固定关卡跑酷做不到（图永久不变，背完即弃）。→ 满足红线"组合两个已有玩法"（自动跑酷 × 每日固定赛道竞速）。
2. **竞速计分而非单纯距离**——每日路线有终点线：完赛时间（或死亡距离）即是成绩，speedrun.com 式的"同图刷最优解"（[Glitch Runner 已有 282 人竞速社区](https://www.speedrun.com/glitch_runner_endless_parkour/forums/g5l1b)证明该文化在跑酷品类成立）。
3. **无广告单指零门槛**——品类 web 供给普遍插屏密；本作单指跳跃、3 秒上手、死亡即重开（零惩罚节奏）。
4. **品类补全**——站内 17 款无平台跳跃/跑酷：操作动词补上"时机跳跃"（站点已有动词：点按/拖拽/画线/滑动/反应）。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 4/5 | "parkour game / runner game online / subway surfers online" 大词；跑酷类是 Poki/CrazyGames 头部常驻 |
| 竞争空白 | 2/5（诚实） | 跑酷克隆极度饱和；空白仅在"每日固定路线竞速"形态（该形态无 web 供给——调研确认无对应结果） |
| 变现意图 | 3/5 | 短局高频 |
| 开发成本低 | 5/5 | 全站最简引擎候选：常数速横向卷轴+单键跳跃+线段地面；关卡块数据策划已数值验证；零素材 |
| 复访价值 | 4/5 | 每日路线背版+完赛时间刷优+连胜 |
| **合计** | **18/25** | 超过 17 分入队线 |

---

## 一、调研依据（2026-09-13）

### 热门拆解（含留存机制）
| 游戏 | 核心循环 | **留存机制** | 借鉴→本土化 |
|---|---|---|---|
| **Subway Surfers**（Poki 网页版常驻 #1） | 跑酷躲避→距离分数 | 任务/角色收集+每日任务 | 单键简化；收集要素走皮肤解锁（R2） |
| **Canabalt**（跑酷鼻祖） | 单键跳跃→距离 | 极致速度曲线的手感 | 速度坡度曲线（240→420 px/s） |
| **Trackmania**（每日赛道竞速文化标杆） | **Track of the Day**→全球同图刷时间→排行榜 | 同图竞速的 speedrun 留存 | 日期种子固定路线+完赛计时+竞速榜 |
| **Level Devil**（Poki 热榜） | 陷阱背版→试错学习 | 固定关卡的"背版"乐趣 | 关卡块手工设计=陷阱可学习（非纯随机坑） |

### 需求与供给判断
- 品类热度：[CrazyGames 跑酷分类](https://www.crazygames.com/t/parkour)常驻；Subway Surfers 网页版是 Poki 头牌（前轮调研）。
- 供给形态：全部"随机无限"；speedrun 文化已外溢到跑酷（[Glitch Runner 竞速社区](https://www.speedrun.com/glitch_runner_endless_parkour/forums/g5l1b)），但 **"每日固定路线+单键+web"三者结合无供给**（本轮调研确认无对应结果）。
- "背版"是被 Level Devil/Trackmania 双重验证的留存机制——固定路线让"今天比昨天快 1.2 秒"成为可能。

### 同构分析（饱和度）
- 跑酷 web 克隆极多（诚实评估），卷 3D 画面、IP 皮、障碍密度。
- 无人在意的维度：**路线确定性**（可学习性）与**全球同题**（可比较性）——恰是无后端静态站用日期种子就能白嫖的维度。

### 异构分析（NeonPlay 现有 17 款的缺口）
现状四类分区+pending 六款（反应/体育/三消/节奏/接龙/画线）。
- **缺口：平台跳跃/跑酷=0 款**——站内操作动词补上"时机跳跃"（唯一剩余的基础动词族），横向卷轴形态也是全站首个（现有动作款全竖屏原地）。
- 与 Reflex Rush（反应）形成"手速双壁"；受众与 Flappy Dash 重叠但深度不同（背版 vs 纯反应）。

### 组合为何成立
- 单键跳跃=零门槛，固定路线=有深度：入门 3 秒，精通靠背版与极限跳点——休闲与硬核同席。
- 每日路线的"学习-进步-刷优"回路比随机跑酷的"听天由命"留存强一个量级（速度曲线固定后，成绩提升=技术提升，正反馈诚实）。
- 工程上是全站最简引擎（横卷轴+跳跃+线段地面），与站内六款 R1/R2 存量并行开发不冲突。

---

## 二、玩法设计

### 物理常量（与策划可达性验证一致，实现照抄）
```
画布 480×720 | 重力 G=2200 px/s² | 跳跃初速 JUMPV=780 px/s（可变跳：松手时 vy>−320 则截断为 −320）
速度坡度：240 px/s 起步，每秒 +6 px/s，封顶 420 px/s
跳跃高度 138px / 空中时间 0.71s → 平地极限跳距 = 速度×0.71s
判定：脚底接触屋顶面即着地；碰尖刺=死；跌出屏幕底=死；死亡后 1s 自动重开（零等待）
关卡块接缝：块间 gap 归入后块首 gap 计
```

### 规则（MVP 共 6 条）
1. 自动向右跑，玩家只有**一个动作：跳**（点按跳，长按跳更高——松手截断机制）。
2. 障碍三族：**断崖**（屋顶间隙，掉下去死）、**尖刺**（屋顶上的刺条，碰到死）、**高台**（高一级的屋顶，需满跳登上去）。
3. **经典模式**：随机块无限连打，距离=分数（米）。
4. **每日路线**：`mulberry32(YYYYMMDD)` 按进度权重选 14 块（前期暖身块、后期高难块，构造与验证见下），有**终点线**；完赛=距离+500 完赛奖励，死亡=已跑距离。全球同题，当日可反复挑战取最优。
5. 死亡零惩罚：1 秒自动重开（每日模式重开路线不变——背版逻辑成立）。
6. 结算：距离/用时（每日）/最高连跳（连续无失误跳数）；破纪录扫光。

### 关卡块池（8 块，策划设计+跳跃可达性数值验证：所有跳距 ≤ 该速度带极限×0.95，尖刺 ≤ 半个空中距离，墙高 ≤ 118px）

```js
// 物理包络：跳跃高度 138px | 空中时间 0.71s | 块速度带内极限跳距×0.95 为允许上限
// 每块：{band:[速下,速上], gaps:[断崖宽], spikes:[刺条宽], walls:[台高], roofW:[顶宽]}
const CHUNKS = [
 {id:'C1', band:[240,280], gaps:[100,110,90],  spikes:[],      walls:[],      roofW:[340,320,360]},
 {id:'C2', band:[280,330], gaps:[140,145,130], spikes:[],      walls:[],      roofW:[300,300,320]},
 {id:'C3', band:[260,310], gaps:[110,120],     spikes:[70,60], walls:[],      roofW:[300,340]},
 {id:'C4', band:[270,330], gaps:[120,130],     spikes:[],      walls:[100,110],roofW:[300,320]},
 {id:'C5', band:[290,350], gaps:[150,140],     spikes:[80],    walls:[90],    roofW:[280,300]},
 {id:'C6', band:[320,380], gaps:[155,165],     spikes:[],      walls:[],      roofW:[260,280,300]},
 {id:'C7', band:[320,380], gaps:[170,160],     spikes:[70,80], walls:[],      roofW:[150,160,140]},
 {id:'C8', band:[340,420], gaps:[180,170],     spikes:[85,75], walls:[115],   roofW:[240,220]},
];
```

**每日路线构造**：`mulberry32(YYYYMMDD)` → 依进度 p=块序/13 选带：p<0.25→C1；p<0.5→C2/C3；p<0.75→C4/C5/C6；否则→C6/C7/C8（种子抽取，同日必然同序——已验证确定性）。块内 gap/spike/wall 参数由种子在该块数据内抽取（数量按 roofW 序列）。速度随全局时间增长（与块 band 相容：路线前段必然低速配低难块）。

### 核心循环（4 步）
1. **跑**：起跑即加速，断崖逼近——什么时候起跳？
2. **死**：掉崖/刺/墙——1 秒重生，路线原样（"就差最后一跳"）。
3. **背**：同一条路跑五遍，肌肉记忆成型，极限跳点浮现。
4. **竞**：完赛时间/距离破纪录→分享卡；明天换新路线，水平归零再来（speedrun 的每日轮回）。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 点按屏幕任意处=跳（长按高跳、松手短跳）；死亡自动重开 |
| 鼠标 | 同触屏 |
| 键盘 | `Space`/`↑`/`W` = 跳；`R` = 立即重开 |

### 美术方向（霓虹色板）
- 天台场景：远景城市剪影双层视差（复用 Flappy Dash 规范），中景屋顶=`#1e2a4a` 面+青 `#00e5ff` 描边发光边缘。
- 玩家=霓虹小人剪影（品红 `#ff2d95` 描线火柴人，跑动程序化摆腿），跳跃拉伸挤压（起跳拉长/落地压扁——手感 juice）。
- 尖刺=金 `#ffd54a` 三角阵列+危险红光呼吸；终点线=格纹旗门+彩带。
- 死亡=碎裂粒子+短震屏+瞬时重生（节奏不断）；完赛=全屏"FINISH!"斜切字+计时定格。

---

## 三、长线留存设计（五件套逐项）

### ① 个人进度
- **MVP**：生涯统计（局数/总里程/完赛次数）+ 个人最佳（经典最远距离 / 每日最优距离）；段位实时展示。
- **R1**：成就徽章墙 8 枚——起跑（首局）/ 百米飞人（单局 500m）/ 千米王者（1000m）/ 完赛新人（首次完赛每日路线）/ 完赛大师（每日 <30s）/ 三日连胜 / 七日连胜 / 无伤完赛（零死亡完赛）。
- **R2**：角色皮肤 3 套（霓虹火柴人→闪电侠配色→幽灵拖尾），徽章解锁。

### ② 个人排行榜
- **MVP**：Top10 本地榜（经典米数+每日距离双列表，含日期）+ 每周最佳（`YYYY-Www`）；结构含 `date`/`dailyDate`/`seed` 字段为全局榜预留。
- **R1**：目标线——每日路线 HUD 显示"个人最佳距离"幽灵标记（在赛道上标出上次死亡点！——speedrun 精髓：看得见的对手是昨天的自己）。
- **R2**：ghost 跑者（半透明重放个人最佳路线跑动）。

### ③ 一键分享
- **MVP**：结算面板"分享"→ canvas 成绩卡（距离或完赛时间/段位/日期+`seyrs1985.github.io/neonplay` 链接+今日路线进度条）→ Web Share API→剪贴板降级：`🏃 Rooftop Rush 今日路线跑到 6,420px（差 2 块完赛）| 链接`；完赛文案：`🏁 完赛！32.4s`。
- **R1**：每日分享带 `#RooftopRushDaily 09-13` 标签；"比昨天多跑 Xpx"进步卡。
- **R2**：无伤完赛金色卡框。

### ④ 回访钩子
- **MVP**：**每日路线**（日期种子，全球同题，当日最优距离计戳）+ **游戏内连胜**（`np_rooftop-rush_streak`，月度补签卡 1 张）。
- **R1**：连胜日历热力格+断签提醒；每日路线"死亡点热图"（自己最常死的位置标红——背版辅助=留存辅助）。
- **R2**：每日 3 小任务（玩 3 局 / 完成每日 / 单局 10 连跳）。

### ⑤ 目标阶梯
- **MVP**：七段位按经典模式最远距离：青铜 <500m / 白银 500-999 / 黄金 1000-1499 / 白金 1500-1999 / 钻石 2000-2749 / 大师 2750-3499 / 传奇 ≥3500。
- **R1**：徽章墙与段位合并展示；首个完赛解锁第二皮肤（衔接收集）。
- **R2**：周度路线归档（历史每日路线可回放练习）；月度赛季。

### 存档键名清单（规范 `np_<slug>_<key>`，全部 JSON 字符串）
| 键 | 数据结构 | 分期 |
|---|---|---|
| `np_rooftop-rush_best` | `{"meters":1520,"date":"2026-09-13"}` | MVP |
| `np_rooftop-rush_top10` | `[{"meters":..,"mode":"classic|daily","date":".."}] ≤10` | MVP |
| `np_rooftop-rush_daily` | `{"date":"2026-09-13","meters":..,"finished":false,"timeSec":..}` | MVP |
| `np_rooftop-rush_streak` | `{"count":3,"last":"2026-09-13","best":7,"protect":1}` | MVP |
| `np_rooftop-rush_stats` | `{"games":22,"meters":15400,"finishes":2,"bestCombo":31}` | MVP |
| `np_rooftop-rush_weekly` | `{"weekKey":"2026-W37","best":{"meters":..}}` | MVP（展示可 R1） |
| `np_rooftop-rush_badges` | `["first_run","500m","..."]` | R1 |
| `np_rooftop-rush_settings` | `{"skin":"neon","sound":true}` | R2 |

---

## 四、商业化
- **广告位**：落地页构建器默认注入位照旧；游戏内零插屏——死亡即重开的节奏不能打断。
- P2 预留：结算面板"看激励广告=今日路线复活一次（死亡点续跑）"按钮位注释（AdSense 接入后启用；不影响每日成绩公平性——复活成绩单独标记）。

---

## 五、SEO

**关键词簇**：`parkour game online free` / `runner game no download` / `endless runner web` / `daily challenge runner` / `one button game` / `rooftop runner` / `speedrun game online`。标题建议：`Rooftop Rush — Free One-Button Parkour Runner with a Daily Track`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Rooftop Rush?** — A free one-button parkour runner: auto-run across neon rooftops, jump gaps and spikes, chase distance. No download, no account.
2. **What is the Daily Track?** — Every day a fixed route is generated from the date seed — identical worldwide. Learn the route, beat your time: speedrun culture, in your browser.
3. **How do I jump higher?** — Hold to jump higher, release early for a short hop. Walls need a full hold; flat gaps often need a quick tap. Dying is instant and free — restarts take 1 second.
4. **Does progress save?** — Yes: best distance, daily results and streaks save automatically on your device, and you can share your run as a card in one tap.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 Flappy Dash 与 Reflex Rush（街机动作互链）。

---

## 六、MVP 范围（开发 Agent 一轮 ≤15 分钟，含留存基线）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；canvas（复用站内 bootstrap+DPR）。
- 物理：常速横卷轴+速度坡度、单键可变跳（松手截断 −320）、脚底-屋顶面着地、尖刺矩形判定、跌落死；死亡 1s 自动重开。
- 关卡块数据原样粘贴（已数值验证勿改）；块内参数由种子抽取；每日路线构造按二节权重伪代码；经典模式纯随机无限。
- **留存基线（模板硬性要求）**：best/Top10/weekly/daily/streak（月度补签卡）/stats 六键按清单，死亡/完赛即存+10s 自动存；分享卡 canvas+Web Share API→剪贴板降级；段位+差值展示。
- 动效：跳跃 squash/stretch、死亡碎裂粒子+震屏、完赛 FINISH 定格、NEW BEST 扫光；中英 i18n（np_core）；`__qaState/__qa`（含 `__qa.route()` 返回确定性块序列、`__qa.autoJump()` 按谱面自动跳）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位。

**不做（明确砍掉）**：音效、滑铲/二段跳、移动平台、皮肤、徽章墙、ghost 跑者、小任务、zen 模式。
**超时降级顺序**：先砍 weekly 榜（保 best/daily/streak）→ 再砍可变跳（固定跳高）→ 关卡块砍至 6 块（保难度梯度）→ 每日构造+跳跃核心不可砍。

---

## 七、留存路线图 R1/R2

- **R1（1-2 个后续轮次）**：成就徽章墙 8 枚（np_rooftop-rush_badges）、死亡点热图（背版辅助）、HUD 个人最佳距离幽灵标线、每日分享带日期标签、连胜日历热力格。
- **R2**：每日 3 小任务、角色皮肤 3 套（徽章解锁）、ghost 跑者重放、历史路线回放练习（周归档）、月度赛季、激励广告复活位启用。

---

## 八、验收标准

1. 线上 `/rooftop-rush/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. **玩法验证红线（LESSONS 第 9 条）**：qa_playtest 用 `__qa.route()` 断言当日路线确定性（两次生成一致）+ `__qa.autoJump()` 按谱面自动跳跃跑完前 3 块不断死→断言距离递增；人为不跳→断言死亡与 1s 重开；全程 `window.onerror` 零报错。纯布局 pass 不算可玩。
3. **可达性 QA（本作特有红线）**：`__qa.route()` 输出的每块参数必须落在 CHUNKS 数据与物理包络内（gap ≤ 块速度带下限×0.71×0.95 等，脚本断言）——防种子抽出不可跳组合。
4. **留存验收（模板硬性要求）**：
   - 刷新后 best/Top10/streak/daily 戳不丢（逐键核对第三节清单）；
   - 连胜跨天 +1/断档归 1/补签卡消耗（改本地时间验证）；
   - 每日种子确定性：同日两次加载路线块序列一致；次日不同；
   - 分享卡可生成（canvas 非 blank）含站点链接，剪贴板降级可用；
   - 全部存档键名与第三节清单一一对应。
5. 数值正确性：跳跃高度/空中时间与常量表吻合（±3%）、速度坡度 240→+6/s→420 封顶、段位阈值边界（1499=黄金、1500=白金）、完赛奖励 +500。
6. 手感底线：跳跃输入延迟 ≤1 帧（keydown 即时响应，禁用 keydown repeat 重跳）、死亡重开 ≤1s、60fps 稳定。
7. UI 文案走 np_core L 字典（`np_lang` 联动）；键盘 Space/↑ 可完整游玩。
8. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过。

---

### 附：策划备选池（供后续轮次）
- **Solitaire Golf / Sudoku 每日**：neon-solitaire 上线后看纸牌品类数据；数独疑似 ops 规划中（neon-solitaire 文档提及），避让。
- **Plinko×2048 / Pinball**：弹球疲劳——暂缓。
- **Onet 连连看**：zh 强记忆点，BFS 路径引擎——备选头名（若 ops 需要更多解谜向）。
- **R1/R2 内容轮**：六款已上线的 R1/R2 全部待追加（reflex-rush 徽章/neon-hoops 皮肤/tile-rush 主题/neon-beats 音色/word-hive 中文包/nonogram 7×7），建议 ops 排期时新游戏与存量深耕交替。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-13 · 关卡块 8 块经跳跃可达性数值验证（跳距 ≤ 速度带极限×0.95、尖刺 ≤ 半空中距、墙高 ≤ 118px）；每日路线确定性已脚本验证 · 品类佐证：CrazyGames 跑酷分类、speedrun.com Glitch Runner 竞速社区、Canabalt/Trackmania 机制参照*

> 已实现:2026-09-15 https://seyrs1985.github.io/neonplay/rooftop-rush/
