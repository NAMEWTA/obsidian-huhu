# 最终工作台与历史独立复核

Session: 20261029T021146Z
Task: 008-final-workbench
Status: completed

## 聚焦交接

已按 GP-045 / Map42 的新冻结输入逐项复核旧 WB 问题、修复生产代码和 Root 夹具／类型补正，标准轴与规范轴均为 request-changes。原跨账号库外准入、浏览器失败传播、回执身份、取消、筛选、截断、模态焦点和工具栏问题已有可回读修复，归档修复仍存在“补来源证据即被视为从未启动”的漏洞。旧 opaque key 的风险经当前 release helper 与实际 HistoryStore 消费者反例确认；报告要求来源一致性，不要求另建持久格式或修改 Spec。还确认历史模态层的窄窗命中区未达到已批准的 44px 合同；请 Lead 按下列同范围问题修复后重新冻结输入，保留本报告原文。

## 产物与验证

<a id="standards-output"></a>
Reviewer: codex:/root/review_workbench
Axis: standards
Result: request-changes
Input-SHA256: 69e01201a2aa5f8cf6d0435c41714811ccb45e6b9d8921a21c42e0fe6b4e8583
Observed: /home/wta/orca/workspaces/obsidian-huhu/terminal；NAMEWTA/terminal；HEAD 78102da2811953e72fe317cd08cd91311d9cac0d；base 33c21e098ef3188cbab5a09f3e0a01fadb787715；453 产品路径、20 来源，审查前后摘要均匹配。

### 身份、输入与覆盖

实际 reviewer 为原生 `/root/review_workbench`，gpt-6-astra/high，仍未参与任何产品实现、修复、整合或冲突解决。实际实现者包含旧 Codex／Claude 及其实现子 Agent、用户、当前 codex:/root、repair_native/workbench/data。没有递归派遣；只写本报告及 `/tmp/huhu-008-final-workbench/`。Status completed 仅指交回。

`review-input.json` 已完整解析并核验每个冻结路径／来源；磁盘字节 SHA256 为 `8483583f75a339eb13bc1a96e59b5eb023a4c6bf265013637b4d012b445da05d`，规范化 JSON 摘要为上方 Input-SHA256。20 来源含5个 Goal 显式合同锚点，用公共 `readArtifactSectionSync` 提取原文核验，不把 Goal 运行状态变化当作产品源漂移。详细记录 `/tmp/huhu-008-final-workbench/input-check.json`。

复用此前实际读取且未改变的 code-review Skill、source-discovery、Fowler/risk/reviewer-contracts/review-evidence 及项目 dev/ui 约束；回读新版 TASK、报告模板、修复报告、final-review、变更的架构参考和 Goal/Map 合同。以初始完整基线审查为基础，重新核对本次91个漂移路径中所分配范围的生产／测试变化，重点追踪完整 owner tuple → NativeHistory → Rust scan/query/read/cache、Space import/adopt → archive、Browser open →真实消费者清理、History commands → Router、HistoryStore → SessionRow、真实 AgentWorkspace → Toolbar/Dialog/AlertDialog。没有将旧123中断报告或实现者自述当作通过。

### WB-S03-R — medium：来源导入可以把旧未知运行变成“从未启动”并归档

**位置：** `src/modules/agent/services/workspace-service.ts:1507`、`:1516`；`src/modules/agent/services/spaces/space-service.ts:593`、`:1301`；真实上游 `src/modules/agent/services/launch/native-resume.ts:242`、`:300`。

修复将 `!record.lastAttempt && !!record.nativeImport` 等同于 neverStartedImport，并生成 notStarted/persisted=true。可是 nativeImport 并非“记录新建且从未运行”的证据：NativeResumeService.importSource 会匹配同 Provider／账号／native ID／规范 transcript 的现有 Session，经 adopt 给原记录补 nativeImport。旧记录没有 lastAttempt 时，补来源前归档会 incomplete，补来源后就得到 archived；期间没有查询或收束旧运行，来源绑定不能证明退出。

**反例：** `/tmp/huhu-008-final-workbench/router.test.ts` 中 `review008: importing provenance into a legacy unknown record does not prove not-started`，沿既有 legacy fixture 的真实持久化／reload 接缝建立缺 attempt 的 Agent 记录，再调用真实 NativeResumeService.importSource（created=false）→真实 WorkspaceService.archiveManaged。期望保留 incomplete，实际 archived。测试使用真实 SpaceService/WorkspaceService，只有宿主／进程接缝为 fixture；不声称制造了真实残留 Provider。

**依据：** 错误处理／生命周期不能把 unknown 变成已知成功；Spec AC-028、AC-029 与 NFR-006，implementation-contracts 的“归档先收束”和 Session/运行身份分离。原 S03 的新建 import 正例已修，但其保守 legacy 负例只覆盖未调用 import 的情况，故整体不能关闭。

**满足条件：** 明确区分新建 metadata-only import 与向既有记录补来源证据；后者不能消除原有运行未知。保持新建导入 Session／Space 可无 spawn 归档，补来源的 legacy 仍需真实终止依据。回归必须经过实际 NativeResumeService 的 adopt 路径，而不只断言直接 import 创建的新记录。

### WB-S06 — medium：同账号同 native ID 的不同来源会静默替换索引，预览／导出可混挂正文

**位置：** `native/pty-server/src/agent_data.rs:695`、`:1671`；`src/modules/agent/platform/history/service.ts:484`、`:498`、`:542`；`src/modules/agent/services/history-store.ts:79`、`:153`。

此结论不是仅从三元组 key 格式推断。实际链路为：native 用 Provider/account/native ID 作主键，save 对不同 transcript/sourceRef 执行 INSERT OR REPLACE；NativeHistory.read 接受带 sourceRef 的旧 row，却仅发送 row.key，返回时不比对来源。HistoryStore 把结果正文写回旧行，且刷新复用只比较 key、mtime 和 sourceStatus；当复制的记录保留 mtime 时，也会把 A 的缓存正文放到已变成 B sourceRef 的新行。export 同样用旧 session 的标题和 full.text 组合。

**真实 helper 反例：** `/tmp/huhu-008-final-workbench/history-source-switch.py` 在隔离 Vault 的同一账号来源目录，先创建／扫描 A，保留 A 后新增 B，二者同 native ID、不同 locator/正文、相同 mtime，cwd 都在 Vault。当前 release helper 第二次扫描后把相同 key 指向 B；使用之前选择的 A.key 读取，返回 B 的 sourceRef 和正文，日志末尾 `CONFIRMED old-A-key resolves B source/body`。helper SHA256 `91457600300ff89e7e9847b3e6ede9f2ec9578f54897059c0efcd91b4e70537e`，Linux/protocol3；本 reviewer 未重建，使用 Lead 最终 native-build 后的现有产物，并独立读了同一源码路径。

**实际消费者反例：** `/tmp/huhu-008-final-workbench/history-store.test.ts` 两个测试分别覆盖 source 改变但 mtime 相同的 refresh，以及 read 返回不同 sourceRef 的正文。当前两者均错误发布 ready，而非使旧缓存失效／报告来源变化。原生反例提供该返回值确实可由生产 helper 产生的证据，不是只靠任意 mock 制造不可能状态。最初实验删 A 后新增 B得到 missing而非正文，随后改为 A/B同时存在才确认上述场景；不把首个实验当作正文混挂证明。

**依据：** Spec §3.1 的必要 locator、§3.7 精确来源与来源变化可解释、AC-035/040；已批准 native reference/occupancy 代码本身也把 locator 作为区分成分。此场景不再是已修的“跨账号库外越权摄入”：两条均已获准进入当前 Vault；问题在读取／缓存关联错误和来源静默覆盖。

**满足条件：** 对选择→读取→缓存复用／导出保持完整来源一致性；来源不一致不能当作当前行的成功正文。对同 key 不同精确来源的索引碰撞给出保守、可解释的处理，保留标注与来源证据。可以保留旧 opaque key 及兼容格式；本报告不指定新持久 schema、迁移平台或架构。验证 A/B 并存、相同 mtime、旧行 read/export、刷新缓存和已有标注不被静默改属。

### 原始所有 WB 项逐项处置

| 原 finding | 本次结论 | 生产与测试依据 |
|---|---|---|
| WB-S01 high 跨账号库外准入 | 关闭该越权场景；S06为同账号来源关联的独立残留 | Controller.historyOwnerBinding、NativeHistory.resolveOwner/ownerMatcher、Rust owned_by_space 和 OpenCode owned_digest 已含账号/设备/locator/sourceRef；ownership/native-history 正负测试通过。本人更新完整tuple后重跑双账号 stdio，total=1，B read返回 session outside vault，见 history-cross-account.log。 |
| WB-S02 Browser open吞错 | 关闭 | module.ts edit返回实际操作 Promise，open/reuse等待并检查error/partial/unknown；Browser消费者catch清理新Page。shared-browser-close及browser/module真实消费者回归通过。 |
| WB-S03 metadata-only归档 | 保留为 WB-S03-R | 新建 import Session/Space正例与旧未导入记录负例通过；实际adopt legacy反例仍失败，见上。 |
| WB-S04 history target未更新 | 关闭 | router.ts:194 对history操作更新最终prepared.target，保留confirmed输入回执；正式import/resume/open三类测试通过。 |
| WB-S05 read取消被吞 | 关闭 | HistoryCommands read catch识别signal/AbortError/WAIT_CANCELLED，NativeHistory标准化取消；read期间signal及明确code回归通过，真正来源不可读仍保持metadata-only。 |
| WB-P01 时间／终端元数据缺项 | 关闭 | Panel增加day/week/month/all和opt-in terminalRows；Controller从Space记录投影普通终端，原生rows与Shell投影分离，不进入原生继续。Store/真实Panel时间、Space筛选、默认隐藏、无继续动作测试通过。 |
| WB-P02 正文partial不可见 | 关闭 | Store previewPartial传递并保留，Row显示前段限制且改用片段标题，CLI fit保留source-capacity；真实Store→Row及控制预览测试通过，受控Chrome截图可见中文限制。S06的来源缓存问题独立处理。 |
| WB-P03 模态与焦点回退 | 关闭该交互回退；命中区另列P04 | 窄窗history使用Dialog，继续使用AlertDialog；真实Page Tab/Escape/返回触发器及取消零启动测试通过，回读Lead v2实际截图/原生输入检查。 |
| WB-L01 low 工具栏关不掉 | 关闭 | 移除父级重复onOpenTool回写，真实Page+Toolbar第二次点击关闭与aria-pressed回归通过。 |

本轮无未关闭 low 项。未把第一次审查中邮箱数量／拖放继续的未确认线索升级为缺陷，也未要求与已批准行为无关的新工作。

### 本人执行及回读的验证

- 本人执行 `pnpm exec vitest run src/modules/agent/platform/history src/modules/agent/platform/desktop/server/native-history.test.ts src/modules/agent/services/control/history.test.ts src/modules/agent/services/control/router.test.ts src/modules/agent/services/control/commands.test.ts src/modules/agent/services/controller-resume.test.ts src/modules/agent/services/controller-space.test.ts src/modules/agent/services/history-store.test.ts src/modules/agent/services/workspace-service-stop.test.ts src/modules/agent/services/spaces src/modules/agent/shared-browser-close.test.ts src/modules/browser/module.test.ts src/modules/browser/ui/workbench-page.dom.test.tsx src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx src/modules/agent/ui/history src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx`：exit0，25文件229 tests通过；原输出 `/tmp/huhu-008-final-workbench/targeted.log`。
- 本人执行 `pnpm exec vitest run --config /tmp/huhu-008-final-workbench/vitest.config.ts --testNamePattern='review008:'`：工具exit126，最终2文件3条行为断言失败、22 skipped，未发生fixture/transform错误；`repro-final.log`。临时配置复用项目原setup，临时fixture未改生产／正式测试。
- 本人执行 `python3 /tmp/huhu-008-final-workbench/history-cross-account.py`、`python3 /tmp/huhu-008-final-workbench/history-source-switch.py`：最终均exit0；前者确认修复后的拒绝，后者确认来源切换反例。所有数据位于/tmp隔离目录，未接触真实账号或用户库。
- 独立回读 Root 的最终 checks/results.json 和日志：最终全量Vitest已结束exit0，512 passed/4 skipped，4873 tests passed/42 skipped；build/bundle/helper-smoke均exit0。此前失败原件仍保留，未冒称本 reviewer 运行这些全局检查。docs仅另一个change的6个锚点仍失败；不将其列为本产品问题。
- Root的完整 NativeSessionSummary 类型夹具与同目录native-history回归已回读；原scan/query/read/dedup/stale断言保留，完整身份替代旧二元组，不属于放松准入或删失败断言。
- 回读 final-ui/results.json 的panels-final/inbox-final exit0、实际v2截图与harness脚本；本人实际查看 `narrow-history-dark.png`、`narrow-history-confirm.png`。这类证据使用生产组件+fixture ports，非真实Obsidian/Provider。P04指出既有harness没有覆盖的历史命中区，不能用toolbar几何通过代替。

## 问题与下一步

<a id="specification-output"></a>
Reviewer: codex:/root/review_workbench
Axis: specification
Result: request-changes
Input-SHA256: 69e01201a2aa5f8cf6d0435c41714811ccb45e6b9d8921a21c42e0fe6b4e8583
Observed: 同一冻结工作副本；Spec/DESIGN/ADR/implementation-contracts、Map42及Goal五段合同摘要均匹配；WB-S03-R、WB-S06和WB-P04的具体行为仍不满足规范。

### 规范轴判断

独立对照规范：WB-S03-R 违反归档不能把未知运行伪称已收束（AC-028/029、NFR-006）；WB-S06 违反精确来源读取与来源变化准确呈现（Spec §3.1/3.7、AC-035/040）。这不是仅用标准轴结论替代规范轴；每项都有生产触发、实际反例及对应合同。原 P01/P02/P03 的具体功能缺口按上表关闭；新增窄窗命中区缺口如下。

### WB-P04 — medium：窄窗历史Dialog与继续确认的实际命中区仍小于44px

**位置：** `src/modules/agent/ui/AgentWorkspacePage.tsx:253`；`src/modules/agent/ui/history/SessionHistoryPanel.tsx:308`、`:326`及历史紧凑按钮；`src/modules/agent/styles/agent.css:26`；共享规则 `src/ui/styles/base.css:2`、`:22`、`:46`。

恢复的44px容器规则只覆盖workspace toolbar、pane header、group strip、tab close。新增的history Dialog/AlertDialog在portal，未获得这些规则；默认 `--nd-hit-size` 是32px，只有 pointer:coarse 才变44px。窄桌面窗口仍是fine pointer，这正属于DESIGN明确覆盖的场景。

这不是把视觉24px误当实际命中区：Lead最终受控Chrome `/tmp/huhu-t09-production-ui-final-v2-20261029/commands.json` 在480px窄窗记录继续按钮rect高24，其data-hit-control伪元素按生产base.css只扩到32；确认取消按钮rect高36且没有data-hit-control，也无额外44px扩展。本人已查看同目录 `narrow-history-dark.png` 和 `narrow-history-confirm.png`；harness脚本这里仅覆盖modal/focus/cancel，44px断言检查的是toolbar/pane，不包含历史内容与确认。

**依据：** DESIGN §5明确“窄屏至少44px”，并明确窄屏是桌面小窗口／布局适应，不等同于触摸设备；AC-061/NFR-005。**满足条件：** 历史抽屉及其确认层在窄窗口给真实交互命中区至少44px，包括portal中的控件，避免邻接命中区重叠；增加fine-pointer窄窗的生产组件几何／hit-test，保留现有Tab/Escape/取消零启动合同。可局部落实，不要求重画页面或改变全局设计。

### 修复与未验证边界

请 Lead 仅将上述三项交给实现者，在保持现有已修反例为绿的基础上补实际consumer测试；完成后重冻本范围、重新双轴复核。不得因当前全量测试绿色而关闭这三个未覆盖反例，也不能把本报告completed当作Ticket done。

未运行真实Obsidian、真实Provider、五平台E2E、真实原生审批及生产性能；依Spec §11交用户验收，不因这些明确分工单独判代码缺陷。本 reviewer未build、未运行共享全局检查、未写生产／正式Evidence／Git；输入前后无漂移。整体发行、跨领域检查与最终状态由007整体reviewer及Lead核验，本支持报告只对所分配工作台／历史／浏览器范围作两轴结论。
