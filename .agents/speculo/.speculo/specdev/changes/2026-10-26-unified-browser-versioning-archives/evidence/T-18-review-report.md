# T-18 独立双轴审查原始报告

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（按 Lead TASK 与本票 Evidence；实际派遣回执由 Lead 核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: e3a3817b45ff173d900ffe21b3e55a9a3fe16b24184b52fec933cf6ed996cf1e

本人未参与 T-18 实现、修复或测试编写，保持原生 gpt-6.1-sol / high 的既有独立 reviewer 身份。本轮只读源码、来源与配置；唯一写入为本新报告，未更改源码、正式 Evidence、Ticket、Map、旧报告、生成物或 Git index，未再派遣 Agent。

## review-input

完整固定对象：[T-18-review-input.json](T-18-review-input.json)。上述 Input-SHA256 为其经过 JSON.parse 后再 JSON.stringify 的 UTF-8 SHA256，不是 scope 内部 input_sha256。

开始与结束均核对实际 18 个 scope 文件和 36 个 sources 的原字节，全部 MATCH。结束前再运行相同显式 18 文件选择的 review-scope 工具，base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256 全部 MATCH。新文件由工作副本快照审阅，没有因 Git tracked diff 不含新增文件而遗漏。

输入第一条 exclusions 仍残留 T-17 的“T-18 safe updates … later tickets”描述，与本轮 T-18 及实际 18 路径相冲突。本审查按本次 TASK、T-18 原 Ticket 和显式 scope 审查安全更新，没有用该旧描述缩减范围；后续实现仍以 T-19 UI、T-21 迁移等对应票为边界。

## 来源发现与实际影响范围

- 无新 commit，HEAD 与共同基线一致；规范由本地冻结 Issue、Spec、ADR、原 T-18 Ticket、Map revision 5、SRC-010 和 T-17 r2 证据提供，不查询可变远端材料。
- 标准使用根 AGENTS、dev、架构/Obsidian API/testing references、ESLint/TypeScript/Vitest 配置和既有 code-review 工作副本/风险/双轴/错误处理/可靠性合同。根和指定路径未发现额外适用 AGENTS/CONTRIBUTING/CODING_STANDARDS；沿 r1/r2 已发现入口继续审阅，没有另建标准。
- 实际调用闭包：module 原有服务注册 → archive-services → repository beginEdit/updateEntity；v1 仍由 application.save 承接，reminder/remove 也在 application；ContactsFiles 新 captureEditors/process.beforeCommit/trashFolder.beforeCommit → 实际 vault-files → DocumentMutationCoordinator.captureClean/assertClean → 所有 Markdown 叶、编辑器 ID/generation 与 TFile identity。
- 共享 host 原 capture/apply/restore 仍是直接消费者，已逐行对照新增 captureSnapshot 分支：capture 仍 bounded=true，captureClean 才可无写入地读取较大文档，apply 仍调用有界 capture，未发现新增 gate 放宽原 restore 路径/大小限制。原 restore 的编辑 transaction/save 行为未被本票改写。
- 新 YAML 值范围补丁同时用于旧 patchMarkdown 与 v2 patch；新 MarkdownRegion 范围用于仅替换受管内容。定向回读 v1/v2、host 与生产 Vault 端口测试，不以桩测试冒充真实 Obsidian。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: request-changes
Input-SHA256: e3a3817b45ff173d900ffe21b3e55a9a3fe16b24184b52fec933cf6ed996cf1e
Observed: 固定 18 文件的实际源码、调用方与生产代码内存反例；下列 3 项已确认。

### S-01 — P2：有效 YAML 的隐式 null 节点填值时缺少分隔空白，正常编辑被拒绝

- Path：`src/modules/archives/core/persist/yaml-values.ts:36`（33–39）。
- 可达前提：用户或原生 Properties 留下合法 YAML `p-value:`，或 `p-value: # user comment`。这些写法被当前 production parser 正确解码为 null，beginEdit 成功；然后填写该字段为普通文本。
- 已观察：范围补丁把第一种写成 `p-value:"Filled"`，第二种写成 `p-value: "Filled"# user comment`，均违反 YAML token 分隔规则。公开 v2 updateEntity 在结果验证时报 invalidYaml；原文件虽未写坏，合法 null 字段无法通过正常保存填值。相同补丁也由旧 v1 patchMarkdown 使用，旧记录允许的空属性存在相同风险。
- 原因：空 scalar 的 range 不包含可供保留的 value token；直接在零宽位置插入编码值，既没有保证 key 冒号后与 value 的空白，也没有保证紧随注释前的空白。
- 依据：dev 持久化兼容、真实 codec/接口行为与可靠性合同；有效输入不应因补丁生成无效 YAML 而无法保存。新行为要求支持 null/缺失等不同合法表示。
- 修复满足条件：对零宽值节点正确处理 value 两侧分隔，同时逐字保留原注释及其他未知范围。公共 v1/v2 保存应覆盖 `key:`、`key: # comment`、显式 null 和 CRLF/BOM，填值后结果可再次解析、回执和重载值一致；失败仍不改文件。

### S-02 — P1：schema 在验证后、捕获期间改变，更新仍按旧定义写入

- Path：`src/modules/archives/core/catalog.ts:523`（505–534）。
- 可达前提：editableEntity/load 刚校验原修订并取出 type，随后 await captureEditors([file, definition]) 期间，外部同步/源码编辑改变同一修订文件。没有需要保护的原生未保存叶，文件对象保持不变。
- 已观察反例：在 captureEditors 接缝期间将该修订的一个业务字段 codec 从 text 改为 integer、更新文件 mtime/size，并触发 repository.invalidate。修订内容 hash 随之损坏。updateEntity 却成功返回，把 `TEXT_AFTER_SCHEMA_BECAME_INTEGER` 写进实体；后续公开 query 才给 invalidDefinition/missingDefinition。
- 原因：type/contentHash 比较针对变化之前的内存定义；schemaStat 在 await 返回后才采样，已把变化后的 stat 当成预期值。captureClean/assertClean 校验的是原生 buffer/文件 identity，不验证捕获的磁盘定义是否对应 type.contentHash。提交前也没有把该定义的失效代次与已验证 schema 关联。
- 风险：已经损坏或语义改变的定义没有保持只读，调用方成功提交到无法再按已发布定义解释的资料；预检门通过并不证明 schema 仍是校验过的定义。
- 依据：dev 的持久化/公共契约与 error-handling 的状态保证；读取到变动的定义不能悄然成为旧草稿的新授权基准。
- 修复满足条件：将提交 guard 绑定到实际校验过的修订字节/hash/身份及其变动代次；捕获期间发生 schema 改变须重新验证或拒绝。不要只把 stat 采样后移后当作原基准。增加真实公开 update 的确定性 barrier：在 load→capture、capture→process 等阶段更改定义（包括仍可解析但语义不同和 hash 损坏），均不得写实体，草稿保持，重新 beginEdit/校验后才可重试。

### S-03 — P1：提醒写入只重查 editor，没有在最终回调重查归属/身份/协议

- Path：`src/modules/archives/core/application.ts:134`（127–137）。
- 可达前提：saveReminder 已经 snapshot 预检旧 v1 档案，随后到 Vault.process 回调之间，同一 TFile 被外部修改为未来格式、另一实体身份，或操作上下文失效。文件对象及原生叶可以完全不变，且无未保存 buffer。
- 已观察反例：在实际 application.saveReminder 的 process 接缝，于预检后把原 `person` 文档加上 `huhu-format-version: 99`，随后正常调用最终 guard/update。调用成功返回，未来格式文件出现新的 `<!-- huhu:reminders -->` 受管区。
- 原因：snapshot 结果被丢弃；最终回调仅 checkEditor 与 patchReminders，传入 beforeCommit 也仅是 checkEditors。没有重读并比较最新 archive ID/kind/version，也没有像 save 的回调那样重查 active/root。原生干净不代表该文件仍是被授权修改的旧格式档案。
- 风险：绕过已建立的未来格式只读边界，或把旧实体的提醒追加到同路径的新身份；该入口不能被统一安全写入已覆盖的声明包含。
- 依据：dev 的协议兼容、公共写入上下文与 error-handling 规则；T-18 明确要求覆盖真实 reminder 写入口与最终同步 guard，不只是表单的 buffer 检查。
- 修复满足条件：保留 preflight 的业务身份与上下文，在 Vault.process 最终回调校验最新 raw 的旧格式/ID/kind、module/root/path 仍有效，再补丁并验证结果；不能在坏/未来协议上仅追加正文。负例覆盖预检后 version/ID/kind/root/停用变化和原生 ABA；正常 reminder 修改继续保留自由正文及调用方草稿。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: request-changes
Input-SHA256: e3a3817b45ff173d900ffe21b3e55a9a3fe16b24184b52fec933cf6ed996cf1e
Observed: 独立对照 T-18、AC-020/033、ADR-005 和完整 Issue 条款；下列 3 项为本票内的合同缺口。

### A-01 — P2：空值原表示合法，但新字段补丁无法保存该原表示

- Path：`src/modules/archives/core/persist/yaml-values.ts:36`。
- 合同：T-18 IN 的字段保存、未知 YAML/注释保留；Spec AC-020、Issue 字段系统“缺失、空字符串、null、空数组、零值明确定义”和单文件写入第 6 步“结果再次解析合法”。
- 反例/风险：隐式 null `key:` 或 `key: # comment` 的 beginEdit 成功，填值却由新补丁生成无效 YAML 而失败。只覆盖 `key: null` 不代表所有合法 null 表示都支持。此为新补丁直接影响的正常用户输入，不属于后续 UI 范围。
- 满足条件：上述两种写法能通过公开编辑命令填值，保留注释与未知字节，并以公共重载查询证明值精确；v1 使用同一 helper 的空属性也须回归。

### A-02 — P1：编辑期间改变的 schema 没有被最终写入前置条件拒绝

- Path：`src/modules/archives/core/catalog.ts:523`。
- 合同：AC-020 以“定义/表单版本改变”作为前提；Issue #3 第 162 行要求 schema 变更检查兼容性，不能给旧草稿强套新语义；第 507 行要求定义损坏时限制可能破坏数据的编辑。原票要求捕获身份/hash/所有叶，提交前 CAS。
- 反例/风险：load 校验后 capture 阶段修订变动，仍以旧 type 成功写入；随后公开查询显示定义损坏。stat 比较捕获了新 stat，不能满足“校验过的 schema 未变”。
- 满足条件：把真实 schema 内容/代次与 preflight 关联；异步接缝内变动后明确拒绝、保持实体及草稿，只有重新校验兼容基准后才写入。

### A-03 — P1：提醒入口在最终提交点未保持未来格式只读与实体归属保证

- Path：`src/modules/archives/core/application.ts:134`。
- 合同：T-18 目标“档案写入口统一重校验”、AC-020 的未来格式/损坏数据只读；Issue 单文件写入步骤 1/2/4/6 要求业务身份、激活/根、最新文本及补丁结果合法；AC-033 的最终原生校验是附加门，不取代这些业务前置条件。
- 反例/风险：预检后改成 `huhu-format-version: 99`，saveReminder 仍追加内容并成功。未覆盖实际现有写入口，使安全合同在提醒处断开。
- 满足条件：提醒最终回调也重验 ID/kind/version/上下文并验证补丁结果；未来/损坏/换身份时不写入。无需实现 T-21 迁移或 T-19 UI 才能修复该本票路径。

## 已确认的实现事实与检查

- 实际 Vault.process 在捕获之后、update 之前及返回补丁之前调用原生 guard，既有 application.save 提供更早的捕获以检测等待期间的叶增删/编辑代次；原生 buffer 不由这些 gate 保存或丢弃。
- DocumentMutationCoordinator 用编辑器稳定 ID 与 generation 捕捉 edit-and-undo；所有 Markdown 叶通过 getLeavesOfType 检查，TFile 身份变化会拒绝。controller 在 onload 注册、onunload 清空 coordinator，Component 负责 listener 释放。
- remove 捕获整文件夹及嵌套 Markdown 原生叶，提交前再核对 fingerprint/身份/根，trash 使用用户配置的 fileManager 路径；未发现本轮新增绕过。
- v2 base raw/hash 会重验，实际 patch 以重新解码的 baseline 参与三方比较，未直接信任 caller 可改的 values；不同字段与同字段比较、仅显式 changes、必填 complete 与 draft 分离均有实现。false、零、金额 decimal、月精度、null 和正文边界有生产 codec 与新增断言。
- 新 YAML 补丁保留未知 key/正文的目标明确；普通已有 scalar/collection 值及未知外围字节路径已审阅。上述隐式 null 反例是该实现的具体缺口。
- 新错误有 en/zh；无 UI、任意脚本/远程 schema 或无关重构发现。

## 实际执行、原始结果与限制

本轮实际执行：

1. Node crypto 检查全部 18 文件、36 来源及完整输入 SHA256。
2. Node/esbuild `write:false` 内存 bundle，直接运行当前 patchYamlValues 和 YAML parser，观测合法零宽 null 补丁的 parse 错误。
3. 同样内存 bundle 实例化实际 ContactsApplication、archiveServices、repository 及生产 codecs，使用内存 ContactsFiles 接缝确定性触发 null 编辑、schema capture race 与 reminder final-process race。两条竞态都在注入的公开端口接缝模拟外部变动，未靠 sleep/概率重复，也没有修改源码。
4. 回读生产 Vault 端口与 DocumentMutationCoordinator，确认 no-native-leaf、同文件对象的磁盘协议/schema 变动不会由只查原生叶的 gate 额外拒绝。内存端口验证不冒充实际 Obsidian/操作系统；真正 Vaultprocess 执行、事件时序和实机仍未验证。
5. 结束前原 review-scope 相同 18 路径与原字节重新核验，全部 MATCH。

关键原始输出：

```text
NULL valid baseline null update error invalidYaml unchanged true
SCHEMA race update accepted TEXT_AFTER_SCHEMA_BECAME_INTEGER
SCHEMA subsequent diagnostics [ 'invalidDefinition', 'missingDefinition', 'missingDefinition' ]
REMINDER future write accepted true true
base_sha MATCH
observed_head MATCH
working_snapshot MATCH
index_sha256 MATCH
tracked_diff_sha256 MATCH
frozen bytes 18 files 36 sources MATCH
```

另直接 YAML helper 输出显示：`field:`→`field:"NEW"`，parse 错误 `Implicit keys need to be on a single line`；`field: # comment`→`field: "NEW"# comment`，parse 错误 `Comments must be separated from other tokens by white space characters`。显式 `field: null`、正常 block scalar 和已有数组值的同样替换可解析。

未重复作者报告的联合 147 tests、全 test tsc、14 生产 lint、architecture/i18n/diffcheck；这些结果归作者/Lead 运行证据，数量不覆盖上述尚缺的负例。没有构建共享 main/styles 或运行真实 Obsidian、四平台实机、视觉、性能验收，依 SRC-010 由用户完成，未记为通过。

两轴 request-changes 只针对本票实际新增/接入的更新路径；T-17 既有不可变定义设计没有因此被重做，T-21 迁移仍不在本次实现要求内。修复后需重新冻结实际输入，保留本原报告并独立复审；作者检查绿色不能代替缺陷闭合。
