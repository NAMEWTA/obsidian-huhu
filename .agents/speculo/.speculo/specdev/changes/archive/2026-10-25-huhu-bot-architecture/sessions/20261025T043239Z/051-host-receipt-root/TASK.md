---
schema_version: 2
session: "20261025T043239Z"
task: "051-host-receipt-root"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-27
---

# T27 宿主最小回执根与共享排除窗口

## Goal
为 T07 提供唯一受管宿主回执根、Git 排除及准确数据说明。仅 Root 实际派遣后启动；原 /root/build_integration，沿既有实现模型偏好。不扩最终发行窗口。

## Inputs
repo /home/wta/orca/workspaces/obsidian-huhu/bot，HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。LOG072 已实际关闭事件/审批代码门；Map14/Goal13、T27 原工程职责与新增五个精确路径。按 AGENTS → Map → dev 适用架构/测试/许可 → T27 读取；纯存储路径和排除不触发 UI 改版。036-note-effect-preflight 完整 REPORT 和 Spec/ARCH 对 Host 最小回执、Profile 非同步业务库的区别需核对。真实操作按 LOG051 用户后验。

## Workspace and Scope
唯一产品写集：src/shared/storage/vault-layout.ts、src/shared/storage/vault-layout.test.ts、src/modules/sync/core/excludes.ts、src/modules/sync/platform/desktop/excludes.test.ts、docs/data.md；自有 REPORT/log。其余产品/规则/锁/产物/正式状态只读。本窗口不更新五平台 assets、notices、main.js/styles.css，不触及用户库或运行 Git untrack/sync。不能再委派/提交/推送/发布。

新增共享常量优先 HUHUBOT_RUNTIME_ROOT='.huhu/huhubot'，供 T07 只读消费；本机目录由 deviceId/profile/effect 的安全键组成，具体有界回执实现由 T07，不在 shared 加第二套存储业务。Git managed patterns 排除整个运行根，保持原用户规则、definitions、正常笔记行为。docs/data 说明最小本机回执可包含 effect/command 指纹、必要目标定位/hash和核查证据，不放正文/CP/凭证；SQLite Bot业务权威仍库外 OS 根，不能误称整个Bot业务库进入Vault，也不能声称管理外部Obsidian Sync。不要修改其他文档或基线六处无关锚点。

先实际定位既有测试接缝，补有意义的运行根定位/managed excludes兼容验证。只运行相关测试/定向lint，最终全插件build由Root统一源码冻结后执行；命令/exit/摘要记录，不能把尚未跑build写成通过。完成尽快交回释放writer，T27整票继续等待最后全产品窗口。

## Acceptance
准确五文件改动、相关行为检查通过、无实际用户数据操作；共享常量/排除和中文数据说明一致，Root可回读最终SHA。遇到真正需要其他共享路径先提出精确请求，不自扩写集。

## Return
REPORT 首个h2前 Session: 20261025T043239Z、Task: 051-host-receipt-root、Status: completed；h2 聚焦交接、产物与验证、问题与下一步。完整命令退出、输入/产物SHA、实际验证与未验边界、全部进程Wait/停写。validate-dispatch return0 后实际 MESSAGE/FINAL，Root实际全读后接纳工程切片，不能自行标T27 done。


实际开启：LOG072已接纳050双轴pass，当前Map14/Goal13由LOG073登记；map14-maintenance-validation.json中Map/Ticket/Execution全部errors=[]、DAG无环、55AC保留，精确owner见map14-ownership-validation.json。051为此窗口首个产品writer，052/053/054尚未派遣；056/057仅只读准备。不需要重跑全插件build；定向测试可正常进行，性能重测试需Root协调。
