# skills-manager 改编范围

固定参考 [xingkongliang/skills-manager](https://github.com/xingkongliang/skills-manager) `7f92c21882456f6b801884818dd898d19bc20ff9`，MIT，Copyright (c) 2026 Tianliang Zhang。许可证原文见 [NOTICE](../../NOTICE)。

只取“发现、展示、按智能体启用/停用”，不含市场、Git 安装、更新检查、分组和备份。下表 HUHU 路径相对 `src/modules/agent/`，上游路径相对仓库根。

| 上游 | HUHU | 改编内容 |
|---|---|---|
| `src-tauri/src/core/tool_adapters.rs` | `platform/desktop/skills/roots.ts` | 各工具全局与项目级 skills 目录约定；按 HUHU 已适配的智能体及其账号目录重写 |
| `src-tauri/src/core/skill_metadata.rs` | `core/skills/registry.ts`（`readSkillMeta`） | 从 `SKILL.md` frontmatter 读取名称与描述；沿用 HUHU 现有名称校验 |
| `src-tauri/src/core/content_hash.rs` | `platform/desktop/skills/skill-fs.ts`（`hashSkillDir`） | 目录内容哈希与忽略表；另忽略符号链接、`node_modules` 和标记文件 |
| `src-tauri/src/core/sync_engine.rs` | `platform/desktop/skills/skill-fs.ts`、`services/skill-manager.ts` | 启用即复制到工具目录、过期判断；HUHU 增加副本标记、先暂存再改名、不覆盖已有目录、仅删除带标记的副本 |
| `src/views/MySkills.tsx`、`src/components/SyncDots.tsx` | `ui/settings/SkillsSection.tsx` | 技能卡片、右侧智能体图标按钮、“更新”按钮；替换为 HUHU 的组件库与 `t()` 文案 |

未引入上游的文件监听、Tauri 命令、中央技能库和数据库。
