# Browser 共享 Session P0 探针

## 状态

关联 [#38](https://github.com/NAMEWTA/obsidian-huhu/issues/38)，实施计划见 [browser-38](../plans/browser-38.md)。这是**测试用宿主可行性实验**，不接入生产 `src/modules/browser`，不替代旧运行时，不等于已完成 P0 或 browser 全量重构。

本批验证环境为 Linux x64、Node.js 22.16.0。42 个 Node 测试通过，0 失败、0 跳过；6 个 JavaScript/CommonJS 文件通过 `node --check`。未提供真实 Obsidian 可执行文件，因此宿主探针未运行；其前置检查返回 `blocked / obsidian_executable_required`、退出码 2。没有 Windows/macOS/Linux 真实 Electron、三平台、IME、登录或性能通过证据。未执行全仓 pnpm build/lint/Vitest/文档门禁：当前工作容器只有此次变更文件和已读取的宿主 helper，没有完整仓库和安装依赖。

该测试数量证明探针的控制逻辑、站点约束和报告行为，不证明 Cookie 真共享、宿主权限有效或页面像素正确。

## 文件及职责

| 文件（相对 `scripts/obsidian-acceptance/`） | 职责 |
|---|---|
| `browser-shared-session.mjs` | 环境门禁、一次性 Vault、固定主进程代码加载、真实 webview 实验、完整退出重开、结果报告 |
| `browser-shared-session/policy.cjs` | 限定测试命名空间的 Session/attach 策略、唯一 guest、授权代次、CDP 和结果检查、关闭/清理 |
| `browser-shared-session/fixture.mjs` | 只监听 loopback 的合成网页；Cookie/localStorage/IndexedDB、页面内存/草稿、计数按钮、秘密哨兵 |
| `browser-shared-session/policy.test.mjs` | 模拟 Electron 的策略与竞态合同测试 |
| `browser-shared-session/runner.test.mjs` | 前置检查、失败报告、真实 loopback HTTP 服务的 Host/Origin/路由测试 |
| `fresh-vault.mjs` | 复用现有启动器，增加可选 `sandbox`、`requireGracefulExit`；既有调用默认配置不变 |

测试使用 Node 内置 runner，便于无 Electron 依赖地检查这个 `.mjs/.cjs` 验收工具；不是为产品纯逻辑另建测试体系。后续产品 TypeScript 测试仍遵循仓库的邻近 Vitest 规则。

## 本地可执行检查

在仓库根执行：

```bash
node --test scripts/obsidian-acceptance/browser-shared-session/policy.test.mjs scripts/obsidian-acceptance/browser-shared-session/runner.test.mjs
node --check scripts/obsidian-acceptance/browser-shared-session.mjs
node --check scripts/obsidian-acceptance/browser-shared-session/policy.cjs
node --check scripts/obsidian-acceptance/browser-shared-session/fixture.mjs
node --check scripts/obsidian-acceptance/browser-shared-session/policy.test.mjs
node --check scripts/obsidian-acceptance/browser-shared-session/runner.test.mjs
node --check scripts/obsidian-acceptance/fresh-vault.mjs
```

策略测试覆盖 attach 前安全配置、拒绝伪造/重放 token、只处理自有 guest、权限拒绝、危险 URL/重定向、个人 Space、错误 Space/实例/token、过期授权、接管、新授权、异步目标定位中的撤权/导航、迟到 AX/截图、debugger 归属与 detach、崩溃、按下后撤权的原页释放、关闭未完成时禁止清理、失败传播、监听释放、数量上限和重启 nonce。

站点测试使用实际 Node loopback listener，不是假 HTTP mock。发送 hostile Host 用 `node:http`，避免 `fetch` 覆盖 Host 后把未发送的攻击请求误认为测试成功。页面 CSP 禁止外部资源，不开放 CORS，不接收写入接口、文件路径或任意执行脚本。

## 真实宿主执行

必须在完整 checkout 中、已准备所测 `main.js/styles.css/manifest.json` 的环境运行。使用项目已支持的 Node 工具版本；本批工具测试环境是 Node 22。Obsidian 路径、临时根都必须为绝对路径，临时根必须**尚不存在**，不得传真实 Vault、HOME 或 Obsidian profile。启动器会创建独立 Vault/profile/HOME，并只终止自己启动的进程。

POSIX 示例（按本机实际安装路径设置）：

```bash
HUHU_OBSIDIAN_EXECUTABLE=/absolute/path/to/Obsidian \
  node scripts/obsidian-acceptance/browser-shared-session.mjs /absolute/path/to/new-browser-p0
```

PowerShell 示例：

```powershell
$env:HUHU_OBSIDIAN_EXECUTABLE = 'C:\absolute\path\Obsidian.exe'
node scripts/obsidian-acceptance/browser-shared-session.mjs 'C:\absolute\path\new-browser-p0'
```

`HUHU_PLUGIN_SOURCE` 可指定另一份已构建插件目录；`HUHU_ACCEPTANCE_PORT` 可移动现有测试 CDP 端口。运行器不下载 Chrome/Electron、不选择 Native bundle、不连接真实站点，不自动启用生产浏览器。

Linux 必须以能正常运行 Chromium sandbox 的非 root 用户运行。新探针传 `sandbox:true`，不使用 `--no-sandbox` 逃过安全门禁。保留 sandbox 启动参数不等于完成各平台 sandbox 安全认证，实际配置和恶意页面检查仍需补齐。

已有启动器使用调试端口驱动一次性测试宿主；**这是验收设施，不是生产浏览器对外开放的 CDP 服务**。探针中的页面操作仍经过固定主进程策略和该 guest 的 debugger，不能把测试启动参数迁入产品。

## 执行顺序与证据

脚本在受限测试站中执行：

1. 记录 Node/OS/架构、实际宿主进程版本、webview 启用状态、主插件/策略/helper 摘要；创建固定 DOM guest，首次导航前固定 partition 和安全配置。
2. 同一 Space 两页共享站点存储，另一 Space 不共享；不同 Page 的草稿/JS 内存分开。隐藏/恢复保留原页的 WebContents 和内存。
3. AX 观察、固定按钮 CDP 点击、按需截图指向同一个 guest。接管拒绝旧授权，重新委托仍指向原 guest。
4. 正常完整退出并重新启动同一测试 Vault/profile，检查站点哨兵仍在，页面内存不被虚报恢复，旧授权失效。
5. 清理一个测试 Space，重新打开后其存储为空，另一 Space 的哨兵保留。

`requireGracefulExit:true` 使强杀、信号退出或非零退出不能算正常重启持久化通过。脚本并不凭热重载、重新执行 JavaScript 或重新打开标签来冒充应用重启。

证据位于新建根的 `evidence/`：`browser-shared-session.json`、合成页面截图、启动器日志。最终 JSON 包含状态、逐项结果、版本与源码摘要和未覆盖清单。初始化受阻时 stdout 返回 JSON；尚未创建宿主时不会伪造证据目录。

| 退出码/报告 | 含义 |
|---|---|
| 2 / `blocked` | 根目录/宿主路径/运行用户不满足前置条件，没有宿主成功结论 |
| 1 / `failed` | 初始化、自动实验或资源释放失败，需检查失败条目与测试宿主日志 |
| 0 / `automated-probe-passed` | 仅自动化子集通过；仍固定 `p0Complete:false`、`productionBrowserReplaced:false` |

AX 证据只记录角色/数量，不落 name/value；截图只对合成测试站拍摄。随机短期授权不写入结果或普通日志。不得换成真实账号页面运行这套测试；固定 `seed/inspect` 是测试特权，不是生产 API。启动日志和截图仍应按测试证据保管，分享前检查没有其他宿主内容。

## 不覆盖的内容与严格失败

本探针**没有**实际第二/复制 Vault 的路径 namespace、React 工作台、跨 Document 迁移、弹窗认证、IME、文件选择、用户键盘/滚轮/触控门禁、完整动作队列、实际 BOT/CLI/MCP、活跃 service worker 清理、下载恢复和平台性能证据。测试里的不同 Session 不等于已证明真实 Vault 隔离；模拟 seed 不等于人工登录；一个固定按钮不等于全站表单支持。

固定 DOM overlay 只是可行性测试，不可直接照搬为生产 UI，尤其不能据此声称已解决裁剪、Portal 遮挡、焦点或多窗口问题。缺少 `@electron/remote`、所需 Node 主进程 API、webviewTag、debugger 或安全配置时应失败，不能通过替身窗口或独立 Chromium 回退。

关闭调用后 guest 若仍存活，策略返回 `guest_close_pending`，不清除仍可能写入的 Session；本批未实现生产异步关闭状态机。失败后不将其报告为清理成功，也不尝试删除 Electron 数据目录。需结合真实宿主证据完善关闭等待及产品 `cleanup-pending` 恢复合同。

宿主退出后 Session 网站数据仍在这个一次性 profile 中。程序不递归删除测试根或用户目录。清理本次实验仅在确认测试宿主已经退出后，由操作者对**自己创建且确认路径的测试根**进行；不要扩大到系统 Obsidian userData。

生产切换的退出标准仍以 Issue F01–F12、B01–B40、H01–H17 为准；完整矩阵在实施计划中分组。未通过前保留 Draft，不将本批称为已完成全量重构。
