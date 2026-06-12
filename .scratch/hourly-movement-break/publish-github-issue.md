# GitHub Issue 发布草稿：每小时站立活动提醒

当前环境还不能直接发布 GitHub issue：

- 仓库已配置 GitHub remote：`https://github.com/coolmentha/20-20-20.git`。
- 本机已检测到 `gh` CLI，但尚未登录 GitHub。当前可用路径为 `C:\Program Files\GitHub CLI\gh.exe`。

满足前置条件后，在仓库根目录执行：

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" issue create `
  --title "每小时站立活动提醒" `
  --label "ready-for-agent" `
  --body-file "docs/prds/hourly-movement-break.md"
```

## Issue 标题

每小时站立活动提醒

## Triage 标签

`ready-for-agent`

## Issue 正文来源

使用 `docs/prds/hourly-movement-break.md` 作为正文。该 PRD 已使用本仓库领域术语，并包含问题陈述、解决方案、用户故事、实现决策、测试决策、范围外和补充说明。
