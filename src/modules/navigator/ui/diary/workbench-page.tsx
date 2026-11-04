import type { PageCreate } from '../../../../app/contracts/workbench-host';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { ReactSurface } from '../../../../ui/react/surface';
import { t } from '../../../../shared/i18n';
import { observeDiaryChanges } from '../../services/diary-observer';
import { createDiarySearch, type DiarySearch } from '../../services/diary-search';
import { createDiaryWriting, type DiaryWriting } from '../../services/diary-writing';
import { DiaryWorkspace } from './DiaryWorkspace';
import type { DiaryPagePort } from './types';

export class DiarySurface extends ReactSurface {
	private requestNavigation?: (date: string, signal?: AbortSignal) => Promise<boolean>;
	private readonly registerNavigation = (handler: (date: string, signal?: AbortSignal) => Promise<boolean>) => { this.requestNavigation = handler; return () => { if (this.requestNavigation === handler) this.requestNavigation = undefined; }; };
	private readonly search: DiarySearch;
	private readonly writing: DiaryWriting;
	constructor(context: NativeSurfaceContext, private readonly port: DiaryPagePort, private date?: string) {
		super(context);
		const subscribeFiles = (listener: () => void) => {
			const refs = (['create', 'modify', 'delete', 'rename'] as const).map(event => context.app.vault.on(event as 'modify', listener));
			return () => { for (const ref of refs) context.app.vault.offref(ref); };
		};
		this.port = { ...port, changes: listener => observeDiaryChanges(port.periodic, subscribeFiles, listener) };
		this.search = createDiarySearch(port, subscribeFiles); this.writing = createDiaryWriting(context.app, port.periodic);
	}
	override async onClose(): Promise<void> { try { await super.onClose(); } finally { this.search.dispose(); this.writing.dispose(); } }
	private readonly dateChanged = (date: string) => { this.date = date; this.context.changed?.(); };
	getDate(): string | undefined { return this.date; }
	async navigateDate(date: string, signal?: AbortSignal): Promise<boolean> {
		if (this.requestNavigation) return this.requestNavigation(date, signal);
		this.date = date; this.rerender(); return true;
	}
	getViewType(): string { return 'huhu-diary-surface'; }
	getDisplayText(): string { return t('navigator.diary.title'); }
	getIcon(): string { return 'book-open'; }
	protected renderContent() { return <DiaryWorkspace search={this.search} writing={this.writing} registerNavigation={this.registerNavigation} port={this.port} initialDate={this.date} onDateChange={this.dateChanged} />; }
}

/** Module-owned loader for the navigator/diary workbench route. */
export const createDiaryPage = (port: DiaryPagePort): PageCreate => async (context, target, state, signal) => {
	if (signal.aborted) throw new DOMException('Page creation aborted', 'AbortError');
	const initial = target.resourceId ?? state.date;
	const date = typeof initial === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(initial) ? initial : undefined;
	const surface = new DiarySurface(context, port, date);
	let currentTarget = target;
	return {
		surface, getTarget: () => ({ ...currentTarget, resourceId: surface.getDate() }),
		getState: () => surface.getDate() ? { date: surface.getDate() } : {},
		navigate: async (next, signal) => { if (signal.aborted) return; if (next.resourceId && /^\d{4}-\d{2}-\d{2}$/.test(next.resourceId) && !await surface.navigateDate(next.resourceId, signal)) return; currentTarget = next; },
		restore: async (saved) => { if (typeof saved.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.date)) await surface.navigateDate(saved.date); },
	};
};
