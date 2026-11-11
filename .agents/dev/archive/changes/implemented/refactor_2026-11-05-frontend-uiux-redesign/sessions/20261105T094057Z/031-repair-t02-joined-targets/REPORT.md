# 任务回报

Session: 20261105T094057Z
Task: 031-repair-t02-joined-targets
Status: completed

## 聚焦交接

027 已释放后，按 031 修复 HIT-01 的 joined 短项横向命中区不足与 wrap 纵向重叠；当前四文件候选已冻结，writer 停止写入。保留 data-hit-group 的水平分区，通过 canonical 最小宽度与真实布局留白提供独立 44px cell，视觉高度仍为 compact32 / comfortable36。真实 CSS、elementFromPoint 扫描及 CDP trusted touch 的有效区域内部点已通过；84px 原反例合理变成三行，另加100px两列两行对照，所有 pseudo 矩形交集为0。7项 focused DOM、精确生产/测试 types、lint、diff-check 通过；精确共享边界的触摸半径跨两 cell 会受 Chrome 目标调整，额外失败断言原样保留并由 Lead 明确不作为该边界的确定性要求。完整 T-02 fixture 扩展、独立 high delta、最终66与宿主验收仍由 Lead/030/011 接续，本次不声明全票完成。

## 产物与验证

### 冻结范围与修改

工作区 /home/wta/projects/obsidian-huhu，observed main HEAD37fcede4210a19bcc2a74809e7fdd301e5717957；四个精确授权路径：
- src/ui/components/toggle.tsx
- src/ui/components/toggle-group.tsx
- src/ui/components/huhu/SettingsFormControls.tsx
- src/ui/components/huhu/FormField.dom.test.tsx

修改前字节在 /tmp/huhu-t02-joined-repair/before；最终精确候选在 frozen/；baseline-sha256.json/frozen-sha256.json、repair.diff、no-drift.json 均只留该 /tmp。四文件冻结后回读，4 checked、drift=[]；真实 browser-inputs.json 的三个生产源哈希与冻结文件逐项一致。没有改 shared CSS/token、配置、依赖、字典、modal/focus/tree、fixture、Git/index、正式状态/Evidence 或原历史 REPORT，未委派。

toggleVariants 的 sm/md/lg 最小宽度现在为 max(视觉最小尺寸, --hu-hit)；ToggleGroupItem 与 SegmentedControl 去掉 canonical min-w-0 覆盖，桌面仍至少32，coarse至少44。group 的横向 gap 保持原值；纵向 gap 为 max(原gap, --hu-hit减--hu-ctl-h)，block padding 为正命中扩张高度的一半，segmented仍至少保留原2px gap/padding。故 coarse compact 的32高视觉加上下6px占位，行间12px；comfortable的36高加上下4px，行间8px，行步进都为44。根布局实际占有扩张区域，不依赖伪元素侵占邻行；水平 width100% 分区 guard 完全保留，没有新增点击/键盘/焦点引擎、变体或库。

新增 DOM 回归是受控“年/月/日”wrap组合：点月只发一次month并真实选中；随后ArrowRight跳过禁用日回年，focus/checked与回调序列一致。原主文档键盘、禁用跳过、单次点击、空字符串与数字/字符串值区别、Switch/Checkbox busy和表单关联风险均保留，没有class-only尺寸测试或happy-dom几何假值。

### 原始 red 与真实 green

027 final REPORT 在同会话 027-review-t02-joined-touch-targets/REPORT.md；原始真实CSS证据为 /tmp/huhu-review-t02-joined-touch/browser-result.json 与 wrap-result.json，已复制为本 /tmp 的027-browser-result.json / 027-wrap-result.json。三个生产原语修改前hash与027固定输入相同；原风险：图标横向32、短中文约37，原84px两行pseudo纵向相交compact10 / comfortable6。

- node /tmp/huhu-t02-joined-repair/assert-targets.mjs 027-：退出126，实际几何断言 compact/icon/0 width32<44（targets-red.log）。不是编译、环境或mock失败。
- node /tmp/huhu-t02-joined-repair/assert-no-overlap.mjs 027-：退出126，原实际矩形断言 compact overlapping hit area约37.0156×10（overlap-red.log）。
- Lead 在classes-ready后生成共享 styles.css：回执退出0，1,276,445bytes；本轮实际私有 CSS 副本 SHA256=52208d87949d86a28d1a247441edb3709cd859d0a57e9fe1722368271d7b94c8，未由worker写共享资产。
- node /tmp/huhu-t02-joined-repair/browser.mjs：最终退出0，22 observations（20布局+2键盘），errors=[]。真实React/Radix、当前生产guarded ownerDocument adapter，精确图计数/摘要在browser-inputs.json；输出只到私有目录。fine/coarse matchMedia都实读匹配，compact/comfortable均测；覆盖二/三sm图标、年/月、年/月/日与长英文对照。
- node /tmp/huhu-t02-joined-repair/assert-targets.mjs：退出0（targets-final.log）。所有fine项>=32、所有视觉高度保持32/36；coarse短/图标实际width44、pseudo44×44、0.5px扫描有效runs为44至44.5px；长标签仍>114px。每项中心及左右/上下±21.5的CSS命中均属该项，真实trusted触摸每次最多一次change，事件只属于该项（原ToggleGroup允许取消为空值）；真实ArrowRight对短/长分段仍恰好一次b。
- node /tmp/huhu-t02-joined-repair/wrap-browser.mjs：退出0，2个密度、errors=[]（wrap-result.json / wrap.log）。原84px宽度未增大，修复后年/月/日为三行；视觉width44、高32/36，行y差44，所有相邻pseudo矩形相交0。
- node /tmp/huhu-t02-joined-repair/wrapwide-browser.mjs：退出0，新增100px宽对照、2个密度、errors=[]（wrapwide-result.json / wrapwide.log）。两个项目在首行，第三项在第二行；行y差44、pseudo相交0，仍测完整两行风险。
- node /tmp/huhu-t02-joined-repair/assert-wrap.mjs 与同命令参数空前缀及wrapwide-result.json：均退出0（wrap-green.log / wrapwide-green.log）。两种宽度均逐对证明44×44矩形不相交；每个密度每组12个内沿点（中心向四边21.5）实读CSS、实际trusted tap均命中正确项，最多一次callback；改变相邻行焦点后，同物理分区点的elementFromPoint归属稳定。
- node /tmp/huhu-t02-joined-repair/assert-no-overlap.mjs：退出0（overlap-green.log），与原027 red使用同一矩形判据。

### 精确 cell 边界的额外观察

刻意测试两行 cell 的精确共享边界：elementFromPoint 在两种focus下均稳定为月；但 radius1 touch disk 同时跨过两 cell，Chrome可能在focus年时送年、focus月时送月。额外要求该点touch delivery相同的断言确实失败，保留 wrap-exact-boundary-failure.log 与 assert-wrap-exact-boundary.mjs，原wrap-result.json的points也原样保留，没有删除失败观察。Lead明确判定：不要求跨精确共享边界的touch disk有唯一确定目标；这不同于027的内部10/6px实际CSS重叠，不应加gap仅为让无唯一owner的点决定目标。最终判据因此保留>=44、零CSS交集、稳定elementFromPoint分区与44 cell **内部**中心±21.5的严格touch断言；没有放宽任何已证明的有效内部点，也未靠触摸启发式凑足44。

初次私有探针尝试曾同时复用一个Chrome profile，wrap采集报geometry未就绪的TypeError；该次初始输出保留initial-probe-*，未当成产品red/green。随后改用main-profile/wrap-profile/wrapwide-profile隔离，并串行重跑上述最终采集；各进程最终Browser.close并等待exit。未将采集脚本的status=completed直接当控件符合规范，真实几何判定由上述严格断言程序单独给出。

### 组件与静态检查

- pnpm exec vitest run --project dom src/ui/components/huhu/FormField.dom.test.tsx：退出0，1 file / 7 tests passed（behavior-final.log）。适用本轮三个生产源的行为与表单回归；未以其DOM结果声称真实尺寸通过。
- pnpm exec tsc --noEmit --skipLibCheck -p /tmp/huhu-t02-joined-repair/types.json：退出0，types.log为空；配置extends仓库生产config，files为三精确生产路径加项目src/types声明与真实传递依赖。
- 同命令 -p /tmp/huhu-t02-joined-repair/test-types.json：退出0，test-types.log为空；extends仓库test config，含四精确路径及相同声明/依赖。
- pnpm exec eslint src/ui/components/toggle.tsx src/ui/components/toggle-group.tsx src/ui/components/huhu/SettingsFormControls.tsx --max-warnings 0：退出0，lint.log为空。没有把仓库默认忽略的测试列作lint通过。
- git diff --check HEAD -- src/ui/components/toggle.tsx src/ui/components/toggle-group.tsx src/ui/components/huhu/SettingsFormControls.tsx src/ui/components/huhu/FormField.dom.test.tsx：退出0，diff-check.log为空，只读Git。
- 未跑broad build、全仓suite或final66。旧Button/Badge/Toggle/Select/主题消费者迁移债务仍由各后续票与Lead账目承担；本轮未改变公开variants/value/callback契约，不拿精确types通过代替全仓清零。012/020/021已通过且本轮未改的其他原语证据复用，不重复声明其已覆盖新短项风险。

### Skill execution 与后续 fixture 接缝

实际应用AGENTS/dev/ui、SpecDev I repair/error/test-reliability与批准DESIGN3 §3.6：先回读027真实反例/已释放输入与012/020/021历史候选，影响范围仅canonicalToggle/ToggleGroup/Segmented组合；未选新视觉/新库，使用现有--hu-hit/--hu-ctl-h及32/36密度令牌与既有Radix交互。颜色/文案/持久化/独立ownerDocument算法均未改；DOM只补行为，actualCSS/CDP才证明尺寸。所有行为、几何、静态与边界失败事实只在本报告和授权/tmp，不改原报告/正式Evidence。

已把完整覆盖请求和style-ready通知030/011 owner与Lead：最终fixture保留二/三sm图标、年/月/日、长标签、原84px三行与100px两列两行、两密度/指针模式；测试每项44内部点与有效runs、逐对pseudo无交集、改变focus后CSS分区稳定、真实tap单次callback和键盘禁用跳过/typed values。fixture由030/011单writer延续，本worker没有修改它。

## 问题与下一步

候选修复已交回，四文件哈希稳定；独立high delta尚待Lead安排。精确共享边界的radius1平台触摸调整明确作为保留的额外观察，不等于未修复的CSS内部重叠；真正44内部点与两个wrap形态均已严格通过。完整T-02组合fixture扩展尚未合并验收，final66必须等所有源码与030/011 fixture组合后由Lead运行；真实移动Obsidian/WebView、原生popout与其他宿主触摸行为仍未验证。本writer已停止源码/测试写入，后续变动需新派单；不声明全票或Goal完成。
