# 九个真实宿主驱动独立审查

Session: 20261105T094057Z
Task: 148-review-native-acceptance
Status: completed

## 聚焦交接

Reviewer: native:/root/final_ui_contract；sol high；Strategy: independent；Risk: high；Independence: required；Mode: native。未参与144候选或Root合入，未委派。仅写本不可覆盖REPORT和/tmp/huhu-native-acceptance-high，没有改脚本、产品、资产、状态、Evidence、index或原报告，没有运行Obsidian/native/858，没有接触实际剪贴板或用户库。

**standards: request-changes；specification: request-changes。** 一项 P2 驱动缺口：Safe 的“真实30秒清空”断言允许第二次复制后18秒就清空仍通过。纯Node执行当前断言原片段的正负控制已复现；这是测试判据问题，不是已确认产品timer有缺陷。其余九源的现行语义适配与风险保留未发现新的阻塞问题。已知focus/terminal真实产品失败仍由146/147生产者处理，不能改称工具失败或已通过。

九源始末hash/mode drift=[]。完成return0、回读后停止读写并释放全部冻结。此结论只审驱动，不给T14/G-FINAL/产品通过结论。

## 产物与验证

### 固定输入、差异与范围

Review-mode: source-files，真实未提交before/after范围。逐段阅读/tmp/huhu-root-frozen-native-entry/ready.patch共668行，并读取九个当前脚本及直接CDP/必要调用上下文。八个修改源和一个新增源的当前afterSHA/mode逐项匹配manifest；将当前九源复制至私有before树后实际git apply --reverse该patch，八个重建before原始SHA全部匹配manifest，第九新增文件确实不存在。没有用HEAD代替dirty before，没有在工作区反向应用。

规范来源为148/144 TASK、132具体宿主边界、144原始报告、当前Map56/Goal/Spec/T14、批准DESIGN3/UI002；标准沿已读AGENTS/dev/ui/testing和独立双轴/risk/error/reliability规则。没有PR/commit比较，commit-message来源not-applicable。146/147未合入生产候选不属于这九个脚本输入，不冻结全产品、不评价其修复。

patch SHA256 5032e3a75c45b473474d0b2784df30d2189857e1e3e4f2b64c3be4c70e04e136。九源当前清单 /tmp/huhu-native-acceptance-high/start.json，SHA256 8537c3221d10672fb695e16bcfae9db9aa226d3184536bd4180d850b100c835d；结束审计 /tmp/huhu-native-acceptance-high/end-audit.json，drift=[]。八个现有源0664，新host-boundaries为0644。以下SHA是实际当前字节：

| scripts/下文件 | SHA256 |
| --- | --- |
| obsidian-acceptance/workbench-probe.mjs | 9382c912bc30dad9c2b193427c2b89dde1ed6f45e5922a0cdb292cd51d6cf310 |
| obsidian-acceptance/workbench-window-owner.mjs | c05c73740989483306fc55d7c11fe4e0eef4a8b297fdc86923ddc89314f235c4 |
| obsidian-acceptance/terminal-merge.mjs | ea90580a3881a05817acaa9756fc4e42533af8e82ec82eb3a02eac999d20642c |
| obsidian-acceptance/versioning-history.mjs | 4bf4469677c336f0dbb28dc310e8e2ecb61d233d85bd59b9a26817c3c3988505 |
| obsidian-acceptance/theme-matrix.mjs | 2100ab749f923713f742857e458e54fa9933ca84ceaf4c2506201a4d67687f81 |
| obsidian-acceptance/navigator-restored-leaf.mjs | 2821d8f92651ff5eca287a5e843c528dc3a59ea5497f492e406873b70b14c314 |
| obsidian-acceptance/comments-edges.mjs | 5bfa5a473ac66268abd87bcec102c60905c63a866d8ae330569fa6b23a51925b |
| obsidian-acceptance/fresh-vault.mjs | 968334418d284732c9b543ea1985b8cbad75038ae9417716270d007dc1ffabc5 |
| ui-review/fixtures/frontend-redesign/integration/host-boundaries.mjs | dfd1b94662851caffc7c1919b7f015f71eab8902de6973734318b6ef4e4c1ef2 |

144的旧构建history25/theme125/owner13/Safe12/comments14/navigator on/off成功只作作者背景，没有当作当前独立运行证书。最后owner清理同owner全部leaf和Safe feedback收紧、fresh-vault最终receipt增强，仍必须由Root在最终新构建运行；本审查不填补未执行的宿主结果。

### standards 输出

Reviewer: native:/root/final_ui_contract；Result: request-changes。

**NATIVE-01 / P2 / owner T14 host-boundaries驱动：30秒清空断言缺少第二次copy后的时间下界。**

位置scripts/ui-review/fixtures/frontend-redesign/integration/host-boundaries.mjs:41–44。当前先记录第一次copiedAt，15秒后recopy，首次copy+31秒时确认nonce尚存，然后允许后续20秒内任意时刻清空，直接将real-production-thirty-second-clear记true；elapsedMs只是详情，没有断言。故第二次复制后18秒清空、首次copy+33秒的行为也会被标成“30秒”通过。

独立反例直接从当前源提取const copiedAt至clear check完整原片段，在纯Node vm时钟/状态模型执行，保留原两个check和until窗口；不是重新手写一份判据，也没有修改产品timer、注入宿主clipboard或运行加速native。结果如下：

| 控制模型 | 原片段结果 | 意义 |
| --- | --- | --- |
| recopy后正确30秒 | pass，elapsed45000ms | 正常路径可达 |
| recopy后过早18秒 | **pass，elapsed33000ms** | 明确的应拒绝反例被接受 |
| 旧owner在首次copy30秒清 | fail，elapsed31000ms | 旧timer负控制有效，不能代替新timer下界 |
| recopy后过迟50秒 | timeout，elapsed51000ms | 现有上限负控制有效 |

实际命令node /tmp/huhu-native-acceptance-high/timer-predicate.mjs退出0，表示四项观察与预期匹配，包括缺陷反例；不表示产品timer测试通过。原片段与结果保存在timer-predicate.mjs及timer-predicate-result.json，只留本地。它证明判据不足，不推断当前Safe实际用了18秒；生产safe-service仍经CLIPBOARD_CLEAR_MS安排真正timer。

最小满足条件：仅在该脚本记录第二次真实copy的时刻，保留原跨旧deadline不清断言，并确认新copy在接近其30秒前仍保留nonce、到真实deadline后合理的已有轮询宽限内清空；对second-copy elapsed做下界/上界断言并保留原始时间。纯Node正负控制应使上述18秒模型红、30秒模型绿；Root仍必须在隔离Xvfb、同最终产物上跑真实30秒recopy。不要改产品timeout、扩大总体时限、clock加速或fake clipboard来消除finding。

### specification 输出

Reviewer: native:/root/final_ui_contract；Result: request-changes。

NATIVE-01同时不满足148“真实30s timer+recopy、失败不绿”的明确验收，因此规范轴按同一事实要求修脚本；不是要求重写Safe或重开其它模块。

以下真实diff与控制流核对未发现风险被删除：

- fresh-vault仍要求不存在的新绝对root（mkdir非recursive）、私有vault/profile/HOME/XDG配置/runtime，复制三资产前后expected/installed SHA严格相等，并记录entry脚本和本地PTY helper SHA、display；启动/重启/崩溃重启、CDP错误捕获和owned进程stop沿原launcher，无第二引擎。receipt说明安装的是哪些字节，不自行认证Root最终产物基线；Root仍需与最终冻结三件套配对。
- workbench用getNativeSurfaces实际type、当前page.contains/content几何与.huhu-ui就绪，不只rail active；11真实rail+native notes组成12表面，paper/ink×1440/390，另900响应式；设置、内容路径、Panel、模块off/on与持久route重启保留。实际媒体fine+hover/coarse先观测；伪元素hitbox尺寸结合四向内部elementFromPoint与真实键盘focus检查，保留已知outline失败断言，没有用固定媒体名代替真实模式。该probe是宿主入口/就绪与横溢检查，不冒充每个领域全功能。
- window-owner连接新CDP page renderer，保原explicit main/popup/full/focus/ribbon语义；两个renderer真实DateField/Portal/theme，Esc清层，最后遍历原popout owner全部leaf detach、核无其工作台；false行导致process.exitCode=1、exception重抛，最终stop。最后增强尚待Root真实执行，不因静态可达写成通过。
- terminal使用绝对本地helper、私有HOME与随机echo nonce；两session、关闭重开、跨task/home/terminal后真实buffer标记、paper/ink生产token都在；外Radix menu内cmdk option语义没有盲改menuitem。until将DOM真假显式序列化，异常回false后到期抛出，不把Error字符串当成功；原40s/20s等待没有扩大。已知重显focus循环是产品真实失败，不能禁用切页或改为仅rail断言。
- history从旧CM/choice转当前data-note-history/data-choice-key和Pierre Shadow pre；明确批准两布局替换旧Unified。HEAD/index零写、本地无remote Git、preview、cancel/confirm/undo、未保存draft与disk双checkpoint、多叶deterministic race、评论anchor、copy/undo、5000行Worker、restart hold/receipts/session-expired、真实popout source与释放sync hold全部保留；Render anyway走真实有意门，Other.md只在隔离fixture造真实差异。catch记false，最终assert保留非零，不以截图当恢复正确性。
- theme只替换已废旧UIpreset目标为当前root paper/ink/source/accent/density/uiSize/motion，仍保独立SCHEMES、SuliWorld/GitHub、字体、自定义font、原生reading/LP/source三模式、navigator dock/center/popout与Portal、scriptless iframe真实Markdown和离线资源、preview不写设置、reset不改正文、plugin unload恢复。unsafe host palette负控制明确整组回退。当前字段/结构和模式检查不能扩大为所有社区主题已验；本次没有重跑125项。
- navigator保restored on/off与左栏归属，新增三次hide/show同root和off拆除/on单root；comments用精确Comment color而非全局color input，真实非交互gutter、命令/面板入口、两编辑器/popout/外部insert/shared anchor、精确quote定位与保留空选区、全部rich reading overlay保留。comments隐藏root检查没有直接计数服务查询，144明确保留与原T10证据组合的边界，没有冒称本脚本证明零查询。
- Safe严格要求caller声明独立Xvfb及本地DISPLAY，真实Electron剪贴板，先通过本次假记录copy再读，未读取用户既有剪贴板。主密码和nonce均合成；锁定/隐藏/迁移/闭窗/restart、主/次renderer嵌套Dialog/AlertDialog与具体Password copied反馈仍实际断言。无fakeClipboard、生产timer替换、账号或外部消息。除NATIVE-01，未发现新增驱动会把这些路径的失败直接标pass；原生filepicker/其他平台/更长idle未验清楚。

### 实际检查与诚实边界

九个node --check逐一退出0；Python核afterSHA/mode、逆patch重建before及结束drift均退出0。私有逆patch实际git apply --reverse退出0，八个beforeSHA匹配、新文件不存在。语法与hash不替代运行语义。

两个纯Node原脚本早期失败控制实际各退出1：HUHU_ISOLATED_XVFB=0、DISPLAY=:488；HUHU_ISOLATED_XVFB=1、DISPLAY=remote:0。均在launchFreshVault前assert拒绝、预定tmp root没有创建，未启动宿主或读取剪贴板。这只证明守卫拒绝缺声明/非本地display，不声称变量本身能鉴定Xvfb；Root必须实际通过xvfb-run -a提供新display。

dispatch命令node .agents/speculo/references/coordination/scripts/validate-dispatch.mjs --repo /home/wta/projects/obsidian-huhu --scope-root .agents/speculo/.speculo/specdev/changes/2026-11-05-frontend-uiux-redesign --session 20261105T094057Z --task 148-review-native-acceptance --stage dispatch实际退出0、errors=[]、warnings=[]。return写后使用同参数--stage return。部分初次定位的猜测路径不存在，rg/cat/diff退出1/2后改用真实路径或私有逆patch；未将这些定位失败当验证通过。

未运行build/lint/types/Vitest/native/Chrome/858；没有取得新的主机、clipboard或产品像素通过证据。测试中CDP evaluate自身在renderer确定性挂起时，外层until不能强行中断未返回请求；144/147已经保留owned清理和真实产品循环事实，Root最终运行仍须按有界owned父进程回收，不能以更大timeout或放松assert换绿。本review未改launcher/CDP、不将已确认生产挂起重新归类成新工具问题。

## 问题与下一步

将NATIVE-01交T14原驱动owner做单文件最小修订，随后独立复核新增时刻与正负判据；其余八源和未变风险结论可按hash继续有界复用。Root在146/147实际生产修复、重建与最终三件套冻结后统一正式运行宿主与858，保留最后owner/Safe反馈增强待运行，不引用旧构建成功替代。必要宿主或产品失败未闭合时不宣布T14/G-FINAL通过。

本REPORT不覆盖144或已知失败历史。完成return0和回读后停止全部读写并释放九源冻结；本次没有源修复、状态推进或远程副作用。
