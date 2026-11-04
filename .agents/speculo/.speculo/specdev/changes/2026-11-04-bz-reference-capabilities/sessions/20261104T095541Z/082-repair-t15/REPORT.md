# 任务回报

Session: 20261104T095541Z
Task: 082-repair-t15
Status: completed

## 聚焦交接

已修复 080 独立审查的 F1–F5，交回 T-15 修复候选，不宣称 Ticket done。删除/启用/丢弃确认纳入人物组件生命周期，离开后取消旧确认；重载期间保留同一人物最后有效的实体/修订和纪事草稿，读取失败时保留输入并禁止保存。修正 fixture 的可见文字输入测量、移除 fieldset 浏览器默认留白，补齐已批准概览的最近纪事与独立关系摘要及跳转。所有本轮适用非构建检查最终通过；正式 UI 矩阵、产物及独立复审由 Lead 接续。

## 产物与验证

### 修改/新增的全部文件

1. src/modules/archives/ui/person/PersonJournal.tsx：确认框绑定生命周期 AbortSignal；同一时间只允许一个确认，卸载关闭并返回取消；run 在调用 owner 前校验存活、实体 ID、运行状态与索引可用性。纪事 fieldset 显式 m-0/border-0/p-0，保留 44px 控件。
2. src/modules/archives/ui/generic/ArchivePage.tsx：缓存同一人物最后有效实体/修订；仅在匹配实体 ID 与 schemaRevisionId 的索引恢复期回用修订，避免重载/完成通知到实体查询返回之间卸载页面；完整且无读取错误的查询明确确认记录不存在时清缓存。企业/自定义类型仍走原通用分支。
3. src/modules/archives/ui/person/PersonReadingPage.tsx：索引恢复/读取失败时禁用数据写入区域、显示 loading/错误提示并保持子组件与 guard；新增外层 fieldset 同样清除默认留白；概览接入独立摘要组件。
4. src/modules/archives/ui/person/PersonOverview.tsx（新增）：真实纪事按日期降序取最近三条；从 query.relations 读取独立关系记录，提供总数、摘要、稳定目标 ID 跳转、空/加载/错误/不完整状态与进入完整纪事/关系视图的动作。完整资料继续归 Profile。
5. src/modules/archives/ui/person/PersonReadingPage.dom.test.tsx：新增 6 项回归；覆盖删除/升级等待时切换人物、持久 owner 下卸载取消、重复打开及重复确认、真实 reload→读取失败→恢复的草稿/guard/写入保护、概览真实纪事与关系入口。原有 7 项保留，共 13 项。
6. src/modules/archives/i18n.ts：仅增加 7 组本票 en/zh 提示与概览文案。
7. scripts/ui-review/fixtures/T-15.mjs：以渲染可见性、关闭 details、hidden/inert、CSS 隐藏/裁切和输入用途筛选；文字内容区不纳入 file/非文字控件。保留 >=100px 与 44px 阈值；增加打开资源区的可见文字字段断言，以及概览、等待删除时导航取消、草稿跨重载/读取失败/恢复断言。
8. scripts/ui-review/fixtures/T-15.tsx：只增加真实独立朋友关系样本，用于概览与关系验证。

RecordEditor.tsx、common.ts、所有服务/API/core、其他并行 dirty 文件、TASK/正式状态/Evidence 均未修改。未运行 build/build:css/notices、安装依赖或执行任何 Git 写操作。工作区仍为 dev，HEAD/base 29644dc5833bb209e6282f84fa71441a5a1b99d4。

固定交付工作副本：/tmp/huhu-082-delivery-snapshot，包含上述 8 个变更文件及未变的 common.ts 依赖；本地清单已逐文件回核一致。日志、截图、JSON、诊断脚本与快照均仅留本地，报告中的原始材料路径为纯文本。

### F1–F5 红绿证据与决定

- F1：新增导航删除/升级确认、重复打开/卸载用例，在旧实现上失败。修复后相同持久 document.body owner 下切换人物会关闭旧独立 Dialog；保留旧按钮引用再激活也不调用 remove/install、不增加写次数。另增加重复确认只调用一次真实 remove 的断言。AbortSignal 同时覆盖确认等待和已开始的 owner 写操作，run 的存活/实体代次检查防止卸载后启动新写入。
- F2：旧实现真实 reload 暂停读取后丢失 Title，失败。修复中又发现完成通知先于实体查询返回的短暂空档，已保留缓存直至实体查询给出权威结果。最终用例证明 loading、读取失败和恢复全过程标题/当前纪事视图及离开保护保持；不写文件，字段禁用，直接提交事件也不能绕过保存保护；恢复后能通过真实 owner 保存。
- F3：本人修复前用 Chrome 定向复现：420/en/light/1x Profile 将隐藏 file input 的 44px 当成文字宽度，断言失败。修复后排除关闭/隐藏/裁切及非文字辅助控件；默认关闭与打开资源区均使用实际 fixture 测量断言，普通可见文本仍接受 >=100px 检查，没有放宽阈值。
- F4：同一份现有 styles.css、Chrome 153.0.8010.47、main + iframe 下，修复前 420px/200% 实际日期内容区 99px，标题/正文/关联搜索各 75px；清除内外 fieldset 默认边框、margin、padding 后分别为 129px、105px、105px、105px。1x 分别为 339px、315px、315px、315px；44px 控件及无横向溢出断言保持。已查看实际 2x 截图，不改外层只读 workbench-page，也未生成新仓库样式。
- F5：旧概览缺少 Recent notes，新增用例失败。最终概览显示真实近期纪事及独立 Friend 关系，View all notes/View relationships 进入对应生产视图，另一同名人物显示自身空纪事；fixture 也断言两分区存在，并种入真实关系。

红阶段定向 DOM：5 失败/7 通过，工具退出码 126；定向浏览器 F3/F4 探针：2 个组合均失败，工具退出码 126。最终定向人物 DOM 及更广回归均通过。过程中初次类型检查发现 personSnapshot 可选链比较 undefined 后的解引用问题（TS18048，非零 126），更广测试也暴露其通用列表回归（2 失败/135 通过，非零 126）；已改成显式存在判断，企业/自定义与列表全部恢复通过。没有删减旧断言或提高超时/阈值。

### 最终通过命令

均在 /home/wta/projects/obsidian-huhu 执行：

| 命令 | 退出码 | 结果 |
|---|---:|---|
| pnpm exec vitest run --project dom src/modules/archives | 0 | 6 文件、31 项通过；人物 13 项 |
| pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/archive-relation.test.ts | 0 | 20 文件、138 项通过，含服务、DOM、黄金样本和关系 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0 | 生产类型通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0 | 测试类型通过 |
| pnpm run lint | 0 | 全仓零警告 |
| pnpm test:architecture | 0 | 1338 模块，无分区/宿主/启动/循环违规 |
| pnpm test:ui-adapters | 0 | 50 项正反检查通过 |
| pnpm test:ui-runtime | 0 | UI runtime 回归通过 |
| node /tmp/huhu-082-verify-i18n.mjs | 0 | 等价仓库 i18n 门禁，仅输出移至 /tmp 并绝对解析既有依赖；33 词典、5447 键/占位符/字面引用通过 |
| node scripts/ui-review/run.mjs --ticket T-15 --matrix standard --out /tmp/huhu-082-preflight-delivery --check | 0 | fixture 生产导入图预检通过；0 个正式浏览器矩阵案例 |
| node /tmp/huhu-082-field-probe.mjs --ticket T-15 --matrix standard --out /tmp/huhu-082-final-fields | 0 | 定向诊断：420/en/light 的 1x、2x，双 document，真实 fixture verify 和现有生产 CSS；2 组合通过 |
| git diff --check -- src/modules/archives/ui/generic/ArchivePage.tsx src/modules/archives/i18n.ts | 0 | 无空白问题 |

浏览器诊断脚本是只在 /tmp 的 runner 副本，限制为上述两个组合、增加字段采样、跳过正式完整 exercise；修正后因概览新增断言显式先回 Overview，再调用原 fixture.verify。没有替代生产组件、改原 runner、注入修正 CSS 或降低输入/命中区断言，不能将它描述为正式 48 组合验收。

关键本地证据：/tmp/huhu-082-red-dom.log、/tmp/huhu-082-red-fields/result.json、/tmp/huhu-082-final-fields/result.json、/tmp/huhu-082-final-fields/420-en-light-2x.png、/tmp/huhu-082-green-dom-3.log、/tmp/huhu-082-dom-delivery.log、/tmp/huhu-082-all-final-2.log、/tmp/huhu-082-tsc-delivery.log、/tmp/huhu-082-tsctest-delivery.log、/tmp/huhu-082-lint-delivery.log、/tmp/huhu-082-architecture.log、/tmp/huhu-082-i18n-final.log、/tmp/huhu-082-preflight-delivery/result.json。

### Skill Execution Records

- dev：核对当前 ArchivePage→人物页→纪事/编辑/关系→T-14 owner 链路和 runtime.reload 的消费者边界后，以授权 UI 修复处理问题，不改只读服务/公共 API。写入仍只经过既有 owner；缓存仅用于 UI 恢复并按实体 ID/修订限定，不另建持久化。确认和写入纳入卸载取消；文案放所属词典双语。先用真实生产入口失败测试，再验证服务、关系、黄金样本、类型、架构、i18n 与 lint。未运行会临时写 src 的 Promise 门禁，i18n 输出明确在 /tmp。
- ui：对照 DESIGN revision 2/UI-001 final 的最近纪事与关系概览，复用 Button、Input、Textarea、Dialog、既有 DesignScope/ReactSurface；未选新风格、加全局 CSS、字面颜色或 !important。使用 ownerDocument 的确认框和生命周期取消；保留语义按钮、导航、section、标签、焦点及 44px 局部 token。极窄宽度通过清除浏览器 fieldset 默认留白修复；真实 Chrome/现有样式进行定向红绿和截图观察。正式主题/语言/缩放与 reduced-motion 全矩阵由 Lead 执行。

### Design Conformance 候选

绑定 DESIGN revision 2，digest：1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00；页面 PERSON-READING；AC-501、AC-504。保留 default/profile/relations/journal/journal-edit/journal-delete/conflict/same-name/generic/empty；修复 loading 与 read-error 状态下的视图、草稿及 guard 持续性，补齐 overview 的真实最近纪事和关系分区及动作。资料仍按实体 schemaRevision 使用现有 RecordEditor，企业/自定义仍是通用布局；不引入素材、AI 或画像生成。此次恢复批准的信息结构，无新增删减设计；最近三条与前三条关系由真实数据生成，不使用原型 mock。完整像素/主题/键盘/减少动效符合性及允许差异仍由 Lead 对照正式矩阵与独立复审判定。

现有 PersonReadingPage 文件头的 yeshimei/bz MIT 来源、固定提交 d76a0870329403247917a00c43019e203a2560a4、src/people/render.ts/ui.ts 路径、Copyright (c) 2026 叫我包仔及 HUHU 适配说明保留。本轮未复制新上游代码；新增概览按批准 UI-001 final 的信息结构实现。第三方汇总由 Lead 维护。

### 未执行，owner Lead

- pnpm run build、pnpm run build:css 及 main.js/styles.css 最终产物生成。
- pnpm check:bundle、pnpm check:notices、pnpm notices。
- node scripts/ui-review/run.mjs --ticket T-15 --matrix standard --out temp/ui-review/T-15：请重建独占产物后重跑完整矩阵与扩展 exercise；本报告仅给出 --check 和两个定向组合。
- 独立双轴复审、正式 Evidence/状态、真实 Obsidian popout/设备验收。

## 问题与下一步

无实现阻塞、无本轮写集扩张；仅上述正式集成和验收由 Lead 接续。请基于固定候选复查 F1–F5、重新构建并运行完整矩阵，再由 Lead 决定正式状态。
