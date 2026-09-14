# Neon Typing（neon-typing）

> 一句话卖点：**60 秒霓虹打字冲刺**——不是打字训练工具，是街机：连击倍率、迫降词墙、全球每日同文，看你的 WPM 能在排行榜式的进步曲线里涨多快。

- **类型**：新游戏
- **评分卡**：搜索需求 4/5 ｜ 竞争空白 2/5 ｜ 变现意图 3/5 ｜ 开发成本低 5/5 ｜ 复访价值 3/5 = **17/25 ✓入队（压线，如实上报）**
  - 搜索需求 4："typing test / typing game free" 常青稳定需求（千万级月搜品类的长尾）
  - 竞争空白 2（诚实分）：Monkeytype 统治训练工具心智，供给不少；空白在"游戏化街机版"
- **红线回答（比 Monkeytype/Google 前 3 名多做了什么）**：它们是"训练工具"（静态词流、无游戏反馈层）；我们是**街机计分**——连击倍率窗口、错字即断连的张力、霓虹粒子反馈、每日同文全球可比、成绩进全站 🔥streak。3 秒开局、零注册、零设置门槛。

## 调研依据（真实来源）

- [Monkeytype](https://monkeytype.com/)：品类霸主，定位"可定制训练工具"——重功能、无游戏化计分层
- [TypingTest.com](https://www.typingtest.com/) / [Typing.com](https://www.typing.com/student/tests)：传统 1/3/5 分钟测试，界面陈旧、广告密集
- [TypeSpeedTest.com](https://www.typespeedtest.com/)：证明"免注册秒开"是有效卖点
- [Typing Test Comparison 2026](https://typingtestgo.com/guides/typing-test-comparison)：头部格局（Monkeytype/TypeRacer/10FastFingers/Keybr）清一色训练向，无街机游戏向

## 同构分析（饱和度）

打字测试供给多，但全部是"工具"框架（测完给报告）。街机化（连击/倍率/粒子/每日同题）的供给近乎空白——玩法借自 typing game 老品类（Typer Shark 等），霓虹街机皮是站内既有心智。

## 异构分析（与站内互补）

站内 33 款无任何键盘技能类（全部鼠标/触摸/方向键）；neon-typing 补上**键盘技能**品类，且是唯一"桌面端优先"的游戏（移动端降级为观赏+简单模式），拉开设备场景差异。

## 核心循环

1. 60 秒冲刺：词流从右向左推进（或经典行模式二选一），打对整词得分，连击窗口内连续正确 ×2/×3
2. 错字即断连（张力来源）+ 词被"推过警戒线"扣一条命（3 命）
3. 结算：WPM、准确率、最高连击、历史进步曲线（localStorage）
4. 每日同文：UTC 日期种子出同一词序，全球同题比 WPM

## 数值/实现要点

- 词库：内置 300 常用英文词（按长度分 3 档难度），零外部请求
- WPM = 正确字符/5 ÷ 分钟；连击窗口 2s；错键只断连不扣时
- `np_typing_best` 存历史最佳/曲线（最近 20 次）；np_core i18n
- `window.__qaState()` → `{wpm, acc, combo, lives, words}`

## 双端操作

- 桌面优先：全键盘；触屏降级：外接键盘提示 + 简单模式（点选缺字母，3 字母短词）
- 移动端 375×667 首屏：词流+输入框首屏可见

## 美术方向（霓虹规范）

- `#0a0a18` 底；正确击键 cyan `#00e5ff` 闪烁、连击升级 violet→pink 渐变、警戒线红色脉冲
- 词销毁粒子、combo 升级全屏微光；零外部素材

## 商业化与留存钩子

- 落地页广告位照旧；留存：每日同文 + 进步曲线 + 全站 streak 打通

## SEO 关键词簇

`typing speed test free` / `typing game online` / `wpm test no signup` / `neon typing game` / `daily typing challenge`

## 验收标准

- 375×667 首屏可玩（桌面全功能；移动端简单模式可用）
- 文案全英文进内嵌 `var L={en,zh}`（np_lang 键）；无控制台报错
- `engine/qa_tests/neon-typing.mjs`：输入正确词→得分+连击、错词→断连、60s 结束→结算面板、每日种子两次加载一致
- 部署前 `node engine/qa_playtest.mjs --slug neon-typing` PASS（注意：QA 机需键盘派发，CDP Input.dispatchKeyEvent 已支持）
