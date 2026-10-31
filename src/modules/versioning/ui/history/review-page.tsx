import type { PageCreate } from '../../../../app/contracts/workbench-host';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { ReactSurface } from '../../../../ui/react/surface';
import { t } from '../../../../shared/i18n';
import type { NoteHistoryHost } from './NoteHistoryPanel';
import { NoteReviewPage } from './NoteReviewPage';
import type { DiffLayout } from '../diff-model';
import { createDiffWorker } from '../diff-worker-factory';

const layoutValue = (value: unknown): DiffLayout | undefined =>
	value === 'side-by-side' || value === 'stacked' || value === 'unified' ? value : undefined;

class ReviewSurface extends ReactSurface {
	constructor(
		context: NativeSurfaceContext,
		private readonly host: NoteHistoryHost,
		private readonly id: string,
		private layout?: DiffLayout,
	) {
		super(context);
	}
	getViewType(): string {
		return 'huhu-version-review';
	}
	getDisplayText(): string {
		return this.host.reviews.get(this.id)?.source.path.split('/').at(-1) ?? t('review.title');
	}
	getIcon(): string {
		return 'history';
	}
	protected renderContent() {
		return (
			<NoteReviewPage
				key={this.id}
				id={this.id}
				host={this.host}
				context={this.context}
				layout={this.layout}
				onLayoutChange={(layout) => {
					this.layout = layout;
					this.context.changed?.();
				}}
				createWorker={() => createDiffWorker(this.contentEl.win)}
			/>
		);
	}
	getState(): Record<string, unknown> {
		return this.layout ? { layout: this.layout } : {};
	}
	override async onClose(): Promise<void> {
		await super.onClose();
		this.host.reviews.close(this.id);
	}
}

export const createNoteReviewPage =
	(host: NoteHistoryHost): PageCreate =>
	async (context, target, state) => {
		const surface = new ReviewSurface(context, host, target.resourceId ?? '', layoutValue(state.layout));
		return { surface, getTarget: () => target, getState: () => surface.getState(), navigate: async () => {} };
	};
