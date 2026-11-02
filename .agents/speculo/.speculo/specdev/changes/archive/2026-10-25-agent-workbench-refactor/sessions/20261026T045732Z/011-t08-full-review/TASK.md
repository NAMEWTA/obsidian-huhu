---
schema_version: 2
session: "20261026T045732Z"
task: "011-t08-full-review"
kind: "review"
change: "2026-10-25-agent-workbench-refactor"
ticket: "T-08"
---

## Goal

Lead codex:/root。你沿既有独立身份codex:/root/review_t08_native、用户Goal §4指定gpt-6-astra/high继续新的整票审查。009已审C33而未参与任何实现，本011审查全部最终A32/B15/C33/Root5，共85文件/72处变化，分别返回standards与specification。禁止实现/修复或递归派遣；不以C33旧pass代替完整组合。只有Root维护正式Ticket/Evidence/Goal。

## Inputs

项目根 /home/wta/orca/workspaces/obsidian-huhu/terminal；change .agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor。GP027/Map28，T01–07 done、T08 in_progress；HEAD33c21e098ef3188cbab5a09f3e0a01fadb787715、branch NAMEWTA/terminal。原用户授权完整18票Agent Team与代码验收，真实Obsidian/Provider/OS IME/五平台验收由用户执行，未授权提交/推送/发布/归档。

唯一冻结输入为evidence/T-08-review-input.json，SHA256 **67522a2ee5d8579aca8469511d6529d6425b40fd6cd265db784e7900a9c0cf26**。它包含85文件before/after原字节和模式、1013137B完整源语义diff、12561333B生成物diff、实际working-tree范围工具输出、固定规范/设计/标准/最终报告与Root审计。实际语义基线为T08初始工作副本，已经含T01–07；HEAD只作Git来源，不把HEAD→当前全部改动归给T08。final_manifest覆盖2149输入/2071产品，可用于追踪范围外未变消费者；不要以仅列出的变化替代公共调用链追踪。

读取实际 .agents/speculo/workflows/specdev/common/skills/code-review/SKILL.md，按source-discovery、fowler-smells、risk-review、working-tree-review、reviewer-contracts、review-evidence、result-reuse及适用error-handling/test-reliability执行；已读未变规则可复用。项目dev/ui及其输入内架构/测试/许可/构建/设计系统/shell/动效可访问性必须实际用于审查。标准/规范来源依原顺序核对，不用测试通过代替语义判断。

固定权威为spec.md、implementation-contracts.md、T08、Goal与DESIGN revision1 digest f469273375c51a11e09ce1479d84b6e83d6949f089051ab22d7060ee0d3a5bab，PAGE-001/003、AC-013/014/015/016/017/018/061。工程补充以input中的editor-transaction、launch-identity-environment、progress-receipt、blocking-observation及engineering-packet为准。最新用户选择是必须绑定Space；新运行必须明确绑定，旧交互先选择，后台缺配置准确失败，不按cwd/焦点推断；完整旧消费者改造仍属T14/T15，不把后续票未实现算作本票新增范围。

最终候选报告为006 B、007 C、008 A、010 Chrome，均在input.evidence_sources且已SOURCE STOPPED。009 C33最终独立REPORT及Root返回审计也已固定；仅在C33原字节/规范和适用消费者语义相同部分复用，最终A/B调用与Root组合必须另审。原006/008 Status格式、009标题的修正仅行政文字，原报告/失败回执仍在各Root审计；不要把格式校验当审查通过。

Root最终输入SHA4f0cdfd3f76a7a67517042fe3a975f8ee307b4569db0c09eb86b091862ded181。Root integration1保存build/types/lint/架构等和明确最终双bin官方完整业务Host3文件4项；integration2 SHA c0440b9086dd06b69a0e658b780db7dc993c96b0b6462a70cd7fee76ff74cd8d保存最后真实Chrome15/15、2479去重对象、010八命令与2378工件回收及return0。A最终19文件284、profile33、B131、C122/native顶层131均有原件。B051历史receipt没有单独保存继承的bin环境，Root另以显式bin新运行覆盖，不追补历史。Windows仅编译检查，非实机。

最终Chrome目录/tmp/huhu-t08-root-ui-r2，脚本SHA91cf2578ddc588c530ff7866b835d5b395ffe75e5eaf7dc43b5b29a3d12db05b。生产Page/Panel/TabStrip正常导入，Host/controller port边界明确，另有实际new AgentController装配测试；不是Obsidian。宽312外aside/311内section+1边框、动画完成后44、键盘Enter/Tab/Escape、真实200%重排/被动读屏有实际证据。10原PNG包含明暗/宽窄/200%滚动两端，左右像素与尺寸校准通过，旧裁切原图明确负例。原截图是CDP原字节未拼接/缩放；分段截图不声称完整键盘覆盖。Root已目视三图，独立规范轴仍需核对生产实现与DESIGN。

Root预算按真实旧源精确再现和当前产物测量调整：main6666993B、styles1422357B、eager123518B/106inputs（旧123531B）、agentactivation1314518B；最小KiB阈值，其他模块限制/禁止eager规则未放松。预算归因原件在input。新增Root测试路径sessions-cancellation.test.ts仅加既有obsidian-stub alias，3个原断言随后绿。DEV-T08-001明确记录正式Map/Goal同步晚于该一行编辑的顺序偏差，不掩盖或归给A/B/C。

## Workspace and Scope

review_mode: working-tree。全体产品writer已停止；完整85路径以input.files为精确只读清单，每项before来自T08真实起点，after与当前活源必须匹配，包含新文件、生成物和未变的范围内文件。实现者为codex:/root、/root/implement_t01、/root/implement_t08_business、/root/implement_t08_profile、/root/prepare_t08_full_cli。你只写本011的REPORT以及新/tmp/huhu-t08-full-review-*取证文件；产品、规范、正式Evidence、旧REPORT/TASK、Git/index、node_modules、已有/tmp原件及Cargo target全部只读。

允许明确反例所需的隔离小probe，不重复全仓/全native测试，不覆盖既有目标或复制大量依赖。可复用不可变Linux双bin /tmp/huhu-t08-c-stage2-linux-20261026T080715Z/huhu-pty SHA f99ec633e2201d66ccd67605c65c709d6b25c443ec71978feff897fb27d315ca，huhu SHA923ac2d6fbc4f472537c73236040a487b8d991e4226aec81d5ebda488e995eee；官方Pi/Jiti原件位于/tmp/huhu-t08-b-producer-proof。新probe记录输入摘要、真实argv/UTC/exit/stdout与资源清理。先核对空间并复用CAS，禁止真实账号/Vault/Provider/Obsidian操作。

## Acceptance

完整审查标准轴及规范轴，不设finding数量上限；从可证伪反例追踪真实外部入口、双方消费者、取消与恢复。重点包括：

- 原Space/Session/runtime/source/editor身份捕获与启动后join；显式跨Space不迁移/不跟随焦点；删除、重启、source替换或权限变化时效果前准确拒绝。
- 最终env/args/cwd、完整Pi artifact、实际安装扩展、原helper代和fresh lease/preflight一致；慢prepare受原期限/取消观察，逻辑观察结束不冒称OS物理取消；unsupported仍普通人工启动。
- 普通Agent prompt只能在已认证原native binding及实际Pi app安全editor gate确认后adapter-applied；raw文字/keys仅pty-written；已有draft、selector、paste分片/UTF8、streaming、reload、外部editor/clipboard、未知状态的保守处理与主链完整原答案保持。
- helper/native/应用事务同原输入writer与有界预算；queued none与dispatch unknown、迟到app结果、local发送/worker、原root、output fence各自释放时机；超时不重放、不提前返额。parser reply/ACK/别SID/query/stop继续活性。
- 首可信completed receipt与target不被后续观察错误降级/改写；CLI Ctrl-C同socket有界尾随、无新期限/重连/重发；readOnly/observer pool与transport隔离。
- wait有限状态/原水位/首次期限/取消/continue，32观察额度与副作用队列隔离；read bounded delta/全envelope限制与unknown/partial分类；原始结果保留，不把活动finished当任务成功。
- 生产面板默认当前Space且明确选target；重复名/长内容/跨Space/删除/重启/runtime/source替换、取消/继续/定位/停止确认、单实例ownerDocument与焦点回收；DESIGN桌面/窄屏/200%/明暗/可访问性及已声明受控边界。
- 共享canonical/generated TS/Rust/embedded一致；i18n/模块边界/动态导入/许可；生成产物与测量预算真实对应，不能只读minified差异或只信配对hash。

已知非绿：docs仍是其他Bot change原6锚点；Root architecture首次与Promise临时src夹具相撞后串行0；Root Chrome旧测盒/截图12/14后010与最终Root15/15。区分这些原始事实、真实代码缺陷及未验证边界，不重复无证据推测或把其它已授权后继票当本票范围。

按standards、specification顺序分别返回pass或request-changes；每个finding包括severity、项目路径/行或代码块、可达前提、具体行为影响、来源/AC依据和满足条件。不得参与修复。结束重新核对全部85源/模式、原HEAD/index和固定规范；excluded_paths因新增报告增长应单独解释，不能把范围外行政资料增长误当代码漂移。无finding也明确审查范围与限制，不称全Goal完成。

## Return

按协调report-template，原子、不覆盖旧件地写入 /home/wta/orca/workspaces/obsidian-huhu/terminal/.agents/speculo/.speculo/specdev/changes/2026-10-25-agent-workbench-refactor/sessions/20261026T045732Z/011-t08-full-review/REPORT.md。首部Session/Task/Status（精确completed或适用值），必须有“聚焦交接”“产物与验证”“问题与下一步”章节；两轴原结果、source discovery、固定输入/真实身份、复用边界、所有probe原件、最终无漂移核验和未验证项均可回读。实际运行return结构检查并保存原输出后，通过原生通道通知Root。只Root更新状态；不修改TASK、不猜session-locator。
