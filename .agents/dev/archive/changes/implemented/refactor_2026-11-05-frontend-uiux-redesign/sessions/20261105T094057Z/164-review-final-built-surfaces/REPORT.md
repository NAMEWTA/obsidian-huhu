# 当前最终构建宿主表面独立图审

Session: 20261105T094057Z
Task: 164-review-final-built-surfaces
Status: completed

## 聚焦交接

Reviewer: native:/root/final_ui_contract；sol high；Strategy: independent；Risk: high；Independence: required；Mode: native。本人未参与本构建/安装或Root原生执行，未委派；只写本不可覆盖REPORT与/tmp/huhu-final-built-surfaces-high，未动源/资产/QA/状态/Evidence/index、原型设计或旧报告，也未新开Chrome/native或重跑矩阵。

**standards: request-changes；specification: request-changes。** 实际人工查看了当前构建全部24张canonical PNG：21张在本范围通过；三张Ink390（contacts、automations、terminal）有捕获过渡残影/裁切，尚不能作为完整稳定页面证据，BUILT-CAPTURE-01未闭。不能由这三张图断定持久产品故障，也不能借87个DOM检查绿或152旧图直接宣称当前24图全部通过。

当前输入/安装链核对通过：本地与冻结plugin三产物SHA/bytes/mode、installed-artifacts expected/installed一致；44 QA摘要、七个最新产品inventory摘要与source-manifest一致；revision6元数据及原基线618路径集合正确。152原完整设计/覆盖范围与161/163已闭修复按原边界复用，本次没有重审2071源/678路径每行或重复全部96图。

Root已明确166只做本地QA捕获稳定修复，待其单写后重跑同构建workbench，再以新任务关闭三图，不覆盖本REPORT。新858尚未完成；Root在本审期间另通知T04 second KeepEditing焦点失败，165只读诊断中，归因未定。本图审不把它当已通过或擅判产品根因，不裁定T14/G-FINAL/Goal。

## 产物与验证

### 当前构建、安装与真实退出

最终冻结根/tmp/huhu-t14-root-final3-artifacts（manifest.json、source-manifest.json、qa-manifest.json及plugin）。规范沿已读未变AGENTS/dev/ui/testing及审查合同、Map59/Goal/Spec/DESIGN3/UI002、152/161/163报告、inventory6与coverage；没有新设计或领域决策。

| 产物 | SHA256 | bytes / mode |
|---|---|---|
| main.js | 3d46003c5ba16d0cf0aec286bdac3b5c75ff143d489f29018fe34231cbf0920e | 8232590 / 0664 |
| styles.css | ae8a0e9196a784336a4a9dc2ee218b5dc6544fe20b818472e4f16ddc7696dca9 | 1262621 / 0664 |
| manifest.json | 416a808d099711bcfcf4194dfdce167b670e02bcbf22922a141658036692da16 | 244 / 0664 |

独立对当前repo与冻结plugin六个实际文件计算SHA/bytes/mode，全部等于冻结manifest。真正workbench安装证据/tmp/huhu-root-final3-host-workbench/evidence/installed-artifacts.json的pluginSource准确指向此冻结plugin，三项expected/installed都等于上表；安装receipt SHA256 6f4dca8fc478104e62adbe6d7b865b120ca30e24aa8768eaffd63f315bc1c1d4。不是用旧构建、fixtures或作者口述替代安装链。

本人实际读取/tmp/huhu-root-final3-native/{workbench,terminal,history}.receipt.json及各原日志，三条命令均为独立xvfb-run -a、node对应原生脚本，HUHU_PLUGIN_SOURCE为当前冻结plugin，实际exit_code均0；原检查分别87/7/25且没有失败行。workbench原result.json实际87 rows全部passed；terminal原日志7个PASS；history原日志25个passed逐条JSON记录。日志有不同输出格式，本地核验脚本最初误假设统一单行最终JSON而报解析错误，改为读取各真实格式后exit0，未改原日志/脚本或用字符串passed掩盖失败。

| Root原始receipt | exit / 实际检查 | receipt SHA256 |
|---|---|---|
| workbench | 0 / 87 | f3621e452579d7553d6223ed7a846a2759151a646461f63e803fbd769f0a079a |
| terminal | 0 / 7 | 3493835a3f812200d1a130a78a9d120a4111397acf72c3a73a57939c94daa064 |
| history | 0 / 25 | 9a5e5a9bfe3983ee05cd3d05bed9679643cabe0f60af893e4353b80c8b878850 |

同构建87回执包含实际fine=true/hover=true与coarse=true两媒体；桌面rail视觉/目标36满足≥32，粗指针目标44，各四边命中为true；实际rail可信键盘焦点为solid2px。它们不等于对截图每一控件执行交互，默认裸Agent形状button与任务三consumer32/44几何/圆形仍准确复用161当前样式验证；162只改Git两个variant且163已独立关闭。Root另报告九原生probe最终exit0，但本人此处只独立核对三条指定原始receipt，不假称本人运行或重验全部九条。

### 24张实际图与12面对照

全部图的共同根N=/tmp/huhu-root-final3-host-workbench/evidence。每行两个完整文件名均由本人view_image实际查看，不是仅数文件；每张当前尺寸/字节SHA清单在/tmp/huhu-final-built-surfaces-high/viewed-images.json，24项，清单SHA256 0010e7cc08e7679b6d2c27fdcfd2352a44079b034d49596ce73c121dc13a5b0d。参照152已读批准UI002各page与DESIGN§1/§3/§4/§5，不重开原型演示数据或未变领域字段。

| 页面 | N下实际纸1440 / 墨390图名 | 当前实际观察、批准合同与结论 |
|---|---|---|
| 首页 | production-paper-1440-dashboard.png / production-ink-390-dashboard.png | 空看板是真实隔离种子；28衬线问候、暖纸/墨、toolbar与空态主次操作正常，窄屏堆叠可见。原型演示widget不当成缺失功能。通过。 |
| 任务 | production-paper-1440-task.png / production-ink-390-task.png | 空列表，搜索/状态/日期/排序及新建正常，窄屏换行没有横溢。当前没有任务行，不能说这两图看到了圆形；161三consumer实测与七摘要对应本构建复用。通过本次默认页，圆形finding保持已闭。 |
| 日记 | production-paper-1440-navigator.png / production-ink-390-navigator.png | 当日无笔记、周期与日期范围/跳转/日程、禁用翻页真实可见；窄屏月索引堆叠。实际空日不要求原型演示正文。阅读正文/双页等152专态范围复用。通过。 |
| 档案 | production-paper-1440-contacts.png / production-ink-390-contacts.png | 纸宽树/People空态、创建模板/排序/Filter等保留。墨390整窗Chrome与页左边裁约75px，右露白色Terminal control残影，无法按完整稳定页判断；受影响一张待补。其余领域字段不立新问题。 |
| 自动化 | production-paper-1440-automations.png / production-ink-390-automations.png | 纸宽无二级栏，模板/搜索/历史/新建层级可见。墨390同样左裁与右Terminal control残影，无法以此证明稳定页；受影响一张待补。152稳定列表/失败/编辑等未变范围继续复用。 |
| 智能体/终端 | production-paper-1440-terminal.png / production-ink-390-terminal.png | 宽页无Space、控制pane在右为合法状态。墨390控制Sheet左边缘约x208，右侧内容/关闭区超出画面，像开启过渡中间态；尚未验证最终停止位置，受影响一张待补。不能据此认定持续裁切或重开151产品trap结论。 |
| 通知 | production-paper-1440-notifications.png / production-ink-390-notifications.png | 当前宽屏无显式二级Panel，全部/未读、搜索、来源、已读动作仍在；窄屏过滤/动作换行，空态完整。VIS-02在本构建图上成立，通过。 |
| 保险箱 | production-paper-1440-safe.png / production-ink-390-safe.png | 未初始化状态主密码/确认/恢复与锁定策略清楚，宽窄表单和输入focus glow正常。与原型锁定演示的状态差异合理，原152真实解锁/失败/替换确认范围复用，不当作缺字段。通过。 |
| 版本管理 | production-paper-1440-versioning.png / production-ink-390-versioning.png | 真正NoRepository，创建primary/打开设置secondary清晰，Clone为独立区域；窄屏上下排列。163源码修复在当前bundle宿主图上成立，VIS-03(a)保持closed。通过。 |
| 体检 | production-paper-1440-health.png / production-ink-390-health.png | 无checkup，Scan/Limited repair/Notifications入口和单Startcheckup主操作完整，未多装二级Panel。恢复态没出现在空页并非删除；161恢复主次Action/真实handler范围复用。通过。 |
| 笔记 | production-paper-1440-notes.png / production-ink-390-notes.png | 原Obsidian编辑器Source正文与标题可见，Ink工具主题下正文继续白色符合独立编辑器follow宿主合同，窄标题正文正常换行；批注/历史专态沿152/原原生链复用。通过。 |
| 设置 | production-paper-1440-settings.png / production-ink-390-settings.png | General树/搜索/语言/内容入口和status开关，窄屏标签控件纵排、可滚动。原型Appearance与当前General选中项不同不构成偏差；其他设置组范围复用。通过。 |

21张通过仅指实际看到的稳定布局/主题/当前设计范围，不声称所有字段状态或键盘/危险动作都由静态PNG证明。Paper/Ink HU独立根不要求改变宿主Chrome、ribbon或原编辑器正文；没有把宿主白底当HU泄漏。中文12px/Geist/read/mono、4px网格及用户密度/字号组合沿152/161准确来源复用，不凭24张英文默认页谎称重新穷举中文字体或所有像素。

### inventory6与输入有界核验

当前inventory revision6为678条，671有效+7删除，分类仍347modified/264unchanged-bytes/60added/7deleted。不是本次重做所有源码差异；独立git ls-tree读取37fcede基线文件路径，按既定原scope筛出618，和当前inventory原始in_git_baseline路径集合逐个比对，missing=[]、extra=[]，确认原618没有被总数相等掩盖。

七个最新产品路径（base.css、TaskPage、CalendarTaskRow、ProjectBoard、compose-workbench、sync-presentation、HealthPage）逐项当前SHA/mode等于inventory6与最终source-manifest；44 QA当前SHA/bytes/mode等于qa-manifest；source-manifest共2071项，只读取清单与上述七源做摘要，不把它说成2071源新审。七源完整SHA与最新REPORT链接保存在audit.json。七产品之外的152/161原完整链与未变实现按已有证据复用，当前scope没有理由再次逐行展开所有模块。

本人命令与实际退出：

- validate-dispatch：dispatch0；return在本REPORT落盘后执行，以真实工具回执为准。
- python3 /tmp/huhu-final-built-surfaces-high/audit.py：最终exit0，六个本地/冻结产物文件、安装receipt、44 QA、七最新source/inventory摘要、87/7/25原始检查与退出及fine/coarse条目核验errors=[]。中途只因原日志输出格式假设先后解析失败/断言失败，修正私有读取方式后按原原文核，未更改测试或标准。
- 基线集合/24 PNG清单脚本：exit0，实际原618=列举618、missing/extra空，24张尺寸与SHA已保存。
- 未执行build、vitest/lint、Chrome/native/矩阵，也没有读取用户真实vault/clipboard/账号。Root的10工程门/4802测试+41原skip为Root任务提供的执行事实，此处不冒称独立重跑。Root的新矩阵仍有待收口并有T04诊断事项，不能引用旧858绿替代。

## 问题与下一步

**BUILT-CAPTURE-01 · P2 · 当前三张Ink390 canonical捕获稳定性未验证；owner T14/原生QA workbench-probe。** 精确路径为N/production-ink-390-contacts.png、N/production-ink-390-automations.png、N/production-ink-390-terminal.png。前两图实际整窗Chrome/页左裁约75px，右有Terminal control白残影；第三图Sheet只进入部分宽度且右内容被截。它们不是可据以确认最终布局的稳定截图，不能因对应DOM row over=0或passed=true而跳过实际图。

当前只确认证据缺口，未确认证据能推出持久产品故障；不授权或建议重做产品/设计。Root已派166仅有界修复QA mounted后立即shot未等过渡的问题，保87/48检查，不增加任意长sleep或禁动画。此处不读写该候选，不等待或提前给其通过；Root单写后复跑workbench，用新任务审查同构建稳定的三张替补以及安装receipt，不覆盖本历史REPORT。其它21张图和本次输入核对通过范围可复用。

return校验/回读后立即停止读写，释放本审全部源/资产/QA冻结。Root继续165归因、166捕获稳定性及新正式矩阵/原生/状态证据收口，最终Goal仍由Root裁定。
