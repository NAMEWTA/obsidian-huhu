# 任务回报

Session: 20261104T095541Z
Task: 092-review-t19
Status: completed

## 聚焦交接

已完成 T-19 独立双轴审查，Standards 与 Specification 均为 request-changes。正式 runner 复现 0 cases 失败，定位为 fixture 缺少两个 Document 的 createDiv 宿主扩展；在 /tmp 内补齐接缝继续诊断，又确认窄屏按钮尺寸和 200% 统计布局两项问题。DOM、通知/路由、类型、lint、架构、词典与原预算检查通过，预览/确认/取消/恢复交互的诊断断言完成。只新增本 REPORT，未修改业务文件、TASK、设计、旧报告、正式 Evidence 或状态；请实现者处理 F1–F3 后重新冻结复审。

## 产物与验证

### 固定输入与审查方法

- Risk: medium；Strategy: independent；Independence: required（用户明确派遣）。Reviewer: 本次 Codex /root，未参与 T-19 实现或修复；未委派其他执行者。独立性由 Lead 回读本次实际派遣和工具执行核验。
- Mode: working-tree / explicit-files；base 与 observed HEAD 均为 29644dc5833bb209e6282f84fa71441a5a1b99d4。按 TASK 选择全部 18 个文件，开审、检查中、写报告前 SHA-256 均匹配，无漂移；不以 HEAD 代替候选内容。
- TASK Input-SHA256: 2f1794d9b286d2952fd443bfdcfffeb31bcb8e80127dddd603d89b97b305a0bf。validate-specdev.mjs --review-scope 对上述 base、working-tree 与逐项 --file 返回 0、18 paths；工具自身 scope 摘要为 d4fc3a46f7b9c3fe6dcff8303149b89cbafc27431440fefd89d9375059bf6fdd，与 TASK 整体摘要分开记录。
- 完整读取 TASK、T-19、087 实现交接，核对 Spec AC-604/624/631、范围 IN/OUT、既有 ADR/CONTEXT/Map/Goal Plan；复用未变的运行/审查合同，读取 design-contract、DESIGN revision 2、DESIGN-0002 适用规则、UI-001 approval-r2 与 final 的体检页面结构及样式。dev/ui SHA-256 分别仍为 d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e、123781b61a8bd3b40af9ff6161b1dc981c446f13c2ef3b2f49995630cd2f2c44，与 Ticket 绑定一致。
- 沿页面公开端口、workbench 页面绑定、通知 module/opener、路由和 UI runner 追踪调用关系；额外只读检查共享 Portal/provider、Button、base.css 的实际依赖。navigator 注册属于已验收 T-12，本轮仅检查共享路由波及，未扩大重审其实现。

## Standards Axis

Result: request-changes
Reviewer: Codex /root（独立审查者）
Input-SHA256: 2f1794d9b286d2952fd443bfdcfffeb31bcb8e80127dddd603d89b97b305a0bf

### F1 · major · 新 fixture 无法挂载，必需 UI runner 在开始矩阵前失败

- 位置：scripts/ui-review/fixtures/T-19.tsx:18（docs 初始化至 ContainerProviders 挂载之间）。
- 问题：fixture 在普通 Chrome Document/iframe 中直接挂载 ContainerProviders，却没有安装它依赖的 Obsidian HTMLElement.createDiv 扩展。src/ui/react/portal.ts:6 调用 doc.body.createDiv，在主 Document 和 iframe 均抛 TypeError；生产组件未完成挂载，宽/窄与长报告验收无法运行。这是 fixture 的宿主接缝缺陷，不据此断言真实 Obsidian 同样崩溃。
- 复现：node scripts/ui-review/run.mjs --ticket T-19 --matrix standard --out /tmp/huhu-092-ui-review，实际退出 126，status failed、0 matrix cases。result.json 记录两个 doc.body.createDiv is not a function，栈首 acquirePortalRoot，随后 Timed out: fixture ready。与 TASK 提供的 Lead 失败一致。
- 建议：在创建 React 根前为两个所属 Window 的 HTMLElement.prototype 安装最小且正确的 createDiv fixture 接缝，可复用 T-12 fixture 已有方式；保留生产 Portal/provider，不改组件或门禁来绕过。修复后重跑原正式 runner，确认两个 Document 均挂载且无运行异常。

### F2 · minor · 窄容器的按钮最小高度声明被共享设计样式覆盖

- 位置：src/modules/health/ui/HealthPage.tsx:19（control，应用于导航、定位、预览和重扫按钮）。
- 问题：@max-[600px]:min-h-11 没有产生期望的 44px 点击目标。共享 src/ui/styles/base.css:99 的更高优先级设计规则将 min-height 设置为 --nd-hit-size；当前窄屏 fine pointer 下此变量仍是 32px。因此 DOM 测试通过但实际 CSS 不符合 ui/Design 的窄屏 44px 要求。
- 实测：仅在 /tmp 的内存 fixture 补齐 F1 接缝后，原第一项 420/en/light/1x 断言失败 main: labelled target。主页面宽 373px、container-type:inline-size，Scan/Limited repair/Notifications 高 37px，View location/Preview repair/Rescan 高 39px，computed min-height 均为 32px；iframe 页面宽 553px 也相同。44px 规则已存在于当前生成 CSS，故不是未生成 Tailwind 类的推测。
- 建议：让本页窄容器尺寸通过现有设计命中尺寸变量/兼容的组件样式实际生效，覆盖页面及所属 Portal 的相关控件，避免 !important 或提高门禁容忍度。以 computed style 与真实边界框重验 fine/coarse、两个 Document、中英文；保持桌面尺寸规则。

### F3 · minor · 200% 等效窄宽下统计数值内容框为 0，无法正常阅读

- 位置：src/modules/health/ui/HealthPage.tsx:98–99（统计 dl 的固定双列与 dd）。
- 问题：最窄宽度始终 grid-cols-2，加上每卡 p-4 及未清除的 dd 默认缩进，使数量/时间的内容框在 200% 等效布局收缩为 0。日期和计数逐字竖排，统计卡高度异常增大；页面无横向溢出的断言不能证明这些数据可读。
- 复现：/tmp 接缝诊断中的 420/en/light/2x（CSS 视口 210px）截图可见检查时间逐字竖排。另在同一生产组件、同一生成 CSS 下用 CSS 视口 210px 独立测量：页面宽 163px，四个 dd.getBoundingClientRect().width 全为 0，Excluded/Locked 和 Checked at 卡高 462px。420px CSS 视口下对应内容宽 90.5px、卡高 106px，故为可达的缩放/窄布局退化。
- 建议：在小内容宽度改为单列或降低卡片内边距，并显式清除统计 dd 默认 margin，保证数值与时间有正常内容宽度；为真实 200% 等效宽度补可读性检查，不能只断言根节点 scrollWidth 未溢出。

### 其余标准核查

- 页面使用 ReactSurface、标准 shell chrome、公开 health 端口和共享组件，没有增加 Obsidian ViewType 或页面磁盘写入。清理订阅/定时器、关闭时卸载、跨路由撤销旧确认与恢复、取消只读预览、异常脱敏均有通过的定向用例。
- health 模块经 notifications/api.ts 持久化摘要，opener 严格绑定 source/target 的 health 与相同 reportId，拒绝非法/不匹配 ID；重载持久通知后不会误投 automation。报告缓存有界，旧报告/重启失效时提示重扫，没有拿别的报告冒充旧报告。
- 架构、懒加载与预算通过；health 激活约 8.6 KB，低于原 10240 B，未放宽预算。根词典和 lazy 页面词典双语键及占位符对齐。HealthPage.tsx 固定提交署名与 docs/third-party/bz.md 的 src/checkup/ui.ts 登记均存在。

## Specification Axis

Result: request-changes
Reviewer: Codex /root（独立审查者）
Input-SHA256: 2f1794d9b286d2952fd443bfdcfffeb31bcb8e80127dddd603d89b97b305a0bf

- **AC-604**：常规 DOM 验证范围、数量、排除项、时间、状态及脱敏定位通过；错误原文不显示。F3 使必需 200% 等效窄布局中的数量和时间不能正常阅读，须修复后补验，不宣称该 AC 在全部要求尺寸完成。
- **AC-624**：通过。不可修复诊断仅定位与说明，不提供自动清理；索引重建仅对完整且无问题的 archives.integrity 派生检查开放，归物仅选择带有效 reference 的 projection-mismatch，真正许可仍交 owner。unsupported-only DOM 用例通过，页面无删除坏文件/无端点关系/孤儿密文/迁移备份入口。
- **AC-631**：定向集成通过。真实 health module 在无页面时完成扫描和修复失败，真实 NotificationService 保存摘要和 health target；持久化重载后 opener 回 health/scan/reportId。通知禁用不强制启动通知模块；详细报告为 activation 内有界状态，失效后明确重扫，持久摘要仍在。未验证真实 Obsidian 的通知点击与跨窗口表现。
- **Design Conformance: request-changes**。绑定 revision 2 / digest 1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00，页面 HEALTH-SCAN、HEALTH-REPAIR，继承 DESIGN-0002；未改设计合同。生产组件在常规宽度具有批准的标题/指标/分组/预览/明确确认/逐项回执层级，使用语义 token；去掉原型演示完成按钮、改用真实端口与缓存失效说明属合理差异。F2 违背窄屏 44px，F3 违背缩放下的可读重排；F1 使原必需 runner 未取得有效矩阵证据。以上修正和正式重跑之前，不接受“DESIGN 验收通过”。

### 亲自执行的检查

环境：共享 dev 工作副本、现有依赖；Chrome 正式组件 runner 读取既有 styles.css 和宿主 app.css，未启动 Obsidian，也未重建样式或插件。

| 命令 | 退出码及实际观察 |
| --- | --- |
| pnpm exec vitest run --project dom src/modules/health | 0；1 文件、10 项通过。 |
| pnpm exec vitest run src/modules/health src/modules/notifications src/app/workbench src/shell/navigation-state.test.ts | 0；23 文件、100 项通过。 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0。 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0。 |
| pnpm run lint | 0，零警告。 |
| pnpm test:architecture | 0；1345 modules，无边界/宿主/barrel/循环违规。 |
| pnpm run check:bundle | 0；原预算 within limits，health 激活约 8.6 KB，write:false 分析未写 main.js。 |
| node /tmp/huhu-092-verify-i18n.mjs | 0；33 根词典、5453 键、占位符与字面量引用一致。原校验逻辑仅将模块解析及临时输出移到 /tmp；lazy 页面另由 messages.test.ts 检查。 |
| node scripts/ui-review/run.mjs --ticket T-19 --matrix standard --out /tmp/huhu-092-ui-review | 126；正式失败、0 cases，F1。 |
| node /tmp/huhu-092-ui-diagnostic-run.mjs --ticket T-19 --matrix standard --out /tmp/huhu-092-ui-diagnostic | 126；仅在内存补两个 Document 的 createDiv，进入第 1 case 后因 F2 失败。 |
| node /tmp/huhu-092-ui-diagnostic-continue.mjs --ticket T-19 --matrix standard --out /tmp/huhu-092-ui-diagnostic-continue | 126；诊断保留全部断言失败并继续取样，48 cases 中 24 项因窄容器按钮高度失败；两 Document 的预览零提交、取消零提交、明确确认、unknown、恢复、revalidating、键盘和 reduced-motion 交互断言完成。最终仍为 failed，不能作为正式通过证据。 |
| node /tmp/huhu-092-ui-layout-run.mjs --ticket T-19 --matrix standard --out /tmp/huhu-092-ui-layout | 126；同一接缝诊断另测 420/210px 内容尺寸，保存 F2/F3 的 computed style 与边界框，随后原首项高度断言仍失败。 |

诊断原脚本写在 /tmp，生产源码和正式 fixture 均保持冻结字节。首个 /tmp 诊断草稿曾因 stdin sourcefile 未指向实际文件、runner 收集输入摘要时报 ENOENT（126），改正临时脚本后才取得以上浏览器数据；该工具错误不计作业务 finding。继续取样脚本将各断言异常加入 result.errors，最终“Browser runtime errors were recorded”是其汇总报错，不误报为补接缝后又发生生产运行异常。

本地过程材料：/tmp/huhu-092-ui-review/result.json；/tmp/huhu-092-ui-diagnostic/result.json；/tmp/huhu-092-ui-diagnostic-continue/result.json 与同目录截图；/tmp/huhu-092-ui-layout-probe.json。实际查看截图包括 420-en-light-1x.png、420-en-light-2x.png、1440-zh-dark-1x.png、confirm.png。统计、状态及长 ID 无根级横向溢出；截图也暴露常规窄屏问题行文本被操作组挤窄，建议修布局时一并检查，不以无溢出代替可读性验收。

未完成/未验证：正式 T-19 runner 的通过结果；真实 Obsidian、多窗口、真实触屏/输入法、宿主主题集成；Lead 独占的 build/build:css/notices 与产物一致性。未安装依赖、未进行 Git 写操作、未发消息到外部服务、未更新正式 Evidence/Ticket；没有将诊断 fixture 或 DOM 结果冒充宿主验收。

## 问题与下一步

F1–F3 为本轮可操作的修正项，分别涉及 fixture 宿主适配、真实窄屏点击尺寸与统计缩放重排。请实现者保留原门禁断言，最小修正后由 Lead 重建必要样式、冻结新输入，重跑正式 48-case runner 及相关定向测试，再交独立复审。completed 只表示本次审查已完整交回，不表示 T-19 或 DESIGN 已验收通过。
