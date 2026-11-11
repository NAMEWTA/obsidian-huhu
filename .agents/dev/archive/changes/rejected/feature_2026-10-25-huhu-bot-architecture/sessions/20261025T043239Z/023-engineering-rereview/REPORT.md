# T-27 工程许可修复独立补审

Session: 20261025T043239Z
Task: 023-engineering-rereview
Status: completed

## 聚焦交接

本次由未参与实现的 `native:/root/engineering_review` 独立补审。两轴均为 `pass`；原 015 的 STD-01 / SPEC-01 两项 P1 在本次输入上满足关闭条件，原失败报告保持原样。本结论仅批准当前工程切片，不把 T-27 或整个 change 提前标为完成。

固定输入 `evidence/T-27.md#review-input-slice2`，SHA-256 `420aee75ec393c90a0cc64c73d86c91e0dfc5f58e5a271a394ecedd32b773586`。独立核验 32 文件工作副本字节/模式、16 权威来源、HEAD/index。与 015 比较，只有 notices、Bot 依赖说明、许可脚本、许可测试及新增 MIT 原文这 5 文件变化；其余 27 文件与 16 权威来源均相同。Map 8 的当前代码验收边界已回读；完整回读 015 两轴、原始许可来源链及 022 修复报告，作者报告不替代以下独立检查。

复用范围：015 对未变构建脚本、资产验证、CI/PTY、架构门禁、根依赖/锁文件、默认插件与移动边界、工程规则、JSON Schema/CLDR 来源的观察。未复用旧 native 资产或旧源码树的运行结论。新版普通文本源码由基础审查负责，本次重新核验其新构建输入与实际资产；没有重复五目标交叉编译。code-review 的两轴、风险、来源发现、工作副本和 result-reuse 合同保持适用。

## 产物与验证

| 独立检查 | 原始证据与结果 |
| --- | --- |
| 当前输入与旧输入逐项比较；结束重验 | `input-initial.log`、`input-final.log`；32 文件/16 来源均一致，新增范围及5文件差异明确 |
| 官方固定 MIT 全文字节 | `upstream-fulltext.log`；1068 字节，SHA-256 `13b7919ffbff20b54d133748a783ade8b3ecb1810144194aad70928070f2c0df`，本地原文与官方提交逐字节相同 |
| 实际 CLI 的缺失/截断/恢复反例 | `license-negative-probes.log`；外部临时根复制真实生产 CLI，复用真实 Go module 输入；完整许可 exit0，删除 MIT 文件 exit1/ENOENT，截断 exit1/checksum mismatch，恢复全文 exit0 |
| 未知来源、错误固定 commit、错误登记 hash、错误许可、错误模块版本 | 同上日志；分别调用实际生产 helper / runtimeModules，均明确拒绝；不是只查看作者测试断言 |
| 新15文件与五个实际 binary 元信息 | `asset-verification.log`；完整目标集合、checksum、版本、平台、工具链、HAP/schema、共同 revision/sourceTreeHash 均通过；另读 `go version -m` 核对实际 GOOS/GOARCH、Go1.26.10、CGO=0、trimpath、依赖版本 |
| 新 binary 内 TLSF 与实际完整通知 | 同上日志；`go tool nm` 回读 `_malloc`、`_tlsf_add_pool`、`_tlsf_find_free_block`，notices 包含完整 MIT，条款为 MIT-0 AND MIT，未伪列 wasm2go 为运行 module |
| 新 Linux x64 stdio/SQLite 生命周期 | `native-smoke.log`；hello/status、SQLite 重开、EOF 与显式 shutdown exit0 |
| 实际生产闭包生成一致 | `notices-check.log`；顶层 check exit0，100 npm / 62 Rust / 7 Go runtime/modules；AJV仍不在当前main.js闭包 |
| 定向许可测试 | `license-tests.log`；12/12通过，无skip |

新资产只对应源树 `d36867805d3182eda2cbb35691d51b6c08a7fb3c3f53e6cc7e3fc9296e61aa11` 与 HEAD `33c21e098ef3188cbab5a09f3e0a01fadb787715`。五目标 SHA-256 独立读回如下：

| 目标 | SHA-256 |
| --- | --- |
| linux-x64 | `19eaf561bb5a64a2b4d660379e220c747c9127893e8a451830265c1e6a26cff2` |
| linux-arm64 | `eb55e0375c5ebb82f6090b80a2bfe2e5af66784328eafcbcd70e566cb64ea71d` |
| darwin-x64 | `53f27f98bb38a3d14c3323273d776806446b2c29d595782ed2bdde378f980428` |
| darwin-arm64 | `252745452f4f88dd7607c510abe8d45a38cade4dd5b333cc4ed8b5fae776e9fd` |
| win32-x64 | `93b43c92cd99239c888027dd5d3a9241db74be1c5115ad3af113ac8c7c4bccaf` |

未修改实现、原报告、真实用户数据或远程状态；只写023报告与原始日志。所有 probe 进程已退出，临时目录已删除。未运行其余四目标原生操作、TLS/系统凭证/真实模型、Obsidian/移动端或远程 CI；root full build/lint 只作为 Lead 证据，不冒称本 reviewer 执行。

<a id="standards-output"></a>

## standards

Reviewer: native:/root/engineering_review
Axis: standards
Result: pass
Input-SHA256: 420aee75ec393c90a0cc64c73d86c91e0dfc5f58e5a271a394ecedd32b773586
Observed: 独立核验32文件/16来源，复查5文件修复；实际CLI缺失/截断/恢复反例、来源/版本准入反例、新五目标资产元信息/哈希、TLSF符号与完整MIT原文均得到实际结果。

当前输入未发现阻断 finding。015 STD-01（P1）已解决：`scripts/huhu-bot-notices.mjs` 将译入 libc/TLSF 的 MIT 精确绑定 `go-sqlite3-wasm/v6@v6.3.35304`，原文来自 [wasm2go 固定提交 LICENSE](https://github.com/ncruces/wasm2go/blob/c0a4be49ed2521303a8b47a8ccbe974da0444762/LICENSE)，1068字节与官方逐字节一致，SHA-256为`13b7919ffbff20b54d133748a783ade8b3ecb1810144194aad70928070f2c0df`。完整文本已进入生成通知；已审阅来源/许可/hash组合受到校验，实际生产CLI在缺失或截断时失败。原固定README→build/main.c→libc-gen→TLSF源码链仍成立，新binary仍含实际译入符号；没有用整个构建工具依赖图冒充运行闭包。

dev许可规则所要求的实际分发原始声明在本次补审范围内得到满足。SQLite公有领域、MIT-0 glue、译入MIT的文档边界已明确；JSON Schema和CLDR正文/来源未变，仍保留。根package/锁文件与实际闭包未新增未审阅运行依赖。

对摘要未变的固定工具链、readonly/trimpath/CGO、资产目标/完整集合/校验/同源、CI收集与PTY合同、架构约束、默认插件/移动边界及工程规则，保留015的非阻断观察。新资产字段/实际binary元信息、源树与Linuxstdio另外核验通过。结论仅及冻结输入；未来依赖、装配、源码或产物变化需按影响重新验证。

<a id="specification-output"></a>

## specification

Reviewer: native:/root/engineering_review
Axis: specification
Result: pass
Input-SHA256: 420aee75ec393c90a0cc64c73d86c91e0dfc5f58e5a271a394ecedd32b773586
Observed: 按T-27步骤2、Spec S9/AC-043/044/055、ADR-016及LOG-051重新核对修复合同与新资产；原许可缺口的满足条件已有独立正反例证据，未把局部工程通过扩大为整票或平台支持通过。

当前输入未发现阻断 finding。015 SPEC-01（P1）已解决：T-27「按最终依赖/build tags核对实际传递与翻译源码并保留完整许可」的遗漏已补齐，完整固定MIT与实际TLSF译入材料对应，生成通知包括原文且未错误增加未链接工具。缺失/篡改文本在实际CLI明确失败，错误模块版本、未知来源/commit及错误许可/hash分别被拒绝，满足原finding要求的失败与恢复验证。

本次新sourceTreeHash为`d36867805d3182eda2cbb35691d51b6c08a7fb3c3f53e6cc7e3fc9296e61aa11`。当前15文件资产的版本、五目标、HAP/schema、checksum、共同提交/源码树均匹配；五个实际binary的工具链/目标/依赖元信息已回读，新Linuxstdio、SQLite重开、EOF与shutdown通过。015旧资产结论没有被迁移到本次新源码。未变release流程仍收齐Bot资产并保留PTY合同，架构CLI与默认插件边界的既有非阻断观察仍适用。

本pass只批准T-27当前已实施工程切片。T-20安装器、后续Engine/UI生产装配、最终依赖闭包及T-27最终集成仍按其原合同推进。真实目标OS操作、TLS/凭证、模型与Obsidian由用户后续验收；当前交叉编译和Linux代码探针不构成五平台实测支持声明，T-27不得凭本报告提前done。

## 问题与下一步

本次没有新增需修复的问题。Lead可保留015失败历史并记录STD-01/SPEC-01在新输入下关闭，继续已授权后续票。未来生产切片改变源码/依赖或装配时，重新计算对应构建、许可与验收证据；用户现场验收事项继续明确保留。
