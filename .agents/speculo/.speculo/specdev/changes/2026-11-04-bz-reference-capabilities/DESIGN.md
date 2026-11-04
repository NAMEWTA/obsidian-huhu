---
{
  "schema_version": 1,
  "artifact": "change-design",
  "change": "2026-11-04-bz-reference-capabilities",
  "revision": 2,
  "status": "approved",
  "scope": [
    "huhu.workbench",
    "huhu.safe",
    "huhu.archives",
    "huhu.navigator",
    "huhu.health"
  ],
  "baseline": {
    "revision": "DESIGN-0002",
    "digest": "ef5e5080f6c1a8f967397af72fca0050820b9ad4d9a4f57451be3a63ab55b2b1"
  },
  "prototype_ref": {
    "id": "UI-001",
    "digest": "1d4c1476e4d94d08498ca429d8b348f80810ee455c79863dc9595731d33c662e"
  },
  "selection": {
    "candidate_id": "bz-huhu"
  },
  "tokens": {
    "background": "var(--background-primary)",
    "foreground": "var(--text-normal)",
    "primary": "var(--interactive-accent)",
    "primary_foreground": "var(--text-on-accent)",
    "muted": "var(--background-secondary)",
    "muted_foreground": "var(--text-muted)",
    "border": "var(--background-modifier-border)",
    "input_boundary": "var(--text-muted)",
    "focus": "3px solid var(--interactive-accent); offset 1px",
    "font_ui": "Geist + 系统中文回退",
    "font_mono": "Geist Mono + 系统等宽",
    "text_body": "14px",
    "text_meta": "12px",
    "text_title": "20px",
    "spacing": "4/8/12/16/20/24/32px",
    "control_desktop": "36px；最小 32px",
    "control_narrow": "44px",
    "radius_control": "8px",
    "radius_panel": "12px",
    "radius_dialog": "14px",
    "rail": "52px",
    "header": "44px 最小高度",
    "motion": "120ms opacity；reduced-motion 无动画",
    "safe_columns": "200px / 280px / minmax(0,1fr)；中容器 260px / minmax(0,1fr)",
    "breakpoints": "960px / 600px；内容卡片 1100px 二列、599px 单列"
  },
  "pages": [
    {
      "id": "SAFE-QUICK",
      "route": "safe/quick-pick",
      "task": "快速取密",
      "states": [
        "default",
        "locked",
        "loading",
        "no-results",
        "generated",
        "copied",
        "closed",
        "error"
      ],
      "acceptance": [
        "AC-201",
        "AC-202",
        "AC-203",
        "AC-204"
      ]
    },
    {
      "id": "SAFE-WORKSPACE",
      "route": "safe/workspace",
      "task": "密码本",
      "states": [
        "default",
        "empty",
        "loading",
        "error",
        "detail",
        "relations",
        "invalid-relation",
        "locked"
      ],
      "acceptance": [
        "AC-211",
        "AC-212",
        "AC-213",
        "AC-214"
      ]
    },
    {
      "id": "BELONGINGS",
      "route": "archives/belongings",
      "task": "归物本",
      "states": [
        "default",
        "empty",
        "no-results",
        "loading",
        "error",
        "detail",
        "transition",
        "resold",
        "discarded",
        "returned",
        "undo",
        "conflict",
        "money-edge"
      ],
      "acceptance": [
        "AC-301",
        "AC-302",
        "AC-303",
        "AC-304",
        "AC-305",
        "AC-311",
        "AC-312",
        "AC-313"
      ]
    },
    {
      "id": "BELONGINGS-REPORT",
      "route": "archives/belongings/report",
      "task": "年度报告",
      "states": [
        "default",
        "empty",
        "loading",
        "error",
        "historical",
        "money-edge"
      ],
      "acceptance": [
        "AC-304",
        "AC-305",
        "AC-321"
      ]
    },
    {
      "id": "DIARY-READER",
      "route": "navigator/diary",
      "task": "书页日记",
      "states": [
        "default",
        "loading",
        "empty-date",
        "error",
        "next-page",
        "calendar",
        "month-index",
        "fallback",
        "hidden"
      ],
      "acceptance": [
        "AC-401",
        "AC-402",
        "AC-411",
        "AC-412",
        "AC-413",
        "AC-414"
      ]
    },
    {
      "id": "DIARY-SEARCH-WRITE",
      "route": "navigator/diary/search-write",
      "task": "搜索与写作",
      "states": [
        "default",
        "indexing",
        "partial-range",
        "no-results",
        "editing",
        "saving",
        "saved",
        "discard-confirm",
        "template-cancelled",
        "template-unavailable",
        "conflict",
        "error"
      ],
      "acceptance": [
        "AC-421",
        "AC-422",
        "AC-423"
      ]
    },
    {
      "id": "PERSON-READING",
      "route": "archives/person",
      "task": "人物档案",
      "states": [
        "default",
        "loading",
        "empty",
        "error",
        "profile",
        "relations",
        "journal",
        "journal-edit",
        "journal-delete",
        "conflict",
        "same-name",
        "generic"
      ],
      "acceptance": [
        "AC-501",
        "AC-502",
        "AC-503",
        "AC-504"
      ]
    },
    {
      "id": "HEALTH-SCAN",
      "route": "health/scan",
      "task": "数据体检",
      "states": [
        "default",
        "running",
        "complete",
        "cancelled",
        "incomplete",
        "provider-error",
        "unavailable",
        "locked",
        "stale",
        "notification"
      ],
      "acceptance": [
        "AC-601",
        "AC-602",
        "AC-603",
        "AC-604",
        "AC-611",
        "AC-612",
        "AC-631"
      ]
    },
    {
      "id": "HEALTH-REPAIR",
      "route": "health/repair",
      "task": "有限修复",
      "states": [
        "default",
        "preview",
        "confirm",
        "revalidating",
        "complete",
        "stale",
        "partial",
        "restore",
        "cancelled",
        "unsupported"
      ],
      "acceptance": [
        "AC-621",
        "AC-622",
        "AC-623",
        "AC-624",
        "AC-631"
      ]
    }
  ],
  "overrides": [],
  "confirmation": {
    "by": "user",
    "at": "2026-11-04T09:45:00Z",
    "record": "prototypes/UI-001/approval-r2.md",
    "digest": "1e3b5ef5fb4c6ec033ff6a1d9f164a7f3692cc679b71e2d54771c1ea46082c00",
    "record_digest": "9a1dcec9ae4e3ebc28f98684a83fbbe8d90d33175258b71f9e94b8fe0e8cd002"
  },
  "updated_at": "2026-11-04T12:45:49.783Z"
}
---





# Change DESIGN · bz 参考能力

## 范围、基线与决定

本合同由 P 拥有，仅覆盖当前 change 的九个页面。项目基线为 DESIGN-0002，规范摘要见 baseline。继承 DS-001–DS-010、DS-013；DS-011/012 的工具审批和终端细节不在本次范围。未发布或修改永久设计。用户决定来源为 LOG.md 的 LOG-013（唯一候选、预先批准）及 LOG-022（d76a087 单源 UI、UI-001 单包九页）。产品行为按 spec.md 第 2–6 节与 ADR.md ADR-001–006；术语按 CONTEXT.md。

这是局部任务页面增加，保持单一工作台，不建立第二套 shell、账户库、档案库或日记正文。原型是内存 fixture，批准的是这里的视觉与交互合同；文件零写入、安全随机、密文兼容、剪贴板条件清理、并发哈希、事件生命周期和按需加载等必须由实施票用真实服务验证，不能由本原型认证。上游数据边界、AI 画像、私密导入、加密日记、外部素材和独立存储不采用。

## 选定方向与来源

唯一候选 bz-huhu；按用户指定方向，不再生成平行风格。任务结构来自以下固定提交，视觉表达转译为 HUHU token；原型中的图片均为具名占位，不拷贝素材。

- 密码本： `src/password-vault/render.ts`（完整固定 URL 见 UI-001 包 sources 的同 locator 条目） 的 deskHTML、platDetailShellHtml、acctCardHtml，以及 `src/password-vault/quick-pick.ts`（完整固定 URL 见 UI-001 包 sources 的同 locator 条目） 的选择器任务。保留范围/列表/详情与快捷搜索，改用 HUHU 收藏标签和 30 秒条件清理；原型不复制真实秘密。
- 归物本： `src/belongings/layouts/poster/render.ts`（完整固定 URL 见 UI-001 包 sources 的同 locator 条目） 的 hero/KPI、chips、工具行和卡片； `src/belongings/report.ts`（完整固定 URL 见 UI-001 包 sources 的同 locator 条目） 的年度分段。去掉整卡反色与拟物装饰，保留信息层级；币种分栏、金额/未知日期语义由 Spec 优先裁决。
- 日记： `src/diary/render.ts`（完整固定 URL 见 UI-001 包 sources 的同 locator 条目） 的 bookPanelHTML 与书内 wsp； `docs/adr/adr-0230-diary-book-ui.md`（完整固定 URL 见 UI-001 包 sources 的同 locator 条目） 的印刷字体、窄屏与减少动效原则。只借鉴双页、月份索引、跳日与书内写作；不复制素材、火漆、手写字体或删除日记能力。
- 人物： `src/people/render.ts`（完整固定 URL 见 UI-001 包 sources 的同 locator 条目） 的 detailPage 身份区与分段内容。依 Spec 只保留概览/资料/关系/手工纪事，去掉画像生成、导入和聊天。
- 体检： `src/checkup/ui.ts`（完整固定 URL 见 UI-001 包 sources 的同 locator 条目） 的 renderIdle、renderRunning、renderReport。将上游浮层改为 HUHU 工作台页面；保留问题分组与过期结果，收紧到 owner 重新校验与有限修复。

上述来源采用交互复刻方式；具体已读取文件摘要见 prototypes/UI-001/design-system.md 的 sources，MIT 原文保留在包内 LICENSE-bz.txt。

## Token、组件与层级

规范值见 frontmatter tokens。生产实现直接使用 src/ui/components 的 Button、Input、Textarea、Select、Dialog、Sheet、AlertDialog、Badge、Progress 与 huhu/EmptyState、SegmentedControl；原型只用离线原生控件投影这些语义，不引入运行时或第二套组件库。模块装配、api.ts 互访和服务写入权仍按 dev 与各 Ticket 合同；生产文案须 t() 且 en/zh 同步。

使用 Obsidian 语义色，浅/深回退仅服务离线预览；不能把回退十六进制值复制到模块。边界与焦点使用对比度足够的 input/ring，选中态同时有文字与 aria 状态。表面用细线、12px 面板圆角；阴影仅用于 Dialog。正文 14px，密集信息不低于 13px、辅助 12px，主要标题 20px。状态不只用颜色，失败和未完成持续占位，不清空有效数据。没有全局工作台页脚，原型底部状态工具是预览器，不进入生产。

## 页面、状态和验收映射

以下页面 ID 是 Ticket design_ref.pages 的权威；frontmatter states 是浏览器证据必须覆盖的全集，acceptance 是 design_ref.acceptance 的合法集合。路由为模块内设计目标，不注册新的 Obsidian ViewType。

### SAFE-QUICK · 快速取密

状态：default, locked, loading, no-results, generated, copied, closed, error。

验收：AC-201, AC-202, AC-203, AC-204。

命令入口先解锁；搜索平台/条目/账号，结果无明文，↑↓选择、Enter 显式复制、Esc 关闭，IME 中不提交。无结果只提供生成动作，点击后才显示 12 位四类字符且不保存。复制提示不回显秘密；真实实现沿用 30 秒条件清理。锁定、禁用、窗口关闭立即关闭、清空查询与生成结果，使晚到回调失效。加载与失败保留可取消/重试入口。

### SAFE-WORKSPACE · 密码本

状态：default, empty, loading, error, detail, relations, invalid-relation, locked。

验收：AC-211, AC-212, AC-213, AC-214。

宽容器是范围/标签→条目与账号→详情与关系；收藏由标签表达。可见手机号、邮箱、账号 ID、受控滚动长备注和持续可达操作栏。关联和反向引用按稳定 ID 跳转；缺失目标显示诊断不误跳。窄屏列表→详情→返回，范围通过可达的分段入口呈现；回收站与备份沿用既有能力和入口，不改变密文格式。

### BELONGINGS · 归物本

状态：default, empty, no-results, loading, error, detail, transition, resold, discarded, returned, undo, conflict, money-edge。

验收：AC-301, AC-302, AC-303, AC-304, AC-305, AC-311, AC-312, AC-313。

KPI→四态状态条→搜索/年份/排序→卡片→详情，图片具名占位。详情保留金额/币种、日期、状态、规格备注、凭证与所有者关联；生命周期行带 rowId。迁移通过明确日期确认；离场态互换保留可修改日期，返库追加不删除历史；同 operationId 幂等与哈希重验交由 owner。提交后给操作 ID 绑定撤销；过期哈希拒绝并保留新数据。档案表单不覆盖未知字段。金额十进制字符串、多币种分栏、售价未知≠0，日期月精度/零天/负值明确标注。

### BELONGINGS-REPORT · 年度报告

状态：default, empty, loading, error, historical, money-edge。

验收：AC-304, AC-305, AC-321。

年份选择驱动历史事件重放，不拿当前状态回算过去。按币种展示购入/离场、十二个月购入金额、分类、回收与持有时间；无数据给年份空态，失败保留上次有效结果。年度与卡片共用纯计算服务；原型为说明结构的预计算 fixture，不认证生产统计计算。

### DIARY-READER · 书页日记

状态：default, loading, empty-date, error, next-page, calendar, month-index, fallback, hidden。

验收：AC-401, AC-402, AC-411, AC-412, AC-413, AC-414。

navigator 页面拥有当前卷书页，宽屏双页，按钮/方向键翻页，月份索引与日期输入跳日；打开原文指向同一周期笔记。空日期浏览不建文件。窄屏单页纵向阅读；减少动效和引擎加载失败无动画切换。实现内嵌 page-flip 仅按需加载，有限页/卷预取；隐藏关闭停止动画和预取。原型用无动画双页结构，不装载生产翻页库，库行为与包体在 I 验证。

### DIARY-SEARCH-WRITE · 搜索与写作

状态：default, indexing, partial-range, no-results, editing, saving, saved, discard-confirm, template-cancelled, template-unavailable, conflict, error。

验收：AC-421, AC-422, AC-423。

搜索状态显示建立索引进度/仅已加载范围/全部范围；只有全部扫描后才宣布无结果。写作在书内面板，含日期、正文、保存状态和放弃确认；取消返回保留草稿，确认放弃才清除。保存中防重复，成功按 owner 回执提示；已有笔记只追加不整篇覆盖。模板取消/不可用时保留草稿且不建空白文件；未保存编辑器/外部修改冲突保留输入并提供打开原文核对。原型保存只追加浏览器内存，不写真实笔记。

### PERSON-READING · 人物档案

状态：default, loading, empty, error, profile, relations, journal, journal-edit, journal-delete, conflict, same-name, generic。

验收：AC-501, AC-502, AC-503, AC-504。

人物身份区带稳定 entityId 和修订，概览/资料/关系/纪事分段导航。资料仍用动态 schemaRevision 表单，关系仍用独立记录。纪事增/改/删指向人物 entityId 与 rowId，日期/标题/内容/关联实体由档案命令和预期哈希提交；删除确认只影响指定纪事行，保留自由正文。冲突保留草稿。同名人物不混档；企业/自定义类型返回通用表单，不能套用人物布局。

### HEALTH-SCAN · 数据体检

状态：default, running, complete, cancelled, incomplete, provider-error, unavailable, locked, stale, notification。

验收：AC-601, AC-602, AC-603, AC-604, AC-611, AC-612, AC-631。

初始只提供一次手动扫描入口，扫描显示真实已处理量/总量，取消明确已完成和未完成；单 provider 失败不拖垮其他。通过/警告/错误/跳过/不可用/锁定/取消/未完成都以文字呈现，不计为全绿。报告含范围、数量、排除项、时间与过期提示，只显示脱敏 ID 定位，不含正文/账号名。safe 只看容器存在/版本/大小，锁定不解密。archives 重复 ID/关系缺端点和归物投影不一致保留诊断；完成或修复失败的回看经 health 来源通知返回此页。

### HEALTH-REPAIR · 有限修复

状态：default, preview, confirm, revalidating, complete, stale, partial, restore, cancelled, unsupported。

验收：AC-621, AC-622, AC-623, AC-624, AC-631。

只开放索引重建与 owner 支持的归物投影纠正：扫描→计划/影响预览→用户确认→owner 当前哈希重验→备份恢复事务→修改→逐项复查。取消不执行；旧哈希拒绝并引导重新扫描。部分失败逐项列出已提交/未提交和恢复入口，不称整批成功。坏文件、无端点关系、孤儿密文、未完成迁移备份仅定位说明，不显示自动修复按钮。原型执行为内存状态示意，不能证明真实事务正确。

## 响应式与可访问性

工作台继承 DS-004：≥960px 保留 52px 轨道与页面，600–959px 范围收为页面内可达入口/Sheet；<600px 合并导航，由页头菜单打开并在关闭后返回焦点，不将三栏强压缩。归物卡片在内容变窄时二列/单列；报告统计为两列或单列；人物身份与正文分段；日记低于 600px 转为纵向完整页，读写功能不依赖手势。

桌面命中目标至少 32px、控件默认 36px，窄屏至少 44px。原型实际使用 dialog 的模态焦点约束、Esc 关闭/返回；所有按钮有名称，输入关联 label。焦点为 3px ring、offset 1px，区域有标题。长中文/英文换行，不以横向溢出解决空间不足；长备注受控滚动而操作栏留在内容流中。验证 1440×1000、390×1000 与 200% 布局等效缩放，另查英文深色；真实触屏/IME 输入法/Obsidian 主题及多窗口保持待实施验收。原型只用 opacity 120ms，减少动效时完全停用过渡与动画；标签页不做切场动画。

正常、空、无结果、加载、错误、取消、冲突、锁定与恢复由 frontmatter 和逐页规则分别定义；未联网的纯本地 mock 不模拟远程服务离线握手，生产文件读取失败按 error 保留有效数据。没有本 change 未声明的管理员权限或 AI 任务状态。现有 safe 仅桌面支持的产品边界保持，390px 是窄容器布局检查，不等同原生移动支持。

## 基线差异与交接

无 DS 例外，overrides 为空。新增的是任务页面与状态，不提升为永久共享视觉规则。包内状态工具、语言/亮暗开关、演示说明不进入生产功能。最终候选、comparison 与 final 以及固定批准记录都在 prototypes/UI-001；浏览器检查为 evidence/browser.json，设计/技术复核分别为 evidence/report-design-review.md 与 evidence/report-technical-review.md。下游以 revision 与 confirmation.digest 绑定 design_ref，并读取 page/AC 正文；实际摘要和验证命令在本次 REPORT。

批准来源 LOG-013 的用户预先批准已由本次明确指令继续授权；LOG-022 将五组功能改为单包九页，不改变行为。confirmation.record 指定的固定快照将同一次预先授权落实到具体最终字节，不声称存在新的人工逐页复核。原 README、Ticket 状态与 G-DESIGN Gate 由 Lead 根据回报独立核验后更新，本任务不越权写入。
