Session: 20261105T094057Z
Task: 092-repair-t11-review
Status: completed

## 聚焦交接

092 修复已完成，冻结完整 T11 候选后停止写入，交 Root 安排独立 high 双轴复审；本报告不宣称 Ticket done 或完成宿主验收。

实现者 native:/root/repair_t11，用户授权 medium 实现；未委派。按 workspace/catalog 定位既有 SpecDev I，应用 dev/ui、TDD、现有取消/安全边界。实际写集只有 QuickPick.tsx、HealthPage.tsx、InboxPanel.tsx 与两个新增相邻 DOM 测试。health/ui/i18n.ts 的 planInvalid 双语由 Root 批准并写入；safe/i18n.ts hint 为 Root 上轮补充。未写 core/services/platform/api、用户数据、Clipboard、产物、index、正式 Evidence 或状态。

## 固定输入与完整候选

- 继承 087 真实编辑前基线 /tmp/huhu-t11-implementation/baseline 与 baseline.json；原完整候选 41 路径 manifest SHA256 629bb90ee5c2804db279d381101a2d3f213d486e54b7d0dd24612844513c3b6b。
- 原审查 090-review-t11-ui/REPORT.md 与 /tmp/huhu-t11-high-review/review.dom.test.tsx；不是从 HEAD 推断工作副本。
- 本次开始的 41 路径字节/模式快照 /tmp/huhu-t11-review-repair/start 与 start-manifest.json。完整候选 44 路径 /tmp/huhu-t11-review-repair/candidate，candidate-manifest.json SHA256 eaabea4b078cc6133012893e0bf3551cb698d371cf37a679c82afad332292d17。包含原 41、两个新增 DOM、Root safe/i18n.ts hint 补充；后者无 087 baseline，标 root-supplement，未伪称 worker 新建。
- /tmp/huhu-t11-review-repair/complete-candidate.patch 为原真实基线到当前 43 路径差异，Root safe/i18n.ts 补充独立由 manifest 精确绑定；repair.patch 为本次起点增量（含 Root health 双语）；repair-paths.json、commands.json 保存清单与退出码。
- freeze-check.json / final-drift.json：44 路径 SHA256 + mode 零漂移。所有过程材料只在 /tmp，未写正式 evidence。

## 逐项修复与证据

### S1 / SP1 · 新模块内 QuickPick 复制

QuickPick 的 close 读取最新 onClose ref，生命周期 effect 的 close 身份稳定。SafeService.busy 的父更新不再 teardown 当前复制；真正 Escape/关闭、卸载、窗口 unload、锁定 generation 与 signal abort 仍使用原取消链，不改服务。

新增 SafePage.quick.dom.test.tsx 通过真实 SafePage + SafeService + CipherRepository/WebCrypto 与内存 clipboard，覆盖 Enter 密码、Shift+Enter 用户名、按钮用户名、按钮密码失败后重试；重试成功后外部 clipboard owner 文本在锁定时保留。既有 QuickPick delayed-write/unmount、锁定、Escape、owner unload、命令关闭/模块停止测试包含在 74 DOM 通过中。无真实系统 Clipboard 或 vault。

### S2 · 实际报告边界（继承缺口）

HealthPage 撤销边界增加当前 resolved report.id 和 port。报告替换时递增 generation 并 abort 只读 plan，撤销旧预览、勾选、错误与确认。写操作不因该边界被 abort，领域回执仍保存在 repairs.results，按 reportId 展示。

新增 HealthPage.real.dom.test.tsx 使用真实 scanner/repairs。第一叶默认 repair 路由 plan 等待 owner.preview；第二叶实际 HealthPage 的 Rescan 按钮完成新报告；释放旧 preview 后第一叶没有迟到错误、预览或取消提示，能为新报告生成计划。另一用例验证新报告重置旧 exclusions，普通扫描导航保留。

### SP2 · 五分钟计划过期恢复（继承缺口）

确认入口消费既有 expiresAt，并通过既有 repairs.preview 重新验证，不新增轮询或延长 TTL。过期在打开确认前、确认时均撤销预览/confirmation，显示 Root 双语 planInvalid；run 对领域 health-plan-expired / health-rescan-required 同样撤销失效预览。保留合法报告与勾选，复用既有 Generate repair plan / Rescan 动作。领域 confirm/CAS/回执未改。

真实服务 freshnessMinutes=60：生成计划、打开确认、服务时钟推进 300001ms，确认时预览撤销，零旧修复结果；点击真实 Generate repair plan 重新生成后显式确认，真实 repairs.results 返回 verified，页面显示 Repair and recheck complete。另一例消费 expiresAt 在打开过期确认前拦截并保留选择。

### SP3 · 通知中文标签字号（继承遗漏）

InboxPanel 唯一 text-[11px] 改 text-xs，复用 --hu-text-xs（当前 12px）及既有 Tailwind 字阶映射。未改无关版式。计算字体、缩放和生产矩阵仍由 Root 浏览器验收；本报告不将源码 token/DOM 冒充像素通过。

## 实际验证与退出码

| 命令 | 结果 | 原始材料 |
|---|---|---|
| pnpm exec vitest run --project dom src/modules/safe/ui/SafePage.quick.dom.test.tsx src/modules/health/ui/HealthPage.real.dom.test.tsx（初始原反例） | 3 failed；退出126；分别复制空、旧报告alert、过期预览保留 | /tmp/huhu-t11-review-repair/red.log |
| 同定向命令（最终） | 2文件8 tests通过；退出0 | green-final.log |
| pnpm exec vitest run --project dom src/modules/notifications src/modules/safe src/modules/health | 12文件74 tests通过；退出0 | dom.log |
| pnpm exec tsc --skipLibCheck -p /tmp/huhu-t11-implementation/tsconfig.json（含最终测试） | 退出0 | types-final.log |
| pnpm run lint | 工具退出126，内部exit1；仅 navigator/platform/vault-source.ts:45 unbound-method，已报告Root | lint.log |
| pnpm exec eslint src/modules/safe/ui src/modules/health/ui src/modules/notifications/ui --max-warnings 0 | 退出0、零警告 | lint-scoped.log |
| node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-11 --matrix redesign --out /tmp/huhu-t11-review-repair/fixture-check --check | 退出0；preflight、0 matrix cases | fixture-check.log / fixture-check/result.json |
| git diff --check -- 五个worker路径 | 退出0 | 工具实录 |
| validate-dispatch --stage dispatch | 退出0，0 errors/warnings | 工具实录 |

扩展测试过程中有两次非生产失败，均保留：green-first.log 使用精确“Verified”文本选择器，但页面实际组合为“Committed · Verified”，改为真实完成 heading；green-second.log 在导航 callback 后尚未等待订阅渲染即断言新勾选，改为等待可观察勾选。未改变生产代码求绿、未放宽正确行为断言。原反例 red 保留。74 DOM 在最终测试同步调整前通过，最终8条重新验证了调整后的两文件。

090 的26文件189领域测试、087 safety-regressions 原证据在未变服务/领域范围复用，未冒称本执行者重跑。未重建 main.js/styles.css，按本票原授权由 Root 统一生成。

## Design Conformance

继承 DESIGN revision3 digest 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66，pages notifications/safe/health，UX-NOTIFY-1 / UX-SAFE-1 / UX-HEALTH-1。局部行为修复保留批准布局、唯一组件与全部确认/取消门；通知标签对齐批准中文≥12px。未重选模板。实际浏览器 1440/390、明暗/zh缩放、原生 Obsidian/popout/文件选择器/系统 Clipboard 仍待 Root，fixture --check 不是截图或宿主证明。

## 问题与下一步

本轮四项实际 finding 已有最小修复与行为证据；请求独立 high 审查精确44路径候选。全仓lint的导航器错误交原owner，T11定向lint无错；Root继续统一浏览器/宿主/产物门。detached 非密码节点仅保留090边界观察，未扩成新泄露修复。报告不可覆盖；返回后 worker 停写等待 high。

## 产物与验证

返回结构补记：首次 return 校验退出126，原因仅缺少此精确标题；本段追加，未覆盖前文原始报告。完整候选44路径与差异见上文“固定输入与完整候选”，SHA256 eaabea4b078cc6133012893e0bf3551cb698d371cf37a679c82afad332292d17。74 DOM、最终8定向DOM、scoped types、T11 eslint与fixture preflight均退出0；全仓lint仅导航器域外错误，实际命令/退出与局限见上文“实际验证与退出码”。候选冻结后源码未变。
