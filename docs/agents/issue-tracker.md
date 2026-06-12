# 问题跟踪：GitHub

本仓库的 Issue 和 PRD 使用 GitHub Issues 管理。相关技能执行 issue 操作时，默认使用 `gh` CLI。

## 前置条件

- 仓库已配置 GitHub remote：`https://github.com/coolmentha/20-20-20.git`。
- 本机已安装并登录 `gh` CLI。当前可用路径为 `C:\Program Files\GitHub CLI\gh.exe`。
- 运行 `gh` 命令时默认在仓库根目录执行，让 `gh` 从 `git remote -v` 推断目标仓库。

## 常用约定

- 创建 issue：`gh issue create --title "..." --body "..."`
- 读取 issue：`gh issue view <number> --comments`
- 列出 issue：`gh issue list --state open --json number,title,body,labels,comments`
- 评论 issue：`gh issue comment <number> --body "..."`
- 添加标签：`gh issue edit <number> --add-label "..."`
- 移除标签：`gh issue edit <number> --remove-label "..."`
- 关闭 issue：`gh issue close <number> --comment "..."`

多行正文使用 heredoc 或临时文件，避免命令行转义破坏 Markdown。

## 技能行为

当技能说“发布到 issue tracker”时，创建 GitHub issue。

当技能说“获取相关 ticket”时，运行 `gh issue view <number> --comments`，并同时关注 issue 的标签和评论。

当前仓库已经配置 GitHub remote，本机也已安装并登录 `gh` CLI；但当前 PowerShell 会话尚未把 `gh` 加入 PATH。需要执行 GitHub CLI 命令时，使用 `C:\Program Files\GitHub CLI\gh.exe` 绝对路径。
