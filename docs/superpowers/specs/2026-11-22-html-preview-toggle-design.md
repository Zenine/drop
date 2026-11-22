# HTML 分享页「预览 / 源码」切换

日期：2026-11-22

## 意图

HTML 文件分享现在只显示高亮源码，接收方看不到页面效果。加一个切换，让 HTML 能在页面里预览，同时保持分享内容碰不到 drop 自身的凭据和其它分享。

## 目标

- `/f/:token` 打开 HTML 文件（`.html`、`.htm`）时，页面顶部有「预览」「源码」两个按钮，默认源码，与现在一致。
- 「预览」在沙箱 iframe 里显示新路由 `/f/:token/render` 返回的 HTML。
- 目录分享的 HTML 文件预览面板同样提供切换，路由 `/d/:token/render?path=`。
- 切换状态可用查询参数 `?view=preview` 直接打开。

## 安全约束

- render 路由返回 `text/html`，并带响应头 `Content-Security-Policy: sandbox allow-scripts allow-forms`（不含 `allow-same-origin`），直接顶层打开也处于不透明来源。
- iframe 使用 `sandbox="allow-scripts allow-forms"`（表单提交事件需要 `allow-forms` 才会触发），不加 `allow-same-origin`、`allow-top-navigation`、`allow-popups-to-escape-sandbox`。
- render 路由复用 `/f/:token/raw`、`/d/:token/raw` 的鉴权、过期、路径校验与访问记录；不放宽 raw 路由现有的 HTML 纯文本 + sandbox 处理。
- 体积上限沿用 `MAX_RENDER_SIZE`，超限时只给源码 / 下载。
- `X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer` 保持。

## 非目标

- 不渲染 SVG 以外的其它可执行类型（XHTML、XML 保持现状）。
- 不让预览页访问 localStorage、cookie；依赖本地存储的页面在预览中功能受限。

## 做法

二选一：

1. 新增独立 render 路由 + 沙箱 iframe（采用）：源码视图与鉴权路径都不动，沙箱双层生效。
2. 直接把 `/f/:token` 改为渲染 HTML：同源执行分享脚本，能读取 drop 凭据，否决。

## 验收

- 测试覆盖：render 路由的 CSP 头与 content-type；未授权、过期、目录越权路径被拒；HTML 页面含切换与 sandbox iframe 且无 `allow-same-origin`；源码视图不变；超限文件不提供预览。
- `scripts/verify.sh` 通过；重编 `~/.local/bin/drop` 并重启 `drop.service` 后，用公网域名打开一份 HTML 分享，预览能执行脚本。
