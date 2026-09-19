# 踩坑与经验（每轮开工前先读）

1. **games.py 追加条目**：Python 字符串拼接极易吃掉上一条目的闭合括号——追加后必须立刻 `python -c "import games"` 验证，报错就检查前一条目的 `},` 是否完好。
2. **IndexNow 403**：密钥文件必须在域名根（seyrs1985.github.io 用户站仓库），子目录放置会被 403。
3. **deploy 凭证**：token 存于 `git config tooltide.token`，push 用 x-access-token 内联 URL，绕开凭证管理器 GUI 挂起。
4. **移动端首屏**：游戏框必须在首屏（58vh 自适应），落地页禁止在游戏框之前放标题/标语/大 emoji（375×667 验收，一票否决）。
5. **i18n**：游戏内文案用内嵌 L 字典 + `localStorage.np_lang`（与站点🌐切换器共用）；站点 chrome 用 data-i18n + i18n.js。
6. **并发**：deploy.sh 自带原子锁+push前rebase；开工前 git status 有未提交变更=上轮未完，直接跳过。
7. **GitHub Pages CDN**：部署后内容刷新有 1-3 分钟延迟，验证不要在 push 后立刻断言新旧。

8. **差异化红线（每个新页面/新游戏必须回答）**：
   - "比 Google 搜索前 3 名多做了什么？"——写不出一句具体答案就不做。
   - 禁止生产纯换皮克隆（换配色不改玩法不算差异化）。
   - 新工具/游戏必须至少满足一条：解决 Reddit/Quora 上有人抱怨找不到好方案的问题 / 组合两个已有玩法创造出新体验 / 比现有方案快 10 倍或简单 10 倍。
   - 策划 Agent 的设计方案必须附带同构分析（饱和度）+ 异构分析（差异机会点），缺一不实现。

9. **玩法验证红线（2026-09-11 Neon Block Jam 事故）**：移动端首屏检查只验布局不验玩法——该游戏上线时方块出口崩溃+胜利判定失效+步数语义全错。红线：新游戏/玩法改动部署前，必须用合成事件（PointerEvent 派发）脚本通关至少 1 关，断言胜利面板弹出且 window.onerror 零报错；纯布局 pass 不算可玩。
10. **bug 回报通道**：用户/监督发现的游戏 bug → 写 `designs/pending/bugfix-<slug>.md`（现象+复现步骤+根因），开发 Agent 按最旧优先领取，与功能方案同通道；修复后文档移入 done/ 并注明"已修复:<日期>"。
12. **质检器交互必须元素定向**：通用交互的点击/拖拽目标要按优先级命中游戏面（.blk→canvas→.hole→.cell→button），不能用固定坐标——Connect Four 复检时固定坐标+拖拽语义（press→move→release 不产生 click）导致误报"无响应"；修正为元素定向+追加同点纯点击后，人工复核确认游戏本身正常。质检器误报也算事故：先人工复核再写打回单。
13. **回溯生成器必须防指数爆炸**：sudoku 的 genSolution 用"随机乱序格子+裸回溯"，坏种子下指数级挂死（线上 load 永不触发）。正确做法：格子顺序化（空盘顺序回溯恒快）+步数保险丝+确定性兜底解；乱序版即使加预算也慢（500种子444秒）vs 顺序版（1000种子82ms）。定位手法：CDP Debugger.pause 抓挂死线程调用栈。
14. **环境怪症记录**：周日 03:00-05:00 无头 Chrome 加载任何 127.0.0.1 页面整体挂起（curl 正常、外网页面正常、新旧端口/hostname 均复现），原因未明。本地 QA 不可用时等效方案：部署后立即对线上跑 QA（外网路径正常）。另：GitHub Pages 构建可能滞留 15+ 分钟，POST /pages/builds 可主动催重建，验证以 pages/builds/latest 的 status+commit 为准。

## 15. 从 agent worktree diff 提取 games.py 条目时，diff 尾部可能混入结构行（2026-09-15 夜班实发×2）
盲目提取"全部 + 行"当条目块会带入列表闭合符/相邻 FAQ 尾巴，造成双 `]` 或孤儿行致构建失败（"QA-VERDICT no interactive game surface" 多半=docs 未重建而非游戏坏）。正解：提取后先 `python -c import games` 断言（数量+无重复+无 SyntaxError）再 build；提取器只取从 `"slug"` 行回溯到最近 `{` 起、正向括号配平止的 dict 块。
## 16. 同分钟内两次 git push 会撞 refs 锁（2026-09-15 实发）
deploy.sh 的 push 报 "cannot lock ref ... is at X but expected Y" 不一定是别人在推，也可能是自己上一发 deploy 的收尾竞争。处理=fetch 对比+pull --rebase 同步即可，内容无损；两次部署间隔拉开 ≥2 分钟；deploy.sh 中途死掉时 Pages wait/IndexNow 尾步要手工补（`python engine/ping_indexnow.py`）。
## 17. 台账时间戳禁止心算（2026-09-15 实发）
连续集成时凭感觉写 STATUS/run_stats 时间会漂移 45 分钟级（系统提示的日期无分钟）。写任何台账行前先 `date +%H%M` 取真值；事后发现漂移以 git 提交时间为准修正。另：CronUpdate 无法把自动化投递重绑到别的活会话（nextRunAt 过期而 runCount/lastRunAt 双冻结依旧）——开发 Agent 类任务停摆的根治只有新会话重建。
## 18. JS IIFE 内 var 变量与同名函数声明互毁（2026-09-19 实发）
audio.js 里 `var sfx = null`（增益节点）与 `function sfx(name,data)` 同名共存：函数声明虽提升，但 var 初始化语句执行时把函数覆盖为 null/GainNode，`Sound.sfx` 变非函数且 60fps 每帧报 TypeError（83 连发）。正解：增益节点命名 sfxGain 与 API 函数区分；新写模块先 grep 同名。
## 19. Rigged 测试牌靴必须大于紧急补鞋阈值（2026-09-19 实发）
blackjack 的 draw() 有 `length<4 补鞋` 自保护，qa 用 4 张固定牌序测试时第二张 draw 触发重洗、断言全盘皆输。正解：紧急补鞋只在“抽空”时发生（移到 deal 入口判 <4 一次性补），draw 只 shift；给测试 rig 固定牌序时确认 shoe 长度 > 所有阈值。
## 20. QA 自动驾驶的输入要保持到完整接触窗结束（2026-09-19 实发）
neon-runner autopilot 在 dx=-10 时松开 duck，但无人机接触区到 dx=+16 才结束（含身位宽度），松早了站起来撞机身亡——这是 QA 脚本 bug 不是游戏 bug。正解：策略类测试的输入保持窗按 hitbox 宽度数学算（接触区=障碍x跨过 [PX-62, PX+16]），不凭感觉写提前量；同时注意种子扫描范围要落在模拟时长可达的距离内。
