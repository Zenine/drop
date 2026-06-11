# UI 回归修复工作流

本工作流用于目录浏览器、预览面板、`Files` / `Commits` 标签页等前端交互回归。

## 处理步骤

1. 先定位状态切换入口，例如 `src/web/components/DirBrowser.svelte`、`CommitsTab.svelte` 或相关组件。
2. 先补一个聚焦回归测试，优先放在最接近问题的测试文件中；当前目录浏览器标签页回归放在 `tests/commits-ui.test.ts`。
3. 运行聚焦测试并确认失败，例如：

   ```bash
   bun test tests/commits-ui.test.ts
   ```

4. 做最小修复，避免扩大分享鉴权、密钥扫描、目录排除或 Git 历史暴露范围。
5. 再运行聚焦测试，确认回归用例通过。
6. 运行完整验证入口：

   ```bash
   scripts/verify.sh
   ```

7. 如行为变化会影响用户可见体验，同步更新 `README.md`、`README.zh-CN.md` 和 `CHANGELOG.md`；未完成或未验证事项留在 `TODO.md`。

## Files / Commits 标签页检查清单

- 从 `Files` 切到 `Commits` 时，可以关闭侧边栏并进入预览视图。
- 从 `Commits` 切回 `Files` 时：
  - 如果已有选中文件，继续展示该文件预览。
  - 如果没有选中文件，回到文件树列表，避免移动端停留在空预览面板。
- 不要在 URL、localStorage、console 或错误输出中暴露 owner key。
- 不要放宽默认最近 5 条 commit 限制；Owner unlock 相关变更必须覆盖鉴权、cookie 作用域和过期测试。
