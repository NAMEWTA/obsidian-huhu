# 任务回报

Session: 20261026T045732Z  
Task: 014-t08-helper-retirement-repair  
Status: completed

## 聚焦交接

F1 窄修候选完成，产品三路径已 SOURCE STOPPED。`retireSession` 现在把普通终态栅栏与 editor 实际关闭、未完成 operation、local frame callback+drain 在同一最终回收处会合；迟到 close 或迟到物理结算会重试同一 join，不再先抹普通栅栏后遗留 binding。固定真实 helper 下的原 inode 暂存/恢复反例已从目标红变绿，同一 helper 连续三轮不累积旧绑定；反向顺序和 operation/frame 保护也有实际回归。只交本 F1 候选，不自称独立审查或 T08 完成，Root 持有后续统一构建/业务组合与正式状态。

## 产物与验证

本轮证据根 `/tmp/huhu-t08-helper-repair-20261026T104137Z`（R）。所有原命令 `commands/<label>.receipt.json` 保存 argv/cwd/UTC/实际exit/完整raw和前后源SHA，旧红灯不覆盖。每条 receipt 显式记录 `HUHU_TEST_PTY_BINARY`、`HUHU_TEST_CONTROL_BINARY` 的值与实际 SHA，短独占 `HUHU_TEST_EDITOR_RUNTIME_DIR` 也记录；没有靠未落盘继承 env 证明 binary 选择。loader env 的 NODE_OPTIONS/LD_PRELOAD 均为 null。

当前 GP028/Map29，原 Ticket T08 in_progress；新 allocation SHA `67d681e94e1b0eea0fa7fb9329884cbedb790edd68c10071f97bd5ae9404a105`。修前实际输入 `/tmp/huhu-t08-root-review-repair-preflight-inputs.json` SHA `8cc4b042e38f9627d38fd8512912233c12cb74fa34c3197c1afc9990569dcbd9` 原样存 R/input.json。沿原 I/dev 预检、TDD/并发/错误/test-reliability约束，仅解锁本三路径；未修改 A/C/Root 产品、规范、旧 TASK/REPORT、原 probe、依赖、Cargo target 或 native bins。原独立审查报告 SHA `aad8e99dbe325e7db34cce854631e7221dcaf15e701ca49b147d8d8721396119` 与 Root 回收 SHA `10311ff753afdfa40aa99f69050f09e7e4aab5ead6611e8a57581420d2b265a1` 作为输入，不把旧 E1 exit0误作产品绿。

### 修复与完整 join

`helper.ts` 的改动只有生命周期会合：

1. `finishEditorClose` 返回是否确已满足 phase=closed、无该 binding 的 editorOperations、无 local frames；仍只在这些条件满足后解除 close timer/resolve close，timeout 本身不删状态。
2. `retireSession` 原 numeric exit、实际协商 reply-settled、confirmed termination 和 outputBytes=0 检查保持。普通条件齐后先检查上述 editor 条件，未齐就保留原 SID 的 termination/reply/output/userClosed/operation编号等状态；齐后才一并清旧路线和 editors 映射。
3. editor-closed、operation settled、local frame callback+drain 和 close 各个完成边，都在 `finishEditorClose` 成立时重试同一 `retireSession`。没有新协议、timer清空、重建 helper、重新绑定/重放。
4. 原 pre-enrollment failed-none且从无 editorId 的特例保持：仍须先通过普通最终栅栏，之后才本地拒绝 ready、完成 closed/close；不把一般 none 当 native cleanup，也不提前删已有ID/operation/frame的物理责任。

ordinary fence先到时不再丢掉迟到关闭所需的事实；editor关闭先到时仍保留普通 fence门。close() 自身仍表示 editor 物理IO收束，不被错误扩大成“等待整个运行结束”，因此手动撤 editor 能力后原运行仍由明确 stop 管理。

### 实际红绿及保护矩阵

| 命令 | 实际结果 | 证明与边界 |
| --- | --- | --- |
| 001-real-late-close-red | exit1 | **fixture错误**：初版把长 runtime 路径当 native 原件前缀；C runtime_root 仅接受短且0700的XDG根，fallback后断言失败。原始log/trace保留，不算F1行为红；finally恢复原inode、等helper退出。 |
| 002-real-late-close-target-red | exit1 | 当前生产PtyHelper+最终真实bin：ordinary confirmed termination/exit/reply-settled都到；sentinel保留时旧binding仍受保护，恢复原cap inode后真实editor-closed到且await close，editorBinding仍不消失。实际断言 `toBeUndefined` 红。该次只筛目标，2个未选原用例不计通过。 |
| 003-editor-join-matrix-red | exit1，7项中3红/4绿 | 未settled operation迟到结算后仍泄漏；callback/drain各自尚未齐时旧代码过早删除，共三个实际目标红；反向普通fence/output保护旧逻辑正例保留。 |
| 004-real-and-controlled-join-green | exit0，2文件10项全绿 | 真实late-close三轮、原failed-none、原auth/queued-cancel/unknown/liveness，以及7项受控IO矩阵，全部通过。 |
| 005-helper-host-regression | exit0，8文件105项全绿 | helper-editor、host-editor.integration、helper-control、helper-stream、host、host-control、host-control.integration、lazy-host。完整路径/双bin/SHA均在 receipt，无skip冒充绿。 |
| 006-scoped-types | exit0 | `node node_modules/typescript/bin/tsc --noEmit --skipLibCheck -p R/tsconfig.json`；三路径及其真实类型依赖，沿仓库既有 skipLibCheck。 |
| 007-helper-eslint | exit0，零警告 | 生产 helper.ts 定向 ESLint --max-warnings 0；没有全仓格式化或关规则。 |
| 008-actual-helper-build-inputs | exit0 | 仅本次tmp helper export bundle，真实 esbuild onLoad 8个输入/CAS/metafile/工具和bundleSHA；不是根插件build或重建C，也不冒称005的Vitest执行使用了此独立bundle。 |
| 009-final-audit | exit0，errors=[] | 核8条前序receipt、500前后源快照项、8实际build inputs；4份native trace、12真实PID均gone，R内无socket/隔离HOME残留，双bin摘要未变。009自身独立receipt另留，避免自引用。 |

真实回归在 `host-editor.integration.test.ts` 新增一例：隔离直接 Node entry 只在自己的 capability env 指定路径上，把原文件 rename到 `.original`，写自己的sentinel后自然exit0；没有读/记录cap正文或接触CLI token。等待公开 ordinary events齐全后确认sentinel与旧binding仍在，Cookie查询仍有响应；删除自己的sentinel、rename原inode回来并核ino相等，等待真实 binding.closed/close，随后要求 editorBinding(sid)消失。固定同helper连续SID1/2/3都退休，旧handle始终none/closed；不靠固定sleep、timeout抹状态或更换helper遮泄漏。finally即使红灯也恢复自己的原inode、await helper.dispose、清自己临时会话目录。

每次该测试的 `build/<label>/f1-late-close-*.json` 保存实际 bins、helper/root PIDs、普通终态/关闭事件顺序、原inode、前后公共streamStats及三轮retired列表。004和005各完整三轮；001/002的失败trace也保留。nativeRuntime短目录是R本身（mode0700），没有删全局/他人IPC目录。Root后续统一测试若自建该目录，须显式0700，否则native正确fallback；这不是产品回归。

`helper-editor.test.ts` 的新增受控外部stdio矩阵只测试Node层：

- editor关闭先到，numeric/reply/confirmed齐后仍有未ack输出则保留，ack后才删；public events/真实计数作门。
- ordinary+editor-closed齐，尚有operation时不删binding、不返operationBytes；实际editor-settled后才完成settled/close并回收。
- close frame 已被对端消费，但local callback和drain分开受控；无论callback先或drain先，另一边未齐都保留frame/binding/未完成close，齐后才删。这层fixture没有声称是真实native终止证据，真实bin例另证明普通fence与cap迟到清理。

原真实controlled-app组合仍证明错误auth角色隔离、真实queued取消零投递、dispatch timeout维持unknown直到迟到settled、另一SID输出ACK/Cookie/query-stop活性。原failed-none前置inode替换用例也保持绿。Pi扩展/SDK/gate与native源码均未变，按影响闭包复用原研究与应用证据，不重复官方Provider研究或对真实账号操作。

### 输入、差异与资源

R/meta.json 是本次真实三路径初始原像，CAS与 `three-path.diff` 是相对此前像，不用混合工作区HEAD差异冒充。`commands/*.before.json/after.json` 保存被测根/相对导入闭包、工程配置与本次harness；006的临时tsconfig也在执行前冻结，005后产品未再修改。005/006/007工具入口的实际 Node/Vitest/TypeScript/ESLint SHA已记录，不经Corepack包装；真实目标红为直接exit1。

`build/helper-export/input-manifest.json` 与 metafile捕获8份实际编译内容并完全匹配，相关tsconfig等配置在008.before中另保存；bundle SHA `b9d8e53d2542a80c9654362ebd9acba8af40cc82a96afc4b9520e4666d39110e`，metafile SHA `4856623b48ce1f0e22830e35a3514b69e37032a1c1e5afa57a06e9799eb148`。未把这一构建清单追补成005先前执行凭据；005有自己的真实源快照和工具记录。

固定只读 pair：`/tmp/huhu-t08-c-stage2-linux-20261026T080715Z/huhu-pty` SHA `f99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca`，同目录 `huhu` SHA `923ac2d6fbc4f472537c73236040a487b8d991e4226aec81d5ebda488e995eee`。每条receipt明确记录，审计再次核相等；无C/native build。

`final-audit.json` SHA `5ea59a73864d7ee2b938a5a2d78467a0957ff8f04887dccc2c63db6860b4ebd7`：500快照项哈希可回读、无超时；本轮已记录12个真实PID全部不存在，扫描未见HOME在R下的进程，R内socket为零。旧011 probe、旧006/012报告、旧bin/manifest和其他owner资源均未改写或清理。

| 唯一产品路径 | before SHA256 | after SHA256 |
| --- | --- | --- |
| `src/host/desktop/native/helper.ts` | `08e33ff99d94f6b7e41438ce297c536b0ec2a3fb861a9ea469d0a54d81a2edd8` | `2a2fb89d75dd1d7221b7d80c6fd2a439b6763e7784265709686442dc8dfd92b1` |
| `src/host/desktop/native/helper-editor.test.ts` | `cf0f59619b5e1c34a8369f9458d3fe1d3c0a7e464d7dd5c88c9a5afece842a50` | `01c0e01e20a7b766e414d88b102273a6ad3d3c31f386285f5f42fb57b84a4172` |
| `src/host/desktop/native/host-editor.integration.test.ts` | `d9c94777f1ae97a83f4a0ec4c0bc5fae46971036299030b1c4b6b97b58701ad5` | `014e64871d9d9814b3da52033ed841304bcf8658924e3337342918651c76d275` |

## 问题与下一步

本 F1 分配内无剩余实现或必需定向检查。根build/lint、A修复合并后的真实业务/native组合和后续独立审查由Root执行；真实Obsidian/Provider/五平台仍未验。原001 fixture红及002/003目标红均保留，不因候选绿而删除失败历史。返回结构检查在本REPORT原子写后实际执行，单独保存在本次commands/010-return-structure及delivery-receipt，不预填为本报告写前通过。

SOURCE STOPPED — 仅本014三产品路径解锁过，现再次全部停止；证据归档后等待Root，不自行恢复B15或开始其他修复。
