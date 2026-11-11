# 任务回报

Session: 20261104T095541Z
Task: 084-rereview-t15
Status: completed

## 聚焦交接

完成 T-15 修复候选的独立双轴复审，Standards Axis 与 Specification Axis 均为 pass。080 的 F1–F5 已关闭；亲自重放原 F1/F2 反例、运行正式 UI runner 及定向回归，未发现新的可操作问题。138 项测试、48 个正式 UI 组合、生产/测试类型、定向 lint、架构与 i18n 检查均通过。本次仅写本 REPORT，未修改业务文件、TASK、状态工件或构建产物；最终构建集成与 Ticket 状态由 Lead 决定。

## 审查身份与固定输入

- Reviewer：当前 Codex；未参与本票实现或修复，未委派。Risk: medium；Independence: independent；Strategy: 对 080 finding 逐项关闭，审查修复代码、调用链与测试，再用真实生产组件和 owner 内存端口独立重放边界反例。
- Basis：完整读取 084 TASK、082 修复 REPORT，复用 080 已读取且适用的 reviewer-contracts/risk-review、domain-runtime、AGENTS.md、dev/ui 技能与引用规则；对照 T-15、Spec §5/AC-501/AC-504、Map/ADR/CONTEXT/Goal Plan、DESIGN revision 2 与 UI-001 final。AGENTS/dev/ui 哈希与上一轮一致。
- 工作区 /home/wta/projects/obsidian-huhu，branch dev，HEAD/base 29644dc5833bb209e6282f84fa71441a5a1b99d4。TASK 的整体摘要 Input-SHA256：119c8ebe8755f262bca90fb3e53cc7855a56a03b3abf56bb8415135b2c3b34ec。9 个冻结文件在开始、途中、写报告前均逐项 SHA-256 匹配，回读后再次核验。
- 核对 ArchivePage → PersonReadingPage → PersonJournal/PersonOverview，以及 RecordEditor、RelationPanel、runtime 重载和 Dialog 的相关边界。新增文件按完整快照、已跟踪入口对照 base diff；不将其他票 dirty 改动纳入本票写集或结论。
- styles.css SHA-256：f25fd2ea6ee5878340387f28ba594b3affbe6418da514e4f7a82645e33bd0177，检查前后相同。正式 UI runner inputDigest：4b87f4118be19bc6b488e49ba3c0c0a2385bd3d4dc44fb5f5a089b44fcaa70e1。未生成或注入修正样式。

## Standards Axis

Result: pass

本轮无新增 finding。上一轮标准轴问题关闭情况：

| 原问题 | 修复位置与复核结果 |
|---|---|
| F1 major：卸载后旧确认仍删除旧人物 | PersonJournal.tsx:12、:109、:155。确认绑定 lifetime AbortSignal，清理时关闭并返回取消；重复确认受 confirming 限制，run 在 owner 调用前检查存活、实体 ID、运行及索引状态。独立重放：A 打开删除确认，经真实 leave guard 切到 B，旧 dialog 消失；再次激活保留的旧按钮引用，两个 document 中 A 都仍有 1 条纪事，写次数均保持 33。DOM 还覆盖升级等待、持久 owner 卸载、重复打开与重复确认只调用一次 remove。 |
| F2 major：重载期间卸载人物页并丢草稿 | ArchivePage.tsx:206、:256、:387；PersonReadingPage.tsx:46、:127；PersonJournal.tsx:155。同一实体/修订的最后有效快照覆盖索引恢复空档，读取错误时保留 UI 并禁用写入；记录确实不存在且索引完整、无读取错误时清缓存。独立重放原 Unsaved draft before reload：loading、成功重载、读取失败、恢复后均保留同一标题和纪事视图；loading/失败时保存禁用，直接 dispatch submit 也没有写入。两个 document 写次数始终为 33，恢复后保存重新可用。DOM 另验证取消离开仍保留输入、恢复后可以真实保存。 |
| F3 minor：隐藏上传控件被误测为文字输入区 | T-15.mjs:16 的 measureDocument 检查实际可见性、关闭 details、hidden/inert、CSS 隐藏/裁切，并按文字输入用途选择字段。正式 runner 中关闭资源区不再测隐藏 file input；打开资源区仍断言实际可见文本字段，保留 >=100px 与 44px 阈值，未靠降低断言制造通过。 |

dev/ui 约束复核：写入仍只经原 personJournal/commands owner，组件没有新增磁盘事实源；人物缓存仅为临时 UI 恢复状态，按稳定实体 ID/修订限定。继续 lazy 挂载人物页面，企业/自定义通用入口未被人物判断覆盖；关系摘要查询独立记录并处理异步失效。新增文案双语对应，复用现有 React/DesignScope/Dialog/输入组件与语义令牌，未新增依赖或跨模块私有访问。类型、lint、架构和相关数据/DOM/黄金样本回归通过。

## Specification Axis

Result: pass

本轮无新增 finding。上一轮规范轴问题关闭情况：

| 原问题 | 修复与实际结果 |
|---|---|
| F4 minor：420px/200% 纪事文字区仅 75px | 人物页内外 fieldset 显式 m-0/border-0/p-0，清除浏览器默认留白。正式 runner 的 420/en/light/2x（CSS viewport 210px）main 日期内容区 129px，标题/正文/关联搜索各 105px；1x 为 339/315/315/315px。所有中英/主题组合通过；该案例横向溢出为 0，所测控件高度至少 44px，已查看实际 2x 截图。 |
| F5 minor：概览缺少最近纪事与关系摘要 | 新 PersonOverview.tsx:25、:45、:58 从真实人物纪事及独立关系查询生成摘要，最近纪事按日期排序取三条，关系显示目标稳定 ID，并提供进入纪事/关系的动作和空/加载/错误/不完整状态。生产 DOM 验证真实 Recent memory、Friend、跳转及另一同名人物空态；另查看完整窄屏概览截图，两个信息分区和动作已恢复。 |

- AC-501：四视图、schemaRevision 资料编辑、独立关系、纪事通常路径及窄容器分段导航通过 DOM 与正式 UI runner。加载、读取失败/恢复、冲突和保存失败保留输入；等待删除时导航取消，无旧人物晚写入。
- AC-504：企业与 custom-person-like 类型保持通用详情和动态表单，定向 DOM 回归通过。人物判断继续使用稳定 type-person ID，不按显示名称混档。
- Design Conformance：对照 DESIGN revision 2，confirmation.digest 1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00、PERSON-READING 与 UI-001 final。身份/修订、四视图、概览两分区及动作、资料/关系职责、纪事编辑删除、loading/error/conflict/same-name/generic 状态符合本票合同；本轮没有重选风格或删减批准信息结构。
- 范围：未引入素材、画像生成、聊天或独立联系人主库。保留现有 bz 固定提交来源/版权头及 docs/third-party/bz.md 的采用登记；本轮新增概览按批准原型实现，未发现新增上游代码复制。原始依据沿用 https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/people/render.ts 与同提交 src/people/ui.ts，上一轮已核对的不可变来源不重复获取。

## 产物与验证

以下命令均由本人在当前工作区执行，退出码均为 0：

| 命令 | 结果 |
|---|---|
| pnpm exec vitest run src/modules/archives test/golden/archives-v2.test.ts test/archive-relation.test.ts | 20 文件、138 测试通过，含人物 13 项与既有通用详情/列表、服务及黄金样本回归 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.json | 生产类型通过 |
| pnpm exec tsc --noEmit -skipLibCheck -p tsconfig.test.json | 测试类型通过 |
| pnpm exec eslint src/modules/archives/ui/person src/modules/archives/ui/generic/ArchivePage.tsx src/modules/archives/i18n.ts scripts/ui-review/fixtures/T-15.mjs scripts/ui-review/fixtures/T-15.tsx --max-warnings 0 --no-warn-ignored | 定向 lint 通过 |
| pnpm test:architecture | 1338 模块，无分区/宿主/启动/循环违规 |
| node /tmp/huhu-review-084-t15-i18n.mjs | 等价原 verify-i18n，只将输出移至 /tmp 并绝对定位既有依赖；33 词典、5447 键/占位符/字面引用通过 |
| node scripts/ui-review/run.mjs --ticket T-15 --matrix standard --out /tmp/huhu-review-084-t15-ui | 原始正式 runner，48 组合全部通过，errors=[]；覆盖 420/600/1440、中英、四主题、1x/2x、coarse/fine、减少动效与键盘等既定断言 |
| node /tmp/huhu-review-084-t15-replay-run.mjs --ticket T-15 --matrix standard --out /tmp/huhu-review-084-t15-replay | 原 F1/F2 独立边界重放通过；含旧按钮晚激活、重载/读取失败/恢复与直接提交不写入 |
| node /tmp/huhu-review-084-t15-overview-run.mjs --ticket T-15 --matrix standard --out /tmp/huhu-review-084-t15-overview | 额外概览截图与真实纪事/关系内容采样，已查看完整截图 |

正式 runner 的扩展交互全部通过：键盘/减少动效、资料/关系/纪事、编辑删除空态、冲突保留、同名 ID、企业通用、loading/error、等待删除时导航取消、重载失败恢复保留草稿、概览与资源输入。独立重放及截图脚本仅在 /tmp 复制 runner 并注入检查动作/缩小组合，加载原冻结 fixture TSX、生产组件/服务及同一生成样式，不改生产文件；不将这两个定向脚本冒称正式矩阵。

本地证据（纯路径，仅留本地）：

- /tmp/huhu-review-084-t15-ui/result.json
- /tmp/huhu-review-084-t15-ui/420-en-light-2x.png
- /tmp/huhu-review-084-t15-ui/loading.png
- /tmp/huhu-review-084-t15-ui/error.png
- /tmp/huhu-review-084-t15-replay/result.json（deleteBefore/After、reloadBefore/During/Failed/After）
- /tmp/huhu-review-084-t15-overview/420-en-light-1x.png

验证边界：Chrome 153.0.8010.47 + Obsidian ASAR app.css + 真实 React/owner 服务，使用内存文件端口；第二 document 为同源 iframe，未启动真实 Obsidian/popout 或设备。未运行被 TASK 禁止的 build/build:css/notices，未安装依赖、执行 Git 写操作或运行会临时写 src 的门禁；未执行全仓 lint、全量测试和最终构建产物一致性检查。本复审结论针对固定源码与上述组件验收，不替代 Lead 最终集成和宿主边界验收。

## 问题与下一步

无复审阻塞，F1–F5 均关闭，无新增 finding。Lead 可依据本冻结候选、正式矩阵及双轴 pass 接续最终构建/集成与适用宿主验收，再更新 Ticket/Evidence；本 REPORT 的 completed 仅表示复审交回。
