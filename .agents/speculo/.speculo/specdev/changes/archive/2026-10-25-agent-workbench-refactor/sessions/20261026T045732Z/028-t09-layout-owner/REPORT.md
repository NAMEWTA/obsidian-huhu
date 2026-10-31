# T09 A 布局 owner 候选交付

Session: 20261026T045732Z
Task: 028-t09-layout-owner
Status: completed

## 聚焦交接

已在原 SpaceWorkspaceStore/WorkspaceService 实现稳定 Pane 身份、零写读取、同 owner 编辑保存及六操作领域端口，没有新增持久 owner 或绕 records.layouts 保存。兼容身份只在描述投影中派生，首次有意义的 GUI/CLI 编辑先物化保留叶；焦点成功以原 ForegroundIntent 实际 consumed 为准，并保留确认后的事实。公开签名维持 Root 接收的018检查点，后续修复限于原代重核、损坏源诊断和焦点异常收束。A14 已于 2026-10-26T17:46:39.635409Z **SOURCE STOPPED**；completed 只交回本分配候选，整票构建、B/U组合、独立双轴及正式状态归 Root。

## 产物与验证

### 冻结输入、范围和增量

工作区 `/home/wta/orca/workspaces/obsidian-huhu/terminal`，HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`、branch `NAMEWTA/terminal`。按 TASK、Packet、allocation 和已批准 Spec/DESIGN 实施；复用012/013/018已核研究，不重新泛搜或复制外部实现。沿用户指定 gpt-6.1-sol/xhigh，未递归派遣、提交、改 index、安装依赖、运行根 build、编译 Rust 或触碰用户资料。

全部本次原件在 `/tmp/huhu-t09-layout-owner-20261026T160431Z`。`initial-inputs.json` 是实际2153输入基线，保留原快照出处；不以 HEAD 差异归因本票。`a14-before.json`、`a14-after.json`、`a14.patch` 为精确前后字节和mode，后者 SHA256 `f77c7d5c87ac4bc9400a4802eb790664d6b7637ee78a2e0ac689f33b82e83757`；`source-stopped.json` 记录停源时刻。14范围11变化（4新文件、7修改），其余3路径原字节未动。

| 路径 | before SHA256 / mode | stopped SHA256 / mode | 事实 |
| --- | --- | --- | --- |
| src/modules/agent/core/workspace/model.ts | a01440053e123ef09a85beb767732e5f3822b0084e25d0b1dfbd7a087757618a / 0o600 | c9b3b96f8847b8dd349ed6aabcfeb71e3226f653ec78d857d2c712a8d9698390 / 0o600 | 变化 |
| src/modules/agent/core/workspace/ops.ts | d7e191afac0e92a9374cf7fabc1e841a7995f4277071430749f028f34f3ac037 / 0o600 | b9542c02b602d88622b02b504e6a8688930c9a2b4869ef6983758481ecd31a31 / 0o600 | 变化 |
| src/modules/agent/core/workspace/ops.test.ts | b479e0ebfd2624ed467e1bc9ff0730e2c49519bad3a0f77001ec65b3edf931e0 / 0o600 | 6ef6dbb463d7386767d9009eafcf6701876b34122f81ddbfc76989f6437a0aed / 0o600 | 变化 |
| src/modules/agent/core/workspace/pane-identity.ts | 缺失 / — | 474c970c5e8a8506c7ef226920921ab84f7d1c3ccc07ddec3dd8c0d184a7fef6 / 0o664 | 变化 |
| src/modules/agent/core/workspace/pane-identity.test.ts | 缺失 / — | 063bcb0b53b58f2e2b8ff4ff00fa9155f7eaa72f5bd6fd77e6e56be7b7555787 / 0o664 | 变化 |
| src/modules/agent/services/workspace-store.ts | ea30593109d884895bd0dc63fef4a257ee1b72059862a6947a833e5cc66fc307 / 0o600 | 5530cf719ad7a74a7b10084535ed40eb522a48f7568b734cde8d16b54635c921 / 0o600 | 变化 |
| src/modules/agent/services/workspace-store-spaces.test.ts | fd027b5386fe38f01cd03269c6498c96412f0d54c8049e814c5f1c76ac0cce8b / 0o600 | 4cfea1ee2a58216cb3ca17530e052ac3a685622e0ae8e41f1ad3c2dfcad8837c / 0o600 | 变化 |
| src/modules/agent/services/workspace-service.ts | 4ac850819ab7454891471d625960e6fd600946a512c0973567d6cf5d95885070 / 0o600 | d300219eaa45a1214a33256b059cbaefea39b19c8c6e37f20fc95ecc89c93917 / 0o600 | 变化 |
| src/modules/agent/services/workspace-service-panes.ts | 缺失 / — | 44b9d099b6ad403f7f83509ebebe7f1ad252566420ff58e30fb8d21a696b6310 / 0o664 | 变化 |
| src/modules/agent/services/workspace-service-panes.test.ts | 缺失 / — | 0b6189502edc11524cddd82eaeaf7ea4b0c4384574462c708d495722d9277061 / 0o664 | 变化 |
| src/modules/agent/services/workspace-service-spaces.test.ts | 0c628f4082ae59019ce7fb225a87ea01df9bf0fa536e0bd6d44c380c08884aca / 0o600 | 0c628f4082ae59019ce7fb225a87ea01df9bf0fa536e0bd6d44c380c08884aca / 0o600 | 未变 |
| src/modules/agent/services/workspace-service-foreground.dom.test.tsx | 6516e43356ff4ea51d31fcc9e5d88df0a86dc5cde9fb7946e1e47d98d0a31e48 / 0o600 | 223e8ab3a5a26b7749d17230d7495a63e4925d857c402d30748ed5a12b70ea64 / 0o600 | 变化 |
| src/modules/agent/services/workspace-service-control.test.ts | 34bcd534ba00b53c79d959080622dd32ea85440ef613c8635972d739f87842b0 / 0o600 | 34bcd534ba00b53c79d959080622dd32ea85440ef613c8635972d739f87842b0 / 0o600 | 未变 |
| src/modules/agent/services/workspace-service.test.ts | 2d622a5ecdb1c62ac6bf61688b0e68d2f7f3c8202b5c45f3b22fa8c26593b665 / 0o600 | 2d622a5ecdb1c62ac6bf61688b0e68d2f7f3c8202b5c45f3b22fa8c26593b665 / 0o600 | 未变 |

`final-inputs.json` 对初始全集的观测显示 A11变化、B/U/Root已分配34变化、分配外产品变化0；A14停源校验 drift=[]。GP033/Map34→GP034/Map35及 Root-only vitest.config.ts 是 Root 已通知的行政/测试入口增量；原 TASK/allocation 未覆盖修改。全库是逐文件读取观测，B/U/Root合法并发不称原子全库冻结。每条命令仍保留实际前后摘要，最终032/033/034/036/037/038所观察清单无命令内漂移。Root后续生成 main/styles 不归A。

### 实际合同与选择

- `ResumeInfo.paneId?: string`；新显示在准入 mutation 分配 `pn1.UUID`。旧活动叶的 `lp1.` 来自完整 canonical UTF8 JSON `[kind, owningSpaceId, persistedTabId, persistedLeafKey]` 的无padding base64url；3069B完整编码4096字符，3070B拒绝，不截断或折叠。ID保留 opaque/Unicode，拒C0/DEL、空值、不成对surrogate和UTF8>4096B。normalize保留非法显式值诊断，不把它变成“缺字段”。损坏raw.panes/sessionIds不抛TypeError；合成叶无伪兼容ID。已知显式ID连同 duplicate-leaf/capacity 事实保留，避免全局扫描漏见。全局重复不靠Space hint任选；任何容量不足拒绝唯一性结论（Space1000、每图200Tab、树2048节点/深度16、全局4096Pane）。
- 原owner新增可选 `readLayout(spaceId?)` / 同步 `readLayoutNow(spaceId?)`，返回 `{spaceId,view,baseline,revision,cached,dirty,pending,conflict?}`；缓存优先实际dirty草稿，未缓存纯规范化/描述，不扩draftMap、不取writer、不选Space、不写盘、不mint。raw base与投影view不混淆，外部修改返回快照不污染owner。旧v1 store缺端口则Pane能力明确unavailable。
- `editLayout(spaceId, transform, {signal?,deadline?,validate?})` 在同Space队列等待原pending，最新草稿重核后一次接纳；只save该Space，保留dirty、冲突及在途后更晚GUI编辑。采用原owner增端口，拒绝直接records.layouts/updateLayout旁路，原因是旁路不能看到真实dirty/base/pending并会与原merge竞争。GUI布局/恢复/同显示runtime替换也先物化原兼容ID；query不污染clean基线。无意义transform不为ID本身写盘。
- 所有新操作deadline为原 `performance.now()` 绝对时钟，排队不重置；原T08 epoch焦点门保持，只在新Pane呈现门一次桥接remaining，受原1000ms与总deadline共同约束。逻辑观察可有限结束，已接纳/已在OS中的保存继续由原owner结算，不声称取消任意物理调用。
- 结果 `{effect,layoutPublished,persisted,revision,error?}`：准入前none；发布未写partial；写在途或不能证明未改unknown；确认save并采用completed；已确认写而rebase/呈现失败partial+persisted。save确认点在随后rebase之前记录，异常不抹去持久事实。
- `workspace.panes` 实导出 `capture(PaneTarget)`、`captureSession(PaneSessionTarget)` 和单次 `captureFocus(...).execute(context)/dispose()`；捕获同步冻结原Space/Pane/Session/runtime，不在异步预检后跟随新代。`PaneCommandError.code/reason` 可映射领域错误，结果error不能把已知effects重置none。保留的stopped Session遇较新pending runtime准确STALE_RUNTIME，新的原始pending目标则CAPABILITY_UNAVAILABLE。
- 六操作 `list(spaceId?,context?)`、`attach(session,context?)`、`split(source,inserted,direction,context?)`、`resize(target,ratio,context?)`、`close(target,context?)`、`focus(target,context?)` 走真实原WorkspaceService/owner。list给revision供B分页；attach同Session幂等且不spawn，stopped仅恢复引用；split显式第三C、同Space/四叶且保持原焦点；resize最近父split中目标份额，second取1-ratio，非法0.15–0.85外值拒绝；close仅detach不stop；reopen每叶新ID，显式runtime替换同显示保留ID。没有新增同Session多显示owner或跨Tab Pane搬移。
- focus选择布局与终端输入焦点分开：原View经 presentManagedFocus→commitFocus→consumed才completed/focused；仅committed无renderer为partial。取消、blur、外document、换View和晚到Space.select不抢焦点；原owner收束晚到选择，保留自动focus屏障。consumed同步发生后，abort或外订阅抛错不能降级已确认completed；cancel订阅抛错也结算布局事实、释放原intent且无未处理拒绝。T08显式target不因Pane focus被改写。

### 回归与真实失败保留

最终停源后037：**8文件115/115，exit0，0 skip**；包括原workspace/service/control/foreground风险与新增身份/owner/六操作。033生产types、034及停源038测试types均exit0；036自身6生产源ESLint `--max-warnings 0`，exit0、零warning。032已有相同115绿；其后仅删除三处无必要 `owner!`，精确差异在 `post-032-lint-only.patch`。037/038已消费最终停源源，无需把旧通过冒作最终输入。没有代替Root重复全局架构/Promise/预算/build/native/Chrome。

关键原件：001→002原store缺read端口红绿；003→004原normalizer丢ID红绿；005→006原owner缺edit端口红绿；007→008完整tuple目标红绿；015→016真实reopen复活旧ID红绿；019→020 consumed后同步abort/throw回执降级红绿；024→025 retained Session原代目标红绿；030→031 raw损坏树已知ID丢失与cancel订阅未处理拒绝两红两绿。011涵盖四effects、真实dirty owner/取消迟到/确认save后rebase失败；018和021涵盖单调排队期限、原1000ms、有限观察和晚到Space选择；026涵盖cold无writer/无Map扩张、stopped不spawn、跨Space/同Session/四叶、全局重复和显式runtime替换。

失败不会被命名掩盖：014测试可选端口变量未缩窄而exit2，修显式守卫后types绿；017原fixture仍阻塞已移除的SpaceService.updateLayout旁路导致1timeout/40pass，改为真实storage.write的selectedSpace B barrier后01841pass，原风险断言保留。022及名称含green的023均exit1，失败是原fixture未带真实admission marker，**不算产品目标红或绿**；修为真实prepareSession→reserveManaged后，024在tmp专用Vite入口重放018冻结helper原字节，确证CAPABILITY而预期STALE的目标红，025当前实源4绿。`024-replay-input.json`与专用config记录替换的确切旧字节；不把该历史重放称最终生产当前源。029 lint实际4errors/5warnings，035剩3个non-null assertion lint错误，均保留，036修正后零警告；未关闭规则或加ignore。

所有测试/类型/lint/归档runner命令如下；每个 `commands/<编号>/receipt.json` 包含exact argv/cwd/UTC/exit/raw SHA和环境，`raw.log`保留完整文本，before/after含原字节CAS。读取/编辑用宿主工具完成，不伪列runner次数。

| 命令目录 | exit | 实际runner摘要 |
| --- | --- | --- |
| 001-original-store-read-red | 1 | Tests  1 failed | 8 skipped (9) |
| 002-store-read-green | 0 | Tests  9 passed (9) |
| 003-normalize-id-red | 1 | Tests  1 failed | 17 skipped (18) |
| 004-normalize-id-green | 0 | Tests  18 passed (18) |
| 005-original-owner-edit-red | 1 | Tests  1 failed | 9 skipped (10) |
| 006-owner-edit-green | 0 | Tests  10 passed (10) |
| 007-identity-tuple-red | 1 | Tests  1 failed (1) |
| 008-identity-tuple-green | 0 | Tests  1 passed (1) |
| 009-identity-boundaries | 0 | Tests  24 passed (24) |
| 010-owner-materialization | 0 | Tests  55 passed (55) |
| 011-owner-effects | 0 | Tests  14 passed (14) |
| 012-raw-identity-boundary | 0 | Tests  7 passed (7) |
| 013-owner-and-service-baseline | 0 | Tests  40 passed (40) |
| 014-working-types | 2 | 见 raw 原文 |
| 015-service-pane-initial | 1 | Tests  1 failed | 2 passed (3) |
| 016-reopen-green | 0 | Tests  24 passed (24) |
| 017-mono-and-real-focus | 1 | Tests  1 failed | 40 passed (41) |
| 018-focus-clock-checkpoint | 0 | Tests  41 passed (41) |
| 019-consumed-first-receipt-red | 1 | Tests  2 failed | 23 skipped (25) |
| 020-consumed-first-receipt-green | 0 | Tests  2 passed | 23 skipped (25) |
| 021-focus-window-late-owner | 0 | Tests  28 passed (28) |
| 022-retained-session-generation-red | 1 | Tests  1 failed | 3 skipped (4) |
| 023-retained-session-generation-green | 1 | Tests  1 failed | 3 passed (4) |
| 024-original-helper-retained-generation-red | 1 | Tests  1 failed | 3 skipped (4) |
| 025-current-retained-generation-green | 0 | Tests  4 passed (4) |
| 026-runtime-scope-and-cold-owner | 0 | Tests  24 passed (24) |
| 027-types-production | 0 | 零输出 |
| 028-types-tests | 0 | 零输出 |
| 029-a-production-lint | 1 | 见 raw 原文 |
| 030-raw-capacity-and-cancel-observer-red | 1 | Tests  2 failed | 35 skipped (37) |
| 031-raw-capacity-and-cancel-observer-green | 0 | Tests  2 passed | 35 skipped (37) |
| 032-final-a-regressions | 0 | Tests  115 passed (115) |
| 033-final-production-types | 0 | 零输出 |
| 034-final-test-types | 0 | 零输出 |
| 035-final-a-production-lint | 1 | 见 raw 原文 |
| 036-a-production-lint-green | 0 | 零输出 |
| 037-stopped-a-regressions | 0 | Tests  115 passed (115) |
| 038-stopped-test-types | 0 | 零输出 |
| 039-archive-and-owned-cleanup | 0 | 见 raw 原文 |

### 观察闭包和资源

绝对 Node `/home/wta/.volta/tools/image/node/26.11.1/bin/node`；Vitest正常import根config和原项目/alias/setup，只增tmp cache与只读load观察，实际生产类照常装配。除显式024旧源反证外，不切片重组源码或替换关键owner。受控边界为内存TextStorage、目录/lease与NativeHost外部transport；真实SpaceService/SpaceWorkspaceStore/WorkspaceService/TerminalSessions及DOM ForegroundIntent均执行。该A测试没有启动真实Rust/helper/终端进程，B/Root另有CLI/native组合，不能混作本组自验。

`compile-input-index.json` 共6109个实际观察path+SHA变体；037实际给Vite编译的仓库源89个，033标准tsc read观察2475个、0383554个，036ESLint4909个。每条命令有compile-loads和去重index，读取时保存返回原字节并验证CAS SHA，不在结束后拿新源补证。`tool-inputs.json`保存Node/runner/version/config/lock与本次观察器原件。范围是实际repo transform与同步readFileSync观察，**不声称捕获所有transitive工具执行、异步FS、Node内建或OS库字节**；初始全量基线、命令前后快照与实际消费闭包分别索引。

HOME/USERPROFILE/TMPDIR在本root内隔离，移除NODE_OPTIONS/NODE_PATH/XDG_RUNTIME_DIR；180s外层预算均未触发。039实际归档/清理exit0：A14 drift=[]、分配外产品变化0；本次runtime-home、runtime-tmp、vite-cache三个自有根已清除，清理前路径/mode/文件SHA在 `cleanup-final.json`，38已记录runner PID均absent。原Map/内存fixture各自finally dispose；DOM叶、intent/目标监听和计时器由原owner/测试finally释放，实际异常路径也覆盖。未删除旧tmp、共享未知目录、用户Vault/账号或并行分支资源；对象CAS与日志为Root保留。

REPORT以同目录临时文件、无覆盖原子落盘并回读后才执行return checker；实际结果另存编号命令原件。return只认证交接结构，不认证整票产品验收，本文不预填尚未执行的结果。

## 问题与下一步

本分配候选没有已知未完成修复；A14继续 **SOURCE STOPPED**。Root可基于上述最终SHA与B/U停源候选统一生成main/styles、跑全局门及完整57路径独立双轴，正式状态与回退决定均由Root维护。真实Obsidian、Provider、OS IME和五平台未运行，按原合同由用户验收；旧v1 writer迁移、同Session多显示和跨Tab Pane搬移不在本票授权内。
