import { useEffect, useState } from 'react';
import type { App } from 'obsidian';
import { openNoteAt } from '../../../../host/obsidian/open-note';
import type { ArchivesApplication } from '../../services/generic/application';
import type {
	ArchiveDiagnostic,
	ArchiveTypeDefinition,
	EntitySummary,
	RelationRecord,
	RelationTypeDefinition,
	Values,
} from '../../core/schema/model';
import type { ArchiveOperation } from '../../core/generic/operations';
import { validateValues } from '../../core/schema/fields';
import { canonical, copy } from '../../core/schema/value';
import { at, Button, ErrorBox, Section, useArchiveConfirm } from './common';
import { ValueForm } from './FieldRenderer';
import { useArchiveVersion } from './hooks';
export function Diagnostics({
	items,
	app,
	owner,
}: {
	items: readonly ArchiveDiagnostic[];
	app: App;
	owner: HTMLElement;
}) {
	const [error, setError] = useState<unknown>();
	return items.length ? (
		<Section title={`${at('diagnostics')} (${items.length})`}>
			<ErrorBox error={error} />
			<ul className="space-y-2">
				{items.slice(0, 200).map((item, index) => (
					<li key={`${item.path}:${item.code}:${index}`} className="break-words text-sm">
						<code>{item.code}</code> · {item.detail || item.id}
						{item.path && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									const file = app.vault.getFileByPath(item.path);
									if (file)
										void openNoteAt(app, file, {
											owner: owner.ownerDocument.defaultView ?? undefined,
										}).catch(setError);
								}}
							>
								{item.path}
							</Button>
						)}
					</li>
				))}
			</ul>
		</Section>
	) : null;
}
export function UpgradePanel({
	application,
	entity,
	type,
	app,
	owner,
	finished,
}: {
	application: ArchivesApplication;
	entity: EntitySummary | RelationRecord;
	type: ArchiveTypeDefinition | RelationTypeDefinition;
	app: App;
	owner: HTMLElement;
	finished(this: void): void;
}) {
	const confirm = useArchiveConfirm(owner, entity.id);
	const [values, setValues] = useState<Values>(() => copy(entity.values)),
		[preview, setPreview] = useState(''),
		[busy, setBusy] = useState(false),
		[error, setError] = useState<unknown>();
	const revision = application.runtime.index.definition(type.id);
	const execute = async () => {
		if (!revision || preview !== canonical(values) || !(await confirm(at('upgradeHint'), at('upgrade')))) return;
		setBusy(true);
		setError(undefined);
		try {
			const operation = await application.commands.prepareUpgrade({
				operationId: crypto.randomUUID(),
				id: entity.id,
				expectedHash: entity.contentHash,
				revisionId: revision.revisionId,
				values,
			});
			await application.commands.resumeOperation({ operationId: operation.id });
			finished();
		} catch (error) {
			setError(error);
		} finally {
			setBusy(false);
		}
	};
	return (
		<Section title={at('upgrade')}>
			<p className="text-sm text-muted-foreground">{at('upgradeHint')}</p>
			<p className="break-all text-xs">
				{entity.schemaRevisionId} → {revision?.revisionId}
			</p>
			<ErrorBox error={error} />
			<fieldset disabled={busy} className="space-y-3">
				<ValueForm
					fields={type.fields}
					values={values}
					app={app}
					onChange={(id, value) => {
						const next = { ...values };
						if (value === undefined) delete next[id];
						else next[id] = value;
						setValues(next);
						setPreview('');
					}}
				/>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="secondary"
						onClick={() => {
							try {
								validateValues(type.fields, values, entity.lifecycle === 'active', entity.values);
								setPreview(canonical(values));
								setError(undefined);
							} catch (error) {
								setError(error);
							}
						}}
					>
						{at('preview')}
					</Button>
					<Button
						disabled={!preview || !revision}
						onClick={() => {
							void execute();
						}}
					>
						{at('upgrade')}
					</Button>
					<Button variant="secondary" onClick={finished}>
						{at('clear')}
					</Button>
				</div>
			</fieldset>
		</Section>
	);
}
export function RecoveryPanel({
	application,
	app,
	owner,
}: {
	application: ArchivesApplication;
	app: App;
	owner: HTMLElement;
}) {
	const confirm = useArchiveConfirm(owner);
	const version = useArchiveVersion(application),
		[operations, setOperations] = useState<ArchiveOperation[]>([]),
		[busy, setBusy] = useState(false),
		[error, setError] = useState<unknown>();
	useEffect(() => {
		let alive = true;
		void application.commands.operations().then(
			(value) => {
				if (alive) setOperations(value);
			},
			(error) => {
				if (alive) setError(error);
			},
		);
		return () => {
			alive = false;
		};
	}, [application, version]);
	const recover = async (operation: ArchiveOperation, rollback: boolean) => {
		if (rollback && !(await confirm(at('rollbackConfirm'), at('rollback')))) return;
		setBusy(true);
		setError(undefined);
		try {
			if (rollback) await application.commands.rollbackOperation({ operationId: operation.id });
			else await application.commands.resumeOperation({ operationId: operation.id });
		} catch (error) {
			setError(error);
		} finally {
			setBusy(false);
		}
	};
	const diagnostics = application.catalog.snapshot().diagnostics;
	return (
		<div className="space-y-4">
			<h2 className="text-xl font-semibold">{at('recovery')}</h2>
			<p className="text-sm text-muted-foreground">{at('recoveryHint')}</p>
			<ErrorBox error={error} />
			<Section title={at('operations')}>
				{operations.map((operation) => (
					<article key={operation.id} className="space-y-2 rounded-md border p-3">
						<p className="break-all text-sm">{operation.owner.path}</p>
						<p className="break-all text-xs">
							{operation.id} · {at(`state-${operation.state}`)}
						</p>
						<div className="flex flex-wrap gap-2">
							<Button
								variant="secondary"
								disabled={
									busy || ['committed', 'rolling-back', 'rolled-back'].includes(operation.state)
								}
								onClick={() => {
									void recover(operation, false);
								}}
							>
								{at('resume')}
							</Button>
							<Button
								variant="secondary"
								disabled={busy || operation.state === 'rolled-back'}
								onClick={() => {
									void recover(operation, true);
								}}
							>
								{at('rollback')}
							</Button>
						</div>
					</article>
				))}
			</Section>
			<Diagnostics items={diagnostics} app={app} owner={owner} />
		</div>
	);
}
