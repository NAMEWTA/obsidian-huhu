import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { BELONGING_TYPE_ID } from '../../api';
import { BelongingsPage, bt } from '../belongings/BelongingsPage';
import { Button } from '../../../../ui/components/button';
import type { App, ViewStateResult } from 'obsidian';
import type { PageCreate } from '../../../../app/contracts/workbench-host';
import type { WorkbenchTarget } from '../../../../app/contracts/workbench';
import { ReactSurface } from '../../../../ui/react/surface';
import { DesignScope } from '../../../../ui/react/design-scope';
import type { NativeSurfaceContext } from '../../../../ui/native-surface';
import { t } from '../../../../shared/i18n';
import type { GenericArchivesHost } from '../../services/generic/page-host';
import { ArchivePage } from './ArchivePage';
import { DefinitionStudio } from './DefinitionStudio';
import { RecoveryPanel } from './RecoveryPanel';
import { restoreArchivePageState, type ArchivePageState } from './page-state';

const BelongingsReport = lazy(() => import('../belongings/report/BelongingsReport'));

/** The archives content leaf: list, record editor, designer or recovery, in one design scope. */
export function ArchivesContent({
	host,
	app,
	owner,
	state,
	updateState,
	open,
	guard,
}: {
	host: GenericArchivesHost;
	app: App;
	owner: HTMLElement;
	state: ArchivePageState;
	updateState(this: void, value: Partial<ArchivePageState>): void;
	open(this: void, section?: string, resourceId?: string): Promise<void>;
	guard(this: void, callback: (() => Promise<boolean>) | undefined): void;
}) {
	const props = { application: host.application, app, owner };
	const target = `${state.section ?? ''}:${state.selectedId ?? ''}`;
	const [genericTarget, setGenericTarget] = useState<string>();
	const generic = genericTarget === target;
	const genericLeave = useRef<(() => Promise<boolean>) | undefined>(undefined);
	const genericGuard = useCallback(
		(callback: (() => Promise<boolean>) | undefined) => {
			guard(callback);
			genericLeave.current = callback;
		},
		[guard],
	);
	const belonging = state.section === BELONGING_TYPE_ID;
	return (
		<DesignScope className="@container mx-auto w-full min-w-0 max-w-[1440px] space-y-5 p-4">
			{state.section === 'archive-belongings-report' ? (
				<Suspense fallback={<p role="status">{t('contacts.loading')}</p>}>
					<BelongingsReport
						application={host.application}
						back={() => {
							void open(BELONGING_TYPE_ID);
						}}
					/>
				</Suspense>
			) : state.section === 'archive-designer' ? (
				<DefinitionStudio {...props} guard={guard} />
			) : state.section === 'archive-recovery' ? (
				<RecoveryPanel {...props} />
			) : belonging && !generic ? (
				<BelongingsPage
					key={target}
					application={host.application}
					owner={owner}
					selectedId={state.selectedId}
					search={state.search}
					setSearch={(search) => updateState({ search, offset: 0 })}
					select={(id) => {
						void open(undefined, id);
					}}
					edit={() => setGenericTarget(target)}
				/>
			) : (
				<>
					{belonging && (
						<Button
							variant="secondary"

							onClick={() => {
								void (async () => {
									if (genericLeave.current && !(await genericLeave.current())) return;
									guard(undefined);
									setGenericTarget(undefined);
								})();
							}}
						>
							{bt('backSpecial')}
						</Button>
					)}
					<ArchivePage
						host={host}
						app={app}
						owner={owner}
						state={state}
						updateState={updateState}
						navigate={open}
						guard={genericGuard}
					/>
				</>
			)}
		</DesignScope>
	);
}

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
		if (target?.section) this.state.section = target.section;
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
		let section = target.section;
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
		const generation = ++this.navigation;
		if (this.state.selectedId && this.app.workspace.layoutReady) {
			const record = await this.host.application.query.entity(this.state.selectedId);
			if (this.closed || generation !== this.navigation) return;
			if (record?.typeId === BELONGING_TYPE_ID && !this.state.section) this.state.section = BELONGING_TYPE_ID;
		}
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
		return (
			<ArchivesContent
				host={this.host}
				app={this.app}
				owner={this.contentEl}
				state={this.state}
				updateState={this.updateState}
				open={this.open}
				guard={this.guard}
			/>
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
