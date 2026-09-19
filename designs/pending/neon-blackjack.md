# Neon Blackjack（neon-blackjack）

> 一句话卖点：**会教你怎么打霓虹二十一点**——娱乐筹码零真钱，每手牌实时亮出基本策略提示（可开关），边玩边学，玩 20 手=一堂免费策略课。

- **类型**：新游戏
- **评分卡**：搜索需求 4/5 ｜ 竞争空白 2/5 ｜ 变现意图 4/5 ｜ 开发成本低 5/5 ｜ 复访价值 3/5 = **18/25 ✓入队**
  - 搜索需求 4："blackjack online free / practice" 常青大需求（赌场纸牌玩家练手+休闲双人群）
  - 竞争空白 2（诚实分）：娱乐版供给不少（Arkadium/WaPo），策略教练类也有（Bojoko 等）；空白=**两者合一**的游戏化体验
  - 开发成本低 5：规则全站最简（发牌/要牌/停牌/加倍，MVP 不做分牌），DOM 牌面复用 solitaire 家族心智，单轮可完成
- **红线回答（比 Arkadium/WaPo 克隆多做了什么）**：娱乐版不教学、教练版不好玩——我们**每手实时浮出基本策略提示**（H/S/D，附一句人话理由，可关），错了不惩罚只标注；**每日 20 手挑战**（固定种子连续牌局比盈亏）；全站 🔥streak 打通；霓虹牌桌。零真钱、零充值、无赌场导流（AdSense 合规：play-money only）。

## 调研依据（真实来源）

- [Bojoko Blackjack Simulator & Trainer](https://bojoko.ca/casino/blackjack/simulator-trainer)：策略训练器是独立品类（2026 仍被收录推荐）——证明"学习需求"真实存在
- [Arkadium Blackjack](https://www.arkadium.com)：休闲免费版 4.0★，但无教学层
- [Washington Post Games Blackjack](https://www.washingtonpost.com/games/)：大报门户都在做=流量验证
- [blackjack-trainer.net](https://blackjack-trainer.net)：drill 类工具与休闲游戏割裂的佐证

## 同构分析（饱和度）

娱乐版与训练器两个世界长期割裂；带实时策略提示的娱乐版在主流门户缺位。规则实现零版权风险（基本策略表为公有领域数学结论）。

## 异构分析（与站内互补）

站内卡牌家族已有 5 款（solitaire/fairway/pyramid/mahjong/link）全是单人解谜；blackjack 补上**对抗庄家的决策博弈**子类，人群重合度低。DOM 牌面渲染复用 solitaire 家族全部心智。

## 核心循环

1. 下注（筹码 1000 起）→ 发牌（庄家一张明牌）
2. 玩家：要牌 Hit / 停牌 Stand / 加倍 Double（前两张时）→ 爆 21 即输
3. 庄家按规则（<17 必须要）补牌 → 比点定胜负（Blackjack 3:2）
4. **策略提示层**：每步决策前浮出推荐（依据基本策略表：硬牌/软牌/对子三张分表），标注"教练说：Stand（庄家 6 爆率最高）"
5. 每日挑战：UTC 种子发 20 手固定牌序，比最终筹码盈亏

## 数值/实现要点

- 6 副牌洗牌靴 + 洗牌点重洗；A 软硬点数自动换算；庄家规则：软 17 停牌（S17）
- 基本策略表：硬牌 34 行 / 软牌 18 行 / 对子（MVP 不做分牌则表裁剪）——内嵌为查表函数 `basicStrategy(hand, dealerUp)`
- 筹码持久化 `np_bj_chips`（破产赠送 1000 重置）；战绩 `np_bj_stats`（胜/负/推/Blackjack 次数）
- `window.__qaState()` → `{player:[], dealer:[], phase, bet, chips, hint}` 全量可断言
- DOM 牌面（♠♥♦♣ 字符 + CSS 卡片），发牌翻牌动画复用 solitaire 心智；Neon Tide 音频模式（发牌/胜/爆/BJ 特音）

## 双端操作

- 触屏：三按钮 H/S/D ≥56px 大目标 + 双击牌面=加倍；桌面：H/S/D 快捷键
- 375×667：牌桌与三按钮首屏完整可见

## 美术方向（霓虹规范）

- `#0a0a18` 深空底 + 霓虹弧线牌桌（violet `#7c4dff` 描边弧）；牌面白底黑红花色、庄家区 cyan 边框
- 策略提示浮层：半透明玻璃拟态 + 金色 `#ffd54a` 文案；Blackjack 特效：金色全屏闪光 + 粒子
- 零外部素材，零赌场视觉元素（合规+差异化）

## 商业化与留存钩子

- 落地页广告位照旧；**合规红线：仅娱乐筹码、零真钱、零赌场导流链接、页面标注 Play for fun only**
- 留存：每日 20 手挑战 + 连胜/连败统计 + 基本策略掌握度（提示采纳率）+ 全站 streak

## SEO 关键词簇

`blackjack free online no money` / `blackjack practice game` / `blackjack with strategy hints` / `play blackjack for fun` / `neon blackjack game`

## 验收标准

- 375×667 游戏框首屏可玩（牌桌+三按钮完整可见）、按钮 ≥44px
- 文案全英文进内嵌 `var L={en,zh}`（np_lang 键）；无控制台报错；零外部请求
- `engine/qa_tests/neon-blackjack.mjs`：发牌点数计算（含软 A 换算）、Hit 爆 21 即负、Stand 后庄家规则正确、Blackjack 3:2 赔付、策略提示与基本策略表一致（抽 30 手牌面断言）、每日种子两次一致、破产重置
- 部署前 `node engine/qa_playtest.mjs --slug neon-blackjack` PASS（移动端首屏一票否决照常）
