# T27 本机回执文档与后验退出收尾候选

Session: 20261025T043239Z
Task: 058-host-receipt-docs-cleanup
Status: completed

## 聚焦交接

058已完成唯一三路径窗口并停写：数据正文按054真实实现说明回执/HMAC键归属，架构参考只保留owner与正文入口，fresh-vault stop强杀后等待原自有child的exit。明确READY且忽略SIGTERM的自有Node子进程在真实20秒宽限后覆盖强杀分支，新代码返回前已观察SIGKILL退出，最终exit/close均Wait并无残留。本次没有运行真实Obsidian、用户Vault、模型或目标OS后验，也没有扩大为进程管理框架。T27整票及联合代码门仍未完成；架构reference新摘要交Root重绑适用票据。

工作区 `/home/wta/orca/workspaces/obsidian-huhu/bot`、branch `NAMEWTA/bot`、HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`，Map15/Goal14/LOG077。TASK SHA `5846be975bf49418bd96b52e3dc4d90665ed86c2e580d123497146d59d8a2fb7` 已实际核对。沿已读AGENTS/当前Map、dev架构/测试/skill-maintenance、T27/I及documentation-procedure/current-facts-docs实施；没有再委派、提交、推送、发布或正式状态写入。

## 产物与验证

### 实物与权威正文

完整回读已接纳051 REPORT、evidence/host-receipt-root.md和054最终REPORT；054 REPORT实际SHA仍为 `17e14cb04a74d9b3ed1efb3e2d698941721c2f2d94caa8da8143d355e581ab70`。054自有生产源在本任务始末未变：

| 事实 | 本次实际核对源码 |
|---|---|
| device/Profile先做SHA256，receipt目录、effect摘要文件名及index，均经privateVaultStorage | receipt-store.ts、obsidian-host.ts、primitives.ts |
| 32字节随机HMAC-SHA256 key、精确App local-storage键名、保存后读回、不覆盖坏键、query不创键 | receipt-authority.ts与obsidian-host.ts的实际load/save回调 |
| receipt/index封印、身份与指纹/完整binding校验，只有有效completed为committed | receipt-store.ts、note-effects.ts |
| 可核查的实际后置hash只能是reconciled，无可信定位或不匹配为unknown，query不执行mutation | note-effects.ts的reconcile/queryReceipt |
| 业务Profile SQLite保持OS非同步根，Host最小证据不变成另一Approval/Run/event账本 | 现行数据正文、051/054与已确认Spec/ARCH边界 |

核对的是源码事实与现行约束，未把受控对象或作者报告当作真实Obsidian平台通过。Root已接纳的054冻结清单和报告引用纳入本任务manifest；052/053仍有其独立Go窗口，本任务不冒称冻结或检查其当前全部Go输入。

### 精确三文件修改

- `docs/data.md`：移除051阶段“预留根”的过时说明，集中到新“Bot 宿主回执与本机认证键”正文。准确说明 `.huhu/huhubot/<device SHA256>/host-receipts/<profile SHA256>/`、effect SHA256安全文件名和index；HMAC随机键通过App.loadLocalStorage/saveLocalStorage持有，键名为 `huhu.huhubot.receipt-key.v1.<device SHA256>.<profile SHA256>`，不进入Vault回执/HAP/日志/CP/portable。保留缺键/损坏/篡改/仅received不能确认写入、committed/reconciled/unknown区别、只读query不自动重放、敏感最小记录不能当缓存删除，以及未交付清除/备份/键导出/跨机恢复的边界。普通Vault JSON与App本机键分离不宣称防御OS或恶意宿主插件；现有Git整根排除及外部同步不受控说明保持。
- `.agents/skills/dev/references/architecture.md`：仅owner表增加2行，定位HostReceiptStore/privateVaultStorage与ReceiptAuthority/App本机存储，并链接数据正文。未复制键名、算法、字段、故障或保留长规则；未改dev入口、AGENTS、永久ADR/context。
- `scripts/obsidian-acceptance/fresh-vault.mjs`：只把stop的 `app.kill('SIGKILL')` 分支包成代码块并追加 `await exited`，之后再清session。原正常退出路径、真实20000ms宽限、自有child身份、返回接口、restart/crashRestart均保持；没有启动Obsidian或操作未知PID。

精确任务前后差异见 [change.patch](change.patch)，起始三文件原字节见 [before-files.json](before-files.json)。保留已有共享dirty内容；不把历史diff算作本轮改动。

### 实际验证

环境为本机Linux/amd64、Node v26.11.1、pnpm11.1.3。

| 命令/检查 | 实际结果 | 原始记录 |
|---|---|---|
| `node --check scripts/obsidian-acceptance/fresh-vault.mjs` | exit0 | [node-syntax.log](node-syntax.log) |
| 修改前 `node <本目录>/owned-stop-probe.mjs` | Node实际返回126、ERR_ASSERTION；READY并忽略SIGTERM的自有child在20005.75ms stop返回时尚未观察exit，精确暴露缺Wait；finally仍kill并Wait exit/close清理 | [red-ready-owned-stop.log](red-ready-owned-stop.log) |
| 修改后同一owned-stop-probe | exit0；20019.67ms返回，exitObserved=true、signal=SIGKILL，session已清；finally exit/close均已观察、child reaped | [green-ready-owned-stop.log](green-ready-owned-stop.log) |
| 修改前 `pnpm test:docs` | 脚本诊断exit1、外层126；10项既有finding | [docs-before.log](docs-before.log) |
| 修改后 `pnpm test:docs` | 脚本诊断exit1、外层126；精确同10项、introduced=[]、resolved=[] | [docs-after.log](docs-after.log)、[docs-comparison.json](docs-comparison.json) |
| `git diff --check -- docs/data.md .agents/skills/dev/references/architecture.md scripts/obsidian-acceptance/fresh-vault.mjs`；源与保护摘要核对 | exit0 | [final-freeze-check.log](final-freeze-check.log) |

controlled probe仅从正在读取的fresh-vault源码抽取实际stop闭包，以自有空环境Node child代替产品进程；CDP quit故意不生效，原20秒计时未缩短，child先以IPC报告READY并实际忽略SIGTERM，最终必须SIGKILL。它是本任务一次性证据，不加入产品永久测试suite，也不把这层验证称为launchFreshVault/Obsidian整体运行通过。最初较弱的普通idle child红灯另保留red-owned-stop.log，最终强杀结论只按上述READY/SIGTERM约束红绿；最终红绿的自有child均显式Wait到exit和close；初次probe亦已await exit且其工具进程已结束，无残留。

全仓docs不是绿色：10项全部存在于修改前，即原inputs的 #9/#12/#14/#15/#17/#19六处锚点，以及042/logs/report-draft.md内4处logs相对链接。Root已明确保留这些历史输入；本任务没有改旧规范、042报告或校验器掩盖失败。新数据正文锚点及架构入站链接无新finding，另已回读源事实和精确diff。没有执行全插件build/lint、真实宿主、模型、OS credential、用户库、同步或untrack；没有更新main.js/styles.css、notices、资产、依赖或锁。

### 前后摘要与交接

| 文件 | 修改前SHA256 | 修改后SHA256 |
|---|---|---|
| `docs/data.md` | `40b7d0ec872f915febb450fb50e8ff601d58efe92e866fa431fac36b1c04cb85` | `63bc6245ff5b3284eeee3acf2260f9ae37c38287890d1ca7e5c77a4eeee9e1cb` |
| `.agents/skills/dev/references/architecture.md` | `6f64334012acc1cb213bfa72fdc7bf214e96e07d0c2c9738b26c9ffebc420ce0` | `0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42` |
| `scripts/obsidian-acceptance/fresh-vault.mjs` | `2a169a1970bfe4c9e285e4368ee0d7e87fed7ea211671700cf5306418adf2120` | `e9460b539f699cc3b937a13386379725a096fb9258e3aa749089130c627ba24f` |

[final-inputs.json](final-inputs.json) 保存3路径前后SHA、只读HMAC/receipt来源、规则/TASK/054冻结清单及受保护输入；manifest自身SHA `ad21e8ca4885c07f3ae07cabff64a3e751c1c1ce6536e9e7092ef84ef7cab905`。架构reference唯一新摘要 `0c63bf9d63eb8626351b29cbdb980cfed0f9cede5e712c5de6d61eac35ec7b42`，相对旧 `6f64334012acc1cb213bfa72fdc7bf214e96e07d0c2c9738b26c9ffebc420ce0` 只有上述两行owner/入口；由Root重绑受影响票据Skill引用，不由本实现者修改正式状态。main/styles/notices、package/lock、dev入口与15个既有dist资产按保护清单始末一致。

## 问题与下一步

本窗口没有新增未处理失败、活动产品writer或自有子进程；既有10项docs问题按真实失败保留。三路径已冻结，交Root重绑reference并在052/053等生产输入稳定后执行联合全局检查/独立审查。真实Obsidian/模型/目标OS由用户后验，T27整票及联合代码门仍未完成，不能据本候选宣称最终发行或全平台通过。

完成报告后运行 `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/bot --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture --session 20261025T043239Z --task 058-host-receipt-docs-cleanup --stage return`，真实结果与exit保存在 [return-check.log](return-check.log)。
