// Assemble prototypes/UI-001 (final, comparison, design-system.md) and change DESIGN.md
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const REPO = '/home/wta/projects/obsidian-huhu', SP = path.dirname(new URL(import.meta.url).pathname);
const CH = 'changes/2026-11-05-frontend-uiux-redesign', C = path.join(REPO, '.agents/speculo/.speculo/specdev', CH), P = path.join(C, 'prototypes/UI-001');
const T = path.join(REPO, '.agents/speculo/workflows/specdev/common/tools/design-artifacts.mjs');
const now = new Date().toISOString();
fs.rmSync(path.join(P, 'final'), { recursive: true, force: true }); fs.rmSync(path.join(P, 'comparison'), { recursive: true, force: true });
fs.mkdirSync(path.join(P, 'final'), { recursive: true }); fs.mkdirSync(path.join(P, 'comparison/variants'), { recursive: true }); fs.mkdirSync(path.join(P, 'evidence'), { recursive: true });
execFileSync('node', [path.join(SP, 'proto/build.mjs'), path.join(P, 'final'), REPO], { stdio: 'inherit' });
const idx = fs.readFileSync(path.join(P, 'final/index.html'), 'utf8');
fs.writeFileSync(path.join(P, 'comparison/variants/huhu-paper.html'), idx.replace('href="styles.css"', 'href="../../final/styles.css"').replace('src="app.js"', 'src="../../final/app.js"').replace('<title>HUHU 工作台 · UI-001 终版原型</title>', '<title>HUHU 工作台 · 候选 huhu-paper（与终版同源）</title>'));
fs.writeFileSync(path.join(P, 'comparison/index.html'), `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UI-001 · 候选导航</title><link rel="stylesheet" href="../final/styles.css"></head>
<body style="overflow:auto"><main class="page-pad" style="max-width:760px;margin:0 auto">
<p class="eyebrow">UI-001 · 前端彻底重构</p><h1 class="reading-title" style="margin:8px 0 12px">单一终版候选</h1>
<p class="fg2">用户要求“直接给终版，不需要对比”（LOG-005），本包只有一个候选，候选数量覆盖为 1。下面的候选入口与终版共用同一份源码；推荐即终版，仍待集中确认。</p>
<div class="card card-body" style="margin-top:20px"><div class="row"><strong class="grow">huhu-paper · 暖中性纸感工作台</strong><span class="badge badge-warning">待确认</span></div>
<p class="muted" style="margin:6px 0 12px">主模板 local-first-content；主视觉来自用户 v1.2 原型；辅助：Linear（高密度列表、命令面板、详情层级）、HUHU 基线（骨架尺寸与可访问性）。迁移成本：替换全部前端组件与 CSS；领域服务不变。风险：真实 Obsidian 多窗口、DayPicker v10 集成未验证。</p>
<div class="row"><a class="btn btn-secondary" href="variants/huhu-paper.html">打开候选</a><a class="btn btn-primary" href="../final/index.html">打开终版</a></div></div>
</main></body></html>
`);
const meta = {
  schema_version: 3, artifact: 'ui-prototype', change: '2026-11-05-frontend-uiux-redesign', design_id: 'UI-001', status: 'awaiting-confirmation', project_kind: 'existing', platforms: ['desktop'],
  candidates: [{ id: 'huhu-paper', template_id: 'local-first-content', primary_reference: 'huhu-v12-prototype', auxiliaries: [{ reference_id: 'linear', dimension: '高密度列表、命令面板与详情层级' }, { reference_id: 'huhu-baseline', dimension: '工作台骨架尺寸、宿主边界与可访问性合同' }],
    rationale: 'LOG-002/LOG-007：Obsidian 内高密度个人工作台，用户选择暖中性纸感与 HUHU 自有主题；用户 v1.2 原型提供功能地图与四项交互。', structural_difference: '唯一候选：图标轨 + 二级栏 + 主区 + 右详情，全模块可操作。', task_id: 'frontend-uiux-redesign', entry: 'comparison/variants/huhu-paper.html' }],
  candidate_count_override: { count: 1, request: 'LOG.md#LOG-005：用户“直接给终版就行，不需要再给我对比了”' },
  selected_candidate: 'huhu-paper',
  sources: [
    { id: 'huhu-v12-prototype', locator: 'source/HUHU_Workbench_Prototype_v1.2.html', digest: '2a4c9b6ca525ebf69956d689217aeffc20b46836e32797612c8256af82e9c342' },
    { id: 'huhu-baseline', locator: '.agents/speculo/.speculo/specdev/design/revisions/DESIGN-0002.md', revision: 'DESIGN-0002' },
    { id: 'huhu-components', locator: 'src/ui/components', revision: '37fcede4210a19bcc2a74809e7fdd301e5717957' },
    { id: 'huhu-refactor-plan', locator: 'source/Frontend_Refactor_Plan.md', digest: '880f3be9bc7a33ee03e7bb709e5b7e1e45a5febdcfda67a9bd9c519cc382c0fe' },
    { id: 'air-datepicker', locator: 'dist/air-datepicker.js', url: 'https://github.com/t1m0n/air-datepicker/blob/f2510b92d9cff5ae53d0f0ba3d8443be2eeba544/dist/air-datepicker.js', revision: 'f2510b92d9cff5ae53d0f0ba3d8443be2eeba544', license: 'MIT' },
    { id: 'lucide', locator: 'node_modules/lucide-react/dist/esm/icons', url: 'https://github.com/lucide-icons/lucide', revision: '0.577.0', license: 'ISC' },
    { id: 'geist', locator: 'src/ui/fonts/Geist-Variable.woff2', url: 'https://github.com/vercel/geist-font', license: 'OFL-1.1' },
  ],
  prototype_files: ['final/index.html', 'final/styles.css', 'final/app.js'], browser_evidence: 'evidence/browser.json', updated_at: now,
};
const block = (f, lang) => `<!-- PROTOTYPE-FILE: final/${f} -->\n\`\`\`${lang}\n${fs.readFileSync(path.join(P, 'final', f), 'utf8').replace(/\n$/, '')}\n\`\`\`\n<!-- /PROTOTYPE-FILE -->`;
const body = fs.readFileSync(path.join(SP, 'ds-body.md'), 'utf8');
fs.writeFileSync(path.join(P, 'design-system.md'), `---\n${JSON.stringify(meta, null, 2)}\n---\n\n${body.trim()}\n\n## Prototype Sources\n\n三个源码块与 \`final/\` 逐字一致（materialize --check）。字体文件 \`final/fonts/*.woff2\` 从 \`src/ui/fonts\` 原样复制，许可见 \`final/fonts/LICENSE-Geist.txt\`。\n\n${block('index.html', 'html')}\n\n${block('styles.css', 'css')}\n\n${block('app.js', 'javascript')}\n`);
const digest = execFileSync('node', [T, '--prototype-digest', path.join(P, 'design-system.md')], { encoding: 'utf8' }).trim();
const PAGES = { home: ['default', 'editing', 'empty', 'loading'], tasks: ['default', 'board', 'calendar', 'detail', 'completed', 'pending', 'failed', 'empty', 'no-results', 'loading', 'error'], diary: ['default', 'writing', 'empty-date'], archives: ['default', 'record', 'belongings', 'person', 'studio', 'search', 'no-results', 'dirty', 'loading', 'error', 'empty'], automations: ['default', 'detail', 'detail-runs', 'run-detail', 'editing', 'toggle-pending', 'toggle-failed', 'all-runs', 'new', 'empty', 'missing', 'loading', 'error'], agent: ['default', 'split', 'blocked', 'info', 'history', 'usage', 'empty'], notifications: ['default', 'detail', 'empty', 'error'], safe: ['locked', 'error', 'default', 'detail', 'revealed', 'quick-pick', 'empty'], versioning: ['default', 'diff', 'restore-confirm', 'empty'], health: ['idle', 'scanning', 'results', 'repair-plan', 'partial', 'cancelled'], notes: ['default', 'comment-editing', 'empty'], settings: ['appearance', 'appearance-dark', 'follow-obsidian', 'general', 'icons', 'content', 'search'] };
const info = { home: ['home', '查看今天的重点并快速开始', ['UX-HOME-1', 'UX-HOME-2']], tasks: ['task', '整理并完成任务', ['UX-TASK-1', 'UX-TASK-2', 'UX-TASK-3']], diary: ['navigator/diary', '阅读与书写周期日记', ['UX-DIARY-1']], archives: ['archives', '按类型浏览和编辑记录', ['UX-ARCH-1', 'UX-ARCH-2', 'UX-ARCH-3']], automations: ['automations', '查看、启停和调试自动化', ['UX-AUTO-1', 'UX-AUTO-2', 'UX-AUTO-3']], agent: ['agent', '在终端会话中与智能体协作', ['UX-AGENT-1']], notifications: ['notifications', '处理收件箱', ['UX-NOTIFY-1']], safe: ['safe', '解锁后查看与复制凭据', ['UX-SAFE-1']], versioning: ['versioning', '查看检查点并恢复', ['UX-VER-1']], health: ['health', '只读扫描与有限修复', ['UX-HEALTH-1']], notes: ['host/notes', '在宿主笔记中查看导航、批注与版本', ['UX-NOTES-1']], settings: ['settings', '调整外观与模块设置', ['UX-SET-1', 'UX-SET-2']] };
const tokens = { theme_default: 'paper (light) / ink (dark)', accent_default: 'teal #2C6669 / #6FB4AF', accents: 'teal, indigo, pine, ochre, plum, graphite', source_modes: 'huhu (default) | obsidian', canvas: '#F2EFE8 / #171614', surface: '#FBFAF7 / #1D1C19', raised: '#FFFFFF / #25231F', sunken: '#EFEBE3 / #131210', fg: '#1D1A16 / #EDE9E1', fg_2: '#4F4A42 / #C2BBAF', fg_3: '#6B655B / #9C958A', control_line: '#8C8577 / #7A746A', status: 'success #2F6E3F, warning #8F5710, danger #A93A2A, info #335A9A (light)', font_ui: 'Geist + 系统中文', font_read: '系统衬线（Iowan/Palatino/Georgia → 宋体/Noto Serif CJK）', font_mono: 'Geist Mono + 系统等宽', type_scale: '12/18 13/20 14/22 16/24 20/28 28/36', space: '2 4 6 8 12 16 20 24 32 40 48', radius: '4 6 8 12 16 full', control: 'compact 32 / comfortable 36; lg 36/40', row: 'tree 32/36; list 44/52', hit: 'desktop 32; touch 44', rail: '52px', panel: '272px (220–480)', header: '52px', detail: '360px (max 440)', breakpoints: '960 / 600 by leaf width; detail inline when main-360 ≥ 640', z: 'sticky 10, panel 20, sheet 40, dialog 60, popover 65, toast 70, command 80', focus: '2px solid accent, offset 2px', motion: 'fast 120ms, base 180ms, cubic-bezier(.2,.8,.2,1); reduced → 0' };
const dmeta = { schema_version: 1, artifact: 'change-design', change: '2026-11-05-frontend-uiux-redesign', revision: 1, status: 'draft', scope: ['huhu.plugin', 'huhu.workbench'], baseline: { revision: 'DESIGN-0002', digest: 'ef5e5080f6c1a8f967397af72fca0050820b9ad4d9a4f57451be3a63ab55b2b1' }, prototype_ref: { id: 'UI-001', digest }, selection: { candidate_id: 'huhu-paper' }, tokens,
  pages: Object.entries(PAGES).map(([id, states]) => ({ id, route: info[id][0], task: info[id][1], states, acceptance: info[id][2] })), overrides: [], confirmation: null, updated_at: now };
fs.writeFileSync(path.join(C, 'DESIGN.md'), `---\n${JSON.stringify(dmeta, null, 2)}\n---\n\n${fs.readFileSync(path.join(SP, 'design-body.md'), 'utf8').trim()}\n`);
fs.writeFileSync(path.join(SP, 'pages.json'), JSON.stringify(PAGES));
console.log('prototype digest', digest);
