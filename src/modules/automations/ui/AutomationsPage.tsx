// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: automation page behavior.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'obsidian';
import { useStore } from 'zustand';
import type { WorkbenchTarget } from '../../../app/contracts/workbench';
import type { AutomationDefinition } from '../../../shared/automation/types';
import type { AutomationEditRequest } from '../core/api';
import type { AutomationTemplate } from '../core/templates';
import { actionDefinitions, actionText } from '../core/actions/registry';
import { canRetryCalendarDelivery } from '../core/calendar-run';
import { AutomationError } from '../../../shared/automation/errors';
import { useOwnerWindow, useT } from '../../../ui/react/hooks';
import { useVisible, VisibilityContext } from '../../../ui/react/contexts';
import { useLeafMetrics } from '../../../ui/react/use-leaf-metrics';
import { useDesignNotice } from '../../../ui/react/design-scope';
import { Button } from '../../../ui/components/button';
import { DetailPane } from '../../../ui/components/huhu/DetailPane';
import { Notice } from '../../../ui/components/huhu/Notice';
import type { AutomationViewHost } from './panel-contract';
import { bindSpaceLookup } from './actions/agent';
import { TopBar } from './TopBar';
import { Toolbar } from './list/Toolbar';
import { FilterPills, type ListFilter } from './list/FilterMenu';
import { AutomationsTable, type ListSort } from './list/AutomationsTable';
import type { RowActions } from './list/AutomationRow';
import { EmptyState } from './list/EmptyState';
import { AutomationDetail } from './detail/AutomationDetail';
import type { RunActions } from './detail/RunHistory';
import { RunsPage } from './runs/RunsPage';
import { RunDetail } from './runs/RunDetail';
import { EditorView } from './editor/EditorView';
import { RetainedEditorDialog } from './editor/RetainedEditorDialog';
import { DeleteDialog } from './dialogs/DeleteDialog';
import { DiscardDialog } from './dialogs/DiscardDialog';

export interface AutomationPageState {
	search: string;
	filter: ListFilter;
	sort: ListSort;
}
export function initialPageState(raw: Record<string, unknown>): AutomationPageState {
	const filter = raw.filter as Partial<ListFilter> | undefined,
		sort = raw.sort as Partial<ListSort> | undefined;
	return {
		search: typeof raw.search === 'string' ? raw.search.slice(0, 2048) : '',
		filter: {
			status: ['enabled', 'disabled'].includes(filter?.status ?? '') ? filter!.status! : 'all',
			result: ['failed', 'succeeded', 'neverRun'].includes(filter?.result ?? '') ? filter!.result! : 'all',
			kinds: Array.isArray(filter?.kinds) ? filter.kinds.slice(0, actionDefinitions.length) : [],
			agents: Array.isArray(filter?.agents) ? filter.agents.slice(0, 30) : [],
		},
		sort: { by: sort?.by === 'name' ? 'name' : 'lastRun', direction: sort?.direction === 'asc' ? 'asc' : 'desc' },
	};
}
type LeaveGuard = () => Promise<boolean>;
export function AutomationsPage({
	host,
	target,
	request,
	initialState,
	onState,
	onNavigate,
	onPageMenu,
	onNavigation,
	onEditConsumed,
	onLeaveGuard,
	signal,
}: {
	host: AutomationViewHost;
	target: WorkbenchTarget;
	request?: AutomationEditRequest;
	initialState: AutomationPageState;
	onState(this: void, state: AutomationPageState): void;
	onNavigate(this: void, target: WorkbenchTarget): void;
	onPageMenu(this: void, event: MouseEvent): void;
	onNavigation(this: void): void;
	onEditConsumed(this: void): void;
	onLeaveGuard?(this: void, guard: LeaveGuard | null): void;
	signal?: AbortSignal;
}) {
	const t = useT(),
		notice = useDesignNotice(),
		visible = useVisible(),
		win = useOwnerWindow(),
		leaf = useLeafMetrics();
	bindSpaceLookup(() => host.service.agent()?.listSpaces?.());
	const { definitions, runs, loadError, executionEnabled } = useStore(host.store);
	const [state, setState] = useState(initialState),
		[focusedRow, setFocusedRow] = useState(''),
		[refreshing, setRefreshing] = useState(false),
		[error, setError] = useState(''),
		[entityError, setEntityError] = useState<{ id: string; message: string } | null>(null);
	const [edit, setEdit] = useState<{ request: AutomationEditRequest; key: number }>(),
		[createRequest, setCreateRequest] = useState<AutomationEditRequest>({}),
		[createSequence, setCreateSequence] = useState(0),
		[dirty, setDirty] = useState(false),
		[discarding, setDiscarding] = useState(false),
		[deleting, setDeleting] = useState<AutomationDefinition>();
	const dirtyRef = useRef(false),
		editSequence = useRef(0),
		alive = useRef(true),
		pendingIds = useRef(new Set<string>()),
		[pending, setPending] = useState<ReadonlySet<string>>(new Set());
	const [skipDelete, setSkipDelete] = useState(() => host.skipDeleteConfirmation?.() ?? false);
	const generation = useRef({ key: '', win, visible, generation: 0 });
	const key = JSON.stringify([target.section, target.resourceId, target.focusId]);
	if (generation.current.key !== key || generation.current.win !== win || generation.current.visible !== visible)
		generation.current = { key, win, visible, generation: generation.current.generation + 1 };
	const current = (ticket: number) =>
		alive.current && !signal?.aborted && generation.current.visible && generation.current.generation === ticket;
	const leave = useRef<{ promise: Promise<boolean>; resolve: (allowed: boolean) => void } | undefined>(undefined);
	const reportDirty = useCallback((value: boolean) => {
		dirtyRef.current = value;
		setDirty(value);
	}, []);
	const decideLeave = useCallback((allowed: boolean) => {
		const pending = leave.current;
		leave.current = undefined;
		setDiscarding(false);
		if (allowed) {
			dirtyRef.current = false;
			setDirty(false);
			setEdit(undefined);
		}
		pending?.resolve(allowed);
	}, []);
	const guard = useCallback<LeaveGuard>(() => {
		if (!dirtyRef.current) return Promise.resolve(true);
		if (leave.current) return leave.current.promise;
		let resolve!: (allowed: boolean) => void;
		const promise = new Promise<boolean>((done) => {
			resolve = done;
		});
		leave.current = { promise, resolve };
		setDiscarding(true);
		return promise;
	}, []);
	useLayoutEffect(() => {
		onLeaveGuard?.(guard);
		return () => onLeaveGuard?.(null);
	}, [guard, onLeaveGuard]);
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			leave.current?.resolve(false);
			leave.current = undefined;
		};
	}, []);
	useEffect(() => {
		if (!visible) {
			setDeleting(undefined);
			setDiscarding(false);
			leave.current?.resolve(false);
			leave.current = undefined;
		}
	}, [visible]);
	const rawNavigate = (section = 'tasks', resourceId?: string) =>
		onNavigate({ feature: 'automations', section, resourceId });
	const navigate = (section = 'tasks', resourceId?: string) => {
		if (!dirtyRef.current && !leave.current) {
			rawNavigate(section, resourceId);
			return;
		}
		const ticket = generation.current.generation;
		void guard().then((allowed) => {
			if (allowed && current(ticket)) rawNavigate(section, resourceId);
		});
	};
	const openEditor = (request: AutomationEditRequest, template?: AutomationTemplate) => {
		const ticket = generation.current.generation;
		void guard().then((allowed) => {
			if (!allowed || !current(ticket)) return;
			reportDirty(false);
			if (request.existing) setEdit({ request: { ...request, template }, key: ++editSequence.current });
			else {
				setCreateRequest({ ...request, template });
				setCreateSequence((value) => value + 1);
				rawNavigate('new');
			}
		});
	};
	const requestHandler = useRef(openEditor);
	requestHandler.current = openEditor;
	useEffect(() => {
		if (request) {
			requestHandler.current(request);
			onEditConsumed();
		}
	}, [request, onEditConsumed]);
	const update = (patch: Partial<AutomationPageState>) => {
		const next = { ...state, ...patch };
		setState(next);
		setFocusedRow('');
		onState(next);
	};
	const perform = (operation: () => Promise<unknown>) => {
		const ticket = generation.current.generation;
		void operation().catch((cause) => {
			if (!current(ticket)) return;
			const message = cause instanceof Error ? cause.message : String(cause);
			setError(message);
			notice(message, { id: 'automation-error' });
		});
	};
	const entityOperation = (id: string, operation: () => Promise<unknown>) => {
		if (
			!alive.current ||
			signal?.aborted ||
			!generation.current.visible ||
			!host.service.executionEnabled ||
			host.service.loadError ||
			pendingIds.current.has(id)
		)
			return;
		pendingIds.current.add(id);
		setPending(new Set(pendingIds.current));
		const ticket = generation.current.generation;
		setError('');
		setEntityError(null);
		void operation()
			.catch((cause) => {
				if (current(ticket)) {
					const message = cause instanceof Error ? cause.message : t('automation.toggleFailed');
					setError(message);
					setEntityError({ id, message });
					notice(message, { id: `automation-${id}` });
				}
			})
			.finally(() => {
				pendingIds.current.delete(id);
				if (alive.current) setPending(new Set(pendingIds.current));
			});
	};
	const shown = useMemo(() => {
		const latest = new Map(runs.map((run) => [run.automationId, run]));
		return definitions
			.filter((d) => {
				const last = latest.get(d.id),
					filter = state.filter,
					query = state.search.trim().toLocaleLowerCase();
				return (
					(!query ||
						`${d.name} ${actionText(d.action)} ${'cwd' in d.action ? d.action.cwd : ''}`
							.toLocaleLowerCase()
							.includes(query)) &&
					(filter.status === 'all' || d.enabled === (filter.status === 'enabled')) &&
					(filter.result === 'all' ||
						(filter.result === 'neverRun' ? !last : last?.status === filter.result)) &&
					(!filter.kinds.length || filter.kinds.includes(d.action.kind)) &&
					(!filter.agents.length || (d.action.kind === 'agent' && filter.agents.includes(d.action.agentId)))
				);
			})
			.sort((a, b) => {
				const result =
					state.sort.by === 'name'
						? a.name.localeCompare(b.name)
						: (latest.get(a.id)?.startedAt ?? 0) - (latest.get(b.id)?.startedAt ?? 0);
				return (state.sort.direction === 'asc' ? result : -result) || a.name.localeCompare(b.name);
			});
	}, [definitions, runs, state]);
	const disabled = !executionEnabled || !!loadError;
	const rowActions: RowActions = {
		onOpen: (d) => {
			if (!pendingIds.current.has(d.id)) navigate('tasks', d.id);
		},
		onRun: (d) => {
			const ticket = generation.current.generation;
			entityOperation(d.id, async () => {
				const run = await host.service.run(d);
				if (run && current(ticket)) rawNavigate('runs', run.id);
			});
		},
		onEdit: (d) => openEditor({ existing: d }),
		onToggle: (d) =>
			entityOperation(d.id, async () => {
				const latest = host.service.definitions.find((row) => row.id === d.id);
				if (latest) await host.service.save({ ...latest, enabled: !latest.enabled });
			}),
		onDelete: (d) => {
			if (skipDelete) {
				const ticket = generation.current.generation;
				entityOperation(d.id, async () => {
					await host.service.remove(d);
					if (current(ticket) && target.resourceId === d.id) rawNavigate();
				});
			} else setDeleting(d);
		},
	};
	const runActions: RunActions = {
		onOpen: (run) => navigate('runs', run.id),
		onTerminal: (run) =>
			perform(
				() =>
					host.service.openRun?.(run) ??
					host.service.agent()?.open(run.terminalId ?? '') ??
					Promise.resolve(),
			),
		onStop: (run) => perform(() => host.service.stop(run)),
		onSource: host.openCalendarSource
			? (run) =>
					perform(async () => {
						if (run.taskDelivery?.receipt) await host.openCalendarSource?.(run.taskDelivery, win);
					})
			: undefined,
		onRerun: (run) => {
			if (canRetryCalendarDelivery(run)) {
				const ticket = generation.current.generation;
				perform(async () => {
					if (!host.service.retryRun) throw new AutomationError('calendarRetryUnavailable');
					const retried = await host.service.retryRun(run);
					if (retried && current(ticket)) rawNavigate('runs', retried.id);
				});
			} else {
				const d = definitions.find((item) => item.id === run.automationId) ?? run.definition;
				if (d) rowActions.onRun(d);
			}
		},
	};
	const selectedDefinition =
		target.section !== 'runs' && target.resourceId
			? definitions.find((d) => d.id === target.resourceId)
			: undefined;
	const selectedRun =
		target.section === 'runs' && target.resourceId ? runs.find((run) => run.id === target.resourceId) : undefined;
	const independent = target.section === 'new' || (target.section === 'runs' && !target.resourceId);
	const closeEditor = () => {
		void guard().then((allowed) => {
			if (allowed && alive.current) setEdit(undefined);
		});
	};
	const refresh = () => {
		if (refreshing) return;
		setRefreshing(true);
		perform(async () => {
			try {
				await (loadError ? host.retry() : host.refresh());
			} finally {
				if (alive.current) setRefreshing(false);
			}
		});
	};
	const newForm = target.section === 'new',
		formKey = edit ? `edit-${edit.key}` : newForm ? `new-${createSequence}` : null,
		liveForm = useRef(formKey);
	liveForm.current = formKey;
	const onDirty = (value: boolean) => {
		if (liveForm.current === formKey) reportDirty(value);
	};
	const saved = (definition: AutomationDefinition, run?: Parameters<RunActions['onOpen']>[0]) => {
		if (!alive.current || !visible || liveForm.current !== formKey) return;
		reportDirty(false);
		setEdit(undefined);
		if (run) rawNavigate('runs', run.id);
		else if (newForm) rawNavigate('tasks', definition.id);
	};
	const confirmation =
		discarding && visible ? (
			<DiscardDialog
				name={edit?.request.existing?.name ?? t('automation.new')}
				onCancel={() => decideLeave(false)}
				onConfirm={() => decideLeave(true)}
			/>
		) : null;
	return (
		<main
			ref={leaf.ref}
			className="@container relative flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--hu-surface)] pt-4 text-[var(--hu-fg)]"
			data-automation-page
			data-dirty={dirty}
			aria-busy={refreshing}
		>
			<TopBar
				name={newForm ? t('automation.new') : independent ? t('automation.history') : undefined}
				onList={() => navigate()}
				onBack={() => navigate()}
				onMenu={onPageMenu}
				onNavigation={onNavigation}
			/>
			{(loadError || error || !executionEnabled) && (
				<Notice
					tone={loadError || error ? 'error' : 'info'}
					title={loadError || error || t('automation.moduleOff')}
					action={
						loadError ? (
							<Button variant="secondary" size="sm" disabled={refreshing} onClick={refresh}>
								{t('automation.retry')}
							</Button>
						) : undefined
					}
				/>
			)}
			{refreshing && !loadError && (
				<p role="status" className="mx-4 text-xs text-[var(--hu-fg-3)]">
					{t('automation.refreshing')}
				</p>
			)}
			<div className="flex min-h-0 min-w-0 flex-1">
				<VisibilityContext value={visible && !independent}>
					<section
						style={independent ? { display: 'none' } : undefined}
						className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-4"
						data-automation-list
					>
						<Toolbar
							query={state.search}
							onQueryChange={(search) => update({ search })}
							filter={state.filter}
							onFilterChange={(filter) => update({ filter })}
							agents={host.service.agent()?.listAgents() ?? []}
							refreshing={refreshing}
							onRefresh={refresh}
							onRuns={() => navigate('runs')}
							onCreate={() => openEditor({})}
							onArrow={(key) => {
								const index = shown.findIndex((d) => d.id === focusedRow);
								setFocusedRow(
									shown[
										index < 0
											? key === 'ArrowDown'
												? 0
												: shown.length - 1
											: Math.max(
													0,
													Math.min(shown.length - 1, index + (key === 'ArrowDown' ? 1 : -1)),
												)
									]?.id ?? '',
								);
							}}
							onEnter={() => {
								const d = shown.find((d) => d.id === focusedRow) ?? shown[0];
								if (d) rowActions.onOpen(d);
							}}
							disabled={disabled}
						/>
						<FilterPills filter={state.filter} onChange={(filter) => update({ filter })} />
						{definitions.length ? (
							<AutomationsTable
								definitions={shown}
								runs={runs}
								selected={target.resourceId ?? ''}
								focused={focusedRow}
								sort={state.sort}
								onSort={(sort) => update({ sort })}
								deviceId={host.service.deviceId}
								disabled={disabled}
								pending={pending}
								{...rowActions}
							/>
						) : (
							<EmptyState onCreate={(template) => openEditor({}, template)} disabled={disabled} />
						)}
					</section>
				</VisibilityContext>
				{newForm ? (
					<EditorView
						key={createSequence}
						request={createRequest}
						host={host}
						onDirty={onDirty}
						onSaved={saved}
						onClose={() => navigate()}
						logicalLeaf={leaf.element}
						signal={signal}
					/>
				) : independent ? (
					<RunsPage runs={runs} disabled={disabled} {...runActions} />
				) : null}
				<DetailPane
					open={visible && !!target.resourceId}
					leafWidth={leaf.width}
					onOpenChange={(open) => {
						if (!open) navigate();
					}}
					title={
						selectedDefinition?.name ??
						selectedRun?.title ??
						t(target.section === 'runs' ? 'automation.runDetails' : 'automation.details')
					}
				>
					{selectedDefinition ? (
						<AutomationDetail
							key={selectedDefinition.id}
							definition={selectedDefinition}
							runs={runs.filter((run) => run.automationId === selectedDefinition.id)}
							disabled={
								disabled ||
								selectedDefinition.deviceId !== host.service.deviceId ||
								(!!actionDefinitions.find((item) => item.kind === selectedDefinition.action.kind)
									?.desktop &&
									!Platform.isDesktopApp)
							}
							readOnlyReason={
								selectedDefinition.deviceId !== host.service.deviceId
									? t('automation.readOnlyOtherDevice')
									: !!actionDefinitions.find((item) => item.kind === selectedDefinition.action.kind)
												?.desktop && !Platform.isDesktopApp
										? t('automation.unsupportedDevice')
										: undefined
							}
							pending={pending.has(selectedDefinition.id)}
							error={entityError?.id === selectedDefinition.id ? entityError.message : undefined}
							rowActions={rowActions}
							runActions={runActions}
							onSource={() => {
								if (selectedDefinition.source)
									perform(() => host.service.sources.open(selectedDefinition.source!));
							}}
							onLink={() => {
								if (selectedDefinition.link && host.openLink)
									perform(() => host.openLink!(selectedDefinition.link!));
							}}
						/>
					) : selectedRun ? (
						<RunDetail run={selectedRun} disabled={disabled} {...runActions} />
					) : (
						<Notice
							tone="info"
							title={t(
								target.section === 'runs' ? 'automation.runMissing' : 'automation.definitionMissing',
							)}
						/>
					)}
				</DetailPane>
			</div>
			{edit && (
				<RetainedEditorDialog
					visible={visible}
					title={edit.request.existing?.name ?? t('automation.edit')}
					onClose={closeEditor}
				>
					<EditorView
						key={edit.key}
						dialog
						request={edit.request}
						host={host}
						onDirty={onDirty}
						onSaved={saved}
						onClose={closeEditor}
						logicalLeaf={leaf.element}
						signal={signal}
					/>
					{confirmation}
				</RetainedEditorDialog>
			)}
			{!edit && confirmation}
			{deleting && visible && (
				<DeleteDialog
					definition={deleting}
					onCancel={() => setDeleting(undefined)}
					onConfirm={async (skip) => {
						const d = deleting,
							ticket = generation.current.generation;
						await host.service.remove(d);
						if (!current(ticket)) return;
						await host.setSkipDeleteConfirmation?.(skip);
						if (!current(ticket)) return;
						setSkipDelete(skip);
						setDeleting(undefined);
						if (target.resourceId === d.id) rawNavigate();
					}}
				/>
			)}
		</main>
	);
}
