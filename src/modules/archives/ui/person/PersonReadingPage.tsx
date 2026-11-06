/** Reading layout adapted from yeshimei/bz (MIT), commit
 * d76a0870329403247917a00c43019e203a2560a4, src/people/render.ts and src/people/ui.ts.
 * Copyright (c) 2026 叫我包仔
 * HUHU: schema-based profile, independent relations, stable IDs and owner journal commands;
 * no materials, portraits or AI workflow. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { App } from 'obsidian';
import type { ArchivesApplication } from '../../services/generic/application';
import type { ArchiveTypeDefinition, EntitySummary } from '../../core/schema/model';
import { at, ct, Button } from '../generic/common';
import { RecordValues } from '../generic/FieldRenderer';
import { RelationPanel } from '../generic/RelationPanel';
import { Diagnostics } from '../generic/RecoveryPanel';
import { PersonJournal } from './PersonJournal';
import { PersonOverview } from './PersonOverview';
import { type Leave } from './common';
import { SegmentedControl } from '../../../../ui/components/huhu/SegmentedControl';

const views = ['overview', 'profile', 'relations', 'journal'] as const;
export default function PersonReadingPage({
	application,
	entity,
	type,
	app,
	owner,
	guard,
	back,
	edit,
	open,
	source,
	resources,
	actions,
}: {
	application: ArchivesApplication;
	entity: EntitySummary;
	type: ArchiveTypeDefinition;
	app: App;
	owner: HTMLElement;
	guard(this: void, leave?: Leave): void;
	back(this: void): void;
	edit(this: void): void;
	open(this: void, id: string): void;
	source(this: void): void;
	resources?: ReactNode;
	actions?: ReactNode;
}) {
	const unavailable =
		!application.runtime.ready ||
		application.runtime.loading ||
		application.catalog.snapshot().diagnostics.some((item) => item.code === 'read-failed');
	const [view, setView] = useState<(typeof views)[number]>('overview');
	const childLeave = useRef<Leave | undefined>(undefined);
	const relay = useCallback((leave?: Leave) => {
		childLeave.current = leave;
	}, []);
	const canLeave = useCallback(async () => !childLeave.current || (await childLeave.current()), []);
	useEffect(() => {
		guard(canLeave);
		return () => guard(undefined);
	}, [guard, canLeave]);
	const switchView = async (next: typeof view) => {
		if (next !== view && (await canLeave())) setView(next);
	};
	return (
		<article
			data-person-id={entity.id}
			className="min-w-0 space-y-4 break-words"

			aria-busy={application.runtime.loading}
		>
			{application.runtime.loading && <p role="status">{ct('loading')}</p>}
			{unavailable && !application.runtime.loading && (
				<p role="alert" className="text-sm text-destructive">
					{at('person.readUnavailable')}
				</p>
			)}
			<Button variant="secondary" onClick={back}>
				{ct('back')}
			</Button>
			<header className="flex min-w-0 flex-wrap items-start gap-3">
				<div
					aria-hidden="true"
					className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold"
				>
					{Array.from(entity.name)[0] || '?'}
				</div>
				<div className="min-w-0 flex-1">
					<h2 className="break-words text-2xl font-semibold">{entity.name}</h2>
					<p className="break-all text-xs text-muted-foreground">
						{entity.id} · {at(entity.lifecycle)} · {entity.schemaRevisionId}
					</p>
				</div>
			</header>
			<div className="flex flex-wrap gap-2">
				<Button
					disabled={unavailable}
					onClick={() => {
						void canLeave().then((allowed) => {
							if (allowed) edit();
						});
					}}
				>
					{ct('edit')}
				</Button>
				<Button variant="secondary" onClick={source}>
					{at('openRaw')}
				</Button>
				{actions}
			</div>
			<SegmentedControl
				ariaLabel={at('person.views')}
				value={view}
				options={views.map((item) => ({ value: item, label: at(`person.${item}`) }))}
				onChange={(value) => {
					void switchView(value);
				}}
			/>
			<fieldset disabled={unavailable} className="m-0 min-w-0 space-y-4 border-0 p-0">
				<section aria-label={at(`person.${view}`)} className="min-w-0 space-y-4">
					{view === 'overview' && (
						<>
							<h3 className="font-semibold">{at('person.overview')}</h3>
							<p className="text-sm text-muted-foreground">{at('person.overviewHint')}</p>
							<PersonOverview
								application={application}
								entity={entity}
								journal={() => {
									void switchView('journal');
								}}
								relations={() => {
									void switchView('relations');
								}}
								open={open}
							/>
							<Diagnostics
								items={[...entity.diagnostics, ...application.catalog.snapshot().diagnostics]}
								app={app}
								owner={owner}
							/>
						</>
					)}
					{view === 'profile' && (
						<>
							<h3 className="font-semibold">{at('person.profile')}</h3>
							<RecordValues
								type={{ ...type, fields: type.fields.filter((field) => field.fieldId !== 'journal') }}
								values={entity.values}
							/>
							<details className="min-w-0">
								<summary className="cursor-pointer py-3 text-sm font-medium">
									{at('person.more')}
								</summary>
								<div className="min-w-0 space-y-3">{resources}</div>
							</details>
						</>
					)}
					{view === 'relations' && (
						<RelationPanel
							application={application}
							entity={entity}
							app={app}
							owner={owner}
							guard={relay}
							open={open}
						/>
					)}
					{view === 'journal' && (
						<PersonJournal
							application={application}
							entity={entity}
							type={type}
							owner={owner}
							guard={relay}
							open={open}
						/>
					)}
				</section>
			</fieldset>
		</article>
	);
}
