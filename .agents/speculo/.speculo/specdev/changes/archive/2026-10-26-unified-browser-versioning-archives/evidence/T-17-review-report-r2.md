# T-17 repair-1 独立双轴审查原始报告（r2）

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（依据 Lead TASK / 原 T-17 Evidence；工具派遣回执由 Lead 核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: 83cad6654aa01f71911a8e89d5f953ae352c1cee3af11e31f9794daebb37089a

本人未参与该范围的实现、repair-1 修复或测试编写。本轮只读被审查源码、规范与工具配置，仅新建本报告；未改源码、旧报告、正式 Evidence、Ticket、Map、产物或 Git index，未再派遣 Agent。保持原生 gpt-6.1-sol / high 的既有独立审查身份。

## review-input

固定输入：[T-17-review-input-r2.json](T-17-review-input-r2.json)。上述摘要为该完整对象 `JSON.parse` 后再 `JSON.stringify` 的 UTF-8 SHA256，区别于 scope 内部摘要。

开始审查时，15 个 working_snapshot.after 原字节及 31 个 sources 原字节全部匹配。范围新增 `core/model.ts`，其余按冻结显式路径；新测试/新实现也被审阅。对照 r1，新变动为 archives-v2.test.ts、application.ts、catalog.ts、legacy-adapter.ts、model.ts、旧/新 Markdown codec 与 i18n.ts。其余实现字节未变，其调用链已在 r1 实际追踪，r2 继续核对实际闭包与新增接缝。

结束前重新运行原 review-scope 工具，对 base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256 逐项比较均 MATCH。规范、标准、指令原字节再次检查；其他域活跃写入仍按原 exclusions 排除，不将相同 HEAD 当成工作副本一致性证明。

本轮来源发现：原 Ticket、Map revision 4、Spec AC-018/019/023、ADR-001、完整冻结 Issue #3、SRC-010 均已由 r2 输入绑定，r1 补充来源也已纳入。沿现有 repo 的 docs/contacts.md、docs/architecture.md、dev 及 architecture/Obsidian API/testing references，检查持久化、接口、缓存与生命周期。不新增 UI 范围，不要求本票提前实现 T-18 草稿/更新、T-19 UI 或后续关系/迁移/分叉。

另查阅 result-reuse reference，原字节 SHA256 为 `73fef9141887c72e3f1cabb47574ce946727b8a01c90b2d6637b7465d6ffe67f`，路径 `.agents/speculo/workflows/specdev/common/skills/code-review/references/result-reuse.md`。本次两轴基于 r2 修复后的实际源码重新判断；r1 request-changes 保留为历史原报告，不将旧结果直接改写为 pass。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: pass
Input-SHA256: 83cad6654aa01f71911a8e89d5f953ae352c1cee3af11e31f9794daebb37089a
Observed: 实际 15 文件快照、调用闭包、repair-1 新增负例和生产代码内存执行；本轮未发现需修正的新标准轴问题。
Findings: []

原四项修复逐项核验：

| 原 finding | 当前实现证据 | 独立核验结果 |
| --- | --- | --- |
| S-01 Markdown 跨字段注入 | `core/persist/v2/markdown.ts:47` 在创建阶段拒绝任意 field 标记；`:56` 起先隔离 YAML，再按独占整行和状态机读取正文区，检测嵌套/错配/重复；code fence 外的受管区才可启动 | 原 a→b 注入返回 invalidField 且无新文件；标题/YAML 中的同样文本仍无损保存，a 的首换行/末 CR 及空 b 正确读回，没有制造字段，readOnly=false |
| S-02 旧预设字段静默丢值 | `core/model.ts:5` 提取与原 createMarkdown 相同的按 kind 字段集；`legacy-adapter.ts:18` / `:46` 与旧 serializer 共用；`catalog.ts` 的预设创建继续按真实目录拒绝未知字段 | person.website 与 company.birthday 返回 invalidField；person/company 所有 advertised 字段经公开服务→实际 application→v1 serializer/parser 的回执和重新查询均相等。没有改变既有 v1 格式或自动迁移 |
| S-03 不完整身份扫描仍创建 | `core/catalog.ts:143` / YAML 失败分支记录允许实体路径的 unknown identity；`:300` 每次创建前强制重新扫描；`:309` 先拒绝 unknown，再检查 occupied；`application.ts:316` 和 `catalog.ts:446` 两种创建都调用该门 | v1 和 v2 的原文件 EIO 时均 identityUnverified、文件集合不变；恢复读权限后同 ID 返回 duplicateId。新扫描避免依赖过期快照；无复用缓存来批准重试 |
| S-04 损坏副本身份漏计 | `core/catalog.ts:198` 附近在格式/定义/日期解码前采集可信 envelope 中的身份→路径集合；`:282` 附近按该集合统一标记有效实体只读并给出所有路径的 duplicateId | 原 invalidDate，以及 futureFormat、missingDefinition 的同 ID 副本均令有效实体 readOnly=true，每组产生 2 个定位到文件的 duplicateId；源文件保持不变 |

标准依据分别为 dev 持久化/公共接口约束、风险审查的数据/恢复边界、error-handling 的未知事实处理与共享 create 队列。新增 legacyFieldKeys 只是把既有过滤集合变成可复用权威，服务于已确认缺陷，没有顺带扩展旧格式可写字段或进行无关重构。

修复后继续检查：服务注册与 controller/application/Vault 接线仍存在，api.ts 只导出类型/键；结构化读取仍按 v1/v2 分路，未来格式不被旧 patch 覆写；共享队列、根/生命周期 guard、快照 clone、invalidate 和 dispose 接线未因修复断开。新 identityUnverified 错误提供 en/zh。没有以纯格式偏好生成 finding。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: pass
Input-SHA256: 83cad6654aa01f71911a8e89d5f953ae352c1cee3af11e31f9794daebb37089a
Observed: 按 T-17 的真实交付分项对照 Spec/ADR/冻结 Issue，四条原合同缺口已修复；不将整个 AC 分组或 change 其余票误记为完成。
Findings: []

- 原 A-01：T-17/AC-019 要求的缺失、空值与精确字段身份不再被跨字段 Markdown 标记改写。原歧义输入写前明确拒绝；允许的普通文本/YAML/标题内容和 Markdown 边界空白往返保留。新增实际临时磁盘测试覆盖 a 单独注入、a/b 同时有值、标题/YAML、正常代码块、空串及边界换行。
- 原 A-02：AC-023 与原票的旧 codec 兼容分支没有再宣称支持旧 writer 会静默丢弃的字段。目录与创建输入支持集一致，不能保存的字段明确 invalidField；advertised 字段在回执和重载查询一致。旧资料不被纯读取迁移。
- 原 A-03：本票创建的稳定身份边界在读取失败和不透明 YAML 时保留未知事实，v1/v2 均拒绝新建；恢复后重新核验，已有身份返回重复而非再建。新增稳定错误只描述真实失败，不伪称回滚或创建成功。
- 原 A-04：AC-023 的“损坏/重复/歧义可定位”覆盖已经识别身份但不能解码的记录；错误日期、未来格式和缺定义副本均参加重复诊断，有效副本只读，没有改写损坏文件。

本票原有第三类型定义→同一公开命令创建→可见 Markdown→重新加载公共查询的生产闭包保持；未增业务枚举。不可变修订、可信创建时间、v1 createdAt 不伪造、金额 decimal/false/null/年月等原字段协议与 golden 字节没有被本轮修复改写。required 与草稿完整性分离按原票及 Issue 草稿合同判断，不提前要求 T-19 的标记完成入口。定义图分叉、结构化更新与原生草稿保护仍按后续票验收。

## 实际执行与原始输出

没有以作者测试数量代替审查。本轮实际执行了：

1. Node crypto 核对冻结 15 文件、31 来源与完整输入摘要。
2. Node/esbuild 使用 `write:false` 内存 CommonJS bundle，直接导入当前 ContactsApplication、archiveServices 及生产 repository/codec，注入内存 ContactsFiles，执行原四项的失败与恢复反例。反例端口为内存夹具，不声称实际 Obsidian Vault/真实文件系统集成通过。
3. 回读新增生产接缝和新增实际临时磁盘 Vitest：原标记注入、预设全部字段与不支持字段、v1/v2 EIO/opaque YAML/恢复重试，以及 valid+invalidDate/future/missingDefinition 的重复身份。
4. 结束前重跑同一 15 文件选择的 review-scope 并回读原字节。

```text
S01 reject invalidField files unchanged true
S01 roundtrip true false
S02 unsupported person website invalidField
S02 unsupported company birthday invalidField
S02 all advertised person true true
S02 all advertised company true true
S03 EIO person identityUnverified files unchanged true
S03 recovered person duplicateId
S03 EIO p identityUnverified files unchanged true
S03 recovered p duplicateId
S04 invalidDate readonly true duplicate diagnostics 2
S04 futureFormat readonly true duplicate diagnostics 2
S04 missingDefinition readonly true duplicate diagnostics 2
base_sha MATCH
observed_head MATCH
working_snapshot MATCH
index_sha256 MATCH
tracked_diff_sha256 MATCH
```

其中 `S01 roundtrip true false` 分别为 values 完全相等、readOnly=false；S02 的两个 true 分别为输入与回执、输入与重新扫描查询一致。

## 未验证与结论边界

未重复作者报告的 archives/golden 98/98、最终 v2 14/14、定向 lint/i18n/diffcheck；已实际审阅新增断言与所执行生产路径。未再调 TypeScript，TS5.8 内部崩溃/限定 tsc 通过是作者与 Lead 提供的运行事实，统一全局类型验证由 Lead 在稳定输入上处理，本 reviewer 不把它记为亲自通过。

未构建共享 main/styles，归 T-32 Lead。按 SRC-010 没有运行真实 Obsidian activate/重启、原生编辑器、多窗口、四平台实机、性能或人工视觉验收，均由用户亲自执行，本报告 pass 不包含这些未执行边界。

结论仅为 r2 固定范围的独立代码审查：standards=pass，specification=pass；本次未发现额外 material finding。未声称绝对无缺陷、T-17 的外部人工验收已完成或整个 change 已完成。后续实现若修改本票范围/依赖的合同与字节，须由 Lead 重新确认本报告适用性。
