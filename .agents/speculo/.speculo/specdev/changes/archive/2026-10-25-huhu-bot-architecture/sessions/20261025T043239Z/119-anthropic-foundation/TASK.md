---
schema_version: 2
session: "20261025T043239Z"
task: "119-anthropic-foundation"
kind: implementation
change: 2026-10-25-huhu-bot-architecture
ticket: T-01
---

# Anthropic默认装配与真实依赖

## Goal

原owner native:/root/foundation_go 在自己108已接纳默认Registry上装配第三协议，维护真实固定SDK依赖、默认消费者与构造/关闭边界。前置115只读准备必须已实际交回且停写；本任务不实施记忆。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/bot；branch NAMEWTA/bot；HEAD/base 33c21e098ef3188cbab5a09f3e0a01fadb787715。Map29/Goal28、map29-maintenance-validation.json实际通过；evidence/T-10-logs/anthropic-window-map29.md SHA256 885623c70ac60d7465cddee7a013cd16381d7462ace073209b4182a3683c3505。LOG-114 Responses代码门与112独立双轴已接纳，原输入78900740ccb6b1f7e8bc7c76d71c68257428ed916d121a0a11328fec5b542074；自己108报告与回执可按实际未变接缝复用。

按Map→dev→T01→Goal，I/preflight/设计/TDD/异步生命周期/许可规则执行；已读未变规则复用。105固定anthropic-sdk-go v1.56.0路线；117实现driver，118只为common.Registry增加精确身份，二者不属于你的写集。完整28票55AC及Agent Team授权持续，真实Provider/Obsidian/目标OS用户后验；无提交推送发布归档、不再委派、不索凭证。

## Workspace and Scope

仅native/huhubot/internal/bootstrap/core.go、native/huhubot/go.mod、go.sum和native/huhubot/tests/contract/foundation/**内必要装配测试及本TASK REPORT/logs可写。Broker、API/SQL/HAP/TS、common/httpcall、Chat/Responses/Anthropic各driver、其余测试、notices、正式Evidence/Map/Goal都只读。本次没有已证实需重开T06/T02的生产接缝。

Root通知117默认Core有效缺失行为红已接纳前，仅只读准备；之后可编辑非重叠产品。Go/tidy始终由Root给唯一窗口并冻结相关写者。固定GOTOOLCHAIN=go1.26.10、GOWORK=off、GOEXPERIMENT为空；normal CGO0、race CGO1；常规GOFLAGS=-mod=readonly。真实Anthropic import存在且Root给窗口后才固定版本tidy，不能凭空import保依赖、修改module cache或混用Go工具链。

## Acceptance

1. 默认Core创建第三Anthropic driver并传同一不可变Registry。第三构造失败与Registry失败路径排空已创建全部driver，Stop→实际Done→Close；正常Close覆盖三个producer/Probe/持久结算。原Chat/Responses身份、resolver/Provider/DB/Profile清理顺序保持。显式Engine+nil Probe、显式Engine+显式Probe、fake/legacy EngineVersion语义不变。
2. 真实生产import固定github.com/anthropics/anthropic-sdk-go v1.56.0，既有Eino/Chat/Responses固定版本保持。锁按真实导入tidy，非运行的claude/agenticclaude/cloud路径不引入；给T27精确新增模块/版本/锁摘要，不以研究缓存当依赖闭包。常规验证锁只读且确认无漂移。
3. 通过默认Core/publicAPI及实际SDK loopback验证第三协议selector/Engine/Inspector/Probe/EngineVersionForProtocol与原Broker共用Registry。原session-memory重开缺凭证仍missing；不得为测试把旧ref重新注册或凭空当available。纯Inspector ready若使用受控metadata/secret必须明确边界。对应现有Chat/Responses与显式fake选择维持，前置的默认未装配行为红由117实际记录，不以缺包/编译失败造红。
4. 针对本次第三driver新增的构造失败清理和正常Stop/Done/Close给实际可观察控制，不把调用Close次数等同实际资源结束。可在测试固定外部副本/Go overlay对原默认constructor失败点注入，明确其作用域；不得改生产加测试开关或宽泛接口。原108未变共享生命周期证据合理复用，避免机械重跑旧完整队列。
5. 所有产品命令实际Wait并保存固定输入/原日志/退出，首次失败按原样保留；交回后停止写。Root新构建CLI/生产TS HAP Host E2E和独立审查另行进行；不提前宣称T10/全项目完成。

## Return

先ACK且确认115已完整交回、收到Root生产/Go窗口。REPORT首h2前Session: 20261025T043239Z、Task: 119-anthropic-foundation、Status，正文聚焦交接、产物与验证、问题与下一步。列实际dev/TDD、精确自有文件与只读摘要、真实依赖、命令/退出/Wait/原日志、manifest及已跑/复用/未验项；亲自validate-dispatch return0后原生MESSAGE+FINAL并停写。用户现场后验、不访问真实keyring、不提交推送发布归档。
