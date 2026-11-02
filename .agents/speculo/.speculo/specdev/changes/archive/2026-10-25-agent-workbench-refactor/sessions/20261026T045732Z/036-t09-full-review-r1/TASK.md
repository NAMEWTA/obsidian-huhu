---
schema_version: 2
session: "20261026T045732Z"
task: "036-t09-full-review-r1"
kind: "review"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-09"
---

## Goal

Root派遣用户指定gpt-6-astra/high独立审查完整T09最终工作副本，按standards、specification顺序分别返回。你先前033只读T10工程草稿，不曾参与T09实现，保持独立；不能以033替代这次审查。完整18票目标持续，此次仅T09 code review，非T10实现/咨询。只读审查，不修复、不递归派遣。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor；同一README execution-context。先bootstrap，再读原common/skills/code-review及source-discovery/fowler/risk/reviewer-contracts/review-evidence/working-tree-review；实际dev/ui与其冻结来源、code-commenting/error-handling/test-reliability规则均适用。

权威canonical输入：evidence/T-09-review-input-round1-final.md#review-input，文件SHA256 35000ead78ab653a60c1d2aeca8b173d8d64a490128db74dc7e72b6b44cee0a9；完整JSON parse/stringify规范化Input-SHA256为56969d866b660f49aa6b504bb8154bef8ceddb10332a0a4880119e575cd68e3f。两者不可混用。它包含完整review-scope返回、69项规范/标准/指令与排除说明。初版round1未派遣，final只补齐三项适用错误/可靠性/注释规则来源；不是已有审查结论。

语义交付包evidence/T-09-review-input-r1.json SHA256 cba59899a76f1c1b2b87bb5501d9bd744361690e88b90c8e2a8b89a1ffacca82；57路径完整before/after/CAS及源码545164B diff、生成资产diff在其descriptor中，47路径发生变化。语义before为原T09开始工作副本，已经包括验收T01–08；HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715与index仅用于Git来源，不能用HEAD diff把已验收前八票当本票新增。根最终输入/tmp/huhu-t09-root-final-review-r1-inputs.json SHA256 5b5ad8baa7b79c8aefd7d0dc416a4fac0a894e07aea0286cce295c624ed004f4；2081产品文件比较，写集外变化0。

包中实际A028/B029及032/U031及035原REPORT和Root audits、两次Root整合原件都是审查证据，不是审查结论。Root实际第二轮默认DOM30文件312项、types/budget/styles/Promise/Chrome/helper通过；第一轮build/lint与未变闭包适用复用；A stopped115，B195后finalA31，Rust顶层147、WindowsGNU编译及新Linuximmutable pair均实际。不要把数字加成唯一总数。Root integration2 audit SHA256 075233ca6d3d2a1591c65332341704cf0b95a7f60d282c94bc3cf3f443bad28a。

保留限制：第一轮默认DOM两测试装配失败经035仅desktop/files设备mock修复，031临时Electronalias下8/90不能当默认命令绿色。Root两文件显式eslint探针exit1仅现有ignore警告，测试本来不纳全局lint，原全仓0输入未变。docs仅另外Bot change六个既有断链失败。受控Chrome真正消费生产组件/xterm和原owner，但Obsidian/controller/native/storage/provider端口受控；B另走真实CLI→Rustbroker→生产TSowner与PTY，非真实Provider。真实Obsidian/Provider/OS IME/五平台E2E用户负责，未运行，不据此要求未授权实机访问。

## Workspace and Scope

A14/B18/U20/Root5全部57路径是固定审查范围，详见精确allocation-r2和交付包，不缩为补丁或当前更小子集。当前所有实现者停写。实现者codex:/root、codex:/root/implement_t08_profile、codex:/root/prepare_t08_full_cli、codex:/root/prepare_t13_browser；你不得属于这些身份。

所有产品、规范、正式状态、其他报告/证据只读。只可写本036 REPORT以及全新/tmp/huhu-t09-full-review-r1-*证据。原Git index/分支/生成物/Node依赖不写，不提交/推送/发版/归档，不启动真实账号/Provider/Vault/Obsidian。Root主验收已经运行，不机械重复全仓；需要证伪可在自己tmp作小型实际原实现调用，保存真正消费字节和命令，不修改产品tests，也不修改原pair。若需共享Chrome/native资源先用原生消息向Root协调。新需要来源须列出hash及实际影响，不自行换基线。

## Acceptance

先确认固定输入、独立身份、精确before/after，实际读完整源码变化与必要消费者，再分别审查两轴。关注可达反例及所有适用风险：原dirty/base/latest/pending的单writer保存与跨Space取消/归档；查询零写和legacy兼容ID、显式opaque ID、边界/重复/容量失败；Pane全部操作共同owner、分屏第三Session、关闭detach/runtime仍活、最近父比例反向；原Space/session/runtime捕获、单次ForegroundIntent/consumed/期限/观察者throw/effect；canonical/CLI/help/实际adapter完整envelope/错误收据/分页revision；生产UI原分组与键盘/指针保留、目标焦点分离、加载/失联/长标题/窄屏/200%和状态清理；公开API、测试替身和实际消费证据是否支持所称合同。全部真实重要finding都报告，无数量或字数上限，不为达数量把合理工程选择判bug。

生成main/styles按真实build与归因闭包、原字节和最终源码一致性审查，不需人工逐字阅读minified diff。本票规格来自Spec AC009/本票AC061、工程合同、Ticket、批准DESIGN；后继T10–18尚未实施，不把后继缺功能当T09违反，旧未改缺陷只能说明它是否使本票承诺不可成立。必须分清真正产品失败、证据不足、历史装配/环境失败；能反证则引用确切路径/行、触发顺序、结果与合同。

## Return

原子写本目录REPORT.md，含Session/Task/Status与聚焦交接、产物与验证、问题与下一步。分别用独立锚点standards和specification，固定顺序，每轴必须含Reviewer: codex:/root/review_t10_plan、Axis、Result: pass|request-changes、Input-SHA256: 56969d866b660f49aa6b504bb8154bef8ceddb10332a0a4880119e575cd68e3f、Observed。每finding含severity、项目相对路径/行、具体序列/影响/依据/关闭条件；无发现明确说明读过的范围和未验证边界。

实际执行validate-dispatch --stage return，保存argv/UTC/真实exit/raw/TASK与REPORT SHA，原报告正式落盘后不改。Root回读原报告、真实工具身份和证据后维护正式Evidence；你不可预写整票done、审查接收或源修改。通过原生通道报报告路径、简要两轴结果、SOURCE READ ONLY。
