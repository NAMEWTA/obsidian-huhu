Session: 20261029T021146Z
Task: 003-final-data
Status: completed
Reviewer: codex:/root/review_data
Mode: native
Model: gpt-6-astra / high（本次派遣声明）
Input-SHA256: 39f060d78d5d3ff466dd833bd2925fff76c69b2adb011c3985c4f6dcc5bc0193
Observed: HEAD 78102da2811953e72fe317cd08cd91311d9cac0d；base 33c21e098ef3188cbab5a09f3e0a01fadb787715；working-tree / explicit-files。

# 独立最终数据审查

本报告的 completed 仅表示审查交回。**standards: request-changes；specification: request-changes。** 我是本次新派遣的独立 reviewer，未参与既往实现、合并或修复；未递归派遣。历史实现者按 TASK 为旧 Codex/Claude、其实现子 agent 及用户提交，不冒称已逐一核验其内部会话身份。真实派遣句柄由 Lead 的原生工具回执确认。

冻结对象是同目录 `review-input.json` 的完整 scope/sources/exclusions，非最后一次提交。已按 JSON.parse→JSON.stringify→SHA256 验证 Input-SHA256；结束前回读全部 447 产品路径（446 现存文件及 1 删除）与冻结的 9 来源，未发现内容漂移。报告与 Lead 的证据/票据修订位于产品差异之外。源文件没有被本 reviewer 修改。

## 1. standards

Reviewer: codex:/root/review_data
Axis: standards
Result: request-changes
Input-SHA256: 39f060d78d5d3ff466dd833bd2925fff76c69b2adb011c3985c4f6dcc5bc0193
Observed: 对数据服务、真实 owner、启动/消费者、包 codec、缓存接管与失败重试逐项追踪；8 个隔离反例实际通过，表示缺陷行为已重现，非产品验收通过。

### S-01 — high：导入设置绕过可携带字段白名单

- 位置：`src/modules/agent/core/backup/settings-codec.ts:107`、`:116`；调用方 `src/modules/agent/services/backup/plan.ts:268`；消费者 `src/modules/agent/core/terminal/settings.ts:157`、`:177`、`:234`。
- 触发：导入一个格式、entry digest、package digest 均有效，但 settings-agent payload 含 `customShellPath`、`shellArgs`、`overrides.codex.command/env` 或 `skillDirectories` 的包。包的摘要只证明一致性，不代表用户授权这些本机配置。
- 实际行为：`mergePortableAgentSettings` 将所有 incoming 顶层键直接覆盖；导出时的 `portableAgentSettings` 没有在导入边界重用。终端设置 normalize 又真实接纳这些字段。隔离测试经过 `buildPackage → serialize → inspectPackage → runImport` 后，读回目标设置的 custom shell、override env、库外 skillDirectories 均为包内容。
- 风险：普通业务恢复可替换目标机器的可执行入口、环境值和库外扫描授权；界面预检只显示设置合并，不是这些机器权限的逐项授权。
- 依据：dev 数据/设置 owner 边界；风险审查权限边界；implementation-contracts §6 白名单 codec、目标授权重新核对。
- 满足条件：导入边界也执行严格可携带字段 codec，递归校验已允许字段；机器字段保留目标原值。增加完整 public import 反例，不能仅测 exporter。
- `1f98811` 对照：此缺陷已存在；恢复 merge 回退文件不足以修复。

### S-02 — high：`manual → inherit` 绕过有效 YOLO 权限比较

- 位置：`src/modules/agent/core/backup/settings-codec.ts:134`；真实解释在 `src/modules/agent/core/launch/flags.ts:8`、`:34`。
- 触发：目标 globalPermissionMode=yolo、codex 显式 manual，且该 Provider 曾完成本机 YOLO 确认；正常导出的源包将 codex 设为 inherit。
- 实际行为：rank 只把字面 yolo 算提升，manual 和 inherit 同为 0，合并接受 inherit 且 `permissionRaisesSkipped=0`。真实 effectivePermission 随即取 global yolo；原确认记录保留，下一次启动无新确认。定向反例已验证合并结果。
- 风险：恢复在无提示情况下撤销用户当前的 Provider 手动权限限制。
- 依据：恢复不能无声提升权限，必须比较实际有效授权，而不只比较字面枚举。
- 满足条件：比较导入前后每个 Provider 的有效权限，覆盖 global 与 own 联合变化；manual→inherit→yolo 必须保持原限制并报告。
- `1f98811` 对照：旧候选有 effective-mode guard，当前 merge 回退删除了它。

### S-03 — high：只有有效 `.backup` 的集合会被成功导出遗漏

- 位置：`src/modules/agent/services/backup/export.ts:164`–`:168`；真实加载语义 `src/modules/agent/services/spaces/space-service.ts:189`、`:205`。
- 触发：workbench 主文件缺失，而 `.backup` 是完整有效的持久状态。既有 JsonStore/SpaceService 明确支持这种恢复来源。
- 实际行为：以真实 World/SpaceService 启动后，内存仍有 space-1；exportBackup 却因 primary read=null 记 section-absent 并继续成功，包完全没有该设备 workbench-records。其他采用相同 fallback 的集合也有同一读取结构。
- 风险：用户备份正在正常显示的 Space/Session/mailbox/layout 时获得不完整包；导入新环境后这些数据永久缺席。
- 依据：dev 不把缺失主文件解释成空有效数据；备份完整性/恢复合同。
- 满足条件：按真实 owner 的 primary/backup 选择与验证规则取得有效集合，或明确拒绝不可确认的集合；不能成功宣告该集合不存在。加入 backup-only 的真实 owner 往返测试。
- `1f98811` 对照：export.ts 无差异，此缺陷已存在。

### S-04 — high：跨设备恢复改写原生来源设备身份

- 位置：`src/modules/agent/services/backup/records.ts:94`；递归转换 `src/modules/agent/core/backup/transforms.ts:33`；消费者 `src/modules/agent/services/launch/native-resume.ts:234`。
- 触发：把源 dev-a 的已导入原生会话恢复为目标 dev-b 的业务记录。
- 实际行为：`rewriteDeviceId(next.sessions, ...)` 会递归把 `session.nativeImport.deviceId` 从 dev-a 改成 dev-b。隔离反例读回确认。该字段是 NativeReference 的来源组成部分，NativeResumeService 的精确匹配确实比较它；不是可随展示设备改变的 owner 字段。
- 风险：丢失原始来源 provenance；目标恰有同 provider/account/native-id/sourceRef 时，原本不同设备的来源会被当作同一会话，影响去重/定位/继续。至少能确定完整来源 tuple 已被破坏，不声称本次运行了真实 Provider 错误恢复。
- 依据：完整来源引用与 owner 身份分开；来源设备保留为 provenance。
- 满足条件：仅重绑定业务 owner/device 字段，完整 nativeImport/source tuple 原样保存；以相同账号/会话 ID 不同来源设备的测试验证不误合并。
- `1f98811` 对照：records.ts 无差异，此缺陷已存在。

### S-05 — high：自动化已接纳的定义保存未进入恢复排空

- 位置：`src/modules/automations/core/service.ts:163`、`:170`、`:272`。
- 触发：用户 save 已通过 requireExecution，正在 await `options.definitions.save(next)`；备份或导入随即 preflight/quiesce/drain。
- 实际行为：定义保存不计入 launches、ownedActions、transitions 或 writes；recoveryBusy 返回空，drainWrites 已成功。通过 deferred barrier 让真实 AutomationService 的 definitions.save 暂停，确认 drain 返回时该写入尚未完成；释放 barrier 后定义保存发生，随后的 commit 才因 recoveryHold 拒绝，调用得到 `automation-recovery-busy`。
- 风险：已报告共同静止的 owner 仍可写 Markdown 定义；快照遗漏已接纳操作，恢复可和迟到保存交错；同一个 save 部分落盘却报告失败。
- 依据：RecoveryOwner.drain 的“every already admitted write”公开合同；所有 owner 先排空再共同快照。
- 满足条件：记录并排空整个 save/remove/source 更新操作，或在 preflight 将未收束操作列 BUSY；不能只排 runtime JSON commit。用 barrier 验证保存/删除与 snapshot/adopt 的排序和失败回执。
- `1f98811` 对照：相关 save、drain、busy 逻辑相同；旧候选的 publishing 修复没有覆盖此问题。

### S-06 — medium：恢复进度直接信任已不存在的目标文件

- 位置：`src/modules/agent/services/backup/import.ts:127`、`:156`、`:186`。
- 触发：中断导入留下 progress，某已完成步骤的文件随后被用户删除、同步删除或进度从另一目标设备带入；重试相同包和选项。
- 实际行为：仅匹配 packageDigest/options 就信任 steps；不读回 written 的路径和摘要，optionsKey 也不包含目标设备。对应路径被 skip，或对应 batch 被直接 done。隔离反例设置 core-0/history 的进度但移除所有文件，runImport 返回 `unchanged` 和 done，目标历史仍不存在。
- 风险：缺失业务数据被报作完整恢复；不能由后续查询发现后自动修复。
- 依据：失败重试必须以可验证持久事实为依据，不能把进度 marker 当实际数据。
- 满足条件：绑定目标身份、核验步骤路径/文件/摘要，明确保留用户改动与缺失状态；缺失整步不能报已恢复。覆盖用户删除、设备变更及伪造/损坏 progress。
- `1f98811` 对照：旧候选 `loadProgress` 有目标设备及路径存在性处理；当前 merge 回退删除了它。

### S-07 — high：外部 writer 新增集合不被导出的“双读”检测

- 位置：`src/modules/agent/services/backup/export.ts:159`、`:179`；离线 owner 假设在 `src/modules/agent/services/backup/owners.ts:13`。
- 触发：其他设备/实例在 discoverDevices 完成后新增一个设备集合，或在第一次缺失检查/定义枚举后新增文件。
- 实际行为：第二轮只重读 collected 中已有文件，不重验目录/缺失路径。用 storage.onRead 在首个 history 读取时模拟外部 writer 创建 `.huhu/terminal-agent/new-device/history.json`，导出仍成功，source.devices 和 entries 完全没有新集合。注册的 RecoveryHost owner 仅覆盖本进程，不能关闭这个 writer。
- 风险：成功包不是承诺的共同快照，集合增加被静默遗漏；双读现有文件不等于外部 writer 排除。
- 依据：外部源摘要漂移/无法冻结 owner 必须拒绝，不能把跨进程一致性当作进程内锁已解决。
- 满足条件：外部 owner 存在或无法取得一致快照时明确 BUSY；至少将设备/文件清单和缺失路径纳入快照漂移核验，新增/删除都可检测。测试必须使用实际枚举路径，而非手工注册一个永远 BUSY 的假 owner。
- `1f98811` 对照：export.ts/owners.ts 此逻辑已存在。

### S-08 — high：settings 恢复 hold 在内存 mutation 之后才拒绝

- 位置：`src/shared/settings/store.ts:135`–`:140`、`:165`–`:168`；`src/shared/settings/settings-recovery.ts:23`。
- 触发：恢复 owner 已调用 holdSettings 后，UI、监听回调或其他模块通过已有 handle.update 修改设置。
- 实际行为：先运行 recipe、赋 namespace.value、notify，然后 schedule 才检查 held。隔离反例中 update Promise 拒绝 `held`，但读取 agent 设置已是新 fontSize=30。
- 风险：已关闭的 owner 仍改变真实设置和观察者，失败回执与内存事实冲突；随后 adopt 可能丢掉已显示更改，其他 namespace 或下一次保存也可能带入这些拒绝操作。另 `drainSettings` 跨 await 暂时恢复 held=false，扩大同一门禁风险。
- 依据：quiesce 必须覆盖内存 mutation 和晚到回调；settings-recovery 自身注释承诺 mutation 前拒绝。
- 满足条件：handle mutation/touch 的入口先检查 admission；提供保持 hold 的内部 drain，不在异步 flush 期间重新开放新操作。覆盖 held update、listener 更新及 drain 中新增 update。
- `1f98811` 对照：store.ts/settings-recovery.ts 无差异，此缺陷已存在。

### S-09 — medium：备份夹具回退破坏真实 codec 往返验收

- 位置：`test/agent-backup/fixtures.ts:222`。
- 触发：执行现有 backup roundtrip/failure 定向套件。
- 实际行为：手写 `definitionDocument` 缺生产 definition 所需 channels、notifyOn、graceMinutes、时间和 body section，真实 checkAutomationDocument 返回 section-invalid。12 文件选择集实际为 130 passed / 19 failed；失败落在 backup roundtrip 与其被 failure.test 导入的测试，不能把它们记为当前候选通过。
- 风险：备份关键正常/失败路径被夹具错误挡住，历史 pass 不适用于当前代码。
- 依据：test-reliability 要求有效夹具/真实消费者，不以历史绿色替代当前运行。
- 满足条件：由生产 automationDocuments.encode 创建有效原件，再运行对应完整往返/失败测试；不删除真实 codec 校验来放行伪数据。
- `1f98811` 对照：旧候选已用真实 encode；当前 merge 改回手写文档。

Low findings：无独立 low 项；未把命名/风格偏好作阻塞。

## 2. specification

Reviewer: codex:/root/review_data
Axis: specification
Result: request-changes
Input-SHA256: 39f060d78d5d3ff466dd833bd2925fff76c69b2adb011c3985c4f6dcc5bc0193
Observed: 按 Spec §3.8、implementation-contracts §4.1/§5/§6、T-14–16 和 T-18 AC matrix 对照真实行为；历史 AC passed-code 不能覆盖本报告反例。

本轴独立判断下列合同未满足；事实复现和修复满足条件与标准轴同号项一致，未将标准结论直接当作规范通过。

| Finding | Severity | 位置 | 未满足的外部合同、触发与满足条件 |
|---|---|---|---|
| P-01（S-01） | high | `src/modules/agent/core/backup/settings-codec.ts:116` | §6 设置白名单/机器授权隔离；完整包导入可改 shell/env/库外扫描字段。导入也须白名单并保留目标机器配置。 |
| P-02（S-02） | high | `src/modules/agent/core/backup/settings-codec.ts:134` | §6 权限意图不等于有效授权；manual→inherit 会跟随目标 global yolo。须比较实际有效权限并报告跳过提升。 |
| P-03（S-03） | high | `src/modules/agent/services/backup/export.ts:166` | AC-050、§3.8 完整业务包；backup-only 的真实有效 Space 被遗漏。须按真实 owner 有效来源读取或拒绝。 |
| P-04（S-04） | high | `src/modules/agent/services/backup/records.ts:94` | §3.1 Native reference、§3.7/AC-040 完整来源去重、§6 源 device provenance；恢复改了 nativeImport.deviceId。业务 owner 重绑定须保留来源 tuple。 |
| P-05（S-05） | high | `src/modules/automations/core/service.ts:170` | §6 strict drain、已接纳操作完成/准确失败；定义 save 未收束就快照，冻结后仍落盘。须纳入全操作 admission/drain。 |
| P-06（S-06） | medium | `src/modules/agent/services/backup/import.ts:127` | AC-051 可恢复重试、§6 目标映射和同摘要幂等；缺失文件只凭 marker 被宣告完成。须核验目标和步骤实际事实。 |
| P-07（S-07） | high | `src/modules/agent/services/backup/export.ts:179` | §6 外部 writer/源漂移拒绝、AC-050 完整性；导出时新增设备集合被漏掉仍成功。须真实拒绝外部活动/变化并核验清单。 |
| P-08（S-08） | high | `src/shared/settings/store.ts:135` | §6 quiesce 覆盖内存 mutation；失败操作已改变并通知设置。须在 mutation 前关门且排空期间保持关门。 |

### P-09 — medium：恢复门禁与排空没有约定的有界取消路径

- 位置：`src/shared/storage/recovery-transaction.ts:214`、`:223`；公开 `RecoveryRunOptions` 在 `src/shared/storage/recovery-contracts.ts` 没有 signal/deadline；`src/modules/agent/services/backup/actions.ts` 也未提供取消途径。
- 触发：某 owner drain 的底层持久写入长期不 settle（例如同步/虚拟 adapter 卡住）。代码直接 await owner Promise，没有 deadline、取消或 late-completion fencing。此前已 quiesce 的 settings/Space/automation owner 一直关闭；finally/release 只能等待其 settle。
- 依据：implementation-contracts §6 明确“冻结与排空有界，超时/失败撤销门禁并保留有效旧数据”，NFR-001 要求有限容量/可取消等待。本项是完整调用链静态确认，未伪称运行了真实卡死 adapter/宿主。
- 满足条件：在尚未提交阶段增加有界 drain/取消和准确结果，收束或隔离迟到 writer 后安全撤销门禁；不能单用 Promise.race 超时后任由旧 writer 写新数据。加入不会自行 resolve 的 owner 与迟到完成反例。
- `1f98811` 对照：该 shared transaction 文件相同，此缺口仍存在。

规范轴 Low：无。S-09 是当前验收证据失效问题，未另制造一条重复产品规范缺陷。

## 3. 实际覆盖、来源发现与限制

### 冻结与来源

- `review-input.json` 是本报告 review-input 锚点所引用的原始完整对象；其 scope 包含实际 tracked diff argv、工作副本字节/权限/删除、index 与 inventory 摘要，不在报告中复制 447 条造成第二份权威。
- 查阅 base→HEAD log：78102da、1f98811、6016789、2073711；没有 Issue/PR 引用，本 change 没有 `source.md`，记 not-found；不远程搜索可变正文。
- found：根 AGENTS；dev/ui Skill；dev 架构/测试参考；Spec、DESIGN、implementation-contracts、ADR、Goal Plan、tickets-map；T-14、T-15、T-16 Evidence 和 T-18 AC matrix。显式规范充分，无 skipped 轴。
- found：package.json、vitest.config.ts、tsconfig/ESLint 配置入口；未发现独立 CONTRIBUTING/CODING_STANDARDS/嵌套 AGENTS。未恢复 CLAUDE.md。适用标准以仓库 Skill 为先，Fowler 作为启发式，未制造纯格式噪声。
- 已加载 common code-review 及 source-discovery、fowler-smells、risk-review、reviewer-contracts、working-tree-review、review-evidence、error-handling、test-reliability。没有创建 Change/Ticket，没有执行实现或发布。

### 人工阅读/追踪的生产范围

- `src/modules/agent/core/backup/{format,model,paths,settings-codec,transforms}.ts` 和 `services/backup/{actions,entry,export,import,owners,plan,records}.ts`；完整包格式、导入写入计划、设备映射、settings 权限与预检。
- `services/migrations/{entry,desktop-startup,agent-owners,legacy-workbench}.ts`、legacy layout 接缝、SpaceService 的持久加载/排空/接管路径、WorkspaceStore owner；主/备文件、两槽 journal、回滚/前滚与启动顺序。
- `src/app/recovery.ts`、`recovery-start.ts`、`src/shared/storage/recovery-{contracts,transaction}.ts`、settings store/recovery、JsonStore、vault-layout、privateVaultStorage 入口；package 路径只作声明、路径清洗与桌面 private storage 的防逃逸委托。
- automations api/module/runtime、core service/actions/documents；notifications core service/api；Agent dispatch/prompt-port/prompt-runner/agent-runtime/quick-command、Home shortcut-run、shared dispatch identity；确认显式 Space、取消选择和旧 invocation receipt 接缝，没有在已读消费者发现额外需单列缺陷。
- 为来源身份/权限结论追到 native-resume、desktop native-reference、launch flags/defaults/settings；为用户可达性追到 Agent module/settings BackupSection/actions。
- backup/migration/recovery/automation tests、fixture/World 和 docs/data.md、docs/agent-workbench.md 相关恢复说明。未逐行阅读其余 447 路径；本报告不替代其他 reviewer 的终端协议、屏幕、历史读取安全及整体 UI 审查。

### 命令与结果

1. `git rev-parse HEAD`、base→HEAD `git log`、定向 `git diff 33c21e0 -- ...` 与 `git diff 1f98811 -- ...`、rg/cat/sed/nl：只读；成功命令退出 0。少数探索性不存在路径的 rg/cat 退出 1/2，随后找到实际 native-reference/settings 文件，不将探索 miss 当产品 failure。
2. Node SHA256 核验：规范化 Input-SHA256 精确匹配；446 个现存产品文件和删除路径、9 个 frozen sources 无 drift；HEAD 精确匹配。结束复验退出 0。
3. `pnpm exec vitest run --config /tmp/huhu-003-final-data/targeted.config.mjs`：选择 12 文件，**130 passed / 19 failed**，原始日志 `/tmp/huhu-003-final-data/targeted.log`。工具完成回执的 shell exit_code 为 **126**，日志有完整 Vitest 失败总结；如实记录，不将其写作正常 exit 1 或 pass。包含 backup、migration、recovery、automation backup/invocations、prompt-port、Home shortcut-run；不是全量测试。
4. `pnpm exec vitest run --config /tmp/huhu-003-final-data/vitest.config.mjs`：最终 **8/8 counterexample tests passed，exit 0**；源码 `/tmp/huhu-003-final-data/probes.test.ts`，日志 `/tmp/huhu-003-final-data/probes.log`。前期探针曾因 World API 名写错和无效 notify fixture 失败/超时，已更正隔离探针；这些初始化错误未计为产品证据。最终反例使用真实包、服务和 owner 接缝，在 /tmp 配置缓存，未改生产文件。
5. 未运行 build、全量 Vitest、全局 lint/架构检查或真实库/Provider。未创建真实终端、外部账号或通知。主产物一致性与全局检查由 Lead 负责。

### 实机与完成边界

依 Spec §11，真实 Obsidian、真实 Codex/Claude、原生审批、真实双 Vault 往返、Windows/macOS/Linux 五平台及移动端宿主仍由用户验收；本报告没有将自动化接缝写成这些场景通过。T-18 ticket/Evidence 状态冲突由 Lead 处置，不据 TASK 的“全部 done”推导整体完成。当前标准轴/规范轴均未通过，需修复并用新冻结候选交给未参与修复的 reviewer 复审；恢复 39 个 merge 回退文件只能覆盖本报告部分项目。
