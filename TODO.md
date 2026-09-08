# TODO

本文件记录已讨论但尚未实现的产品/工程事项。完成并验证后，再移动到 `CHANGELOG.md`。

## 当前状态

### 等待上游合并的修复 PR（2026-09-08，均基于 upstream/master c1c883b）

- [ ] junping1/drop#14 `pr/secret-scan-gaps`：commit 分享的密钥扫描改为扫描与渲染一致的 `git diff <hash>~1 <hash>`（合并提交不再漏扫）；`.env`/`.env.*`（排除 example/sample/template）和 `id_rsa`/`id_ed25519` 等按敏感文件名阻断；阻断提示补 `--force`/`--no-secret-scan` 说明。
- [ ] junping1/drop#15 `pr/no-highlight-auto`：未映射语言（`.log`/`.txt`/无扩展名）不再走 `highlightAuto`（285 KB 日志曾同步阻塞 38 秒），改为转义后的 plaintext。
- [ ] junping1/drop#16 `pr/filename-headers`：`/d/:token/raw` 对非 ASCII 文件名不再 500；`/f/:token` 原始文件补 `Content-Disposition`（DOCX/TIFF 下载不再丢文件名和扩展名）。
- [ ] junping1/drop#17 `pr/cli-pid-port`：`serve` 先绑端口再写 pid、绑定失败不删他人 pid 文件；`list`/`owner-url`/`serve` 统一读 `config.port`，`owner-url` 走 `buildUrl`。
- [ ] junping1/drop#18 `pr/loopback-default`：自动拉起的 daemon 默认绑 `127.0.0.1`（原为 `0.0.0.0`，等于无鉴权暴露到局域网），新增 `host` 配置项可显式恢复；含破坏性变更说明与中英文档。
- 合并后：`git fetch upstream && git merge upstream/master`，重跑 `scripts/verify.sh`，`systemctl --user restart drop.service`，并把本节移入 `CHANGELOG.md`。

### 2026-09-08 审阅遗留（按产品定位分级）

值得修（便宜且有价值）：

- [ ] 限流只认环境变量 `DROP_TRUST_PROXY=1`、不读配置 `trust_proxy`（`src/server/middleware/rate-limit.ts`），公网访客共用一个 300 次/分钟的桶。收口为一个 helper，限流与访问日志共用，README 只写一种配置方式。
- [ ] `/d/:token/raw` 对 `.html`/`.svg` 以 `text/html`/`image/svg+xml` inline 直出且无 CSP，目录里的 HTML 会在分享域同源执行。加 `Content-Disposition: attachment` 或 `Content-Security-Policy: sandbox`。
- [ ] `/f/:token` 渲染无大小上限（`MAX_RENDER_SIZE` 已导入未用）；媒体文件 base64 内嵌进 HTML，超过 50 MB 只剩死链接。改为 `new Response(Bun.file(p))` 流式输出，顺带获得 Range 支持。
- [ ] 文件名含 `%`/`#`/`?` 时前端 `pushState` 未编码、`decodeURIComponent` 无 try/catch（前端 `DirBrowser.svelte` 与服务端 `dir.ts` 各一处）。
- [ ] `scripts/build.ts` 默认目标 `linux-x64` 与宿主无关；本机是 aarch64，`verify.sh` 产出的二进制本机跑不了。默认按 `process.platform`/`process.arch` 推断。
- [ ] `~/.local/bin/drop` 是 2026-08-06 的旧二进制，早于两个上游安全修复；用 `bun run scripts/build.ts --target linux-arm64` 重建后替换。

明确不做（与单用户自用工具定位不匹配，记录以免反复翻出）：owner/auth cookie 服务端过期与 `secure`、`/dashboard?key=` 改 POST、`next` 开放重定向、pid 复用误杀、stdin 空输入、`--ttl` 非数字校验、`--exclude` 变参、符号链接绕过排除、CommitsTab 切换重置、面包屑无效、搜索大小写、Google Fonts 外链、`install.sh` 原子写入。

另一台 Mac（2026-09-08 报来的日志）确认的现象与对应修复：中文文件名 PDF 触发 `TypeError: Header ... has invalid value` → #16；17173 端口反复 EADDRINUSE、pid 文件被抹 → #17；`drop.log` 里 `drop serving on http://0.0.0.0:17173` → #18。三条均已在本机复现。Mac 侧还需自行处理（不属 drop 代码）：删除 `~/.drop/drop.pid.agent-start=*`（非 drop 写入）、卸载常驻的 quick tunnel 只留 named tunnel、升级 cloudflared 2026.5.2 → 2026.8.3 并给 stderr 加日志轮转。

流程文档：本轮「审阅 → 分级 → 提上游 PR」的可复用步骤记在 `docs/workflows/upstream-fix-pr.md`，下次同类任务先读该文件。

合并提交相关跟进（来自 #14 审阅）：commit 渲染端 `git diff-tree` 未加 `-m`，合并提交页面不显示任何文件 diff；`scanGitCommit` 未套用敏感文件名规则；diff 扫描无字节上限。

### 之前的说明

今天审阅范围内的其它更新已经进入实现或完成验证流程，并同步记录到 `CHANGELOG.md`：

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
