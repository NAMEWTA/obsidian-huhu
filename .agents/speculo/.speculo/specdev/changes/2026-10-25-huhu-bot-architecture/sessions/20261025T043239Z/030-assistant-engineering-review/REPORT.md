# T02 实际依赖与工程接纳独立双轴审查

Session: 20261025T043239Z
Task: 030-assistant-engineering-review
Status: completed

## 聚焦交接

未参与实现的 `native:/root/engineering_review` 对当前工程切片独立审查，两轴均为 `pass`，没有新增需修复 finding。仅批准 T-27 的 slice3，不批准整票完成或重复批准 033 的产品切片。

固定输入 `evidence/T-27.md#review-input-slice3`，SHA-256 `29f9eedca116923c1ceb15a7855944ae9fa4bc3c0a221b63414996e5b35c9a18`；32 文件、16 项权威来源；HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。初次与结束均独立读取工作副本、模式、index、来源正文或指定锚点；冻结一致。Map8/Goal7、LOG051、dev、许可/构建/测试规则与双轴合同适用。

完整回读 025 实施报告和 023 双轴，并参考 019/020/029/032/033 对生产来源、凭据实现与产品边界的说明。与 023 相比，仅两份 CI、notices、methods.json、两份 docs、go.mod/go.sum、许可脚本/测试这 10 文件变化，16 来源均未变。复用 015/023 对未变构建脚本、资产验证拒绝缺项/混源/错误兼容字段的反例、release/PTY、架构门禁、根依赖锁定、默认插件与移动边界及工程规则的观察；源码和资产变化部分均重新核验，旧资产运行结论没有冒充新产物。033 的产品审查仅用于边界背景。

## 产物与验证

| 独立检查 | 证据与实际结果 |
| --- | --- |
| 32 文件/16 来源、旧输入比较、末次冻结 | `input-initial.log`、`input-final.log`；均一致，10 文件变化，来源未变 |
| 五目标非测试实际闭包与二进制模块表 | `runtime-closure.log`；`go mod verify` 成功；五次 `go list -mod=readonly -deps -json ./cmd/huhubot` 与实际 `go version -m` 模块清单逐项相等 |
| 新依赖实际 GoFiles 与文件声明 | 同上；回读 38 个不同编译源文件的 SHA/来源及许可相关行，并定向查看声明；Linux 仅 godbus，Windows keyring/common/fallback/mock/windows 加 wincred，Darwin 不含这三个模块 |
| 官方固定全文、缓存、通知 | `license-fulltext.log`；三个新模块原 LICENSE 与官方固定提交逐字节相同，完整进入通知；godbus 是 BSD-2-Clause；旧 TLSF MIT、metaschema 与 CLDR 原文及 SHA 仍完整保留 |
| 实际 helper 正反例 | `license-negative-probes.log`；真实 Windows package 元数据正例通过；错误版本、未知已锁模块、replacement、错误 sum、误加入上游 Darwin 文件及未知 supplemental commit 六类反例明确失败 |
| CI 条件、安装顺序和失败语义 | `ci-prerequisites.log`；两工作流均在 Linux 条件下先 frozen install，再前置检查，再 Go 合同；实际前置命令 exit0，独立工具缺失/失败反例分别非零，未启动 daemon |
| 新15资产与实际工具链/平台字段 | `asset-verification.log`；完整集合、版本、checksum、共同 revision/sourceTreeHash、Go1.26.10、CGO=0、GOOS/GOARCH、trimpath 一致；实际 Linux binary 仍含 malloc/TLSF 三个符号 |
| 新 Linux stdio/SQLite 生命周期 | `native-smoke.log`；一次性隔离 HOME/XDG，hello/status、SQLite 重开、EOF 与 shutdown exit0；无凭据方法 |
| 当前生产通知生成 | `notices-check.log`；顶层 `--check` exit0，100 npm、62 Rust、10 Go runtime/modules |

当前源码树 `7630adba7c27836b0d1cdaf322a92f0679f022902ed996873b977e0207385f4d`，通知 SHA-256 `15b56ca45a571e43bd5f3c4bbf530987bcb3a6b61808c970b2ffe3173e1e1e8c`。15 实际资产的五个二进制摘要如下；末次重新读取与初次一致：

| 目标 | SHA-256 |
| --- | --- |
| linux-x64 | `d4510b02adacfe69d3ec534c1a596ba35696ae813147a34321a9b03a0754216e` |
| linux-arm64 | `b90affeec6abaf2d14c3f0bdd29f697cddcad6f22778cd302824a21c36b2ea6e` |
| darwin-x64 | `2bd702f3a6018595f70235ea5ddb0075529ed38e75b233ab601f3b0ab10944fc` |
| darwin-arm64 | `508e32d61b2ac17bece6250ac198887e625295b24c149c25c3f6bb618efbc692` |
| win32-x64 | `8e702107f64814268dfeb2f5643b213f8ad78822fe8d25e76185f48a016ca0a7` |

Darwin 的自有适配器与上游含 Apache 头的 `keyring_darwin.go` 已对照读取：前者自行组织有界进程执行、输入/输出处理和错误映射，未导入上游模块；没有发现复制其具体源码表达的证据。共享 `/usr/bin/security` 命令、base64 和系统限制本身不足以认定复制。本结论结合实际 GoFiles 与 build-info，不把未编译上游 Apache 文件列入分发，也不把作者来源声明当作独立证明。

未执行全仓 build/lint、重复五目标编译、D-Bus 业务 suite、真实系统凭据、其他目标 OS 原生运行、模型、Obsidian 或远程 CI。既有六个旧 inputs 锚点错误不在本次改动范围，未修改或掩盖。历史 032 默认 session bus 自动激活及元数据接触未知仍保留；本次只执行工具存在性检查，没有启动 D-Bus 或访问系统凭据。所有探针同步子进程已等待退出，native smoke 的两个进程已 close/Wait，临时目录已删除；只写本任务报告与原始日志，所有 writer 停止。

<a id="standards-output"></a>

## standards

Reviewer: native:/root/engineering_review
Axis: standards
Result: pass
Input-SHA256: 29f9eedca116923c1ceb15a7855944ae9fa4bc3c0a221b63414996e5b35c9a18
Observed: 独立核验32文件/16来源及10文件变化，五目标真实编译闭包与现有binary模块表相等，38个新依赖实际GoFiles与固定许可全文已核对；六类拒绝反例、CI安装/工具失败反例、新15资产及Linuxstdio结果均已实际取得。

当前输入没有需修复 finding。新分发来源分别为 keyring v0.2.8 的 MIT、wincred v1.2.3 的 MIT，以及 godbus v5.2.2 的 BSD-2-Clause；官方固定 LICENSE、经过 go.sum 校验的缓存字节与生成通知全文一致。Linux/Windows/Darwin 的不同构建闭包按实际 GoFiles 和 binary build-info 区分，上游 Darwin Apache 文件未被编译，新增门禁在误引入时失败。实际未知已锁来源、替换、版本及 checksum 变化不能冒用旧许可准入。

原 015 的 libc/TLSF MIT 缺口保持关闭：精确模块、固定来源、完整许可和实际链接符号仍对应；JSON Schema、CLDR 附加全文未丢失。通知 union 为 Go 运行时加九个实际第三方模块，未把测试/工具依赖全部列为运行模块；AJV 仍未进入当前插件 main.js 闭包。源码、通知与现有资产一致，目标字段和版本/HAP schema 检查通过；HAP schemaVersion 不冒充 SQLite user_version。Linux CI 的 frozen 安装和 dbus/Python sqlite3/esbuild 检查在 Go 合同之前，缺工具/失败会终止。当前 docs 保留平台实测边界。

上述结论只覆盖本冻结输入。未变工程观察按摘要复用，新增风险由独立读回及正反例支持；作者测试与报告不是批准依据。

<a id="specification-output"></a>

## specification

Reviewer: native:/root/engineering_review
Axis: specification
Result: pass
Input-SHA256: 29f9eedca116923c1ceb15a7855944ae9fa4bc3c0a221b63414996e5b35c9a18
Observed: 按T-27当前切片、Spec S9/AC-043/044/055、ADR-016与LOG051核对最终依赖/build tags、完整许可、五目标资产与CI接纳；当前源树/通知/15资产末次一致，未把产品r2、交叉编译或本地代码探针扩大为整票或真实平台验收。

当前输入没有需修复 finding。T-27 对实际链接、翻译和内嵌材料保留完整许可的要求，在新凭据依赖接入后仍成立：五目标闭包是当前非测试主程序的真实 union；新根许可与旧 TLSF/metaschema/CLDR 附加材料均有独立全文证据，未知来源与错误文件边界会失败。Darwin 自有适配器的实际链接证据与未采用上游 Apache 文件的描述相符。

新源码树 `7630adba7c27836b0d1cdaf322a92f0679f022902ed996873b977e0207385f4d` 的五目标15文件已重新核验，版本0.0.1、HAP0.1/schema1、Go1.26.10、目标、checksum与共同revision/sourceTreeHash一致；实际二进制元信息和新Linuxstdio/SQLite/EOF/shutdown通过。旧slice2资产不作为本次新产物证据。Linux合同测试所需锁定Node依赖与系统工具已明确纳入CI前置并具备失败语义，非Linux条件边界保持。

本pass仅批准T-27当前工程切片；T-27长生命周期后续集成、最终依赖、安装器和生产装配继续按原合同推进，不据此提前done。T01/T02产品r2由033独立结论负责，本报告不重复批准。用户现场目标OS、系统凭据、模型与Obsidian仍待其自行验收；没有运行远程CI或据交叉编译宣称五平台实测支持。

## 问题与下一步

无新增修复项。Lead可接纳当前切片并保留既有失败与修复历史；任何后续源码、依赖、装配或资产变化均按实际影响重算相关证据。两轴结论和本次未验证边界须一起交接，T-27整体状态保持原合同。
