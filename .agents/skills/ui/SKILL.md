---
name: ui
description: >-
  添加、修改或审查本仓库工作台页面、面板、对话框、组件、主题或 CSS 时使用。
  负责布局、设计系统、动效与无障碍；模块装配和构建参照 dev。
  普通产品问答、界面使用说明和仅提到页面或主题的讨论不触发实现与验收流程。
license: LicenseRef-HUHU-1.0
metadata:
  short-description: 工作台界面、设计系统与主题
---

# 工作台界面

本技能负责本仓库界面的布局、组件、主题、动效与无障碍；模块装配、持久化、i18n、依赖与构建由 [dev](../dev/SKILL.md) 负责。普通任务遵循根 AGENTS 的授权与完成标准；读取本技能不会自动创建 SpecDev Change、审批或 Git 操作。

## 权威与任务路由

界面以当前任务已批准的设计为准。本轮替换的依据是 [DESIGN](../../speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/DESIGN.md) §3–7 和 [UI-002](../../speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/prototypes/UI-002/design-system.md)；全部表面按 [覆盖清单](../../speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign/frontend-coverage.md) 对照现有入口、字段与动作。维护文档用于查架构和领域，不能用其中的旧版式覆盖已批准设计。令牌值以 `src/ui/styles/tokens.css`、实际公共 API 以生产导出为准。

只读当前任务触及的章节，不递归展开所有链接：

| 任务 | 参考 |
|---|---|
| 页面、图标轨、侧栏、详情、列表状态与保存 | [shell.md](references/shell.md) |
| 令牌、组件、日期值、表单、库复用、CSS | [design-system.md](references/design-system.md) |
| UI 配色、字体、Markdown、外观设置 | [theme.md](references/theme.md) |
| 动效、键盘、焦点、输入法、读屏、命中区域 | [motion-a11y.md](references/motion-a11y.md) |
| Obsidian DOM API / 模块接入 / 验证选择 | [宿主 API](../dev/references/obsidian-api.md) / [模块](../dev/references/module-authoring.md) / [测试](../dev/references/testing.md) |

## 实施入口

1. 先查实际组件、调用方、领域 schema 与批准组合；列出最小写集和风险。页面放模块 `ui/`，通用无业务组合放 `src/ui/components/huhu/`。复用 React、shadcn/Radix、Tailwind 和已选库，不照抄参考项目的整页布局或新建第二套设计系统。
2. 只注册既有工作台视图。模块贡献页面/PanelModel，shell 管导航与布局；页面由 ReactSurface 挂载。自定义导航允许独立 React 根，不能假定它与页面共享 React context；具体所有权见 shell 参考。
3. UI 订阅所属服务、发送领域动作；保留当前字段、能力、取消、失败恢复与草稿，不用原型没画某字段作为删除理由，不在 UI 建业务仓库或改数据 schema。
4. 每个根和所属 Document 的 Portal 留在 `.huhu-ui` 内；用真实语义控件、可访问名称、独立命中区和可见焦点。隐藏保留与关闭卸载不同；窗口、事件、计时器和恢复焦点都归实际 owner。
5. 验证按 dev 的唯一选择表，覆盖受影响组合与真实宿主边界，报告实际结果。DOM 不证明像素/命中，Chrome iframe 不等于 Obsidian popout；原语未变的局部调整不重验全部工作台。

## 共享能力缺口

先验证当前导出能否表达领域值，再决定组合。日期、树、分屏、网格和差异解析/键盘复用已有库；不要因接口缺一个槽就复制引擎。缺失能力应回共享生产者，提出精确类型、调用方、写集及回归；共享 API 变动与消费者原子协调，不能偷偷加旧 UI 兼容分支或删除有效功能。

月份字段、产品月历/周条和 Git 差异已有生产实现，入口与适用值域见 design-system 参考；新增需求仍先核对真实导出，不能把设计目标名当作可用 import。小样只证明其实际输入与断言，不把原型模拟器或 mock 校验当领域/宿主通过。SpecDev 任务遇到共享接口或设计漂移，沿原 owner 修订范围与绑定；普通任务按既有授权继续必要工作，不额外发明状态流程。
