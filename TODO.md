# TODO

本文件记录已讨论但尚未实现的产品/工程事项。完成并验证后，再移动到 `CHANGELOG.md`。

## Git 仓库目录的 Commits 标签页

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

暂不在 MVP 中实现。第一阶段稳定后再评估。

- [ ] Owner 解锁查看更多 commit 历史。
- [ ] 解锁后显示最近 100 条 commit。
- [ ] 解锁后允许查看最近 100 条内的 diff。
- [ ] 复用现有 owner key / owner auth，避免新增明文密码。
- [ ] signed cookie 绑定 share token、权限范围和过期时间。
- [ ] 解锁后可显示更完整 metadata，但仍需谨慎处理邮箱等隐私字段。
- [ ] 增加对应鉴权、cookie 伪造、过期和跨 token 访问测试。

