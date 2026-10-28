import { t } from '../../../shared/i18n';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';

export interface ContactsNavigationSurface {
	openGeneric?(path?: string): void;
	getTarget?(): WorkbenchTarget;
	controller?: {
		ensureLoaded(): Promise<void>;
		archives?: { snapshot(): Promise<import('../api').ArchiveQuerySnapshot> };
		index: {
			get(id: string): { kind: 'person' | 'company'; path: string } | undefined;
			byPath: { get(path: string): { kind: 'person' | 'company'; path: string } | undefined };
		};
	};
	changeKind(kind: 'person' | 'company'): void;
	select(path: string): void;
	/** Leave an open record form (it asks about unsaved changes). */
	leaveEditor?(): Promise<boolean>;
}

/** A record's own kind wins over the requested group. A group with no record opens that list. */
export async function navigateContacts(surface: ContactsNavigationSurface, target: WorkbenchTarget, signal: AbortSignal): Promise<void> {
	if (signal.aborted) return;
	if (surface.leaveEditor && !(await surface.leaveEditor())) return;
	if (signal.aborted) return;
	if (target.resourceId) {
		// A restored detail already owns its target. Waiting for the index here would
		// block Obsidian's layout restoration, which the index itself awaits.
		const current = surface.getTarget?.();
		if (current?.resourceId === target.resourceId && (!target.section || current.section === target.section)) return;
		await surface.controller?.ensureLoaded();
		if (signal.aborted) return;
		const record = surface.controller?.index.get(target.resourceId) ?? surface.controller?.index.byPath.get(target.resourceId);
		if (!record) {
			const snapshot = await surface.controller?.archives?.snapshot();
			if (signal.aborted) return;
			const matches = snapshot?.entities.filter(entity => (entity.id === target.resourceId || entity.path === target.resourceId) && entity.formatVersion === 2 && ['type-person', 'type-company'].includes(entity.typeId)) ?? [];
			if (matches.length === 1 && surface.openGeneric) { surface.openGeneric(matches[0]!.path); return; }
			throw new Error(t('workbench.missing'));
		}
		surface.changeKind(record.kind);
		if (signal.aborted) return;
		surface.select(record.path);
		return;
	}
	if (target.section === 'person' || target.section === 'company') surface.changeKind(target.section);
}
