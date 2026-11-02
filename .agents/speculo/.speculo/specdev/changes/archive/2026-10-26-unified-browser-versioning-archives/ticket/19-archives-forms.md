---
{
  "schema_version": 3,
  "plan_contract_version": 1,
  "skill_scan": "已枚举 .agents/skills/**/SKILL.md 元数据；dev 适用全部实施票，ui 适用界面票；SpecDev 路由不伪装项目 Skill。详见 evidence/ticket-planning-review.md。",
  "skill_bindings": [
    {
      "id": "dev",
      "path": "<Path>.agents/skills/dev/SKILL.md</Path>",
      "sha256": "f48b2cb3e1690b4da959ba2820b6076087b9f606f847a49ff5a9304594ed044b",
      "phase": "implement",
      "operation": "按本票行为实施并按项目规则验证模块边界、持久化和产物",
      "inputs": [
        "<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/tickets-map.md</Path>",
        "<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/19-archives-forms.md</Path>",
        "<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/spec.md</Path>"
      ],
      "outputs": [
        "<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-19.md</Path>",
        "本票源码与对应验证记录"
      ],
      "required": true,
      "on_failure": "block-ticket"
    },
    {
      "id": "ui",
      "path": "<Path>.agents/skills/ui/SKILL.md</Path>",
      "sha256": "ee5c7facae34a008a21c5c4b4c3a1b80afe617148c299fe4dcb08d7a6f6840ff",
      "phase": "implement",
      "operation": "按本票行为实施并按项目规则验证与 Design Conformance",
      "inputs": [
        "<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/tickets-map.md</Path>",
        "<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ticket/19-archives-forms.md</Path>",
        "<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/spec.md</Path>"
      ],
      "outputs": [
        "<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-19.md</Path>",
        "本票源码与对应验证记录"
      ],
      "required": true,
      "on_failure": "block-ticket"
    }
  ],
  "resource_claims": [
    "archives:public-contracts"
  ],
  "artifact": "ticket",
  "ui_change": true,
  "design_ref": {
    "revision": 2,
    "digest": "f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c",
    "pages": [
      "PAGE-001",
      "PAGE-002"
    ],
    "acceptance": [
      "AC-018",
      "AC-019",
      "AC-020"
    ]
  },
  "change": "2026-10-26-unified-browser-versioning-archives",
  "id": "T-19",
  "title": "类型设置与多表单实体编辑",
  "status": "done",
  "kind": "feature",
  "planning_depth": "standard",
  "planning_depth_reason": "已有明确行为与批准页面，复用既有接缝完成局部纵向交付。",
  "ready": true,
  "risk": "medium",
  "blocked_by": [
    "T-18"
  ],
  "contract_ids": [
    "AC-018",
    "AC-019",
    "AC-020"
  ],
  "owner": "native:root",
  "expected_changes": [
    "<Path>src/modules/archives/ui/forms.tsx</Path>",
    "<Path>src/modules/archives/ui/form-fields.tsx</Path>"
  ],
  "writable_paths": [
    "<Path>src/modules/archives/**</Path>",
    "<Path>test/golden/**</Path>",
    "<Path>scripts/accept-contacts-scale.ts</Path>"
  ],
  "read_only_paths": [
    "<Path>AGENTS.md</Path>",
    "<Path>.agents/skills/dev/references/testing.md</Path>",
    "<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/spec.md</Path>",
    "<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ADR.md</Path>",
    "<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/DESIGN.md</Path>"
  ],
  "shared_paths": [
    "<Path>main.js</Path>",
    "<Path>styles.css</Path>"
  ],
  "shared_path_owners": [
    "<Path>main.js</Path> => T-32",
    "<Path>styles.css</Path> => T-32"
  ]
}
---

# Ticket T-19：类型设置与多表单实体编辑

- 总控：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/tickets-map.md</Path>
- 上游：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/spec.md</Path>；<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/ADR.md</Path>；<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/sources/issue-3-body.md</Path>
- 完成证据（实施时创建）：<Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-19.md</Path>
- 执行入口：获得实施授权后按 Map → 适用项目 Skill → 当前 Ticket 顺序进入 <Path>{roots.workflows}/specdev/specdev-i-implement/SKILL.md</Path>；由 I 负责实现、独立双轴审查、验证与 Lead Evidence。

## 目标与来源

用户无代码创建第三类型及两套表单，共享实体值，改标签/停用字段不丢资料。

当前基线为合并提交 265e65f64bd0deb38fb7f1b5fccd08bfcb8a6bfa。现状与差距见 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/source-gap-analysis.md</Path>；既有 PR 功能按基线复用，不因拆票重写或预标 done。完整源条款补足 AC 分组，不以本票摘要替代原文。

## 行为与范围

**IN：** 按批准设计创建项目类型、两表单与模板；切表单、改标签、隐藏字段，重开后原值存在。

**REUSE：** 现有模块公开 api、vault IO、串行写队列、React 组件和测试夹具；跨模块只走 api.ts。

**OUT：** 其他票的产品行为、任意脚本/远程 schema、真实用户库迁移、远端修改和自动发布。可写集是本票上限，不是无关重构授权。

本票界面仅使用 PAGE-001, PAGE-002；实施前实际读取 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/DESIGN.md</Path> 与 <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/prototypes/UI-001/approval-sealed.md</Path>。Design Conformance 记录 revision/digest/page/AC、实际状态、1440/390 视口、明暗、键盘/焦点和原型差异。Obsidian 主窗/popout、原生 buffer 场景必须真实宿主验收，离线原型不替代。

## 验收标准

- [ ] AC-018：以 Spec 原条款为准，本票负责上述行为的相关分项；全部结果与失败负例写入 Evidence。
- [ ] AC-019：以 Spec 原条款为准，本票负责上述行为的相关分项；全部结果与失败负例写入 Evidence。
- [ ] AC-020：以 Spec 原条款为准，本票负责上述行为的相关分项；全部结果与失败负例写入 Evidence。
- [ ] 正常路径成立且失败可解释：类型版本变化、非法 codec、只读损坏数据、字段冲突显示原因并保留草稿；条件求值不执行脚本。
- [ ] 真实消费者、回归和必要中文产品文档同步；用户文案 t() 同时保留 en/zh。

## 本轮执行补充

依据 [SRC-010](../sources/SRC-010.md) 与 [Goal 本轮执行约定](../goal-plan.md)，本票代码实施和独立审查已授权；下述真实 E2E/实机/视觉/性能验收由用户执行，本轮不运行、不声称通过。定向自动检查与必要构建照常，生成物由 Lead 串行维护。旧 plan-only/待 run 文字不撤销本轮授权；产品范围和安全不变量保持。

## 验证方法

| 行为或风险 | 接缝与步骤 | 预期结果 | Evidence |
|---|---|---|---|
| 正常 | 按批准设计创建项目类型、两表单与模板；切表单、改标签、隐藏字段，重开后原值存在。 | 用户无代码创建第三类型及两套表单，共享实体值，改标签/停用字段不丢资料。 | <Path>{roots.state}/specdev/changes/2026-10-26-unified-browser-versioning-archives/evidence/T-19.md</Path> |
| 失败 | 类型版本变化、非法 codec、只读损坏数据、字段冲突显示原因并保留草稿；条件求值不执行脚本。 | 无越权/隐式覆盖或伪成功，保留可恢复事实 | 同上 |
| 回归 | pnpm test -- src/modules/archives；新增夹具与原夹具一起运行 | 既有 PR 与 v1 行为无无关退化 | 同上 |

- E2E disposition: required：Lead 在固定构建的一次性 vault/资料运行上述用户流程，保存宿主版本、操作、断言和截图。
- 运行环境：README 选定的唯一 change-workspace。验证前记录 HEAD、工作树差异摘要、配置、夹具 seed、系统/架构和 main/styles/native 资产摘要。平台票的必需实机不可用时保留待验收，mock 不替代。
- 测试命令中的接缝需随实现新增用例；“命令通过”不能代替上表行为断言。按 dev 测试参考运行必要构建，生成物由 T-32 Lead 串行维护，不在多票间并行写。

## 执行约束

1. 回读来源、依赖票 Evidence、当前消费者和真实项目 Skill；核对输入没有漂移。
2. 复用现有 React 字段/对话框和命令入口；增加 renderer registry；接通定义/实体保存；完成每状态与宿主验收。
3. 正常与故障夹具先固定输入，再实现接缝；保持旧数据可读，公开契约变动同步两端；完成本票验证与必要文档。
4. Lead 对固定输入验收并落 Evidence；失败按下述恢复条件处理，不把未经验证的实现标完成。

深度/风险/依赖及路径以 frontmatter 为权威。现有测试不随代码重构删除；确需替换时记录原风险由哪个新断言承接。文档消费者优先维护现有 docs 的所属章节，由 T-32 收集跨域说明；不直接写永久 ADR/context。

## 未决事项与风险

失败保留既有交互和草稿；回退本票代码前先核对用户工作区，不能覆盖其他改动。 源数据/接口、Skill 摘要、DESIGN 摘要或构建输入改变时，重算本票及其下游证据；无关已通过证据不重跑。若预检发现会改变范围、安全、兼容或不可恢复行为的未知项，停在对应写入前交 G/S；不推测用户同意。

本票不要求收缩旧格式；不得顺手移除仍被读取的持久协议或历史资料。

### 未决问题

无。
