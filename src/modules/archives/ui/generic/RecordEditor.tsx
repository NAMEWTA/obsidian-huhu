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
import { at, ct, Button, ErrorBox, Select, confirmAt } from './common';
import { ValueForm } from './FieldRenderer';

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
		operationId = useRef(crypto.randomUUID());
	const persist = useCallback(
		(snapshot: FormSession) => {
			const operation = application.commands.saveDraft(snapshot);
			pendingDraft.current = operation;
			void operation.catch((error) => {
				if (alive.current) setError(error);
			});
			return operation;
		},
		[application],
	);
	const leave = useCallback(async () => {
		if (done.current || (current.current.dirtyFields.length === 0 && !current.current.creating)) return true;
		if (!(await confirmAt(owner, at('dirtyPrompt'), at('keepDraft')))) return false;
		try {
			await persist(current.current);
			return true;
		} catch (error) {
			if (alive.current) setError(error);
			return false;
		}
	}, [owner, persist]);
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
			committed(receipt);
		} catch (error) {
			if (alive.current) {
				setError(error);
				const fields = error instanceof ArchiveError ? error.fields : [];
				setErrors(fields);
				if (fields.length)
					queueMicrotask(() => {
						const field = Array.from(owner.querySelectorAll<HTMLElement>('[data-field-id]')).find(
							(node) => node.dataset.fieldId === fields[0],
						);
						field?.querySelector<HTMLElement>('input,textarea,button')?.focus();
						field?.scrollIntoView({ block: 'nearest' });
					});
			}
		} finally {
			if (alive.current) setBusy(false);
		}
	};
	return (
		<div className="space-y-4">
			<h2 className="text-xl font-semibold">{session.creating ? at('newRecord') : type.label}</h2>
			<p className="break-all text-xs text-muted-foreground">
				{session.entityId} · {session.schemaRevisionId}
			</p>
			<ErrorBox error={error} />
			{notice && (
				<p role="status" className="text-sm">
					{notice}
				</p>
			)}
			<fieldset disabled={busy} className="space-y-4">
				<Select
					label={at('formPicker')}
					value={formId}
					options={[['', at('all')], ...forms.map((form) => [form.id, form.label] as const)]}
					onChange={setFormId}
				/>
				<ValueForm
					fields={type.fields}
					values={session.draft}
					form={forms.find((form) => form.id === formId)}
					onChange={change}
					errors={errors}
					app={app}
				/>
				<div className="flex flex-wrap gap-2">
					<Button
						onClick={() => {
							void save('active');
						}}
					>
						{at('saveActive')}
					</Button>
					{session.creating || frontmatter(session.baseRaw)['huhu-type'] === ENTITY_TAG ? (
						<Button
							variant="outline"
							onClick={() => {
								void save('draft');
							}}
						>
							{at('saveDraft')}
						</Button>
					) : null}
					<Button
						variant="outline"
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
						variant="outline"
						onClick={() => {
							void leave().then((allowed) => {
								if (allowed) cancel();
							});
						}}
					>
						{ct('cancel')}
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							void confirmAt(owner, at('discardDraft'), at('discardDraft'))
								.then(async (accepted) => {
									if (!accepted) return;
									await pendingDraft.current.catch(() => {});
									await application.commands.discardDraft(current.current.id);
									done.current = true;
									cancel();
								})
								.catch(setError);
						}}
					>
						{at('discardDraft')}
					</Button>
				</div>
			</fieldset>
		</div>
	);
}
