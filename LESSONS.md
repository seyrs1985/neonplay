# 踩坑与经验（每轮开工前先读）

1. **games.py 追加条目**：Python 字符串拼接极易吃掉上一条目的闭合括号——追加后必须立刻 `python -c "import games"` 验证，报错就检查前一条目的 `},` 是否完好。
2. **IndexNow 403**：密钥文件必须在域名根（seyrs1985.github.io 用户站仓库），子目录放置会被 403。
3. **deploy 凭证**：token 存于 `git config tooltide.token`，push 用 x-access-token 内联 URL，绕开凭证管理器 GUI 挂起。
4. **移动端首屏**：游戏框必须在首屏（58vh 自适应），落地页禁止在游戏框之前放标题/标语/大 emoji（375×667 验收，一票否决）。
5. **i18n**：游戏内文案用内嵌 L 字典 + `localStorage.np_lang`（与站点🌐切换器共用）；站点 chrome 用 data-i18n + i18n.js。
6. **并发**：deploy.sh 自带原子锁+push前rebase；开工前 git status 有未提交变更=上轮未完，直接跳过。
7. **GitHub Pages CDN**：部署后内容刷新有 1-3 分钟延迟，验证不要在 push 后立刻断言新旧。
