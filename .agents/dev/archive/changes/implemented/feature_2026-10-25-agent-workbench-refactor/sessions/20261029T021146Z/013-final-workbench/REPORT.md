# 最终工作台、历史与浏览器复核

Session: 20261029T021146Z
Task: 013-final-workbench
Status: completed

## 聚焦交接

本范围标准轴和规范轴均为 pass，008/007的三项残留已由生产代码、本人重新执行的反例和受控Chrome原始证据关闭。新建导入的未启动证明与adopt来源证据分离；来源选择贯穿native read、TS接收、缓存和导出，索引碰撞明确隔离且保留原来源；窄窗历史及其portal已满足44px命中合同。本人未参与实现或修复，旧报告保持原样，不以010实现者自评代替复核。下一步由整体reviewer和Lead结合其余范围及实际门禁形成整体验收；本报告completed仅表示支持审查交回，不修改Ticket／Goal状态，也不声称真实宿主或Provider验收通过。

## 产物与验证

<a id="standards-output"></a>
Reviewer: codex:/root/review_workbench
Axis: standards
Result: pass
Input-SHA256: ad85880384c79e07d781e6b18ac4fa97a9585bce88009432d825b4f295c476e7
Observed: current /home/wta/orca/workspaces/obsidian-huhu/terminal；NAMEWTA/terminal；HEAD 78102da2811953e72fe317cd08cd91311d9cac0d；base 33c21e098ef3188cbab5a09f3e0a01fadb787715；456路径及20来源审查前后均匹配，无产品或规范漂移。

### 审查身份、输入及范围

实际 reviewer 为原生 `/root/review_workbench`，gpt-6-astra/high，未参与被审范围任何实现、修复、整合或冲突解决，未递归派遣。实现者仍包括旧Codex/Claude及其实现子Agent、用户、当前codex:/root和repair_native/workbench/data。只写本报告及 `/tmp/huhu-013-final-workbench/`；未改生产、正式Evidence、Git或根产物。

完整解析本轮review-input并逐项比对：磁盘原始SHA256为 `a48568260a67626ef6fabe2250740e34bc93f12d940152a120575c1707886683`；规范化JSON摘要为上方Input-SHA256。456项包含455个当前文件和1个删除路径，内容／存在性均吻合。20来源含Goal五个明确合同锚点，通过公共 `readArtifactSectionSync` 提取原文校验。记录见 `/tmp/huhu-013-final-workbench/input-check.json` 与 `final-input-check.json`。

实际继续使用公共code-review Skill、source-discovery、Fowler baseline、risk-review、reviewer-contracts、review-evidence，以及项目dev/ui适用规则；复用此前实际读过且字节未变的规范和有效证据。完整读取013 TASK、010实际修复报告及当前生产实现；比较008至本轮的36个变化路径，重点审查所分配的Space/记录codec/归档恢复、native历史碰撞/expectedSource、NativeHistory/HistoryStore/CLI preview/export、工作台历史portal及其CSS与harness。保持002完整基线审查和008闭合证据，不把旧123中断报告视作通过。app恢复和CLI等其他领域的整体结论由对应reviewer负责，本报告仅对分配的工作台／历史／浏览器范围作结论。

### 三项残留的独立关闭依据

**G-S03 / WB-S03-R：关闭。** `services/spaces/records.ts:19` 的 `neverStarted?: true` 是单独证明，`isNeverStartedImport` 同时要求无lastAttempt；codec拒绝证明与已有attempt矛盾。`space-service.ts:593` 的adopt分支仅补来源，`:621`只在真正新建Session时写证明；`:789`在首次启动接纳与lastAttempt同次持久写入中清除证明。`workspace-service.ts:695`、`:1508`和SpaceService归档提交都使用同一判断，旧未知记录不会因import获得“已停止／可继续”。本人沿008的真实NativeResumeService.importSource(adopt created=false)→SpaceService→WorkspaceService反例重跑，现为incomplete；正式回归另覆盖reload后的unconfirmed、禁止prepare、fresh-import证明重启保留和首次接纳后不能复活。保留新建metadata-only Session／Space零spawn归档正例。

**G-S04 / WB-S06：关闭。** `platform/history/source-identity.ts` 比较key、Provider、accountKey、native ID、transcriptPath、sourceRef；`NativeHistory.read`在首个await前冻结选择，发送含当前deviceId的expectedSource，并对返回DTO重新比较。`native/pty-server/src/agent_data.rs:438`在正文读取前拒绝expectedSource不符；`:710`的save_in_scan保留已索引原summary/locator，冲突清正文并最终标changed/identity-collision，不靠扫描顺序选另一来源。`HistoryStore`对同key同mtime但不同来源不复用缓存，保留旧来源／标注并明确changed；read、CLI preview及export拒绝错来源正文，导出不落错误内容。没有修改opaque key或标注持久格式。

本人在当前release helper上重新执行008的真实stdio场景：A/B同账号同native ID、不同locator、同mtime并存；结果保留A、changed、正文为空；错误expectedSource明确拒绝；移除B后扫描恢复A正文。该回路exit0，日志见 `history-source-switch.log`。helper SHA256 `58e22cd75bf65784a902b33bc3cefe0d421c9f345487cd13c76f3c162b9129a1`，Linux/protocol3；本人不构建，使用Lead已重建的候选产物并独立核对源码。TS两条旧反例也转绿：缓存来源变化期望改为修复所采用的、更保守的unavailable＋保留A来源＋清空正文，而非要求原先建议的idle；未放宽“不能ready/串正文”的核心断言。正式测试同时覆盖选择对象在await期间变化、错来源导出零文件写入、原生正文访问前拒绝、重复扫描持续冲突及移除副本恢复。

**G-P05 / WB-P04：关闭。** AgentWorkspace依据自身容器宽度小于600传narrow给历史；Panel将该状态显式传到历史、筛选菜单、行菜单及AlertDialog portal。`styles/agent.css:39`起的局部规则把真实布局最小宽高设为44px，匹配已有Tailwind min-width优先级，非只扩大伪元素；宽屏不带narrow属性。本人回读生产组件接线、CSS、DOM测试、Root新harness实现及四份原始hit-targets JSON，并实际查看本候选历史/确认截图。几何及命中详见规范轴；不以实现者的CSS minima自评代替浏览器结果。

### 原始WB问题逐项保持关闭

| 原问题 | 当前结论与复核依据 |
|---|---|
| WB-S01 跨账号库外摄入 | 关闭。完整账号／设备／sourceRef／transcript准入、owner matcher、owned摘要未回退；ownership和native-history本轮运行通过，008的当前tuple双账号拒绝证据仍适用。 |
| WB-S02 浏览器open吞错 | 关闭。等待布局提交及结构化error/partial/unknown传播未变；本轮shared-browser-close和Browser真实消费者清理测试通过。 |
| WB-S03 未启动import不能归档 | 关闭。fresh专属证明允许正常归档，S03-R的adopt绕过也已关闭；没有把旧无证据记录默认当已退出。 |
| WB-S04 history最终target | 关闭。Router针对history重新读取最终prepared.target且保留confirmed输入回执保护；正式import/resume/open回归本轮通过。 |
| WB-S05 正文取消被吞 | 关闭。signal/AbortError/WAIT_CANCELLED分类保留；新增来源校验没有覆盖取消语义，控制历史及native取消回归通过。 |
| WB-P01 时间／普通终端元数据 | 关闭。day/week/month/all及opt-in独立terminalRows保留，真实Panel默认隐藏、Space/时间筛选、无继续动作回归通过。 |
| WB-P02 partial不可见 | 关闭。previewPartial、片段标题及CLI source-capacity保持，Store/Row/CLI回归和本候选Chrome可见说明一致。 |
| WB-P03 历史模态与确认焦点 | 关闭。Dialog/AlertDialog、默认取消、Tab/Escape/返回焦点、取消零启动保持；DOM与受控Chrome原始结果支持。 |
| WB-L01 工具栏无法关闭 | 关闭。父组件重复open回写已移除；本轮真实Page+Toolbar切换回归通过。 |
| WB-S06 同key来源混挂 | 关闭。上文来源身份、索引碰撞、真实helper和消费者反例共同证明。 |
| WB-P04 窄fine-pointer命中不足 | 关闭。上文四种portal接线及下文实际浏览器几何／命中证明。 |

本范围无新增或未关闭的medium/high问题，也无待处置low项。未把早前未确认的邮箱计数／拖放线索升级成无证据缺陷。

### 本人验证与Lead验证的区分

1. 本人执行：

```sh
pnpm exec vitest run src/modules/agent/platform/history src/modules/agent/platform/desktop/server/native-history.test.ts src/modules/agent/services/history-store.test.ts src/modules/agent/services/control/history.test.ts src/modules/agent/services/control/router.test.ts src/modules/agent/services/spaces src/modules/agent/services/workspace-service-stop.test.ts src/modules/agent/services/workspace-service-stop-native.test.ts src/modules/agent/services/launch/native-resume.test.ts src/modules/agent/services/controller-resume.test.ts src/modules/agent/ui/history src/modules/agent/ui/AgentWorkspacePage.dom.test.tsx src/modules/agent/ui/workspace/WorkspaceToolbar.dom.test.tsx src/modules/agent/shared-browser-close.test.ts src/modules/browser/module.test.ts
```

exit0，24文件243 tests通过；`/tmp/huhu-013-final-workbench/targeted.log`。

2. 本人执行 `pnpm exec vitest run --config /tmp/huhu-013-final-workbench/vitest.config.ts --testNamePattern='review008:'`：exit0，2文件3条旧反例通过、22个未选择测试skipped；`old-repros.log`。临时fixture只在/tmp，复用项目真实setup与服务。
3. 本人执行 `python3 /tmp/huhu-013-final-workbench/history-source-switch.py`：exit0，碰撞隔离、expectedSource拒绝、移除重复来源恢复三阶段通过；无真实用户库／账号／Provider。
4. 本人前后逐字节校验456产品路径与20来源，HEAD未变，0漂移；未build、未跑全量Vitest／共享Cargo或全局门禁。
5. 等待Lead全量真实结束后回读 `evidence/final-checks/vitest-candidate3.log` 和results记录：exit0，513 files passed／4 skipped（517），4889 tests passed／42 skipped（4931），286.04s。候选3的build、native-build/check、helper-smoke、lint、CSS、architecture、i18n、promises等实际记录exit0，bundle最终candidate3-final为0，早期失败日志仍保留。docs仍仅另一个change的6个旧锚点失败；本范围不把这些历史／外范围事项改写为通过或新增产品缺陷。本人没有冒称执行Lead命令。

## 问题与下一步

<a id="specification-output"></a>
Reviewer: codex:/root/review_workbench
Axis: specification
Result: pass
Input-SHA256: ad85880384c79e07d781e6b18ac4fa97a9585bce88009432d825b4f295c476e7
Observed: 同一456路径/20来源冻结候选；Spec/DESIGN/ADR/implementation-contracts、Map43及Goal五段稳定合同均匹配；原WB规范缺口与三项残留已按实际行为关闭。

### 规范轴独立判断

- Spec AC-028/029、NFR-006的归档／恢复合同：fresh专属证明只解释确定无HUHU运行的记录，adopt不能制造终止证据；未知运行仍保守。生产创建、首启动消费、重启恢复、归档提交和真实反例一致。
- Spec §3.1/3.7、AC-035/040的完整来源合同：同opaque key不同locator不再静默移交正文／标注；expectedSource、TS完整比较、缓存隔离、导出拒绝和明确collision状态共同满足精确读取、解释变化与保护标注。保留旧格式的保守冲突策略符合现行规范，不需要额外schema迁移。
- AC-033及§3.7的本Vault默认历史、筛选、终端元数据、只读预览与partial可见性已保持；只读历史和元数据投影不启动PTY。AC-041共享Browser的失败传播与Agent独立承载没有因本轮来源／归档修改退化。
- DESIGN PAGE-002/§5、AC-061/NFR-005的历史确认／模态／fine-pointer窄窗44px合同，现在由生产接线及下列真实受控Chrome证据支持；没有以pointer:coarse替代桌面小窗口。

### 浏览器原始证据回读

证据目录：`evidence/final-ui/candidate3-fine/`，来源总表 `final-ui/results.json` 的candidate3-fine，实际harness exit0。本人读了 `summary.json`、四份hit-targets JSON、生产harness的hitTargets及原生Tab/Escape分支，并实际查看 `narrow-history-dark.png`、`narrow-history-confirm.png`：中文partial说明和确认内容正确，控件可见，无本次新增遮挡。

| 表面 | 控件数 | 最小实际高／宽 | 可见五点采样 | 邻接重叠 |
|---|---:|---|---:|---|
| history Dialog | 11 | 44／44px | 11 | 无 |
| filter menu | 25 | 44／204px | 15 | 无 |
| row menu | 11 | 44／166px | 11 | 无 |
| continuation confirm | 2 | 44／398px | 2 | 无 |

原始脚本明确断言 `(pointer:fine)` 且非coarse，检查真实getBoundingClientRect与中心／上下左右21px的elementFromPoint归属；可见采样均通过。filter另10项在滚动视口之外，仅有实际布局最小尺寸与不重叠检查，不冒称已做它们的可见命中采样。summary还记录原生键盘Tab约束、Escape回触发器、默认取消与取消路径、partial可见性通过；生产DOM测试另明确取消零启动。这是生产组件＋fixture ports的受控Chrome，不是真实Obsidian／Provider端到端。

### 剩余分工与限制

本支持审查没有待修复finding或新增用户决定。整体reviewer与Lead可将本原始两轴结果用于整体判断，仍需以各自实际范围及Evidence合同决定Gate／Ticket状态，不能仅凭本报告完成标签关闭整个change。

真实Obsidian、Provider、人工原生审批、五平台E2E和生产性能未由本人执行，依Spec §11继续明确交用户验收；不冒称通过，也不单因该已授权分工判代码缺陷。没有提交、推送、发布、恢复用户数据或变更正式Evidence。本结论只对上述冻结输入有效，后续产品或规范变更应按影响闭包重验。
