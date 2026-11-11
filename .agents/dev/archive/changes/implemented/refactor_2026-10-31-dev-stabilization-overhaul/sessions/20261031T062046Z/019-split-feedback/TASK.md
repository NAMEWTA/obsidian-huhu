---
schema_version: 2
session: "20261031T062046Z"
task: "019-split-feedback"
kind: implementation
change: 2026-10-31-dev-stabilization-overhaul
ticket: T-18
---

## Goal
Astra low实现已确认T18单标签分屏静默无效的最小修复；Lead审查验收。T23源码/runner继续冻结，不混写。

## Inputs
Map14、Ticket18、diagnosis.md与diagnostics/T18真实红灯、Evidence T18-D01、spec AC251、dev/ui技能、DESIGN revision2 UI-TERMINAL、execution-boundaries。现有D确认仅单标签guard+丢失原因，不宣称历史宿主焦点全解。

## Workspace and Scope
唯一current/dev/base86c500556db1d64865c4cc7f1aff1dd83de071fa，严格Ticket18写集；仅本REPORT与授权源码/测试。共享UI/T23、Browser与所有集成冻结分支不可改；Lead独占正式记录和生成物。无Git、递归代理、真机Obsidian。

## Acceptance
四入口命令/快捷键/菜单/拖拽共用单一业务结果或可用性；单/双标签、最后标签、MAX_GROUPS、缺失tab/group、固定标签、非终端页、右/下/拖拽、多窗口目标覆盖。保留空组保护，不强行新建/复制/停止/重启终端。命令async open前捕获所属窗口与目标，async后重验证，不能改用别窗活动对象；成功有布局变化及合理焦点，拒绝有可读原因或可解释禁用。共享move新增返回值可被冻结Browser忽略，但不得改变其效果/新增Browser通知或按钮逻辑。只能非Browser既有入口读取结果显示，保持原所有者边界。

先运行D反例记录真实红，再迁成正式core/service/controller/DOM保护；反馈t()双语，复用既有控件与已批准120ms动效，不新增视觉方向。读现有消费者/依赖后简报预计修改再动手。模型/DOM/i18n/architecture定向和Lead指定E2E，真实宿主由用户；若CSS/样式工具需要改不是本票默认范围。完成只停止本写集，不重跑无失效全仓重型验证。

## Return
本REPORT按模板，真实源码/四入口映射/红绿/命令退出/剩余边界；停写候选给Lead。用户未授权提交推送。
