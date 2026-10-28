---
schema_version: 2
session: "20261026T045732Z"
task: "010-t08-chrome-measurement"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root。沿原真实 gpt-6.1-sol/xhigh 身份，修正T08实际Chrome验收脚本的测量与截图问题，核对真实布局后交回；不是修改已批准设计或放宽断言。禁止再派遣，A其余31路径、B15/C33继续SOURCE STOPPED。

## Inputs

原项目根 /home/wta/orca/workspaces/obsidian-huhu/terminal，change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor，HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715。当前GP027/Map28，只给Root新增既有取消夹具alias路径，Spec/设计与A32边界未变。继续使用已读I/dev/ui、DESIGN revision1 digest f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab、PAGE-001/003与原T08合同；读取实际source与已有code-review/test-reliability适用规则，不新增产品能力。

固定输入 evidence/T-08-chrome-repair-input.json SHA d70d23cfd2f19614af1807632c180de4b27abafa2fa8b09d5a757ccdbdc19c8e，含28份真实源/结果/图原件；原脚本SHA6e8f32a220621cf89ac6ea6cc6cedd6cdefda3e1fd2d7edaa11fa759af603cc0。Root已实际build:css/build/lint均0，无源漂移；当前styles已是最终新样式，不能再将几何失败归因旧styles。

实际Root运行 /tmp/huhu-t08-root-chrome-20261026T092450Z，exit1、12/14检查通过、drift[]。宽度断言用data-terminal-control内层，而设计宽度312属于外部aside（含1px border）；请实际核边界盒证明，不能只把期望调低。窄控件读到约42.557而后200%分支同控件44；项目Dialog使用zoom-in-95动画，首测疑在入场中，需实际测量并等待有限动画稳定，不凭固定任意sleep或停用生产动画消除失败。原生产组件不因此改版。

真实200%校准已过：outerWidth1200/innerWidth600/DPR2/CSSzoom1，读屏操作与document横溢出检查过；但Page.captureScreenshot captureBeyondViewport:true给出600x857图，Root目视发现右半内容被裁切。请用同一真实200%浏览器窗口校验可靠截图机制，保留CSS viewport、设备像素、截图尺寸及完整左右边界的事实，不能把图片缩放/拼接/重画冒充截图。保存亮暗、宽窄和200%有效图；截图后的滚动/焦点状态明确，不把仅可见中段当全表单可访问证据。

008 REPORT原件已保存 evidence/T-08-logs/root-fixture-closure/008-report-before-structure-fix.md（2c79f85b…）。Root return validator实际126，仅Status含中文括注而非精确completed。可先仅修008该一行，原正文和证据不改，另留结构修正前后关系；不把本轮修复写回旧008为已验。

## Workspace and Scope

唯一可写产品路径：scripts/obsidian-acceptance/agent-workbench-coordination.mjs。仅此脚本由Root重新解锁给你；原32路径其余继续停写。行政例外：008 REPORT的Status一行修正。允许本010 REPORT和新/tmp/huhu-t08-a-chrome-repair-*证据；旧008/tmp/Root失败原件只读，不覆盖。不能改styles/main/budget/notices、任一生产TSX、标准/Spec/Evidence、Git/index或node_modules。若实际证明生产布局缺陷，先给可复现事实Root决定，只暂停该受影响修改。

Root同时只写自身预算与正式证据、运行无重叠检查，不再改styles；你的脚本与tmp运行不应重建根产物。独立Chrome进程/HOME/XDG/监听器必须清理。复用既有Node/esbuild/Chrome，不安装依赖、不操作真实用户库/账号/Provider。

## Acceptance

按原门验证312外部面板、44窄屏命中目标、动画完成后的稳定测量、原单实例/目标/cancel/continue/Enter/Tab/Escape行为和真实200%重排。12项原通过不删不弱化，几何检查保留明确门；新增截图校准应能识别旧裁切。先保存原红和新修复证据；原红是夹具测量/采集失败的候选解释，不冒充已确认产品根因。

实际运行完整Chrome脚本一次（当前Root新styles）并给原命令/UTC/输出/源码输入/图片和校准；node --check。无需重跑284/33业务测试、全局build/lint或native，源码闭包未受脚本改动影响。遇到真实新失败按单变量收敛，不丢旧日志。交回时该脚本SOURCE STOPPED，Root回读后再冻结全T08、独立审查。

## Return

原子写本目录REPORT.md，首部精确Session: 20261026T045732Z / Task: 010-t08-chrome-measurement / Status: completed（这里实际值必须只写completed，不附括注），包含聚焦交接、产物与验证、问题与下一步。返回实际前后SHA/diff、测量与截图机理、原红/新绿、未验边界及SOURCE STOPPED。先跑validate-dispatch --stage return确认结构0，再通知Root。仅Root推进Ticket/Goal状态。
