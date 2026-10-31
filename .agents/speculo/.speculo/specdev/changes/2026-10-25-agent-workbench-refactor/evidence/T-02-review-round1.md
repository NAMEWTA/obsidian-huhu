# T-02 independent review, round 1

Workspace: `/home/wta/orca/workspaces/obsidian-huhu/terminal`
Base/HEAD: `33c21e098ef3188cbab5a09f3e0a01fadb787715`
Input: `.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/evidence/T-02-review-input.md`
Implementers: codex:/root/prepare_t02, codex:/root/implement_t01, codex:/root

Reviewer 未参与本次实现或修复；仅读取仓库、执行隔离验证、写入 `/tmp` 报告/探针。没有修改源码、预算、生成物或正式状态。复用 T-01 round 2 的独立审查仅限摘要一致的前置实现；本轮完整审查 T-02 新增和共享文件的当前差异。

<a id="standards"></a>
## Standards

Reviewer: codex:/root/review_t01
Axis: standards
Result: request-changes
Input-SHA256: 227ffc61fba2b7b6ec52c68dcaca698ee253f86ea92d2fb09ce55e4ab3996931
Observed: 44 个 scope 文件的实际字节、长度和 after.sha256 均吻合；未跟踪源码/测试已读取实际内容，未仅依赖 git diff。28 个标准/规范/指令来源及显式锚点摘要吻合，31 个排除的 T-01 文件同时吻合当前字节和 T-01 v2 快照。按冻结 argv 执行 tracked_diff_command，diff SHA256 为 479b59d43529fd3be2e40d4a74a70d7cf6a5ce3de6c22526dae1a3c23ca7d5ca。实际复跑 8 文件 44 测试通过，但独立生产代码探针复现以下三项正确性缺陷。

### S01 [P1] 在恢复/合并写入之前核对当前磁盘版本和作用域

位置：`src/modules/agent/services/spaces/space-service.ts:115–125`，尤其 `new JsonStore(..., isWorkbenchRecords)`、`disk.load` 和位于 `commit` 之后的 `assertScope`。

可达前提：只读 `ready` 已读到合法本地 v2；在第一次业务编辑取得 writer 前，另一实例（已关闭并释放 writer）或外部同步替换了同一路径。也覆盖本实例已初始化 disk 后被外部文件工具替换。没有声称两个遵守协议的 writer 可以同时持锁。

独立探针观察：

- 将 primary 换成 `{"version":3,"preserve":"future"}` 并保留合法 v2 backup，随后 `create` 成功，把 primary 改成 v2。原 future 字节保存进 `.corrupt`，因此不是“全无恢复副本”，但确实静默降级覆盖了新版本主文件。初次只读 `load()` 的版本门没有覆盖 writer 内再次读取。
- 将 primary 换成 schema 有效、`vaultId: 'foreign'` 的 v2：首次编辑在 `disk.load` 后报 `SCOPE_MISMATCH`，原件未变；同实例第二次显式编辑仍报该错，却已经写入新 Space。原因是失败后 disk 被缓存，下一次跳过首次 scope 检查，而 `commit` 先合并写入再检查返回值。
- 若 disk 已成功初始化，换入同样 foreign v2 后第一次编辑即先写后报 `SCOPE_MISMATCH`。探针直接测试 vaultId 分支；deviceId/physicalRoot 同由该写后门处理，但不把未单独运行的变体标成实测。

影响：未知格式原件成为旧格式主文件；属于另一作用域的有效 envelope 被混入当前操作，且 UI 的“现有数据已保留”不符合实际。普通 listener/物理目录 permit 不足以验证文件内容的业务身份。

最小修复：在同一 writer permit 下，让 primary/backup 的每次进入恢复、合并和写入路径的读取先完成版本分类与 vault/device/physicalRoot 检查；不支持版本和错 scope 必须在任何恢复写入、backup 写入或 primary 写入前拒绝。不能只把这些内容交给返回 false 的通用 schema validator，否则仍会被当作可恢复损坏。初始化成功且 scope 有效后才采用 disk，失败的候选不得成为下一次 commit 的基线。

验证：在首次 ready→首次 writer、已初始化 disk→下一次 edit 两个窗口置换 future schema/foreign scope；包含合法 backup、首次拒绝后再次显式编辑；断言 primary/backup/recovery 文件零写入、返回明确错误、关联启动为零。

标准依据：dev 第 6 条按领域/设备/身份隔离；architecture 持久化与数据 owner；`docs/data.md:92` 的未知版本保留原件/停止写入；code-review error-handling 的“捕获异常不撤销已发生修改”、失败后保证须核对。属于数据完整性违规，不是风格建议。

### S02 [P2] 首次 writer 读取失败后不要永久缓存不可提交的 JsonStore

位置：`src/modules/agent/services/spaces/space-service.ts:115–118`。

可达前提：只读 ready 成功；第一次编辑在 owner 内 `disk.load()` 的一次 `storage.read` 遇到暂时 EIO。随后存储恢复，用户在同一界面显式再次保存。

实际：第一次报 `PERSISTENCE_FAILED:commit-failed`，cause 为 `temporary EIO`；第二次 cause 为 `Reload failed store before saving: .huhu/terminal-agent/d/workbench-v2.json`。共享 JsonStore 把 loadFailed 设为 true，SpaceService 已经缓存此实例，之后每次跳过 load，无法靠明确的 create/rename 重试恢复。此例没有首次成功写入/效果未知问题，不要求自动重放。

影响：普通瞬时读取失败将本实例全部业务编辑永久锁死，虽然 `canWrite` 仍为 true、表单允许重试；只能销毁模块重新创建。现有成功覆盖的是已初始化后的写失败，不覆盖首次 writer load 失败。

最小修复：使用局部候选，load 和 scope 检查均成功后再赋给 this.disk；或在后续明确操作中重新加载已失败的实例，并保持版本/scope 门、owner 与关闭约束。不要自动重放业务编辑。

验证：ready 成功后只让首次 writer read 失败一次；恢复 storage 后显式再次 create/rename，应成功 verified commit，flush 可成功；首次失败应无 launch，owner 丢失仍不可恢复。

标准依据：现有 JsonStore 的调用合同（loadFailed 后必须 reload），error-handling 中弃用无效实例/由 owner 验证恢复前置条件，以及持久化失败应准确呈现并保留可操作状态。

### S03 [P2] 后台 Space 追加标签必须在队列内读取最新布局

位置：`src/modules/agent/services/workspace-service.ts:129–132`；配合 `src/modules/agent/services/spaces/space-service.ts:208–210`。

可达前提：A 中明确启动两个终端，两者均已提交各自稳定 Session 后等待 native/Provider；用户切到 B，两次启动相近完成。现有集成测试只覆盖一个等待中的启动。

实际生产 WorkspaceService + SpaceService + JsonStore + workspace bridge 探针：2 个 runtime 返回、2 个持久 Session 存在，A 仅保存第二个 tab；再选 A 仍仅显示第二个 tab。两个 attach 在队列外都对同一旧布局执行 openTab，saveLayout 把捕获的全量快照排队；第二次执行以第一写完成后的 records 作 base，却用不含第一 tab 的旧捕获值替换，所以三方合并也无法保住第一 tab。

影响：启动成功的会话仍在运行，但其刚建立的展示/布局引用被静默丢掉。不是要求 T-03/T-09 的完整后台运行 UI，而是本票已实现创建与 Space 切换接缝的数据丢失。

最小修复：把后台 append-tab 作为 SpaceService 单写队列内的布局变换，在执行时基于最新 `records.layouts[spaceId]` 追加；不要在调用方提前算全量替换快照。保持稳定 Space 归属且不抢 B 的焦点。

验证：两个已接纳启动等待期间切 B，然后一起完成；确认 A 的两个 tab/Session 引用均保存，重选 A 两者都在，B 布局不变。探针采用假 launch/runtime 端口以控制时序，没有伪称实际 PTY 运行。

标准依据：业务状态单 owner/串行更新和现有布局记录完整性；错误不是格式问题或未来功能缺席，而是当前生产可达丢更新。

其他已核对事实：Node/FS/chooser 依赖留在 desktop ports；模块内选择器惰性注入；当前显式 ID、取消、目录 grant、末次 beforeSpawn 和 dispose 全资源清理的接线存在。根 build/lint/样式/包体日志的保存副本 SHA 均与检查清单一致；本 reviewer 没有重建生成物。包体阈值有实际新增服务/UI 归因，main 6075071B、styles 1421356B、Agent 激活 1013408B 按最小 KiB 调整，启动闭包 123387B/阈值 123904 保持；未发现用新依赖或复制 helper 掩盖增长。此观察不抵消上述缺陷。

<a id="specification"></a>
## Specification

Reviewer: codex:/root/review_t01
Axis: specification
Result: request-changes
Input-SHA256: 227ffc61fba2b7b6ec52c68dcaca698ee253f86ea92d2fb09ce55e4ab3996931
Observed: 使用与 standards 相同的 44 文件固定输入；完整 Spec/implementation-contracts/DESIGN/approval 和 T-02 purpose、scope、implementation-route、acceptance、verification-plan、constraints、risks 锚点均与冻结摘要一致。按 T-02 主责任 AC-001/003/053/061 和已声明本地贡献判断，未要求 T-07/10/14/15 的未来组合实现；当前三个生产反例使本票的数据保护、显式恢复与布局保存保证不成立。

### C01 [P1] 未知版本/错作用域拒绝必须发生在磁盘副作用之前

位置同 S01：`space-service.ts:115–125`。独立规范判断：Ticket implementation-route 要求物理/逻辑绑定核验、保留冲突双方；implementation-contracts §3 的 `SCOPE_MISMATCH` 是“无跨域副作用”，Spec §3.9 的版本化自有业务数据必须保留可恢复旧版本且旧 writer 不写新格式。T-02 已新增未知版本拒绝和作用域检查，检查遗漏不属于 T-15 旧数据迁移的延期范围。

S01 探针的 future→v2 成功写回、foreign 第一次/再次编辑先写后报错，直接反驳本地拒绝/保留保证。要求当前 writer 内每次恢复/合并前核对 schema 和完整 scope，失败零文件变更；采用 S01 的反例作为回归。不会因存在 `.corrupt` 副本就将静默降级判为符合。

### C02 [P2] 普通持久层故障后的显式重试在首次 writer load 分支无效

位置同 S02：`space-service.ts:115–118`。Ticket 目标/验收中的失败不启动与保存保证，结合当前交付的错误后可操作表单和恢复语义，应在短暂只读故障消失后允许明确再次保存；handoff-a 第 13 项明确声称可恢复错误不永久卡死、create/rename 可重试。此声明不能由“已初始化后 ENOSPC 可重试”的单一路径代替首次 owner load 的验证。

S02 实测第二次仍报缓存实例的 loadFailed，而不是重新检验恢复后的存储；不要求无限自动重试或重放效果未知操作。采用局部成功初始化后发布/显式重新加载，并按 S02 的一次 EIO→显式再次编辑用例验证。

### C03 [P2] 已冻结 Space 的并发启动完成会覆盖同 Space 的布局引用

位置同 S03：`workspace-service.ts:129–132`、`space-service.ts:208–210`。Ticket 的 Space/持久 Session/按 Space 分开的布局及实际 WorkspaceService 接线贡献，Spec AC-002 的布局归属独立、本票“先保存身份再启动”的可追踪接缝，不允许返回两个成功启动却仅保存一个创建标签。这里没有要求未来 CLI 或完整 detach 功能；只要求本票已有 GUI 创建异步完成路径保留自己创建的两项记录引用。

S03 实测在 B 选中期间，A 的两个稳定 Session 保留但一个 tab 被第二次全量布局替换删除。应把 append 变换放进业务队列后基于最新布局执行，回归同时完成与切回 A 的实际 store 结果。

局部 UI 合同已核对：SpaceNavigation/SpaceForm/SpacePicker/SpaceEmptyState 生产组件被 Sidebar/WorkspaceLayout/Omnibox 和 controller/module 接通；名称/目录相同仍使用稳定 ID，缺目标/歧义/取消路径明确。DOM 测试与隔离 Chrome 证据覆盖创建/重命名、IME、取消、键盘、失败、空/无 Space、主题/尺寸；本 reviewer 实际查看 1200 暗色英文正常页和 480 暗色中文表单截图，读了七种状态的 results.json（无水平 overflow；32px/粗指针44px）。这些不是 Obsidian 截图或真实 Provider/五平台验收，不声称它们通过。没有发现冻结 DESIGN 或规范来源漂移。

<a id="verification"></a>
## Actual verification and artifacts

1. `pnpm exec vitest run src/modules/agent/services/spaces/space-service.test.ts src/modules/agent/services/spaces/records.test.ts src/modules/agent/services/workspace-service-spaces.test.ts src/modules/agent/platform/desktop/spaces/directories.test.ts src/modules/agent/platform/desktop/spaces/ports.test.ts src/modules/agent/platform/desktop/spaces/writer-owner.test.ts src/modules/agent/platform/desktop/spaces/writer-process.test.ts src/modules/agent/ui/create/SpaceForm.dom.test.tsx`：实际 exit 0，8 文件/44 测试通过，0 skip。原输出 `/tmp/huhu-t02-review-tests.log`，SHA256 `92f42ae10124027e335a89f02bf801d0d0706693cdc37e5b07e0772ddd616ef5`。其中真实 OS listener/独立 Node 子进程/临时目录测试在本机运行；不是五平台证明。
2. 在仓库 cwd 将两个 `/tmp` entry 经 esbuild stdin/resolveDir=current repo 打包成当前生产源码，再运行 `node /tmp/huhu-t02-storage-probe.mjs` 与 `node /tmp/huhu-t02-layout-probe.mjs`，二者实际 exit 0；这是完整收集反例输出的 observational probe，**exit 0 不代表合同通过**。持久层输出包含 `schema-changed-after-ready: succeeded`、暂时 EIO 后第二次 `Reload failed store before saving`、foreign scope 在后续编辑/暖实例第一次编辑 `primaryChanged:true`。布局输出是两个 runtime/两个 savedSessions、一个 savedTabs，切回后一个 visibleTabs 且 running=2。stdout 文件逐字节保留，未用推断替代结果。
3. 为便于修复后重跑，`node /tmp/huhu-t02-review-rebuild-probes.mjs`（仓库 cwd）实际 exit 0，打印 `Built both probe entries against current production source`。它只往 `/tmp` 打包，使用当前仓库 esbuild，不将旧预打包产物冒充新源码。初次版本从 `/tmp` 直接 import esbuild 解析失败（工具 exit126）；已改为 createRequire(current cwd/package.json) 后成功，没有改仓库依赖。
4. `node /tmp/huhu-t02-review-freeze-check.mjs` 最终实际 exit 0；原输出 `/tmp/huhu-t02-review-freeze-check.stdout`，SHA256 `e0c99e1300ba17836d9744c5b742e5011c3ebe1f382741ecb0b1e663fd6f0875`。44 文件、28 来源、31 复用文件、diff 与 Root 日志副本检查全部吻合。脚本初版把 tracked_diff_command 数组误作 shell string，随后已修正为 execFileSync argv；发现新的 scope 外 T-03 工件后回读并明确纳入已检查排除项，不忽略代码漂移。

Probe artifact SHA256:

| Path | SHA256 |
|---|---|
| `/tmp/huhu-t02-storage-probe-entry.ts` | `5f9b09d874689ca9c3e08ffc68b2b568aa3d4af98ab56241b80658f062614772` |
| `/tmp/huhu-t02-storage-probe.mjs` | `749c4714b00132eb515bbe211a986c731807fa3b6983b8099f52d972fe08641b` |
| `/tmp/huhu-t02-storage-probe.stdout` | `feee6575d441f48eada5e7116d02400098c55198b925210f1fc406d47e819560` |
| `/tmp/huhu-t02-layout-probe-entry.ts` | `157f00d7aa7211002592ebdef2141cd29fc63ab75df7f0e810f610fd7a0a03b8` |
| `/tmp/huhu-t02-layout-probe.mjs` | `81ea89fbdd4ccb60812b53eff24a3eb2cc252f9f0e06480c1b0aa1e79a1ee29d` |
| `/tmp/huhu-t02-layout-probe.stdout` | `ebdf34dc592500eb153efd69ec2feb4fc20ba3c4f1ba3223da567396e2f43aa1` |

冻结 scope digest 为 `7444fa0397b3bae299f75abbb5dc56c0b80cb87190f0c59292ebeafc058bfa35`。最后 resolveReviewScope 的原始 digest 为 `21fa53d6c82d99d1e831697f301398cfc03b717534a8a9723a62df9d9145b623`，差异仅是 scope 外新增 `evidence/T-02-reused-t01.json`、`evidence/T-02-review-input.md`、`evidence/T-03-dispatch-preflight.md` 引起 excluded_paths/inventory/input_sha256 变化。按官方 explicit-files comparable 规则，所有被选 scope 元数据完全相同；不是来源/代码漂移。T-03 文件是未解锁的只读派单说明，不是本票实现。

未运行：真实 Obsidian/native chooser 交互、真实 Provider 登录/运行、五平台 E2E；按用户和 Ticket 交由用户，不作为本次额外阻塞。本 reviewer 未重复全库 build/lint/架构/docs 或改生成物；复用 Root/worker 保存证据，docs 仍有另一个 change 的既有六处坏锚点，未说成全仓通过。
