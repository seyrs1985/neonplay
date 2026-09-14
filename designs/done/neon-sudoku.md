# Neon Sudoku (neon-sudoku)

> 一句话卖点：**每天一道全球同题的数独，求解器保证唯一解**——三档难度按格数精确分级、铅笔笔记、无广告无账号，解题时间定段位，NYT 式的每日仪式感。

- **缝合来源**：经典数独（99×9 数字放置）× Wordle 每日同题（日期种子出题+全球可比）× Human Benchmark 式计时段位（解题时间=段位度量）
- **目标玩家**：数独常青人群（全球最大纸笔谜题品类，25-65 岁主力）；被 sudoku.com 等头部广告打扰的用户；想要"每日一题"仪式感的 existing 站内每日矩阵用户
- **单局时长**：Easy 5-8 分钟 / Medium 10-18 / Hard 15-30

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——"sudoku free online" 前排（sudoku.com、web 数独门户）功能完整但：广告位密、每日题仅一道且难度不可选、无段位/连胜等成长体系、中文体验次要。本作：

1. **三档难度 + 每日同题并行**——每日一题按 Easy/Medium/Hard 三题同出（同日期种子、各自全球同题），新手和老手各有"今天那道"；头部竞品每日仅一题。→ 满足红线"组合两个已有玩法"（经典数独 × 每日同题竞速框架）。
2. **求解器保证的唯一解与难度分级**——出题算法=回填+挖洞时**实时唯一解校验**（本文档已用脚本验证：40/34/28 提示格三档全部唯一解，纯 Python 单题 ≤0.71s，客户端可行）。"无多解题"是可程序化证明的公平承诺。
3. **留存五件套自带**——每日题+连胜（月度补签）+解题时间段位（Hard 时间锚定）+分享卡，接站内每日矩阵（neon-solitaire 文档提出的"每日数独"设想由本文档落地，若重合以本文档为实现依据）。
4. **零广告零账号+双语**——数独人群对"干净+大字+高对比"极敏感（年龄偏长），本站 58vh 首屏+≥44px 触区+中英双语是 App/门户弱项。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 5/5 | "sudoku" 是全球搜索 Top 级常青词（neon-solitaire 文档引用的 SE Ranking 数据同源逻辑），daily sudoku 是被 NYT/各门户验证的 ritual |
| 竞争空白 | 2/5（诚实） | 供给很多且 sudoku.com 免费版较干净；空白在"三档每日同题+段位+无广告+双语"组合 |
| 变现意图 | 4/5 | 长会话+高规律回访（与纸牌人群同级），页面广告库存型 |
| 开发成本低 | 3/5 | 出题/唯一解校验/提示算法文档已验证给伪代码；DOM 网格+笔记 UI 中等 |
| 复访价值 | 5/5 | 每日三题+连胜+时间段位，ritual 级回访 |
| **合计** | **19/25** | 超过 17 分入队线 |

---

## 一、调研依据（2026-09-14）

### 热门拆解（含留存机制）
| 游戏 | 核心循环 | **留存机制** | 借鉴→本土化 |
|---|---|---|---|
| **sudoku.com**（App/门户头部） | 选难度→填格→自动查错→计时 | 每日挑战+连胜+奖杯 | 每日挑战与连胜（站内框架复用）；广告位砍掉 |
| **NYT Games 套装**（每日谜题矩阵标杆） | 每日一题→全球同题→ streak | 每日仪式+分享+streak | 三档每日同题+分享卡；站内 🔥streak 联动 |
| **Enjoy Sudoku / HoDoKu 系**（硬核向） | 技巧分级解题 | 技巧进阶课程 | R1: 求解技巧提示（Naked Single/Hidden Pair）作为提示阶梯 |

### 需求与供给判断
- 数独是全球搜索量最大的谜题品类之一（neon-solitaire 文档引 SE Ranking 数据交叉验证同段位），"daily sudoku" 仪式被 20 年门户验证。
- 头部产品的差距点全在"打扰度"（广告/注册）与"成长感"（无段位/无连胜）；无后端静态站用日期种子+localStorage 恰好补齐。

### 同构分析（饱和度）
- 数独 web 供给多（诚实），卷题库量与皮肤；"唯一解保证+三档每日同题+时间段位+双语"组合无供给。
- 出题质量参差是品类通病（多解题/难题不可解）——求解器校验是硬承诺。

### 异构分析（NeonPlay 现有 17 款的缺口）
现状四类分区+pending 七款（反应/体育/三消/节奏/接龙/画线/跑酷）。
- **缺口：纯数字逻辑放置=0 款**——2048 是街机合成、2048 系无"约束推理"；数独是推理型数字游戏的第一性品类。
- 受众：数独人群年龄偏高、会话长、回访规律——是全站广告库存与稳定 DAU 的优质增量（与 neon-solitaire 判断同构，品类相邻不重叠）。

### 组合为何成立
- 数独自含 20 年验证的可玩性，无需发明机制——设计重心放在"每日仪式+公平出题+成长度量"三件站内已成熟的事。
- 三档每日同题让"全家都能玩今天这题"（ Easy 给新人、Hard 给老手），同一分享语境。
- 解题时间是天然可比较的数字，段位阈值锚定人群真实分布（见段位表）。

---

## 二、玩法设计

### 规则（MVP 共 7 条）
1. 9×9 标准：每行/列/宫 1-9 不重复。
2. **三档难度**（提示格数，生成时实时唯一解校验）：Easy 40 格 / Medium 34 格 / Hard 28 格（诚实注记：格数与真实难度强相关但非完全等价，R1 升级为"求解技巧分级"——统计仅用 Naked Single 可解的占比）。
3. **铅笔笔记**：格内小字候选标注（点按数字键进入笔记模式/长按切换）；行/列/宫自动排除已有数字的候选（笔记辅助，可关）。
4. **查错**：自动检查开关（默认开）：与唯一解冲突的格红显；关掉则为 zen 自律模式。同一数字高亮（选中格联动同数字格微光）。
5. **提示**：每局限 3 次，随机填充一个空格的正确数字（优先当前选中格）。
6. **每日三题**：`mulberry32(YYYYMMDD*10+难度序)` → 三题（Easy/Medium/Hard）全球同题，当日完成各自打戳；**经典练习**：随机种子任意刷。
7. 计时+暂停（暂停遮罩防偷看）；完成=用时定格+无错加成（零错误完成 +15% 积分）。

### 出题算法（已脚本验证，可直接实现）
```
1. full_grid: 回溯法随机填满 9×9（数字顺序 shuffle）
2. dig: 单元格乱序遍历，逐格尝试清空——清空后用"解数计数器"（回溯，计数到 2 即剪枝）验证唯一解，非唯一则回填
3. 达到目标提示格数停止（Easy 40 / Medium 34 / Hard 28）
4. 种子：mulberry32(YYYYMMDD*10 + 难度序号 1/2/3)
实测（纯 Python）：Easy 0.18s / Medium 0.35s / Hard 0.71s，全部唯一解——JS 实现同量级
```

### 段位阶梯（按 Hard 难度个人最佳用时）
| 段位 | Hard 用时 | | 段位 | Hard 用时 |
|---|---|---|---|---|
| 🏆 传奇 | <8:00 | | 🟡 黄金 | <30:00 |
| 🥇 大师 | <12:00 | | ⚪ 白银 | <45:00 |
| 💎 钻石 | <16:00 | | 🟤 青铜 | ≥45:00 |
| 🥈 白金 | <22:00 | | | |

*Easy/Medium 完成计入连胜与统计但不计段位（段位=Hard 专用度量，保证可比性）。*

### 核心循环（4 步）
1. **扫面**：找唯一候选格（排除法），数字感浮现。
2. **落格**：填格+铅笔笔记约束收窄，连锁反应式解开。
3. **收官**：最后一宫闭合，用时定格+零错误加成。
4. **打卡**：每日三题完成度+分享卡；明天三道新题（唯一解保证）。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 点格选中→点数字盘填入；笔记模式切换钮；长按数字盘=笔记填入 |
| 鼠标 | 同触屏 |
| 键盘 | 方向键移动光标 / 数字键填入 / N 切换笔记 / H 提示 / P 暂停（全功能键盘可达） |

### 美术方向（霓虹色板）
- 底 `#0a0a18` 深空；棋盘玻璃拟态+粗宫线青 `#00e5ff` 辉光；选中格/同行同列/同宫微光分区。
- 题设数字白、玩家数字青；冲突格红 `#ff2d95` 闪；同数字联动金 `#ffd54a` 微光。
- 笔记小字三列布局灰白；完成=逐格 stagger 波浪点亮+彩带+用时大字翻滚。
- 数字盘=底部大按钮（≥48px），剩余计数徽章显示该数字还差几个。

---

## 三、长线留存设计（五件套逐项）

### ① 个人进度
- **MVP**：生涯统计（总局/完成数/零错误数/各难度最佳时间）+ 每日三题完成度（今日 0/3 进度环）；段位实时展示。
- **R1**：成就徽章墙 8 枚——破题（首胜）/ 三连日 / 七连日 / 零错误大师 / Hard 首胜 / Hard 16 分钟内 / 全档首胜（Easy+Med+Hard 各至少 1）/ 百题长老。
- **R2**：棋盘主题 3 套（霓虹→和风→极简白），徽章解锁。

### ② 个人排行榜
- **MVP**：Top10 本地榜（Hard 用时为主榜，含日期）+ 每周最佳用时（`YYYY-Www`）；结构含 `date`/`difficulty` 字段为全局榜预留。
- **R1**：目标线——开局面板显示"Hard 个人最佳 14:32"；每日历史用时曲线。
- **R2**：ghost——练习模式显示"个人最佳用时进度幽灵"（按解题进度百分比对比时间轴）。

### ③ 一键分享
- **MVP**：完成面板"分享"→ canvas 成绩卡（难度/用时/零错误徽章/日期+`seyrs1985.github.io/neonplay` 链接）→ Web Share API→剪贴板降级：`🔢 Neon Sudoku 每日 Hard 完成 12:47 零错误 💎钻石 | 链接`。
- **R1**：每日分享带 `#NeonSudokuDaily 09-14` 标签；连胜里程碑卡。
- **R2**：全三题日卡（Easy+Med+Hard 一日全清）。

### ④ 回访钩子
- **MVP**：**每日三题**（日期种子，全球同题，各自打戳）+ **游戏内连胜**（`np_neon-sudoku_streak`，完成任意每日题即计，月度补签卡 1 张）。
- **R1**：连胜日历热力格+断签提醒；每日完成度 0/3 进度环常驻开局面板。
- **R2**：每日 3 小任务（完成 Easy / Medium 零错误 / Hard 完成任一）。

### ⑤ 目标阶梯
- **MVP**：七段位（Hard 用时）+ 结算"距下一段位差 mm:ss"。
- **R1**：徽章墙与段位合并；Hard 破 16 分钟解锁第二主题（衔接收集）。
- **R2**：月度赛季归档；"周全清挑战"（一周内每日三题全完成）。

### 存档键名清单（规范 `np_<slug>_<key>`，全部 JSON 字符串）
| 键 | 数据结构 | 分期 |
|---|---|---|
| `np_neon-sudoku_best` | `{"hardTimeSec":767,"date":"2026-09-14"}` | MVP |
| `np_neon-sudoku_top10` | `[{"difficulty":"hard","timeSec":..,"zeroErr":true,"date":".."}] ≤10` | MVP |
| `np_neon-sudoku_daily` | `{"date":"2026-09-14","done":[true,true,false],"times":[..,..,null]}` | MVP |
| `np_neon-sudoku_streak` | `{"count":3,"last":"2026-09-14","best":7,"protect":1}` | MVP |
| `np_neon-sudoku_stats` | `{"games":8,"wins":7,"zeroErr":3,"byDiff":{"easy":3,"medium":2,"hard":2}}` | MVP |
| `np_neon-sudoku_weekly` | `{"weekKey":"2026-W37","best":{"timeSec":..}}` | MVP（展示可 R1） |
| `np_neon-sudoku_badges` | `["first_win","streak3","..."]` | R1 |
| `np_neon-sudoku_settings` | `{"autoCheck":true,"notes":true,"sound":true}` | R2 |

---

## 四、商业化
- **广告位**：落地页构建器默认注入位照旧；游戏内零插屏——数独人群对打断极敏感，这是对 sudoku.com 类产品的正面回答。P2 预留"看激励广告=3 额外提示"按钮位注释（AdSense 接入后启用）。

---

## 五、SEO

**关键词簇**：`sudoku free online no ads` / `daily sudoku challenge` / `web sudoku easy medium hard` / `sudoku puzzle game online` / `play sudoku unblocked` / `数独 在线`。标题建议：`Neon Sudoku — Free Online Sudoku with Daily Puzzles (3 Levels, No Ads)`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Neon Sudoku?** — A free online sudoku with Easy/Medium/Hard daily puzzles generated fresh from a date seed — identical for players worldwide, guaranteed unique solutions.
2. **Are the puzzles always solvable with one solution?** — Yes. Every puzzle is generated with a built-in solver that verifies exactly one solution before it reaches you.
3. **Is there a daily challenge?** — Yes: three new boards every day (Easy/Medium/Hard), same for everyone, with streak tracking and one free mulligan per month.
4. **Can I make pencil notes and check mistakes?** — Yes: pencil-note candidates, optional auto error-checking, 3 hints per game, and a full keyboard mode. Progress saves on your device.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 Neon Nonogram 与 Minesweeper（逻辑谜题互链）。

---

## 六、MVP 范围（开发 Agent 一轮 ≤15 分钟，含留存基线）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；DOM 网格。
- 出题算法按二节伪代码（mulberry32 种子+回溯填满+挖洞唯一解校验），三档参数照抄；**代码内断言生成结果唯一解**（防实现偏差）。
- 核心玩法：选格/填数/铅笔笔记（含自动排除辅助）/自动查错开关/同数字联动高亮/3 次提示/计时暂停/完成判定与零错误加成。
- **留存基线（模板硬性要求）**：best/Top10/weekly/daily/streak（月度补签卡）/stats 六键按清单，完成即存+10s 自动存；分享卡 canvas+Web Share API→剪贴板降级；段位+差值展示；每日三题+随机练习（随机种子）。
- 动效：冲突红闪、完成波浪点亮+彩带、NEW BEST 扫光；中英 i18n（np_core）；`__qaState/__qa`（含 `__qa.puzzle()` 返回确定性题面、`__qa.solve()` 自动解题）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位。

**不做（明确砍掉）**：音效、对角线/异形变体、技巧教学、主题包、ghost、小任务、错题统计页。
**超时降级顺序**：先砍 weekly 榜（保 best/daily/streak）→ 笔记自动排除辅助降级为纯手动笔记 → 提示降为 1 次 → 出题算法+每日+判定不可砍。

---

## 七、留存路线图 R1/R2

- **R1（1-2 个后续轮次）**：成就徽章墙 8 枚（np_neon-sudoku_badges）、求解技巧分级（Naked Single 占比定真难度）、提示阶梯（技巧提示而非直填）、连胜日历热力格+断签提醒、每日分享带 `#NeonSudokuDaily` 标签。
- **R2**：每日 3 小任务、棋盘主题 3 套（徽章解锁）、ghost 用时幽灵、周全清挑战、月度赛季归档、激励广告提示位启用。

---

## 八、验收标准

1. 线上 `/neon-sudoku/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. **玩法验证红线（LESSONS 第 9 条）**：qa_playtest 用 `__qa.puzzle()` 断言当日三题题面一致且提示格数在档（40/34/28±2）；`__qa.solve()` 自动解题→断言完成面板与用时；全程 `window.onerror` 零报错。纯布局 pass 不算可玩。
3. **出题 QA（本作特有红线）**：随机抽 5 个日期 × 三档，代码断言：唯一解（解数计数=1）、提示格数在档、同日同难度两次生成题面逐格一致（确定性）。
4. **留存验收（模板硬性要求）**：
   - 刷新后 best/Top10/streak/daily 不丢（逐键核对第三节清单）；
   - 连胜跨天 +1/断档归 1/补签卡消耗（改本地时间验证）；
   - 分享卡可生成（canvas 非 blank）含站点链接，剪贴板降级可用；
   - 全部存档键名与第三节清单一一对应。
5. 数值正确性：行/列/宫判定、冲突检测、零错误加成 +15%、提示限 3 次、段位阈值边界（16:00.9=白金、16:00=钻石）。
6. 交互底线：触区 ≥48px、铅笔笔记三列布局不溢出、暂停遮罩遮挡题面（防偷看）、键盘全功能可达。
7. UI 文案走 np_core L 字典（`np_lang` 联动）。
8. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过。

---

### 附：策划备选池（供后续轮次）
- **Solitaire Golf / Onet 连连看**：neon-solitaire 上线后看纸牌数据再定；Onet 诚实评分 16/25（web 供给较拥挤——本轮已让位）。
- **Plinko / Pinball**：暂缓。
- **R1/R2 内容轮**：七款待追加（reflex-rush 徽章、neon-hoops 皮肤、tile-rush 主题、neon-beats 音色、neon-doodle 笔刷、rooftop-rush 皮肤、word-hive 中文包、nonogram 7×7）——**强烈建议 ops 本周开始穿插存量 R1 轮**：pending 队列已 8 份，新游戏供给远超开发消化速度。
- **每日矩阵联动**（跨游戏"全站每日三连"完成度页）：页面型设计，超出本 Agent 模板，建议 ops 直派。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-14 · 出题算法已脚本验证（三档 40/34/28 格唯一解、纯 Python ≤0.71s/题）· 品类佐证：sudoku 全球搜索 Top 级（neon-solitaire 文档同源数据逻辑）、NYT Games 每日矩阵范式*

> 已实现:2026-09-15 https://seyrs1985.github.io/neonplay/sudoku/（每日挑战模式增强）
