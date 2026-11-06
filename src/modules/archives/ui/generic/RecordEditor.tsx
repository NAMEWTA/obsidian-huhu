import { displayLabel, at, ct, Button, ErrorBox, Select, useArchiveConfirm } from './common';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { App } from 'obsidian';
import type { ArchivesApplication } from '../../services/generic/application';
import {
	ArchiveError,
	type ArchiveTypeDefinition,
	type CommandReceipt,
	type EntityState,
	type FormSession,
	type FormTemplate,
	type Values,
} from '../../core/schema/model';
import { ENTITY_TAG, frontmatter } from '../../core/generic/markdown';
import { validateValues } from '../../core/schema/fields';
import { copy, equal } from '../../core/schema/value';
import { useT } from '../../../../ui/react/hooks';
import { reportOperationFailure } from '../../../../host/obsidian/feedback';

import { ValueForm } from './FieldRenderer';
import { BELONGING_TYPE_ID } from '../../api';
import { BELONGING_FIELDS } from '../../core/belongings/lifecycle';
import { useArchiveVersion } from './hooks';
import { Notice } from '../../../../ui/components/huhu/Notice';

export function RecordEditor({
	application,
	initial,
	type,
	forms,
	owner,
	app,
	guard,
	committed,
	cancel,
}: {
	application: ArchivesApplication;
	initial: FormSession;
	type: ArchiveTypeDefinition;
	forms: FormTemplate[];
	owner: HTMLElement;
	app: App;
	guard(this: void, callback: (() => Promise<boolean>) | undefined): void;
	committed(this: void, receipt: CommandReceipt): void;
	cancel(this: void): void;
}) {
	useT();
	const confirm = useArchiveConfirm(owner, initial.id);
	useArchiveVersion(application);
	const unavailable =
		!application.runtime.ready ||
		application.runtime.loading ||
		application.runtime.index.diagnostics().some((item) => item.code === 'read-failed');
	const [session, setSession] = useState(() => copy(initial)),
		[formId, setFormId] = useState(type.defaultFormId ?? ''),
		[busy, setBusy] = useState(false),
		[error, setError] = useState<unknown>(),
		[errors, setErrors] = useState<string[]>([]),
		[notice, setNotice] = useState('');
	const current = useRef(session),
		pendingDraft = useRef<Promise<void>>(Promise.resolve()),
		alive = useRef(true),
		done = useRef(false),
		saving = useRef(false),
		operationId = useRef(crypto.randomUUID());
	const persist = useCallback(
		(snapshot: FormSession) => {
			const operation = pendingDraft.current.catch(() => {}).then(() => application.commands.saveDraft(snapshot));
			pendingDraft.current = operation;
			void operation.catch((error) => {
				if (alive.current && current.current === snapshot) setError(error);
			});
			return operation;
		},
		[application],
	);
	const leave = useCallback(async () => {
		if (saving.current) return false;
		if (done.current || (current.current.dirtyFields.length === 0 && !current.current.creating)) return true;
		if (!(await confirm(at('dirtyPrompt'), at('keepDraft')))) return false;
		try {
			await persist(current.current);
			return alive.current;
		} catch (error) {
			if (alive.current) setError(error);
			return false;
		}
	}, [confirm, persist]);
	useEffect(() => {
		alive.current = true;
		guard(leave);
		return () => {
			alive.current = false;
			guard(undefined);
		};
	}, [guard, leave]);
	const change = (id: string, value: unknown) => {
		const draft: Values = { ...current.current.draft };
		if (value === undefined) delete draft[id];
		else draft[id] = value;
		const dirtyFields = type.fields
			.filter((field) => !equal(draft[field.fieldId], current.current.baseValues[field.fieldId]))
			.map((field) => field.fieldId);
		const next = { ...current.current, draft, dirtyFields };
		current.current = next;
		setSession(next);
		setError(undefined);
		setErrors([]);
		operationId.current = crypto.randomUUID();
		void persist(next);
	};
	const save = async (lifecycle: EntityState) => {
		if (saving.current || unavailable) return;
		saving.current = true;
		setBusy(true);
		setError(undefined);
		setErrors([]);
		try {
			validateValues(type.fields, current.current.draft, lifecycle === 'active', current.current.baseValues);
			// Ensure older recovery writes cannot land after the committed save's cleanup.
			await pendingDraft.current.catch(() => {});
			const receipt = current.current.creating
				? await application.commands.create({
						operationId: current.current.entityId,
						typeId: type.id,
						values: current.current.draft,
						lifecycle,
						templateId: current.current.templateId,
					})
				: await application.commands.save({
						operationId: operationId.current,
						session: current.current,
						lifecycle,
					});
			done.current = true;
			if (current.current.creating)
				await application.commands
					.discardDraft(current.current.id)
					.catch((error) => console.warn('[HUHU archives draft cleanup]', error));
			if (alive.current) committed(receipt);
		} catch (error) {
			if (alive.current) {
				const win = owner.ownerDocument.defaultView;
				if (win) reportOperationFailure(win, 'archives', 'archives.saveFailed');
				setError(error);
				const fields = error instanceof ArchiveError ? error.fields : [];
				setErrors(fields);
				if (fields.length)
					queueMicrotask(() => {
						if (!alive.current) return;
						const field = Array.from(owner.querySelectorAll<HTMLElement>('[data-field-id]')).find(
							(node) => node.dataset.fieldId === fields[0],
						);
						field?.querySelector<HTMLElement>('input,textarea,button')?.focus();
						field?.scrollIntoView({ block: 'nearest' });
					});
			}
		} finally {
			saving.current = false;
			if (alive.current) setBusy(false);
		}
	};
	return (
		<div
			data-archive-editor
			data-archive-dirty={session.creating || session.dirtyFields.length > 0}
			className="relative space-y-5"
		>
			<h2 className="text-xl font-semibold">{session.creating ? at('newRecord') : displayLabel(type)}</h2>
			<p className="break-all text-xs text-muted-foreground">
				{session.entityId} · {session.schemaRevisionId}
			</p>
			<ErrorBox error={error} />
			{unavailable && <Notice tone="warning" title={at('incomplete')} />}
			{notice && (
				<p role="status" className="text-sm">
					{notice}
				</p>
			)}
			<fieldset disabled={busy || unavailable} className="space-y-4">
				<Select
					label={at('formPicker')}
					value={formId}
					options={[['', at('all')], ...forms.map((form) => [form.id, displayLabel(form)] as const)]}
					onChange={setFormId}
				/>
				<ValueForm
					fields={type.fields}
					readOnlyFields={type.id === BELONGING_TYPE_ID ? new Set(BELONGING_FIELDS) : undefined}
					values={session.draft}
					form={forms.find((form) => form.id === formId)}
					onChange={change}
					errors={errors}
					app={app}
				/>
				<div className="sticky bottom-0 z-10 space-y-3 border-t border-border bg-card p-4 shadow-[var(--hu-shadow-card)]">
					{(session.creating || session.dirtyFields.length > 0) && (
						<Notice title={at('unsavedTitle')}>{at('unsavedDescription')}</Notice>
					)}
					<div className="flex flex-wrap gap-2">
						<Button
							busy={busy}
							onClick={() => {
								void save('active');
							}}
						>
							{at('saveActive')}
						</Button>
						{session.creating || frontmatter(session.baseRaw)['huhu-type'] === ENTITY_TAG ? (
							<Button
								variant="secondary"
								onClick={() => {
									void save('draft');
								}}
							>
								{at('saveDraft')}
							</Button>
						) : null}
						<Button
							variant="secondary"
							onClick={() => {
								void persist(current.current).then(
									() => {
										if (alive.current) setNotice(at('draftSaved'));
									},
									() => {},
								);
							}}
						>
							{at('keepDraft')}
						</Button>
						<Button
							variant="secondary"
							onClick={() => {
								void leave().then((allowed) => {
									if (allowed && alive.current) cancel();
								});
							}}
						>
							{ct('cancel')}
						</Button>
						<Button
							variant="secondary"
							onClick={() => {
								void confirm(at('discardDraft'), at('discardDraft'))
									.then(async (accepted) => {
										if (!accepted || !alive.current) return;
										const discarded = current.current.id;
										await pendingDraft.current.catch(() => {});
										await application.commands.discardDraft(discarded);
										if (!alive.current || current.current.id !== discarded) return;
										done.current = true;
										cancel();
									})
									.catch((error) => {
										if (alive.current) setError(error);
									});
							}}
						>
							{at('discardDraft')}
						</Button>
					</div>
				</div>
			</fieldset>
		</div>
	);
}
