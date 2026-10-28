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
import type { MigrationPreflight } from '../../core/schema/commands';
import type { ArchiveOperation } from '../../core/generic/operations';
import { validateValues } from '../../core/schema/fields';
import { canonical, copy } from '../../core/schema/value';
import { at, Button, ErrorBox, Section, confirmAt } from './common';
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
								variant="link"
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
	const [values, setValues] = useState<Values>(() => copy(entity.values)),
		[preview, setPreview] = useState(''),
		[busy, setBusy] = useState(false),
		[error, setError] = useState<unknown>();
	const revision = application.runtime.index.definition(type.id);
	const execute = async () => {
		if (!revision || preview !== canonical(values) || !(await confirmAt(owner, at('upgradeHint'), at('upgrade'))))
			return;
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
						variant="outline"
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
					<Button variant="outline" onClick={finished}>
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
	const version = useArchiveVersion(application),
		[preflight, setPreflight] = useState<MigrationPreflight>(),
		[operations, setOperations] = useState<ArchiveOperation[]>([]),
		[busy, setBusy] = useState(false),
		[error, setError] = useState<unknown>(),
		[progress, setProgress] = useState('');
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
	const inspect = async () => {
		setBusy(true);
		setError(undefined);
		try {
			setPreflight(await application.commands.preflightMigrations());
		} catch (error) {
			setError(error);
		} finally {
			setBusy(false);
		}
	};
	const migrate = async (entries: NonNullable<MigrationPreflight>['entries']) => {
		if (!entries.length || !(await confirmAt(owner, at('migrationConfirm'), at('migrate')))) return;
		setBusy(true);
		setError(undefined);
		try {
			for (let index = 0; index < entries.length; index++) {
				const entry = entries[index]!;
				setProgress(`${index + 1}/${entries.length} · ${entry.path}`);
				const operation = await application.commands.prepareMigration({
					operationId: crypto.randomUUID(),
					id: entry.id,
					expectedHash: entry.hash,
				});
				await application.commands.resumeOperation({ operationId: operation.id });
			}
			setPreflight(await application.commands.preflightMigrations());
			setProgress('');
		} catch (error) {
			setError(error);
		} finally {
			setBusy(false);
		}
	};
	const recover = async (operation: ArchiveOperation, rollback: boolean) => {
		if (rollback && !(await confirmAt(owner, at('rollbackConfirm'), at('rollback')))) return;
		setBusy(true);
		setError(undefined);
		try {
			if (rollback) await application.commands.rollbackOperation({ operationId: operation.id });
			else await application.commands.resumeOperation({ operationId: operation.id });
			setPreflight(undefined);
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
			<p className="text-sm text-muted-foreground">{at('migrationHint')}</p>
			<ErrorBox error={error} />
			{progress && (
				<p role="status" className="text-sm">
					{progress}
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<Button
					disabled={busy}
					onClick={() => {
						void inspect();
					}}
				>
					{at('preflight')}
				</Button>
				<Button
					variant="outline"
					disabled={busy || !preflight?.entries.some((entry) => !entry.diagnostics.length)}
					onClick={() => {
						void migrate(preflight!.entries.filter((entry) => !entry.diagnostics.length));
					}}
				>
					{at('migrateAll')}
				</Button>
			</div>
			{preflight && (
				<Section title={at('preflight')}>
					<div className="flex flex-wrap gap-4 text-sm">
						<span>
							{at('v1')}: {preflight.legacy}
						</span>
						<span>
							{at('v2')}: {preflight.v2}
						</span>
						<span>
							{at('rows')}: {preflight.relations}
						</span>
						<span>
							{at('manualRows')}: {preflight.manualRows}
						</span>
						<span>
							{at('blocked')}: {preflight.blocked}
						</span>
					</div>
					{preflight.entries.map((entry) => (
						<div
							key={entry.path}
							className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
						>
							<div className="min-w-0">
								<p className="break-all text-sm">{entry.path}</p>
								<p className="text-xs text-muted-foreground">
									{at('rows')}: {entry.rows} · {at('manualRows')}: {entry.manualRows} ·{' '}
									{at('blocked')}: {entry.diagnostics.length}
								</p>
							</div>
							<Button
								variant="outline"
								disabled={busy || !!entry.diagnostics.length}
								onClick={() => {
									void migrate([entry]);
								}}
							>
								{at('migrate')}
							</Button>
						</div>
					))}
				</Section>
			)}
			<Section title={at('operations')}>
				{operations.map((operation) => (
					<article key={operation.id} className="space-y-2 rounded-md border p-3">
						<p className="break-all text-sm">{operation.owner.path}</p>
						<p className="break-all text-xs">
							{operation.id} · {at(`state-${operation.state}`)}
						</p>
						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
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
								variant="outline"
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
