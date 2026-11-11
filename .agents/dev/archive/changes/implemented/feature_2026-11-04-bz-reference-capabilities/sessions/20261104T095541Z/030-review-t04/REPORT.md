# 任务回报

Session: 20261104T095541Z
Task: 030-review-t04
Status: completed

## 聚焦交接

已完成 T-04 冻结候选的独立双轴审查，两轴均为 request-changes。确认 1 项 major 和 1 项 minor：同路径目录/文件删除被错误合并，导致已删除子档案残留；目录移动只刷新新路径下 Markdown，没有刷新非 Markdown 附件在新路径上的依赖诊断。75 项相关测试、两组类型检查、全仓 lint/架构及内存执行的 10 项工作台生命周期场景均通过，但未覆盖上述反例。规模脚本 first.isComplete 失败按冻结 TASK 接收为已确认的基线问题，不归因于本票；完整规模/性能结果仍不宣称通过。仅写本 REPORT，未修改业务文件或正式状态；下一步由 Lead 修正 D1/D2、补回归后重新冻结复审。

## Review

- Strategy: independent
- Risk: high（索引正确性、合并事件语义、异步读代际与卸载清理）
- Independence: required
- Reviewer: Codex / 本 TASK 独立审查会话；未参与 T-04 实现或修复。实际会话/派遣关联由 Lead 核验，不编造 provider/session ID。
- Implementers: Ticket 声明 herdr:impl1；app/main.ts、archives/module.ts 为 Lead 共享落点。
- Review mode: working-tree
- Base: 29644dc5833bb209e6282f84fa71441a5a1b99d4
- Input-SHA256: 98600ae2acbef99b933f1f3a6a80d07543cf2f378107143a2ece861c3ed33d30（TASK 提供的整体摘要）
- 冻结范围：TASK 全部 7 文件。开始运行 sha256sum，中途及写报告前用原始字节 SHA-256 复核，7/7 匹配，无输入漂移。已跟踪部分对照 `git diff 29644dc -- <selected files>`，4 个新增适配/测试文件完整读取。

### 来源、影响与范围

完整读取 TASK、当前 Ticket 与 026 实现交接；沿用本会话已读的 AGENTS.md、dev/ui、domain-runtime、reviewer-contracts、risk-review、范围/错误/测试可靠性合同。AGENTS/dev/ui 及 risk-review 的摘要与先前工具记录一致，dev 仍为 Ticket 必需绑定的 d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e。规范依据为 Spec §1 / AC-121–124、ADR-004、CONTEXT、Map/Goal 的依赖/共享写集及 OOS-008。

追踪的真实链路为 `main.onload → FileChanges → 实例 DomainEvents → archives/module → bindArchiveFileChanges → ArchiveRuntime/index`；写入链为 `finishWrite 验证 → subscribeCommitted → invalidate`，私有草稿为 `draft store 完成 → invalidate`。另外读取原 runtime 读版本/epoch、文件依赖表、ContactsFiles/Vault 适配、schema/实体命令、测试端口、main 事件与生命周期测试。main 中既有 T-02/T-03 的 UI/事件注入只核对新增适配器的波及，未将它们重新归为本票实现；其他模块监听、反馈/RecordEditor/i18n 改动不属于本轮审查写集。

新文件头保留了 bz 固定 SHA、MIT、原路径及署名。实际通过只读 GitHub Contents API 取得并核对原文： https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/obsidian-adapter.ts 。采用点为 raw 与 metadata.changed 分离、rename 新旧路径和按事件来源解绑；原实现仅处理 Markdown/单例，HUHU 的实例化、目录/全部文件、有界批次及重扫由本地合同验收，不能以来源存在替代验证。026 提供的来源登记条目仍由 Lead 汇总到非冻结 docs 文件，本轮未擅自改写。

## Standards Axis

Result: request-changes
Reviewer: Codex / 030-review-t04
Input-SHA256: 98600ae2acbef99b933f1f3a6a80d07543cf2f378107143a2ece861c3ed33d30

### D1 — major：去重键忽略目录/文件身份，后续文件删除吞掉原目录删除

- **文件:行：** `src/host/obsidian/file-changes.ts:68`–`:70`。
- **问题：** 所有变化都按 `[kind,path,oldPath]` 合并，键没有 folder。一个路径原来是目录，短时间内被删除、临时创建同名文件、再删除这个文件时，两条 delete 共用键；最后的 `folder:false` 覆盖最初的 `folder:true`，目录子范围失效语义永久丢失。
- **亲自运行的复现：** 真实 EntityCommands 在 `huhu/archives/people/One-person-a/profile.md` 建档并完成索引。使用真实 FileChanges、DomainEvents、binding 和 runtime；删除测试文件端口中的实体，依次从宿主事件源发 `delete(TFolder(parent)) → create(TFile(parent)) → delete(TFile(parent))`，三件事在同一批次内，随后 flush 适配器及 runtime。实际发布：

```text
[
  {kind:"create",path:"huhu/archives/people/One-person-a",folder:false},
  {kind:"delete",path:"huhu/archives/people/One-person-a",folder:false}
]
```

实际实体仍索引在已不存在的 `.../profile.md`；补发原本应保留的 `{kind:'delete',path:parent,folder:true}` 后，实体立即从索引移除。这个正向对照证明缺失的是合并时丢掉的目录删除语义，不是解析、schema 或既有规模问题。
- **可达条件与影响：** 同一合并窗口内同路径被不同文件系统类型复用，且消费者依赖目录事件失效子范围。当前适配器合同明确支持目录，不能以可能另有子文件事件补偿来替代保留该信息。结果为已删除档案继续参与索引查询，直到另一次完整失效/重扫；违反 AC-123 的 delete 语义不丢。
- **建议修正：** 至少区分 folder 身份，避免目录删除被文件删除覆盖；或仅对可安全合并的 modify 类事件去重，对 rename/delete 保留足够顺序/范围信息。保持容量上限、最大等待和溢出 rescan，不用无限队列替换问题。
- **建议验证：** 新增上述目录→文件→删除的真实 adapter→runtime 回归，断言批次保留目录删除/等价保守重扫，且已删除子实体不再索引。现有 delete/recreate 测试只使用相同文件类型，无法捕获此问题。

### D2 — minor：目录 rename 的新范围未失效非 Markdown 附件依赖

- **文件:行：** `src/modules/archives/services/generic/file-changes.ts:17`–`:21`。
- **问题：** rename 对旧路径调用 fileDeleted(...,true)，可失效所有旧文件依赖；新路径只枚举 getMarkdownFiles 并 fileChanged。对新目录内 png/pdf 等非 Markdown 附件，指向新路径的已有档案不会被标为 dirty，因此仍显示已经过期的 missing-file 诊断。
- **亲自运行的复现：** 用真实 DefinitionCommands 发布包含 `file` 字段的类型，真实 EntityCommands 创建档案，引用 `huhu/archives/assets/new/image.png`；附件初始在 `huhu/archives/assets/old/image.png`，档案有 missing-file。把附件随目录移动到 new，发一个 `{kind:'rename',oldPath:'huhu/archives/assets/old',path:'huhu/archives/assets/new',folder:true}`，然后 flush。实际附件已存在，missing-file 仍为 true；再对该附件发等价单文件 create，flush 后 missing-file 变为 false。另一个库外 assets 路径变体也复现相同结果。
- **影响与归因：** 新路径的依赖诊断不随真实文件集合更新。此盲点在旧 runtime 的目录分支也能看出，不能仅据此声称是本票新引入的回归；但本票新 binding 及 AC-121 明确承诺新旧范围均失效，候选没有补齐这一覆盖，因此是当前目标的功能缺口。标为 minor，不夸大为附件内容丢失。
- **建议修正：** 新目录范围也应失效引用依赖，例如提供对路径前缀的依赖失效方法，或先失效新范围再发现其当前文件；不应只靠遍历 Markdown 刷新。保留索引的 Markdown 发现规则，无需把二进制附件当档案解析。
- **建议验证：** 加入目录移动使缺失附件出现/消失的服务回归；在只有目录事件、没有补充子文件事件的条件下，确认旧/新路径各自依赖者诊断都更新。现有目录测试只覆盖实体 Markdown 的迁移。

### 其他适用风险观察

- 纯路径快照避免保留可变 TFile 引用；适配器按实例拥有事件源与 timer，构造中部分订阅失败会清理已取得引用。
- 默认 40ms debounce / 200ms 最大等待及 2048 容量有界，modify 风暴和溢出重扫测试通过；D1 是信息合并正确性问题，不能被有界性绿色测试覆盖。
- ArchiveRuntime 直接 read 原文，保留文件 version、epoch 和对象路径校验；metadata 晚到不使索引退回旧 cachedRead。rescan/dispose 会退休旧读，新增错误报告也检查原 epoch。
- 可见写入在内容验证后发布失效；隐藏草稿 write/remove 只在底层成功且未 abort 后发布，不带 draft 正文。冲突/失败不冒充提交；本轮未发现此路径的新问题。
- main 每插件创建 adapter，卸载先停适配器/端口；模块绑定 lifetime，runtime dispose 清提交监听。幂等、迟到读/加载、部分绑定失败和既有 main/T-02 回归通过。
- 未新增设置、文案、UI 页面、依赖或数据格式；模块仍通过公共事件端口消费。未因风格偏好产生 finding。

## Specification Axis

Result: request-changes
Reviewer: Codex / 030-review-t04
Input-SHA256: 98600ae2acbef99b933f1f3a6a80d07543cf2f378107143a2ece861c3ed33d30

| 合同 | 结论 | 实际证据 |
|---|---|---|
| AC-121 | request-changes | 现有目录移入/移出、md↔txt 和完整适配链路测试通过；D2（minor，binding :17–:21）证明目录新范围的非 Markdown 依赖未失效，旧/新范围合同未完整满足。 |
| AC-122 | pass（规定服务接缝） | raw modify 与 metadata 分开；真实 runtime 在 cachedRead 仍旧时读取新 frontmatter，metadata 后到不回退；原文读取与版本/epoch 防护保持。 |
| AC-123 | request-changes | 最大等待、modify 合并、有界队列、溢出 rescan 通过；D1（major，host :68–:70）证明目录删除仍会被同路径文件删除吞掉，导致真实索引残留。 |
| AC-124 | pass（自动化接缝） | 适配器监听/timer 清理、晚到事件、部分订阅失败、旧读跨 dispose/rescan 与错误代际测试通过；工作台 10 项生命周期场景通过。宿主真实同步仍待用户验收。 |

范围核对：只把 archives 的四个直接 Vault 监听迁到适配器，其他模块监听未迁移；私有失效、批次、代际及 app 装配在声明范围。新增导入遵守 host/shared/modules 分区，没有夹带数据迁移、格式变化、界面重排或 T-02 重构。app 与 archives/module 的共享归属按冻结 TASK/交接处理，不重新要求已具备的编辑授权。

### 规模基线与未完成验收

冻结 TASK 已明确：Lead 在未修改 HEAD 29644dc 的干净副本也复现 first.isComplete 断言失败。本轮接受该已提供的基线结论，不把它列为本票引入的 finding，也不要求通过删除/放宽断言来消除它。026 报告自己的 runtime 内存对照与候选同样失败，亦未给出完整规模结果。

本轮没有再次运行已知在首个完整性断言停止的规模入口，不声称取得 1000/5000 数据或完整性能无退化证明。D1 的新合并语义反例及 D2 的范围覆盖缺口独立于该规模断言；需先修复，再由 Lead 在基线问题处置后核验规模结果，继续保留待验收状态。

## 产物与验证

唯一写入产物：本 REPORT.md。未修改业务文件、TASK、026 报告、正式 Evidence/Ticket/Map/Goal、依赖或生成物；未安装、暂存、提交、推送、发布或执行 Git 写操作。

环境为 current/dev，Node v26.11.1、Vitest v5.0.3；unit 为 Node，dom 为 happy-dom。以下为本审查者亲自取得的验证：

| 命令/检查 | 退出码 | 结果 |
|---|---:|---|
| `sha256sum`（TASK 全部 7 路径）及 Python 原始字节校验 | 0 | 开始/中途/报告前 7/7 匹配，无输入漂移 |
| `pnpm exec vitest run src/host/obsidian/file-changes src/modules/archives test/golden/archives-v2.test.ts test/golden/archive-relation.test.ts src/app/main-events.dom.test.tsx src/host/obsidian/feedback.dom.test.tsx` | 0 | 13 文件 / 75 项通过；含新 host 5、binding 10、黄金样本与 main/反馈回归 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0 | 本轮生产类型检查通过 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0 | 本轮测试类型检查通过 |
| `pnpm run lint` | 0 | 全仓零警告通过 |
| `pnpm test:architecture` | 0 | 1299 模块，无分区/宿主包/桌面边界/桶导入/循环违规 |
| `git diff --check -- <TASK 的 7 文件>` | 0 | 已跟踪差异无空白错误；新增文件另经直接读取、测试和类型/lint 检查 |
| `node` stdin：内存 esbuild write:false 编译 `scripts/verify-workbench-lifecycle.ts` 并以 CommonJS Module 执行 | 0 | 原入口的 10 项 node:test 生命周期场景全部通过，未生成 scripts/tmp 文件 |
| `node` stdin：真实 FileChanges→DomainEvents→binding→ArchiveRuntime 的 D1 反例及对照 | 0 | 合并丢目录 delete 后实体残留，补回原目录 delete 后移除；0 表示反例确认成功，不表示业务通过 |
| `node` stdin：真实定义/实体命令与 binding 的 D2 反例及单文件事件对照 | 0 | 目录移动后 missing-file 陈旧，单文件事件后正确清除；库内和库外附件路径均确认 |
| `gh api 'repos/yeshimei/bz/contents/src/core/obsidian-adapter.ts?ref=d76a0870329403247917a00c43019e203a2560a4' --jq .content` 后 base64 解码 | 0 | 只读获取固定原文，未执行外部代码 |

生命周期脚本的 pnpm 包装会写 scripts/tmp，因此使用同入口在内存编译执行，未创建仓库日志或其他附件。反例也只在内存执行；首次 VM 版本的 D2 探针因跨 realm 普通对象不满足既有 canonical/copy 输入校验而退出 126，不是业务反例。改为同 realm CommonJS 内存加载后，真实命令与正向对照均成功运行；未改被测代码、校验规则或断言。

未执行或未验证：规模入口本轮未重跑，保持上述基线/待验收说明；禁止的 build/build:css/notices 未执行，main.js/styles.css、包体及来源表合并由 Lead 处理。未运行全仓 pnpm test、全部许可门禁或 UI runner；没有 UI/文案变更，不扩大视觉矩阵。真实 Obsidian 文件同步、目录事件的宿主表现按 Spec 留待用户验收，端口测试不冒充真机。

## 问题与下一步

无冻结输入或独立审查执行阻塞；Status completed 表示审查回报已交付。请 Lead 将 D1/D2 交实现者补最小修复及对应回归，然后冻结候选复审；继续保留规模基线、共享产物与宿主待验收事实，不把现有测试绿色或本报告交付当作 Ticket 已完成。
