/** PERSON-READING overview follows UI-001 final: recent journal and independent relation summaries. */
import { useEffect, useState } from 'react';
import type { ArchivesApplication } from '../../services/generic/application';
import type { EntitySummary, RelationResult } from '../../core/schema/model';
import { journalRows } from '../../core/person-journal/journal';
import { at, ct, Button, displayRelationLabel } from '../generic/common';
import { useArchiveVersion } from '../generic/hooks';

export function PersonOverview({
	application,
	entity,
	journal,
	relations,
	open,
}: {
	application: ArchivesApplication;
	entity: EntitySummary;
	journal(this: void): void;
	relations(this: void): void;
	open(this: void, id: string): void;
}) {
	const version = useArchiveVersion(application);
	const [result, setResult] = useState<RelationResult>(),
		[error, setError] = useState(false);
	useEffect(() => {
		let alive = true;
		void application.query.relations(entity.id).then(
			(value) => {
				if (alive) {
					setResult(value);
					setError(false);
				}
			},
			() => {
				if (alive) setError(true);
			},
		);
		return () => {
			alive = false;
		};
	}, [application, entity.id, version]);
	let recent: ReturnType<typeof journalRows> = [],
		invalid = false;
	try {
		recent = journalRows(entity.values.journal)
			.sort(
				(a, b) =>
					(typeof b.values.date === 'string' ? b.values.date : '').localeCompare(
						typeof a.values.date === 'string' ? a.values.date : '',
					) || a.rowId.localeCompare(b.rowId),
			)
			.slice(0, 3);
	} catch {
		invalid = true;
	}
	return (
		<div className="grid min-w-0 gap-4 sm:grid-cols-2">
			<section data-person-recent className="min-w-0 space-y-3 rounded-lg border bg-card py-3">
				<h3 className="font-semibold">{at('person.recent')}</h3>
				{invalid ? (
					<p role="alert">{at('person.invalid')}</p>
				) : recent.length ? (
					<ol className="space-y-2">
						{recent.map((row) => (
							<li key={row.rowId} className="min-w-0 break-words text-sm">
								<time>{typeof row.values.date === 'string' ? row.values.date : ''}</time> ·{' '}
								<span>{typeof row.values.title === 'string' ? row.values.title : at('missing')}</span>
							</li>
						))}
					</ol>
				) : (
					<p className="text-sm text-muted-foreground">{at('person.empty')}</p>
				)}
				<Button variant="outline" onClick={journal}>
					{at('person.allNotes')}
				</Button>
			</section>
			<section data-person-relations-summary className="min-w-0 space-y-3 rounded-lg border bg-card py-3">
				<h3 className="font-semibold">{at('person.relationships')}</h3>
				{error ? (
					<p role="alert">{at('person.relationsFailed')}</p>
				) : !result ? (
					<p role="status">{ct('loading')}</p>
				) : (
					<>
						{!result.isComplete && (
							<p role="status" className="text-sm">
								{at('incomplete')}
							</p>
						)}
						{result.items.length ? (
							<>
								<p className="text-sm text-muted-foreground">
									{result.items.length} · {at('person.relations')}
								</p>
								<ul className="space-y-2">
									{result.items.slice(0, 3).map((relation) => {
										const forward = relation.sourceId === entity.id,
											other = forward ? relation.targetId : relation.sourceId;
										const type = application.runtime.index.schema(
											relation.schemaRevisionId,
										)?.definition;
										return (
											<li key={relation.id} className="min-w-0 break-words text-sm">
												<span>
													{type?.kind === 'relation-type'
														? displayRelationLabel(type, forward || !type.directed)
														: relation.relationTypeId}
												</span>
												<Button
													variant="link"
													className="h-auto max-w-full whitespace-normal break-all px-0"
													onClick={() => open(other)}
												>
													{application.runtime.index.get(other)?.name ?? at('missing')} ·{' '}
													{other}
												</Button>
											</li>
										);
									})}
								</ul>
							</>
						) : (
							<p className="text-sm text-muted-foreground">{at('person.noRelations')}</p>
						)}
					</>
				)}
				<Button variant="outline" onClick={relations}>
					{at('person.viewRelationships')}
				</Button>
			</section>
		</div>
	);
}
