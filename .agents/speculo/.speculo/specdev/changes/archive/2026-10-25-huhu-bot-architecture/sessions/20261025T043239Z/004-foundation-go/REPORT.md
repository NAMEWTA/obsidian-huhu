---
schema_version: 2
session: "20261025T043239Z"
task: "004-foundation-go"
status: "completed"
---

# Go / SQLite / Profile / HAP 分片回执

Session: 20261025T043239Z
Task: 004-foundation-go
Status: completed

## 聚焦交接

指定 Go/SQLite/Profile/HAP 代码与代码层检查已完成并交回候选。当前 CLI、协议字段和源码均已冻结，与 TS 客户端及 T-27 构建 owner 对齐。`completed` 仅表示本派遣候选交回，T-01 仍等待 Lead 验收与独立双轴审查。下一步由 Lead 回读本报告、快照和测试回执。

- Session：20261025T043239Z；Task：004-foundation-go；Ticket：T-01。
- 实际作者：`/root/foundation_go`。Lead 回传的派遣参数为 `model=gpt-6.1-sol`、`reasoning_effort=xhigh`、`fork_turns=none`；这是可回读派遣记录，不声称本 agent 的工具独立识别了底层模型。未再派遣，也未调用外部 CLI 代写。
- 状态：指定代码与代码层检查完成，等待 Lead 的 TS→Go E2E 汇总与独立双轴审查；本回执不把 T-01 标 done，不写正式 Evidence。
- 工作区：唯一 checkout `/home/wta/orca/workspaces/obsidian-huhu/bot`，分支 `NAMEWTA/bot`，TASK 基线 `33c21e098ef3188cbab5a09f3e0a01fadb787715`。无 Git 提交、推送、发布。

## 产物与验证

产物、命令退出码、已验证与未验证边界如下；正式 Evidence 和业务完成状态仍由 Lead 维护。

### 实现与合同

`native/huhubot/` 新建独立 Go module，固定 Go1.26.10 的可复现命令与 ncruces/go-sqlite3 v0.35.6；CGO=0 可构建。不引入没有生产消费者的 Eino adapters。研究中的 mattn/ncruces 同夹具比较、活动/许可与版本探针沿用 `002-foundation-research/REPORT.md`，生产只保留 ncruces。直接依赖 x/sys v0.48.0；传递依赖 wasm/v6 v6.3.35304、julianday v1.0.0；完整锁定见 go.mod/go.sum 和本目录 modules.jsonl。

- `cmd/huhubot`：唯一生产入口 `--stdio --profile <absolute-dir> [--managed]`。Profile locator 必须位于独立解析的 OS managed profiles root 内，不接收 HAP 自报运行根。Linux 为 XDG_STATE_HOME/huhu/huhubot/profiles（缺省 HOME/.local/state），macOS 为 HOME/Library/Application Support/HUHU/huhubot/profiles，Windows 为 LOCALAPPDATA/HUHU/huhubot/profiles。P1 不开 HTTP listener。
- `runtime/profile`：私有目录/文件权限与当前用户所有权；先验证已存在祖先再创建，外部 symlink 子路径拒绝且无外部 mkdir 副作用。DB 文件 `profile.sqlite3` 使用实际身份的生命周期锁。Linux/macOS 持 DB fd flock；Windows 用当前用户 SID + volume/file ID 的全局命名 mutex，创建为 unowned，以避免线程亲和依赖。新 inode 在 private 临时文件上先加锁、再 hardlink 原子发布，避免可见空库尚未上锁的窗口。
- `sqlite/base` + `migrations/001-core.sql`：真实 schema/quick_check、application_id/user_version 预检；坏库、既有空文件、未知/未来 schema 拒绝且不覆盖。新库原子创建 Profile ID、commandEpoch=1、revision=1、UTC createdAt；真实重开不变。一个 bounded SQL connection、WAL、FULL synchronous、FK 与短事务；`Database()`/`WithinTx()` 是仅供 SQL adapters 的组合接缝，Application 不取得 SQL。迁移嵌入/编号 registry 归本票 owner。
- `application/api`：纯标准库 Command/Result/消费者 Port；Service 与 Host 窄服务由 Facade 组合。连接构造可信 RequestIdentity，payload 不允许自报 owner/Host。普通第二客户端与 stdio 复用同一 facade/DB。未实现后续领域用例，不做成功占位。
- `adapters/inbound/hap`、`stdio`：strict DTO 解码与实际装配的方法路由。实现 protocol.hello、service.health/status/diagnostics/shutdown、profile.status、host.attach/detach；hello 仅宣告这 8 个方法。host.invoke/queryReceipt 仅反向请求，标准同 ID response。普通客户端不能 attach/shutdown；Host 离线返回 HOST_UNAVAILABLE，不回落文件写入。
- `protocol/hap`：u32BE length 包含 kind；kind=1 JSON；冻结 maxFrameBytes=1,048,576（最大 payload=1,048,575）、batch=8、ID/method UTF8 bytes≤128；c:/s: 分向 ID。bounded 读、严格 envelope/错误类型、空帧/半帧/UTF8/JSON/kind/大小/batch 与方向错误确定拒绝；无 ID 通知不执行写/hello/shutdown。读取循环直接关联反向 response，不被业务等待阻塞。stdout 只有 framed 协议；stderr 只静态词汇与稳定错误，不回显正文、路径或秘密。

`contracts/hap/v0.1/` 包含 JSON Schema 2020-12、61 方法目录、共享 golden/invalid fixtures、生成器和独立 validator。生成器消费 foundation_client 冻结的 BotMethodMap，导出 122 个显式 params/result 形状与 Go wire DTO；未来方法不等于已宣告能力。全部 *Revision/*Epoch/seq/size 等 64 位字段为十进制字符串，时间为 UTC RFC3339。service.status/profile.status 自带 schemaVersion=1 和 profile.commandEpoch。API/DTO/CLI 字段已与 client 逐次确认，未写其文件。

### 风险证据与检查

真实命令/退出摘要在 `commands.json`；源码/依赖 SHA 在 `source-sha256.json`、`modules.jsonl`；原始日志在本目录。

| 检查 | 结果 |
| --- | --- |
| 初始 codec 红灯，明确故障输入 | exit 1；red-codec.log，错误输入原先被接受及分片失败 |
| foundation 完整 suite | exit 0；直接 `go test ./tests/contract/foundation/... -count=1 -v` 1.574s |
| foundation race | exit 0；foundation-race.log，24.013s，无 race 报告 |
| 全 Go module tests | exit 0；all-tests.log，foundation 1.690s |
| go vet ./... | exit 0 |
| 独立 jsonschema4.25.1 验证 | exit 0；schema-validation.log：122 params/result、3 golden、25 decimal 负向例 |
| Windows amd64 CGO0 编译（最终 unowned mutex 修正后） | exit 0；仅编译，不算 Windows 运行/ACL 通过 |
| T-27 五目标构建/本机 smoke | owner build_integration；其报告为权威，最终 Windows 小修正后已请求重建新 hash |

关键 suite 覆盖：真实 Profile 创建/关闭/重开；两个入口读同一 facade 元数据；普通客户端 Host/shutdown 拒绝与 payload identity 拒绝；两独立进程原路径/symlink/hardlink INSTANCE_CONFLICT 且首实例元数据不变；坏库/既有空文件/未来 schema 字节保留；外部祖先无 mkdir 副作用；真实 framed 反向 invoke 与 queryReceipt（等待时仍可 service.health）；EOF/父 stdin 保持打开时 shutdown；非法帧发脱敏 id:null error 后关闭；shared 3 正向/12 负向 goldens；1MiB 精确边界、超一字节及 batch8/9；Application 禁 SQL/SDK/HAP/Obsidian 依赖扫描。

非 race 固定 1MiB 帧 decode n=100，Linux/amd64、go1.26.10：p50=10.116858ms，p95=12.297933ms。据此与已有 Node 探针冻结 frame/batch 容量；它不是产品吞吐、长负载或性能 SLA 证明。race 测量显著变慢（p50=169.464486ms/p95=285.119501ms），不混入普通性能指标。

实际集成曾发现并修复两点：ncruces v0.35.6 的旧 embed import 会向 stderr 输出无用警告，已删除；真实继承 stdin 的 Read 不保证由另一个 goroutine Close 唤醒，导致 accepted shutdown 卡住。现在 reader 独立，主循环选择生命周期关闭；新增真实 Runner 进程保持父 stdin 打开的回归，5s 以内退出（实测0.41–0.93s），没有把 net.Pipe 通过冒充真实管道通过。准备过程中曾有 go 命令以错误 cwd 调用失败，随后全部使用 `go -C native/huhubot` 定位；这些失败不计为通过证据。

### Skill 执行与边界

已按 Map→dev→Ticket 读取并应用 dev 的 architecture/testing/licensing/build-and-release，先风险红灯再实现，真实存储/并发与契约验证结果如上。具体 Skill 摘要以 T-01 skill_bindings 为准，由 Lead 汇入正式 Skill Execution Records；本分片不改该正式记录。遵守 I 的分片写集、TDD、同工作区、原始结果/模型作者回执与独立 review 前等待合同；没有自审替代独立双轴审查。

未验证：macOS/Windows/Linux arm64 真机、Windows ACL/命名 mutex 真机与 macOS 文件锁运行；Obsidian/用户真实操作、模型/Provider/TLS/凭证；完整产品业务行为、后续迁移/备份/清除和真实 busy/幂等（由后续票承担，本票只提供 facade/DB/Host 接缝）。用户 LOG-051 已把真实操作留给用户，未做项如实保留，不删减后续 Spec 功能。

本分片启动的所有 suite、测试子进程和 writer 均已结束；没有网络监听器或受管 Runner 遗留。Go/contracts 源码已冻结，等待 Lead 的独立审查。建议下一步由 Lead 回读快照并完成双轴审查和 TS→Go/SQLite E2E 汇总；正式 T-01/AC 状态只由 Lead 决定。

## 问题与下一步

本分片无待实现的已知阻塞。源码保持冻结，等待 Lead 的独立审查和最终代码层验收；如有 finding，由 Lead 通过原任务协调修复。真实模型、Obsidian 操作与各目标 OS 真机验证未执行，边界已在上文列明，不将候选交回解释为这些项目通过。
