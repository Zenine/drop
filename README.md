# drop

Share files, directories, and content via time-limited preview URLs. Designed for AI agents to drop files to users in a browser.

Built with Bun, Hono, and Svelte 5. A TypeScript rewrite of [vibefs](https://github.com/junping1/vibefs).

## Install

Requires [Bun](https://bun.sh/) v1.0+.

```bash
git clone https://github.com/junping1/drop.git
cd drop
bun install
```

## Usage

### Share a file

```bash
drop allow /path/to/file.py
# http://localhost:17173/f/a3b7c2d1

drop allow /path/to/file.py --ttl 300     # 5 minutes
drop allow /path/to/file.py --head 50     # Only first 50 lines
drop allow /path/to/file.py --tail 20     # Only last 20 lines
drop allow /path/to/file.py --live        # Auto-refresh on file changes
drop allow /path/to/file.py --json        # Output URL as JSON
```

The daemon starts automatically if it's not already running.

### Share a directory

```bash
drop allow ~/project/
# http://localhost:17173/d/a3b7c2d1e5f6

drop allow ~/project/ --ttl 7200               # 2 hours (default: 3 hours)
drop allow ~/project/ --exclude '*.log'         # Exclude log files
drop allow ~/project/ --live                    # Auto-refresh on changes
```

Directory shares open a Svelte 5 SPA with:
- Sidebar file tree with expand/collapse animations
- Split-pane preview: code (highlight.js), markdown (rendered), images, PDF, audio/video
- File search within the directory
- Deep linking: `/d/<token>/path/to/file`
- Responsive mobile layout with slide-out navigation
- Breadcrumb navigation

Default excludes: `.git/`, `__pycache__/`, `.env`, `node_modules/`, `.DS_Store`, `*.pyc`, `.venv/`

### Share content from stdin

```bash
echo "# Hello" | drop share --type markdown
git diff | drop share --type diff --title "my changes"
drop share --content "print('hi')" --type python
cat data.csv | drop share --type text --ttl 7200
```

Supported types: `markdown`, `python`, `javascript`, `json`, `yaml`, `html`, `css`, `shell`, `diff`, `code`, `text`

### Share a git commit

```bash
drop allow-git /path/to/repo abc1234
drop allow-git . HEAD              # Current commit in current repo
drop allow-git . HEAD --ttl 300
```

Renders commit metadata, file list, and expandable diffs with syntax highlighting.

### Manage shares

```bash
drop list                  # List all active shares
drop list --json           # Output as JSON array
drop revoke <token>        # Revoke a specific share
```

### Owner dashboard

```bash
drop owner-url             # Print dashboard URL with auto-generated key
```

The dashboard shows all shares and lets you manage them. Visit the URL once to set a 30-day cookie, then `/dashboard` works without the key.

### Server control

```bash
drop status                # Check if daemon is running
drop status --json         # Output as JSON
drop stop                  # Stop the daemon
drop serve                 # Start server in foreground
drop serve --tunnel        # Start with a Cloudflare Quick Tunnel
```

### Configuration

```bash
drop config set base_url https://files.example.com
drop config get base_url

drop config set file_ttl 43200          # 12 hours for files (default: 3600)
drop config set dir_default_ttl 21600   # 6 hours for directories (default: 10800)
drop config set port 8080               # Default: 17173
drop config set auto_stop true          # Stop daemon when all shares expire
```

When `base_url` is set, generated URLs use it instead of `localhost:port`.

## File rendering

| Type | Rendering |
|------|-----------|
| Code (`.py`, `.js`, `.ts`, `.go`, `.rs`, etc.) | Syntax highlighting via highlight.js (client-side) |
| Markdown (`.md`) | Rendered HTML with theme/font controls and reading progress |
| CSV/TSV (`.csv`, `.tsv`) | Styled HTML table |
| PDF (`.pdf`) | Browser's native PDF viewer |
| SVG (`.svg`) | Inline SVG rendering |
| Audio (`.mp3`, `.wav`, `.ogg`, `.flac`, etc.) | HTML5 audio player |
| Video (`.mp4`, `.webm`, `.mov`, etc.) | HTML5 video player |
| Images | Displayed inline |
| Git commits | Metadata + expandable syntax-highlighted diffs |
| Other | Served with original content-type |

## Security

- **Access control**: Nothing accessible until explicitly authorized with a TTL
- **Token entropy**: 8 hex chars (files), 12 hex chars (directories), 32 hex chars (owner key)
- **Rate limiting**: 60 requests/min per IP
- **Path traversal**: Strict prefix checks, symlink validation
- **Anti-crawler**: `robots.txt`, `X-Robots-Tag`, `noindex` meta tags
- **Owner auth**: HMAC-signed cookies, timing-safe key comparison, httponly/samesite
- **Large files**: >5MB served as download

## Architecture

```
src/
├── cli/index.ts              # CLI (Commander.js) + daemon management
├── db/
│   ├── index.ts              # bun:sqlite database
│   ├── authorizations.ts     # File share CRUD
│   ├── dir-authorizations.ts # Directory share CRUD
│   ├── git-authorizations.ts # Git commit share CRUD
│   └── cleanup.ts            # Expired share cleanup
├── server/
│   ├── index.ts              # Hono app + middleware
│   ├── middleware/            # Auth, rate limiting, security headers
│   ├── render/               # Code, CSV, markdown, HTML templates
│   └── routes/               # /f/, /d/, /git/, /dashboard, /verify, /live
├── shared/                   # Config, constants, types, utilities
└── web/                      # Svelte 5 SPA (directory browser)
    ├── components/           # DirBrowser, FileTree, Preview, Search, etc.
    └── lib/                  # API helpers, formatting, icons, types
```

### Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh/) |
| Web framework | [Hono](https://hono.dev/) |
| Frontend | [Svelte 5](https://svelte.dev/) |
| Syntax highlighting | [highlight.js](https://highlightjs.org/) (client-side) |
| Markdown | [markdown-it](https://github.com/markdown-it/markdown-it) |
| Database | SQLite via `bun:sqlite` |
| CLI | [Commander.js](https://github.com/tj/commander.js) |
| Build | [Vite](https://vite.dev/) |

## Development

```bash
bun run dev:serve          # Start server in foreground
bun run build:web          # Build Svelte frontend
bun run dev:web            # Svelte dev mode with HMR
```

## State

All runtime data in `~/.drop/`:

| File | Purpose |
|------|---------|
| `drop.db` | Authorization records (SQLite) |
| `drop.pid` | Daemon PID |
| `drop.log` | Daemon logs |
| `config.json` | Configuration |
| `shares/` | Temporary files from `drop share` |
| `tunnel_url` | Active tunnel URL |

## Deploy

```bash
# Built-in Cloudflare Quick Tunnel (no account needed)
drop serve --tunnel

# Or use any tunneling service
cloudflared tunnel --url http://localhost:17173
ngrok http 17173
tailscale funnel 17173

# Then set the base URL
drop config set base_url https://your-domain.com
```

## Agent integration

Add to your AI agent's system prompt:

```
You have access to `drop`, a file sharing tool.

To share a file or directory:
    drop allow /path/to/file_or_dir [--ttl SECONDS] [--live]

To share piped content:
    echo "content" | drop share --type markdown

This prints a URL. Send it to the user — they can view the file in a browser.
Links expire after the TTL (default: 1 hour for files, 3 hours for directories).
```

## License

MIT
