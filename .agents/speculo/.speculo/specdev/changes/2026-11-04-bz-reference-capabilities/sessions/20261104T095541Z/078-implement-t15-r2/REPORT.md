# 任务回报

Session: 20261104T095541Z
Task: 078-implement-t15-r2
Status: completed

## 聚焦交接

已接续 077 的入口授权阻塞，实现 T-15 候选：真实人物详情按需加载概览、资料、关系、纪事四个视图；企业及同名的自定义类型仍使用通用详情。资料编辑进入现有 RecordEditor，关系使用 RelationPanel，纪事增删改及旧档案升级经过 T-14 owner 服务与既有 commands。纪事冲突保留输入，删除与丢弃草稿须确认，同名人物按实体 ID 隔离。所有本次适用非构建检查最终通过；正式状态、独立双轴审查、构建与 UI 矩阵由 Lead 接续，本报告不宣称 Ticket done。

## 产物与验证

### 本次修改/新增的全部文件

1. src/modules/archives/ui/generic/ArchivePage.tsx：仅新增 type-person 只读详情 lazy 分支及传递现有 owner、导航、编辑、资源和档案操作；未改企业/自定义通用分支。
2. src/modules/archives/ui/person/PersonReadingPage.tsx：四视图、人物稳定身份、分段导航、动态资料、原有资源及档案操作入口。
3. src/modules/archives/ui/person/PersonJournal.tsx：纪事列表、关联档案选择及跳转、增改删、旧档案显式升级、草稿离开保护、冲突/失败反馈与异步取消。
4. src/modules/archives/ui/person/common.ts：局部命中尺寸 token 与离开保护类型；避免组件循环导入。
5. src/modules/archives/ui/person/PersonReadingPage.dom.test.tsx：7 项真实生产入口测试，覆盖 AC-501/AC-504、企业与自定义类型、同名隔离、动态编辑、独立关系记录、纪事 CRUD、冲突、取消和升级。
6. src/modules/archives/i18n.ts：仅增加本票人物阅读层的 en/zh 文案。
7. scripts/ui-review/fixtures/T-15.tsx：生产 ArchivesContent + application + T-14；仅替代内存文件端口及宿主边缘，双 document，长文本、同名人物与企业样本。
8. scripts/ui-review/fixtures/T-15.mjs：标准矩阵断言与状态演练，覆盖亮暗/主题、中英、宽窄、200%、键盘、reduced-motion、44px 目标、输入有效宽度、冲突保留输入与失败状态。

RecordEditor.tsx 及其他 dirty 文件为原有/并行改动，本次未写入。未写 TASK、Ticket、Map、Evidence、永久知识或 Lead 独占构建产物；未作 Git 写操作、安装依赖、提交、推送或发布。

固定工作副本快照（8 个文件及本地清单）：/tmp/huhu-078-final-snapshot。返回前逐文件核对与快照一致；过程日志、预检结果与快照仅留本地，不入 evidence。

### 关键决定

- 人物判定使用稳定 type-person ID，既不按名称判断，也不迁移企业/自定义记录。页面以实体 ID 为 React key，同一人物刷新时保留正在编辑的纪事草稿。
- 资料展示使用实体绑定的 schemaRevision 字段；完整编辑复用既有 RecordEditor 与模板。原有资源、归档、升级及持久草稿恢复入口保留在资料页展开区。
- 所有纪事写入使用 application.personJournal.add/update/remove；打开编辑时捕获 expectedHash，失败不覆盖本地草稿、不写入其他人物。关联选择复用 EntityPicker 并保存实体 ID。
- 浏览不自动安装或迁移。旧人物仅在启用确认后调用 install、prepareUpgrade、resumeOperation；测试证明取消零写入，升级不影响另一个同名人物。
- 沿现有 guard 串接纪事/关系编辑器；离开、切换视图或进入完整编辑前保护输入。写入期间拒绝离开和重复提交，卸载时 AbortController 取消；反馈使用 owner document，成功反馈只在 owner 命令返回后发布，不包含纪事正文。

### 实际验证

工作目录均为 /home/wta/projects/obsidian-huhu。最终通过：

| 命令 | 退出码 | 结果 |
|---|---:|---|
| pnpm exec vitest run --project dom src/modules/archives | 0 | 6 文件、25 项通过，其中本票 7 项 |
| pnpm exec vitest run src/modules/archives/services/generic/person-journal.test.ts test/golden/archives-v2.test.ts | 0 | 2 文件、8 项通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 0 | 生产类型通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 0 | 测试类型通过 |
| pnpm run lint | 0 | 零警告 |
| pnpm test:architecture | 0 | 1335 模块，分区/宿主/启动/循环依赖检查通过 |
| pnpm test:promise-callbacks | 0 | 回调检查通过；执行范围偏差见下文 |
| pnpm test:ui-adapters | 0 | 50 项正反检查通过 |
| pnpm test:ui-runtime | 0 | UI runtime 回归通过 |
| node /tmp/huhu-078-verify-i18n.mjs | 0 | 等价执行仓库 verify-i18n.mjs，仅把输出改为 /tmp 并解析本地依赖绝对路径；33 词典、5440 键通过 |
| node scripts/ui-review/run.mjs --ticket T-15 --matrix standard --out /tmp/huhu-078-ui-preflight-snapshot --check | 0 | 生产 fixture 导入图与 owner-document 适配预检通过；0 个浏览器矩阵案例，不能视为视觉通过 |
| git diff --check -- src/modules/archives/ui/generic/ArchivePage.tsx src/modules/archives/i18n.ts | 0 | 无空白问题 |

TDD/修正记录：先新增真实入口测试；实现前定向 DOM 命令出现 1 失败/1 通过（找不到 Person views，工具返回非零 126），实现后通过。纪事升级测试最初误把 CommandReceipt 当作带 schemaRevisionId 的实体，改为比较 query.entity 的升级前值，保留原断言意图。lint 曾发现不安全对象字符串化，已改为字段类型判断；架构检查曾发现人物组件循环导入，已抽出 common.ts，最终复查通过。第一次 fixture --check 命令遗漏 --matrix/--out，参数检查失败（非零 126），使用上表完整命令后通过。

本地结果：/tmp/huhu-078-dom-final.log、/tmp/huhu-078-unit.log、/tmp/huhu-078-tsc-final.log、/tmp/huhu-078-tsctest-final.log、/tmp/huhu-078-lint-final.log、/tmp/huhu-078-architecture.log、/tmp/huhu-078-i18n.log、/tmp/huhu-078-adapters.log、/tmp/huhu-078-runtime.log、/tmp/huhu-078-ui-preflight-snapshot/result.json。

### Skill Execution Records

- dev：沿生产 route 的 ArchivePage/RecordEditor/RelationPanel、调用方与 T-14 服务核对后才修改；只新增所需 lazy UI 分支，不跨模块私有目录、不改公共 API 或服务。纪事保持 owner 服务数据归属，组件不直接读写文件；文案进入 archives 双语词典。用真实 owner 内存文件端口测试持久化、冲突和 ID 隔离；按测试选择表运行类型、lint、架构、纪事与黄金样本检查。构建按 TASK 的明确归属交 Lead。
- ui：复用现有 ReactSurface/DesignScope、Button/Input/Textarea、EntityPicker、RelationPanel 和共享 Dialog，未新增叶子或自造设计系统；仅使用语义 token/Tailwind，局部 --nd-hit-size=44px，无字面量颜色、!important 或全局 CSS。四视图使用真实具名按钮、aria-pressed、具名 navigation/section，输入有 label，反馈使用 status/alert。弹层从 owner 取得 document；离开保护与卸载取消通过现有生命周期串接。fixture 覆盖双 document、键盘、减少动效和宽窄长文本；正式视觉结论留给 Lead。

### Design Conformance 候选

- DESIGN revision 2，digest：1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00；页面 PERSON-READING；合同 AC-501、AC-504。
- 已实现状态：default/overview、loading、empty、error、profile、relations、journal、journal-edit、journal-delete、conflict、same-name、generic。人物首字占位与稳定身份、四视图分段导航、动态资料、独立关系、纪事编辑和删除确认均有生产实现；不引入素材、AI 或画像生成。
- 相对 mock 的实现适配：资料按真实 schemaRevision 渲染；旧档案增加显式启用/升级流程；原有资源及档案动作收在资料页展开区；极窄容器分段按钮纵向排列。未重新选风格。允许差异及所有像素/视觉符合性须由 Lead 对照 DESIGN 与正式截图判定，本执行者未宣称视觉验收通过。

### 来源与署名

布局借鉴固定 MIT 上游 yeshimei/bz，提交 d76a0870329403247917a00c43019e203a2560a4 的 src/people/render.ts、src/people/ui.ts；原版权 Copyright (c) 2026 叫我包仔。PersonReadingPage.tsx 文件头保留来源、提交、路径、版权与 HUHU 修改说明（动态结构、稳定身份、独立关系/T-14、排除素材/画像/AI）。Lead 请将该采用记录汇总到只读的 docs/third-party/bz.md。上游只读参考本地留在 /tmp/huhu-t15-bz-render.ts 与 /tmp/huhu-t15-bz-ui.ts。

### 未执行，owner Lead

- pnpm run build、pnpm run build:css；main.js/styles.css 串行生成。
- pnpm check:bundle、pnpm check:notices、pnpm notices 及许可汇总。
- node scripts/ui-review/run.mjs --ticket T-15 --matrix standard --out temp/ui-review/T-15；当前仅 fixture 预检。正式构建后检查宽窄/主题/语言/缩放、长文本换行、控件尺寸与有效输入宽度、键盘焦点、减少动效及全部状态截图。
- 真实 Obsidian popout/设备验收与独立双轴 reviewer，正式 Evidence/状态更新。

## 问题与下一步

实现无阻塞；以上 completed 仅表示候选交回。Lead 可基于本地固定快照进行独立审查、串行构建和正式 UI 矩阵。

执行范围偏差须 Lead 核验：我误将 pnpm test:promise-callbacks 当作不写仓库的门禁运行；该脚本实际在 src/promise-regression-ivlcLf/ 临时创建 callbacks.ts 后自行清理，违背本 TASK 的门禁不写仓库约束。未保留或手动修改该路径；事后 rg --files src 确认已无 promise-regression 文件。与它同时运行的首次架构检查还观察到该临时未知分区；待脚本自动清理并修复本票循环导入后，单独复查架构通过。未运行其他写产物的门禁，i18n 校验的生成物明确放在 /tmp。此偏差不应隐去或当作授权扩张。
