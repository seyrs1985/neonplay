# Neon Beats (neon-beats)

> 一句话卖点：**每天一首全球同曲的程序化芯片音乐**——曲目由日期种子实时合成（零音频素材），三轨下落点按跟着旋律敲，准确率定段位，弹指间你就是演奏者。

- **缝合来源**：Piano Tiles（下落点按节奏循环）× 程序化芯片音乐生成（WebAudio 挖掘机——站内 memory-pairs 音效四件套已验证能力）× Wordle 每日同题（Track #N 全球同曲）
- **目标玩家**：节奏游戏玩家（Piano Tiles/FNF 人群）；喜欢"今日新曲"收集欲的每日挑战党；想试节奏游戏但被"要下歌/要注册"劝退的轻玩家
- **单局时长**：40-60 秒/曲（约 96-128 音符）

---

## 〇、差异化红线回答（LESSONS.md 第 8 条）

**"比 Google 搜索前 3 名多做了什么？"**——节奏品类 web 端三类供给全有短板：固定曲目克隆（[MagicTiles 等](https://magictiles.org/game/magic-piano-music)，曲目有版权/下架风险且无每日）、用户上传生成工具（[GenMusic](https://www.genmusic.im/tools/rhythm-game)/[Rhythm Maker](https://jackselleck.itch.io/rhythm-maker-levels-from-any-song) 要求自备 MP3）、开源固定谱（[Bemuse](https://bemuse.ninja/)）。本作：

1. **种子生成曲，全球同曲**——曲目（旋律/音阶/曲风/BPM/谱面）由 `mulberry32(YYYYMMDD)` 实时合成：无音频文件、无版权风险、加载即玩，且**全球玩家每天打同一首"Track #N"**，成绩天然可比。Wordle 的"全球同题"仪式感首次进入节奏品类。→ 满足红线"组合两个已有玩法"（下落点按 × 程序化作曲）。
2. **你是演奏者，不是听众**——点对时播放对应旋律音，点错无声：节奏游戏第一次"零素材"还能"曲随手动"（Piano Tiles 的核心爽感用生成曲复活）。→ 满足红线"组合已有玩法创造新体验"。
3. **无失败压力**——曲子永远播完，准确率定 grade（S/A/B/C）与段位；对节奏新手零挫败，契合站点 zen 基因。
4. **填补全站最后感官空白**——17 款游戏无音频向品类；站内已有程序化音效先例（memory-pairs），技术路径已验证。

## 评分卡（按运营入队线口径）

| 维度 | 分 | 说明 |
|---|---|---|
| 搜索需求 | 3/5 | "rhythm game online / piano tiles / music game" 常青稳定 |
| 竞争空白 | 4/5 | "种子每日曲+全球同题+零素材" web 端无供给（调研确认：生成类全要用户上传文件） |
| 变现意图 | 3/5 | 中等会话+每日回访 |
| 开发成本低 | 3/5 | WebAudio 前瞻调度器+判定窗口+三轨 canvas；生成算法文档已给伪代码；零素材 |
| 复访价值 | 5/5 | 每日新曲+连胜+全曲准确率收集（"本周全 S"） |
| **合计** | **18/25** | 超过 17 分入队线 |

---

## 一、调研依据（2026-09-13）

### 热门拆解（含留存机制）
| 游戏 | 核心循环 | **留存机制** | 借鉴→本土化 |
|---|---|---|---|
| **Piano Tiles 系**（超休闲标杆，手游数十亿下载） | 音块下落→点对应列→弹出旋律音 | 曲库解锁+排行榜+广告复活 | 下落点按+点对出声；曲库换成"每日生成曲" |
| **Friday Night Funkin'**（web 节奏文化顶流） | 对抗式按键判定→周目推进 | 社区 MOD 曲生态 | 判定档位（Perfect/Good/Miss）与连击 UI；曲生态换成日期种子 |
| **Bemuse/GenMusic**（web 生成向） | 固定谱或自备文件生成 | 无回访钩子 | 反衬：我们的"每日种子曲"即差异化本体 |

### 需求与供给判断
- 生成类节奏的既有形态都要用户带文件（GenMusic/Rhythm Maker）或依赖 AI 服务（TempoVibe 用 Suno）——**"无需上传、无需网络请求、确定性生成"的每日曲形态空白**。
- 版权免疫是结构性优势：旋律由音阶随机游走生成，不触碰任何曲目。
- 站内技术先例：memory-pairs 程序化音效四件套已上线，WebAudio 基建非从零。

### 同构分析（饱和度）
- 固定曲目节奏 web 游戏饱和（FNF 及数百克隆），卷曲库量与 IP 联动；版权与下架是它们的天花板。
- 生成向全是工具形态（带文件来），无"开箱即玩的每日生成曲游戏"。
- 零素材=零版权=零加载，恰好打在竞品三个结构性软肋上。

### 异构分析（NeonPlay 现有 17 款的缺口）
现状四类分区：🎮街机动作 6、🧩益智解谜 6、🐝词与逻辑 4、💫放置挂机 1；pending：反应/体育/层叠三消。
- **缺口：音频/节奏=0 款**——全站所有游戏静音运行，节奏是最后一个未覆盖的感官品类（视/触/听中的"听"）。
- 受众：节奏玩家年轻且分享欲强（FNF 社区文化），accuracy 截图天然社交货币；与站内益智人群互补。

### 组合为何成立
- Piano Tiles 验证过"点对出声=演奏感"是节奏品类最强爽点；生成曲让这个爽点每天有新内容，而成本为零（算法出曲）。
- 五声音阶随机游走**永远和谐**——生成的曲子不会难听，玩家敲出的就是一段乐句，成就感和音乐性同时成立。
- 准确率是天生可比较的数字（%），配 grade（S/A/B/C）与段位，晒卡语境现成。

---

## 二、玩法设计

### 规则（MVP 共 6 条）
1. 三轨下落式：音符（霓虹横条）从顶部下落至底部判定线；三轨对应三个触区/按键。
2. **曲目由种子生成**（确定性，两台设备同曲）：`seed` → 音阶（C 大调五声/小调五声/布鲁斯三选一）→ BPM（110-140）→ 音色（square/triangle/saw）→ 旋律（五声随机游走 96-128 音符，含少量休止）→ 谱面（每音符分配轨 0/1/2，避免同 250ms 窗口内同轨双押）。
3. **点对出声**：命中音符即以对应音高播放旋律音（方波/三角波+衰减包络）；底层节拍器音轨（tick 底鼓/踩镲，纯合成）随曲自动播放——miss 不中断音乐，只是旋律缺一个音。
4. 判定：Perfect ±60ms（+300）/ Good ±130ms（+150）/ Miss（0，连击清零）；**无失败**——曲子永远完整播放，准确率= `(300×P+150×G)/(300×总音符)`。
5. 连击：连续命中计数，×2（20 连）/×3（50 连）分数倍率；结算=总分+准确率+grade（S≥95 / A≥85 / B≥70 / C）。
6. 模式：**今日曲目 Track #N**（N=日期距 2026-01-01 天数，种子 YYYYMMDD，全球同曲，当日可重复挑战取最高）/ **随机练习**（随机种子）。

### 段位阶梯（按单局准确率）
| 段位 | 准确率 | | 段位 | 准确率 |
|---|---|---|---|---|
| 🏆 传奇 | ≥99% | | 🟡 黄金 | 75-84% |
| 🥇 大师 | 96-98% | | ⚪ 白银 | 60-74% |
| 💎 钻石 | 92-95% | | 🟤 青铜 | <60% |
| 🥈 白金 | 85-91% | | | |

### 核心循环（4 步）
1. **落指**：音符条下落，看谱型预判三指分工。
2. **演奏**：点中即出声——旋律在你指下流淌，连击表跳动。
3. **收官**：最后一音落下，准确率定格，grade 弹出。
4. **收集**：Track #N 成绩入档；明天 Track #N+1 是全新的曲子——"今天的歌你 S 了吗"。

### 操作方案
| 端 | 操作 |
|---|---|
| 触屏 | 屏幕三分区（三轨）点按对应轨 |
| 鼠标 | 同触屏点击轨区 |
| 键盘 | `A S D` 或 `← ↓ →` 对应三轨（站点键位规范双方案） |

### 美术方向（霓虹色板）
- 底 `#0a0a18` 深空；三轨以暗色玻璃列分隔，轨线 `#1e2a4a`；判定线=青 `#00e5ff` 光带，随节拍呼吸脉冲（BPM 同步）。
- 音符条按轨配色：青 `#00e5ff` / 品红 `#ff2d95` / 金 `#ffd54a`，命中爆裂成同色粒子+判定文字（PERFECT 白/GOOD 灰/MISS 红 `#ff2d95`）。
- 背景随节拍扩散的圆环涟漪（BPM 同步，cheap 大气）；连击数大字居中上方弹跳。
- 结算=玻璃拟态面板：准确率大字+grade 徽章（S 金色辉光）+段位+波形装饰线（本曲旋律的波形快照，生成感可视化——"这首曲子的 DNA"）；NEW BEST 金色扫光。

---

## 三、长线留存设计（五件套逐项）

### ① 个人进度
- **MVP**：生涯统计（曲目数/总音符/Perfect 数）+ 个人最佳准确率（分每日/练习两榜）；段位实时展示。
- **R1**：成就徽章墙 8 枚——初试啼声（完成首曲）/ 渐入佳境（首次 A）/ 完美主义（首次 S）/ 音无瑕疵（100% Perfect 全曲）/ 三日连胜 / 七日连胜 / 曲库十曲（生涯 10 首）/ 极速指法（1.25× 速度下 A 以上）。
- **R2**：合成器音色包 3 套（芯片方波→柔和三角→霓虹锯齿）与音符拖尾皮肤，徽章解锁，无付费墙。

### ② 个人排行榜
- **MVP**：Top10 本地榜（准确率/分数/Track 号/日期）+ 每周最佳（`YYYY-Www`）；结构含 `track`/`date`/`seed` 字段为全局榜预留。
- **R1**：目标线——结算显示"距个人最佳差 X%"；Track 历史成绩表（本地每日曲成绩一览）。
- **R2**：ghost——练习模式显示"个人最佳准确率"实时对比虚线。

### ③ 一键分享
- **MVP**：结算面板"分享"→ canvas 成绩卡（Track #N/准确率/grade 徽章/段位/日期+`seyrs1985.github.io/neonplay` 链接+旋律波形装饰）→ Web Share API→剪贴板降级：`🎵 Neon Beats Track #256 打出 97.2% (S) 💎钻石 | 链接`。
- **R1**：每日分享带 `#NeonBeatsDaily Track #N` 标签；全 S 周成就卡。
- **R2**：连胜里程碑卡与生涯 Perfect 计数卡。

### ④ 回访钩子
- **MVP**：**今日曲目**（日期种子全球同曲，当日最高成绩计戳）+ **游戏内连胜**（`np_neon-beats_streak`，月度补签卡 1 张）。
- **R1**：连胜日历热力格+断签提醒；Track 历史一览（每日成绩收集册）。
- **R2**：每日 3 小任务（完成今日曲 / 准确率 90%+ / 玩 1 局练习）。

### ⑤ 目标阶梯
- **MVP**：七段位+结算"距下一段位差 X%"；grade S/A/B/C 双层目标（段位+grade）。
- **R1**：徽章墙与段位合并展示；首次 S 解锁第二款音色（衔接收集）。
- **R2**：月度赛季归档；速度挑战模式（1.25×/1.5× 谱面流速，高风险高段位加成）。

### 存档键名清单（规范 `np_<slug>_<key>`，全部 JSON 字符串）
| 键 | 数据结构 | 分期 |
|---|---|---|
| `np_neon-beats_best` | `{"acc":97.2,"score":..,"track":256,"date":"2026-09-13"}` | MVP |
| `np_neon-beats_top10` | `[{"acc":..,"score":..,"track":..,"date":".."}] ≤10` | MVP |
| `np_neon-beats_daily` | `{"date":"2026-09-13","track":256,"acc":..,"grade":"S","done":true}` | MVP |
| `np_neon-beats_streak` | `{"count":3,"last":"2026-09-13","best":7,"protect":1}` | MVP |
| `np_neon-beats_stats` | `{"tracks":12,"notes":1344,"hits":1290,"perfects":980}` | MVP |
| `np_neon-beats_weekly` | `{"weekKey":"2026-W37","best":{"acc":..}}` | MVP（展示可 R1） |
| `np_neon-beats_badges` | `["first_track","first_a","..."]` | R1 |
| `np_neon-beats_settings` | `{"keys":"ASD","synth":"square"}` | R2 |

---

## 四、商业化
- **广告位**：落地页构建器默认注入位照旧；游戏内零插屏——节奏游戏插屏即毁（拍点不能停）。
- P2 预留：结算面板"看激励广告=今日曲双倍分"按钮位注释（AdSense 接入后启用，MVP 不实现）。

---

## 五、SEO

**关键词簇**：`rhythm game online free` / `piano tiles online` / `music game no download` / `beat game browser` / `daily music challenge` / `tap game music` / `web audio game`。标题建议：`Neon Beats — Free Online Rhythm Game with a New Track Every Day (No Download)`。

**FAQ 4 条要点（落地页 FAQPage schema）**：
1. **What is Neon Beats?** — A free browser rhythm game: tap falling notes as the lanes scroll and YOU play the melody — every correct hit sounds the next note of the song.
2. **What is Track of the Day?** — Each day a new chiptune track is generated from the date seed — identical for players worldwide. Compare accuracy, climb from Bronze to Legend.
3. **Do I need to download songs or an app?** — No. Music is synthesized live in your browser with Web Audio; there are no files, no accounts, and nothing to install.
4. **What if I miss notes?** — Nothing breaks. The song always finishes and your accuracy decides your grade (S/A/B/C) and rank — perfect for rhythm beginners.

落地页同款要求：VideoGame/FAQPage schema、game-first 首屏、面包屑、推荐位挂 Reflex Rush 与 Neon Pop（街机动作互链）。

---

## 六、MVP 范围（开发 Agent 一轮 ≤15 分钟，含留存基线）

**做**：
- 结构仿站内惯例：`index.html + game/style.css + game/js/main.js + game/js/game.js`；canvas 三轨+WebAudio。
- 生成算法按二节伪代码（mulberry32 种子→音阶/BPM/音色/旋律随机游走/谱面轨分配，同 250ms 窗口不撞同轨）；WebAudio 前瞻调度（lookahead 0.1s/timer 25ms 模式），AudioContext 在 PLAY 点击后创建（自动播放策略合规）。
- 核心玩法：三轨下落+判定（±60/±130ms）、点对出声+底层节拍器（tick 底鼓踩镲纯合成）、连击倍率（×2/×3）、无失败完整播完、结算（总分/准确率/grade/段位+差值）。
- **留存基线（模板硬性要求）**：best/Top10/weekly/daily/streak（月度补签卡）/stats 六键按清单，结算即存+10s 自动存；分享卡 canvas+Web Share API→剪贴板降级；今日曲+随机练习双模式。
- 动效：判定粒子/判定文字/节拍涟漪/连击弹跳/NEW BEST 扫光；中英 i18n（np_core）；`__qaState/__qa`（含 `__qa.autoPlay()` 全自动命中与 `__qa.chart()` 返回确定性谱面供断言）。
- 落地页：VideoGame/FAQPage schema + 4 FAQ + 推荐位。

**不做（明确砍掉）**：长按/滑条音符、双押、速度调节、成就墙、音色包、ghost 线、小任务、zen 模式。
**超时降级顺序**：先砍 weekly 榜（保 best/daily/streak）→ 三轨降两轨（保三轨优先）→ 底鼓节拍器可砍（保旋律主音）→ 生成算法+每日+判定不可砍。

---

## 七、留存路线图 R1/R2

- **R1（1-2 个后续轮次）**：成就徽章墙 8 枚（np_neon-beats_badges）、结算目标线差值、连胜日历热力格+断签提醒、Track 历史收集册、每日分享带 `#NeonBeatsDaily` 标签。
- **R2**：每日 3 小任务、合成器音色包+拖尾皮肤（徽章解锁）、ghost 准确率对比线、速度挑战模式（1.25×/1.5×）、月度赛季归档、激励广告双倍分位启用。

---

## 八、验收标准

1. 线上 `/neon-beats/` HTTP 200；375×667 游戏框首屏 58vh（一票否决项）；无控制台报错。
2. **玩法验证红线（LESSONS 第 9 条）**：qa_playtest 用 `__qa.autoPlay()` 完整演奏今日曲→断言准确率 100% 与结算面板弹出；再人为 miss 3 音→断言连击清零与 grade 下降；`__qa.chart()` 两次调用返回完全一致谱面（确定性）；全程 `window.onerror` 零报错。纯布局 pass 不算可玩。
3. **音频 QA（本作特有）**：点 PLAY 后 AudioContext 建立；autoPlay 过程中采样 ≥10 次命中，断言每次命中触发对应音高振荡器（`__qa.lastNoteFreq` 与谱面音高一致）；页面无 AudioContext 警告报错。
4. **留存验收（模板硬性要求）**：
   - 刷新后 best/Top10/streak/daily 戳不丢（逐键核对第三节清单）；
   - 连胜跨天 +1/断档归 1/补签卡消耗（改本地时间验证）；
   - 每日种子确定性：同日两次加载，`__qa.chart()` 谱面逐音符一致；
   - 分享卡可生成（canvas 非 blank）含站点链接，剪贴板降级可用；
   - 全部存档键名与第三节清单一一对应。
5. 数值正确性：判定窗口 ±60/±130ms、计分 300/150、连击倍率 20/50 连升档、段位阈值边界（94.9%=白金、95%=钻石）、grade 边界（94.9%=A、95%=S）。
6. 时间基驱动：下落进度随音频时钟（AudioContext.currentTime），后台切换不失步；60fps 渲染与音频解耦。
7. UI 文案走 np_core L 字典（`np_lang` 联动）；键盘 ASD 与方向键双方案可完成一曲。
8. IndexNow 提交；`STATUS.md` 运营日志追加；开发侧按惯例写 `data/run_stats.jsonl`；iOS Safari + 桌面 Chrome 冒烟通过（iOS 需验证首次点按解锁音频）。

---

### 附：策划备选池（供后续轮次）
- **Plinko×2048**：弹球疲劳——暂缓。
- **Solitaire Golf 每日发牌**：规则引擎小、SEO 大，但饱和度高——备选。
- **Flick 第二作/Tile Match 主题包**：看前三款上线数据——观察。
- **R1/R2 内容轮**：reflex-rush 徽章、neon-hoops 皮肤、tile-rush 主题包、Word Hive 中文包、Nonogram 7×7。

*产出：NeonPlay 市场分析+游戏策划 Agent · 2026-09-13 · 供给调研：Sound Horizons（独立 devlog）、GenMusic/Rhythm Maker（需用户上传文件）、MagicTiles/Bemuse（固定曲目）——"种子每日曲全球同题"形态确认空白；技术先例：memory-pairs 程序化音效*
