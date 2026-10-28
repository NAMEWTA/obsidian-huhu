import type { ViewStateResult } from 'obsidian';
import type { PageCreate } from '../../../../app/contracts/workbench-host';
import type { WorkbenchTarget } from '../../../../app/contracts/workbench';
import { ReactSurface } from '../../../../ui/react/surface';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { t } from '../../../../shared/i18n';
import type { GenericArchivesHost } from '../../services/generic/page-host';
import { archiveSection } from '../../services/generic/workbench';
import { ArchivePage } from './ArchivePage';
import { DefinitionStudio } from './DefinitionStudio';
import { RecoveryPanel } from './RecoveryPanel';
import { restoreArchivePageState, type ArchivePageState } from './page-state';

export class GenericArchivesSurface extends ReactSurface {
	private state: ArchivePageState;
	private leave?: () => Promise<boolean>;
	private navigation = 0;
	private closed = false;
	constructor(
		context: NativeSurfaceContext,
		private readonly host: GenericArchivesHost,
		state: Record<string, unknown> = {},
		target?: WorkbenchTarget,
	) {
		super(context);
		this.state = restoreArchivePageState(state);
		if (target?.section) this.state.section = archiveSection(target.section);
		if (target?.resourceId) this.state.selectedId = target.resourceId;
	}
	getViewType(): string {
		return 'huhu-archives-page';
	}
	getDisplayText(): string {
		return t('workbench.contacts');
	}
	getIcon(): string {
		return 'contact-round';
	}
	getTarget(): WorkbenchTarget {
		return {
			feature: 'contacts',
			section: this.state.section,
			resourceId: this.state.selectedId,
			...(this.leave ? { focusId: 'archive-editor' } : {}),
		};
	}
	getState(): Record<string, unknown> {
		return { ...this.state, scroll: this.state.selectedId ? this.state.scroll : this.contentEl.scrollTop };
	}
	setState(raw: Record<string, unknown>, _result: ViewStateResult): Promise<void> {
		this.state = restoreArchivePageState(raw);
		this.rerender();
		return Promise.resolve();
	}
	private readonly guard = (callback: (() => Promise<boolean>) | undefined): void => {
		if (this.leave === callback) return;
		this.leave = callback;
		this.context.changed?.();
	};
	private readonly updateState = (value: Partial<ArchivePageState>): void => {
		this.state = { ...this.state, ...value };
		this.context.changed?.();
		this.rerender();
	};
	private readonly open = async (section?: string, resourceId?: string): Promise<void> => {
		await this.navigate({ feature: 'contacts', section: section ?? this.state.section, resourceId });
	};
	async navigate(target: WorkbenchTarget, signal?: AbortSignal): Promise<void> {
		const generation = ++this.navigation;
		if (this.closed || signal?.aborted || (this.leave && !(await this.leave()))) return;
		if (generation !== this.navigation || signal?.aborted || this.closed) return;
		let section = archiveSection(target.section);
		if (target.resourceId && this.app.workspace.layoutReady) {
			const record = await this.host.application.query.entity(target.resourceId);
			if (generation !== this.navigation || signal?.aborted || this.closed) return;
			const definition = section
				? this.host.application.runtime.index.definition(section)?.definition
				: undefined;
			if (
				record &&
				section !== record.typeId &&
				!(definition?.kind === 'view' && definition.typeId === record.typeId)
			)
				section = record.typeId;
		}
		const sameList = section === this.state.section || !section;
		if (!this.state.selectedId) this.state.scroll = this.contentEl.scrollTop;
		this.leave = undefined;
		this.state = {
			...(sameList ? this.state : { search: '', offset: 0, scroll: 0 }),
			section: section ?? this.state.section,
			selectedId: target.resourceId,
		};
		this.context.changed?.();
		this.rerender();
		this.contentEl.win.requestAnimationFrame(() => {
			if (generation === this.navigation && !this.closed)
				this.contentEl.scrollTop = target.resourceId ? 0 : this.state.scroll;
		});
	}
	override async onOpen(): Promise<void> {
		this.closed = false;
		this.contentEl.addClass('overflow-y-auto');
		await super.onOpen();
	}
	override async onClose(): Promise<void> {
		this.closed = true;
		this.navigation++;
		this.leave = undefined;
		this.contentEl.removeClass('overflow-y-auto');
		await super.onClose();
	}
	protected renderContent() {
		const props = { application: this.host.application, app: this.app, owner: this.contentEl };
		return (
			<div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
				{this.state.section === 'archive-designer' ? (
					<DefinitionStudio {...props} guard={this.guard} />
				) : this.state.section === 'archive-recovery' ? (
					<RecoveryPanel {...props} />
				) : (
					<ArchivePage
						host={this.host}
						app={this.app}
						owner={this.contentEl}
						state={this.state}
						updateState={this.updateState}
						navigate={this.open}
						guard={this.guard}
					/>
				)}
			</div>
		);
	}
}
export const createGenericArchivesPage =
	(host: () => GenericArchivesHost): PageCreate =>
	async (context, target, state) => {
		const surface = new GenericArchivesSurface(context, host(), state, target);
		return {
			surface,
			getTarget: () => surface.getTarget(),
			getState: () => surface.getState(),
			navigate: (target, signal) => surface.navigate(target, signal),
		};
	};
