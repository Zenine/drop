# vibefs

A file and directory preview server with time-limited access control, designed for AI agents to share local files with users via URLs.

This is a full rewrite of [vibefs](https://github.com/junping1/vibefs) in TypeScript, powered by Bun, Hono, and Svelte 5.

## Why the rewrite?

| | Python (original) | TypeScript (this) |
|---|---|---|
| Runtime | Python + Waitress | Bun (single binary) |
| Web framework | Bottle | Hono |
| Templating | Jinja2 (server-rendered) | Svelte 5 SPA (client-rendered) |
| Syntax highlighting | Pygments (server) | highlight.js (client) |
| Markdown | markdown-it (server) | markdown-it (client) |
| Directory browser | Server-rendered HTML + vanilla JS | Svelte 5 with reactive components |
| DB | SQLite via Python stdlib | SQLite via Bun's native `bun:sqlite` |
| Install | `uv tool install` / `pip install` | `bun install` |

Key improvements:
- **Faster startup**: Bun's native runtime vs Python interpreter
- **Better directory browser**: Svelte 5 SPA with animations, split pane, responsive mobile nav
- **Client-side rendering**: Syntax highlighting and markdown rendering happen in the browser, reducing server load
- **Single runtime**: No need for Python + pip/uv — just Bun

## Install

Requires [Bun](https://bun.sh/) v1.0+.

```bash
# Clone and install dependencies
git clone https://github.com/junping1/vibefs-next.git
cd vibefs-next
bun install

# Run directly
bun run src/cli/index.ts --help

# Or link globally
bun link
```

## Usage

### Share a file

```bash
vibefs allow /path/to/file.py
# http://localhost:17173/f/a3b7c2d1

vibefs allow /path/to/file.py --ttl 300    # 5 minutes
vibefs allow /path/to/file.py --head 50    # Only first 50 lines
vibefs allow /path/to/file.py --tail 20    # Only last 20 lines
vibefs allow /path/to/file.py --live       # Auto-refresh on file changes
vibefs allow /path/to/file.py --json       # Output URL as JSON
```

### Share a directory

```bash
vibefs allow ~/project/
# http://localhost:17173/d/a3b7c2d1e5f6

vibefs allow ~/project/ --ttl 7200               # 2 hours (default: 3 hours)
vibefs allow ~/project/ --exclude '*.log'         # Exclude log files
vibefs allow ~/project/ --live                    # Auto-refresh on changes
```

Directory shares open a Svelte 5 SPA with:
- Sidebar file tree with expand/collapse animations
- Split-pane preview: code (highlight.js), markdown (rendered), images, PDF, audio/video
- File search
- Deep linking: `/d/<token>/path/to/file`
- Responsive mobile layout with slide-out navigation
- Breadcrumb navigation

### Share content from stdin

```bash
echo "# Hello" | vibefs share --type markdown
git diff | vibefs share --type diff --title "my changes"
vibefs share --content "print('hi')" --type python
```

Supported types: `markdown`, `python`, `javascript`, `json`, `yaml`, `html`, `css`, `shell`, `diff`, `code`, `text`

### Share a git commit

```bash
vibefs allow-git /path/to/repo abc1234
vibefs allow-git . HEAD
```

### Manage shares

```bash
vibefs list                  # List all active shares
vibefs list --json           # Output as JSON
vibefs revoke <token>        # Revoke a share
```

### Owner dashboard

```bash
vibefs owner-url             # Print dashboard URL with auto-generated key
```

### Server control

```bash
vibefs status                # Check daemon status
vibefs stop                  # Stop daemon
vibefs serve                 # Start in foreground
vibefs serve --tunnel        # Start with Cloudflare Quick Tunnel
```

### Configuration

```bash
vibefs config set base_url https://files.example.com
vibefs config set file_ttl 43200
vibefs config set port 8080
```

## Architecture

```
src/
├── cli/
│   └── index.ts              # CLI (Commander.js) + daemon management
├── db/
│   ├── index.ts              # bun:sqlite database setup
│   ├── authorizations.ts     # File share CRUD
│   ├── dir-authorizations.ts # Directory share CRUD
│   ├── git-authorizations.ts # Git commit share CRUD
│   └── cleanup.ts            # Expired share cleanup
├── server/
│   ├── index.ts              # Hono app setup + middleware
│   ├── middleware/
│   │   ├── auth.ts           # Owner authentication
│   │   ├── rate-limit.ts     # 60 req/min per IP
│   │   └── security.ts       # Security headers, anti-crawler
│   ├── render/
│   │   ├── index.ts          # Renderer registry
│   │   ├── code.ts           # Code with highlight.js
│   │   ├── csv.ts            # CSV/TSV tables
│   │   ├── markdown.ts       # Markdown rendering
│   │   └── html-templates.ts # HTML page templates
│   └── routes/
│       ├── file.ts           # /f/:token
│       ├── dir.ts            # /d/:token
│       ├── git.ts            # /git/:token
│       ├── dashboard.ts      # /dashboard
│       ├── owner.ts          # /owner/auth
│       ├── verify.ts         # /verify
│       └── live.ts           # WebSocket live reload
├── shared/
│   ├── config.ts             # Config load/save, owner key
│   ├── constants.ts          # Token lengths, TTLs, limits
│   ├── fs.ts                 # File system utilities
│   ├── types.ts              # Shared TypeScript types
│   └── utils.ts              # Path display, escaping
└── web/                      # Svelte 5 SPA (directory browser)
    ├── App.svelte
    ├── main.ts
    ├── components/
    │   ├── DirBrowser.svelte   # Main directory browser
    │   ├── FileTree.svelte     # Sidebar file tree
    │   ├── FileTreeItem.svelte # Recursive tree node
    │   ├── SearchBox.svelte    # File search
    │   ├── Breadcrumb.svelte   # Path breadcrumbs
    │   ├── Preview.svelte      # Preview router
    │   ├── CodePreview.svelte  # highlight.js code preview
    │   ├── ImagePreview.svelte
    │   ├── PdfPreview.svelte
    │   ├── MediaPreview.svelte # Audio/video
    │   └── BinaryPreview.svelte
    └── lib/
        ├── api.ts              # Fetch helpers
        ├── format.ts           # File size/date formatting
        ├── icons.ts            # SVG file type icons
        └── types.ts            # Frontend types
```

## Security

Same security model as the Python version:
- Nothing accessible until explicitly authorized with a TTL
- Token entropy: 8 hex (files), 12 hex (dirs), 32 hex (owner)
- Rate limiting: 60 req/min per IP
- Path traversal protection
- Anti-crawler headers
- Constant-time owner key comparison
- httponly cookies for owner auth

## Development

```bash
# Start server in foreground
bun run dev:serve

# Build Svelte frontend
bun run build:web

# Dev mode for Svelte (HMR)
bun run dev:web
```

## State

All runtime data in `~/.vibefs/` (shared with the Python version):

| File | Purpose |
|------|---------|
| `vibefs.db` | Authorization records (SQLite) |
| `vibefs.pid` | Daemon PID |
| `vibefs.log` | Daemon logs |
| `config.json` | Configuration |
| `shares/` | Temporary files from `vibefs share` |
| `tunnel_url` | Active tunnel URL |

## License

MIT
