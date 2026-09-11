# NeonPlay 运营状态

游戏站（ToolTide 的姐妹站）。工具站相关运营见 `../ai-growth-engine/STATUS.md`。

## 当前状态快照

- **上线**: ✅ 2026-09-11, https://seyrs1985.github.io/neonplay/ (HTTP 200)
- **内容**: 5 款游戏(Neon Tide / Snake / 2048 / 记忆翻牌 / 井字棋) + 大厅 + about/privacy/contact
- **SEO**: sitemap 9 URL;IndexNow 已提交 10 URL(HTTP 200,域名根密钥与工具站共用)
- **统计**: 暂无(GA4 未接,config/site.json 的 ga4_id 留空即接)
- **变现**: 待 AdSense(adsense_client 填入即生效,构建器自动注入广告位+ads.txt)
- **部署**: `bash engine/deploy.sh`(凭证与工具站共用 tooltide.token)

## 里程碑

- [x] M0 上线(2026-09-11)
- [ ] M1 Bing 收录(1 周内观察)
- [ ] M2 内容扩容至 10+ 款游戏 + Google 收录
- [ ] M3 AdSense 接入产生首笔收入

## 运营日志

- 2026-09-11 · 建站:从 ToolTide 拆分游戏版块独立成站;5 款游戏 + 大厅 + 站务页上线;两站互链;旧 /tooltide/games/* 跳转至本站。
- 2026-09-11-1155 · 新增第6款游戏:打砖块Breakout(画布自研/触屏+键盘/3条命+关卡加速/霓虹风);落地页VideoGame schema+FAQ;线上/breakout/ 200,IndexNow 11 URL 提交。
- 2026-09-11-1208 · 新增第7款游戏:扫雷Minesweeper(9x9/10雷/首击必安全/长按或右键插旗/计时器);线上 /minesweeper/ 200,IndexNow 12 URL。
- 2026-09-11-1303 · 美术升级轮:Snake 全面视觉重制——霓虹渐变蛇身+辉光、吃食粒子爆炸+得分飘字、死亡震屏红闪、深空星点背景+呼吸网格、脉动苹果、HUD 胶囊化;逻辑与操控不变,线上 snake/play.html 200。
- 2026-09-11-1318 · 新增游戏轮:第8款游戏 Flappy Dash(一键飞行/霓虹闸门/双层视差城市剪影/间距随分收紧/粒子+震屏);线上 /flappy-dash/ 200,IndexNow 13 URL。
- 2026-09-11-1325 · 美术升级轮:2048 视觉重制——合并弹跳动画+新块缩放入场(按合并坐标精准触发)、霓虹渐变色阶(青→紫→粉→金,高阶砖发光)、合并得分飘字、星空渐变背景+玻璃质感面板+胶囊HUD;slide 逻辑单测通过(合并值/位置/计分),线上 2048 页 200。
- 2026-09-11-1402 · 体验修复轮(用户反馈):全部8个游戏落地页改为「游戏优先」布局——游戏框移至首屏顶部(点进即玩,无需拖屏),标题/操控/标语压缩为紧凑行置于游戏下方,SEO文案(玩法/FAQ/推荐)与面包屑全部下移;移动端游戏框高度自适应(58vh),桌面端同步受益;线上8页结构校验全部 game-first。
- 2026-09-11-1420 · 美术升级轮:Memory Pairs 视觉重制——卡片3D翻转缓动+入场stagger、卡背霓虹斜纹+hover升起、8对专属渐变卡面、配对粒子迸发+辉光锁定、失败shake、新增计时器、胜利面板玻璃拟态;逻辑不变,线上 200;designs/ 交接目录已提交。
- 2026-09-11-1445 · 🌐 i18n 上线:全站运行时多语言系统(自动检测浏览器语言+导航栏🌐手动切换+localStorage记忆+?lang=参数);首期支持 简体中文(全站chrome完整)+es/pt/ru(chrome),其余语言占位;游戏内文案按游戏逐个推进(开发Agent每轮一款);已验证 i18n.js 与 data-i18n 属性在线。
- 2026-09-11-1530 · 实现方案轮:按策划Agent首个缝合怪方案实现Brickstorm(打砖块×幸存者构筑)——弹球物理/无限波次/5种升级三选一/连击倍率/经验珠吸附/粒子震屏;游戏内文案全英文(zh待i18n轮);线上 /brickstorm/ 200,IndexNow 13 URL;设计文档移入done/。
- 2026-09-11-1520 · 美术升级轮:Tic Tac Toe 视觉重制——深空渐变背景+玻璃质感棋盘格、X=cyan/O=pink 霓虹配色+文字辉光、hover 缩放+落子 pop 动画、连线格 winpulse 脉冲+色配辉光、连胜计数(🔥streak)、计分胶囊化、按钮渐变+触屏≥44px;minimax 逻辑不变,线上 200。
- 2026-09-11-1550 · 📐 全Agent策略升级:差异化红线写入两站LESSONS.md(每轮必读)——新页面/新游戏必须回答"比Google前3名多做了什么",禁止纯换皮克隆;策划Agent职责升级为需求挖掘模式(搜索Reddit/Quora真实痛点→输出方案)。
- 2026-09-11-1525 · i18n轮:Snake 游戏内文案中文化(HUD得分/最佳/控制提示/游戏结束/再来一局)——内嵌L字典+localStorage np_lang 联动站点🌐切换器;JS语法OK,线上 play.html 200。
- 2026-09-11-1555 · 美术升级轮:Breakout 视觉增强——砖块命中白闪动画、击破粒子爆花(8粒/砖)、得分飘字(+30从砖位升起)、i18n中文字典(标题/提示/按钮);逻辑不变,线上 breakout/play.html 200。
- 2026-09-11-1610 · 新功能轮(方案实现):每日聚光灯+访问Streak——首页顶部每日确定性轮换一款推荐游戏(哈希均匀),🔥streak计数(localStorage跨天+1/断档清零),中英双语标签,紧凑卡不挤占游戏网格;线上 / 200。
- 2026-09-11-1645 · 美术升级轮:Flappy Dash 增强——过管道分数弹跳动画(缩放1.3x 180ms)、奖牌系统(Bronze≥5/Silver≥10/Gold≥25/Platinum≥50)、zh i18n字典;逻辑不变,线上 200。
- 2026-09-11-1645 · 实现方案轮:按策划Agent第2份方案实现Neon Block Jam(无计时器滑块解谜/10关/无限撤销/星级评价/彩色闸门)——需求源自Reddit真实痛点(r/puzzlevideogames 307赞求无计时版);全站10游戏,线上 /neon-block-jam/ 200,IndexNow 15 URL;设计文档移入done/。
- 2026-09-11-1650 · 美术升级轮:Flappy Dash 增强——地面滚动线条(视差速度感)、小鸟拖尾粒子(金色微粒)、过管道粒子迸发(青色6粒);线上 play.html 200,8处新代码确认在线。
- 2026-09-11-1720 · i18n轮:2048 游戏结束面板中文化(检测浏览器语言,中文用户显示中文提示);逻辑不变,线上 200。
- 2026-09-11-1700 · 美术升级轮:全站CSS统一打磨——hero渐变标题、卡片hover浮起+emoji放大、分类标题底边线、SEO块玻璃底、FAQ左边线、游戏站10页全部受益;线上 200。
- 2026-09-11-1730 · 基建轮:RSS 2.0 feed上线(docs/feed.xml,10游戏+站点更新),首页head加RSS alternate link,footer加RSS入口;线上feed.xml 200,合法XML 10条目;IndexNow 15 URL 200。
- 2026-09-11-1750 · i18n轮:Memory Pairs 游戏内文案中文化(HUD MOVES/PAIRS/TIME标签+np_lang联动站点切换器);JS语法OK。
- 2026-09-11-1800 · 美术升级轮:全站CSS细节打磨——smooth scroll/hero辉光文字/卡片hover浮起+emoji放大/SEO块玻璃底/FAQ左边线/移动端字号适配;全站10页受益;线上 200。
- 2026-09-11-1815 · i18n轮:Tic Tac Toe 游戏内文案中文化(HUD状态/计分标签/模式按钮 np_lang 联动);JS语法OK,线上 200。
- 2026-09-11-1910 · 美术升级轮:Minesweeper CSS修复——清理孤立CSS/合并hover/恢复flex居中;线上 play.html 200,radial-gradient+hover确认。
- 2026-09-11-1920 · 新增游戏轮:第11款游戏 Connect Four 四子棋——7×6棋盘/vs AI/双人/连线检测/霓虹圆盘;CDN延迟后已确认在线,线上 /connect-four/ 200,IndexNow 16 URL。
- 2026-09-11-1925 · 美术升级轮:微交互打磨——聚光灯卡hover边框/背景强化、cat-blurb行高与透明度优化、prefers-reduced-motion无障碍适配;线上 200。
