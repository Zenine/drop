# 变更日志

本项目遵循“只记录已完成并经过验证的变更”的原则；未完成事项不写入本文件。

## Unreleased

验证：2026-05-14 在本机运行 `scripts/verify.sh` 通过，包含 `tsc --noEmit`、`bun test`（59 pass / 0 fail）和 `bun run scripts/build.ts`。

### 新增

- 新增终端二维码输出：分享命令和 `drop owner-url` 支持 `--qr`，二维码写入 stderr，stdout 仍保持纯 URL 或可解析 JSON。
- 新增分享前密钥扫描：文件、目录、stdin/内联内容和 Git commit 分享默认扫描高置信密钥；支持 `--force` 和 `--no-secret-scan`，扫描结果脱敏输出。
- 新增自定义分享别名：分享命令支持 `--slug`，可生成 `/f/:slug`、`/d/:slug` 和 `/git/:slug` 可读 URL；`drop list --json` 展示 slug URL，`drop revoke <token-or-slug>` 支持 token 或 slug。
- 新增隐私保护访问日志和统计：记录成功访问事件，新增 `drop stats`、owner-only `/api/stats` 与 `/api/stats/:token-or-slug`，dashboard 展示 Views、Unique 和 Last access。
- 新增数据库表：`share_aliases` 用于 slug 映射，`access_events` 用于访问事件统计。

### 安全

- 分享前密钥扫描可阻止误分享私钥、API key、service account JSON 和敏感凭证文件名。
- 访问日志不保存原始 IP、完整 User-Agent、完整 Referer、完整目录路径、query、cookies 或 owner key；客户端身份和目录目标路径使用 HMAC 哈希保存。
- 自定义 slug 保持 token URL 优先，拒绝与现有 token 冲突的 slug，减少 slug 遮蔽 token URL 的风险。
- 撤销分享时同步删除对应 slug 和访问事件。

### 测试

- 新增 QR 输出测试，覆盖 stderr/stdout 分离、JSON 可解析性和失败降级。
- 新增密钥扫描单元与 CLI 集成测试，覆盖文件、目录、stdin、Git commit、`--force`、`--no-secret-scan` 和脱敏输出。
- 新增 slug 测试，覆盖格式校验、保留词、唯一性、路由访问、dashboard 展示、CLI 输出和撤销。
- 新增访问日志与统计测试，覆盖数据库隐私字段、统计口径、owner API、CLI stats、路由事件记录、slug stats 查询和撤销清理。

### 文档

- 更新 `README.md` 和 `README.zh-CN.md`，补充 QR、密钥扫描、自定义 slug、访问统计、安全边界和使用示例。
