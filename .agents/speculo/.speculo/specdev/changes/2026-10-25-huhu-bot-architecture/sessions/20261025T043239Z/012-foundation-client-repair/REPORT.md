# T-01 TS 方法级运行时合同修复

Session: 20261025T043239Z
Task: 012-foundation-client-repair
Status: completed

## 聚焦交接

已修复 STD-03 / SPEC-03：真实 HapConnection 的出站请求、普通响应、hello、Host lease、反向 Host 参数与 Host 回执均在可信消费者前按唯一公共 schema 做运行时校验。保存审查原反例的真实红灯后，接入 Lead 批准的 Ajv2020 + ajv-formats；最终 39 项测试、159 个共享方法样本、生产/测试 tsc、定向 lint 与架构检查通过。全部源码 writer 与本任务 Runner 子进程均已停止，未提交、未修改正式状态。下一步由 Lead 固定这些源码/依赖/schema 输入，完成 T-27 构建汇合及独立补审；本报告 completed 仅表示修复候选交回。

## 产物与验证

- 实际作者：`/root/foundation_client`，未再次派遣。
- 唯一工作区：`/home/wta/orca/workspaces/obsidian-huhu/bot`；branch `NAMEWTA/bot`；HEAD/base `33c21e098ef3188cbab5a09f3e0a01fadb787715`。
- 6 个实际源码/测试修改见 [files-sha256.json](files-sha256.json)，依赖、schema、fixtures、Skill 和 api 输入见 [inputs-sha256.json](inputs-sha256.json)。`api.ts` 未改，SHA-256 仍为 `73dbd4b785dbd896affc5f22baa7fb3550343ffee26d972befc75daf3010eb13`。

### 修复实现

1. 新增 `core/protocol/method-validation.ts`：直接导入唯一 `contracts/hap/v0.1/schema.json`，使用 Ajv 2020-12 与 formats full 模式验证；不复制 schema，不维护第二张 61 方法字段检查表。关闭 coerceTypes/removeAdditional/useDefaults，开启格式与 ownProperties 校验，错误输出不携带原正文。引擎与方法 validator 按需创建，固定 v0.1 最多 122 个 params/result validator；测试证明 0 → 单方法 1 → 全版本 122，未知方法不会增加缓存。
2. `connection.ts`：方法 params 在分配 ID/pending/计时器与写出前校验。普通 result 在 resolve 前按 pending.method 校验，非法结果拒绝该 pending 并确定关闭、拒绝其他 pending、清理计时器；hello 继续使用 PROTOCOL_INCOMPATIBLE 失败语义。Host attach 只有完整 schema 通过后才安装 lease。
3. 反向 Host invoke/queryReceipt 参数在任何 Host callback 前完整校验 required、未知字段、nested decimal、类型、literal/enum 和 UTC 日期。Host 回执发送前也按相应 result 合同校验，并保留 effectId 关联检查；不合格回执只发送 INVALID_ARGUMENT/INVALID_HOST_RESULT，绝不输出 committed result。业务 lease/workspace/capability/期限检查仍位于 schema 检查后；无 ID 通知、资源边界、abort/EOF 清理与无自动重放保持。
4. `managed.ts`：按 Go owner 的 011 修复补充固定安全 startup reason `PROFILE_DB_HARDLINK_UNSAFE`；仍仅暴露固定 kind/reason 白名单，不开放 stderr 正文。新增真实 Runner 测试确认硬链接拒绝的精确错误、原 DB 字节保持、移除 alias 后原 Profile 可重开。
5. 更新三份相关测试并新增 `method-validation.test.ts`。原普通连接权限测试的空 capabilities 被公共 schema 明确禁止，故改用有效 `['note.read']` 输入继续真实触达服务端权限拒绝；没有把本地 schema 拒绝当成服务端身份检查成功。

### 红灯与恢复

- [runtime-red-complete.log](logs/runtime-red-complete.log)：原生产 HapConnection 的 8 个新增反例真实失败，未替换被测连接逻辑。非法 service.status 的 schema99/错误 state/数字 revision/2月30日/未知字段被 resolve；带有效 lease 的非法 invoke/queryReceipt DTO 实际触发 2 次 Host callback；unknown Host 回执被当 committed 输出；非法本地 params 已发出并接收成功响应。最初的 [runtime-red.log](logs/runtime-red.log) 也保留；随后仅让出站反例明确收到回包，避免靠未回包超时判红。
- 接入 validator 后原反例转绿，未删除输入或放宽断言；初次回归发现 hello 错误 reason 变化，已在生产代码恢复原 PROTOCOL_INCOMPATIBLE 语义，见 [runtime-green-initial.log](logs/runtime-green-initial.log) 与 [runtime-green.log](logs/runtime-green.log)。
- [startup-reason-red.log](logs/startup-reason-red.log)：新 Go 拒绝已发生，但 TS 未识别新安全 reason，仅报 STDOUT_EOF；补白名单后真实进程用例转绿。
- [ordinary-invalid-fixture.log](logs/ordinary-invalid-fixture.log)：完整 runtime 校验准确提前拒绝旧空能力列表；修正测试为合法请求后，依旧断言真实 Go CAPABILITY_DENIED，没有改成接受本地 INVALID_METHOD_PARAMS。

### 最终检查

| 命令 | 退出 | 证据 |
| --- | --- | --- |
| `pnpm exec vitest run src/modules/huhubot --reporter verbose` | 0 | 5 文件、**39 tests**；[unit-final.log](logs/unit-final.log) |
| `pnpm exec tsc -noEmit -skipLibCheck` | 0 | [tsc-production.log](logs/tsc-production.log) |
| `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` | 0 | [tsc-test.log](logs/tsc-test.log) |
| `pnpm exec eslint src/modules/huhubot/core/protocol src/modules/huhubot/platform/desktop/transport --max-warnings 0` | 0 | 定向零警告；[lint.log](logs/lint.log) |
| `pnpm test:architecture` | 0 | 无区域、宿主包、desktop、barrel 或 cycle 违规；[architecture.log](logs/architecture.log) |
| `node <本任务>/measure-runtime.mjs` | 0 | 纯 browser 平台 bundle 与局部调用实测；[runtime-measurement.json](logs/runtime-measurement.json) |
| `node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/orca/workspaces/obsidian-huhu/bot --scope-root .agents/speculo/.speculo/specdev/changes/2026-10-25-huhu-bot-architecture --session 20261025T043239Z --task 012-foundation-client-repair --stage return` | 0 | errors/warnings 为空；[validate-return.log](logs/validate-return.log) |

**39 tests 与 159 样本的含义不同：** 两个 validator 测试之一使用真实 Ajv runtime 消费 Go owner 生成的 **159 个方法样本（122 正向、37 负向）**，覆盖全部 61 方法的 params/result，逐例断言有效性并确认输入未被修改；这些不是另报 159 个 Vitest tests。其余真实连接测试覆盖实际投递/拒绝边界，包括 hello/lease unknown、非法真实日期和 non-UTC offset。既有 3 个逐字节有效 golden 与 12 个 malformed frame golden 继续通过。

**真实 TS → Go 回归：** Runner suite 用固定 Go 1.26.10、CGO=0 从当前 Go cmd 构建，在隔离临时本机 Profile 下经过生产 desktop transport/HapConnection，验证 hello、health/status、Host attach/detach、未装配方法的真实 METHOD_NOT_AVAILABLE、owner shutdown、Profile 重开、竞争 writer/普通连接权限、非法帧后重开、有界 writer，以及新 hardlink 拒绝恢复。测试均等待进程退出并清理临时目录。Host 反向非法输入与回执错误由生产 TS connection 配 framed peer 直接触达真实 Host callback 检查，未调用真实 Obsidian 或模型。

### 依赖选择与测量

Lead 已批准 T-27 精确安装 runtime `ajv@8.20.0` 和 `ajv-formats@3.0.1`，本分片未写 package/lock/notices。维护活动与许可证来自 [Ajv v8.20.0 官方发布](https://github.com/ajv-validator/ajv/releases/tag/v8.20.0)、[固定 Ajv MIT](https://raw.githubusercontent.com/ajv-validator/ajv/v8.20.0/LICENSE)、[固定 formats MIT](https://raw.githubusercontent.com/ajv-validator/ajv-formats/v3.0.1/LICENSE)；安装文本 SHA 与官方文档见 [dependency-research.json](dependency-research.json)。比较 [standalone 编译方案](https://ajv.js.org/standalone.html) 后，Lead 选 runtime 直接消费唯一 schema，避免另一份生成 JS/声明与许可分类的维护接缝；只编译使用的方法部分。

[测量脚本](measure-runtime.mjs) 用仓库 esbuild 将 isolated BotClient 以 browser 平台/CJS/ES2021/minify 构建，**external imports 为空**，证明该模块的实际 bundle 无 Node 外部依赖。与独立 reviewer 留存、同样 minify 的旧冻结 bundle 比较：11,636 → 213,836 B（增加 202,200 B）；gzip 4,185 → 49,767 B。单个冷 VM 的首次 hello params 校验约 77.99 ms、result 约 4.20 ms；随后 1000 个合成热 health 调用平均约 0.019 ms/次。这里包含引擎/可信 schema 初始化与相应方法编译；不是 main.js 大小或真实 Obsidian 性能，不用单样本宣称性能提升。性能数据留给 T-26，没有调整现有预算或放宽验证。

### Skill 执行

实际调用当前 dev（Map7/T-01 绑定）与 architecture/testing/licensing/build-and-release：host-free runtime 校验、生命周期/失败资源清理、受管 stderr 接缝、依赖许可研究与定向行为/类型/lint/架构验证；适用范围通过。完整插件 build、全仓 lint/notices/五目标资产与独立复审由 Lead/T-27 汇合。本任务没有写 UI、Go、公共 API、schema、正式状态或共享构建产物。

## 问题与下一步

无剩余已知 STD-03 / SPEC-03 实现缺口；请 Lead 以本报告源码/schema/依赖摘要固定输入，安排独立补审。其余 STD/SPEC-01、02、04 的正式验收由 011 Go owner 与 Lead 负责，本分片只消费其 schema 和新稳定 startup reason。

尚未执行真实模型、Obsidian 用户操作和 Windows/macOS 真机；按用户口径留作后验。TS/Go 联合反向 Host harness 若由 Lead 维护，需在新输入上重跑；本报告没有把 framed 内存 peer 当作真实宿主运行。完整共享 build/notices/发行资产由 T-27 在已冻结源码上执行，未把缺少这些 owner 回执记成本分片已通过。
