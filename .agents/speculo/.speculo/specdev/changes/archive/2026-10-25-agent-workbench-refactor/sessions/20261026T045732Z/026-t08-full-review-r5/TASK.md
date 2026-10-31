---
schema_version: 2
session: "20261026T045732Z"
task: "026-t08-full-review-r5"
kind: "review"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

沿原未参与实现的 codex:/root/review_t08_native、用户指定 gpt-6-astra/high，对完整T08当前91路径进行第五轮独立standards/specification复核。Root已接收025窄修并完成恢复周期1第三次整合；F1–F6在021完整R4关闭，唯一F7为Cookie读取错误被最后cleanup覆盖。结论覆盖完整本票，不只勾F7，不限有效finding数量，不修复、不递归派遣。当前完整18票Goal继续，Root为代码验收owner，用户负责真实E2E。

## Inputs

repo /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、branch NAMEWTA/terminal；同一change-workspace。GP032/Map33，T08 in_progress，恢复周期1attempts3，原周期3和所有失败历史保留。全部产品writer SOURCE STOPPED。024 T11只读准备已结束，不是本票产品变化。

唯一规范化输入 evidence/T-08-review-input-round5.md#review-input，文件SHA256 238c6946fb0d15fe83139a8369145ece96a71c487ec2a3b49fdcf683e43d15e2；对象 reviewInputDigest **3fb0874e02f2d7d0d46cb50056288f9db74bef75b1369d66c14d36172f3e47c1**，91路径、100实际来源。两轴Input-SHA256必须用该对象digest，不能用Markdown或语义包文件SHA。完整before/after与实际源码/产物diff包 evidence/T-08-review-input-r5.json SHA256 d0a61f896bcc767ed6cf44e90bbce7032ba4968aa5fe2c72ebdd442c550567d5。真实语义基线为T08实施前未提交工作副本T-08-dispatch-input.json，已含T01–07；HEAD/index只作Git观察锚。

沿已实际阅读且未变的bootstrap/runtime、common code-review及source-discovery/fowler-smells/risk-review/working-tree-review/reviewer-contracts/review-evidence/result-reuse、dev/ui与必要架构/测试/许可/构建/设计规则。Spec、implementation-contracts、DESIGN revision1 PAGE001/003、AC013–018/021/030/061为权威。全部业务必须显式Space，旧交互先选择/后台缺配置失败由T14/T15消费接线；不按cwd或界面焦点猜Space。不得把T09–18尚未实现能力误判为本票已交付。

021原REPORT SHA256c72d0496569781666f16c138da534994b80adae023e98927a00d4f8c832c927b，Root audit T-08-review-r4-root-audit.json SHA256aa4aa329d16bc9100936d18f1f9dd1973fc8d5998c09927e5cc3ec451f7f8a91。旧/tmp/huhu-t08-full-review-r4-astra只读，同次native Cookie回包/公开结果的F7反例、强制/未知退出和全部其他已关闭finding证据保留。以实际T08基线辨别引入问题和原有无关问题，不通过扩大边界重写普通旧功能。

025 REPORT sessions/20261026T045732Z/025-t08-cookie-error-preservation/REPORT.md SHA2561d47b3d44e3e76b67def02b2924a3c73ad522fb3780929a99a4bbc837cd10784；Root接收 T-08-cookie-failure-root-audit.json SHA2561368b9a1d6e2a2819150da178266e0517a902c5925500c3306c0402b56cc50af。原件 /tmp/huhu-t08-cookie-repair-20261026T144105Z。仅cookies.ts、新cookies.test.ts、host.integration.test.ts三源；Root接受13实际命令、17431快照描述、最终Vitest45实际编译输入、两文件14项无skip、生产/测试类型与production lint/return0、六组真实native观察和16记录PID gone。003是夹具把早期termination及最终stdio outcome当相同快照的失败，原件保留；未更改Host/Helper或退出成功标准。

修复保留原nativeCookieReader、唯一acquire/request/release和原监听生命周期。显式保存读取结果，release结算后按四格返回：原rows、原read error、原cleanup error，或AggregateError([原read,原cleanup],有诊断message,{cause:原read})。错误值为null/undefined不变成功；acquire失败不释放不存在的lease；取消原cause与清理事实可观察，不自动重读或提前返回。

真实新测试走reader→Host→Helper→017：仅协调Cookie owner准入后释放原PTY owner，读取自己的缺失SQLite、替换自己的endpoint，没有mock业务回包。完整同次rid/error、cause===errors[0]、cleanup second object、public exited/code1/stdioClosedtrue、sentinel inode/body保存；物理exit后下一明确acquire才创建正常exit0新helper。原exclusive lock下Agent释放与Cookie读取独立用例保持。异常替换实体的外部fixture删除不当产品正常cleanup证据。

Root第三次整合 audit T-08-root-recovery1-integration3-audit.json SHA25615af507921404789babb4276695fdbbdd81e82878dd7dbd76f2737106daf76c3；实际检查与数量、原输出和资源以该audit为准，未预填额外全仓测试。Final manifest T-08-root-recovery1-integration3-final-input.json SHA256cb246dc43e682997184ad5d51eb04968e83b497e1dd6e689e0d8ccda1c892c2c。实际产物和预算归因见T-08-budget-attribution-r5.json；复用范围见T-08-recovery1-integration3-verification-reuse.json。F6/F1 Host/Helper、原始producer/完整CLI、UI/Chrome和Rust/native未变证据经实际最终输入核对复用；旧视觉证据不证明新Cookie失败语义。六个范围外Bot文档锚点失败及全部历史失败仍保留。

## Workspace and Scope

review_mode: working-tree；r6 A34/B16/C36/Root5共91路径，完整路径与模式见语义包/canonical scope。实现者codex:/root、/root/implement_t01、/root/implement_t08_business、/root/implement_t08_profile、/root/prepare_t08_full_cli；你未参与实现，继续保持独立。

仅写本026 REPORT与全新/tmp/huhu-t08-full-review-r5-*证据。产品、正式状态/规范、旧TASK/REPORT/probes、Git/index、node_modules、Cargo target及已有bin只读。必要窄probe使用自己的短0700 fixture、实际编译闭包/argv/UTC/exit/raw及资源。无新依赖/全仓全native重跑/原生重建；可复用原有效证据，不能将未执行写成新通过。不得操作真实Cookie/账号/Vault/Provider/Obsidian。

017只读pair /tmp/huhu-t08-native-shutdown-linux-20261026T115900Z/huhu-pty SHA950b1832947eaa287ef9c03499e9574a61ee7b7c4845a31ff422a350ce3af843（31119408B/0555）、huhu SHA63db57114503eaedf757c6c087eef8c0c268d393dc86b58035de51c67fdacd74（15428448B/0555）、producer.json SHA5d82fd3794c4109fbd02151e5d41e69adb67310bbff667c0dc03f40ac626f7c3（0444）。未重建或覆盖旧pair。

## Acceptance

先标准轴再规范轴，完整91范围分别pass/request-changes。核对F7真实调用者、两错误原身份、四格结果、取消/acquire及释放/监听责任、原Cookie独立性与build消费者一致性；不以错误类型单断言替代语义/资源。F1–F6及身份/并发/取消/producer/有界协议/GUI目标与焦点设计按实际影响明确复用或新判断。每finding含severity、实源行、可达前提、影响、规范/AC与关闭条件。

最终核91路径/模式及100canonical来源、HEAD/index/scope。只有excluded_paths/inventory_sha256/input_sha256因新增行政证据可归属变化，其余scope字段一致。不要求重复逐字读取所有历史CAS；必须完整读新diff及相关消费者并讲明复用边界。

## Return

原子写本026 REPORT.md，Session/Task/Status有效，含“聚焦交接”“产物与验证”“问题与下一步”；两轴分别standards/specification锚点与唯一字段：

Reviewer: codex:/root/review_t08_native
Axis: standards 或 specification（各自本轴）
Result: pass 或 request-changes（实际结论）
Input-SHA256: 3fb0874e02f2d7d0d46cb50056288f9db74bef75b1369d66c14d36172f3e47c1
Observed: 本轴真实语义/证据观察，不仅结构检查。

保留source-discovery、旧finding处置/复用理由、probe原件、最终无漂移及未验证边界。写后实际return结构检查保存raw，再SOURCE STOPPED通知Root。Root唯一正式接收和状态owner，不宣称整个Goal完成。
