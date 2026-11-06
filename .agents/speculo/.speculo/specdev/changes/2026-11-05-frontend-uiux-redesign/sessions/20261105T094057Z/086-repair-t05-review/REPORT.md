---
schema_version: 2
session: "20261105T094057Z"
task: "086-repair-t05-review"
kind: implementation-report
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-05"
---
## 聚焦交接

三个已确认 P2 的局部修复已落地并冻结，待独立 high 审查及 Lead 原生最终验收。未写正式 Evidence/state、资产、index；未提交、未委派。

写集仅 `src/modules/task/ui/TaskPage.tsx` 和现有相邻 `task-domain.dom.test.tsx`；新增/删除文件均为零。基线为开工真实 dirty 字节，未把 Root29 词典/入口分层变化计入本次。实际入口是 TaskPresentation.select → selectedId → TaskPage → TaskEditor；TaskEditor 原始值只初始化读 get，故异步记录到达需要由 TaskPage 延后挂载。共享 SegmentedControl 已有 wrap，不改共享组件。

## 实现与风险

1. routeSelection 消费实际变化的 selectedId，保留当前本地 selected 作为详情事实源；同一路由不会在关闭或本地切换后立即重开。新路由仍经 dirty 确认分支；路由变化及清空后重新请求均可定位。selectedId 先到时仅等任务存在才挂载 Editor，避免空初值跨越异步数据到达。
2. 完成操作捕获查询/分页/视图/compact/详情选择的 owner identity；晚到结果只有仍属当前 owner 才能设置 held/undo/error。真实 execute、服务状态、条件 undo 与 pending 去重/清理协议保留。查询/视图切换继续清理旧 held 与 owner Window 计时器；分页仍可正常推进，offset 不被新增到重置 offset 的 effect 依赖。
3. 四选项状态 SegmentedControl 直接开启 wrap，保留计数、四项及既有键盘/选中实现，无基础样式变更。

## 红绿与实际验证

- 真实 TaskPage + TaskService + repository（仅外部 execute gate 延迟）原两反例：深链关闭重新打开、Alpha completion 晚到污染 Beta 查询，修前均红；普通本地关闭与不换查询两正控制均绿。定向命令 `pnpm exec vitest run --project dom src/modules/task/ui/task-domain.dom.test.tsx -t 'closing an editor remains|a pending completion remains'` 工具退出 126，Vitest 明确 2 failed / 2 passed / 18 skipped；失败来自目标断言，不是启动失败。原始 red.log 在本地目录。
- 异步 route record 到达回归先红：期望 Late route record，实际空 title；同一定向 Vitest 命令（-t 'a routed task arriving'）退出 126。延后 Editor 挂载后通过。
- 最终 `pnpm exec vitest run --project dom src/modules/task/ui/task-domain.dom.test.tsx` 退出 0，28/28 通过。覆盖原 18 项、两组各含正反控制的 4 项、route 本地切 B/更新路由/清空再请求、filter/view/selection/search-away-and-back 四边界、异步记录到达。原完成保留时间、条件 undo、失败 refresh/retry、新 revision 不覆盖等仍绿。
- `pnpm exec eslint src/modules/task/ui/TaskPage.tsx --max-warnings 0` 最终退出 0。首次检查发现 useMemo 空对象依赖 warning，已改为显式捕获 scope 值，未禁用规则。测试文件被项目 ESLint 忽略，未声称其 ESLint 通过。
- `pnpm exec prettier --check src/modules/task/ui/TaskPage.tsx src/modules/task/ui/task-domain.dom.test.tsx` 退出 0；新增最后回归随后再由同命令 --write 格式化。
- `pnpm exec tsc -noEmit -skipLibCheck` 和 `pnpm exec tsc -skipLibCheck -p tsconfig.test.json` 均工具退出 126；完整日志为图外现存旧 Button/Badge 等 props 迁移错误，无本次 TaskPage/task-domain 诊断。未以全仓 types 通过汇报。
- `node scripts/ui-review/run.mjs --suite frontend-redesign --ticket T-05 --matrix redesign --out /tmp/huhu-t05-review-repair/runner-check --check` 退出 0，仅 preflight，非像素/命中通过。

## Design Conformance

遵循 TASK 固定的 DESIGN3/UI002 摘要 49208ef32d8c84c5bf0c755a52a8a5ef07bf9e96e92c4ded09b870cc93b9cc66，改动仅状态分段复用批准共享 wrap。未删除 Overdue、改基础组件、放宽 native 断言或改版。320fine 原红灯及390coarse/字体/200%最终像素验收仍由 Lead 持有；本 Worker 未运行新浏览器单组或 Obsidian，不把 DOM/--check 冒称此门已过。

## 真实快照与产物

本地过程材料均位于 /tmp/huhu-t05-review-repair，不入 evidence：baseline.json、*.before.tsx 为开工两个真实源；candidate.json 为继承084完整52路径集合加当前task/ui/i18n.ts共53路径模式/字节/hash；changes.json 固定完整路径集合、摘要与新增/删除零；candidate/ 保存本次两个完整候选；*.diff 保存相对真实基线差异；red/late-route-red/final-dom/lint-final/types/test-types/runner-check日志。

基线 TaskPage SHA256 085099af9c5778e7570f2485f6428f7dd6ae9ce85187bb0687f8e6c9a70fe3c9，DOM e2a9ddbc8143a221235db179bd2fb31ceaa77085e5fcbcdfda841a95bf764853。

候选 TaskPage SHA256 253d25b699776439be548a1a16f49c5c8d1ea8233714a115d0c6b0ef55d0ca94，DOM 816f1d63bf62979f96780cf4fc34600edabbe3b2253b0c86fc2f092bc34894dc。两者模式均0o664。53项完整source-mode摘要 e66415562cf745d48244a239f2cdd017f4ac827b80836c1834ca41e3678a9f45。完整集其余项为只读依赖快照，非本次写集；084旧manifest不冒充086开工全范围基线。

## 问题与下一步

局部实现/DOM/scoped lint已足够，停止写源供 high。Lead 回读本次两文件真实基线差异与冻结hash，独立 high 完成后运行原66最终 native，统一构建样式和 JS/完整 lint/预算；本 Worker 根据独占边界未执行会写共享资产的 build/styles。若原生像素仍失败，沿原 owner 修真实原因，不放宽宽度或触达断言。
