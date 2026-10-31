# T-02 independent review, round 2

Workspace: `/home/wta/orca/workspaces/obsidian-huhu/terminal`
Base/HEAD: `33c21e098ef3188cbab5a09f3e0a01fadb787715`
Input: `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-review-input.md`
Implementers: codex:/root/prepare_t02, codex:/root/implement_t01, codex:/root

Reviewer 未参与实现/修复。本轮只读仓库，隔离探针/报告仅写 `/tmp`，没有改源码、正式工件、预算或生成物，没有派子 Agent。首轮未变结论仅在实际 SHA 一致后复用。

<a id="standards"></a>
## Standards

Reviewer: codex:/root/review_t01
Axis: standards
Result: request-changes
Input-SHA256: 48497f9ed2f152160f58af21073bb0dc5b96c1ebf245372c75264adbf6ba2b96
Observed: 45 个交付文件逐字节/长度/after.sha256、28 个来源（含锚点）和31个T-01复用文件全部吻合。相对首轮仅 main.js、budget、四个指定修复源/测试变化；来源无变化。完整回读四个修复文件及 JsonStore/queue/stall/bridge 影响闭包，当前源码重打包的原两探针转绿，定向6文件63测试通过；另独立复现选择与后台追加交叠导致当前布局丢失的P2。

首轮逐项结论：

- **S01 已修复。** `space-service.ts:50–56,102–126` 把版本/scope 分类放在 JsonStore boolean decode 之外；primary/backup 每次 read 都验证；每次 write/mkdir 前再次检查两个已有输入，覆盖 JsonStore 不读取旧 backup 就覆盖的路径。错误不会被 JsonStore.decode 的 catch 当成可恢复损坏。原 future primary、cold/warm foreign 重试观察均保持原文件；新增 cold/warm × primary/backup × 版本/完整scope，以及 needsRecovery 后拒绝/明确恢复的回归通过。没有把文件检查宣称为对恶意外部写入的原子隔离。
- **S02 已修复。** `space-service.ts:142–147` 只在候选 load、scope、permit 均成功后发布 disk；一次 writer read EIO 后明确再次 create 成功并清除 flush 错误。needsRecovery 内失败仍保留 reload 标志，下一次明确操作重新检查；没有自动重放业务写。
- **S03 原双启动覆盖用例已修复，但布局闭包尚未完全关闭。** `updateLayout` 在队列内基于最新 records 变换，两个后台完成均被保留；下面的新时序仍会把已追加的标签删除，不以原探针转绿替代完整闭包判断。

### R2-S01 [P2] 切回 Space 的提交与后台追加交叠时，界面旧布局会覆盖新标签

位置：`src/modules/agent/services/workspace-service.ts:129–131`（修复后的后台 append 分支）；关联 `src/modules/agent/services/workspace-store.ts:101–107,91–94`（仅 selected ID 变化时 adopt，后续全量快照保存）。

可达前提/精确事件顺序：

1. A 中明确启动一个终端，持久 Session 已提交，launch 尚在等待。
2. 完成切到 B；随后用户发起切回 A。测试只把该 select 的 primary 写入暂挂，使其成为当前队列工作，store 中 selected 尚为 B。
3. 释放 launch，当前生产 `newTerminal → attach` 成功返回 runtime。attach 看到 selected=B，把 A 的 `updateLayout(openTab)` 排在尚未完成的 select 后面。
4. 释放 select 写入。select 提交后 bridge 采用 A 的旧空布局；随后 updateLayout 成功保存 A 的一个 tab，但 bridge 因 `selected === records.selectedSpaceId` 直接返回，当前可见布局仍为空。
5. 调用生产 `workspace.openPage('board')` 并 `persistence.flush()`。全量 saveLayout 以当前空终端布局为准，删除刚才保存的 terminal tab，runtime 仍存在。

实际 before/after：新探针第一行 `selectedA:true, savedTabs:[一个tab], visibleTabs:[], running:1`；下一次 UI 保存后 `savedRuntimeRefs:[], running:1`。持久 Session 不被删除，但用户刚启动终端的布局引用丢失。探针使用实际 WorkspaceService、SpaceService、JsonStore、workspace bridge，以假 launch/runtime 和内存 storage 控制单次 I/O 时序，没有伪称真实 PTY/Provider E2E。

根因：入队时决定“后台”与队列执行时实际选中的 Space 不是同一时刻；单队列解决两个 append 之间的丢更新，却没有协调 selectedSpace 的 adoption 和当前 UI 快照。此问题属于本票现有创建/Space选择/布局保存闭包，不是要求未来 CLI、后台管理或 detach 功能；也不声称它必然由本轮修复首次引入。

最小修复方向：让选择提交、后台布局变换和当前布局 adoption 使用一致的 owner/顺序；变换实际应用后若目标已成为当前 Space，须将已提交变换纳入当前显示/后续保存基线，同时保留更晚的本地 UI 编辑。不要仅无条件用磁盘布局重置当前 dirty 状态。可统一两类变换，或在 bridge 中明确协调当前 Space 的记录更新与待保存本地修改。

验证：固定上述 select primary 暂挂 → launch完成 → select提交 → append提交顺序；断言当前 A 立即可见该终端，后续正常 UI 编辑及 flush 后引用仍在。也保留原两个同时完成的回归，覆盖相反顺序、当前 UI 已有编辑以及 B 布局不受影响。

标准依据：dev/architecture 的业务状态 owner 与持久化完整性、error-handling 的实际副作用和可恢复状态保证；本例直接观察文件/store数据丢失，不是风格启发式。

预算/产物复核：本轮 main 增457B、Agent激活增460B，有修复归因且采用最小KiB阈值；styles 字节与首轮一致；eager 123533B/106 inputs 仍在123904阈值。Root repair build/full lint/最终架构/包体日志已回读并核对SHA；保留了临时回调夹具造成的初次架构失败，不把它记为通过。未发现其他新的可复现问题，不为未证实风险列泛化发现。

<a id="specification"></a>
## Specification

Reviewer: codex:/root/review_t01
Axis: specification
Result: request-changes
Input-SHA256: 48497f9ed2f152160f58af21073bb0dc5b96c1ebf245372c75264adbf6ba2b96
Observed: 同一45文件输入、28个冻结规范/标准/指令来源全部匹配，未发生source漂移。按T-02主责任AC-001/003/053/061及本地布局/Session贡献复审，不提前要求T-07/10/14/15。C01版本/scope拒绝和C02显式恢复的原反例已关闭；C03原双启动反例转绿，但当前创建/选择/保存闭包仍存在下述布局丢失，不能通过本票规范轴。

### R2-C01 [P2] 用户切回原 Space 时，成功启动的终端仍可能从当前布局和后续保存中消失

位置同 R2-S01：`workspace-service.ts:129–131`，`workspace-store.ts:101–107,91–94`。

Ticket implementation-route 固定持久 Session、按Space键隔离布局和真实 WorkspaceService 接线；本票的 AC-002 本地贡献要求稳定归属/布局独立。Spec §3.2 明确用户启动默认显示，切换不改变已冻结目标；本次反例没有请求额外功能，而是当前生产创建接缝返回成功后，当前 A 的UI没有采用其已提交tab，下一次合法保存又删掉它。

R2-S01 的五步复现构成可观察违反：A中一个已接纳启动与切回A交叠，返回A时 visibleTabs=0，后续保存 terminal引用=0而runtime=1。要求修复同一 service/bridge 状态同步闭包，按所列顺序及后续保存验证。原两个后台append的成功回归只能证明那一种时序，不足以关闭整个布局问题。

首轮其余未失效规范结论复用：UI/目录/owner代码无变化，C01/C02新回归覆盖拒绝副作用与显式恢复；未要求真实宿主/Provider/五平台E2E作为本次代码验收前置，也未将这些未运行项写成通过。

<a id="verification"></a>
## Actual verification

所有命令在仓库 cwd 执行；以下是 reviewer 亲自运行的结果。

- `node /tmp/huhu-t02-review-round2-freeze.mjs`：最终 exit0。45文件、28来源、31复用文件、Root repair日志副本SHA检查全部通过，范围外实现无遗漏。冻结scope digest为 `d2c28a9733f6a4486b9566232754a4dbd042c27c5d5a6d8541abb0e00eeba810`；最终raw scope为 `29ada7452fb02d4aebf791fa00086e3ea0186e74ffbc08b1dba24654168e27c9`，仅审查交付范围外、C/evidence内新增T-05-preflight.md与T-05-source-observation.json引起inventory/excluded字段变化，官方explicit-files comparable元数据完全一致，交付字节和source无漂移；tracked diff argv按冻结输入执行，SHA `e3eb0190d3eceed9555ff61807b16454fcd4e588f984b83e28ae22b70a9dbb83`。脚本初次套用首轮日志字段 `copy` 出错（工具exit126），随后按repair清单的saved_output/output_sha256核对成功；不是源码失败。
- `node /tmp/huhu-t02-review-rebuild-probes.mjs`：exit0，原两个entry字节与首轮一致，重新打包当前生产源码。
- `node /tmp/huhu-t02-storage-probe.mjs > /tmp/huhu-t02-round2-storage.stdout`：exit0。future被拒绝且primary仍v3；EIO首次失败、第二次成功；cold/warm foreign连续两轮均primaryChanged=false。
- `node /tmp/huhu-t02-layout-probe.mjs > /tmp/huhu-t02-round2-layout.stdout`：exit0。两个runtime/两个Session/两个savedTabs，切回后两个visibleTabs。另用Node assert解析两份新输出并断言这些结果，exit0打印 `Original probe observations assert repaired; all A repair log hashes/lengths match`；同一脚本核对A repair清单全部原日志SHA/长度。
- `pnpm exec vitest run src/modules/agent/services/spaces/space-service-recovery.test.ts src/modules/agent/services/spaces/space-service.test.ts src/modules/agent/services/workspace-service-spaces.test.ts src/modules/agent/services/controller-space.test.ts src/modules/agent/services/terminal/sessions-space.test.ts src/shared/json-store.test.ts`：exit0，6文件/63测试通过，0skip，原输出 `/tmp/huhu-t02-round2-tests.log`。这不是全仓测试。
- 新probe通过esbuild stdin/resolveDir=current repo打包；可复用命令 `node /tmp/huhu-t02-review-rebuild-selection-probe.mjs`，实际exit0。`node /tmp/huhu-t02-layout-selection-probe.mjs > /tmp/huhu-t02-layout-selection-probe.stdout` 实际exit0；这是收集失败观察的probe，退出0不表示合同通过。原输出如下，UUID仅标识本次fixture。

```json
{"case":"select-overlaps-attach","runtimeId":"070bc84e-05f0-410e-887e-b1a00755a52b","selectedA":true,"savedTabs":["tab-6bd8ab03-4290-4755-81b5-61654cc2ba88"],"visibleTabs":[],"running":1}
{"case":"later-ui-save","savedRuntimeRefs":[],"running":1}
```

| Artifact | SHA256 |
|---|---|
| `/tmp/huhu-t02-review-round2-freeze.stdout` | `b4fb2851949c434009d12b7b7b92661645971cbea4b8b4af16563a9ddb20b42d` |
| `/tmp/huhu-t02-review-round2-freeze-final.stdout` | `8b8912d9d22a7fe74ab67387714bc37491e725c5c1a916746b4f3b911d5e78a2` |
| `/tmp/huhu-t02-round2-tests.log` | `e73c9e5cd965c3600fb1146c2198a3da649e1d0ce43fb2015f59ec1b23d43325` |
| `/tmp/huhu-t02-round2-storage.stdout` | `45f83ca158934057833c25e4d6f609c06fa006926489cd377bf740c723ab3307` |
| `/tmp/huhu-t02-round2-layout.stdout` | `043b88dd442afa4c83f4f0e147ae65fce669ca25b2383bfc1a2d2b178c5560e3` |
| `/tmp/huhu-t02-storage-probe.mjs`（本轮重建） | `21dc145195823126ad31b600ab4d09fb74fd981a12e5d792f422c708d94867b8` |
| `/tmp/huhu-t02-layout-probe.mjs`（本轮重建） | `d50fe475e6cd45e263b13ef56cb7f8d9fb565c6481954b8b238bd4461301b864` |
| `/tmp/huhu-t02-layout-selection-probe-entry.ts` | `a74e6ea2d66042ac44a36c2cbbaf04694a113e88eae1bd78cd9768ce7741d8a3` |
| `/tmp/huhu-t02-layout-selection-probe.mjs` | `25f2c5ffc3cbc3ea40fc5b87fb90e28cb52d5065db1ec8699dbc37bedcc5f238` |
| `/tmp/huhu-t02-layout-selection-probe.stdout` | `1305864f0de5dde3a46560d8290e3efc5c056b586a651d67ad0c41e8b67eeb04` |
| `/tmp/huhu-t02-review-rebuild-selection-probe.mjs` | `46612a8d83c1b783768f7948cd3e4d7b7550fde0530ea98ee15d4bc8c12d89eb` |

未运行：真实Obsidian/native chooser交互、真实Provider、五平台E2E；按用户分工留待用户，未把隔离fixture说成产品实机通过。本reviewer没有重建main/styles或重复全库build/lint；未变UI/来源/前置实现按SHA一致复用首轮审查。Round1报告保持原字节，未覆盖。
