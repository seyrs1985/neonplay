# 设计方案交接区（策划 Agent → 开发 Agent）

- pending/  策划Agent产出的设计方案，等待开发实现（每份一个 <slug>.md）
- claimed/  开发Agent领取后移入此处（实现中）
- done/     已上线，文档末尾附"已实现:<日期> <URL>"

规则：策划只写 pending；开发从 pending 按最旧优先领取；两 Agent 均只操作本目录内的 .md 文件。
