# T-01 Host 租约期限修复与 Unicode 联调

Session: 20261025T043239Z
Task: 017-foundation-lease-repair
Status: completed

## 聚焦交接

已修复 014 的 STD/SPEC-R2-01：Host 租约安装与每次 invoke/queryReceipt 派发都要求 Date.parse 结果为有限数值且严格晚于当前时间。保留真实连接红灯后完成最小修复；唯一 schema 仍接受原 RFC3339 闰秒值，没有收窄公共时间格式。016 Go owner 解除冻结并完成 Unicode 修复后，已补真实 TS → Go 的四字段 ASCII/中文/补充平面字符边界联调。全部源码 writer 与测试子进程已停止，最终 46 tests、生产/测试类型检查、定向 lint 和架构检查通过，候选交回 Lead 固定输入并安排 018 独立补审。

## 产物与验证

- **实际作者：** `/root/foundation_client`，未再次派遣；没有提交、推送、发布或修改正式 Ticket/Map/Evidence。
- **Workspace：** `/home/wta/orca/workspaces/obsidian-huhu/bot`，`NAMEWTA/bot`，HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。
- **修改范围：** `core/protocol/connection.ts`、`core/protocol/connection.test.ts`、`platform/desktop/transport/runner.test.ts`，全部在 huhubot 模块内。精确源码 SHA-256 见 [files-sha256.json](files-sha256.json)，schema、API、validator、Go 联调与 Skill 输入见 [inputs-sha256.json](inputs-sha256.json)。

### 实现与红绿证据

`connection.ts` 使用统一 `activeHostLease` 判断：期限必须 `Number.isFinite(expiresAt) && expiresAt > Date.now()`。`host.attach` 的 schema 合法结果若无法安全比较或已经过期，拒绝 pending、清理连接与计时器，错误仅为固定 `INVALID_HOST_LEASE`；不安装该租约。每次反向 invoke/queryReceipt 在既有 lease ID、workspace 和 capability 检查中重新使用同一期限判断；不更改其他授权边界或回执数据合同。

[lease-red.log](logs/lease-red.log) 保存原生产连接的四个真实失败：

- `2016-12-31T23:59:60Z` 经同一 schema 校验成功、Date.parse 为 NaN；原连接安装后实际触发 invoke 和 queryReceipt 共 **2 次** Host callback，预期为 0。
- 普通过去值 `2016-12-31T23:59:59Z` 虽没有派发 Host，原安装仍未失败；修复后也明确拒绝安装。
- 两个派发用例先证明合法未来租约各可正常调用一次，再把时钟推进到到期点，验证到期拒绝；随后对已有公开 lease DTO 设置同一 schema 合法的闰秒值，原 invoke/queryReceipt 又分别错误进入 callback。修复后 callback 次数不再增加，返回固定 CAPABILITY_DENIED/INVALID_HOST_LEASE。

红灯命令 `pnpm exec vitest run src/modules/huhubot/core/protocol/connection.test.ts -t 'comparable|expired or non-comparable'` 实际退出 **126**，4 failed；未选中的旧测试仅在此定向红灯命令中排除。修复后整个 core 的 36 tests 通过，见 [lease-green.log](logs/lease-green.log)。日期对照使用固定 Date.now，Date.parse、schema validator、HapConnection 和 Host callback 均为真实逻辑，未 mock 被审期限判断。错误字符串断言不包含原期限值；失败安装及拒绝派发均确认计时器释放。

### Unicode 真实 TS → Go 联调

016 owner 通知 Go 两个生产文件完成并冻结后，Runner suite 才构建该 Go 源码。新增三个矩阵 tests 分别使用 `x`、`测`、`😀`，每组检查以下四字段的 128/129 字符边界，共 **24 个语义检查**：

1. `protocol.hello.client.name`
2. `protocol.hello.client.version`
3. `host.attach.workspaceId`
4. `host.attach.capabilities[0]`

128 个字符均从生产 TS validator、HapConnection、managed stdio transport 到达真实 Go Runner 并成功；hello 后 health 正常，Host 注册回读 workspace/capabilities 与原值一致，随后真实 detach。129 个字符由正常 TS 方法 validator 在发送前返回 INVALID_METHOD_PARAMS，Host 注册状态保持未附着。这里没有假称 129 已穿过 TS 前置验证到达 Go：服务端同一 129 输入经真实 router/application 拒绝，以及 wire ID/method 的独立 128/129 UTF-8 **字节**边界，由 016 Go owner 的原始回归负责；本任务不改变 codec、schema 或 Go 代码。

### 最终验证

| 命令 | 退出 | 观察与日志 |
| --- | --- | --- |
| `pnpm exec vitest run src/modules/huhubot --reporter verbose` | 0 | **5 文件、46 tests** 全部通过；[unit-final.log](logs/unit-final.log) |
| `pnpm exec tsc -noEmit -skipLibCheck` | 0 | [tsc-production.log](logs/tsc-production.log) |
| `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` | 0 | Unicode 测试加入后最终重跑；[tsc-test.log](logs/tsc-test.log) |
| `pnpm exec eslint src/modules/huhubot/core/protocol/connection.ts --max-warnings 0` | 0 | 唯一修改生产文件，零警告；[lint.log](logs/lint.log) |
| `pnpm test:architecture` | 0 | 1198 modules，无区域/宿主包/desktop/barrel/cycle 违规；[architecture.log](logs/architecture.log) |
| `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/bot --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture --session 20261025T043239Z --task 017-foundation-lease-repair --stage return` | 0 | errors/warnings 均为空；[validate-return.log](logs/validate-return.log) |

全套 46 tests 仍包含原有 159 个方法样本的 runtime 校验（122 正、37 负，包含在对应测试中，不额外计作 159 tests）、共享 frame golden、hello/普通结果/Host 参数及回执拒绝、受管环境/竞争 writer、权限、stdout 错误、Profile 重开、hardlink 拒绝及恢复。真实 Runner 用固定 Go 1.26.10、CGO=0 在隔离临时 Profile 构建运行；所有子进程均等待退出并清理临时目录。

### 合同与 Skill

- 当前 dev 及 architecture/testing 参考摘要与前轮一致，按任务允许复用；实际执行本范围生命周期/权限消费修复、红绿行为验证、类型/lint/架构检查。未改 UI，不新增依赖，不触碰根构建产物。
- `schema.json` SHA-256 仍为 `af806e4eadef208b717552a95edb0d62a10db5f4a12a987e3088c4368fb2683b`；`api.ts` 仍为 `73dbd4b785dbd896affc5f22baa7fb3550343ffee26d972befc75daf3010eb13`。schema 的 date-time + UTC Z 合同保留；解析失败拒绝的是该租约的调用资格，没有暗改 RFC3339 接受语言。
- 没有重复修改或重新宣称 008 原四项问题的修复；其既有通过证据由 Lead 按输入有效性复用。完整插件 build、全仓 lint 与最终整合归 Lead 串行执行。

## 问题与下一步

本任务无剩余已知实施缺口。请 Lead 以源码/输入摘要固定新快照，合并 016 的服务端 Unicode 红绿证据后交 018 独立复审；completed 仅为候选返回，不代表 T-01 已通过正式代码门。

真实 Obsidian、Provider 模型及用户目标 OS 操作未执行，按用户口径留后验。TS/Go 联合反向 Host harness 如由 Lead 维护，应以新 connection.ts 输入重跑；本任务不把 framed peer 的期限反例当作真实 Obsidian 操作验收。
