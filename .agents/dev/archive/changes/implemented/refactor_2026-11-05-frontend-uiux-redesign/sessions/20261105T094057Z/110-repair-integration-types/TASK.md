---
schema_version: 2
session: "20261105T094057Z"
task: "110-repair-integration-types"
kind: implementation
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-05"
---
## Goal
medium最小回收三个已确认的无行为集成清理点，不改功能/布局/数据。
## Inputs
AGENTS/dev/ui/SpecDev I、Map40/原T05/T10/T11、批准UI002；用户medium实现/high审查持续。当前真实生产tsc --noEmit --skipLibCheck仅TaskEditor.tsx:232 TS7030：autosave useEffect if条件分支return cleanup，其他隐式undefined，主配置noImplicitReturns=true而原fixture图没该选项。T05已明确窄重开，已验Calendar/TaskContent全冻结不变；原094+66证据保留。
旧full lint唯一src/modules/navigator/platform/vault-source.ts:45 unbound-method，现读win.requestIdleCallback再.call(win)，改等价显式bind以保同一owner；Map40已给精确路径，不扩platform域重构。HealthPage六处[--nd-hit-size:44px]无实际消费者，新Button用HU token，移除dead属性，保留实际min-h-11及原独立hit。
## Workspace and Scope
只写src/modules/task/ui/TaskEditor.tsx、src/modules/navigator/platform/vault-source.ts、src/modules/health/ui/HealthPage.tsx三源；原相关tests只读，本次不为等价代码堆镜像test。过程/tmp/huhu-integration-types-repair，先保存真实dirty baseline/hashmode。其它source/词典/fixture/shared/产物/state/Evidence/index只读，不委派/提交/worktree/node_modules或真实用户数据。T08/RootDateField/Automation ports并行分离。
## Acceptance
TaskEditor只无cleanup分支显式return undefined/void，不能改deps/timer/save语义或关闭规则；尽可能用esbuild同target/loader/minify比较before→after单文件JS输出等价，证明不需要因这项重跑66。保留原任务DOM。idle方法绑定仍调用所属win，timeout60/fallback4ms原样，不能eslint-disable。Health仅去无消费属性，不改变实际尺寸/焦点class。
实际生产/测试types与scoped lint，若其它旧测试导入已删除diff-model导致test-types失败单独记账（不用改该源求绿）；必要现有定向DOM/宿主scheduler unit适量。新T08共享端口源码若有并行未完诊断单独列明，不接管。足够即冻三源/差异modehash，停止待high，不扩大格式化。
## Return
不可覆盖REPORT聚焦交接/产物与验证/问题与下一步，三源真实before/after与JS等价/命令退出/局限。Root统一状态Evidence/构建；return0后停止。
