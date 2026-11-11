---
schema_version: 2
session: "20261026T045732Z"
task: "037-t11-safe-open-design"
kind: "engineering-design"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-11"
---

## Goal

沿用户Sol/xhigh研究/实施模型，解决034留下的一个明确工程缺口：在保留现有六Provider正常支持和metadata先准入合同下，给出原native history文件及OpenCode SQLite只读打开的最小可实施安全方案，并用隔离fixture验证关键机制。仅只读工程准备，不激活T11，不写产品、不递归派遣；Root负责正式DoR和最终验收。034已由Root接收为候选，audit SHA256 b2b6ff0911afcf547e3937d43b07324c0b8307923dbd6938924a290e636ea5b2。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；同一change和README工作区。固定输入 /tmp/huhu-t11-root-safe-open-71c647zt/inputs.json SHA256 8ee6478181f347476de784d7118da6f8971496859be3a6bfca174d1a3d9b6f7a，path作来源标识，优先读snapshot。原034 REPORT/ENGINEERING-CONTRACT/VERIFICATION-MATRIX及Root接受audit可复用，不重写。当前T09完整独立审查036在运行；T10未开始，所有产品只读。安全目标来自Spec §3.7及034 §2–4，不能以未经验证的不可用降级永久删除OpenCode或忽略WAL正常会话。

先bootstrap/dev许可与适用原合同。陌生OS/SQLite能力先查现有安装Rust rusqlite/libsqlite3源码和现有原safe-path实现；需要外部事实时只查官方文档/维护活跃且许可证明确的开源实现，保留URL、日期、版本、依赖、许可与取舍。可参考设计，不复制不兼容代码。不要把「检查路径后按同一路径重开」写成同句柄保证，也不要把一次inode/mtime统计说成正文版本证明。

## Workspace and Scope

只可写本037 REPORT与新/tmp/huhu-t11-safe-open-*目录；原034、Root固定输入、全部产品/正式状态/旧证据/永久知识只读，不修改node_modules，不提交推送发布归档。没有真实账号/历史/Vault/Provider/Obsidian访问。仅可创建自有临时目录、合成JSONL和SQLite/WAL数据库做小型机制实验；不启动HUHU helper/Chrome/真实CLI，不跑native全仓或插件build。若需临时Rust项目只用现有已锁依赖，独立target并记录编译消费源，不下载未知代码/加生产依赖。清理只限自己fixture/进程，留下原始证据，不覆盖历史。

## Acceptance

1. 追踪原agent_data的所有打开点、rusqlite实际版本/VFS/flags、SQLite WAL/SHM读取行为及Unix/Windows现有OS依赖；给可定位证据，不从泛泛安全建议开始。
2. 比较最少两个能满足正常支持面的可实施方案。重点区分root/parent/leaf链接替换、原打开对象与SQLite后续DB/sidecar打开、WAL实时记录、读事务一致性、账号metadata扫描与准入后body查询。若只能确认stat前后但不可能止住替换读取，明确实际保证/不足；不能把拒绝返回当作根本未打开越界目标。
3. 给最小选定设计和精确新增/改动路径候选、跨平台边界、取消/close/恢复，优先现有库公开接缝，不为本票发明daemon/第二业务库/大框架。允许局部VFS或OS句柄封装，但须说明可执行而非空接口；若另一个可行方案明显更少代码选择它。
4. 至少对核心SQLite-WAL正常读取及被替换path/sidecar的边界作真实隔离机制probe（可使用系统SQLite/Python先证伪，但标明不能替代Rust生产测试）；明确哪些结论仅静态、哪些由实际工具证明。不得把所有账号DB复制/反序列化到内存说成metadata-only读取；如讨论快照区分原始page访问、正文解析/索引和已授权精确来源的边界。
5. 所有Provider正常fixture最终仍须在正式T11通过，这轮只解工程门。不要求你实现T11、跑五平台真实E2E或向用户重复询问产品语义。未证明的平台/API保留待验，写Root下一步可直接执行的最小决定与验证。

## Return

本目录REPORT.md一次性原子落盘，Session/Task/Status与聚焦交接、产物与验证、问题与下一步；提供选择/取舍、确切源位置/外部引用、实际probe argv/UTC/exit/raw/输入与运行环境hash、失败保留/资源清理。实际运行validate-dispatch --stage return保存回执。SOURCE READ ONLY；未完成安全证明如实列，不预填AC通过。Root原生消息接收，正式状态只由Root写。
