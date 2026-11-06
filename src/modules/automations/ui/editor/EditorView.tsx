// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/automations/AutomationEditorDialog.tsx, AutomationEditorDialogHeader.tsx, AutomationEditorDialogFooter.tsx
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Platform } from 'obsidian';
import { useVisible } from '../../../../ui/react/contexts';
import { useLeafMetrics } from '../../../../ui/react/use-leaf-metrics';
import { DraftIssues, type DraftIssue } from './draft-issues';
import { Input } from '../../../../ui/components/input';
import { Button } from '../../../../ui/components/button';
import { cn } from '../../../../ui/lib/utils';
import { useT } from '../../../../ui/react/hooks';
import type { AutomationEditRequest } from '../../core/api';
import type { AutomationViewHost } from '../panel-contract';
import { Field } from '../parts';
import type { AutomationDefinition, AutomationRun } from '../../../../shared/automation/types';
import { actionDefinition } from '../../core/actions/registry';
import { actionView } from '../actions/registry';
import { newDraft, draftError, contentError } from './draft';
import { ContentPane } from './ContentPane';
import { SettingsSidebar } from './SettingsSidebar';

/**
 * The automation form: name, content and settings, with a footer of actions. It fills the box it is put in
 * (the automation board's page, or the composer dialog), scrolls inside, and keeps the action bar in view.
 * It reports a successful save through `onSaved` and leaves closing to the host; a failed run keeps it open.
 */
export function EditorView({
	request,
	host,
	onSaved,
	onClose,
	onDirty,
	dialog = false,
	logicalLeaf,
	signal,
}: {
	request: AutomationEditRequest;
	host: AutomationViewHost;
	/** The definition as stored after a successful save, and the run when "Save and run" started one. */
	onSaved: (saved: AutomationDefinition, run?: AutomationRun) => void;
	onClose: () => void;
	/** Reports whether the form differs from what was last opened or saved. */
	onDirty?: (dirty: boolean) => void;
	/** Inside the composer dialog: a "Cancel" button, and no room kept clear of the status bar. */
	dialog?: boolean;
	logicalLeaf?: HTMLElement | null;
	signal?: AbortSignal;
}) {
	const t = useT(),
		visible = useVisible(),
		leaf = useLeafMetrics(logicalLeaf),
		snapshot = useStore(host.store);
	const alive = useRef(true),
		active = useRef(visible),
		version = useRef(0),
		issueRef = useRef<Record<string, DraftIssue>>({}),
		[issues, setIssues] = useState<Record<string, DraftIssue>>({});
	active.current = visible;
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
		};
	}, []);
	const reportIssue = useCallback((id: string, issue: DraftIssue | null) => {
		if (!alive.current) return;
		const next = issue?.dirty || issue?.error ? issue : null;
		if (JSON.stringify(issueRef.current[id] ?? null) === JSON.stringify(next)) return;
		version.current++;
		const copy = { ...issueRef.current };
		if (next) copy[id] = next;
		else delete copy[id];
		issueRef.current = copy;
		setIssues(copy);
	}, []);
	const permitted = () => alive.current && active.current && !signal?.aborted;
	const [initial] = useState(() =>
		newDraft(
			request,
			host.service.deviceId,
			host.cwd ?? '',
			host.service.agent()?.listAgents() ?? [],
			request.template,
		),
	);
	const [draft, setDraft] = useState(initial);
	// What the form was last opened or saved with: the base of the dirty check and of the "past time" rule.
	const [saved, setSaved] = useState({ original: request.existing, json: JSON.stringify(initial) });
	const [saving, setSaving] = useState(false),
		[error, setError] = useState(''),
		[notice, setNotice] = useState('');
	// Field errors wait until the field was visited or a save was tried; a new form opens clean.
	const [touched, setTouched] = useState({ name: false, content: false }),
		[attempted, setAttempted] = useState(false);
	const lock = useRef(false),
		content = useRef<HTMLDivElement>(null),
		name = useRef<HTMLInputElement>(null);
	const leafRef = leaf.ref;
	const attachContent = useCallback(
		(node: HTMLDivElement | null) => {
			content.current = node;
			leafRef(node);
		},
		[leafRef],
	);
	const agents = host.service.agent()?.listAgents() ?? [];
	const validation = draftError(draft, agents, host.cwd ?? '', saved.original);
	const dirty = JSON.stringify(draft) !== saved.json || Object.values(issues).some((issue) => issue.dirty);
	const rawPending = Object.values(issues).some((issue) => issue.dirty || issue.error),
		rawError = Object.values(issues).find((issue) => issue.error)?.error;
	const otherDevice = draft.deviceId !== host.service.deviceId,
		unsupported = !!actionDefinition(draft.action.kind)?.desktop && !Platform.isDesktopApp;
	const readOnly =
		!snapshot.executionEnabled ||
		!!snapshot.loadError ||
		otherDevice ||
		!!signal?.aborted ||
		(!!request.existing && unsupported);
	const report = useRef(onDirty);
	useEffect(() => {
		report.current = onDirty;
	});
	useLayoutEffect(() => {
		report.current?.(dirty);
	}, [dirty]);
	useEffect(
		() => () => {
			report.current?.(false);
		},
		[],
	);
	// Focus once when the form opens (the content of an existing automation, the name of a new one), not after every save.
	const [opensExisting] = useState(!!request.existing);
	useEffect(() => {
		if (dialog) return;
		(opensExisting
			? (content.current?.querySelector<HTMLElement>('[data-content-editor]') ?? name.current)
			: name.current
		)?.focus();
	}, [dialog, opensExisting]);
	const onChange = (change: (draft: AutomationDefinition) => void) => {
		version.current++;
		setDraft((current) => {
			const next = structuredClone(current);
			change(next);
			return next;
		});
		setError('');
		setNotice('');
	};
	const save = async (run = false, current = draft) => {
		if (
			lock.current ||
			readOnly ||
			unsupported ||
			!permitted() ||
			Object.values(issueRef.current).some((issue) => issue.dirty || issue.error)
		)
			return;
		const captured = version.current;
		lock.current = true;
		setAttempted(true);
		setSaving(true);
		setError('');
		setNotice('');
		try {
			// Each kind of action may store its content in a normal form (a bare host becomes an https address).
			let draft = current;
			const normalized = actionDefinition(draft.action.kind)?.normalize?.(draft.action);
			if (normalized && normalized !== draft.action) {
				draft = { ...structuredClone(draft), action: normalized };
				setDraft(draft);
			}
			const invalid = draftError(draft, host.service.agent()?.listAgents() ?? [], host.cwd ?? '', saved.original);
			if (invalid) throw new Error(invalid);
			await actionView(draft.action.kind).beforeSave?.(draft.action, host);
			if (!permitted() || version.current !== captured) return;
			await host.service.save(draft);
			if (!alive.current || signal?.aborted) return;
			const stored = host.service.definitions.find((row) => row.id === draft.id);
			if (!stored) throw Error(t('automation.definitionMissing'));
			// The tab now stands for the stored definition; later edits are measured against it.
			setSaved({ original: stored, json: JSON.stringify(draft) });
			let started: AutomationRun | undefined;
			if (!permitted() || version.current !== captured) return;
			if (run) {
				started = await host.service.run(stored);
				if (!permitted() || version.current !== captured) return;
			}
			setNotice(t('automation.savedNotice'));
			onSaved(stored, started);
		} catch (e) {
			if (permitted()) setError(e instanceof Error ? e.message : String(e));
		} finally {
			lock.current = false;
			if (alive.current) setSaving(false);
		}
	};
	const inline = new Set([t('automation.nameRequired'), contentError(draft.action)]);
	const showName = (touched.name || attempted) && !draft.name.trim();
	const footerMessage = error || rawError || (validation && !inline.has(validation) ? validation : '');
	return (
		<DraftIssues report={reportIssue} boundary={leaf.element}>
			<div
				ref={attachContent}
				className="@container flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground"
				data-automation-editor={opensExisting ? 'existing' : ''}
				onKeyDown={(event) => {
					if (
						!event.defaultPrevented &&
						(event.ctrlKey || event.metaKey) &&
						event.key === 'Enter' &&
						!event.nativeEvent.isComposing
					) {
						event.preventDefault();
						if (!validation && !saving && !rawPending && !readOnly && !unsupported) void save();
					}
				}}
			>
				<fieldset
					disabled={readOnly || saving}
					className="m-0 min-h-0 min-w-0 flex-1 overflow-y-auto scrollbar-sleek border-0 p-0"
				>
					<div
						className={cn(
							'mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_22rem] items-start gap-6 px-6 py-6 @max-[760px]:grid-cols-1 @max-[760px]:px-4 @max-[760px]:py-4',
						)}
					>
						<div className="flex min-w-0 flex-col gap-6">
							<Field
								label={t('automation.name')}
								error={showName ? t('automation.nameRequired') : undefined}
							>
								{(id) => (
									<Input
										id={id}
										ref={name}
										placeholder={t('automation.name')}
										value={draft.name}
										aria-invalid={showName}
										aria-describedby={showName ? `${id}-error` : undefined}
										onBlur={() => setTouched((v) => ({ ...v, name: true }))}
										onChange={(e) =>
											onChange((d) => {
												d.name = e.target.value;
											})
										}
										className="h-10 min-w-0 text-base font-medium"
									/>
								)}
							</Field>
							<ContentPane
								draft={draft}
								onChange={onChange}
								host={host}
								showErrors={touched.content || attempted}
								onTouch={() => setTouched((v) => (v.content ? v : { ...v, content: true }))}
							/>
						</div>
						<SettingsSidebar draft={draft} onChange={onChange} host={host} />
					</div>
				</fieldset>
				<div
					// The Obsidian status bar floats over the bottom right corner of the window; keep the actions clear of it.
					className={cn('shrink-0 border-t border-border/50', dialog ? 'pb-1' : 'pb-8')}
				>
					<div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3 @max-[760px]:px-4">
						<p
							role={footerMessage ? (error ? 'alert' : 'status') : 'status'}
							className={cn(
								'min-w-0 flex-1 text-xs leading-4',
								footerMessage ? 'text-destructive' : 'text-muted-foreground',
							)}
						>
							{footerMessage ||
								notice ||
								(otherDevice
									? t('automation.readOnlyOtherDevice')
									: unsupported
										? t('automation.unsupportedDevice')
										: t('automation.localOnly'))}
						</p>
						<div className="flex shrink-0 flex-wrap justify-end gap-2">
							<Button variant="secondary" disabled={saving} onClick={onClose}>
								{t(dialog ? 'automation.cancel' : 'automation.close')}
							</Button>
							<Button
								variant="secondary"
								disabled={saving || !!validation || rawPending || readOnly || unsupported}
								onClick={() => {
									void save(true);
								}}
							>
								{t('automation.saveAndRun')}
							</Button>
							<Button
								disabled={saving || !!validation || rawPending || readOnly || unsupported}
								onClick={() => {
									void save();
								}}
							>
								{t(saved.original ? 'automation.save' : 'automation.create')}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</DraftIssues>
	);
}
