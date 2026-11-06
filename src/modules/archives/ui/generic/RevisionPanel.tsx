import { useEffect, useState } from 'react';
import type { ArchivesApplication } from '../../services/generic/application';
import type { DefinitionRevision } from '../../core/schema/model';
import { at, ct, Button, ErrorBox } from './common';
import { Badge } from '../../../../ui/components/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../ui/components/table';
import { useArchiveVersion } from './hooks';

/** Definition revisions remain immutable; viewing never reinterprets an entity or publishes a head. */
export function RevisionPanel({
	application,
	typeId,
	currentRevision,
}: {
	application: ArchivesApplication;
	typeId: string;
	currentRevision: string;
}) {
	const version = useArchiveVersion(application),
		[retry, setRetry] = useState(0);
	const [revisions, setRevisions] = useState<DefinitionRevision[]>(),
		[error, setError] = useState<unknown>();
	useEffect(() => {
		let active = true;
		void application.query.revisions(typeId).then(
			(value) => {
				if (active) {
					setRevisions(value);
					setError(undefined);
				}
			},
			(failure) => {
				if (active) setError(failure);
			},
		);
		return () => {
			active = false;
		};
	}, [application, typeId, version, retry]);
	return (
		<section aria-label={at('revisions')} className="min-w-0 space-y-3">
			<ErrorBox error={error} />
			{!!error && (
				<Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>
					{ct('retry')}
				</Button>
			)}
			{!revisions && !error && <p role="status">{ct('loading')}</p>}
			{revisions && (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{at('schema')}</TableHead>
							<TableHead>{at('heads')}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{revisions.map((revision) => (
							<TableRow key={revision.revisionId}>
								<TableCell>
									<span className="font-mono text-xs break-all">
										{revision.displayVersion} · {revision.revisionId}
									</span>
									{revision.revisionId === currentRevision && (
										<Badge variant="accent">{at('schema')}</Badge>
									)}
								</TableCell>
								<TableCell className="break-all text-xs">
									{revision.parentRevisionIds.join(' · ') || '—'}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</section>
	);
}
