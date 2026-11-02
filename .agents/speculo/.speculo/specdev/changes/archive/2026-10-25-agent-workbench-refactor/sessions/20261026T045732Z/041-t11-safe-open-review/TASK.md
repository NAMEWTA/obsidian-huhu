---
schema_version: 2
session: "20261026T045732Z"
task: "041-t11-safe-open-review"
kind: "planning-review"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-11"
---

## Goal

Root完整18票Goal的T11安全来源读取准备。用户允许Agent Team，独立审查用gpt-6-astra/high。本任务仅独立评估037选定稳定SQLite syscall router+source薄VFS候选是否可实施、最小且不会破坏默认WAL/锁/并发或来源隔离；不给尚未实施的代码伪造pass。你未参与034/037研究实现。不要完成T11生产代码，Root拥有正式DoR、实施阶段和验收。

## Inputs

固定输入 /tmp/huhu-t11-root-safe-review-r2gbw97c/inputs.json SHA256 dd928f8c0a095a14aa01085233b31322ad60fd700389c47dd96f5fd339b77d53；037原REPORT SHA256 bdfe5467f99f3f9ac5fe96cafadb95308656fe216f17c3e801695583516b4947，设计c74ddac404b0e65f533d3730a2da1e7c604f07458555588157baba22a8599fc3，Root audit 8ea991cb6e33be56f8314ed74c1c8e1a78043e1d61c0a9d55fca2dded974b4c0。完整读设计/报告/打开点及Root边界，按bootstrap读取所需I/P、codebase-design/risk-review、dev原生/许可/测试规则。T11 Spec AC033–036/PAGE002及AC061为上层合同；034原工程候选从audit引用访问，不通读所有票。现T09在039修复、T10尚未激活，所以优先用固定snapshot，不读正在修改的workspace-service源。

037实际13个Linux新进程probe证明parent路径竞态、正常WAL及读事务、SHM复用绕hook、Connection逸出TLS后迟open；完整薄VFS从未实施。原锁定rusqlite0.32.1/libsqlite3-sys0.30.1/SQLite3.46.0源码/许可和7官方文档保存在证据根，优先原字节。需要额外原库静态符号时从registry-manifest真实路径读取并固定摘要；不复制整仓。当前不要求重新网上搜索已确定的同版本API。

## Workspace and Scope

repo /home/wta/orca/workspaces/obsidian-huhu/terminal，HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、NAMEWTA/terminal。唯一可写为本041 REPORT、新/tmp/huhu-t11-safe-open-review-*静态证据；全部产品、Spec/Goal/Ticket/原报告/旧探针/原件与Git/index只读。无递归派遣、无测试/构建/Chrome/helper/Provider/Vault/账号操作、无额外依赖安装。磁盘约481MiB，所有大源用已存snapshot引用，不再编译Rust或复制binary。实际工具身份由Root派遣确认，不在报告声称自创权限。

## Acceptance

按真实默认VFS与FFI接口判断：能否不解释unixFile/winFile私有布局而完整转发szOsFile/alignment/io_methods；main/WAL/SHM已复用对象的无provenance拒绝时点是否足够、拒绝清理自身是否有越界副作用；每次迟到callback重建scope及SourceSqlite无裸Connection/Statement逸出；全局pointer在线程前一次安装且任意cache/Cookie并发无scope时精确delegate，失败/close/取消及测试进程生命周期；Windows NtCreateFile/CreateFileW handle所有权与已有features是否有具体不可实现点；只读WAL/SHM真实支持和明确恢复错误，不能改immutable或删Provider支持。metadata不解码/索引未准入正文，但不承诺pager从不触同页其它字节；sourceVersion要实读digest，不仅mtime/size。禁止把候选反例exit0当安全通过。

给具体工程阻碍/失败序列/固定源码依据/最小修订，区分硬不可行、可在本票第一实现阶段用实际红绿关闭的风险，以及用户负责实机验证。比较已给A/B/C，不为规避实施难度增加第二WAL实现或全库copy。Root需要可执行最小阶段门，不要求完成生产实现才允许正式DoR，也不把设计可行性当生产安全证明。若无阻止采用的缺口，明确可据冻结合同开始第一实现阶段及必须通过的真实验证。

## Return

无覆盖原子写 /home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/041-t11-safe-open-review/REPORT.md，标准Session/Task/Status与聚焦交接、产物与验证、问题与下一步齐全；列实际固定来源/hash/静态读取、原probe复用和未运行项。本次不是T11最终两轴review/Ready/AC通过。实际validate-dispatch --stage return保存raw/exit后原生返回SOURCE READ ONLY；Root负责接收与后续方案落实。
