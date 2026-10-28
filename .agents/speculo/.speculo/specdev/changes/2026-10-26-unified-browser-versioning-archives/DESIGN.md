---
{
  "schema_version": 1,
  "artifact": "change-design",
  "change": "2026-10-26-unified-browser-versioning-archives",
  "revision": 2,
  "status": "approved",
  "scope": [
    "huhu.workbench"
  ],
  "baseline": {
    "revision": "DESIGN-0001",
    "digest": "ebaca5f2f15fe081bf393c892f8b6583d4f2c6ad12cd92cb55068005fe83a331"
  },
  "prototype_ref": {
    "id": "UI-001",
    "digest": "5f49a4740daf0550130bc325526fe2f93809db9e48829ae532dc2e4f9548f437"
  },
  "selection": {
    "candidate_id": "candidate-a"
  },
  "tokens": {
    "rail_width": "52px",
    "sidebar_width": "280px",
    "header_height": "44px",
    "header_narrow": "56px",
    "control_desktop": "32px",
    "control_touch": "44px",
    "spacing_unit": "4px",
    "radius_control": "6px",
    "radius_dialog": "10px",
    "font_ui": "Geist, system Chinese sans-serif",
    "font_size": "14px",
    "line_height": "1.55",
    "title_size": "23px",
    "focus_ring": "3px",
    "background": "var(--background-primary)",
    "foreground": "var(--text-normal)",
    "muted": "var(--text-muted)",
    "border": "var(--background-modifier-border)",
    "primary": "var(--interactive-accent)",
    "primary_foreground": "var(--text-on-accent)"
  },
  "pages": [
    {
      "id": "PAGE-001",
      "route": "workbench/archives",
      "task": "维护项目资料与关系，保留草稿",
      "states": [
        "default",
        "empty",
        "loading",
        "error",
        "permission",
        "conflict",
        "noresults"
      ],
      "acceptance": [
        "AC-018",
        "AC-019",
        "AC-020",
        "AC-021",
        "AC-028",
        "AC-033"
      ]
    },
    {
      "id": "PAGE-002",
      "route": "workbench/archives/types",
      "task": "定义字段与表单，预检与继续旧档案迁移",
      "states": [
        "default",
        "empty",
        "loading",
        "error",
        "permission",
        "conflict",
        "recovery"
      ],
      "acceptance": [
        "AC-018",
        "AC-022",
        "AC-023",
        "AC-024",
        "AC-025",
        "AC-033"
      ]
    },
    {
      "id": "PAGE-003",
      "route": "workbench/versioning/review",
      "task": "比较历史、查看恢复预检并配置自动采集",
      "states": [
        "default",
        "empty",
        "loading",
        "error",
        "permission",
        "conflict",
        "recovery",
        "quota"
      ],
      "acceptance": [
        "AC-013",
        "AC-014",
        "AC-015",
        "AC-016",
        "AC-017",
        "AC-026",
        "AC-034"
      ]
    },
    {
      "id": "PAGE-004",
      "route": "workbench/browser",
      "task": "查看独立空间、接管、导入身份与核实未知操作",
      "states": [
        "default",
        "empty",
        "loading",
        "error",
        "permission",
        "recovery",
        "unknown",
        "unsupported"
      ],
      "acceptance": [
        "AC-003",
        "AC-004",
        "AC-006",
        "AC-007",
        "AC-008",
        "AC-009",
        "AC-011",
        "AC-012"
      ]
    },
    {
      "id": "PAGE-005",
      "route": "workbench/archives/type",
      "task": "从类型树查看实例列表或卡片，按类型配置显示字段",
      "states": [
        "default",
        "empty",
        "loading",
        "error",
        "permission",
        "noresults"
      ],
      "acceptance": [
        "AC-018",
        "AC-031",
        "AC-035",
        "AC-036"
      ]
    }
  ],
  "overrides": [],
  "confirmation": {
    "by": "user",
    "at": "2026-10-26T10:20:49.599Z",
    "record": "prototypes/UI-001/approval-sealed.md",
    "record_digest": "54b933fb590bf845f02a446407246d6752d44a0d80442cace3140fc819c1c68d",
    "digest": "f04a5aabaa7a57dbdaa17cb89ae611d40a7c32fe948317ac641818bd38224b9c"
  },
  "updated_at": "2026-10-26T10:35:54.618Z"
}
---



# 浏览器、版本历史与通用档案设计合同

## Scope and Baseline

本 change 的核心任务是维护一份可追溯的项目资料：新建与编辑第三类档案、建立关系、查看调研空间、比较笔记历史并处理安全恢复。页面以操作为主，正文与 diff 兼顾阅读。用户已明确接受的产品边界来自 [Spec](spec.md) 和 [ADR-001–006](ADR.md)，本文只决定呈现与交互。

继承正式 DESIGN-0001，DS-001–006 全部适用。工作台仍由图标轨、上下文侧栏、主区组成；宿主状态栏由 Obsidian 拥有，不新建底部状态栏，不新增宿主 View。明暗主题取宿主语义变量。独立 HTML 的回退色只服务预览。

本包覆盖五个主要页面及关键对话框，不等于三个 Issue 全部 UI 或业务完成。精确按块恢复、复杂定义分叉合并编辑器、可视关系图、Lookup/Rollup 配置、大批量导入、完整元素材料检查器等扩展表面尚未设计批准；仍保留在 Spec，后续应创建补充 UI 包并受同一 DESIGN 管理。此限制不能通过当前包批准自动消除。

## Selected Direction

用户已在 [SRC-007](sources/SRC-007.md) 指定档案导航方向：继承现有文件资源管理器式类型树，类型下列实例，点类型打开全类型列表/卡片，点实例才打开详情。此方向已明确，覆盖上一版的平铺侧栏和默认详情首屏，不再重新比较导航风格。当前 final 使用 A 的详情组织，但从类型总览开始；三个候选入口仅保留详情组织参考，并共同遵守新类型树，不能视为互斥导航方案。来源与字节摘要在 [UI-001 包](prototypes/UI-001/design-system.md)。

主视觉继承 HUHU，功能结构分别借鉴本地设计库 dense-ide、enterprise-data、local-first-content。模板只提供资源/编辑区、表格/详情、正文/目录三种结构，不采用其品牌色或全局状态栏；现有项目源码与永久基线拥有最终优先级。详细来源 locator 在包 sources；未引入未核实外部产品特性。

## Tokens and Components

frontmatter 是当前解析值。基本间距以 4px 递增，字段间距 20px，区块 28px，主区桌面内边距 32px、窄屏 16px。H1 23px、正文 14px/1.55、次级 12–13px。颜色只使用宿主背景、文本、边框、强调与成功/警告/错误语义，状态同时显示文字。预览提供高对比浅深回退值，不能写成生产固定主题。

实施复用 Button、Input、Select、Tabs、Dialog/AlertDialog、Sheet 和现有 DiffSurface，保留所属窗口的 Portal 和焦点管理。HTML 的原生 dialog 与表单只是离线投影；不另造生产组件库。无图片与远程字体依赖。无切场动画，reduced motion 下关闭所有动画与过渡。

## Pages and Interaction

### PAGE-001：档案资料、关系与引用

- 从 PAGE-005 的列表/卡片或类型树实例节点进入详情，树选中实例；返回当前类型总览保留搜索、筛选、排序、列表/卡片偏好。对象侧栏与标题明确当前类型和档案。资料/关系/正文/相关任务按用户任务分区；表单下拉切换项目概览和交付核对，共享字段值，不清空隐藏值。草稿保存与标记完成分开，完成要求校验必填。
- 新建先选类型/创建模板再进入草稿；示例使用已选项目类型。关系对话框选择关系类型、目标和生效时间，两端展示同一关系。相关任务显式为首页引用，不创建第二真源。
- 输入后切换页内区域保留草稿。实际实施切换到另一实体需保存/留存/放弃明确选择，不能将本示例单档案内存状态作为生产多实体草稿实现。
- 原生未保存内容、多叶分歧或新编辑使预检过期：持续拒绝写入并保留表单草稿，说明受影响笔记与重新检查入口；不自动保存原生 buffer。读失败保留旧有效内容，重试仅重新读取；只读仍可浏览，写动作解释阻止原因。
- 搜索无结果给清除入口；空数据给首条创建路径；读取中可取消，取消后保留原数据。PAGE-001 映射 AC-018–021/028/033，跨页布局见 AC-031。

### PAGE-005：档案类型树与实例总览

- 左侧仅采用“档案类型 → 档案实例”两层资源树，不把最近实例、预设类别和管理入口混成同级平铺菜单。个人、企业与新增类型使用同一种目录规则，类型显示实例数量；实例按已有名称排序习惯组织。类型较多时侧栏独立滚动；实施复用既有虚拟树机制，不以本包少量 DOM 夹具证明大规模性能。
- 单击类型名称选中并展开该类型，右侧打开该类型的全部实例总览；再次点名称不折叠。只点展开箭头折叠/展开，不改变右侧选择。单击实例进入该实例详情。空类型仍在树中并可打开总览和新建。
- 类型总览提供列表/卡片切换、当前类型搜索、记录条件筛选、按名称/创建时间/更新时间排序和新建。列表和卡片展示相同实例集合和字段投影；新建实例出现在所属类型下，新增类型直接成为新树节点。类型身份使用稳定 ID，不受名称或路径变化影响。
- 类型设置中为字段提供“在列表／卡片中显示”勾选项；按稳定 fieldId 引用字段，作为该类型默认展示配置。它与表单字段可见性、搜索/记录筛选条件分别表达，不复制字段值。未勾选只隐藏摘要，不删除已有值，不自动取消表单字段。
- 所有类型都有创建时间与更新时间两个公共系统字段，默认加入列表和卡片显示。显示勾选可调整，系统元资料本身不作为普通可删用户字段；原型日期为固定示例，不伪造旧数据创建时间。旧格式缺少可信创建时间时展示“未知”，不能把本次加载时间填成创建时间；具体存储与兼容补齐由既有 schema/codec 合同约束。
- 窄屏通过合并导航 Sheet 访问同一类型树，选类型/实例后关闭 Sheet 并聚焦主区；类型多时可滚动与搜索。树支持方向键、Home/End、Enter/Space，焦点和选中状态分开。宽表格允许命名的局部横向滚动，卡片单列重排，两个时间字段不因窄屏静默消失。
- 来源：用户 SRC-007；`src/modules/archives/services/workbench.ts` 的 archiveTreeNodes/archiveRowTarget；`archives-panel.dom.test.tsx` 的类型/实例点击、折叠、列表返回与大树窗口测试；`surface.tsx` 的列表/卡片切换。与当前固定两类型相比，本次新要求是动态类型目录和按类型字段投影。映射 AC-035/036，复用 AC-018/031。

### PAGE-002：类型、表单与迁移

- 普通用户可新建第三类档案，字段标签编辑与稳定身份分离；同类型两套表单共享字段。发布前展示影响，已有档案不自动升级。
- 检测定义分叉时阻止相关升级/新建，保留两分支，不能以时间覆盖；本包只演示阻止反馈，完整分叉解决编辑器另行设计。
- 迁移分预检、关系核验、切换回执；预检可退出且不写。中断展示已完成数量、仍有效的旧资料及下一核验动作，恢复不重复已完成对象。前置漂移与原生草稿冲突仍拒绝。
- 空/加载/读取错误/只读状态保留原有效资料与明确返回/重试入口。映射 AC-018/022–025/033。

### PAGE-003：历史比较、恢复与采集设置

- Git 更改/历史/比较入口沿用，笔记历史区分 Git、本地历史和当前未保存 buffer；A 为选中历史，B 标明捕获时刻，只有显式刷新改变。原笔记留在原编辑器，中央提供左右/上下/行内布局。
- 恢复先展示目标与检查点→重校验→写入核验→回执顺序。取消不写；检查点失败或状态漂移拒绝覆盖，保留比较。成功有回执、撤销入口及持续同步暂停提示，用户显式确认才恢复同步。
- 档案历史恢复由档案预检；未知、不支持或不安全时拒绝覆盖，可继续只读比较。原型拒绝实例不代表所有档案永远不可恢复。
- 设置主动开启自动历史；默认 5 分钟、30 天、每库每设备 1 GiB 可配置。切换笔记/重要操作同样采样、内容去重。保护未闭合恢复和承诺可撤销对象；配额不足持续暂停新采集。关闭采集不豁免强制检查点。
- 本包显示恢复中断核验反馈；具体生产恢复需基于真实回执，不能按页面模拟直接视为成功。映射 AC-013–017/026/034；冲突另映射 AC-033。

### PAGE-004：空间查看、控制与身份

- 浏览器独立工作台入口；侧栏分 task/personal，身份和文件入口独立。空间标题、页面与控制者始终可见；personal 不呈现 Agent 运行/交回入口。
- 智能体控制时人工只读。接管显示等待撤销确认，收到 native ACK 后才进入人工控制；旧 Agent 读写都停止。交回要求明确动作，恢复空间不自动交回控制、不重放旧操作。
- 未知网站结果持续保留操作标识与核实入口，不提供无条件重试提交。只读重载可以重试；部分页面恢复失败保留已有 profile 和有效页，不当作新建垃圾删除。
- 身份与 Cookie：来源授权→临时验证→目标完整读回→发布；取消/失败不报成功。localStorage/IndexedDB 明确尚未支持，拒绝后不跳过报成功。凭据不可用拒绝明文降级。
- 材料加入指定会话未发送输入区，不自动触发智能体。文件授权范围可查看。平台不支持时显示具体边界；四组目标平台由 ADR-004 规定，原型不将目标冒充已支持。
- 映射 AC-003/004/006–009/011/012。完整 frame coverage、背压与 native 输入属于实现证据，不由静态网页证明。

## Responsive and Accessibility

- ≥960px：52px 轨道 + 280px 侧栏 + 主区；600–959px：保留轨道，侧栏改为导航浮层；<600px：合并导航 Sheet。窄屏页头为 56px，以容纳 44px 触摸按钮；不改变桌面标准 44px。表单收为单列，diff 默认上下，详情信息收回内容与菜单。B 的数据表允许明确局部横向滚动，不允许整页横向溢出。
- Sheet/Dialog 使用真实模态语义，焦点进入、约束、Esc 关闭且返回触发器；路由转移聚焦主区并播报。按钮与输入都有名称，focus-visible 为 3px；F6 在可见轨道、侧栏与主区循环。无隐藏区域焦点。
- 触摸目标至少 44px；桌面至少 32px。长中文可换行，标题/面包屑截断不遮住动作，200% 缩放仍可访问主要操作。错误使用 role=alert，读取和导航状态使用 polite。
- 浅深主题文字对比、390/1440 视口、键盘、模态焦点、长文字、缩放及 reduced motion 都需真实浏览器操作并保存截图。Chrome 模拟触摸只证明模拟路径，生产 Obsidian/社区主题仍待实施阶段验收。

## Baseline Overrides

None。桌面基线不变，窄屏 56px 页头是为触摸目标保留空间的局部自绘页头。原型右下角“原型演示”是评审工具，不进入产品。

## Confirmation and Handoff

用户已确认修订 2 的完整原型。批准状态与固定确认快照以 frontmatter confirmation 为权威，绑定 DESIGN、UI-001 整包及 DESIGN-0001 的规范摘要。类型树、类型总览、显示字段及本文件五页范围保持确认内容；已有基线不在本轮自动提升。

[原型源码与来源](prototypes/UI-001/design-system.md) · [比较入口](prototypes/UI-001/comparison/index.html) · [推荐原型](prototypes/UI-001/final/index.html) · [浏览器证据](prototypes/UI-001/evidence/browser.json)。

接续：P 封板后，S 将已批准 PAGE/AC 绑定写入 Spec，T 拆票并保留上文扩展 UI 缺口。不能把此包覆盖的主路径等同所有 36 项 AC 已实现或整份 Spec 自动 Ready。可复用规则待实现后由 A 评估，P 不写永久设计。
