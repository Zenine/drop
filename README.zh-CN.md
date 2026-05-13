# drop

`drop` 是一个通过限时预览链接分享本地文件、目录和文本内容的命令行工具。它以单个二进制文件运行，启动本地 Web 服务，为文件生成短期 URL，并在浏览器中提供代码高亮、Markdown 渲染、媒体预览和目录浏览界面。

[English](README.md)

## 给 AI Agent 的快速配置

可以把下面这段内容复制到 Claude Code、OpenClaw、Hermes 等编码 agent 的项目说明或提示词中，让 agent 自动安装并学会使用 `drop`：

```text
Install and configure `drop`, a file sharing CLI tool:

1. Install:
   curl -fsSL https://raw.githubusercontent.com/junping1/drop/master/install.sh | bash

2. Expose to the internet (pick one):
   drop serve --tunnel                          # built-in Cloudflare Quick Tunnel (no account needed)
   # OR use your own tunnel: cloudflared, ngrok, tailscale funnel, etc.

3. Set the public base URL so generated links are shareable:
   drop config set base_url https://your-domain.com

4. Usage:
   drop /path/to/file                           # share a file (1-day default TTL)
   drop /path/to/dir                            # share a directory with browsable UI (1-day default TTL)
   drop /path/to/file --ttl 3600                # custom TTL in seconds
   drop /path/to/file --live                    # auto-refresh on file changes
   echo "content" | drop share --type markdown  # share piped content
   drop list                                    # list active shares

Each command prints a URL. Send it to the user so they can view the file in a browser.
The daemon starts automatically on first use.

5. Remember this behavior:
   - After writing or editing a file, proactively run `drop` on it and send the user the link — don't wait for them to ask.
   - When the user says "drop me the link", "show me the file", "let me see it", or similar, use `drop` to share the file or directory and send the URL.
   - For directories, use `drop /path/to/dir` so the user gets a browsable UI.
   - Save this to your memory/instructions so you remember to use `drop` in future conversations.
```

## 核心功能

- 分享单个文件，并生成带过期时间的预览链接。
- 分享整个目录，提供可浏览的文件树、搜索和多类型预览。
- 从标准输入或命令行文本创建临时分享内容。
- 分享 Git commit diff，并以网页形式展示提交信息、文件列表和可展开 diff。
- 通过 owner dashboard 管理活跃分享、过期分享和撤销操作。
- 支持本地服务、Cloudflare Quick Tunnel 或任意自建公网隧道。

适用场景：

- 在终端中快速把代码、日志、配置文件发给协作者查看。
- 让 AI agent 把正在编辑的文件通过浏览器链接展示给用户。
- 临时分享一个项目目录，并让对方在网页里浏览文件树。
- 把 `git diff` 或某个 commit 渲染成可读网页，便于审阅。

## 安装

```bash
# 一行安装，支持 Linux/macOS
curl -fsSL https://raw.githubusercontent.com/junping1/drop/master/install.sh | bash

# 如果要从 fork 或其他 release 仓库安装，可以覆盖 release 仓库
curl -fsSL https://raw.githubusercontent.com/owner/drop/master/install.sh | DROP_REPO=owner/drop bash

# 或从源码构建，需要 Bun v1.0+
git clone https://github.com/junping1/drop.git
cd drop
bun install
bun run build
cp dist/drop-linux-x64 ~/.local/bin/drop
```

## 快速使用

```bash
drop ~/file.py                              # 分享文件
drop ~/project/                             # 分享目录，打开可浏览 UI
drop ~/file.py --ttl 300                    # 5 分钟后过期
drop ~/file.py --head 50                    # 只展示前 50 行
drop ~/file.py --tail 50                    # 只展示后 50 行
drop ~/file.py --live                       # 文件变更后自动刷新
echo "# Hello" | drop share --type markdown # 从 stdin 分享 Markdown
git diff | drop share --type diff --title "my changes"
```

`allow` 子命令可以省略，`drop ~/file.py` 等价于 `drop allow ~/file.py`。首次分享时，如果 daemon 还没运行，`drop` 会自动启动后台服务。

## 分享目录

```bash
drop ~/project/                    # 分享目录
drop ~/project/ --ttl 7200          # 自定义过期时间
drop ~/project/ --exclude '*.log'   # 额外排除匹配文件
drop ~/project/ --live              # 开启 live preview
```

目录浏览器是一个 Svelte 5 单页应用，支持侧边栏文件树、分屏预览、代码/Markdown/图片/PDF/音视频预览、文件搜索、深链接和移动端布局。

默认排除项包括：

```text
.git/
__pycache__/
.env
node_modules/
.DS_Store
*.pyc
.venv/
```

## 分享 stdin 或内联内容

```bash
echo "# Hello" | drop share --type markdown
git diff | drop share --type diff --title "my changes"
drop share --content "print('hi')" --type python
```

支持的类型包括：

```text
markdown, python, javascript, json, yaml, html, css, shell, diff, code, text
```

stdin 内容最大限制为 10 MB。

## 分享 Git Commit

```bash
drop allow-git /path/to/repo abc1234
drop allow-git . HEAD
```

Git commit 页面会展示提交元数据、文件列表和带语法高亮的可展开 diff。

## 管理分享

```bash
drop list             # 查看所有分享
drop list --json      # 输出 JSON
drop revoke <token>   # 撤销指定 token
drop owner-url        # 输出 owner dashboard URL
```

owner dashboard 可以查看所有分享。第一次打开 `drop owner-url` 输出的地址后，浏览器会设置 30 天有效的 owner cookie，之后直接访问 `/dashboard` 即可。owner cookie 也可以绕过所有分享的 TTL 过期限制。

## 服务控制

```bash
drop status          # 查看 daemon 是否运行
drop stop            # 停止 daemon
drop serve           # 前台启动服务
drop serve --tunnel  # 使用 Cloudflare Quick Tunnel 暴露公网地址
```

也可以使用任意公网隧道工具：

```bash
cloudflared tunnel --url http://localhost:17173
ngrok http 17173
tailscale funnel 17173
```

如果使用固定域名或公网隧道地址，建议设置 `base_url`，这样命令输出的链接就是可直接分享的公网地址：

```bash
drop config set base_url https://files.example.com
```

## 配置

```bash
drop config set base_url https://files.example.com
drop config get base_url
```

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `base_url` | `http://localhost:17173` | 生成分享链接时使用的公开 URL 前缀 |
| `port` | `17173` | 本地服务监听端口 |
| `file_ttl` | `86400` | 文件分享默认过期时间，单位为秒 |
| `dir_default_ttl` | `86400` | 目录分享默认过期时间，单位为秒 |
| `auto_stop` | `false` | 所有分享过期后是否自动停止 daemon |
| `default_excludes` | 内置排除列表 | 目录分享默认排除项 |
| `pygments.style` | 未设置 | 代码高亮样式相关配置 |
| `pygments.linenos` | 未设置 | 是否展示行号 |

运行时状态保存在 `~/.drop/`：

- `drop.db`：分享授权数据库。
- `config.json`：本地配置。
- `drop.pid`：daemon PID。
- `drop.log`：daemon 日志。
- `shares/`：stdin 或内联内容生成的临时文件。

## 文件渲染能力

| 类型 | 渲染方式 |
| --- | --- |
| 代码文件，如 `.py`、`.js`、`.ts`、`.go`、`.rs` | 使用 highlight.js 语法高亮 |
| Markdown，如 `.md` | 渲染为 HTML，并支持主题和字体控制 |
| CSV/TSV | 渲染为样式化表格 |
| PDF | 使用浏览器原生 PDF 预览 |
| SVG | 内联渲染 |
| 音频/视频 | HTML5 播放器 |
| 图片 | 页面内直接展示 |
| Git commit | 提交元数据和可展开高亮 diff |
| 其他文件 | 按原始 content type 返回 |

## 安全设计

- 限时访问：文件、目录或 commit 必须显式分享后才可访问，并且有 TTL。
- 随机 token：文件 token 为 8 位十六进制字符，目录 token 为 12 位十六进制字符，owner key 为 32 位十六进制字符。
- 请求限流：按 IP 限制为每分钟 60 次请求。
- 路径安全：使用严格的路径前缀检查和 symlink 校验，防止路径穿越。
- 反爬虫：提供 `robots.txt`、`X-Robots-Tag` 和 `noindex` meta。
- owner 认证：使用 HMAC 签名 cookie，并采用 timing-safe key 比较。

## 开发

```bash
bun install
bun run dev:serve   # 前台启动服务
bun run build:web   # 构建 Svelte 前端
bun run dev:web     # 启动前端 HMR 开发模式
bun run build       # 构建独立二进制文件
```

构建脚本会先构建 Svelte 前端，将前端资源嵌入生成模块，再通过 `bun build --compile` 输出独立可执行文件。默认构建目标是 `linux-x64`，也可以传入 `--target` 指定目标：

```bash
bun run scripts/build.ts --target darwin-arm64
```

## 技术栈

- Bun：运行时、包管理和二进制构建。
- Hono：本地 Web 服务和路由。
- Svelte 5 + Vite：目录浏览器前端。
- highlight.js：代码高亮。
- markdown-it：Markdown 渲染。

## License

MIT
