---
schema_version: 2
session: "20261026T045732Z"
task: "021-t08-full-review-r4"
kind: "review"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root；沿原未参与实现的 codex:/root/review_t08_native、用户指定 gpt-6-astra/high 执行T08第四轮完整独立两轴复核。019 R3的唯一F6已由020/023沿原owner修复，Root恢复周期1第二次组合已完成。判断完整88路径standards/specification，不仅勾选F6，不限制finding数量；不修复、不递归派遣。

## Inputs

同一repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。GP031/Map32，T08 in_progress，恢复周期1 attempts2，旧周期attempts3及实际blocked检查点保留。HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715，branch NAMEWTA/terminal。完整18票Agent Team授权持续；Root代码验收，真实Obsidian/Provider/OS IME/五平台由用户完成。无提交/推送/发布/归档。

规范化输入 evidence/T-08-review-input-round4.md#review-input：文件SHA256 **2664b98bd216b2fe8f711f2859babf48b2b289fed1ac81da4e7a8d20ad389016**；唯一对象 **reviewInputDigest 07fcc38f90528a6f3be4635846c769a7cfe3b4fce36a752940cdb5f6d67c101a**，88路径及93实际来源。两轴Input-SHA256用07fcc38f90528a6f3be4635846c769a7cfe3b4fce36a752940cdb5f6d67c101a，不能用Markdown或语义包SHA。完整语义包 evidence/T-08-review-input-r4.json SHA256 **148c80772ff53451cffb82216cf06eba36c0aacba2e9749f2898172708fc8094**：88路径、76本票变化、source diff1095444B、generated diff12564020B。实际语义基线是T08初始未提交工作副本，已含T01–07；HEAD/index仅作Git观察锚。

沿用已实际阅读且未变的common code-review/source-discovery/fowler-smells/risk-review/working-tree-review/reviewer-contracts/review-evidence/result-reuse、dev/ui及相关架构/测试/许可/构建/设计系统/shell/动效可访问性。Spec/implementation-contracts、DESIGN revision1 PAGE001/003、AC013–018/021/030/061仍为权威。所有业务必须显式Space，旧交互先选、后台缺配置失败的全消费者接线由T14/T15承担；不能按cwd/焦点猜Space。

019原REPORT SHA2560cb8815abc80978c12659d3cd72dab08e86c9febddd7608afb070f0558c40904；Root audit evidence/T-08-review-r3-root-audit.json SHA256f671b374477dae45b8737b67da68509248b44e495ebe00e6ea5acf6a989a5578。R3已关闭F1–F5，仅F6：native已准确exit1，但真实Helper.dispose及Host最后lease.release/host.dispose仍成功。原/tmp/huhu-t08-full-review-r3-astra全部只读。相对R3当前产品共12项变化：三生产TS、七测试、main与bundle-budget；Rust、UI/CSS及依赖均未变。可实际核输入与消费者后明确复用R3未失效结论，但本轮必须对完整88范围给结论。

020 REPORT是未完成检查点，不当完成候选；SHA9dcf9a31e5e413259ed842971fb8454fa42771413f9b4de624f09f7a85f4abea，原/tmp/huhu-t08-shutdown-result-0ee4bbc8只读。真实Host故障002是改源前F6红；003旧fake缺Node close造成75s外层TERM143；004未分配helper.test首项超时、余6未运行。Root正式GP031/Map32、allocation-r5增加唯一既有helper.test.ts，原11修复路径由023续修，总88路径。不能把旧失败抹成新pass。

023 REPORT sessions/20261026T045732Z/023-t08-shutdown-result-continuation/REPORT.md SHA256 **8bdd5f18a4b6ee6121da999078caa4a4396999723fb5484ebca8444e562a9d66**；原件/tmp/huhu-t08-shutdown-continuation-eb066。Root接收 evidence/T-08-shutdown-result-root-audit.json SHA256 **e0c0e3e41f1b60b5f53aa5483e8449c40c153a9222bd063ea4073f24dadbd0e6**：20实际命令、4262快照描述、104最终回归导入闭包、实际10编译输入全部回读；最终8文件127项无skip，production/test types、production lint和return均0；29记录PID gone、无自有socket/listener。REPORT模式列两项误写0600，实际helper-editor.test.ts及host-editor.integration.test.ts原有和当前均0664，Root audit已勘误；没有改模式。

最小修复沿原Helper/Generation，不新增transport协议字段或管理器。NativeShutdownError携不可变NativeHelperTermination（exited/not-started/unconfirmed、code/signal/forced/stdioClosed/bounded diagnostic）与永不reject的物理termination fence。进程exit、stdio close与成功关闭分别记录；code0且无signal/未forced并真实close才成功，异常或未知准确拒绝。无pid error不能伪造stdioClosed；原启动错误与cleanup错误同时保留。原4s升级+1s观察预算保持，已exit不kill已gone进程，迟到fence不改已返回结果。Host仅最后owner shutdown；confirmed gone失败原调用者reject但原代可退休，下一明确acquire才新建；unconfirmed阻止第二helper，迟到gone仅退休原代。旧回调不影响新代；最近失败在明确新generation前仍由host.dispose观察。重复释放缓存原Promise/错误，stop原cause/outcomes与cleanup同时保留。

另有023真实008红：物理exit在local frame尚未结算时，原finishEditorOperation丢失该错误，后续frames完成仍悬挂。窄修在原PendingEditor保留terminationError，待同一frames清空才归还operation count/bytes并settle；已确认finished receipt保持，不提前释放、不用公开dispose失败代替物理fence。001无pid/stdio红和008原5秒超时均保存。旧negative exit1夹具只更新精确shutdown错误期望，没有统一改exit0或catch吞错。新增helper.test严格只补两处正常finish的exit0→close0，原七项断言保持。

Root组合 evidence/T-08-root-recovery1-integration2-audit.json SHA256 **de8ed9f4d365b69f931ee174c695a8417729a24791b38cbf1c7e16c7a3f3efb7**：实际build（生产/测试类型、样式）、全仓lint、architecture、Promise、enforced bundle均0；44普通消费者绿+7因首轮无官方artifact而跳过，再显式artifact仅补跑7项通过（另2未选），总51唯一消费场景。真实新pair 3文件7项全过，完整官方Pi CLI对受控loopback SSE通过。唯一新增官方根/tmp/huhu-t08-a-stage2-native-6SoGWT，有pre-command库存和实际90业务+16driver编译输入；Pi/Jiti1295文件与原冻结匹配。F1三SID/F6普通EOF与替代endpoint失败、sentinel保留和明确新acquire均有原trace；12记录PID与locator gone，runtime在Root外部清理前无文件/socket，仅剩空目录。没有用外部删除冒充产品cleanup。

当前main6669680B SHA25619b8ffb4eeb5f3a97de43f1b56364204ad9541405b209b05b7f76d2903105ac7，styles1422357B未变。三方只读归因精确重现初始6379974B和前次6667083B；F6增加2597B（Host1365/helper1084/shared error142/未改源构建重命名6），仅main预算超限按最小KiB至6670336。eager123533B与agent activation1314666B在原阈值内，未增依赖。见T-08-budget-attribution-r4.json及T-08-root-budget-change-r4.json。

Root最终manifest evidence/T-08-root-recovery1-integration2-final-input.json SHA256 **fec66cf44fe9258bb84fe8e7f99614a7a4ea91a03f0f05a76e27bceff0a39642**，2150输入/2072产品、写集外[]。复用见T-08-recovery1-integration2-verification-reuse.json：017 native142/Linux producer/Windows GNU check和i3 Chrome15等未变输入与影响已核；旧UI视觉证据不被用来证明新Host失败。原六Bot docs锚点失败、旧测试装配/度量失败全保留，不能写全仓所有检查全绿。

## Workspace and Scope

review_mode: working-tree；完整A34/B16/C33/Root5共88路径以语义包和canonical scope为准。实现者codex:/root、/root/implement_t01、/root/implement_t08_business、/root/implement_t08_profile、/root/prepare_t08_full_cli；你保持独立。所有产品writer SOURCE STOPPED，规范来源冻结。022仅后续T10只读准备、允许写其报告，不是本票产品变化。

仅写本021 REPORT与新/tmp/huhu-t08-full-review-r4-*证据。产品、正式状态/规范、旧TASK/REPORT/probe、Git/index、node_modules、Cargo target及已有bin只读。必要可证伪窄probe可复制旧019到新路径，记录实际source/tool/argv/UTC/exit/raw/资源；不跑全仓/全native，不重建Rust。普通EOF不得用事后删除当产品清理；故障替代只用自己记录的endpoint与inode，明确保存清理前sentinel事实。短0700 runtime不放宽原保护；无真实账号/Vault/Provider/Obsidian动作。

只读pair /tmp/huhu-t08-native-shutdown-linux-20261026T115900Z/huhu-pty SHA950b1832947eaa287ef9c03499e9574a61ee7b7c4845a31ff422a350ce3af843（31119408B/0555），同目录huhu SHA63db57114503eaedf757c6c087eef8c0c268d393dc86b58035de51c67fdacd74（15428448B/0555），producer.json SHA5d82fd3794c4109fbd02151e5d41e69adb67310bbff667c0dc03f40ac626f7c3（0444）。旧pair不覆盖。

## Acceptance

先标准轴再规范轴，对完整88范围独立给pass/request-changes。F6须真实public调用链、已确认gone与unknown的恢复、退出/stdio/operation物理fence、startup双错、stop结果保留、重复release、Cookie/history多owner及原代晚回调全部语义闭合。不能只断言错误类型而漏掉资源归还或调用者副作用。F1–F5、完整identity/并发/取消/producer/有界协议/GUI焦点状态设计/生成产物均按实际影响明确复用或新判断。每finding含severity、真实路径/行、可达前提、用户影响、规范/AC与关闭条件，无数量上限；不修复。

最终核88路径/模式、93canonical来源、HEAD/index及scope。仅excluded_paths/inventory_sha256/input_sha256因行政证据增长可归属变化；其余scope字段一致。不要求重复逐字读全部历史CAS；新diff、真实消费者与复用边界必须完整判断。

## Return

原子写本TASK的REPORT.md，Session/Task/Status有效，含“聚焦交接”“产物与验证”“问题与下一步”。两轴分别standards/specification锚点及唯一字段：

Reviewer: codex:/root/review_t08_native
Axis: standards 或 specification（各自本轴）
Result: pass 或 request-changes（实际结论）
Input-SHA256: 07fcc38f90528a6f3be4635846c769a7cfe3b4fce36a752940cdb5f6d67c101a
Observed: 本轴真实证据/观察，不能只填格式校验。

保留source-discovery、旧finding处置、复用理由、probe原件、最终无漂移与未验证边界；写后实际运行return结构检查保存raw，再通知Root。Root唯一接收与状态owner，不宣称整个Goal完成。
