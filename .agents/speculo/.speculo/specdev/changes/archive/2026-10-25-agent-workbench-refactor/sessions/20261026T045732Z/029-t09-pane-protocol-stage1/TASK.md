---
schema_version: 2
session: "20261026T045732Z"
task: "029-t09-pane-protocol-stage1"
kind: "implementation"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-09"
---

## Goal

沿原codex:/root/prepare_t08_full_cli、用户指定gpt-6.1-sol/xhigh，完成T09 B第一阶段：canonical Pane六操作字段、字面Rust CLI解析、共享生成物/fixture及相应契约测试。027只读准备已交回SOURCE STOPPED，本029是新独立实施任务。仅协议子集，不连接adapter、不把未完成handler的availability置true。Root编排/最终代码验收；完整18票Agent Team授权持续，真实E2E用户负责。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。HEAD 33c21e098ef3188cbab5a09f3e0a01fadb787715、branch NAMEWTA/terminal、current工作区。GP033/Map34，T09 in_progress、attempts0；T08 done/R5两轴pass。

按bootstrap/Map→dev/ui→T09 Ticket→Goal读取，调用I与相关codebase-design/TDD/错误/测试规则；已读未变可复用。Spec §3.1–3.5/AC009/061、implementation-contracts CLI v1、DESIGN revision1为上层权威；完整读evidence/T-09-engineering-packet.md和T-09-write-allocation.json。012/013/018真实准备及Root接收可复用；旧load时补写Pane ID方案无效，A沿原dirty draft owner提供接口。

本票原始输入 evidence/T-09-dispatch-input.json SHA256 aec8e02b821c7ea7869e0c153e213acc655fb60e1e9347cd78919577462acfc8；工程Packet SHA256 5900b0b979de79e39742eefc6696e38a473b16aab0a1bf69257649877c18e16d；allocation SHA256 12b2f9bcea31f45176c798efe1f5e8f32442bf01a16505703cebe423e6f1da5d；实际DoR/结构检查与开始见evidence/T-09-start.json SHA256 67bee8ba4e603e9886f4c746c76c719b22d35f3478021b1804e1b37e96992079。baseline已包含T01–08，不把HEAD全部差异归T09。A在028可写其14路径，B测试只冻结实际依赖闭包，不把A并行的未消费变化当自己实现或宣称全仓不变。

## Workspace and Scope

本阶段仅下列10产品路径由你唯一写：

- src/shared/native/control-schema.json
- src/shared/native/control-wire.generated.ts
- src/shared/native/control-wire.test.ts
- native/pty-server/src/control/wire_generated.rs
- native/pty-server/src/control/cli.rs
- native/pty-server/tests/control.rs
- native/pty-server/tests/control_protocol.rs
- test/fixtures/native/control-v1.json
- test/native/control-protocol.test.ts
- docs/agent-workbench-cli.md

共享TS/Rust wire生成物属于B，通过原scripts/generate-control-protocol.mjs生成，生成器自身只读，运行前核只会写你的两个生成文件。允许029 REPORT和全新/tmp/huhu-t09-pane-protocol-*证据、fixture及自己CARGO_TARGET_DIR。不得覆盖旧017pair、旧target/证据或改依赖锁/node_modules。Root独占main/styles/budget/notices和所有正式状态/Evidence。其余8个B adapter/router/paging路径本阶段尚未解锁；A/U、Host/Helper/editor/codec/controller/SpaceService/records/Shell全部只读。确需新路径先交实际最小缺口，不能先写后补票。

不运行根plugin build、全仓lint、architecture/Promise会写临时源的门或真实Provider/账号/Vault/Obsidian。本阶段可在自己target执行定向Rust CLI/协议测试；完整native/Linux/WindowsGNU和最终immutable pair在阶段2所有源稳定后一次按影响门执行。保存真实命令/失败，不把阶段1 binary当最终发行候选。

## Acceptance

1. 先核现有canonical/CLI默认target补齐行为，建立pane.list与明确pane/session的正负红灯。list缺显式Space才沿原环境hint冻结默认Space；明确pane/session不附加调用者Space制造跨Space伪冲突。保留原Vault/instance/typed validation，环境不是授权。不得改变T08 prompt/wait/read、deadline或机器error/effect合同。
2. list沿既有limit/cursor字段与有界字符串；4096B Pane ID可以合法寻址，包括lp1.兼容ID，不把UUID当唯一合法ID。未知/超长/控制字符/重复flag/缺值/--位置和字面字符串按原canonical gate明确拒绝；不做大小写/Unicode折叠或标题猜测。
3. attach --session仅引用Session，focus --pane针对源Pane；split --pane <source> --session <inserted> --direction row|column，源Pane和第三Session分别捕获。--runtime（若接纳）约束插入Session，不能把源Pane ID与插入runtime拼成同一个target；源Pane代次由A端口另捕获。返回top target源Pane原tuple、data insertedPane/Session语义在机器文档与fixtures固定，不伪造真实布局结果。
4. resize ratio表示目标叶最近父split子树份额，公开0.15–0.85含端点，非法数/NaN/Infinity/越界拒绝不clamp；GUI一致转换在A/U实现。close只detach，不声明stop/archive或当前阶段已有实际handler。
5. 六操作availability保持false，完整真实adapter与UI闭合以后由新的阶段任务激活。schema/help/fixtures/文档相互一致，既有未实现能力继续明确不可用；不让单元假handler冒充产品支持。正式新DTO先与A的实际API核对，阶段1不复制布局业务或新建第二份分页store。
6. 正反canonical/共享wire/真实CLI parser与固定fixture测试；旧控制协议/T08回归断言保留。采用原研究中明确许可的机制，不复制GPL/未知代码，不加依赖。阶段1纯语法无需Pi/模型；完整真CLI→NativeHost→原Workspace/store证明留待A接口和后续B接线。自身类型/lint在相关输入稳定时记录，Root最终整合统一复核。
7. 记录每条实际argv/cwd/UTC/exit/raw、源/工具/实际消费输入闭包与快照、明确红绿及夹具失败。A并行导致未消费产品变化单列；若实际编译读取的源漂移，不报稳定pass。自己的native/test进程、短0700fixture/endpoint、PID与清理责任可回读；只清自己根，不动原用户资源或旧证据。完成后SOURCE STOPPED，Root会接收并冻结下一阶段。

## Return

原子写029 REPORT，标准Session/Task/Status和聚焦交接/产物与验证/问题与下一步。列真实10路径前后hash/mode、command grammar/目标语义差异、与A待接接口、实际命令与消费闭包、未验证边界、来源许可、资源清理。写后实际return结构校验留原件；明确本阶段候选交回、所有源停写，不改Ticket/Evidence/Goal，也不递归派遣。Root实际解锁前不写其余8路径。
