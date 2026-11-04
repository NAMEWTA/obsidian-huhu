import { serviceKey } from '../../../app/contracts/module';
import type { HealthCheck, HealthIssue, HealthIssueCode, HealthProvider } from '../../health/api';
import { BELONGING_TYPE_ID, type ArchivesCatalog, type ArchivesQuery, type ArchiveDiagnostic } from '../api';
import { parseBelonging } from '../core/belongings/lifecycle';
export const ARCHIVES_HEALTH = serviceKey<HealthCheck>('archives', 'health-archives');
export const BELONGINGS_HEALTH = serviceKey<HealthCheck>('archives', 'health-belongings');
export const ARCHIVES_HEALTH_PROVIDERS: readonly HealthProvider[] = [
	{ id: 'archives.integrity', scope: 'archives', service: ARCHIVES_HEALTH },
	{ id: 'archives.belongings', scope: 'belongings', service: BELONGINGS_HEALTH },
];
const diagnosticCode = (code: ArchiveDiagnostic['code']): HealthIssueCode => {
	if (code === 'duplicate-id') return 'duplicate-id';
	if (code === 'missing-endpoint' || code === 'reference-conflict') return 'dangling-reference';
	if (code === 'schema-fork' || code === 'schema-parent-missing') return 'revision-conflict';
	if (code === 'future-format') return 'unsupported-version';
	if (code === 'missing-definition' || code === 'missing-file') return 'missing';
	return 'unparseable';
};
type Location = { path: string; id?: string; expectedHash?: string; generation?: number };
export function createArchivesHealth(source: { catalog: ArchivesCatalog; query: ArchivesQuery; available(): boolean; generation?(): number }) {
	const archivesReferences = new Map<string, Location>(), belongingsReferences = new Map<string, Location>();
	const issue = (references: Map<string, Location>, code: HealthIssueCode, location: Location): HealthIssue => {
		const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
		references.set(token, { ...location });
		return { code, severity: 'error', count: 1, reference: token };
	};
	const permission: HealthCheck['permission'] = async signal => { signal.throwIfAborted(); return source.available() ? 'allowed' : 'unavailable'; };
	const archives: HealthCheck = { permission, async *scan(context) {
		archivesReferences.clear();
		context.signal.throwIfAborted();
		if (!source.available()) { yield { checked: 0, status: 'unavailable' }; return; }
		const generation = source.generation?.();
		const snapshot = source.catalog.snapshot(), rows = snapshot.diagnostics;
		if (!snapshot.isComplete && !rows.length) { yield { checked: 0, status: 'incomplete' }; return; }
		for (let offset = 0; offset < rows.length;) {
			context.signal.throwIfAborted();
			if (!source.available()) { yield { checked: 0, status: 'unavailable' }; return; }
			const size = Math.min(context.batchSize, context.remainingItems, rows.length - offset);
			if (size <= 0) return;
			const issues = rows.slice(offset, offset + size).map(row => issue(archivesReferences, diagnosticCode(row.code), { path: row.path, id: row.id, generation }));
			offset += size;
			yield { checked: size, total: rows.length, issues };
		}
	} };
	const belongings: HealthCheck = { permission, async *scan(context) {
		belongingsReferences.clear();
		let incomplete = false;
		for (let offset = 0;;) {
			context.signal.throwIfAborted();
			if (!source.available()) { yield { checked: 0, status: 'unavailable' }; return; }
			const size = Math.min(context.batchSize, context.remainingItems);
			if (size <= 0) return;
			const page = await source.query.entities({ typeId: BELONGING_TYPE_ID, states: ['active', 'draft', 'archived'], offset, limit: size });
			incomplete ||= !page.isComplete;
			context.signal.throwIfAborted();
			if (!source.available()) { yield { checked: 0, status: 'unavailable' }; return; }
			const issues: HealthIssue[] = [];
			for (const entity of page.items) {
				try { parseBelonging(entity); }
				catch { issues.push(issue(belongingsReferences, 'projection-mismatch', { path: entity.path, id: entity.id, expectedHash: entity.contentHash })); }
			}
			offset += page.items.length;
			yield { checked: page.items.length, total: Math.max(page.total, offset), issues };
			if (offset >= page.total || !page.items.length) {
				if (incomplete) yield { checked: 0, status: 'incomplete' };
				return;
			}
		}
	} };
	return { archives, belongings, resolve: (reference: string): Location | undefined => {
		const location = archivesReferences.get(reference) ?? belongingsReferences.get(reference);
		return location ? { ...location } : undefined;
	}, dispose: () => { archivesReferences.clear(); belongingsReferences.clear(); } };
}
