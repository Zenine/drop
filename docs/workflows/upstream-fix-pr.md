# 向上游提交修复 PR 工作流

本仓库是 `junping1/drop` 的 fork。本工作流用于「审阅出问题 → 修复 → 提 PR 给上游」这条链路，避免每次临场重新推理。

适用场景：例行代码审阅、其它机器报来的线上报错、上游同步后发现的缺陷。

## 一、先做只读上下文检查

1. `git status --short`、最近提交。
2. `TODO.md`、`CHANGELOG.md`、`README.md`、`README.zh-CN.md`。
3. `docs/workflows/` 下的既有工作流。
4. 确认与上游的差距，并核对本机运行状态：

   ```bash
   git fetch upstream
   git rev-list --count HEAD..upstream/master
   systemctl --user status drop.service
   ```

本机 daemon 从源码运行（`bun run src/cli/index.ts serve`），状态目录 `~/.drop` 权限须保持 700。

## 二、审阅与分级

按面拆分并行审阅：服务端路由与中间件、CLI 与守护进程与共享模块、渲染与前端。每条发现都要给出可复现的输入与后果，无法复现的直接丢弃。

分级标准是产品定位，不是漏洞的理论严重度。drop 是单用户自用工具，分享链接公网可达且无登录门，所以判定只看两条：

- 会不会让不该出去的东西出去（密钥扫描缺口、同源脚本执行、非预期监听地址）。
- 会不会让自己日常使用出问题（主路径阻塞、常用文件类型报错、CLI 输出不一致）。

访客体验细节、企业级会话管理、需要自己坑自己才能触发的场景，明确记入「不做」并写清理由，避免以后反复翻出来当待办。

## 三、修复

1. 每条修复一个独立分支和独立工作树，**基于 `upstream/master` 而非本地 master**，否则 PR diff 会混入 fork 私有提交：

   ```bash
   git worktree add <路径> -b pr/<topic> upstream/master
   ln -s "$(git rev-parse --show-toplevel)/node_modules" <路径>/node_modules
   ```

2. TDD：先写会失败的测试，确认失败原因正确，再实现，再跑完整验证入口 `scripts/verify.sh`。
3. 测试必须使用隔离的临时 `HOME` 和随机端口。**绝不可读写真实的 `~/.drop`，绝不可绑定 17173 / 17174**；测试拉起的进程要在收尾时杀掉，跑完用 `pgrep -af "src/cli/index.ts serve"` 确认没有残留。
4. 提交信息用英文祈使句、conventional 前缀，不加任何 AI 署名或工具水印。
5. 一个 PR 一个提交；测试补丁式的后续提交在推送前压平。

## 四、审阅与复审

实现完成后再过一遍审阅：先看是否符合需求（缺失 / 多做 / 做错），再看代码质量与测试是否验证真实行为。发现问题则修复并做范围内复审，只核验这些发现是否解决、修复本身有没有引入新问题。

推送前最后确认：

```bash
git log --format=%B <base>..HEAD | grep -ciE 'co-authored|generated with|claude|anthropic'   # 必须为 0
bun run check && bun test
```

## 五、提 PR

```bash
git push -u origin pr/<topic>
gh pr create -R junping1/drop --base master --head <你的账号>:pr/<topic> \
  --title "<英文标题>" --body-file <描述文件>
```

PR 描述用英文，包含：问题现象与触发条件、根因、修复方式、测试覆盖，以及行为变更或破坏性变更的迁移说明。

## 六、收尾

- 未合并的 PR 记在 `TODO.md`，写明编号、分支和合并后动作。
- 已完成并验证的事实记入 `CHANGELOG.md`，同一事项不要在两处重复。
- 上游合并后：`git merge upstream/master` → `scripts/verify.sh` → `systemctl --user restart drop.service` → 把 `TODO.md` 中对应条目移入 `CHANGELOG.md`。
- 其它机器（如 macOS）需自行重新构建对应平台二进制才能生效，源码合并不会更新已安装的二进制。
