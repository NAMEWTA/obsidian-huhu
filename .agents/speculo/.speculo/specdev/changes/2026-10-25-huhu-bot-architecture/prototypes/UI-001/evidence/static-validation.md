# UI-001 静态验证记录

日期：2026-10-25。对象：本 change 的完整 Spec、设计合同与离线原型。当前为草稿检查，不是产品验收，也不是 UI Ready 回执。浏览器检查由用户在 LOG-036 接手，未收到实际观察或设计批准。

## 内容绑定

| 对象 | 本轮值 |
| --- | --- |
| HUHU 源码基线 | 66083cdb9f7f31a4bcbd3e380c6c7f64f2e74e93 |
| 推荐候选 | candidate-a，尚未获用户选择/批准 |
| prototype digest | 1d7381b712e67c6a57d2e14cca8c7da1e6931f168dcf38fc430ddd27772b85ef |
| DESIGN revision / designDigest | 1 / 7af779b352b4ab40fca6884d31e0bda4c3419bbd16e282d126d717c7a9278b16 |
| 基线候选 revision / designDigest | DESIGN-0001 / 0c82a2a91517682d68abe9f3f42f085f9d82e2c012aba3c1d2548d580f8b309c |
| 原始附件 | 93844 字节，SHA-256 a85a57648a00942a44c3df89c52804d13d129e7e31262a73feb91ccc7f1516cc |

当前设计/原型/基线文件与摘要还记录在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/bindings.json</Path>。这份绑定的 confirmation 为空，不能用作批准凭据。后续修改 final/comparison 需重算摘要和重新验证，不能沿用当前观察。

## 已运行的检查

| 检查 | 实际结果 | 能证明的范围 |
| --- | --- | --- |
| `node --check` 检查 final/app.js | 通过，退出码 0 | JavaScript 语法；不证明 DOM、焦点或视觉运行正确 |
| `materialize(design-system.md)` 连续两次，再 `{check:true}` | 通过，退出码 0；三份源码和前/后 prototype digest 完全相同 | 三个具名源码块与 index.html/styles.css/app.js 字节一致，重复生成稳定 |
| `validateProjectDesign(baseline-draft.md)` | 通过，退出码 0 | 基线候选 schema、正文、token、来源结构；不表示已发布或批准 |
| `validateChangeDesign(DESIGN.md, {requireApproved:false})` | 通过，退出码 0 | 草稿的 schema、页面 ID、token 和正文结构；不是已批准状态检查 |
| 设计包 `validate(..., {allowDraft:true})` | 通过，退出码 0；status=blocked，3 个候选，browser_evidence=null | 候选元数据与草稿 schema；没有把工具 CLI 的通用提示当成浏览器证据 |
| `validate-specdev.mjs --stage grill` | 通过，退出码 0；0 errors / 0 warnings | 设计树、回答与访谈工件结构；新整版共识仍未标完成 |
| `validate-specdev.mjs --stage learn` | 通过，退出码 0；0 errors / 0 warnings | 两篇学习文及索引的工件结构；没有运行参考项目 |
| 原件与 inputs 逐字节比较 / SHA-256 | 完全相同 | 保留用户输入；未为了清理历史约束或修目录而改原件 |
| AC / ADR / LOG / DESIGN / 设计树交叉检查 | 55 个连续且唯一 AC；25 条 ADR；27 个 answered 节点及 log_ref 存在；DESIGN 的 AC 引用均有效 | 追踪结构；语义另经现行文档逐项核对 |
| ADR 替代链 | 012→024、015→023 显式 superseded | 旧人工记忆/单助手范围为历史，不是并列现行决定 |
| HTML ID 静态检查 | 5 个 HTML 文件均无重复 ID | 比较页、3 候选与 final 的静态标识；不模拟浏览器 |
| 本地字体与许可逐字节比较 | Geist、Geist Mono、LICENSE 均与 src/ui/fonts 一致 | 沿用当前 HUHU 字体，不加载外部字体 |
| 文档 Path 引用检查 | 实际工件可定位；仅 3 个明确规划的实现路径尚不存在 | `contracts/hap/v0.1/`、`native/huhubot/internal/application/api/`、`src/modules/huhubot/api.ts` 是实施地图 |
| 工作区与永久设计检查 | 生产 src/native/main.js/styles.css/docs/package/lock 无本轮改动；永久 current 与 DESIGN-0001 不存在 | 没有借原型交付发布永久知识或实现产品 |

本轮源码检查还修正了各 Bot 自动记忆开关相互串改、全局记忆修正回填、新群/阅读群误显示周报、终态目录提示、清除后旧目录/内容、局部任务取消误失效其他模拟回调等问题。以上是源码层检查与修正，均保留待浏览器验证，不填成已实际点击通过。

## 未通过的检查与原因

### 原型预览门

运行 `validate-design-package.mjs --check-preview`，工具返回非零（当前执行器记录退出码 126），唯一错误：

```text
ready prototype requires browser evidence
```

按该校验器执行顺序，源码物化、离线资源闭包、候选实际结构差异、final、草稿 DESIGN 和原型摘要绑定均已检查，随后停在浏览器证据。没有伪造 browser.json、PNG 或观察结论，也没有通过替换自动化方式绕过用户的自验安排。

### S 就绪门

运行 `validate-specdev.mjs --stage spec`，工具返回非零（执行器记录退出码 126），0 warnings，2 errors：

```text
prototypes/UI-001: bound UI prototype must be ready before downstream consumption
prototypes/UI-001: change DESIGN requires approved status
```

这是当前公开保留的就绪缺口。Spec 内容已经编写，仍为 draft / ready_for_tickets:false；DESIGN 为 draft，原型为 blocked。结构检查通过不抵消这两个错误，不进入实施。

### 仓库文档检查

运行 `pnpm test:docs`，未通过；CLI 报 exit code 1，执行器记录退出码 126。报告恰有 6 条错误，全部来自未改字节的原始附件的目录锚点：

```text
inputs/HUHU-Bot_架构审核与工程设计规范_v1.1.md
#9-工具审批与效果日志
#12-数据路径与迁移
#14-记忆知识与可扩展能力
#15-权限凭证与运行治理
#17-验证性能与发布门禁
#19-决议未决验证与完成定义
```

该检查未报告现行 Spec、DESIGN、ADR、学习文或原型说明的新增链接错误。保留原文件是用户明确要求，本轮不修改原件、不更改仓库检查器或添加排除规则来制造全绿；原件与现行规格的地位已在 README 标明。

## 浏览器与产品验证边界

未运行浏览器、无头 Chromium、Playwright、截图、真实触屏或 Obsidian 宿主验收。未执行插件 build/lint/业务测试，也未调用模型、运行 Go Runner 或参考项目；这些不是本轮文档/离线原型的通过结论。

实际体验入口和逐项检查在 <Path>{roots.state}/specdev/changes/2026-10-25-huhu-bot-architecture/prototypes/UI-001/REVIEW.md</Path>。收到用户观察后，按相同摘要记录真实浏览器/尺寸/页面状态，修复后重新检查；通过 preview 门再集中确认具体 HTML、change DESIGN 与首次基线范围。当前没有用户尚未回答的核心范围问题。
