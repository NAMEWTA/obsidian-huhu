---
schema_version: 2
session: "20261105T094057Z"
task: "108-propose-shared-home-ports"
kind: planning
change: "2026-11-05-frontend-uiux-redesign"
ticket: "T-08"
---
## Goal
sol medium在/tmp生成可直接Root审合的最小生产者补丁与有意义回归，解决107实际共享缺口；仓库只读，不仅给建议。
## Inputs
AGENTS/dev/ui/Map38/Spec/T08，用户medium实现/high审查持续。107修104真实raw生命周期/问候缺失，Home worker无权写shared或automation域；Root单写最终源。
现DateField.tsx有onDraftChange与draftResetKey，无受控raw。Home建议draftValue?:string（与onDraftChange成对）；未提供沿既有semantic，提供则显示/校验/commit/pick用该raw，外部CalendarDate值不覆盖父raw，remount保无效raw。必要touched显示错误，保持纯YYYY-MM-DD与原IME、清空、bounds/required/focus。DateTime原消费者无新prop不变，不造引擎。
AutomationUiPort在shared/automation/types.ts，AutomationsService extends它，HomeHost.automationHost从AUTOMATIONS真服务读取；目前actions/running无next。modules/automations/module.ts已有nextOccurrence/validateSchedule纯导入，ui/format.nextRun仅definition.enabled与nextOccurrence(schedule,Date.now())。请查实际service scheduler/device/execution/loadError边界后实现最小nextScheduled(): {name:string;at:number}|null|undefined：null真实无future，undefined模块/读取/执行能力不可用，不猜0或伪造时间，不在Home算调度。复用现有subscribe并保留现生命周期。选最小纯helper+真实Module接入与测试，或直接既有入口测试；不改调度算法/持久schema/UI/核心执行策略。port可与其它动作一致optional，但要解释能力不可用而非旧版本兼容。
## Workspace and Scope
repo全只读，唯一本不可覆盖REPORT；完整提案在/tmp/huhu-shared-home-ports-proposal。优先精确文件DateField.tsx与相邻dom、shared/automation/types.ts、automations/module.ts及一个必要purehelper/相邻unit；不要复制整树/安装依赖/改node_modules。以当前真实原字节+mode作base、candidate副本、标准patch与before/afterhash清单；Root才更新Map归属后apply，不碰index/产物/state/Evidence，不委派。
## Acceptance
补丁必须具体可审可应用；private临时esbuild/vitest别名或复制最小子树可证明关键红绿，不改仓库原语与测试。DateField至少受控非法raw→unmount/remount仍显示/不提交旧有效值、外部合法reset/clear/IME与正常未受控控制；保持原input DOM与focus。nextScheduled实际已启用/disabled/manual/once past/future/recurring、module off/load error/execution gate、真实原nextOccurrence确定值，原scheduler默认fold策略不变。避免兼容shim、重复算法、overengineer；证据足够即停，不跑66/全仓门。Root实际合入后跑真实源测试与high。
## Return
REPORT三节聚焦交接/产物与验证/问题与下一步，完整精确写集/实际producer/callers/patch与hash原路径、真实命令退出/局限；不要把private通过称已合入。return0后停止。
