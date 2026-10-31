# T-16 独立双轴审查

Reviewer: native:/root/review_code
Implementers: native:/root/implement_t01
Mode: native
Input: evidence/T-16-review-input.json
Input-SHA256: 0d3c24bd18b7871a0112aaf999c97c55463b249abf11cbc2a9d96c96a15f27b8
Observed: 本 reviewer 未参与本票实现，只读审查代码；唯一新持久写入为本报告，未修改源码、正式 Evidence、Ticket/Map、旧报告或生成物，未再次派遣。

## 固定输入及来源

开始与结束均实际计算完整输入对象 JSON.parse 后 JSON.stringify 的 UTF-8 SHA256，如上。逐一核对 16 个 working_snapshot 文件原文字节和文件模式、46 个 sources 原文字节，均一致，无漂移。HEAD/base 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`；`git ls-files --stage -z` 摘要与冻结 index_sha256 相同；实际执行冻结 tracked_diff_command，输出摘要相同。工作区其他领域变动不纳入本票，不由全局工作树非空推导本范围漂移。

审查范围为输入列出的完整 16 文件，沿 T13-r2、T14-r3、T15-r2 联合交付区分本票新增行为；复核 T16 全文、Spec 完整 AC-017、Issue #2 E/F、§7.3/§8/恢复及验收条款、ADR-003、DESIGN PAGE-003、最新 SRC-010 与 Goal 本轮执行约定。工程标准采用 AGENTS、dev/ui 及适用 architecture、Obsidian API、testing、UI 设计系统/无障碍规则和共享 code-review 风险、恢复、独立性合同。来源已本地冻结，无需重新访问可变远端 Issue。原主体规范与前序未变实现复用原审查依据，实际新增接口、调用者、消费者及测试重新核查。

依赖回读包括 installed `@codemirror/merge` 的 Chunk EOF 合同、实际 diff-model、text-edits、DocumentSnapshot/sameDocumentSnapshot、DocumentMutationCoordinator 原生换行转换和捕获/写入门。未新增依赖；package/lock 作为实际安装契约已核验摘要。

## standards-output

Reviewer: native:/root/review_code
Axis: standards
Result: request-changes
Input-SHA256: 0d3c24bd18b7871a0112aaf999c97c55463b249abf11cbc2a9d96c96a15f27b8
Observed: 确认一个可达的正文正确性问题；常规绿灯未覆盖跨拼接换行边界。其余实际检查未发现另一个需请求修改的问题，不代表绝对无缺陷。

### STD-01 · P2 · 原始选块拼接后换行重新解释，改变未选中正文

- 位置：`src/modules/versioning/core/hunk-restore.ts:53`，特别是 56–57 行直接将 source 原始切片拼入 target；实际消费者为 `src/modules/versioning/services/restore-service.ts:116`。未变依赖 `src/host/obsidian/document-mutation.ts:140` 在有原生 buffer 时会将 CR/CRLF 转为 LF。
- 可达前提：合法历史 Markdown 含单独 CR 换行，固定当前 B 为原生编辑器的 LF 文本。当前 diff-model/projection 均明确接受并显示这类历史正文；不是伪造 diff、粗略结果或越权调用。
- 独立最小生产反例：历史 A=`"old\r\rkeep"`，当前 B=`"new\n\nkeep"`。真实 `calculateDiff` 返回 precise=true，唯一块 A/B 均为 `[0,4)`，完整 display 文本为 `"old\n\nkeep"` / `"new\n\nkeep"`。真实 `restoreHunks` 授权 `0:4:0:4`；真实 `applySelectedHunks` 返回 `"old\r\nkeep"`。随后直接调用真实 `DocumentMutationCoordinator.prototype.editableText`（仅纯转换，无宿主运行）得到 `"old\nkeep"`，而选块预期为 `"old\n\nkeep"`。
- 具体风险：选中块末尾的 CR 与紧邻、未选中的空白行 LF 形成新的 CRLF。原始全文证明发生在拼接前，因此没有验证拼接结果的规范化语义；原生转换后该空白行被合并删除。prepare 会把这个错误正文作为 plan.afterText，现有 apply/verify 只验证已计划正文写入成功，不能发现意图偏差；checkpoint/undo 能恢复，但不能使此次选择语义正确。
- 依据：项目正确性/数据保护要求，共享 risk-review 的数据丢失与真实消费者检查；新 core 对“保留未选中内容”的明确合同。
- 修复满足条件：验证实际写入格式转换后的语义等于按已授权范围构造的选块预期，未选正文不能被边界 CR/LF 合并改变。可以安全构造可保真的替换，或明确拒绝不能保真的组合；不能只证明原始输入和 display diff 一致。新增此最小反例及相邻混合换行/空行回归，至少覆盖单选、多选、实际 editableText 后结果和未选区；保留 BOM/CRLF/UTF-16/EOF、whole/copy、checkpoint/批注/undo 的原合同。

## specification-output

Reviewer: native:/root/review_code
Axis: specification
Result: request-changes
Input-SHA256: 0d3c24bd18b7871a0112aaf999c97c55463b249abf11cbc2a9d96c96a15f27b8
Observed: AC-017 的精确按块恢复仍有一处实际偏离；F 条件判定及未批准原型事实不构成本轮代码授权阻塞。

### SPEC-01 · P2 · 精确按块恢复未完整保留未选中内容

同 STD-01 的同一独立问题，非第二个独立缺陷。位置为 `src/modules/versioning/core/hunk-restore.ts:53` 和 `src/modules/versioning/services/restore-service.ts:116`；上述真实 CM precise/full-proof 反例在恢复单块后删除未选中的空白行。违反 Spec AC-017“按块精确”、Issue #2 §7.3 原始内容/精确范围及 §8 完整精确变化才能用于恢复的合同，也与 UI `review.hunks.help/confirm` 承诺保留其余当前内容冲突。满足条件与 STD-01 相同，并须从实际 prepare/editableText 消费者证明边界保真，不能只改展示文字或 precision 标志。

## 其余检查与条件判断

- **精确证明与原始映射：** core 对 display 两端全文、总大小、整体/逐块 precise、行边界、安全整数、顺序/重叠、未变化间隙及完整重建均做检查；未仅相信 UI flags。BOM、CRLF/单 CR、UTF-16 code unit 投影和 CM one-past-EOF 经真实安装版本核对；粗略、截断、无有效变化或仅元数据差异拒绝按块，保留阅读。发现项说明拼接后仍需另一层保真验证。
- **交换与块身份：** DiffSurface 将反向 model 转回 canonical A/B；首次通过证明的 canonical hunkProof 在同一 comparison.id 下保留，selection identity 不因交换而反转。正文/端点显示方向与 canonical 恢复来源分离，reveal 使用对应显示端位置；原 B 不因选择、交换或布局变化重新采样。
- **目标与 ABA：** 首次/显式 refresh 通过同一 RestoreService documents 接缝异步捕获 target；独立 AbortController、buffer 对象身份及当前 request 门阻止迟到结果进入新 B/已关闭会话；完成时二次核对 source id/path/leaf/generation/window 和 target.text。失败仅关闭新增 selective recovery。prepare 核验 target/path/origin、source generation、documentKey/全部 buffer generation；apply 在 gate→共享 checkpoint lease→document exclusive 内重新核对 origin 与 document，并在实际 apply 前再查 origin。document port 仍最终重校验；同字节换文件和 edit→undo ABA 不被文本相等误放行。
- **恢复闭环：** partial afterText 仍只经原 RestoreService；先持久 hold/保护检查、before buffer/disk/after objects 与 prepared receipt，重校验后 applying receipt，再 native apply、批注 commit、仓库及实际 snapshot verify、verified receipt。强制 checkpoint 失败不写正文；失效 origin/plan 不绕过门。批注沿既有 participant 接口，以实际前后文生成 edits，不跨模块直接写 store。selectedHunks 写入并由 checkpoint-store 验证、回执和当前 UI 计数消费，撤销仍恢复整个恢复前 draft、保留新增编辑/批注拒绝规则。
- **旧能力与权限：** 只有 current 模式提供有效块授权；pair/change 显示明确提示。whole restore、copy、pair 比较及当前 no-Git 只读安全边界保持，不因基线捕获不可用而关闭原 browsing/copy/whole 接口；未给工作区 Git diff 或其他模式扩写权限。新增按钮/复选框使用既有设计组件、可访问名称、32px 行目标和双语 t() 文案，无新 View/文件 IO/宿主写入入口。
- **F 条件：** Issue #2 明确列为“按需要”“可后续”“可选增强”；本轮未请求启用阅读渲染、历史附件/图片、blame、批量审阅/恢复，也未出现这些模式的生产入口。作者逐项记录未支持及后续脚本禁用、按历史解析/缺件占位、逐项授权与回执条件，判定成立，不升级为本票必需功能，也不记作这些功能已通过。
- **设计事实与授权：** T16 ready=false/design_ref=null 及扩展原型未集中批准如实保留。SRC-010/Goal 明确全票代码授权并安排继承 PAGE-003 系统产生可审查实现；该授权足以进行本轮代码审查，不伪造 P 批准。实际代码使用现有 diff/AlertDialog/Checkbox/Button 系统；真实视觉及扩展交互确认仍由用户承担，不声称 Design Conformance 的实机门通过。

## 独立执行证据与限制

实际执行：

```text
pnpm exec vitest run --no-file-parallelism
  src/modules/versioning/core/hunk-restore.test.ts
  src/modules/versioning/ui/hunk-mapping.test.ts
  src/modules/versioning/services/note-review.test.ts
  src/modules/versioning/services/restore-service.test.ts
  src/modules/versioning/ui/hunk-controls.dom.test.tsx
  src/modules/versioning/ui/history/hunk-restore.dom.test.tsx
  src/modules/versioning/ui/history/NoteReviewPage.dom.test.tsx
  src/modules/versioning/ui/history/local-history.dom.test.tsx
  src/modules/comments/core/restore-anchors.test.ts
  src/host/obsidian/document-mutation.test.ts
```

结果：10 suites / 81 tests，exit 0，5.41s。覆盖新增纯映射/完整证明负例、真实 CM contract、基线异步/refresh/close、实际 UI 选择/取消/交换→prepare/checkpoint/apply/receipt/undo、强制 checkpoint 失败、原 whole/copy/来源失效、原生 mutation 与批注回归；测试通过未替代实际代码审查。

另以内存 esbuild bundle 直接导入实际 calculateDiff/restoreHunks/applySelectedHunks，进行确定 seed 的混合换行、中文/emoji、重复行/空行探测，发现并缩减为 STD-01 最小反例；再导入真实 DocumentMutationCoordinator.editableText 确认实际消费者转换。没有写探针源码/产物、没有实例化或运行真实 Obsidian。CRLF/LF→LF 的额外 10,000 组探测中，9,996 组通过范围证明并保持全选的 display 语义，4 组被严格完整证明拒绝；未将保守拒绝误记为成功或仅凭 CM precise=true 要求绕过校验。这些探索不证明所有组合安全，也不消除已确认缺陷。

作者报告的串行 30 文件/206 tests、test tsc、10 生产 lint、architecture 1252、i18n 5082、diffcheck 为作者证据，本 reviewer 未无差别重复，未将其冒充独立执行。前次 202 断言虽绿但 EnvironmentTeardownError/exit126 的失败事实保留；本轮独立串行命令 exit0，不推断框架间歇根因已修复。

未运行 build、原始 25 场景脚本、Chrome、真实 Obsidian、跨平台、人工视觉或性能验收；这些由 SRC-010 用户及最终集成 owner 负责。无提交、推送、发布、归档。开始/结束的完整输入、源码/模式、来源、HEAD/index/tracked diff 再核验一致。本轮结论限 T16 固定输入，两轴均 request-changes，唯一独立问题 1 个（两轴分别映射）；报告交回后停止写入。
