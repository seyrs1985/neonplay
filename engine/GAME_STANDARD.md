# NeonPlay 游戏质量标准（Neon Tide 工作流复刻）

> 来源：对站内标杆《Neon Tide》源码的逆向提炼（engine/assets/games/neon-tide/play/）。
> 任何新游戏/玩法重做，按本工作流执行；QA 质检器（engine/qa_playtest.mjs）按其中的"可测试性标准"验收。

## 一、为什么 Neon Tide 是标杆

它不是"写完能跑"，而是同时满足四层：**架构分层、平台一致性、游戏手感（juice）、可测试性**。
1150 行代码里没有一张外部素材：音效全部 WebAudio 合成、美术全部代码绘制（假发光替代 shadowBlur）。

## 二、文件结构标准

```
<slug>/
  index.html        # 16 行壳：viewport(maximum-scale=1, viewport-fit=cover) + theme-color + 三个 script
  style.css         # 极简（15 行）
  js/
    audio.js        # 程序化音频引擎（IIFE 模块，对外只暴露 Sound API）
    game.js         # 游戏核心：状态机 / 世界生成 / 物理 / 渲染（数据与绘制分离）
    main.js         # 引导：画布缩放 / 输入映射 / 主循环（不含游戏逻辑）
```
单文件小游戏可等价合并为单 html，但**必须保持这三层职责边界**（逻辑 / 引导 / 音频互不掺杂）。

## 三、引导层标准（main.js 职责，逐条验收）

1. **固定逻辑分辨率 + letterbox**：如 `W=720,H=1280`，`devicePixelRatio` 感知缩放，居中留黑。任何屏幕比例下玩法一致。
2. **dt 钳制**：`dt = Math.min(dt, 0.033)`——切标签页/GC 尖峰不穿模不暴走。
3. **输入三件套**：`pointerdown`（元素上，`{passive:false}` + `preventDefault`）、`pointerup`、**`pointercancel`**（漏了=真机拖动中断卡死）。坐标统一换算到逻辑空间。
4. **`touch-action:none`** + `user-select:none`，防滚动防误选。
5. **rAF 主循环**（rAF 驱动 update+draw；事件驱动型解谜游戏可豁免，但恢复可见时必须重绘）。

## 四、可测试性标准（QA 质检器的对接面，必须实现）

1. `window.__qaRender()`：同步合成渲染一帧，不依赖 rAF（供截图/无头验证）。
2. `window.__qaFreeze = true|false`：冻结 update 循环（供确定性测试）。
3. `window.__qaState()`：返回可断言的游戏状态快照 `{state, score, level, lives...}`（QA 脚本据此断言，而非读 DOM 猜测）。
4. 零 `console.error`；所有资源零外部请求（= 无 404）。

## 五、手感标准（juice，Neon Tide 的多巴胺来源）

1. **程序化音频**（WebAudio 全合成，零音频文件）：
   - 分轨：musicGain / sfxGain / master，静音状态持久化 localStorage；
   - SFX 原语 `tone(f0,f1,dur,type,vol)` + `noise(dur,vol)`：移动=短 tick、击破=噪声爆破、得分=上扬双音、死亡=下滑、胜利=琶音；
   - 首次用户手势后才 `resume()` AudioContext（浏览器自动播放策略）。
2. **粒子系统**：数量上限（≈260）、life/max 生命周期、`globalCompositeOperation:'lighter'` 发光、重力/收缩可选。
3. **假发光**：叠加半透明描边模拟辉光，禁用 `shadowBlur`（性能）。
4. **反馈即时性**：任何输入 1 帧内必须有视听响应；无效操作要有否定反馈（抖动/低鸣）。

## 六、内容标准

1. 状态机：title → playing → gameover(+最高分)；localStorage 持久化最佳分/设置。
2. 难度曲线：程序化递增（波次/速度），无手工关卡也能成立。
3. 双端操作：触屏 + 键盘 + 鼠标三输入，触屏目标 ≥44px。
4. i18n：全文案进内嵌 `var L={en:{...},zh:{...}}`，键与站点 `np_lang` 共用。
5. 霓虹视觉规范：`#0a0a18` 深空底，cyan `#00e5ff` / violet `#7c4dff` / pink `#ff2d95`，零外部素材。

## 七、工作流（设计→上线六步，对应现有自动化）

1. **设计**：策划方案入 designs/pending（评分卡+同构异构分析+验收标准；复杂玩法须附 `engine/qa_tests/<slug>.mjs` 通关脚本要求）。
2. **实现**：开发 Agent 按本标准三层结构实现；对照第五节逐条补 juice。
3. **自测**：合成事件脚本通关 ≥1 关 + `window.__qaState()` 断言 + 零报错。
4. **门禁**：`node engine/qa_playtest.mjs --slug <slug>` PASS 才允许 deploy（一票否决）。
5. **独立复检**：策划 Agent 每 2h 对最新上线游戏复跑质检，FAIL 写 bugfix 打回单。
6. **回流**：GA4/GSC 数据周报 → 零流量/低留存进重做评估，赢家品类加码挖掘。
