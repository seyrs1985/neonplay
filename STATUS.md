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
