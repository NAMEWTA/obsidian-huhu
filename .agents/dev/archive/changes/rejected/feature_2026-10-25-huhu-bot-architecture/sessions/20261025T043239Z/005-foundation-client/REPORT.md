# T-01 TS BotClient 与受管 stdio 分片报告

Session: 20261025T043239Z
Task: 005-foundation-client
Status: completed

## 聚焦交接

已完成本分片的具体公共 BotClient/API、host-free HAP codec/连接与受管桌面 stdio transport，和 Go owner 共同冻结同一 schema/CLI。最终定向 22 测试、生产与测试 tsc、定向零警告 lint、架构检查均通过，shared malformed golden 已经历实际红灯并精确对齐转绿。全部源码 writer 已停止；completed 仅表示候选交回，T-01 正式验收和独立审查由 Lead 负责。下一步由 Lead 固定本交付快照、补 TS/Go 联合反向 Host 集成 harness 并完成独立审查及 T-27 构建汇合。

## 产物与验证

- **实际作者：** /root/foundation_client；未再次派遣。
- **Workspace：** /home/wta/orca/workspaces/obsidian-huhu/bot；NAMEWTA/bot；HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715。
- **写入状态：** 全部源码 writer 已停止，无提交、推送、发布或正式 Ticket/Evidence 写入。

### 实际交付

1. `src/modules/huhubot/api.ts`：只导出数据类型、具体方法合同与 ServiceKey；完整 61 方法由 BotMethodMap 表达，无任意字符串/任意返回值的公共 Call API。BotClient 暴露明确分组；Host invoke/queryReceipt 仅为受信反向入口。保留完整 Run 状态、existing/temporary 派遣、三模型协议、全局记忆增删改提案、命令代数与 decimal 字符串。
2. `src/app/contracts/module.ts`：只增加 `huhubot` ModuleId 类型，不在 MODULE_IDS 注册或激活模块。
3. `core/protocol/codec.ts`：host-free 的增量 u32BE/kind=1/UTF-8/JSON-RPC 编解码；分片、多帧、1 MiB 总帧、batch 1–8、字符串分方向 ID、128 UTF-8 字节、object params、严格 envelope/error 形状与错误 kind。长度在分配 body 前检查，至多保留一帧。非法帧和半帧 EOF 明确失败。
4. `core/protocol/connection.ts`：注入计时器，hello gate 与兼容检查；默认 64 个 pending、8 个 Host 请求、10 秒请求期限；abort/timeout 不重放命令或换幂等 key；EOF/协议错误关闭并拒绝全部 pending，释放监听和计时器。反向 Host 验证本连接取得的 lease/workspace/capability/有效期，保留请求 ID；读循环不等待 Host handler，慢 handler 被 abort 并关闭连接。
5. `platform/desktop/transport/managed.ts`：只从绝对 binary、明确 cwd 与受控 argv 启动，禁用 shell/PATH 回退；环境仅复制 platform allowlist，不继承 Provider/CLI 密钥、PATH 或 NODE_OPTIONS。默认 writer 上限 32 帧、约 2 MiB，超限失败并关闭；父 stdin EOF、有界 TERM/KILL 与退出 Promise 支持回收。stderr 输入有界，正文不暴露；只接受固定 kind/reason 白名单用于 startup INSTANCE_CONFLICT 等诊断。
6. 三个就近测试文件及真实 Runner 测试覆盖上述行为。完整修改文件与 SHA-256 在 [files-sha256.json](files-sha256.json)，实际合同/依赖/Skill 输入在 [inputs-sha256.json](inputs-sha256.json)。

### 冻结接缝

与 /root/foundation_go 协同冻结，未建立第二套协议。唯一 schema/fixture owner 为 Go 分片，schema 从本公共 BotMethodMap 导出。最终 api.ts SHA-256 为 `73dbd4b785dbd896affc5f22baa7fb3550343ffee26d972befc75daf3010eb13`。

- CLI：`huhubot --stdio --profile <absolute-dir> [--managed]`。测试仅使用隔离临时 HOME/XDG_STATE_HOME/LOCALAPPDATA 与 OS managed profiles root。
- hello：protocolVersion 0.1、schemaVersion 1、持久 Profile 元数据、实际 capabilities 与共同帧限制。service.status/profile.status 均有 schemaVersion。
- ID：c:/s: 后至少一个字符，可以包含 Unicode/换行；上限按 UTF-8 字节数计算。id:null 只用于不能关联请求的协议错误。
- 全部普通 params 为 object；无 ID 通知不执行写入或 Host。
- shared golden 的 3 个有效样本逐字节比较，12 个负向样本与 Go 对同一 reason 断言一致。
- 未装配业务方法由真实 Runner 返回 CAPABILITY_DENIED/METHOD_NOT_AVAILABLE，hello 不冒报能力。

### 检查与故障证据

| 实际命令 | 退出 | 结果 / 日志 |
| --- | --- | --- |
| `pnpm exec vitest run src/modules/huhubot --reporter verbose` | 0 | 4 文件、22 测试通过；[unit-final.log](logs/unit-final.log) |
| `pnpm exec tsc -noEmit -skipLibCheck` | 0 | 生产类型检查；[tsc-production.log](logs/tsc-production.log) |
| `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` | 0 | 测试类型检查；最终期望修正后再跑；[tsc-test.log](logs/tsc-test.log) |
| `pnpm exec eslint src/modules/huhubot src/app/contracts/module.ts --max-warnings 0` | 0 | 定向零警告；[lint.log](logs/lint.log) |
| `pnpm test:architecture` | 0 | 1197 modules，无区/宿主/desktop/barrel/cycle 违规；[architecture.log](logs/architecture.log) |
| `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/bot --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture --session 20261025T043239Z --task 005-foundation-client --stage return` | 0 | errors/warnings 均为空；[validate-return.log](logs/validate-return.log) |

真实进程测试在 beforeAll 使用固定 Go 1.26.10、CGO_ENABLED=0 构建当前 Go cmd，经过本生产 transport/client 完成 hello、health、status、Host attach/detach、确定的未实施方法拒绝、owner shutdown、退出及持久 Profile 重开。竞争 Runner 返回 INSTANCE_CONFLICT，首进程继续 health；普通非 managed 连接不能注册 Host 或 shutdown。非法帧收到标准协议错误后断开，重开仍成功；有界 writer 超限失败。临时测试进程均等待退出，Profile/二进制目录由测试清理；没有保留后台 Runner。

连接测试使用真实 TS codec/connection 与 framed 内存 peer，验证反向 Host invoke/queryReceipt 同 ID response、Host 等待时 health response 仍及时关联、无 lease/无 ID/过限拒绝、超时 abort、断线全 pending 失败、错误 ID 方向与半帧 EOF。它验证真实 TS 产品逻辑，不代替 Obsidian Host 或真实模型操作。

失败历史保留：初始新 codec/connection/transport 尚不存在时的定向 suite 因缺模块失败；实现后分别转绿。共享负向样本新增后先运行红灯，准确暴露 `FRAME_EMPTY` 与旧 TS `INVALID_LENGTH` 不一致，见 [shared-invalid-red.log](logs/shared-invalid-red.log)；随后分离 INVALID_UTF8/INVALID_JSON 并统一 FRAME_EMPTY/BATCH_LIMIT/INVALID_ID/INVALID_ENVELOPE，全部共享样本转绿。最终全跑还发现旧单测保留 INVALID_REQUEST 期望（多行替换遗漏），原失败见 [unit-old-reason-failure.log](logs/unit-old-reason-failure.log)，修正为冻结的具体 reason 后 22/22 通过。没有删除或放宽故障输入。

### Skill Execution Records

- **ID / phase / operation：** dev / implement / TS 公共边界、framed stdio、受管进程与失败清理实现及检查。
- **status：** 本分片适用检查 passed；完整 build、全仓 lint、Go/许可/发行工程以及独立审查由 Lead 与 T-27/Go owner 汇合。
- **初始输入摘要：** T-01 原绑定 dev `1003e1e151fe675ad778aeb42f1b1e8e432ca3d7d1b46265f96b7512a88815a6`。
- **当前摘要：** T-27 更新后已回读差异，dev 为 `5df9ccddd677ad4cea397a31e7e668d97b125e8ae26b3c72c38d791be9066293`；新增 Go/Profile 工程事实与检查入口，没有改变本分片 TS 行为合同。原 Ticket 的摘要重绑归 Lead；当前参考摘要见 inputs-sha256.json。
- **可回读证据：** 本报告、全部 9 个交付文件摘要、上述原始检查日志；无 Node/Electron/Obsidian 包进入 core，无新增依赖。

## 问题与下一步

- 未运行真实 Obsidian、真实模型凭证/请求或用户操作；依据最新用户口径由用户后续执行，不宣称已验。
- TS 与真实 Go 进程的反向 Host 联合 harness 未单独搭建；本分片真实 TS 反向路径与 Go owner 的真实 stdio Server.Invoke/QueryReceipt 路径分别受测，数据与帧共同 fixture 一致。Lead 可据独立审查决定是否补充该更强联合验证。
- Windows/macOS 真机、发行 binary 安装/签名/校验、业务方法实现、流式持久事件与 UI 装配属于后续票，未把基础能力当全产品完成。
- 未自行运行 pnpm build 覆盖共享产物；源码已冻结，T-27/Lead 执行共享构建和 notices，并负责固定最终整合快照。
