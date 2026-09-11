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
- 2026-09-11-2010 · i18n轮:Neon Tide 画布UI中文化——新增 NP_L 字典+T()助手,标题/HUD/暂停/结算共14处文案随 np_lang 切换;JS语法OK,CDN延迟后线上 game.js 已含中文串,play 200。
- 2026-09-11-2055 · 美术升级轮:2048手感升级——合并金环冲击波+六向金色火花/得分chip弹跳/结束画面标题坠落入场+棋盘灰化/触摸改统一pointer事件含pointercancel复位(GAME_STANDARD合规)/最高分localStorage持久化(np_2048_best)/UI文案i18n字典补齐(得分/最佳/新游戏/结束屏);prefers-reduced-motion适配;QA PASS(exit 0),375×667截图确认首屏全可见,线上 200。
- 2026-09-11-2145 · 实现方案轮:领取最旧设计文档brickstorm-daily并上线——每日挑战:CLASSIC/DAILY双按钮开局面板(DAILY金字描边+日期)、mulberry32(日期哈希)只注入波次生成器(空位+HP浮动,同日全球同题)、每日最佳独立存储brickstorm_daily_best_<date>、结算页Today's Best+明天再来文案、C/D快捷键、全文案进i18n字典;连修3个遗留bug:游玩态从不draw(棋盘不可见)/rAF双链倍速/首帧waveTimer=0误下压(确定性根因);qa_playtest补rAF垫片(无头canvas游戏通用)+新增brickstorm专属QA脚本;本地QA×2+线上QA PASS,375×667截图D1运行中首屏全可见;2048补跑线上QA PASS;designs/done/brickstorm-daily.md;线上200。
- 2026-09-11-2230 · 美术升级轮:connect-four视觉全面升级——列悬停虚线幽灵预览(回合方配色)/落子420%下落弹跳缓动(cubic-bezier回弹)/落点6粒火花/HUD得分chip弹跳/胜利金色渐变文案+26条彩带飘落+棋盘震屏/按钮min-height 44px/prefers-reduced-motion;连带修复上线时玩法bug:回合双翻转(drop内翻转+handler再翻转)致每回合AI连下两手且cur卡死软锁——回合逻辑收敛到drop单入口;补2P模式p1Turn/p2Turn缺失i18n键;新增connect-four软锁回归QA脚本;本地+线上QA PASS,375×667截图双回合棋子正常交替首屏全可见;线上200。
- 2026-09-11-2330 · 实现方案轮:领取engine-template.md(最旧优先,移入claimed/,分轮执行)阶段1——新建engine/assets/games/_shared/np_core.js(npLang/npT i18n核心+npBest存档封装),build.py逐游戏拷贝np_core.js保持iframe自包含;迁移2款:snake(连带修复i18n应用代码串在</html>之后被浏览器渲染为可见文本的结构bug)+memory-pairs(激活假i18n:字典与_t定义后从未调用,中文模式页面全英文——HUD标签/胜利标题/步数秒文案/再来一局按钮全部激活);新增snake/memory-pairs专属QA脚本(zh标签断言+输入响应);qa_playtest增强:试探目标过滤不可见元素、脚本测试PASS可作响应性证据;本地+线上QA双PASS,375×667截图snake中文UI正常无残留代码;np_core.js线上200;后续轮次继续迁移余下9款。
- 2026-09-11-2415 · 美术升级轮:minesweeper视觉升级——踩雷棋盘震屏+全屏红闪+爆点cell放大、胜利26条彩带+金色渐变文案、旗子显示🚩图标(原仅紫色色块)+flagpop弹跳、翻开的数字text-shadow同色辉光、雷数chip弹跳、旗标/再来一局按钮min-height 44px、prefers-reduced-motion;文案从硬编码中文升级为np_core双语言i18n(旗标开关/踩雷提示/胜利用时/再来一局,en用户不再看中文);玩法逻辑零改动;新增minesweeper黑盒QA脚本(zh标签断言+首击安全性+旗标流程);本地+线上QA PASS,375×667截图旗标开启态+数字辉光首屏完整;线上200。
- 2026-09-11-2530 · 实现方案轮(新增游戏):第12款 Idle Neon Breaker 上线——按策划文档MVP全量实现:480×640画布顶部2行×5列数字砖(HP=面值,2048色阶青/紫/品红/金),四壁反弹弹球无挡板,每20秒合并脉冲(行内等值×2向左吸附+空位补2),商店四件套(球+1≤30/伤害/弹速10%≤5级/金币+25%,成本公式照抄文档),离线收益全额无上限+欢迎面板+金币雨,np_inb_save自动存档(10s+beforeunload+visibilitychange),时间基逻辑1s粒度后台推进+30ms物理子步,破纪录全屏辉光+大数字定帧,碎砖粒子+金币飘字,中英i18n(np_core),__qaState/__qa可测试钩子;开发中离线复现并修复砖阵侧道死区(20px边距让球永久循环打不到砖→铺满全宽);qa_playtest改为play/路径自动探测;顺手收尾rss-feed.md(head发现链接+footer RSS→done/);本地+线上QA PASS(earn→merge→shop→persist→offline+300全链),375×667截图58vh画布+中文商店+彩带;新游戏自动进RSS feed,IndexNow 18 URL;线上landing/play双200;designs/done/idle-neon-breaker.md。
- 2026-09-11-2610 · 美术升级轮:neon-block-jam视觉升级(最后一个零特效游戏)——块体145°高光渐变+外发光+内阴影立体感、选中弹跳动画、棋盘16.7%网格慢速平移背景层次、碎裂8向火花(同块色)、胜利面板标题坠落入场+星级逐颗旋转弹出(stagger)+30条彩带、步数chip弹跳(拖动/键盘双路径)、Undo/Reset/胜利按钮统一44px、prefers-reduced-motion;全文案中英i18n(np_core:关卡/步数/撤销/重置/通关/全部通关/重玩/下一关/步数单位/目标);开发中自曝并修复np_core漏引(脚本初始化即死,TDZ报错);通关链QA(拖块出门→CLEAR面板)本地+线上双PASS,375×667截图zh胜利面板+彩带;线上200。
- 2026-09-11-2720 · 实现方案轮:程序化SEO长尾落地页上线(seo-longtail方案,首批仅Brickstorm)——games.py新增variants字段,Build新增build_variant生成器:3个关键词变体页(Ball x Pit browser alternative/games like Ball x Pit free/Vampire Survivors-style breakout),每页独立文案234/209/211词+专属3条FAQ+VideoGame/FAQPage schema+可玩iframe+主落地页More-ways-to-play互链+兄弟变体互链+面包屑;sitemap收录(19 URL);IndexNow自动提交21 URL;连带修复两个存量bug:sitemap的XML声明缺?一直非法、i18n.js第37行zh字典后多余}致整个文件语法错误——全站语言切换器自上线起静默完全失效(已复活,zh界面正常);qa_playtest错误带文件:行号定位+落地页iframe容器响应性判定;本地+线上brickstorm QA PASS,375×667变体页截图布局正常iframe首屏可见;线上3变体页+主落地页全200;designs/done/seo-longtail.md。
