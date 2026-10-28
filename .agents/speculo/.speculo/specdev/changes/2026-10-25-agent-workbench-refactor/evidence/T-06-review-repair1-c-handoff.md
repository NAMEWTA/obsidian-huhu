# T06 C review-repair1 交接

**SOURCE STOPPED**。沿Root当前GP-021/Map22、原Sol/xhigh，仅写Packet分配C3；未提交/推送、未改正式Evidence或产物、未运行全局检查/Chrome/native/helper/Provider。A实际API经Root准入后才消费，公开面无额外扩张。

实际修改：automation-hooks.ts 在已校验8192B摘要/1024UTF8 nativeSessionId之后保留该OpenCode registration的first-root，竞争root在A采纳前走既有sticky source-mismatch；raw publication和完整原答案不改。注册来源沿原Map、高水位与共同ACTIVITY_LIMITS.reorder=8；有任一洞即整Map保留、([],true)降unknown，全部连续才一次交observeOrdered(batch,false)，拒绝则fence；正常registered关闭同receive幂等close，A负责批末通知前真正关源。

新增有界保留量：最多8累计source×1024UTF8=8KiB/scope，32scope最多256KiB逻辑root身份内容上界；JS字符串可共享引用，本轮未测新增物理副本或RSS，不能把此数称总内存。reorder仍每source≤8既有摘要，无额外完成队列、daemon或wire。

真实生成OpenCode extension→物理HookSpool→生产consumer→TerminalSession回归覆盖busy A、child idle、未先busy的idle B：child无publication；B不制造current完成/不覆盖root-A恢复身份；B原答案仍一次读出。另验同root正常完成、冲突后晚A/B及关闭后晚原答案，body/各层cleanup错误均收集后保留。generated PI/OpenCode执行物的真实字节与SHA在命令receipt.generated_executables。

consumer→Session组合覆盖1,2,4即时unknown、连续prefix含Stop仍有更后洞时暂不消费、补齐后逐事实N/Stop自己的完成点和原seen、只通知gap与最终快照；完整8格与9格溢出、重复、关闭/失联/HookError优先；Stop→registered close/HookError→后事实仅最终unknown、保留原Stop历史N、后事实不采用。两处既有fake binding只适配新批次调用，不取代真实组合证明。

## 红绿及最终检查

- root-red-direct目标红：真实root竞争后reason实际undefined，应source-mismatch；exit1。first-root后root-green两目标通过。首轮同红经node wrapper返回126原件保留，随后直接实际Node ELF运行exit1；不把126倒写成1。
- gap-red目标红：真实1,2,4后仍working/current；exit1。新接线gap-green 7项通过。所有这些命令前后读取输入drift=[]。
- 最终完整2测试文件：**27 tests passed / 0 skip，exit0**；scoped测试类型exit0；适用生产文件ESLint `--max-warnings 0` exit0。最终命令C3字节均与本manifest一致。
- 首次lint误将项目配置明确ignore的两测试路径传入，2 ignored warnings/exit1，原日志保留；改用适用的生产单文件入口exit0，未改配置/关闭规则/吞警告。测试文件由类型检查和现有Prettier处理。
- 格式命令只命中C3；production格式本就未变化，两测试格式输出变化已列为预期，其他命令changed_during_run=[]。

## 原始命令索引

- `huhu-t06-c-review-repair1-root-red`：exit=126，UTC 2026-10-25T23:30:53.558092+00:00 → 2026-10-25T23:30:55.436910+00:00；输入后漂移 `[]`。原命令/原日志/快照导航见 checks。
- `huhu-t06-c-review-repair1-root-red-direct`：exit=1，UTC 2026-10-25T23:31:05.916300+00:00 → 2026-10-25T23:31:07.760831+00:00；输入后漂移 `[]`。原命令/原日志/快照导航见 checks。
- `huhu-t06-c-review-repair1-root-green`：exit=0，UTC 2026-10-25T23:31:34.782960+00:00 → 2026-10-25T23:31:38.215497+00:00；输入后漂移 `[]`。原命令/原日志/快照导航见 checks。
- `huhu-t06-c-review-repair1-gap-red`：exit=1，UTC 2026-10-25T23:34:23.622160+00:00 → 2026-10-25T23:34:24.823212+00:00；输入后漂移 `[]`。原命令/原日志/快照导航见 checks。
- `huhu-t06-c-review-repair1-gap-green`：exit=0，UTC 2026-10-25T23:36:10.157110+00:00 → 2026-10-25T23:36:11.377078+00:00；输入后漂移 `[]`。原命令/原日志/快照导航见 checks。
- `huhu-t06-c-review-repair1-format`：exit=0，UTC 2026-10-25T23:37:02.056682+00:00 → 2026-10-25T23:37:02.683909+00:00；输入后漂移 `['/home/wta/orca/workspaces/obsidian-huhu/terminal/src/modules/agent/platform/desktop/hooks/automation-hooks.test.ts', '/home/wta/orca/workspaces/obsidian-huhu/terminal/src/modules/agent/platform/desktop/hooks/native-extensions.test.ts']`。原命令/原日志/快照导航见 checks。
- `huhu-t06-c-review-repair1-final-types`：exit=0，UTC 2026-10-25T23:38:08.317065+00:00 → 2026-10-25T23:38:10.757157+00:00；输入后漂移 `[]`。原命令/原日志/快照导航见 checks。
- `huhu-t06-c-review-repair1-final-lint`：exit=1，UTC 2026-10-25T23:38:08.360233+00:00 → 2026-10-25T23:38:13.892441+00:00；输入后漂移 `[]`。原命令/原日志/快照导航见 checks。
- `huhu-t06-c-review-repair1-final-tests`：exit=0，UTC 2026-10-25T23:38:08.375349+00:00 → 2026-10-25T23:38:19.049854+00:00；输入后漂移 `[]`。原命令/原日志/快照导航见 checks。
- `huhu-t06-c-review-repair1-final-lint-production`：exit=0，UTC 2026-10-25T23:38:42.983581+00:00 → 2026-10-25T23:38:48.074917+00:00；输入后漂移 `[]`。原命令/原日志/快照导航见 checks。

## 交付与边界

源码manifest：`/tmp/huhu-t06-c-review-repair1-source.json`，SHA256 `fca1e8bae2ec3931076760dd22ed41f9467b4f0127b5f3823169ddf006fc0501`。命令/前输入/日志索引：`/tmp/huhu-t06-c-review-repair1-checks.json`，SHA256 `97118094a381bd07cebfb0a8130508556c20a8dacef42e6cacae025384f0cf27`。全部前后C3字节、unified diff、每次preinputs快照与实际Node26.11.1 ELF/入口/配置/生成脚本均有原件；未覆盖先前T06交付、review probe或任何旧日志。

旧C14其余11路径逐SHA仍等于原交付。A/core与Session并行变化经窗口协调，各次检查保存其实际时点，未声称整票最终冻结；Root在A/C停源后做总集成/复审。真实Provider SDK/Obsidian/五平台E2E未运行，client API仅自有受控fixture，foreground仍unknown。这是C3修复交付，不将T06或Goal标done。
