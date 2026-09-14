# Neon Othello (neon-othello)
> 一句话卖点：**零广告零注册即点的黑白棋**——落子即翻转的霓虹棋盘，AI 三档可练可虐，双人同屏，每天全球同一手"开局谜题"。
- **类型**：新游戏
- **评分卡**：搜索需求 4/5 ｜ 竞争空白 3/5 ｜ 变现意图 3/5 ｜ 开发成本低 5/5（复用 neon-checkers 棋盘+minimax 设施）｜ 复访价值 4/5（每日挑战+段位）= **19/25 ✓入队**
- **差异化一句答案**：比 Google 前 3 名（cardgames.io 标注 beta/未就绪、eothello 主打注册 multiplayer、playpager 广告位重）多做了：零广告零注册即时玩 + AI 三档 + 2P 同屏 + 每日全球同题挑战 + 中英双语界面。
- **调研依据**：cardgames.io/reversi（头部但 beta 提示）、eothello.com（要注册）、playpager.com/othello-reversi（2P 但广告重）、mathsisfun.com/games/reversi.html（难度档佐证）；相关词：reversi vs computer / reversi 2 player / othello unblocked / reversi rules
- **核心循环**：8×8 黑白棋——落子必须至少翻转一子（合法步高亮）；无处可走自动 pass（提示双方）；双方皆无步或满盘终局，子多者胜；非法步不可落。
- **AI**：minimax α-β + 经典位置权重表（角=高值、角旁危险格=负值、边=中值）；易=贪心最大翻转/中=3 层/难=5 层；节点+时间双保险丝（<800ms/步，沿用 checkers 模式）。
- **数值**：每日挑战=UTC 哈希定 AI 档与先后手+固定开局 4 手种子序列；段位按胜场+净子数累积（站内七段位栈）。
- **双端**：触屏格子≥44px；键盘方向键+Enter 落子、U 悔棋（若做）、M 静音。
- **美术**：#0a0a18 深空棋盘+格线辉光，执子 cyan #00e5ff vs pink #ff2d95，翻转=3D 翻面动画+粒子，终局棋子计数弹跳。
- **SEO 关键词簇**：reversi online free / othello free no download / play reversi vs computer / 2 player reversi
- **验收标准**：375×667 首屏棋盘完整可玩；遵循 engine/GAME_STANDARD.md（程序化音效/粒子/__qa 钩子/i18n L={en,zh}+np_lang）；无 console 报错；qa_tests/neon-othello.mjs 用 __qaState 注入局面断言：翻转子数正确/角权重行为/强制 pass/终局计子/非法步拒绝。

> 已实现:2026-09-15 https://seyrs1985.github.io/neonplay/neon-othello/
