---
schema_version: 2
session: "20261105T094057Z"
task: "076-implement-t12-settings"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-12"
---
## Goal
完成T12完整设置、外观与图标垂直替换，不停在规划或单个演示页。用户明确medium实现/high审查、全部16票、严格UI002、不要旧兼容；Root在继续同一Goal。
## Inputs
先按AGENTS workspace/catalog发现、dev/ui与适用参考、SpecDev I读取规则；Map23/Goal/Spec/T12、批准DESIGN3/UI002，设计摘要49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66不变。ui SKILL SHA12621917181e3a74f3a410a710752e8e856d9a84af739ef6c97c85f79bca1ad4，dev d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e。T01/T03/T04/T15正式done/GCONTRACT已关。当前HEAD37fcede4210a19bcc2a74809e7fdd301e5717957，保留全部既有dirty与staged。T06及Root共享8源正在075冻结审查，不触碰；T07/T16分离。
已有源根src/app/settings/{appearance.ts,app-schema.ts,nav.ts,react/**}、src/modules/icons/ui/**/styles/host-icons.css及workbench设置入口；先核对调用方/真实字段与原有测试，简列最小影响后直接实现。现AppearanceSettings import deriveCustomTokens已被T01删除；应消费新theme公开能力，不添加旧函数alias。实际theme/settings/runtime/custom源与新token为权威，不猜API。原appearance parseExport接受v1，按T12删旧分支及对应测试，只支持当前v2。
## Workspace and Scope
只写T12 frontmatter writable_paths：app/settings/**、icons/ui/**、icons/styles/**、app/workbench/settings-categories.ts/settings-page.tsx/settings-page.dom.test.tsx、T12 fixtures/**；本不可覆盖REPORT及/tmp/huhu-t12-implementation。theme/**只读，所有i18n/资产/package/lock/构建脚本/compose等shared由Root单写，需改先发具体缺口/精确路径与en/zh提案，不能跨模块私有导入。无委派/worktree/commit/push/version/release/真实用户vault写入；不改node_modules。先保存现有真实起点/hash/模式，已有脏改动不可归为自己。
## Acceptance
按DESIGN §6 settings/UXSET1–2及完整覆盖清单，完成设置能力过滤/真实字段搜索索引与精确分组页签行定位；保留模块字段由各模块settings-page提供，不复制设置实现。统一唯一SettingsRow/Section/FormField/按钮/导航控件，窄屏上下排、触控44与同页真实leaf宽度；无旧色、私有spacing/字体/硬像素体系。外观使用批准纸/墨、配色来源、强调色、界面/正文字体和字号、density、减少动效、正文独立主题与custom colors、实时工作台/浮层/日期预览；保存失败回滚/迟到结果/切窗口与卸载安全，不能预览写永久设置。只支持当前导入导出，不保留v1兼容。通用模块开关/路径与受管文件/语言等现有能力保留。
图标实际规则CRUD/重排/批量/路径选择/规则检查与usage检查/选择器/宿主图标样式按批准模板重做，保留原领域命令与并发/失败反馈。不重写存储或Iconic领域；成熟现有共享组件能做的不另造engine/store/popup/keyboard。新外部库仅在确有未熟悉缺口按研究合同/活跃GitHub与许可比较后提案Root，默认已有共享栈足够。
意义明确的原有风险与必要新回归（主题实时预览所有者/失败/当前导入/搜索定位/窄页保留状态/异步关闭）通过；scoped types/lint/DOM/unit与架构按实际改动选择，记录其它模块旧迁移债不吞错、不删除风险测试。提供真实生产组件T12 fixture覆盖全部设置/图标状态、main/iframe、1440/390+320/zoom2/IME/Promise/cleanup，worker仅--check，Root拥有最终assets/native全66/真实Obsidian。完成即冻结完整owned候选/删除说明/模式/hash及实际baseline，通知Root并停止写入等待high；不做推测边缘循环。
## Return
不可覆盖REPORT含聚焦交接/产物与验证/问题与下一步；实际字段/入口/删除风险承接、source API/文案交接、红绿/命令退出码、设计一致/未验证项、冻结清单。全部过程code/log/JSON/PNG/hash仅/tmp，Evidence仅Root写。validate-dispatch return后停止。
