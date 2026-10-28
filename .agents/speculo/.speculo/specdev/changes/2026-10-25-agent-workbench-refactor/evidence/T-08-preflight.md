# T-08 terminal coordination：精简只读预检

2026-10-25，GP-012 / Map13；`/root/implement_t01`，6.1-sol/xhigh。先消费原T-08、Spec§3.4/3.5、implementation-contracts与T-05/06/07预检，复用已核验研究，无新外部依赖/代码复制。**T-03正在实施**：本轮TerminalSession/Sessions/Controller只代表读取时观察，不是其最终接口或对候选的修改建议；T-03新候选不作审查。本轮仅写本报告与SHA清单，未改仓库/正式证据/Git/产物，未测试、build或启动进程。

## 当前事实与必须闭合的生产owner

- 当前 `TerminalView` 的onData/onBinary、IME键编码、粘贴/drop/clipboard直接进入`session.input/paste`；后者向捕获的native port写入。`pasteSequence`已有清控制字符、换行及bracketed-paste保护，必须保留。resize目前也由view调用Session；它的跨view owner由T-05负责，T-08不能另建尺寸策略。
- `submitInteractivePrompt`先轮询readiness，再paste+Enter；目前target没有expected-runtime/前台/blocked/activity水位参数。`Controller.target()`是面向旧交互命令的当前Pane/最近焦点fallback，不能用作CLI精准寻址。此为源码事实，不是已复现输入串扰。
- `SessionMaterialService`已有目标对象重验、单次材料reservation/取消，并且**只粘贴不按Enter**；`prompt-port`则调用旧automations invocation，`PromptRunner`保持原生完整答案/执行时限。它们不是新协作prompt/wait owner，不能改成屏幕结果或引入第二任务队列。
- 当前screen仅snapshot/text/订阅，activity只有枚举/时间，尚无T-05/06的完整水位契约；T-07受保护CLI/gateway仍是预检方案，不是现有可调用协议。

T-08生产闭环应为：**T-07同一registry → 精确Session/runtime resolver → 每runtime唯一输入仲裁 → T-05读屏/T-06活动订阅**。GUI与CLI必须在最后写字节前共享该仲裁；只给CLI加队列、GUI继续旁路，不满足AC-014。设备回复/credit ACK保留内部通道，不排到长wait后面；read/wait/stop不占输入事务直到模型完成。不要新建runtime/screen/gateway owner。

## 前序票需保留的最小接缝

| 前序 | T-08真正需要的语义（签名待前票验收） |
|---|---|
| T-03 | 稳定Session与独立runtimeId；解析指定代次、后台无Pane也可查；捕获运行引用，不按cwd/焦点/唯一候选猜目标。 |
| T-04 | 输入admission关闭、expected-runtime校验、exit/lost可观察；queued取消零写入，已发输入/迟到清理不转向新代。取消wait不能stop或release共享lease。 |
| T-05 | 有界readScreen及runtimeId/contentSequence/cursor/范围/截断，过期明确resync；被动read不attach/focus/resize/滚TUI。原始输出/ACK不依赖慢renderer。 |
| T-06 | 版本/Provider能力、前台身份、readiness与blocked/unknown证据；同代activitySequence及无空窗snapshot+subscribe；不能据静默/旧idle宣布成功。 |
| T-07 | 同源命令/参数/结果描述与handler扩展，scope校验、取消/断线关联及phase/effect；Rust→TS→Rust不阻塞读循环，未实现能力明确unavailable。 |

最小操作规则：prompt把“文本+提交”作为一项有界输入操作，真正开始前重验runtime/前台/权限与模式；working但原生安全可收输入可以通过，blocked、未知能力/不安全提交拒绝。未开始取消不得迟到Enter；开始后回执丢失按已知phase/effect报告partial/unknown，先query不自动重发。

`prompt --wait`在提交前冻结runtime及活动基线，订阅不能漏掉提交期间事件；不能把旧idle当新完成，初始working事实随回执保留。独立wait允许当前匹配立即返回。timeout/Ctrl-C/EOF只拆该次订阅；matched/blocked/unknown都不是模型任务成功，也不关联“最终答案”。

## 当前Ticket精确写集缺口

既有`services/control/**`、`core/control/**`、`services/terminal/session*.ts`及键盘/paste/view足以实现核心仲裁，最终接线仍需按已交付前序回读：

- **确定需补测试路径**：`src/modules/agent/ui/terminal/terminal-view.dom.test.tsx`（拟新增，生产输入事件/IME而非只mock方法）；`src/modules/agent/core/terminal/terminal-core.test.ts`（现有键盘/粘贴/帧回归，当前keyboard*.ts/paste*.ts不覆盖它）。
- **接入现有提交/材料消费者时补**：`src/modules/agent/services/prompt-runner.ts`、`prompt-runner.test.ts`中的`submitInteractivePrompt`；`session-material.ts`、`session-material.test.ts`若仲裁变异步，需等待准确交付/取消而不能提前resolve。只补共享输入接缝，材料依旧无Enter、旧runner依旧原生答案；T-14完整Space消费者迁移不提前承接。
- **若装配落在Controller/module**：追加`services/controller.ts`及拟新增`controller-coordination.test.ts`，或`module.ts/module.test.ts`的精确路径；当前T-08没有这些。若T-07已提供services/control内闭合的注册扩展则复用，不为形式扩大。
- **T-07交付后必核对**其真实canonical命令/结果schema、生成fixture与CLI黑盒文件写集；不能只交TS handler而help/schema仍无参数/结果。预检中的`shared/native/control-schema.json`等只是拟名，当前不存在，勿当冻结路径。transport有界/未知效果若需改host helper/shared NativeConnection或Rust main/control，也须先由Root追加真实owner路径；不在旧Agent私有副本另造协议。

## 有意义的自动化边界与停止回执

未来最小组：①真实GUI input/paste事件与CLI同runtime竞争，按操作记录完整bytes，断言文本+Enter不可交错；queued abort/stop/foreground变更后零迟到输入；②受控activity事件验证旧idle、初始working、event恰发生提交期间、独立wait即时匹配、timeout/abort后第二终端继续；③T-07真实CLI进程→生产TS router→真实helper，覆盖断线前/后副作用与查询、不重发；④T-05 read上限/过期cursor/旧runtime，断言无任何native input或视口滚动；⑤复用prompt-port/prompt-runner/session-material测试保留旧交付、仅粘贴、完整原生答案。

精确竞争用可控barrier/事件，不用sleep或mock计数替代字节/运行效果。真实helper夹具复用sessions.e2e、host.integration及native stdio/control测试；缺binary、Windows跳过Unix shell、Node SQLite或宿主renderer条件须如实记录。真实Codex↔Claude、人工审批、IME与五平台按用户分工未运行，不把自动化当实机通过。

本轮所有验证均**未运行**。24份当前读取输入SHA/字节/UTC及T-03活跃范围标记见 `/tmp/huhu-t08-source-sha.json`；预检结束后停读，等待Root，不实施或建议改动T-03未交付候选。

SHA清单摘要：`16a1c545e40f109f64c2c11f25f594e30fee088f0f2dab43882d1f7912347634`；结束时清单输入无漂移，但T-03源仍非冻结。
