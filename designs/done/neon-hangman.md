# Neon Hangman (neon-hangman)
> 一句话卖点：**六大分类词库的霓虹刽子手**——每词自带一条提示句，救小人如救火，学校课堂友好零广告。
- **类型**：新游戏
- **评分卡**：搜索需求 4/5 ｜ 竞争空白 3/5 ｜ 变现意图 3/5 ｜ 开发成本低 5/5（wordle 词表压缩嵌入设施直接复用）｜ 复访价值 4/5（每日+分类图鉴+streak）= **19/25 ✓入队**
- **差异化一句答案**：比 Google 前 3 名（Poki/Coolmath 广告与 App 引流重、FactMonster 分类老）多做了：零广告零弹窗 + 六大分类词库各带人工提示句 + 每日全球同词 + 胜场 🔥streak 月度补签 + 中英双语（对手站几乎无中文）。
- **调研依据**：poki.com/en/g/hangman（流量佐证+课堂可达性）、coolmath（hang.man.word.guessing.games 长期在榜）、factmonster.com/games/hangman（分类词库佐证）、gamestolearnenglish.com/hangman（ESL 场景佐证）、hangmanwords.com（自定义分享功能点）；相关词：hangman online free / hangman unblocked / word guessing game
- **核心循环**：选分类→逐字母猜词（26 键虚拟+实体键盘）；6 错绞架逐笔画（程序化线条动画）；每词 1 条提示句可随时看；猜中=词义提示+胜利彩带，6 错=揭示答案+重试同词不计绩。
- **数值**：词库六分类（动物/食物/科技/体育/电影/地理）各 ~60 词+提示句；每日=UTC 哈希跨分类轮换；streak 月度补签（站内标准栈）。
- **双端**：触屏键盘≥44px；实体键盘 A-Z 直猜、H 提示、M 静音。
- **美术**：#0a0a18 底，绞架与小人=程序化 SVG/canvas 线条辉光（cyan 走笔/pink 错误），字母键命中=cyan 浮起、失错=pink 抖动+粒子。
- **SEO 关键词簇**：hangman online free / hangman unblocked / word guessing game free
- **验收标准**：375×667 首屏（词格+键盘+绞架）完整；遵循 engine/GAME_STANDARD.md；无 console 报错；qa_tests/neon-hangman.mjs 注入答案词驱动：猜中流程/6 错失败揭示/提示句展示/键盘染色/分类切换/每日同词断言。

> 已实现:2026-09-15 https://seyrs1985.github.io/neonplay/neon-hangman/
