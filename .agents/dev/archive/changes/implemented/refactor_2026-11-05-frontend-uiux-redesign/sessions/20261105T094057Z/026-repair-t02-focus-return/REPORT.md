# 任务回报

Session: 20261105T094057Z
Task: 026-repair-t02-focus-return
Status: completed

## 聚焦交接

025三项P2均已修复，原23文件形成新冻结点；仅modal-layer.tsx、dirty-modal.tsx、modal-regressions.dom.test.tsx相对024改变。独立19项由4失败/15通过转为19通过；本范围七文件50项通过。真实打包Chrome小探针通过两Document全部交互、6条叶子/主区几何与草稿记录、Sheet确认中转inline后Esc、真实FocusScope退出后的最终opener，以及owner根销毁后不抢另一个根的焦点。该探针只有1个matrix case，不能充当最终66项组合验收。

## 产物与验证

### 三项修复

- S-01：ModalLayer增加无布局、无焦点的template逻辑owner锚，记录其所属.huhu-ui区域；嵌套portal模态继承父级逻辑区域。空display:contents首选区域没有可用目标时继续合理区域选择，不把contents本身设为焦点目标。实际关闭优先保留来源/顶层模态，内部回退绑定存活逻辑owner；新增“另一个owner在DOM更前”的Sheet→inline取消控制，防止仅靠全Document首项凑绿。
- S-02：dirty确认的Content仅在父open=false时阻止子层过期closeAutoFocus；实际父关闭持有最终回焦。父仍打开的Keep Editing/Esc取消保持默认恢复，未一律禁用确认回焦。实际浏览器等待FocusScope真正退出及其排队microtask后再断言最终opener，原deep-tenth错误目标不再出现。
- S-03：延迟恢复前检查捕获的逻辑owner区域仍连接且可用；owner整个销毁时不进入其他根。锚卸载保留区域指针，不使用“ModalLayer一卸载就禁止”的粗略标志：新增条件式卸载Dialog组件但页面/opener仍活着的配对控制，仍恢复真实opener。来源单独移除、owner区域仍存活的局部回退继续通过。

没有新增全局监听、Tab trap、计时恢复、第二焦点调度器或跨模块依赖。模板不产生可见节点/布局盒，不把portal容器伪装成可聚焦区域。其余20条生产/测试源保持024字节；022/024/025历史检查点未改。

### 红绿与实际命令

全部过程材料只在 /tmp/huhu-t02-focus-repair；浏览器旧失败deep-tenth保持原样。

| 检查 | 结果 |
|---|---|
| 原025 vitest配置，未改独立反例 | reviewer-red.log：退出126，4 failed/15 passed；reviewer-green.log：退出0，19 passed |
| 新增本仓9项（真实FocusScope事件及配对控制）连同原12项 | own-red.log：退出126，4 failed/17 passed；own-first.log：退出0，21 passed |
| 原七文件组合 | dom-final.log：退出0，50 passed；保留原41风险，包括草稿/实例/选区/滚动、ref清理、隐藏焦点、dirty、IME、嵌套F6和imperative关闭 |
| pnpm exec tsc --noEmit --skipLibCheck -p 原022 scoped prod/test配置 | types-prod.log、types-test.log：均退出0，无新忽略或配置变动 |
| pnpm exec eslint 两个变更生产文件 --max-warnings 0 | lint.log：退出0 |
| fixture scoped tsc，同一既定skipLibCheck | fixture-types.log：退出0 |
| 实际Chrome打包小探针 | browser-settled/result.json：passed，errors0，1 case、4语言/Document交互组合、6详情记录、2 owner销毁记录 |
| 目标路径git diff HEAD --check | diff-check.log：退出0 |

小探针使用生产组件及正式严格esbuild适配器，仅将共享runner矩阵选择缩为最后1例，副本 /tmp/huhu-t02-implementation/deep-probe.mjs；最终必须用原始runner执行66例。首次browser-first通过新增前的交互和详情focus；后补真实退出信号的两个探针因CDP awaitPromise隐式等待监听设置表达式而停住，未当作绿灯，修正为void设置和bounded waitFor退出标记。browser-final探针曾人为补发一次诊断Esc；该次与browser-bounded均中止，仅清理其明确拥有的Node/Chrome，保留目录/说明；最终browser-settled为无外部干预的全新干净运行。没有靠固定sleep或更换期望解决产品失败。

### 冻结输入

生产与测试23文件：/tmp/huhu-t02-focus-repair/frozen/manifest.json。
摘要：fcbf558c3332ef56d09de383346b8333aed0b92f02eb5b6706e6fc9c10dad9dc。
基线：37fcede4210a19bcc2a74809e7fdd301e5717957。
fixture当时副本：/tmp/huhu-t02-focus-repair/fixture-checkpoint；按Lead许可011可独立继续fixture，后续修改不改写此快照。源码与测试冻结，无共享assets/config/package/dictionary/正式状态/index写入，无提交或委派。

## 问题与下一步

三项已知反例及配对控制全部通过，尚待独立high027复核。011最终66项组件矩阵、冻结fixture报告及Lead独立E2E仍待执行；真实Obsidian主窗/浮窗与下游整体迁移保留原票边界。本报告不宣称T02或Goal完成。
