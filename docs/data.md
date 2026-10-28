# 数据与恢复

Task 领域的主数据位于可见 `huhu/任务/tasks.json`：任务、系列、历史和幂等回执同一事务保存。无旧格式兼容或自动迁移，旧文件不会被自动删除。详见[任务待办](tasks.md)。

HUHU 的数据分在当前 vault 的两块根里。**`huhu/`（可见）**放你的内容和资料：日志、闪念、收件箱、待办归档、项目管理、档案、记账/习惯/番茄钟/阅读记录、RSS、默认新笔记和导出；它们是普通的库内文件，Obsidian 会索引、搜索，同步工具也照常同步。**`.huhu/`（隐藏）**放 HUHU 自己的配置和运行数据：设置、看板布局（`.huhu/dashboards/`）、自动化定义（`.huhu/automation/definitions/`）、智能体、浏览器、通知、同步、图标、批注、保险箱、缓存和恢复。HUHU 自动生成的文件夹和文件名不含空格，用 `-` 连接（例如 `2026-10-21-1654-新备忘.md`）。普通笔记、宿主自己的数据与 Git 自有元数据保留原位置。系统 CLI 账号、状态 Hook、导航器 IndexedDB 缓存和用户指定导出另有明确边界，见[库之外的数据](#库之外的数据)。插件安装目录只保留代码、清单、样式及发行许可声明，不存放用户数据。

## 库内路径规则

库内逻辑路径统一使用 `/`，相对当前打开的 vault；Windows 的 `\` 在路径入口转换，后续目录识别、索引键、事件、队列及读写均使用转换后的值。系统盘符路径和 UNC 根目录只交给桌面文件系统适配层，不写入库内路径字段。普通笔记保留宿主的文件名规则，HUHU 私有目录继续采用跨平台的严格校验；不会通过折叠 `..`、截断绝对路径或删除非法字符来放行输入。`.huhu` 内的符号链接和 Windows junction 不得将读写重定向到其他位置。

看板设置与页面状态保存完整的 `.huhu/dashboards/名称` 引用（无扩展名），读写时统一转换成 `.huhu/dashboards/名称.md`；文件名扩展名固定为 `.md`。路径缺省时使用默认看板，显式非法引用直接报错，不推测裸名称、不映射旧目录，也不清空配置或覆盖其他文件。隐藏文档接口只允许看板和自动化定义，私有配置及恢复文件不能回落为普通笔记读写。

## 数据保存在哪里

| 数据 | 位置 |
|---|---|
| 保险箱 | `.huhu/safe/vault.enc` 与 `.backup`、冲突及恢复前副本；全部记录字段加密，见[保险箱](safe.md) |
| 看板 | 你选择的看板笔记（默认 `.huhu/dashboards/dashboard.md`，多份看板都在 `.huhu/dashboards/`） |
| 快速笔记按钮 | 全局设置 `home.quickNotePresets` 保存名称、目标文件夹、模板和文件名格式，各看板共用 |
| 看板技能库 | 不单独存储：列出智能体模块发现的技能（见下面的技能副本行），分组与置顶保存在所属看板列的 `skills` 配置里 |
| 技能小组件按钮 | 全局设置的 `home.skillWidgetButtons`，保存名称、图标、技能名称、提示词模板、智能体、目标及直接发送开关，各看板共用 |
| 快捷命令小组件按钮 | 全局设置的 `home.shortcutButtons`：`id`、`label`、`icon`、`type`（`file`/`command`/`automation`/`quick`/`agent`）、`target`（`quick` 时为智能体模块终端快捷命令的 id，命令内容仍只存在智能体设置里）；`agent` 另有 `agentId` 与 `prompt`。各看板共用 |
| 资料库和文件夹的笔记模板 | 列的 `library.templatePaths` 有序列表；显式 `[]` 表示空白笔记。 |
| 表格列偏好 | 每分区的 `library.tableOrder` 和 `library.tableHidden` 列表。列标识为 `file.name`、`file.modified`，以及表示笔记属性的 `property:<字段名>`。缺席字段保留偏好，重置只删除这两个列表；卡片徽章另用 `visibleProperties`。 |
| 工作流分区 | 各看板列的 `pipeline` YAML 对象保存根目录、阶段、筛选、模板和限定范围的技能（阶段上旧的 `width` 保留但不再生效，列宽由瓦片宽度均分）。笔记保存状态、任务、`due`、`remind`；在工作流中启用提醒时，还会在 `huhuAutomation` 中保存现有格式的自动化定义及所属设备 id。不要在笔记间复制该定义的 id。 |
| 项目管理的项目笔记 | 库内可见文件夹，默认 `huhu/项目管理/`（分区设置里可改）；每个项目一篇 `type: project` 笔记，工作笔记在 `<文件夹>/<项目名>/`，归档文件夹可另设；不在 `.huhu/` 里 |
| RSS 保存的文章与导出的 OPML | 库内可见文件夹，默认 `huhu/RSS/`，文章名形如 `2026-10-20-First-article.md`（RSS 设置里的下载文件夹可改）；订阅列表、已读状态与正文缓存在 `.huhu/cache/rss/` |
| 技能副本 | 用户主目录或 vault 中各智能体的 `skills/<名称>/`，副本内有 `.huhu-skill-copy.json` 标记；不在 `.huhu/` 内 |
| 已记住的技能名称与额外目录 | `.huhu/config/devices/<device-id>.json` 的 `agent` 命名空间，字段为 `knownSkills`、`skillDirectories`；名称按智能体隔离 |
| 通用档案及其资料文件 | 可见根默认 `huhu/档案/`；实体、档案定义及修订、独立关联记录、迁移计划/原文备份/回执和附件一起保存。旧个人/企业原位适配，v2 按类型策略创建带 ID 的目录；完整布局见[档案](contacts.md) |
| 档案恢复草稿 | `.huhu/archives/drafts/<设备>/<根摘要>/`，有界的实体/关系编辑会话，不是正式档案或跨设备业务数据 |
| 独立的自动化操作 | `.huhu/automation/definitions/<名称>-<短 ID>/操作.md` |
| 习惯、记账、阅读、番茄钟 | `huhu/习惯/habits.json`、`huhu/记账/expense.json`、`huhu/阅读/reading.json`、`huhu/番茄钟/pomodoro.json`，以及同目录下的 Markdown 记录 |
| 收件箱 | 条目是 `huhu/收件箱/YYYY-MM-DD-HHmm-标题.md`，平铺，不分年月；每天的闪念是同一文件夹里的 `YYYY-MM-DD-闪念.md`，每次记录追加一行 `- HH:mm 内容`；新建的笔记和当天闪念文件首次创建时带默认属性（`状态: 在用`、空的 `tags` 列表）；文件夹由看板设置的“收件箱文件夹”决定 |
| 待办 | 默认无日期任务保存在 `huhu/待办/待办.md`；日历创建沿用所选日记或自定义落点。隐藏的 `huhu-task` 标记保存任务身份、创建设备、重复规则和独立发生项/取消记录；重复任务预览不写入文件 |
| 待办归档 | `huhu/待办/已完成.md`（看板设置“待办归档路径”）。路径必须是库里可见的：以点开头的文件夹（如 `.huhu/…`）不会被 Obsidian 索引，所以设置里会拒绝 |
| 没有指定文件夹的新笔记 | `huhu/笔记/YYYY-MM-DD-名称.md`（从「设置 → 常规 → HUHU 文件」新建，默认落在这里，或所选文件所在的文件夹） |
| 全局设置 | `.huhu/config/settings.json`，按 app、theme、home、browser、comments 等命名空间保存 |
| 天气实例 | 每份看板 `widgets` 成员的可选 `weather` 保存城市名称、经纬度和可用行政区信息。新增实例取默认地区快照；无效显式值不覆盖其他实例的地区。布局仍在同份看板的 `grid` |
| 工作台列表 | 全局设置 `home.workspaces` 的 files、names、active |
| 看板布局 | 看板 Markdown 的 frontmatter：`widgets` 是看板上的小组件（`memberId`、`provider`、`kind`、`instanceId`），`grid` 是单行 JSON `{"v":2,"lg":[…],"md":[…]}`，每项是小组件、分区或独立卡片的 `i`（标识）与 `x`、`y`、`w`、`h`（单位是格：12 列、行高固定）；`md`（6 列）只有在该宽度下排过才有，单列不保存。没有 `grid` 的旧看板（`layout`、`canvas`、`immersive`、`banner`、`banners`）打开时转换一次并移除这些键，横幅数据不再保留。卡片与分区内容在正文和 `columns` 里。 |
| 内部外观预设数据 | 全局设置仍定义 `home.appearancePresets` 与 `home.activeAppearancePresetId`；预设包含全局外观（界面主题、自定义颜色、编辑器配色、字体与排版）和看板背景/表面参数。当前界面没有保存、应用、改名或删除预设的入口，不应把内部字段当作用户功能；可用外观操作见[外观](appearance.md)。 |
| 设备设置 | `.huhu/config/devices/<device-id>.json` |
| 图标及其备份 | `.huhu/icons/`；保存图标、规则及轮换备份 |
| 笔记导航器设置 | 全局设置的 `navigator` 命名空间（显示、排序、置顶、快捷键、快捷方式、隐藏规则、文件夹笔记、按项覆盖的外观，以及日志文件夹、各周期的开关与模板、模板文件夹与引擎、文件夹模板、自定义“创建笔记”命令、库配置档和它们的当前选择）；布局方向、窗格大小、展开状态、选中项、搜索框内容、日历是否展开、最近笔记（含各配置档自己的最近列表）保存在本设备设置。日历创建的周期笔记保存在库内可见的日志目录（默认 `huhu/日志/日记/YYYY/MM/YYYY-MM-DD.md` 等固定结构，见[笔记导航器](navigator.md#固定的日志目录)），模板生成的笔记、合并结果在库里原位置，都不在 `.huhu/`；标签修改的“撤销”内容只在内存里 |
| 笔记导航器预览缓存 | 浏览器的 IndexedDB 库 `huhu-navigator-<库 id>`，保存每篇笔记的预览文字和缩略图路径。它不在库目录里，可随时用“重建缓存”丢弃，不影响笔记 |
| 高亮与批注（v3） | `.huhu/editor/comments/` 下的 `index.json`、`pending.json`、`files/<笔记路径 SHA-256 前 16 位>.json`；v2 升级备份在 `.huhu/editor/comments-backups/`，损坏副本在 `set-aside/` |
| 自动化运行、通知回执 | `.huhu/automation/<device-id>/`、`.huhu/notifications/<device-id>/` |
| 自动化待办投递快照 | 同一运行历史的 `taskDelivery` 保存 `effectKey`、计划归属日期、时区、解析后的目标快照 `target` 以及最终 `receipt`/结果。失败或中断重试复用原快照和键，新的手动执行产生新键；它不承诺跨设备同时写入的全局恰好一次 |
| 智能体派发快照 | 同一自动化 `runtime.json`，包含最终提示词、文件引用、来源、调用 ID 和交付回执 |
| 智能体标签布局与统计 | `.huhu/terminal-agent/<device-id>/workspace.json`、`workspace-stats.json` |
| 原生历史索引、标注、自动化会话 | 同目录 `index.sqlite`、`history.json`、`automation-sessions.json` |
| 快捷命令 | 本设备设置 `agent.quickCommands`；不读取旧 presets |
| 浏览器 Space 目录与操作记录 | `.huhu/browser/<device-id>/v2/records/*.sealed`，认证加密；摘要密钥在同根的 `digest-key.sealed` |
| 浏览器身份种子 | `.huhu/browser/<device-id>/v2/identities/<版本 ID>.sealed`，不可变的认证密文；只在明确保存后持久化 |
| Cookie 与网站运行数据 | `.huhu/browser/<device-id>/v2/profiles/<Space ID>/`，每个 Space 独立的 Chromium 用户目录；不等同于种子密文 |
| 浏览器文件与下载 | 同一 `v2/` 下的 `files/data/<文件 ID>/<安全文件名>`、加密的 `files/metadata.sealed` 和 `downloads/<Space ID>/`；保留上传文件名及扩展名，文件内容按敏感明文管理 |
| Cookie 导入与运行资料暂存 | `.huhu/browser/<device-id>/v2/import-staging/<UUID>/`；失败清理任务记录在 `cleanup/import-staging.json`，回收失败保留重试 |
| 浏览器运行包与连接描述符 | 同一 `v2/` 下的 `runtime/` 和 `connections/<UUID>.json`；连接文件含短期访问凭据，仅向明确授权的本地客户端交付路径 |
| 交给智能体的网页截图副本 | `.huhu/browser-materials/` 下的 `activation-<UUID>/<UUID>.png` 或 `.jpg`，由智能体模块管理，正常停用时清理 |
| 自动化预检环境 | `.huhu/automation/<device-id>/precheck-home/` |
| 恢复草稿与看板冲突副本 | `.huhu/recovery/` |
| 内容移动与引用更新账本 | `.huhu/content-moves/manifest.json` |
| 受管内容创建、重命名与回收 | `.huhu/recovery/content-creates/`、`renames/`、`trash/`，见[受管内容删除与恢复](#受管内容删除与恢复) |
| 看板定时备份 | `.huhu/recovery/dashboard/backups/`，含看板 Markdown、四类记录 JSON 及来源/完整性清单 |
| 导出为笔记的智能体对话 | `huhu/导出/智能体/` |
| 记账导出的 CSV | `huhu/导出/expense-export-<日期>.csv` |
| Git 同步的计时与暂停状态 | `.huhu/sync/<device-id>/<repository-hash>.json`，以及相邻恢复副本 |
| 终端组件 | `.huhu/helpers/<device-id>/<platform-arch>/<version>/` |
| 托管智能体账号与登录环境 | `.huhu/agents/<device-id>/accounts/<provider>/<stable-id>/` |
| 系统账号的运行目录（事件目录） | `.huhu/agents/<device-id>/system/` |

`日志`、`收件箱`、`待办`、`档案`、`个人档案`、`企业档案`、`记账`、`习惯`、`番茄钟`、`阅读` 这些 `huhu/` 下的文件夹名在所有界面语言下都是中文，`基本信息.md`、`操作.md` 等文件名也一样。没有设置文件的库从默认值开始。

## 浏览器运行资料与身份

浏览器 v2 自己拥有 Space、页面、身份、文件和运行进程；智能体标签只保存 Space/Page 引用。个人 Space 不接受 Agent Run，任务 Space 的执行凭据绑定当次运行与控制代次。关闭查看界面不等于删除 Space；停止后保留持久 Space 的页面标识，重新启动创建新的运行实例，不恢复旧执行凭据。

持久化身份、目录、操作结果和文件元数据使用认证加密，随机数据密钥由本机操作系统安全存储保护。安全存储不可用或只提供弱保护时，不写明文替代；只有用户明确同意，才允许创建临时身份与临时 Space。临时模式仍可能为 Chromium 和文件复制创建磁盘数据，正常结束时清理，崩溃残留按所有权验证后重试回收，不能把它理解为完全不落盘。

Chromium 的活动用户目录、下载内容和交付给智能体的截图没有整体加密。种子保存成功不表示整个浏览器目录已加密，也不保证网站登录有效。导入只写入全新的未发布运行资料，经暂存和最终目标各自完整读回校验后才发布；不覆盖已运行的 Space。未知或损坏的密文、缺失的既有元数据和无法确认的进程所有权会阻止写入或删除，不按空数据重建。

每个用户目录旁保存 Chromium 最后写入版本标记；新空目录可以初始化，非空但缺少标记、标记损坏或尝试降级时拒绝启动。运行包的回退不会自动回退用户目录。完整操作与限制见[浏览器](browser.md)和[浏览器运行时](browser-runtime.md)。

## 私有文件权限

桌面 POSIX 路径以 `0700` 创建目录、`0600` 创建普通文件，helper 使用 `0700`。账号及 helper 私有目录在 Windows 通过 DACL 限定为当前用户与 SYSTEM；权限失败阻止交付进程。交付前检查当前子树并拒绝链接，迁移保留恢复来源。访问控制不等于加密，也不会阻止你同步文件。普通笔记保持原权限；移动端和非文件系统适配器的具体权限行为据实说明，不冒称已实测。

## 版本恢复检查点

版本管理将恢复前的编辑器内容、磁盘原文、目标内容与阶段记录保存在 `.huhu/recovery/versioning/<device-id>/`，自动同步暂停保存在设备同步状态中。检查点按内容散列校验，不进入 Git；准备预览或取消不产生恢复写入。中断后保留记录，重启只核对现状，不自动回放正文。当前不自动清理检查点，详见[恢复与撤销](sync.md#恢复检查点与撤销)。

## 库之外的数据

默认的“系统账号”不重定向 HOME、提供方数据根或 XDG/Windows 数据目录，CLI 沿用本机已有登录。HUHU 的运行事件保存在库内；开启状态 Hook 或自动化运行所需 Hook 时，会在 `~/.huhu/agent-hooks/` 保存共用脚本与备份，并修改真实提供方配置中的约定条目或扩展文件。它们不会随关库自动移除，具体范围和移除操作见[智能体工作台](agent-workbench.md#状态-hook)。

“托管账号”使用库内的 HOME、提供方配置目录、XDG/Windows 数据目录和临时目录，状态 Hook 与事件文件同属账号。浏览器运行资料与文件进入库内的设备 `v2/` 根，交给智能体的截图副本进入 `.huhu/browser-materials/`。库外 CLI homes 不自动搬迁；托管账号不回退到系统账号，也不复制系统登录。

浏览器使用宿主 Electron 的系统安全存储保护数据密钥。原生进程回收另有一把本机认证密钥，位于 Obsidian 的 `userData` 目录下 `huhu/browser-runtime-ownership/<运行根规范路径的 SHA-256>.key`，用于核验进程所有权回执；它不在 vault 内，也不用于把整个 Chromium 用户目录加密。用户明确导出的浏览器文件可写到库外选择的位置。

导航器的可重建预览缓存使用宿主 IndexedDB，不在库目录内；保险箱加密导出写入你通过原生选择器指定的路径，可以位于库外。普通笔记虽保留原位，导航器的模板、周期笔记、合并与标签操作仍会按你的操作创建或修改它们。“保留原位”不表示这些笔记只读。

设备映射位于 `.huhu/config/identity.json`，利用宿主只读身份识别当前设备。复制库需要识别或明确选择设备归属，不会自动接管另一设备的运行队列。普通笔记、宿主配置、系统 IPC 对象与 Git 自有元数据不是 HUHU 业务数据。

## 多设备与同步

`.huhu/` 以点开头，**Obsidian Sync 不同步这类隐藏目录**；宿主配置目录是官方列出的例外，`.huhu/` 不属于它（见 [Obsidian 官方说明](https://obsidian.md/help/sync/settings) 的 Hidden files and folders）。所以 `.huhu/dashboards/` 中的看板和 `.huhu/automation/definitions/` 中的自动化操作，以及 `.huhu/` 下的其他 HUHU 专用数据（含加密的保险箱）不会经 Obsidian Sync 到达另一台设备；库内可见的 `huhu/` 下的日志、闪念、收件箱、档案、记账等记录和其他笔记不受这一排除规则影响。需要同步 HUHU 专用数据时，请使用并核对能同步隐藏目录的工具：Git、iCloud、Syncthing 等。桌面端可以使用 HUHU 的 [Git 同步](sync.md)，其私有数据排除范围见下文。

- `.huhu/config/settings.json` 由库的所有设备共用；`.huhu/config/devices/<device-id>.json` 和各模块的 `<device-id>` 目录只属于一台设备，按设备隔离。用 HUHU 的 Git 同步时，这些设备配置、身份映射、同步计时和通知状态不跟踪；`.huhu/browser/`、`.huhu/browser-materials/`、智能体账号与运行目录、缓存、恢复副本和锁文件等私有数据默认不提交（见[Git 同步](sync.md#默认不提交的-huhu-私有数据)）。
- 自动化只在它所属的设备上运行，见[自动化与通知](automation.md#设备归属)。
- 使用共享 `JsonStore` 的设置和 JSON 数据在写入前做三方合并，并保留上一份有效内容为 `.backup`。保险箱是独立密文协议，不执行自动合并；图标、批注、内容移动和看板也有各自的恢复规则。同步工具产生的冲突副本仍需手动处理。

## 日常备份

1. 在编辑器和面板中完成保存，确认没有“未保存”或“存在冲突”的状态。
2. 备份你的 Markdown、相关附件和整个 `.huhu/` 目录。备份工具需要包含隐藏目录。
3. 恢复前，先关闭相关模块，保留当前出问题的文件副本，再恢复确认有效的内容和设置。
4. 重新开启模块后检查内容和设备设置。不要为了让功能恢复运行而重放被中断的外部操作。

缓存和索引可以重建。实体正文、业务记录、评论和通知回执不能当作缓存清理。浏览器用户目录、身份密文和文件元数据，以及托管 CLI 账号都应按敏感数据备份；不要只恢复文件内容而丢弃相应元数据。浏览器密钥受本机系统保护，复制 vault 不保证能在另一设备解密或继续登录。系统账号沿用库外位置，网站也可能要求重新认证。

## 保存失败与冲突

读取失败、已损坏的文件或无法解析的受管区域会阻止写入。使用共享 `JsonStore` 的文件会保留上一份有效快照为 `.backup`；主文件损坏而备份有效时，加载备份并保留损坏主文件，没有有效备份则报告错误，不覆盖原文件。这不适用于所有持久化格式：图标使用自己的[备份轮换](icons.md#数据备份与关闭模块)，保险箱需要[显式认证恢复](safe.md)，不会自动回退备份。磁盘错误不会被显示为保存成功。

出现错误时，先保留当前输入，再检查权限、同步冲突和文件内容。支持重试的面板提供错误详情和重试；恢复草稿位于 `.huhu/recovery/drafts/`。档案冲突时保留编辑会话，其专用恢复草稿在 `.huhu/archives/drafts/`，与通用恢复草稿分开；草稿 JSON 不是可直接导入的 Markdown。

采用三方合并的存储可以合并不同字段或记录的修改，同字段冲突仍需你决定；保险箱会保全冲突密文并停止覆盖。原始笔记有未保存编辑时，请先保存编辑器。受管文件删除使用下面的恢复区机制。

## 受管内容删除与恢复

`.huhu/dashboards/` 与 `.huhu/automation/definitions/` 内的受管文件或目录删除前会检查范围、路径及未保存编辑，再移动到 `.huhu/recovery/trash/<随机 ID>/`。单文件保留在该批次目录内，目录保留其相对 `.huhu/` 的结构；这与 Obsidian 回收站分开。普通笔记及手工删除的可见档案遵循 Obsidian 的删除设置；通用档案界面当前只归档、不物理删除实体目录，详见[档案](contacts.md#删除与恢复)。保险箱记录使用自己的加密回收站，见[保险箱](safe.md)。

当前没有统一的受管回收站恢复界面。需要手工恢复时先停止相关编辑并备份当前内容，核对原路径和目标是否已存在，再把保存的文件或完整目录放回上述受管根内的原位置；不要覆盖同名新内容。`.huhu/content-moves/manifest.json` 及 `recovery/renames/` 是移动/引用更新的恢复材料，不应当作可随意清理的缓存。

## 看板冲突

外部编辑与看板保存发生冲突时，HUHU 暂停写入原看板，并把恢复副本保存到 `.huhu/recovery/dashboard/conflicts/<id>.json`。提示中显示实际的文件路径。“副本已保存”不表示修改已写入原文；继续编辑会更新同一冲突的最新修订。

看板上的状态区提供“复制当前草稿”“复制副本路径”“重试保存”和“重新载入原文”。副本保存失败时页面保持打开：先复制草稿，修复磁盘或权限后再重试。重新载入需要确认，并保留恢复副本。副本是包含原始、当前和外部文本的 JSON，不能当作看板 Markdown 去覆盖看板。强制结束进程或磁盘不可写时，不能保证尚未落盘的输入被保存。

## 格式与语言

图片裁剪位置保存在看板 Markdown 中：卡片的 `coverPos` 行保存封面位置，格式是 `"x,y"` 字符串。坐标是 0 到 100 的整数百分比，未设置时为 `50,50`。只读时仅对显示归一化，越界值限制在范围内，无效值按居中显示，不自动改写原文。编辑或重置某张图片只改它的位置，图片文件本身不变。

语言设置只影响界面，从不改变文件路径、身份标识、笔记正文或操作参数。

旧看板的备忘与网页卡迁移到收件箱时，使用稳定迁移标记及目标文件名，先写入并读回核对，再移除看板中的旧卡。重试复用同一目标，已被用户改写的目标不会覆盖。快捷操作保存于各看板的 `quickActions`，旧全局快捷命令和快速笔记配置只在该看板首次合并时复制。

天气缓存位于 `.huhu/cache/weather/`，仅缓存所选坐标的公开预报，不属于可同步的业务内容。工作空间用量索引使用 `workspace-index.sqlite`，不与账号历史的 `index.sqlite` 混用。

## 新身份与版本边界

HUHU 从 0.0.1 及新的插件身份开始，仅使用 huhu/ 和 .huhu/ 目录，不自动读取、导入或改写其他插件身份的数据。已有笔记保留原位，显式选择的内容目录仍按当前路径规则处理。
