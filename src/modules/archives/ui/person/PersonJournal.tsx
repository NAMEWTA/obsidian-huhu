/** Journal interaction for HUHU's person reading layer; all writes use the T-14 owner service. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArchivesApplication } from '../../services/generic/application';
import { ArchiveError, type ArchiveTypeDefinition, type EntitySummary } from '../../core/schema/model';
import { journalRows, type JournalRow, type JournalValues } from '../../core/person-journal/journal';
import { at, ct, Button, Input, Textarea, TextField } from '../generic/common';
import { EntityPicker } from '../generic/RelationPanel';
import { openReactDialog } from '../../../../ui/react/dialog';
import { publishFeedback } from '../../../../host/obsidian/feedback';
import { personHitSize, type Leave } from './common';

function confirm(owner: HTMLElement, message: string, accept: string, signal: AbortSignal): Promise<boolean> {
	if (signal.aborted) return Promise.resolve(false);
	return new Promise((resolve) => {
		let accepted = false;
		const cancel = () => {
			dialog.close();
			resolve(false);
		};
		const dialog = openReactDialog(owner, {
			title: accept,
			description: message,
			content: (close) => (
				<div style={personHitSize} className="flex flex-wrap justify-end gap-2">
					<Button variant="outline" onClick={close}>
						{ct('cancel')}
					</Button>
					<Button
						onClick={() => {
							accepted = true;
							close();
						}}
					>
						{accept}
					</Button>
				</div>
			),
			onClose: () => {
				signal.removeEventListener('abort', cancel);
				resolve(accepted && !signal.aborted);
			},
		});
		signal.addEventListener('abort', cancel, { once: true });
	});
}
function Related({
	application,
	id,
	open,
}: {
	application: ArchivesApplication;
	id: string;
	open(this: void, id: string): void;
}) {
	const [entity, setEntity] = useState<EntitySummary>();
	useEffect(() => {
		let alive = true;
		void application.query.entity(id).then(
			(value) => {
				if (alive) setEntity(value);
			},
			() => {},
		);
		return () => {
			alive = false;
		};
	}, [application, id]);
	return (
		<Button variant="link" className="h-auto max-w-full whitespace-normal break-all px-0" onClick={() => open(id)}>
			{entity?.name ?? at('missing')} · {id}
		</Button>
	);
}
interface Draft {
	rowId: string;
	expectedHash: string;
	values: JournalValues;
	adding: boolean;
}
const valuesOf = (row: JournalRow): JournalValues => ({
	date: typeof row.values.date === 'string' ? row.values.date : '',
	title: typeof row.values.title === 'string' ? row.values.title : '',
	content: typeof row.values.content === 'string' ? row.values.content : '',
	relatedEntityIds: Array.isArray(row.values.relatedEntityIds)
		? row.values.relatedEntityIds.filter((id): id is string => typeof id === 'string')
		: [],
});
export function PersonJournal({
	application,
	entity,
	type,
	owner,
	guard,
	open,
}: {
	application: ArchivesApplication;
	entity: EntitySummary;
	type: ArchiveTypeDefinition;
	owner: HTMLElement;
	guard(this: void, leave?: Leave): void;
	open(this: void, id: string): void;
}) {
	const [draft, setDraft] = useState<Draft>(),
		[busy, setBusy] = useState(false),
		[error, setError] = useState(''),
		[notice, setNotice] = useState('');
	const running = useRef(false),
		controller = useRef<AbortController | undefined>(undefined),
		lifetime = useRef<{ id: string; abort: AbortController } | undefined>(undefined),
		confirming = useRef(false);
	useEffect(() => {
		const abort = new AbortController();
		lifetime.current = { id: entity.id, abort };
		return () => {
			lifetime.current = undefined;
			abort.abort();
			controller.current?.abort();
		};
	}, [entity.id]);
	const ask = useCallback(
		async (message: string, accept: string) => {
			const current = lifetime.current;
			if (!current || current.id !== entity.id || confirming.current) return false;
			confirming.current = true;
			try {
				return await confirm(owner, message, accept, current.abort.signal);
			} finally {
				confirming.current = false;
			}
		},
		[owner, entity.id],
	);
	const leave = useCallback(async () => {
		if (running.current) return false;
		if (!draft) return true;
		if (!(await ask(at('person.discardHint'), at('person.discard')))) return false;
		setDraft(undefined);
		setError('');
		return true;
	}, [draft, ask]);
	useEffect(() => {
		guard(leave);
		return () => guard(undefined);
	}, [guard, leave]);
	let rows: JournalRow[] = [],
		invalid = false;
	try {
		rows = journalRows(entity.values.journal);
	} catch {
		invalid = true;
	}
	const supports = type.fields.some(
		(field) => field.fieldId === 'journal' && field.kind === 'table' && !field.archived,
	);
	const run = async (action: (signal: AbortSignal, operationId: string) => Promise<unknown>, saved = true) => {
		if (
			running.current ||
			!lifetime.current ||
			lifetime.current.id !== entity.id ||
			!application.runtime.ready ||
			application.runtime.loading ||
			application.catalog.snapshot().diagnostics.some((item) => item.code === 'read-failed')
		)
			return;
		running.current = true;
		setBusy(true);
		setError('');
		setNotice('');
		const abort = new AbortController();
		controller.current = abort;
		const operationId = crypto.randomUUID(),
			win = owner.ownerDocument.defaultView;
		if (win)
			publishFeedback(win, {
				source: 'archives-person-journal',
				operationId,
				message: { key: 'archives.person.saving' },
				progress: { completed: 0, total: 1 },
			});
		try {
			await action(abort.signal, operationId);
			if (!abort.signal.aborted) {
				if (saved) {
					setDraft(undefined);
					setNotice(at('person.saved'));
				}
				if (win)
					publishFeedback(win, {
						source: 'archives-person-journal',
						operationId,
						message: { key: saved ? 'archives.person.saved' : 'archives.person.ready' },
						outcome: 'success',
						receipt: { committed: true },
					});
			}
		} catch (cause) {
			if (!abort.signal.aborted) {
				const key = cause instanceof ArchiveError && cause.code.includes('conflict') ? 'conflict' : 'failed';
				setError(at(`person.${key}`));
				if (win)
					publishFeedback(win, {
						source: 'archives-person-journal',
						operationId,
						message: { key: `archives.person.${key}` },
						outcome: 'failed',
					});
			}
		} finally {
			running.current = false;
			if (!abort.signal.aborted) setBusy(false);
		}
	};
	const edit = (row?: JournalRow) => {
		setError('');
		setNotice('');
		const now = new Date(),
			today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		setDraft({
			rowId: row?.rowId ?? crypto.randomUUID(),
			expectedHash: entity.contentHash,
			adding: !row,
			values: row ? valuesOf(row) : { date: today, title: '', content: '', relatedEntityIds: [] },
		});
	};
	const upgrade = async () => {
		if (!(await ask(at('person.upgradeHint'), at('person.enable')))) return;
		await run(async (signal, operationId) => {
			await application.personJournal.install(signal);
			const plan = await application.personJournal.prepareUpgrade(
				{ operationId, entityId: entity.id, expectedHash: entity.contentHash },
				signal,
			);
			await application.commands.resumeOperation({ operationId: plan.id }, signal);
		}, false);
	};
	const update = (patch: Partial<JournalValues>) =>
		setDraft((value) => (value ? { ...value, values: { ...value.values, ...patch } } : value));
	return (
		<div className="min-w-0 space-y-3" aria-busy={busy}>
			<h3 className="font-semibold">{at('person.journal')}</h3>
			{error && (
				<p role="alert" className="break-words text-sm text-destructive">
					{error}
				</p>
			)}
			{notice && (
				<p role="status" className="text-sm">
					{notice}
				</p>
			)}
			{invalid ? (
				<p role="alert">{at('person.invalid')}</p>
			) : !supports ? (
				<>
					<p className="text-sm text-muted-foreground">{at('person.upgradeHint')}</p>
					<Button
						disabled={busy}
						onClick={() => {
							void upgrade();
						}}
					>
						{at('person.enable')}
					</Button>
				</>
			) : (
				<>
					{!draft && (
						<Button disabled={busy} onClick={() => edit()}>
							{at('person.add')}
						</Button>
					)}
					{draft && (
						<form
							className="min-w-0 space-y-3"
							onSubmit={(event) => {
								event.preventDefault();
								void run((signal, operationId) =>
									application.personJournal[draft.adding ? 'add' : 'update'](
										{
											operationId,
											entityId: entity.id,
											rowId: draft.rowId,
											expectedHash: draft.expectedHash,
											values: draft.values,
										},
										signal,
									),
								);
							}}
						>
							<fieldset disabled={busy} className="m-0 min-w-0 space-y-3 border-0 p-0">
								<label className="block min-w-0 space-y-1">
									<span className="text-sm font-medium">{at('preset.journalDate')}</span>
									<Input
										type="date"
										required
										className="w-full min-w-0 px-0"
										value={draft.values.date}
										onChange={(e) => update({ date: e.target.value })}
									/>
								</label>
								<TextField
									label={at('preset.journalTitle')}
									value={draft.values.title}
									onChange={(title) => update({ title })}
								/>
								<label className="block min-w-0 space-y-1">
									<span className="text-sm font-medium">{at('preset.journalContent')}</span>
									<Textarea
										className="min-w-0"
										value={draft.values.content}
										onChange={(e) => update({ content: e.target.value })}
									/>
								</label>
								<EntityPicker
									application={application}
									typeIds={application.catalog.snapshot().types.map((item) => item.id)}
									label={at('preset.journalRelatedEntities')}
									value=""
									change={(id) => {
										if (id && !draft.values.relatedEntityIds.includes(id))
											update({ relatedEntityIds: [...draft.values.relatedEntityIds, id] });
									}}
								/>
								{draft.values.relatedEntityIds.map((id) => (
									<div key={id} className="flex min-w-0 flex-wrap items-center gap-2">
										<Related application={application} id={id} open={open} />
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												update({
													relatedEntityIds: draft.values.relatedEntityIds.filter(
														(value) => value !== id,
													),
												})
											}
										>
											{at('person.removeLink')}
										</Button>
									</div>
								))}
								<div className="flex flex-wrap gap-2">
									<Button type="submit" disabled={!draft.values.title.trim()}>
										{ct('save')}
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											void leave();
										}}
									>
										{ct('cancel')}
									</Button>
								</div>
							</fieldset>
						</form>
					)}
					{!rows.length && !draft && <p className="text-sm text-muted-foreground">{at('person.empty')}</p>}
					<ol className="min-w-0 space-y-3">
						{rows.map((row) => {
							const values = valuesOf(row);
							return (
								<li
									key={row.rowId}
									data-journal-row={row.rowId}
									className="min-w-0 space-y-2 rounded-lg border bg-card py-3"
								>
									<time className="text-xs text-muted-foreground">{values.date}</time>
									<h4 className="break-words font-semibold">{values.title}</h4>
									<p className="whitespace-pre-wrap break-words text-sm">{values.content}</p>
									{values.relatedEntityIds.map((id) => (
										<Related key={id} application={application} id={id} open={open} />
									))}
									<div className="flex flex-wrap gap-2">
										<Button variant="outline" disabled={busy || !!draft} onClick={() => edit(row)}>
											{ct('edit')}
										</Button>
										<Button
											variant="outline"
											disabled={busy || !!draft}
											onClick={() => {
												const expectedHash = entity.contentHash;
												void ask(at('person.deleteHint'), at('person.delete')).then(
													(accepted) => {
														if (accepted)
															void run((signal, operationId) =>
																application.personJournal.remove(
																	{
																		operationId,
																		entityId: entity.id,
																		rowId: row.rowId,
																		expectedHash,
																	},
																	signal,
																),
															);
													},
												);
											}}
										>
											{at('person.delete')}
										</Button>
									</div>
								</li>
							);
						})}
					</ol>
				</>
			)}
		</div>
	);
}
