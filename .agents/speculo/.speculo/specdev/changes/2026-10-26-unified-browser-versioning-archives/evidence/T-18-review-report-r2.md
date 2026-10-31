# T-18 repair-1 独立双轴审查原始报告（r2）

Reviewer: native:/root/review_archives
Mode: native
Implementers: native:/root/audit_archives（按 Lead TASK；派遣工具回执由 Lead 核验）
Review-Mode: working-tree
Base/Observed-HEAD: 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa
Input-SHA256: 7ba222924a374fdf86d00a90f189ba08ae3bf8770c0dba008275816c91db63af

本人未参与 T-18/repair-1 实现或测试编写，保持既有 native gpt-6.1-sol / high 独立 reviewer 身份。只读本轮代码及来源；唯一写入为本新报告。未改旧报告、源码、正式 Evidence、Ticket、Map、生成物或 index，未再派遣 Agent。

## review-input

完整冻结对象：[T-18-review-input-r2.json](T-18-review-input-r2.json)。上述摘要是完整对象 JSON.parse 后再 JSON.stringify 的 UTF-8 SHA256，不是 scope 内部摘要。

开始与结束核验：19 个 scope 文件及 37 个来源原字节均 MATCH。新增第 19 路径 core/reminders.ts 在范围内。相对 r1 实际变化为 yaml-values.ts、catalog.ts、application.ts、reminders.ts 及两份档案测试；其余代码字节不变。结束前重跑原 review-scope 的同一显式 19 路径选择，base_sha、observed_head、working_snapshot、index_sha256、tracked_diff_sha256 全部 MATCH。

r2 exclusions 已清除 r1 的“T18 later”陈旧说明；本次没有因排除项缩减安全写入合同。T19 UI、后续关系/迁移和真实人工环境仍按原票与 SRC-010 分工，不写入本票完成声明。

## 来源与审查闭包

沿用并核对 r2 绑定的 AGENTS、dev 及其架构/Obsidian API/testing references、原 T18、Map revision 5、Spec AC-020/033、ADR-005、完整冻结 Issue #3 和 SRC-010；原 code-review working-tree/risk/双轴/错误恢复/可靠性合同仍适用。没有新的 commit/远程来源，也没有新增 UI。

检查实际公开服务 beginEdit/updateEntity、v1 application.save/saveReminder/remove、ContactsFiles、实际 Vault process/trash adapter、controller/DocumentMutationCoordinator；核对新增修复没有移除原原生 buffer/多叶/身份/编辑代次门。r1 原始 request-changes 保留，以下两轴依据 r2 当前源码重新判断。

## standards-output

Reviewer: native:/root/review_archives
Axis: standards
Result: pass
Input-SHA256: 7ba222924a374fdf86d00a90f189ba08ae3bf8770c0dba008275816c91db63af
Observed: 固定范围实际源码、修复负例与生产实现内存执行；原 3 项 finding 已闭合，本轮未发现额外需修正问题。
Findings: []

| 原 finding | r2 实际修复证据 | 独立核验 |
| --- | --- | --- |
| S-01 隐式 null 生成无效 YAML | `core/persist/yaml-values.ts` 对零宽 scalar 判定两侧 token 边界，必要时补冒号后空白与注释前空白，仍只替换 owned value range | `key:`、`key: # keep`、显式 null、带注释显式 null 均解析为 Filled；BOM/CRLF、原注释及 unknown YAML 保留。实际公开 v2 null→Filled 更新成功。新增临时磁盘用例同时覆盖 v1/v2、回执与重开 |
| S-02 schema capture 竞态通过旧定义写入 | `core/catalog.ts` 在 load 校验定义时保存 file/raw/stat/version proof；update 只使用该 proof，实际 read 比对原字节，并在捕获前后、最终 process 以 identity/stat/代次重查 | 原 capture 阶段修改 codec+hash损坏的反例返回 definitionConflict，实体字节未变。新增测试在 read/capture/process 三阶段分别改变有效语义/hash损坏，并覆盖字节/stat恢复但有事件代次的 ABA，旧草稿拒绝，重新 beginEdit 后正常重试 |
| S-03 reminder 最终写入未校验业务身份/格式 | `core/application.ts` 保存 snapshot 的 ID/kind/version，以及 root/path/generation/TFile；beforeCommit 重查激活/上下文/原生叶；最终回调验证最新 raw、补丁结果与实际 reminder 回读 | 原 format99 反例及 ID/kind/root/停用变化均拒绝，没有命令追加字节；正常 save/remove 成功。新增生产 Vault 端口测试还覆盖 native ABA，并保留 caller draft |

reminders.ts 的单行追加修复移除了原 trimEnd()，使提醒分区首次添加时也保留自由正文尾部空白；这是 S-03 正常路径验证中暴露的保真要求，属于本票最小充分修复。替换已有提醒分区仍仅替换该区，原前后正文保留。

检查 proof：stat 在读取前而非 await capture 后采样；原始字节对应已通过定义 hash 校验的同一 load，版本在 load 结束前必须稳定；提交不把变化后的 schema stat 当成原授权基准。read 的异步窗口、capture 的异步窗口与 process 最终同步点都有复核。版本失效时选择拒绝而不自动重放副作用，符合未知状态保证。

原有核心接口与宿主边界仍成立：public update 的基准 raw/hash/schema 重验，实际 baseline 从 raw 解码；显式 changes 与同字段冲突处理保留；draft/complete 分离与 false/零/金额/月/null 的 codec 未被修复改写。原 native gate 不调用 save/transaction，不替用户提交 buffer；最终 Vault callback 继续重查所有捕获叶。删除及共享 host restore 分支字节未变，原有捕获/大小/路径/identity 限制没有因本轮修复放宽。

## specification-output

Reviewer: native:/root/review_archives
Axis: specification
Result: pass
Input-SHA256: 7ba222924a374fdf86d00a90f189ba08ae3bf8770c0dba008275816c91db63af
Observed: 对照本票 AC020/033 分项、ADR005 与完整 Issue 的字段/定义/写入合同，原三项规范轴缺口已修复。
Findings: []

- 原 A-01：合法 null 原表示不再导致新补丁生成无效 YAML；注释和未知原字节保留，重新打开后的字段值有实际测试断言。修复同时覆盖复用 helper 的 v1 路径，不仅修 v2 测试样例。
- 原 A-02：旧草稿绑定的已验证 schema 内容/文件/变动代次成为实际写入前置条件；编辑期间定义改变、损坏或 ABA 后不写实体，必须重新校验/获取基准再重试。没有通过 stat 重新采样接纳变更，也没有引入迁移或自动升级。
- 原 A-03：提醒作为真实既有写入口，最新 raw 的旧格式、ID、kind、路径/root/激活上下文在最终 process 回调得到核验。原生干净不再被当作修改未来格式的充分理由；拒绝时保留 caller draft 和实际已有磁盘内容。首次追加也保留尾部未知正文。

本票与已审 T17 的生产服务闭包保持，未新增业务 UI/枚举或任意脚本/远程 schema。只读/失败保证的判断限于当前 T18 合同，不宣称 T21 迁移、T19 表单界面或整个 change 已完成。

## 实际执行与原始输出

本轮执行：

1. 原字节/SHA256 与完整输入摘要检查。
2. Node/esbuild `write:false` 内存 bundle 直接运行当前 YAML helper+parser，并实例化真实 ContactsApplication、archiveServices、repository/codec；在内存 ContactsFiles 接缝重放 r1 反例与正常提醒路径。接缝只模拟确定性的外部变动，没有写源码或靠 sleep 碰运气。
3. 回读新增临时磁盘测试与生产 Vault 端口 fixture：beforeProcess 现在先等待外部 hook，再读实际最新 raw，回归可以观察最终协议变化；没有拿旧 raw 让竞态测试虚绿。
4. 完成前同一 19 文件选择的 review-scope 及 37 来源原字节再次核对。

```text
NULL "" decoded Filled BOM/CRLF true comment true
NULL " # keep" decoded Filled BOM/CRLF true comment true
NULL " null" decoded Filled BOM/CRLF true comment true
NULL " null # keep" decoded Filled BOM/CRLF true comment true
NULL public update Filled
SCHEMA capture race rejected definitionConflict entity unchanged true
REMINDER version rejected invalidRecord disk unchanged by command true
REMINDER id rejected invalidRecord disk unchanged by command true
REMINDER kind rejected invalidRecord disk unchanged by command true
REMINDER root rejected folderChanged disk unchanged by command true
REMINDER disabled rejected disabled disk unchanged by command true
REMINDER normal preserves original bytes true
REMINDER remove succeeds
base_sha MATCH
observed_head MATCH
working_snapshot MATCH
index_sha256 MATCH
tracked_diff_sha256 MATCH
byte check 19 files 37 sources MATCH
```

## 验证边界与仓库其他未通过项

未无理由重复作者的联合 162 tests、测试类型、4 生产文件 lint、diffcheck；已实际审阅其新测试与生产调用路径，并执行上述独立反例。未构建共享产物。

全局 architecture 检查当前不是通过：Lead 已实跑并将失败定位到 T03 新增 process.fixture 的跨层导入，由 browser reviewer/owner 处理。本 reviewer 未亲自复跑或审查该跨域修复，不把其结果改写成通过，也没有跨域改代码。此报告 pass 是 T18 冻结范围的两轴代码结论，不是全仓检查绿色或整体完成声明。

真实 Obsidian Vault/编辑器时序、平台实机、人工视觉和性能验收均按 SRC-010 由用户执行，本轮没有运行。内存执行和回读宿主夹具不冒充这些环境通过。

结论：standards=pass，specification=pass。后续源码、接口、规范或依赖字节变化需由 Lead 重新确认本报告的适用性；r1 报告保留。本轮唯一新文件为本 r2 原始报告，完成后停写交回。
