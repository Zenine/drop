# TODO

本文件记录已讨论但尚未实现的产品/工程事项。完成并验证后，再移动到 `CHANGELOG.md`。

## 当前状态

当前没有新的未完成事项需要追加到 TODO。今天审阅范围内的更新已经进入实现或完成验证流程，并同步记录到 `CHANGELOG.md`：

- 目录分享默认排除 dotfile 和隐藏目录，必要时通过 `--include-hidden` 显式放行。
- 分享前密钥扫描与目录文件树使用同一套隐藏文件排除语义，且 `--include-hidden` 后会扫描隐藏文件中的密钥。
- 目录 Git `Commits` 页面修复浅色主题下 commit 列表、文件展开行和 diff 行高亮的可读性。

## 已完成归档：目录分享默认排除隐藏文件

已完成并纳入 `CHANGELOG.md` 的安全默认值调整：

- [x] 默认目录分享不展示 dotfile 和隐藏目录，例如 `.env`、`.github/`、`.idea/`、`.gitignore`。
- [x] 新增 `--include-hidden`，只有显式传入时才包含 dotfile 和隐藏目录。
- [x] `--include-hidden` 后，分享前密钥扫描同步覆盖隐藏文件；隐藏文件里的高置信密钥会阻断分享。
- [x] 已配置 `default_excludes` 和显式 `--exclude` 仍优先生效，可在 `--include-hidden` 后继续排除指定隐藏文件。
- [x] README、中文 README、CHANGELOG 和 CLI 帮助已同步。
- [x] CLI 集成测试覆盖默认排除、`--include-hidden` 阻断隐藏密钥、`--include-hidden` 叠加显式排除。

## 已完成归档：目录 Git diff 与 commit UI 对比度

已完成并纳入 `CHANGELOG.md` 的 UI 可读性修复：

- [x] Recent commits 列表在浅色主题下使用更清晰的标题、元信息和选中态颜色。
- [x] 文件展开行在浅色主题下提高文字与背景对比度。
- [x] diff iframe 明确设置浅色/深色主题下的正文、文件头、hunk、增加行和删除行颜色。
- [x] 线上用 `template` 与 `writing-craft` 分享页做过浏览器截图验证。

## 已完成归档：Git 仓库目录的 Commits 标签页

目标：当用户分享一个 Git 仓库目录时，目录浏览页面仍以项目文件树为主，同时增加一个 `Commits` 标签页，默认只展示最近 5 条提交，并允许查看这 5 条提交的 diff。

示例：

```bash
drop-preview ~/github/writing-craft --slug writing-craft-project
```

打开：

```text
/d/writing-craft-project
```

页面应提供：

- `Files` 标签页：保持现有目录浏览体验。
- `Commits` 标签页：仅当分享目录是 Git 仓库时显示。
- 默认最近 5 条 commit。
- 点击最近 5 条内的 commit 可查看 diff。
- 不允许通过直接猜 SHA 查看 5 条之外的历史 commit。

### 第一阶段 MVP

已完成并通过 `scripts/verify.sh` 验证；对应发布说明已写入 `CHANGELOG.md`：

- [x] 抽 Git helper：`src/server/git/repo.ts`。
- [x] 新增目录 Git API：
  - [x] `GET /d/:token/api/git`
  - [x] `GET /d/:token/api/git/commits`
  - [x] `GET /d/:token/api/git/commit/:sha`
- [x] API 限制：
  - [x] commit 列表最多返回 5 条。
  - [x] diff 只允许最近 5 条内的 SHA。
  - [x] 不返回 `author_email`，避免默认暴露邮箱。
- [x] 前端目录页增加轻量 Tab：
  - [x] `Files`
  - [x] `Commits`
- [x] Commits tab 文案提示：
  - [x] 默认仅展示最近 5 条 commit，以减少暴露历史内容的风险。
  - [x] commit 历史可能包含已删除文件或历史密钥，分享前应谨慎。
- [x] 测试：
  - [x] 非 Git 目录不启用 Git API。
  - [x] Git 目录只返回最近 5 条。
  - [x] 最近 5 条内的 diff 可访问。
  - [x] 第 6 条及更早 commit diff 不可访问。
  - [x] 无效 SHA 返回 404。
  - [x] commit subject / metadata 正确转义。
  - [x] Git 命令使用参数数组执行，避免 shell 参数注入。
- [x] 文档：
  - [x] `README.md`
  - [x] `README.zh-CN.md`
  - [x] `CHANGELOG.md`

### 第二阶段：Owner 解锁更多历史

已完成并通过完整验证；已同步保留在 `CHANGELOG.md`：

- [x] Owner 解锁查看更多 commit 历史。
- [x] 解锁后显示最近 100 条 commit。
- [x] 解锁后允许查看最近 100 条内的 diff。
- [x] 复用现有 owner key / owner auth，避免新增明文密码。
- [x] signed cookie 绑定 share token、权限范围和过期时间。
- [x] 解锁后不扩展敏感 metadata，继续隐藏 author email。
- [x] 增加对应鉴权、cookie 伪造、过期和跨 token 访问测试。
- [x] 前端 modal 避免 owner key 进入 URL、storage 或 console，并在取消、失败、Escape、切换分享时清空。
