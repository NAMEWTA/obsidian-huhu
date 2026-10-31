# T-16 repair-1 独立双轴复核

Reviewer: native:/root/review_code
Implementers: native:/root/implement_t01
Mode: native
Input: evidence/T-16-review-input-r2.json
Input-SHA256: c995e87d60d6e9e109a4456f7eb4fd1cb184f4889b223ffc6f31c14678ebf6ac
Observed: 本 reviewer 未参与实现或修复。本轮只读审查代码，唯一新持久写入为本报告；保留原报告，未改源码、正式 Evidence、Ticket/Map、生成物，未再次派遣。

## 固定输入与范围

开始及结束均重新计算完整输入对象 JSON.parse 后 JSON.stringify 的 UTF-8 SHA256，如上。17 个 working_snapshot 文件的原文字节和模式、47 项 sources 原文字节逐一匹配；HEAD/base 均为 `265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa`，`git ls-files --stage -z` 和冻结 tracked_diff_command 的实际输出摘要相同，无范围内漂移。

相对 r1 仅四个文件变化：`core/hunk-restore.ts`、`core/hunk-restore.test.ts`、`services/restore-service.ts` 和新增 `test/sync/git-hunk-newlines.test.ts`；全部实际阅读。其余 13 个代码文件和原 46 项来源摘要不变，新增来源为原独立报告。复用 r1 已完成且未失效的完整 T16/AC-017、Issue #2 E/F、ADR、DESIGN、SRC-010/Goal 与 dev/ui/公共 code-review 标准、身份/ABA、异步基线及恢复生命周期检查；本轮重新检查修复涉及的纯算法、真实调用者、转换依赖和副作用顺序，未因仅四文件变化跳过其真实消费者。

## standards-output

Reviewer: native:/root/review_code
Axis: standards
Result: pass
Input-SHA256: c995e87d60d6e9e109a4456f7eb4fd1cb184f4889b223ffc6f31c14678ebf6ac
Observed: 原 STD-01 已消除，本轮必要边界检查未发现新增需请求修改的问题。

- `core/hunk-restore.ts:53` 在原完整证明/选择验证之后，分别按 canonical display 范围构造授权预期、按原始范围构造替换正文；再将实际 writer 转换后的结果投影并与授权预期逐字比较。新边界合并、删除未选正文或其他不保真转换均抛出 `versioning.restore.hunks-unavailable`，不扩展选择范围，不猜测补写正文。
- `services/restore-service.ts:116` 仅在 hunk 分支将当前 document 的真实 `documents.editableText` 作为纯转换函数注入。core 不反向导入 host/Obsidian，默认转换仍为 identity；原范围/BOM/CRLF/UTF-16/EOF 证明未被放宽。whole/copy 继续沿原分支直接对完整历史正文做原生转换。
- 拒绝发生于 plan 对象的 afterText 计算中、`plans.set` 之前；此前只有 initialize、目标 revalidate、仓库基线读取等只读动作。没有进入 apply 的持久 hold、checkpoint 对象/receipt、participant 或正文写入。新增真实消费者测试同时断言内存存储无写入、原正文不变及事件列表为空，未只断言抛错文字。
- 通过保真检查的计划仍进入原 checkpoint lease、document exclusive、origin/document/repository 重校验、prepared/applying→apply→verify→receipt 和批注/undo 合同；本修复没有另建写入路径或放松授权门。

Findings: []

## specification-output

Reviewer: native:/root/review_code
Axis: specification
Result: pass
Input-SHA256: c995e87d60d6e9e109a4456f7eb4fd1cb184f4889b223ffc6f31c14678ebf6ac
Observed: 原 SPEC-01 的实际反例和必要混合换行边界满足修复条件；未发现本修复引入的规范偏离。

| 原问题或验收边界 | 实际复核结果 |
|---|---|
| STD-01 / SPEC-01，单 CR 与未选 LF 合并删除空白行 | 使用真实 installed CM `calculateDiff`、`restoreHunks`、`applySelectedHunks` 和 `DocumentMutationCoordinator.prototype.editableText` 重放 A=`"old\r\rkeep"`、B=`"new\n\nkeep"`。CM 仍给出 precise=true 的 `0:4:0:4`，修后明确抛出 hunks-unavailable；真实 RestoreService.prepare 回归证明计划不发布、正文/存储/hold/participant 均无副作用。没有把输入改成不同换行格式来隐藏原反例。 |
| 相邻混合 EOL 的单选/多选 | 新生产链测试逐一遍历 `old\r\r`、`old\r\r\n`、`old\r\n\r\n`、`old\n\r`、`old\r\n\n`，每种执行首块、末块、双块。不可保真的首块/双块拒绝；同一历史中安全的末块仍可恢复。合法组合 afterText 与再次 editableText 后均等于授权预期，未选择的首/末正文和空行保持。 |
| 合法 partial / receipt / undo | 真实 RestoreService、CheckpointStore 及原生转换，显式内存 IO 端口：合法选择成功写入、selectedHunks 记录正确、beforeObject 保留完整原 draft、participant/hold 各按原协议调用，undo 恢复整个原 draft。原实际页面的选择、取消、交换、强制 checkpoint 失败与撤销回归再次通过。 |
| BOM/CRLF/UTF-16/EOF | core 原测试及真实 installed CM 映射测试通过，覆盖 BOM、中文/emoji、多块、插入/删除和 one-past-EOF；新增转换测试确认未选中文/emoji不能被转换器删除后仍获准。 |
| whole restore / copy 不收缩 | 同一不可安全 partial 的历史原文仍可 whole restore，native LF 结果保留两个换行；copy 保持其原文格式，原当前正文不变。两种模式实际 apply/undo 通过，未将 hunk 限制扩展到原完整恢复/副本。 |

AC-017 的按块精确、粗略/不完整拒绝、固定 B 与来源约束仍成立。首次/refresh 异步取消、source id/path/leaf/generation、documentKey/全部 buffer generation、同字节替换/ABA 门、canonical 跨交换、其他模式权限、原 whole/copy/pair 能力均未修改，沿 r1 固定代码及回归证据复用。F 阅读渲染/历史附件/图片/blame/批量的原按需条件未变，仍未支持且未宣称通过；不新增必需范围。

T16 ready=false/design_ref=null 与扩展原型未集中批准的事实保持；本轮代码授权仍来自 SRC-010/Goal，继承 PAGE-003 系统。此 pass 是固定代码的两轴结论，不伪造原型批准或真实视觉验收。

Findings: []

## 本轮独立执行与限制

实际执行：

```text
pnpm exec vitest run --no-file-parallelism
  src/modules/versioning/core/hunk-restore.test.ts
  src/modules/versioning/ui/hunk-mapping.test.ts
  src/modules/versioning/services/restore-service.test.ts
  src/modules/versioning/ui/history/hunk-restore.dom.test.tsx
  test/sync/git-hunk-newlines.test.ts
```

结果：5 suites / 40 tests，exit0，2.27s。新增宿主转换测试仅直接调用纯 editableText 方法，不启动真实 Obsidian。

另用内存 esbuild bundle 导入真实 core/diff-model/原生 editableText，独立重放原最小反例，结果为明确拒绝。固定 seed=4679 的 5,000 组 LF/CR/CRLF、中文/emoji、重复行/空行、首部 BOM 探测，对已获得范围证明的首块/末块/全选分别检查；以另一种逆序字符串切片方式构造授权 display 预期。14,951 次被接受选择的转换后正文均匹配预期，43 次选择被拒绝，2 组无块/未通过完整范围证明；未出现接受后正文偏差。该探索是必要边界补充，不证明所有组合安全，拒绝也不冒称支持成功。

作者报告的串行 31 文件/215 tests、test tsc、2 生产 lint、architecture1252、diffcheck0 记为作者证据，本 reviewer 未无差别重复或冒充亲跑；i18n 未变沿用原证据。前轮 worker EnvironmentTeardownError/exit126 失败记录保留；后续串行通过不证明框架间歇根因已修复。

本轮未运行 build、真实 Chrome/Obsidian、原 25 宿主场景、跨平台、人工视觉或性能验收，按 SRC-010 由用户与最终集成 owner 承担。无源码/正式工件修改、提交、推送、发布或归档。起终完整输入与范围摘要一致；两轴 pass，无新增 findings。报告交回后停写。
