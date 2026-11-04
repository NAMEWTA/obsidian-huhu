# 任务回报

Session: 20261104T095541Z
Task: 074-review-t14
Status: completed

## 聚焦交接

已完成 T-14 冻结候选的独立双轴审查，未参与实现或修复。AC-502/503、DEC-002 及相关数据回归通过，未发现新的数据写入或兼容问题；保留一项 minor：人物纪事的上游采用范围尚未补入来源登记。标准轴与规范轴均为 request-changes，原因仅为该登记缺口。请 Lead 补齐具体映射后复核；本报告 completed 只表示审查交付，不代表 Ticket 完成。

## Review

- Risk: medium；Strategy: independent；Independence: required，当前 reviewer 未参与本票实现或修复。
- Review-Mode: working-tree；Base-SHA / Observed-HEAD 均为 `29644dc5833bb209e6282f84fa71441a5a1b99d4`，工作区 current/dev。
- Input-SHA256: `08058cc89024553535e83de567cca6365bf0b45a8e731e721a3e86fccb1aa358`。TASK 已完整读取；起始 sha256sum --check、中途及写报告前 9 个文件均匹配。review-scope 显式选择该 9 路径，退出 0，未扩大到其他票 dirty 内容。
- Basis: T-14、069 实现 REPORT、Spec §5/AC-502/503/DEC-002、Ticket 来源约束及 AC-001、ADR/CONTEXT、Map 总体实施背景、Goal Plan、AGENTS.md、dev Skill 和已读未变的 SpecDev 运行/范围/reviewer-contracts/risk-review 合同。dev Skill 摘要仍为 `d217057f068f3fe9e59205fa372896c298dcd9afda5da1c46f7e441d5018283e`。
- 完整检查新增 journal/preset/service/test 及黄金样本，核对 labels/application/i18n 的本票差异；这些共享文件中的已验收归物部分只作波及回归。沿 application.personJournal → catalog/query/commands → DefinitionCommands、EntityCommands、RecoveryCommands → runtime/Markdown codec 检查实际发布、哈希、合并、备份及写入边界。
- 本票无 UI；ui Skill、Design Conformance 和组件 E2E 不适用，不为此增加 UI 流程。

## Standards Axis

Result: request-changes

### F1 — minor：人物纪事的上游采用映射未登记

- 文件:行：`src/modules/archives/core/person-journal/preset.ts:2`；对应缺失位置为 `docs/third-party/bz.md:16` 的逐项登记表。
- 问题：新 preset 文件头明确声明从固定 bz 提交的 `src/people/types.ts` / ManualEvent 改编手工事件概念，但当前来源表没有该上游路径、ManualEvent 或 person-journal 落点。Ticket 执行约束要求文件头署名与登记同步完成；069 交接也明确将来源表补充留给 Lead，目前尚未落地。
- 证据：本轮经 GitHub Contents API 读取固定提交，确认 ManualEvent 为上游手工事件类型；源码头已有仓库、完整 SHA、原路径、MIT、Copyright 与 HUHU 适配说明。完整读取当前登记表，并在写报告前检索 `people/types|person-journal|ManualEvent`，均无记录。
- 影响：实现采用范围与中央来源清单不一致，无法从登记表定位本票采用内容及其适配边界。该项为来源完整性 minor；数据路径测试通过不替代此要求。
- 建议：由 Lead 在来源表追加固定 SHA / `src/people/types.ts` → `src/modules/archives/core/person-journal/preset.ts` 的映射，准确说明只借鉴手工事件概念，改为同一档案 entityId/rowId table、显式修订与 CAS，保留标题/内容/关联 ID，不采用独立 people 存储、AI 或私密材料；验证列写实际核对和测试。reviewer 不越界修改该文件。

已检查且未发现新增问题的工程边界：

- 不可变 PERSON v2 与 `preset-type-person-v2` 保留，新能力经 `preset-type-person-journal-v3` 显式发布，父修订指向旧 v2；构造/读取服务不安装。用户自定义人物预设与表单保留，重复安装零新增写入。
- 安装不改旧实体字节或 schemaRevisionId。旧实体 CRUD 返回 upgrade-required，prepareUpgrade 只生成既有 owner 的 prepared 计划与原字节备份，resume 后才切换修订；底层恢复协议还检查未知属性冲突与当前哈希。
- CRUD 目标由 entityId/rowId 确定，拒绝路径替代、非人物、重复或缺失行、无效日期/空标题/非法或重复关联 ID。begin 时核对 expectedHash，save 仅将 journal 标为 dirty，复用现有三方合并和原子 updater；同 journal 竞态拒绝，无关字段并发改动保留。
- 行更新保留扩展列，删除仅移除指定 rowId。Markdown codec 的 surgical patch 跳过值相同的元数据，只改 dirty 字段；真实回归验证未知 YAML 引号/注释、notes 与自由正文（含原始换行）保留。
- 新服务仅为 archives 内 facade，经现有 ARCHIVES_COMMANDS 发布/保存/准备升级，无跨模块内部访问、独立人物存储、直接文件写入或新依赖。结构化错误未记录人物姓名或纪事内容，新增五个标签具备 en/zh。

## Specification Axis

Result: request-changes

| 合同 | 实际结论 |
|---|---|
| AC-502 | 通过：真实 application/commands 增改删 rowId 行；旧哈希拒绝、同字段竞态不覆盖、无关字段合并、其他行/扩展列/未知 YAML/自由正文保留。 |
| AC-503 | 通过：两个同名人物分别添加同名 rowId，内容与哈希独立；修改/删除一人的纪事不影响另一人。 |
| DEC-002 | 通过：保留原 v2、新修订显式发布、旧实体不重解释、升级前备份、自定义预设与表单不覆盖。 |
| IN / OUT | 日期、标题、内容、关联实体 ID 的 table 与显式发布/CRUD 均存在；未引入私密材料、AI、另一人物数据权威或 UI 范围。 |
| Ticket 来源约束 / AC-001 | request-changes：F1 的逐项来源登记尚未完成。 |

规范轴未把 AC-502/503 已通过误写为失败；request-changes 来自本 Ticket 同时明确要求的来源登记。当前源码功能无已确认 major/blocker。

## 黄金样本与兼容判断

本票有意新增 `person journal table and preserved Markdown` 一项：同档案 YAML 的 person-journal table 保存稳定行 ID、日期、标题、多行 Markdown 内容及关联实体 ID，原 notes 继续使用管理的 Markdown 字段块。测试解码后 values 与输入相等，未改变 v2 封套、旧 PERSON 身份或旧实体绑定。

对照 base，旧税务 inline golden 保持；现有归物表格样本属于已验收 T-08，当前外部 snapshot 中保留该项并追加人物纪事项，没有为本票改写其预期。亲跑未带 -u 的黄金样本回归通过，未更新任何快照。

## 产物与验证

本次唯一仓库写入为本 REPORT。未修改业务/测试源码、冻结 TASK、旧报告、正式 Evidence/Ticket/Map/Goal、依赖、预算、main.js/styles.css 或来源登记；未执行 Git 写操作、安装、build/build:css/notices、提交、推送或发布。i18n 读取原脚本，仅将临时字典输出移至 /tmp，未重写 scripts/tmp 的共享缓存。

| 亲自执行的命令/检查 | 退出码 / 实际结果 |
|---|---|
| TASK 9 文件 SHA-256，多次 | 0；全部匹配。 |
| `pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/archive-relation.test.ts` | 0；17 文件、108 测试通过，含 5 项人物纪事服务测试和 3 项格式测试，无快照更新。 |
| `pnpm exec vitest run --project dom src/modules/archives` | 0；5 文件、18 测试通过。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json` | 0。 |
| `pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json` | 0。 |
| `pnpm run lint` | 0；全仓零警告。 |
| `pnpm test:architecture` | 0；1330 模块，无分区/宿主/桌面/barrel/循环违规。 |
| `pnpm check:bundle` | 0；内存构建，原预算整体 within limits；startup 131.5 KB、archives activation 260.2 KB，未提高阈值。 |
| 原 verify-i18n 等价执行（node --input-type=module，输出迁至 /tmp） | 0；33 词典、5416 键，en/zh、占位及字面引用通过。仅改变输出位置和已有依赖的解析位置，断言未改。 |
| `validate-specdev.mjs --review-scope --repo /home/wta/projects/obsidian-huhu --mode working-tree --base 29644dc5833bb209e6282f84fa71441a5a1b99d4 --file`（逐个 TASK 9 路径） | 0；显式范围/base/head 正确。 |
| `gh api` 固定提交 `src/people/types.ts`，解码并查看 ManualEvent | 0；确认来源概念与新文件头一致。 |

来源原文：https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/people/types.ts 。本轮只读核对，无新复制或改编。

本地过程材料（纯路径）：

- /tmp/huhu-074-bz-people-types.ts
- /tmp/huhu-074-verify-i18n.mjs
- /tmp/huhu-074-i18n-dictionaries.cjs

未验证项：未运行全仓 pnpm test、真实 Obsidian、T-15 UI/升级确认交互或统一产物构建。本票 E2E disposition 为 not-required；服务测试不冒充可见入口、用户确认或真实宿主验收。

## 问题与下一步

无审查环境阻塞，9 个冻结输入未漂移。Lead 补齐 F1 来源表映射并回读实际内容后复核该项，再维护正式 Evidence/Ticket；不需要为登记修复扩大业务改动或重跑未变化的全部数据回归。T-15 后续消费者仍应保留显式安装/升级确认与冲突提示。
