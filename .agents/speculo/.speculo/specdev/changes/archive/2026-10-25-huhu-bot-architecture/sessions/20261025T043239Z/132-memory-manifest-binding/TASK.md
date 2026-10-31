---
schema_version: 2
session: "20261025T043239Z"
task: "132-memory-manifest-binding"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# 增加无正文记忆清单的纯绑定校验

## Goal

由原API owner native:/root/foundation_go，在129已停写checkpoint后完成一个最小共享接缝：从现有唯一canonical编码验证body-free manifest，供真实维护job在读取正文前验证固定Targets。129运行集成未完成，不能用本任务宣称完成。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715；Map36 / Goal35 / LOG123。全部28票55AC、Agent Team和代码层总验收授权持续，真实模型/Obsidian/目标OS由用户后验，不再索凭证；不提交推送发布归档。

按Map→dev/testing→T01及既有I/TDD规则执行。直接合同为115、123、125 R3；本次精确原因及资源窗见evidence/T-14-logs/manifest-helper-window-map36.md。初始api/memory.go SHA 7cd35c57182251403d1314d8ae7d56f342613b7c63955d6311ab1a24e381f8ec；fixtures/memory-bindings.json SHA 99a2ee07347b1b1a34dfd98c35aae7f8488621d50aaa503ea89d1e446a76a22a。130已返回，所有common检查停止；126/128仍各自source-only，均不可改API。

## Workspace and Scope

仅native/huhubot/internal/application/api/memory.go和新增同包memory_manifest_test.go可写；以及本132目录REPORT/logs/manifests。现有所有DTO、wire/schema、TS、旧fixtures、其他API文件、Core/SQL/Executor/Grants/common/locks/generator均只读。不得修改129/125/130已冻结交接。无需扩权到foundation测试包：它导入活动Core，不能运行。

## Acceptance

1. 新增CanonicalMemoryInputManifestBinding(ExecutionMemoryInput)(string,error)或等价明确命名的纯body-free入口；须与完整CanonicalMemoryInputBinding共用唯一canonical投影/编码，无复制hash格式。metadata入口要求所有entry.Text为空；仍验证version/mode/namespace/job generation/settings/ref语法/role/重复与数量/Targets完整性及排序，返回与原有完整输入完全相同的binding digest。它不验证实际正文、不授予权限，调用者仍须比较持久binding及全部当前事实。
2. 完整入口继续校验全部UTF8、ref.Hash==实际text hash、128KiB总正文及原限制，不能经manifest模式绕过。旧fixture摘要及输入序列化保持字节兼容；不改变Engine/Inspector调用到metadata入口。不新增wire字段或自动schema生成。函数注释明确责任，内部仅解释非显然不变量。
3. 先保存真实旧入口无法接受合法redacted manifest的行为证据（不是未定义符号编译错误），再补最小实现；测试正控完整/删正文同摘要、每个metadata关键字段变更导致摘要变化或拒绝、重复/无效/边界、完整入口仍拒错误正文。复用固定独立fixture，不把两个相同实现相互比较作为唯一oracle。
4. 132为当前唯一Go检查者。固定Go1.26.10/GOWORKoff/GOEXPERIMENT空/GOFLAGS=-mod=readonly/GOPROXYoff，先冻结实际api全包/锁/读取fixture并实际go list -deps -test -json确认纯api闭包无Core/SQL/活动writer。只运行纯api定向测试与有意义vet，保存输入、actual exit/Wait/原日志及漂移。新依赖超界回Root；不运行整个foundation、common、全build/混合CLI或Node产品检查。
5. 将精确函数签名与语义主动发给126/128；他们只能在其原写集中消费。旧scope放行必须依实际job与当前权限验证，属于128责任；本任务不擅自实现授权逻辑。待最终字节稳定后Root冻结133独立审查。

## Return

先原生ACK。完成后停写所有产品文件并等待实际进程结束。REPORT首h2前含Session: 20261025T043239Z、Task: 132-memory-manifest-binding、Status；含聚焦交接/产物与验证/问题与下一步、红绿/旧兼容/源码与工件摘要/未验边界。亲自validate-dispatch return actual0后原生MESSAGE+FINAL。Root回读并推进原状态，之后再接续129；generator六方法implemented源事实另待实际装配窗口。
