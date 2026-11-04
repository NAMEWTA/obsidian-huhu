# 任务回报

Session: 20261104T095541Z
Task: 080-review-t15
Status: completed

## 聚焦交接

已完成 T-15 固定候选的独立双轴审查，两轴均为 request-changes。确认 2 项 major（离开后旧确认仍执行删除、索引重载丢失草稿）及 3 项 minor（隐藏上传控件误测、极窄输入区不足、概览缺少已批准的信息分区）。Lead 所报 44px 失败已亲自复现并定位为 fixture 误测；排除误测继续检查后，另有真实布局失败和 loading 状态失败。业务文件、TASK、Ticket、Map、Evidence、构建产物均未修改；仅交回本 REPORT，由 Lead 合并修复后重新冻结复审。

## 审查身份、固定输入与方法

- Reviewer：当前 Codex 会话；未参与本票实现或修复，未委派、未修改候选。Risk: medium；Independence: independent；Strategy: 单 reviewer 分别完成标准轴与规范轴，结合真实生产组件、owner 服务、失败反例及浏览器验证。
- Basis：TASK、T-15、Spec §5/AC-501/AC-504、Map/ADR/CONTEXT/Goal Plan、077/078 REPORT、AGENTS.md、dev/ui 技能、reviewer-contracts/risk-review、domain-runtime，以及 DESIGN revision 2/UI-001 final 的 PERSON-READING。
- 工作区 /home/wta/projects/obsidian-huhu，branch dev，HEAD/base 29644dc5833bb209e6282f84fa71441a5a1b99d4。审查输入整体摘要采用 TASK 的 5b741d65161f1f43695212d1190c08a89a638bf3f0d1a7ccda0214e445d686e0；8 个冻结文件在开始、途中及写报告前逐一 SHA-256 匹配。已跟踪入口对照 base diff；新增人物文件与 fixture 按完整快照审查，不宣称覆盖其他票的 dirty 改动。
- 调用链：GenericArchivesSurface/ArchivesContent → ArchivePage 的 lazy person 分支 → PersonReadingPage → RecordValues/RecordEditor、RelationPanel、PersonJournal → application.personJournal/commands。另核对 runtime 重载、文件事件 rescan、共享 Dialog 的 owner 生命周期与浏览器 fixture；不要求修改这些只读依赖。
- 生产样式为 Lead 当前 styles.css，SHA-256 f25fd2ea6ee5878340387f28ba594b3affbe6418da514e4f7a82645e33bd0177；没有重新生成或注入修正样式。浏览器 Google Chrome 153.0.8010.47，Obsidian ASAR app.css；第二 document 为同源 iframe，不能冒充真实 popout。

## Standards Axis

Result: request-changes

### F1 — major：确认等待不属于组件生命周期，卸载后仍可发起旧人物删除

- 位置：src/modules/archives/ui/person/PersonJournal.tsx:350；关联 :12、:100、:106、:128、:192。
- 问题：confirm 丢弃 openReactDialog 的 close 句柄；等待确认时 running 仍为 false，无草稿时 leave 返回 true。owner 是持续连接的页面容器，因此切换人物不会自动关闭该独立 React 根；原 PersonJournal 已卸载后，确认回调仍调用 run，新建一个清理阶段从未见过的 AbortController 并提交旧人物删除。卸载时 abort 现有 controller 无法阻止这种稍后才启动的操作。启用升级也使用同一等待模式，应一并防护；该升级路径的晚确认未单独执行。
- 复现：打开 fixture 人物 A 的 Journal → Delete journal entry → 调用 uiReview.select('review-person-b')，该入口执行真实页面的 leave guard → B 已挂载但旧 dialog 仍存在 → 确认。main/other 两个 document 中，当前均为 B，A 的 review-row 均从存在变为空，B 未被替换。未绕过离开守卫，也未改生产服务；持久化仅发生于 fixture 内存端口。
- 证据：/tmp/huhu-review-080-t15-lifecycle-run.mjs；/tmp/huhu-review-080-t15-lifecycle/result.json；诊断控制台 LATE_CONFIRM_BEFORE/AFTER。
- 建议：让确认框受人物组件生命周期管理，卸载/换实体时关闭并以取消结束；在确认后、run 开始前校验存活及当前实体代次。覆盖等待确认期间导航/卸载，再确认不得调用任何 owner 写命令；覆盖升级等待及重复确认。

### F2 — major：索引重载暂缺修订时卸载人物页，未保存纪事无确认丢失

- 位置：src/modules/archives/ui/generic/ArchivePage.tsx:372；关联 :362、PersonJournal.tsx:94。
- 问题：person 分支要求当前 index 中存在 selectedType。reload 会替换 index，在已发布的人物 journal-v3 修订重新读入前，该条件短暂为 false，回退通用详情并卸载 PersonReadingPage/PersonJournal。纪事草稿只在该子组件 useState 中，重载不经过 leave guard，之后重挂载也不能恢复。实际可由文件事件 rescan 或派生索引重建触发，用户无需主动离开人物。
- 复现：在 A 的 Journal 新增表单输入标题 Unsaved draft before reload；uiReview.refresh('loading') 暂停真实 runtime.reload 的文件读取。两个 document 均从人物页变为通用详情，form/dialog 均不存在，并出现定义不可用提示；uiReview.refresh('default') 后重新进入 Journal，form 不存在，标题丢失。前后内存写次数均为 32，草稿没有被保存。此路径也解释原 fixture exercise 在 :138 等不到 `[data-person-id][aria-busy=true]`。
- 证据：/tmp/huhu-review-080-t15-reload-run.mjs；/tmp/huhu-review-080-t15-reload-final/result.json（before/during/after）。
- 建议：重载期间保留同一实体的最后有效修订与人物组件/草稿生命周期，展示 loading 并限制不安全写入；不要把暂缺 schema 当作人物类型改变。新增持有未保存纪事时的 rescan/reload 成功与失败恢复测试，确认草稿、视图和离开保护均保留。

### F3 — minor：UI runner 把隐藏文件上传控件当成文字输入区

- 位置：scripts/ui-review/fixtures/T-15.mjs:16、:26。
- 问题：仅凭 getBoundingClientRect().width > 0 判断可见，并将全部 input 类型纳入文字区宽度断言。Profile 中 Resources 的原生 file input 具有 sr-only、position:absolute、clip-path:inset(50%)；其所属 details 尚未打开，仍被测得 44×44，触发 Lead 所报失败。不能据此要求扩大该隐藏文件选择器。
- 复现：正式命令在首个 420/en/light/1x 案例，Profile 的 verify :41 报 main: usable input content width 44。字段诊断确认普通文本输入有效宽度 281px，误测项为 type=file、contentWidth=44、detailsOpen=false、clipPath=inset(50%)。
- 证据：/tmp/huhu-review-080-t15-ui/result.json；/tmp/huhu-review-080-t15-field-run.mjs；/tmp/huhu-review-080-t15-field/result.json；字段诊断 FIELD_PROBE。
- 建议：按实际渲染可见性和输入用途选择测量对象，排除隐藏上传辅助 input；另测试打开资源区后的可见文字字段。保留真正文字输入区阈值，不能统一降为 44 或忽略全部输入断言；F4 是独立存在的真实失败。

已通过的标准检查：person 仅按稳定 type-person ID 挂载；组件不直接写文件，纪事写入归属 T-14 服务；expectedHash、rowId、同名人物 ID 隔离、写入失败/冲突保留草稿的通常路径有生产测试及浏览器证据；新增文案 en/zh 对齐，架构/类型/定向 lint 均通过。以上通过不抵消 F1/F2。

## Specification Axis

Result: request-changes

### F4 — minor：420px/200% 下实际纪事输入内容区仅 75px

- 位置：src/modules/archives/ui/person/PersonJournal.tsx:267、:274、:280（布局接缝还包括 ArchivesContent 外层 padding）。
- 合同：AC-501 的窄容器可用性、Ticket 必需的宽窄/长文本 E2E、DESIGN/UI 技能的缩放及有效输入区检查。
- 复现：只在 /tmp 中复制 fixture，将字段测量改为可见的非 file 输入，保留原来的 >=100px 阈值与全部生产组件/CSS。420px、200%（CSS viewport 210px）、coarse pointer 时，main 日期内容区 99px，标题/正文/关联搜索内容区均 75px；1x 时对应为 309/285/285/285px。中英 × 四主题的 8 个 420/2x 组合全部失败，其余 40 个布局组合通过。已查看实际截图，不只是字段统计。
- 证据：/tmp/huhu-review-080-t15-text-ui/420-en-light-2x.png；/tmp/huhu-review-080-t15-text-all/result.json；诊断 runner /tmp/huhu-review-080-t15-text-all-run.mjs。
- 建议：在人物页的极窄容器减少非必要嵌套留白，合理分配完整输入宽度，必要时以容器断点调整表单；保持 44px 命中区，并重跑正式矩阵。需修改写集外的外层容器时由 Lead 先决定范围，不能仅放宽断言。

### F5 — minor：概览缺少 UI-001 final 的最近纪事与关系概览

- 位置：src/modules/archives/ui/person/PersonReadingPage.tsx:117–124。
- 合同：T-15 design_ref revision 2/PERSON-READING；UI-001/final/app.js:72 的 overview 具有最近纪事、关系概览及进入相应视图的动作，区别于资料页。
- 问题：当前 Overview 仅渲染过滤 journal 后的完整 RecordValues，Profile 又渲染同一组值；已有纪事和关系不会出现在概览，也没有原型中的汇总及进入动作。这是信息与任务入口缺失，不是颜色、像素或文案偏好；078 的适配说明未给出已批准移除这两个分区的依据。
- 复现：fixture 的 A 已有 review-row，打开 Overview 仅见姓名和长 Notes，看不到该纪事；静态分支也没有查询或渲染关系摘要。已查看 /tmp/huhu-review-080-t15-remainder/default.png，并对照 final person()。
- 建议：按已批准概览提供真实的近期纪事、独立关系摘要及分段跳转，正确处理空值；Profile 保持 schemaRevision 资料职责。若 Lead 认为需要删减，应由设计 owner 明确修订/确认差异，再按该版本验收，不能由实现者自行认定符合。

AC-504：企业与 custom-person-like 类型仍走通用详情，定向 DOM 通过；未发现素材/画像、联系人主库或非人物强行套版等越界。AC-501：四个入口、真实资料编辑/关系/纪事通常路径可用，但 F2/F4/F5 及正式 runner 失败使其完整验收尚不通过。Design Conformance：绑定 revision 2、confirmation.digest 1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00；身份、稳定 ID/修订、分段导航、冲突、同名和 generic 状态有实现，loading 保持性和概览内容存在上述偏差，不宣称视觉合同通过。

## 产物与验证

以下为本人执行，未运行会改业务产物的 build/build:css/notices，也未安装依赖或执行 Git 写操作。

| 命令/检查 | 工具返回退出码 | 实际结果 |
|---|---:|---|
| pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/archive-relation.test.ts | 0 | 20 文件、125 测试通过；含本票 7 项 DOM 测试及 owner/黄金样本回归 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0 | 通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0 | 通过 |
| pnpm exec eslint src/modules/archives/ui/person src/modules/archives/ui/generic/ArchivePage.tsx src/modules/archives/i18n.ts scripts/ui-review/fixtures/T-15.mjs scripts/ui-review/fixtures/T-15.tsx --max-warnings 0 --no-warn-ignored | 0 | 定向 lint 通过 |
| pnpm test:architecture | 0 | 1335 模块，无分区/宿主/启动/循环违规 |
| node /tmp/huhu-review-080-t15-i18n.mjs | 0 | 等价复制 verify-i18n，仅输出移至 /tmp、依赖绝对定位；33 词典/5440 键及占位符通过 |
| node scripts/ui-review/run.mjs --ticket T-15 --matrix standard --out /tmp/huhu-review-080-t15-ui | 126 | 首个案例失败；F3，未完成正式矩阵 |
| node /tmp/huhu-review-080-t15-text-all-run.mjs --ticket T-15 --matrix standard --out /tmp/huhu-review-080-t15-text-all | 126 | 诊断完成 48 组合，40 通过/8 因 F4 失败；继续 exercise 时 loading 超时，定位为 F2 |
| node /tmp/huhu-review-080-t15-lifecycle-run.mjs --ticket T-15 --matrix standard --out /tmp/huhu-review-080-t15-lifecycle | 0 | 成功复现 F1；passed 仅指反例已复现 |
| node /tmp/huhu-review-080-t15-reload-run.mjs --ticket T-15 --matrix standard --out /tmp/huhu-review-080-t15-reload-final | 0 | 成功复现 F2；passed 仅指反例已复现 |
| node /tmp/huhu-review-080-t15-remainder-run.mjs --ticket T-15 --matrix standard --out /tmp/huhu-review-080-t15-remainder | 0 | 仅诊断：过滤 F3 并将 loading 等待改为观察实际通用回退，再等重载完成；其余键盘/减少动效、视图、编辑删除空态、冲突保留、同名 ID、企业通用、失败保留输入通过，不能替代原 runner |
| pnpm run check:bundle | 126 | 内存打包完成；唯一预算失败为 health activation 15209 > 10240，属并行 health 范围，未归因 T-15 |

check:bundle 首次手工命令误传根目录 bundle-budget.json，ENOENT；已使用 package.json 的正式命令更正，结果如表。非零 126 为当前工具包装返回值，Node/门禁自身设置非零失败。未运行全仓 lint/全量测试；定向范围如表。正式 UI runner、最终 main.js/styles.css 一致性、真实 Obsidian/popout/设备验收留给 Lead，不能据此报告 Ticket done。

所有诊断脚本、JSON 与截图均只在 /tmp；报告中本地路径为纯文本。/tmp 复制 runner 只改变测量/用例调度或注入复现动作，仍加载原冻结 TSX、生产 owner 服务和当前生成样式；其中记录的 inputDigest 源自原输入图，不能将该摘要误作诊断脚本与正式 runner 完全相同的证明。

## 来源与项目 Skill 执行

- dev：核对路由、服务归属、文件事件重载、命令取消、动态修订及测试接缝；扩展生命周期反例，未跨模块改代码。检查 i18n、架构、类型与内存 bundle；health 预算失败单独保留，不混成 T-15 finding。
- ui：对照 DESIGN 与 UI-001 final；使用现有 React/DesignScope/Dialog 及双 document 实测；核对语义名称、44px、长文本、主题/语言/缩放、减少动效和失败状态，明确区分正式 runner 与诊断。
- 来源登记 docs/third-party/bz.md:36 已包含固定提交的 src/people/ui.ts → ui/person/，注明稳定 ID、现有编辑/关系/T-14、排除聊天与画像；PersonReadingPage 文件头保留 MIT 上游、提交、路径、版权和适配说明。已只读获取固定提交的 render.ts/ui.ts，与实现者保留的参考字节一致，未引入未经授权的上游功能。
- 原始来源：https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/people/render.ts 及 https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/people/ui.ts 。本人读取的副本：/tmp/huhu-review-080-bz-render.ts、/tmp/huhu-review-080-bz-ui.ts。

## 问题与下一步

Lead 应一次处理 F1–F5，补上导航/卸载晚确认及重载草稿回归，重建独占样式后重新冻结交复审；F3 修正后仍必须验证 F4 和 loading，不可把首个断言变绿当成完成。health bundle 预算由对应 owner 处理，最终产物与宿主验收由 Lead 串行接续。当前 completed 只表示审查报告已交回，两轴均未批准候选。
