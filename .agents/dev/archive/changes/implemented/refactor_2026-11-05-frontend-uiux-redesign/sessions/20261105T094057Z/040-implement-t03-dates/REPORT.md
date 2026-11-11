# 任务回报

Session: 20261105T094057Z
Task: 040-implement-t03-dates
Status: completed

## 聚焦交接

交付 T-03 日期族候选：唯一 DayPicker10 Calendar 适配器、DateField、DateRangeField、DateTimeField、日期值工具和真实生产组件夹具。12 个授权文件已冻结，writer 停止源码/夹具写入，释放独立 high 审查。当前是候选完成，不代表 Ticket 接受；完整原始 66 矩阵、Lead E2E、生产总构建与许可门禁仍由 Lead 执行。

公开入口 src/ui/components/huhu/date/index.ts。CalendarDate 是运行时严格验证的 YYYY-MM-DD 字符串；DateField.value 为 CalendarDate|null；DateRangeField.value 为 {from:CalendarDate|null,to:CalendarDate|null}，清空两端 null；DateTimeField.value 为 {date,time:HH:mm,timeZone:IANA}|null。无 epoch、UTC 序列化或模块领域导入。

共同端口：id/name、可选 label（或外部 label+id / aria-label）、description/error、aria-describedby、min/max（含边界）、required/readOnly/disabled、weekStartsOn 0..6、today 明确日期参考、collisionBoundary?:Element|null。边界优先显式 Element/null，再 trigger.closest('[data-huhu-leaf]')，否则当前 ownerDocument viewport。Dialog Portal 调用方必须传实际逻辑 leaf；不把 display:contents PortalRoot 当几何边界。

DateField 仅有效 blur/Enter 提交，保留无效草稿，IME Enter 不提交；clearable 默认 true，onDraftChange?(text) 只通知 UI 草稿。DateTimeField 使用该通知阻止无效日期草稿通过后续时间/时区提交被旧日期覆盖；提供一个整体清空动作。DateTimeField 额外要求 initialTimeZone:string 和 REQUIRED validateValue(value):{code:string,message:string}|null，message 由调用方翻译；没有可选默认成功的领域端口。DateTimeValue 导出类型表示非空结构，字段 value/onChange 显式加 null。

范围仅 Apply 提交，Cancel/Escape 丢弃未应用草稿，下次打开从受控值重建；外部受控端点变化立即替换打开中的草稿。不调换手输倒序端点；必填要求两端，非必填保留开放端点。Today、next7(today..+6)、month、past30(today-29..today) 使用固定 UTC 日历组件和库的 DateLib 日期运算；清空直接发两端 null。

## 产物与验证

### 固定输入与来源

工作区 /home/wta/projects/obsidian-huhu，main HEAD 37fcede4210a19bcc2a74809e7fdd301e5717957。新增授权日期目录 10 文件、T-03 夹具 2 文件；未改其他源码/依赖/词典/共享样式/配置/Git/index/正式状态/Evidence。Lead 已安装精确 @daypicker/react10.0.2（MIT，React>=16.8，Node>=18）；收据 /tmp/huhu-t03-lead-preflight/install.log 与 install-metadata.json。使用真实 scoped DayPicker、TZDate、DateLib、enUS/zhCN exports；未直接导入 transitive date-fns/tz，无第二日期/键盘/时区引擎。

主要原始资料：
- https://daypicker.dev/upgrading （v10 scoped 包/当前 classNames）
- https://daypicker.dev/localization/changing-locale （scoped locale/ARIA 与 lang）
- https://daypicker.dev/guides/input-fields （受控文本草稿与日历选择分离）
- https://daypicker.dev/localization/setting-time-zone （固定时区适配；同时核对实际安装声明和实现）

最终共享 styles.css 1,280,254 bytes，SHA71780f2d2b599e8f690a96d45d8839310fc7e19a4694b9c5e80b10253b43573e，由 Lead 重建/检查。最初 eec384… 共享样式和 /tmp 私有直接 CLI/scoping 调试证明保留，未覆盖历史失败；最终证明重新读取上述共享字节。

12 文件完整快照 /tmp/huhu-t03-implementation/frozen；frozen-sha256.json 的 SHA d57ec4cab89ec71a0f35187a95c8617c4f5c2524f27b63f72ed91e5b0e6c269f。最终真实 native 2,366 输入摘要 f6aed0864c849128f909f990284041bbfb072a87b1a323f3d2c63c32ca1d1ce9，全部磁盘复核 drift=[]；freeze-receipt.json。单例私有 runner 是原 runner 的绝对路径/单例选择/失败诊断副本，不改原矩阵文件；其 SHA b681f9b1801d9f318760913cb3de5991416a90756962e1d0071e32535bc60cac，副本同存 frozen/final-scoped-run.mjs。以下源码 SHA 固定：

- scripts/ui-review/fixtures/frontend-redesign/T-03/index.mjs: 81d653bece638249a10fa5f3046f4c6829215ee941b7cad81ea69208e71df3e8
- scripts/ui-review/fixtures/frontend-redesign/T-03/index.tsx: 9bb42594fd90ca574f2f23bb4336d3fcf4f3d526f5a5e40119fb2da797b88058
- src/ui/components/huhu/date/Calendar.dom.test.tsx: 518fecd3e1f2b533e0379b1a2496970791f4802b3405d35fc3691ee774f03062
- src/ui/components/huhu/date/Calendar.tsx: 209056aa2bcb05e716fc82d29c1ddcee6fe018187e718241020794a450fb9fb3
- src/ui/components/huhu/date/DateField.tsx: 18a6d54a2390e11c7de9309762c8a7cbfa78543575f7e18753bd8314a502b042
- src/ui/components/huhu/date/DateRangeField.tsx: 19d49778ccef37a2f01df58108c3545370a5bbb961b89820a7a27281d41667f8
- src/ui/components/huhu/date/DateTimeField.tsx: 742740eb18286331441fa559a683d1eb46fd9c9e76a6b1280e47f680af83cdb3
- src/ui/components/huhu/date/date-fields.dom.test.tsx: 7ef730e4f49eeed16de6208f4238e3605605a741c82eb039c4d940a7e09be0a9
- src/ui/components/huhu/date/date-value.test.ts: 5654692a7c235df09e3493818c9475a828ab641aa3069be4441b001db623233f
- src/ui/components/huhu/date/date-value.ts: 4bb56f4606c5818a7d4cc493e56e80a6a614aa4d993a62edf5b5fb34045225e7
- src/ui/components/huhu/date/field-parts.tsx: f40bbfce34ab37440b52c3e26e7025f8048d321eee8289ff54a672c1e695ebbd
- src/ui/components/huhu/date/index.ts: 5548e2d5f12552a72085297445e03022e95a4d33990e93f7eeafd0a763b65faf

### 实际 red → green 与检查

- 先实现可执行值函数占位再运行4个行为断言，value-red.log 为4失败；严格日期/0000与0..99年/闰年、含边界空值和预设/时间时区实现后通过。扩展跨宿主时区和 DST 日期边界后，最终 unit-final.log：5/5，退出0。
- DOM 揭示 DateTime 错误未关联时间控件（fields-third.log）、无效日期草稿可被后续时间编辑复用旧日期（date-time-draft-red.log）、受控 required 清空后错误被 parent echo 清掉（required-controlled-red.log）；均增加/保留对应回归后修复。最终 dom-final.log：2 文件12/12，退出0，覆盖严格草稿、IME、含边界、外部标签、disabled/readOnly、范围倒序/取消/外部替换/开放端点/必填、DateTime 调用方错误码/文案、无效 zone、复合清空、Saturday/locale 与 required DayPicker。
- 实际 coarse320 捕获右末32视觉按钮的44热区造成 doc scrollWidth322/client320，元素框均未越界；保留 debug-shared-two/result.json。日期组合行增加既有 --hu-hit/--hu-ctl-h 的半差右留白后 scrollWidth320。保持32/36控件视觉，不缩热区。
- 实际 coarse day34→44 后，相邻44单元在中心+21.5的 CSS hit 仍因 Chromium 边界取整送下一天（debug-private-edge/result.json）；加入真实 day button clip-path:inset(0) 限制命中形状，不改44物理尺寸/312框架，不增加重叠伪元素。标准焦点2px+offset2画在含 :focus-visible button 的 day cell，避免 clip 切掉焦点圈。最初 fine 测试曾取16.5超出必需32区域，已明确改为15.5；coarse21.5断言未放宽。
- 初期 harness 的 DOM 节点返回值序列化、缺 Enter 文本事件、历史状态未重置、iframe点击未等待真实布局的诊断也保留在 debug-*；它们不算产品缺陷。最终可信点击前先等待帧并验证 actual elementFromPoint，再发送 CDP 输入。
- 最终命令 node /tmp/huhu-t03-implementation/final-scoped-run.mjs --suite frontend-redesign --ticket T-03 --matrix redesign --out /tmp/huhu-t03-implementation/final-exact-native 退出0，status=passed/errors=[]。实际 Chrome、React、DayPicker/Radix、宿主 app.css 和最终共享样式；1 个320/en/paper矩阵样例+额外两指针/两 Document 的96严格内部点（四边，四邻焦点，fine鼠标/coarse鼠标及触控），每点 CSS 命中稳定、一次可信点击/一次回调。无目标重叠，fine280/34/238、coarse312/44/308；320页面无横向溢出。其他验证：真实 ArrowRight+Enter 和 locale/Saturday，范围倒序禁用/Cancel/next7 Apply/窄屏堆叠，DateTime语法拒绝/结构时区/清空，Popover ownerDocument、确切 trigger恢复、嵌套Dialog仅关日历，真实 IME组成中Enter不提交/完成后提交，实际 ContainerProviders 迁移 main→iframe 时开放日历迁移/旧文档清理，以及开放状态卸载清理日历/焦点guards。
- 两个真实宿主时区 override Pacific/Kiritimati / America/Adak 下，库日历选择均提交2026-11-22；这证明日历日不跨日，不代替领域时刻解析。结果在 final-exact-native/result.json。
- 边缘日焦点截图 final-exact-native/date-focus-main-coarse.png（及 main-fine、second-fine、second-coarse）与计算属性2px/2px/solid均保留；已视觉检查左边缘焦点圈完整、未被日期 hit clip 裁切。其他截图均仅 /tmp。
- 生产 ESLint --max-warnings0、定向 tsc（真实生产/自有测试/夹具/Obsidian声明）、Prettier检查、原 runner guarded --check 均退出0，日志 lint-final.log/types-tests-final.log/format-final.log/fixture-check-final.log。夹具按仓库 ESLint 配置本就忽略，因此没有伪称夹具lint绿；其 TS 和 MJS 由真实构建检查。
- 架构检查退出0：1363 modules，无分区/宿主包/桌面/barrel/cycle违规；i18n退出0：33 dictionaries/5481keys，占位符与literal references匹配。architecture-final.log/i18n-final.log。
- git diff --check 授权路径退出0。新增未跟踪文件额外执行 git diff --no-index --check /dev/null，每项退出1表示有新增diff，输出全空/无空白诊断；whitespace-final.json 与 receipt 如实区分。未 add 或修改 Git 状态。

夹具 adapterCounts 为固定真实图：sonner1；roving-focus/menu/select0（图中确实没有对应包）；focus-scope、focus-guards、dismissable-layer、remove-scroll两项、scroll-bar两项、style-singleton两项均1。没有绕过源码摘要/anchor guards。

## 问题与下一步

候选无未解决定向失败。Lead 已拥有20条 ui.date.* en/zh词条及 UI architecture guard；本worker未写共享生产者。原始552旧消费者总类型诊断/领域迁移、完整生产 build/main.js、notice与bundle门禁未由本任务冒充通过；需 Lead 原子集成后再执行。暂未跑原始66全矩阵，等待独立 high 对冻结候选检查后由 Lead 执行。双文档为真实同源 iframe，不冒充 Obsidian popout/真宿主验收。

DateTime UI 的 native夹具 validateValue={()=>null} 仅检查UI结构和调用协议；DOM stub 的 domain-gap 也仅验证调用方错误传递。America/New_York不存在/重复时刻拒绝仍必须由T05/T07真实领域端口和域测试证明，T03无epoch或DST解析器。Dialog 日期调用方必须传 collisionBoundary 实际leaf，T04下游叶指标hook可提供此元素；不新增跨React上下文或底层→shell依赖。

接收独立high前保持12文件字节冻结；后续评审修复通过新的任务，不改本不可变报告。未提交、推送、发布或变更正式Ticket/Goal状态。
