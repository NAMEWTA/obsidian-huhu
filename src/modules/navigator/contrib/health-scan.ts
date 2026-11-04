import { identifyPeriodicNote, PERIOD_FOLDERS, PERIODS, type WeekStart } from '../../../shared/periodic-paths';
import type { HealthCheck, HealthIssue, HealthIssueCode } from '../../health/api';
import type { NavigatorPeriodic } from '../api';
import type { App } from 'obsidian';
import { coreTemplatesFolder, resolveTemplateFile } from '../platform/templates';
export interface PeriodicHealthSource { available(): boolean; root(): string; weekStart(): WeekStart; paths(): readonly string[]; templates(): readonly string[]; exists(path: string): Promise<boolean> }
export interface PeriodicHealthOwner {
	available(): boolean;
	periodic: Pick<NavigatorPeriodic, 'root' | 'weekStart' | 'template'>;
	app: App;
	settings: { get(): { templateFolder: string; folderTemplates: readonly { template: string }[] } };
}
export function createPeriodicHealthScan(input: PeriodicHealthSource | PeriodicHealthOwner, references = new Map<string, string>()): HealthCheck & { resolve(reference: string): string | undefined; dispose(): void } {
	const source: PeriodicHealthSource = 'periodic' in input ? {
		available: () => input.available(), root: () => input.periodic.root(), weekStart: () => input.periodic.weekStart(),
		paths: () => input.app.vault.getMarkdownFiles().filter(file => file.path.startsWith(input.periodic.root() + '/')).map(file => file.path),
		templates: () => [...PERIODS.map(period => input.periodic.template(period) ?? ''), ...input.settings.get().folderTemplates.map(rule => rule.template)],
		exists: async path => !!resolveTemplateFile(input.app, [input.settings.get().templateFolder, coreTemplatesFolder(input.app)], path),
	} : input;
	const issue = (code: HealthIssueCode, path: string): HealthIssue => {
		const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
		references.set(token, path);
		return { code, severity: 'warning', count: 1, reference: token };
	};
	return {
		permission: async signal => { signal.throwIfAborted(); return source.available() ? 'allowed' : 'unavailable'; },
		async *scan(context) {
			references.clear();
			context.signal.throwIfAborted();
			if (!source.available()) { yield { checked: 0, status: 'unavailable' }; return; }
			const root = source.root(), weekStart = source.weekStart();
			const rows = [...source.paths().map(path => ({ path, template: false })), ...[...new Set(source.templates())].filter(Boolean).map(path => ({ path, template: true }))];
			for (let offset = 0; offset < rows.length;) {
				context.signal.throwIfAborted();
				if (!source.available() || root !== source.root() || weekStart !== source.weekStart()) { yield { checked: 0, status: 'unavailable' }; return; }
				const size = Math.min(context.batchSize, context.remainingItems, rows.length - offset);
				if (size <= 0) return;
				const issues: HealthIssue[] = [];
				let excluded = 0;
				for (const row of rows.slice(offset, offset + size)) {
					context.signal.throwIfAborted();
					if (row.template) {
						if (!(await source.exists(row.path))) issues.push(issue('dangling-reference', row.path));
						context.signal.throwIfAborted();
					} else if (!Object.values(PERIOD_FOLDERS).some(folder => row.path.startsWith(`${root}/${folder}/`))) excluded++;
					else if (!identifyPeriodicNote(root, row.path, weekStart)) issues.push(issue('unparseable', row.path));
				}
				offset += size;
				yield { checked: size, excluded, total: rows.length, issues };
			}
		},
		resolve: reference => references.get(reference), dispose: () => references.clear(),
	};
}
