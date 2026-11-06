Session: 20261105T094057Z
Task: 090-review-t11-ui
Status: completed

## 聚焦交接

独立 high 审查完成；标准轴 request-changes，规范轴 request-changes。确认一个本轮新回归：模块内快速取密复制会因父组件更新取消。另有两个真实生产服务下复现的 Health 继承缺口，以及通知中文标签字号未完成迁移。以下分别标明归因，不将旧问题冒充 087 新增。

Reviewer: native:/root/review_t11。Implementers: native:/root/implement_t11、native:/root（共享字典及 hint）。Strategy: independent；Risk: high；Independence: required；Mode: native。本 reviewer 未参与上述实现或修复，未委派，未改源码、规则、fixture、产物、Git/index、正式 Evidence/状态；唯一仓库写入是本不可覆盖报告。所有反例只用生产组件/服务和内存宿主端口，未访问真实 vault、账号或剪贴板。

## 固定输入与范围

- review_mode: working-tree；比较 087 实际编辑前 baseline 与完整 candidate，未把 HEAD 当作工作副本。完整 41 路径见 /tmp/huhu-t11-implementation/candidate-manifest.json；manifest SHA256 为 629bb90ee5c2804db279d381101a2d3f213d486e54b7d0dd24612844513c3b6b。
- 当前 41 文件的原始字节 SHA256 与模式在开始和结束均匹配该 manifest：零漂移，21 worker 修改/新增、无删除；3 份 ui/i18n.ts 明示为 Lead-shared。冻结记录 /tmp/huhu-t11-high-review/snapshot.json、final-drift.json。
- Root 后补 src/modules/safe/i18n.ts 的 Shift+Enter hint 单独绑定 SHA256 3dee8efec116c0a32c3eb03bd2a3765e62122dd7709775ac152f96e40afbdf9e，不归因给 087。
- Input-SHA256: ada5f0f2b45cf6201a2a1f78b1bd793c491f4be6e134cd61943d29356cead3c1；原输入 /tmp/huhu-t11-high-review/review-input.json，来源摘要 source-hashes.json。过程材料不入库。
- 阅读了三模块实际 UI 入口、全部改动生产组件、相关测试和 fixture，向下追踪 SafeService 的 generation/锁定/Clipboard 队列与指纹清理、CipherRepository/WebCrypto，HealthScanService/HealthRepairService 的新报告/五分钟计划/确认/回执，NotificationService 与 Presentation 的 pending/名称解析/生命周期。领域源只读。

来源发现：本任务为已有 change 的工作副本，不存在本次 commit/PR 来源（not-applicable）；显式来源 found：Map/Goal/Spec、ticket/11-notifications-safe-health.md、DESIGN revision 3、UI-002 design-system.md/approval.md、frontend-coverage.md；标准 found：根 AGENTS、dev/ui 技能及 testing、motion-a11y、design-system、shell 参考，真实 Vitest/TS 配置。dev/ui 摘要分别与 TASK 的 0c2a3309…cfb744 / 12621917…ca1ad4 一致。未跳过轴，未更改设计权威。

## Standards output

Reviewer: native:/root/review_t11
Axis: standards
Result: request-changes

### S1 · P1 · 新模块内 QuickPick 的复制总被父更新取消（087 新回归）

位置：src/modules/safe/ui/SafePage.tsx:592，关联 QuickPick.tsx:60–89、SafeService.copy 的真实 operation busy 更新。

模块内入口每次渲染都创建新的 onClose。QuickPick 的 close 依赖 onClose，生命周期 effect 又依赖 close；复制通过 SafeService.operation 同步把 store.busy 设为 true，父 UnlockedSafe 随 store 更新，产生新 onClose，effect cleanup 随即 abort 正在进行的本次复制。真实 service/WebCrypto/内存 clipboard 下，解锁 SafePage → Quick access → Enter，剪贴板仍为空。进一步诊断捕获该次 copy 的原 AbortSignal，确认为 aborted=true、错误 code=canceled、clipboard.writes=[]，会话仍 unlocked。独立 QuickPick 测试中的稳定 onClose 不触发此组合，所以现有 66 DOM 测试仍绿。

影响：DESIGN 要求的新模块内快速取密入口不能完成基本复制；用户会看到取消/错误而得不到凭据。命令入口已验证可复制，不能代替此新入口。

满足条件：使 picker 生命周期只由真正的 owner 关闭/卸载/锁定撤销，普通父渲染不撤销操作（例如稳定关闭回调，或将最新回调与生命周期订阅隔离）。补通过真实 SafePage + SafeService 的 Enter、Shift+Enter、按钮复制成功与失败重试测试，继续保留真正关闭、锁定、模块停止时取消的既有测试。不需要改密码学或领域服务。

证据：/tmp/huhu-t11-high-review/review.dom.test.tsx、counterexamples-final.log、diagnostic.log。

### S2 · P2 · 无 resourceId 路由未随实际报告变化撤销旧 UI 操作（继承缺口）

位置：src/modules/health/ui/HealthPage.tsx:100、126–135、149–162、184–194。

页面在 reportId 缺省时展示 snapshot.report；generation 只随 section/reportId props 变化。实际可达多叶场景：第一叶在默认 repair 路由为报告 A 生成计划，owner.preview 尚未完成；第二叶发起并完成新扫描 B；第一叶订阅已经显示 B；随后释放 A 的 preview。真实 HealthRepairService 正确拒绝 A 的计划（health-rescan-required），但第一叶 generation 未变，旧拒绝的泛化错误仍显示到 B 上。反例使用真实 scanner/repairs，未以 stub 返回伪造过期计划。

影响：新扫描页面被旧操作的迟到错误污染；同样的 effective-report 边界未覆盖 preview/排除勾选的归属。未观察到错误修复实际写入：领域报告身份校验和 UI commit 报告检查仍有效。087 新增了 catch generation 检查，但未覆盖有效报告身份，基线原先也有此缺口。

满足条件：按当前实际报告 ID（并考虑 owner port）撤销旧只读计划及其 UI 完成，保留已写操作的真实回执。增加共享生产 scanner 的两叶测试；报告 B 不接收 A 的成功、错误、取消提示或旧选择。仅 UI 调整即可。

## Specification output

Reviewer: native:/root/review_t11
Axis: specification
Result: request-changes

### SP1 · P1 · UX-SAFE-1 / AC-102 未满足新模块内取密

S1 的真实复制失败直接违反 DESIGN §6 safe 的“Obsidian 命令或模块内按钮”及 Enter 密码 / Shift+Enter 用户名合同。解除条件与 S1 相同；仅证明命令取密或独立 QuickPick 成功不足以验收。

### SP2 · P2 · 过期计划仍展示可确认预览，缺少诚实的重新生成路径（继承缺口）

位置：src/modules/health/ui/HealthPage.tsx:196–218、506–572；依据 ticket 实施补充合同与 DESIGN §6 health 的计划过期状态。

使用真实 HealthScanService/HealthRepairService，设置合法 freshnessMinutes=60，让报告仍有效；生成计划后推进 service 时间 300001 ms，再确认。领域正确拒绝五分钟过期计划，UI 显示泛化操作失败，仍保留 Impact preview 与 Review confirmation，Generate repair plan 不再可见。再次 Review 仍使用同一失效 plan。用户必须自行推断先 Cancel 才能重新生成；没有明确的计划已过期反馈。未发生修复提交，未伪称成功。

这是基线已经存在、在本次“全部状态替换”中仍未完成的合同缺口。默认 freshness=5min 的额外观察为报告同时 stale 时提交 guard 直接返回；本 finding 的主反例特意让报告有效，从而只验证计划过期。

满足条件：UI 在确认前识别已过期预览，撤销失效 confirmation，明确说明需要重新生成/重新扫描；保留合法报告和勾选，提供实际可用动作。消费已有 expiresAt，领域继续拥有最终验证，不改 repair 引擎。补真实生产计划过期后恢复测试。

证据：/tmp/huhu-t11-high-review/review.dom.test.tsx 最后两个 health 测试、counterexamples-final.log。

### SP3 · P2 · 通知 ID 标签仍固定 11px，未遵守中文字阶下限（继承的迁移遗漏）

位置：src/modules/notifications/ui/InboxPanel.tsx:43。实际标签来自 notification.reportId / automationId / runId，zh 为中文；仍保留 text-[11px]。DESIGN §3.5 明确中文最低 12px，禁止 11/11.5px；固定 11px 也绕开 13/14/15 界面字号档位。这是可直接定位的源码偏离，未冒充已完成像素测量。

满足条件：改用本票现有 xs 字阶（或对应批准 token），在 Root 当前生产矩阵的 zh 下确认计算字号、缩放与可读性；不需要新增字号体系。

## 非 finding 的边界观察

锁定检查使用真实 SafePage / SafeService：密码 SecretInput 的保留节点 property 已清空，当前页面/Portal 已无明文子树。另持有编辑器 Username 与 Notes 的旧节点，锁后两者 isConnected=false；当前 document.body 无该笔记哨兵，但旧节点仍保留 username.value/value attribute 和 notes.value。这是基线既存的普通受控输入行为，只证明测试持有 detached node 的残留；没有证明它们仍在产品的可达页面或 stash，也没有从旧 JS 字符串引用推断新泄露，因此不计入上述阻塞 findings。若 Lead 将“所有保留 UI 明文”进一步定义为需要擦除每个 detached 非密码节点，可单独沿 Safe UI 最小边界收口；当前真实已验证的密码清除与页面卸载不应被该观察否定。

Clipboard 所有权独立正例：真实 service 先复制测试秘密，再将测试 port 内容改为外部 owner 文本后锁定；外部文本保留、writes 仅一次原复制。既有 30 秒常量及两次读取指纹匹配逻辑未改。并未使用浏览器真实 clipboard，也未宣称 Clipboard API 有 compare-and-swap；原实现已说明外部竞态限制。

## 产物与实际验证

以下为 reviewer 实际执行：

| 命令 | 结果 | 原始材料 |
|---|---|---|
| pnpm exec vitest run --project dom src/modules/notifications src/modules/safe src/modules/health | 退出 0；10 文件 / 66 测试通过 | /tmp/huhu-t11-high-review/dom.log |
| pnpm exec vitest run --project unit src/modules/notifications src/modules/safe src/modules/health | 退出 0；26 文件 / 189 测试通过 | /tmp/huhu-t11-high-review/unit.log |
| pnpm exec vitest run --config /tmp/huhu-t11-high-review/vitest.config.ts | 有意按预期正确行为断言的反例为红：4 failed / 1 passed；工具返回退出 126。分别为 S1、detached 输入边界、S2、SP2；不是将四条红断言都计为新缺陷 | /tmp/huhu-t11-high-review/counterexamples-final.log |
| 同临时 config 加 -t diagnostic: | 退出 0；1 passed / 5 skipped；精确证明 S1 的原 signal 被 abort 且没有 clipboard write | /tmp/huhu-t11-high-review/diagnostic.log |
| Python 开始/结束重算 41 文件 SHA256 与 mode | 退出 0；41/41 相同、零漂移；dev/ui 摘要与 TASK 相同 | /tmp/huhu-t11-high-review/snapshot.json、final-drift.json、source-hashes.json |

临时 config 继承真实仓库 DOM 项目、setup、Obsidian stub 与资源转换，只改变 include 与 /tmp cache 目录；临时 node_modules 是指向已有依赖的 /tmp 符号链接，无安装。生产 SafeService / CipherRepository / WebCrypto、HealthScanService / HealthRepairService 不作 mock；只提供内存文件、clipboard 和有限 owner 实现。

作者的 lint/types/architecture/safety 与 fixture --check 证据已回读；manifest 输入未变部分可复用，但本 reviewer 不将这些记为自己运行。特别 safety.log 同时含 DOM、多个脚本与 7 条 recovery 子测试，“7/7”不是其全部测试量。--check 只有 preflight，不是像素、命中、双原生 Document 或宿主验收。

已覆盖的正向路径包括：通知来源详情/读状态/错误与动作、safe 原字段/关系/草稿/密码遮罩与锁定/quick command/IME/失败重试/模块停止、health 支持修复集合/选择/预览确认/取消/部分回执/恢复与路由撤销（现有真实执行测试）；未发现密码学、密文格式或修复种类被扩张。新 UI 复用唯一 DetailPane/Dialog/Button/Settings 控件，无另造焦点/密码学/修复引擎。

本 reviewer 未执行 Root-owned 66-case Chrome 矩阵、styles/main 重建、真实 Obsidian/popout/原生文件选择器/系统 clipboard、触屏或像素验收；上述仍由原 owner 完成。既有 DOM 的模拟迁移不等于原生 popout，fixture 的 iframe 不等于双原生窗口。没有以 DOM 或 --check 声明完整 Design Conformance。

## 问题与下一步

1. 优先修复 S1，补真实模块内复制回归；修复仅 Safe UI 即可，不扩大 core/services/platform 权限。
2. 按上述归因处理 S2 / SP2 / SP3；Health 两项是继承的完整状态缺口。保留有限修复、CAS 与回执的领域 owner，禁止为 UI 修复重写引擎。
3. Root 对修复后的精确候选重验受影响行为，再完成其原有矩阵/宿主/产物门；本报告不更新 Ticket/Goal 为完成。

报告写入后 reviewer 不再写任何文件；返回即释放本次 41 文件冻结，交回 Root。新增修复会使本报告的通过项只在未受影响范围有效，S1 等需重新核验。
