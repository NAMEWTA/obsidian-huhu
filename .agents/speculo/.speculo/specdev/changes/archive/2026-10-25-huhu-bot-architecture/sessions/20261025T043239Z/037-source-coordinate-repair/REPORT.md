# 来源 UTF-16 坐标边界候选修复

Session: 20261025T043239Z
Task: 037-source-coordinate-repair
Status: completed

## 聚焦交接

已修复035 STD-02/SPEC-02：唯一生成器将原文 UTF-16 `start/end` 坐标上限独立设为1048576，停止与正文读取字节预算共用131072。可捕获原文的 UTF-8 容量为1 MiB；UTF-16 code unit 数不会超过其 UTF-8 字节数，因此 `[1048575,1048576]` 是合法 ASCII 末尾选区。Host read/search 单次65536字节、其它计数/字节预算、wire版本、业务/API、依赖均未放宽或改动。

同一冻结 TS 生产输入的实际 captureSelection→HostReadService.read，修复前131072末尾1字节正常、131073拒绝；仅换共享 schema 后相同输入转绿，1 MiB原文末尾1字节也返回 `Z`。已给038通知 schema冻结点，126个方法形状不变，共享样本增至226；本片所有源码/生成输出已停写，只交回候选，待Root汇合038/039并独立复审。

## 产物与验证

### 精确写集与快照

仅生产修改 `contracts/hap/v0.1/generate.mjs` 及其生成输出中的 `schema.json`、`fixtures/methods.json`、`native/huhubot/internal/protocol/hap/schema_generated.json`。另外三份既有生成输出 `contracts/hap/v0.1/methods.json`、`fixtures/golden.json`、`native/huhubot/internal/protocol/hap/methods_generated.go` 由同一生成器重建后字节未变。未手改生成物；未修改 TS 产品/测试、Go业务/永久测试、SQL、锁、依赖、正式状态或他人报告。

原 foundation `TestSharedMethodSchemas` 与实际 TS `MethodValidation` 已直接消费新增共享样本，无需再造平行字段表或重复测试。生成入口新增52例：6处SourceRange载体的原边界/相邻边界/最大合法坐标，以及 start/end 越界、非整数、负数；另有 read/search 的65536合法/65537拒绝对照。SourceRange 的业务非空、正文hash与surrogate规则未由本片改动；038补永久真实捕获链回归。

logs/source-manifest.json（历史日志已清理：`logs/source-manifest.json`） 记录7个自有输入/输出的前后SHA，tree SHA256 `f4a0eba530c925c22742e6b2f6ce38b36930694c9fdedb714581cc20abdfaf5a`。关键SHA：

- generator：`d5522bfacb7f19ac62b2b9730be813933d299c7a24afb48572809f72d7902c5a`。
- 唯一/public与Go嵌入schema：`63d16a0a891b14d6c685514d57913ccccbaac59c184f9b76b45d8a6779db9e4e`。
- 226共享样本：`67e7757e5de642810e3585780be9e6626a8638ff93ad6b5c8066012a27308d48`。

logs/schema-semantic-diff.json（历史日志已清理：`logs/schema-semantic-diff.json`） 对照035冻结 schema，18处差异全部仅为 `start/end.maximum:131072→1048576`，无其它合同差异。logs/input-hashes.json（历史日志已清理：`logs/input-hashes.json`） 记录实际TASK、035 REPORT/raw-probes、原独立range探针及原输出SHA；对应035 review-input-r1仍为 `2a43d12b56b6e68c676ef89348295bbacc5ad3e496d5599e0fece0846968401d`。原035文件与 `/tmp/huhu-chat-review` 均只读保留。

### 实际红绿及检查

| 输入/命令 | 实际结果 | 证据 |
| --- | --- | --- |
| 隔离复制035 range probe，保留131072/131073相同捕获输入，仅把期望改为两者都应返回Z | 有效red；131073实际 `INVALID_HOST_PARAMS`，断言失败，Node实际退出126（原035也记录该非零退出行为）。外层最初预期exit1而报失败，没有把该外层退出码判断当产品根因。 | [logs/02-coordinate-red.log](logs/02-coordinate-red.log)，原探针/输出副本 `035-original-range-probe.*` |
| 同一冻结 TS 源码和同一回归脚本，仅换新schema并重bundle后运行 | exit0；两例均返回Z，所有service dispose | [logs/04-probe-build-green.log](logs/04-probe-build-green.log)、[logs/05-coordinate-green.log](logs/05-coordinate-green.log) |
| 同一真实捕获链追加1048576原文末尾range[1048575,1048576]，maxBytes1 | exit0，仍仅返回Z | [logs/06-coordinate-maximum.log](logs/06-coordinate-maximum.log) |
| `node contracts/hap/v0.1/generate.mjs` | exit0，63 methods /226 cases | [logs/03-generate.log](logs/03-generate.log) |
| `go test -mod=readonly ./tests/contract/foundation -count=1` | exit0，3.333s；实际Go runtime schema消费全部226例，既有帧/日期/Unicode/实例锁/背压边界保持 | [logs/07-foundation.log](logs/07-foundation.log) |
| `pnpm exec vitest run src/modules/huhubot/core/protocol/method-validation.test.ts` | exit0，1文件2tests；真实Ajv消费者验证全部226例，无coerce/输入修改，126形状缓存界限保持 | [logs/08-ts-schema.log](logs/08-ts-schema.log) |
| 固定 venv Python `contracts/hap/v0.1/validate.py` | exit0，126 method shapes、226 samples、25 decimal negatives、3 frame goldens | [logs/09-python-schema.log](logs/09-python-schema.log) |
| `go vet ./internal/protocol/hap ./tests/contract/foundation` | exit0，无诊断 | [logs/10-vet.log](logs/10-vet.log) |
| `node scripts/verify-huhu-bot-architecture.mjs` | exit0，24 production files | [logs/11-architecture.log](logs/11-architecture.log) |
| 隔离临时目录运行唯一generator，逐字节比较六输出 | exit0，全部相同 | logs/check-generated.py（历史日志已清理：`logs/check-generated.py`）、[logs/12-generator.log](logs/12-generator.log) |

实际TS探针路径见 logs/probe-location.json（历史日志已清理：`logs/probe-location.json`），使用受控外部 Obsidian 类/editor 边界，生产 capture/HostReadService/validator 均是真实代码。红绿之间冻结 TS 字节不变，SHA清单见 logs/frozen-ts-probe-inputs.json（历史日志已清理：`logs/frozen-ts-probe-inputs.json`）；没有修改原035探针来伪造通过。实际子进程均同步Run/Wait，probe中service.dispose清理；logs/13-probe-stopped.json（历史日志已清理：`logs/13-probe-stopped.json`） 确认自有隔离目录无活动进程。

复用已读 dev/I、T01/T05与风险/测试规则，本次没有需要新增开源依赖或设计的陌生点。作者为 `/root/foundation_go`；沿Lead派遣请求的 `gpt-6.1-sol/xhigh` 偏好，仅是请求记录，不冒称实际底层model attestation。

## 问题与下一步

无已知本片剩余缺陷；schema接缝已冻结并通知Root/038。038负责对象身份修复及永久真实长选区消费者回归，039负责Grant摘要，两者不是本片修复或验证的冒名产物。Root在三片停写后统一重验和独立补审；本片检查通过不替代035未参与实现者复审。

本片未重跑完整Go/插件build、真实模型、OS keyring、用户Obsidian/目标OS操作；前两者由Root按合并后的影响选择，后者为既定user-owned/not-run。没有增加审批、重跑历史D-Bus探针、提交/推送/发布/归档。所有本片writer已停止，无未Wait子进程；原独立失败材料保持不变。return结构校验见同目录日志。
