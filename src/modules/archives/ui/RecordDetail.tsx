// Layout follows the common contacts/CRM record page (Google Contacts, Monica, Twenty): compact header, a
// label/value profile column and tabbed sections. Layout reference only; no third-party code.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../../ui/components/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../../../ui/components/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/components/tabs';
import type { ArchiveRecord, EntityRef } from '../core/model';
import { ct, relationDescription } from './labels';
import type { ContactsPanelHost } from './panel-contract';
import { Action, Chip, Icon, Monogram, Pager } from './ContactsPrimitives';
import { ResourceList } from './ResourceList';

function Markdown({ view, text, path }: { view: ContactsPanelHost; text: string; path: string }) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const host = ref.current;
		if (!host || !text.trim()) return;
		return view.mountMarkdown(host, text, path);
	}, [view, text, path]);
	return <div className="huhu-native markdown-rendered" ref={ref} />;
}
/** One quiet line replacing an empty section: says nothing is recorded and offers the add action. */
function EmptyRow({ onAdd, disabled, label }: { onAdd?: () => void; disabled?: boolean; label?: string }) {
	return (
		<div className="flex items-center justify-between gap-2 py-2 text-xs text-muted-foreground">
			<span>{ct('noDetails')}</span>
			{onAdd && (
				<Button variant="ghost" size="sm" disabled={disabled} onClick={onAdd}>
					<Icon name="plus" />
					{label ?? ct('add')}
				</Button>
			)}
		</div>
	);
}
function RefLink({ view, source, target }: { view: ContactsPanelHost; source: ArchiveRecord; target: EntityRef }) {
	const record = view.controller?.index.resolve(target, source);
	return record ? (
		<Button
			variant="ghost"
			className="h-auto whitespace-normal p-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
			onClick={() => view.select(record.path)}
		>
			{record.fields.name}
		</Button>
	) : (
		<span className="text-xs text-muted-foreground" title={ct('missing')}>
			{target.label || ct('none')} {target.label ? '· ' + ct('missing') : ''}
		</span>
	);
}
function People({
	view,
	records,
	companyId,
	status = 'current',
	keyOnly = false,
}: {
	view: ContactsPanelHost;
	records: ArchiveRecord[];
	companyId: string;
	status?: 'current' | 'past';
	keyOnly?: boolean;
}) {
	const [requestedPage, setPage] = useState(0);
	const pages = Math.max(1, Math.ceil(records.length / 60));
	const page = Math.min(requestedPage, pages - 1);
	return records.length ? (
		<>
			<div className="grid gap-x-4 @xl:grid-cols-2">
				{records.slice(page * 60, page * 60 + 60).map((r) => (
					<Button
						variant="ghost"
						className="h-auto justify-start gap-3 whitespace-normal px-1 py-1.5 text-left"
						key={r.path}
						onClick={() => view.select(r.path)}
					>
						<Monogram name={r.fields.name} size="sm" decorative />
						<span className="flex min-w-0 flex-col items-start">
							<span className="text-sm font-medium">{r.fields.name}</span>
							<span className="text-xs font-normal text-muted-foreground">
								{r.employments
									.filter(
										(job) =>
											job.company.id === companyId &&
											job.status === status &&
											(!keyOnly || !!job.keyRole),
									)
									.map((job) =>
										[job.title, job.keyRole ? ct(job.keyRole) : ''].filter(Boolean).join(' · '),
									)
									.join(' / ')}
							</span>
						</span>
					</Button>
				))}
			</div>
			{pages > 1 && <Pager page={page} pages={pages} count={records.length} go={setPage} />}
		</>
	) : (
		<EmptyRow />
	);
}
function currentJobs(view: ContactsPanelHost, record: ArchiveRecord): string {
	return record.employments
		.filter((job) => job.status === 'current')
		.map((job) =>
			[view.controller?.index.resolve(job.company, record)?.fields.name ?? job.company.label, job.title]
				.filter(Boolean)
				.join(' · '),
		)
		.filter(Boolean)
		.join(' / ');
}
interface TabSpec {
	id: string;
	label: string;
	count?: number;
	/** Nothing recorded: the body already offers an add row, so the toolbar action is hidden. */
	empty?: boolean;
	action?: { icon: string; label: string; run: () => void };
	body: ReactNode;
}
function RowActions({ children }: { children: ReactNode }) {
	return <div className="flex shrink-0 items-center">{children}</div>;
}

export function RecordDetail({ view, record }: { view: ContactsPanelHost; record: ArchiveRecord }) {
	const controller = view.controller!;
	const index = controller.index;
	const issues = index.issues(record),
		blocked = issues.length > 0;
	const edit = (scope: Parameters<ContactsPanelHost['edit']>[1], id?: string) => { if (scope === 'employment' || scope === 'relation') view.openGeneric?.(record.path); else view.edit(record, scope, id); };
	const rows = (
		['mobiles', 'phones', 'emails', 'wechat', 'region', 'website', 'aliases', 'birthday', 'birthplace'] as const
	)
		.map((key) => [key, record.fields[key]] as const)
		.filter(([, value]) => (Array.isArray(value) ? value.length : value));
	const bodyLine = index.hit(record, view.state.query.search, view.state.query.scope)?.line;
	const isCompany = record.kind === 'company';
	const members = isCompany ? index.members(record.id, 'current') : [];
	const pastMembers = isCompany ? index.members(record.id, 'past') : [];
	const keyPeople = members.filter((person) =>
		person.employments.some((j) => j.company.id === record.id && j.status === 'current' && !!j.keyRole),
	);
	const relations = record.kind === 'person' ? index.relationsFor(record.id) : [];
	const resourceCount = blocked ? 0 : view.resources(record).length;
	const f = record.fields;
	const subtitle = isCompany ? '' : currentJobs(view, record);
	const quick = [
		{ icon: 'phone', value: f.mobiles[0] || f.phones[0] || '' },
		{ icon: 'mail', value: f.emails[0] || '' },
		{ icon: 'globe', value: f.website },
		{ icon: 'map-pin', value: f.region },
	].filter((item) => item.value);
	const prose = (key: 'traits' | 'habits' | 'notes'): TabSpec => {
		const has = !!record.prose[key].trim();
		return {
			id: key,
			empty: !has,
			label: ct(key === 'notes' && isCompany ? 'companyNotes' : key),
			action: { icon: has ? 'pencil' : 'plus', label: ct(has ? 'edit' : 'add'), run: () => edit(key) },
			body: has ? (
				<Markdown view={view} text={record.prose[key]} path={record.path} />
			) : (
				<EmptyRow onAdd={() => edit(key)} disabled={blocked} />
			),
		};
	};
	const tabs: TabSpec[] = isCompany
		? [
				{
					id: 'keyPeople',
					label: ct('keyPeople'),
					count: keyPeople.length,
					body: <People key={record.id} companyId={record.id} keyOnly view={view} records={keyPeople} />,
				},
				{
					id: 'members',
					label: ct('currentPeople'),
					count: members.length,
					body: <People key={record.id} companyId={record.id} view={view} records={members} />,
				},
				{
					id: 'past',
					label: ct('pastPeople'),
					count: pastMembers.length,
					body: (
						<People key={record.id} companyId={record.id} view={view} status="past" records={pastMembers} />
					),
				},
				prose('notes'),
			]
		: [
				{
					id: 'employment',
					label: ct('employments'),
					count: record.employments.length,
					empty: !record.employments.length,
					action: { icon: 'plus', label: ct('add'), run: () => edit('employment') },
					body: record.employments.length ? (
						<div>
							{[...record.employments]
								.sort((a, b) => b.start.localeCompare(a.start))
								.map((job) => (
									<div
										className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
										key={job.id}
									>
										<div className="min-w-0 flex-1 space-y-0.5">
											<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
												<RefLink view={view} source={record} target={job.company} />
												<Chip tone={job.status === 'current' ? 'primary' : 'default'}>
													{ct(job.status)}
												</Chip>
												{job.keyRole && <Chip tone="info">{ct(job.keyRole)}</Chip>}
											</div>
											<p className="text-xs text-muted-foreground">
												{[
													[job.department, job.title].filter(Boolean).join(' · '),
													`${job.start || '—'} → ${job.end || (job.status === 'current' ? ct('current') : '—')}`,
												]
													.filter(Boolean)
													.join(' · ')}
											</p>
											{job.notes && <p className="whitespace-pre-wrap text-sm">{job.notes}</p>}
										</div>
										<RowActions>
											<Action
												icon="pencil"
												label={ct('edit')}
												action={() => edit('employment', job.id)}
												disabled={blocked}
											/>
											<Action
												icon="trash-2"
												label={ct('delete')}
												action={() => view.openGeneric?.(record.path)}
												disabled={blocked}
											/>
										</RowActions>
									</div>
								))}
						</div>
					) : (
						<EmptyRow onAdd={() => edit('employment')} disabled={blocked} />
					),
				},
				{
					id: 'relation',
					label: ct('relations'),
					count: relations.length,
					empty: !relations.length,
					action: { icon: 'plus', label: ct('add'), run: () => edit('relation') },
					body: relations.length ? (
						<div>
							{relations.map((entry) => (
								<div
									className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
									key={entry.owner.path + entry.relation.id + String(entry.inverse)}
								>
									<div className="min-w-0 flex-1 space-y-0.5">
										<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
											{entry.other ? (
												<Button
													variant="ghost"
													className="h-auto whitespace-normal p-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
													onClick={() => view.select(entry.other!.path)}
												>
													{entry.other.fields.name}
												</Button>
											) : (
												<span className="text-sm">
													{entry.relation.person.label} · {ct('missing')}
												</span>
											)}
											<Chip tone="primary">
												{relationDescription(entry.relation, entry.inverse, entry.owner)}
											</Chip>
										</div>
										{(entry.inverse || entry.relation.company.label) && (
											<p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
												{entry.inverse && <span>{ct('incoming')}</span>}
												{entry.relation.company.label && (
													<RefLink
														view={view}
														source={entry.owner}
														target={entry.relation.company}
													/>
												)}
											</p>
										)}
										{entry.relation.notes && (
											<p className="whitespace-pre-wrap text-sm">{entry.relation.notes}</p>
										)}
									</div>
									<RowActions>
										<Action
											icon="pencil"
											label={ct('edit')}
											action={() => view.edit(entry.owner, 'relation', entry.relation.id)}
											disabled={!!index.issues(entry.owner).length}
										/>
										<Action
											icon="trash-2"
											label={ct('delete')}
											action={() => view.openGeneric?.(entry.owner.path)}
											disabled={!!index.issues(entry.owner).length}
										/>
									</RowActions>
								</div>
							))}
						</div>
					) : (
						<EmptyRow onAdd={() => edit('relation')} disabled={blocked} />
					),
				},
				prose('traits'),
				prose('habits'),
				prose('notes'),
			];
	if (!blocked)
		tabs.push({
			id: 'resources',
			label: ct('resourcesTab'),
			count: resourceCount,
			body: <ResourceList key={record.id} view={view} record={record} />,
		});
	const firstFilled = tabs.find((tab) => tab.count && tab.id !== 'resources')?.id;
	const [tab, setTab] = useState(
		tabs.some((candidate) => candidate.id === view.state.focus) ? view.state.focus : (firstFilled ?? tabs[0]!.id),
	);
	const active = tabs.find((candidate) => candidate.id === tab) ?? tabs[0]!;
	return (
		<article className="@container mx-auto w-full max-w-5xl space-y-3">
			<header className="flex items-center gap-3">
				<Monogram name={f.name} size="lg" decorative />
				<div className="min-w-0 flex-1 space-y-0.5">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<h2 className="text-lg font-semibold leading-tight">{f.name}</h2>
						<Chip tone="primary">{ct(record.kind)}</Chip>
					</div>
					{subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
					{!!quick.length && (
						<p className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
							{quick.map((item) => (
								<span key={item.icon} className="inline-flex min-w-0 items-center gap-1">
									<Icon name={item.icon} className="size-3.5" />
									<span className="truncate">{item.value}</span>
								</span>
							))}
						</p>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Action
						icon="pencil"
						label={ct('edit')}
						action={() => view.edit(record, 'basic')}
						disabled={blocked}
					/>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" aria-label={ct('more')}>
								<Icon name="more-horizontal" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{view.recordActions(record).map((action) => (
								<DropdownMenuItem key={action.title} disabled={action.disabled} onSelect={action.run}>
									<Icon name={action.icon} />
									{action.title}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>
			{view.openGeneric && <Button variant="outline" onClick={() => view.openGeneric?.(record.path)}>{ct('independentRelations')}</Button>}
			{view.openGeneric && <Button variant="outline" onClick={() => view.openGeneric?.(record.path)}>{ct('migrateLegacy')}</Button>}
			<p className="text-sm text-muted-foreground">{ct('migrationRequired')}</p>
			{view.state.focus === 'body' && (
				<p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
					{bodyLine ? ct('bodyHint', { line: bodyLine }) : ct('bodyHintUnmapped')}
					<Button
						variant="ghost"
						size="sm"
						type="button"
						onClick={() => view.openResource(record.path, bodyLine)}
					>
						{ct('source')}
					</Button>
				</p>
			)}
			{blocked && (
				<div
					role="alert"
					className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive"
				>
					<Icon name="alert-triangle" className="mt-0.5 size-4 shrink-0" />
					<span>
						{ct('problem')}
						{issues.map((key) => ct(key)).join(' ')}
					</span>
				</div>
			)}
			<div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_17rem]">
				<Tabs value={active.id} onValueChange={setTab} className="order-2 min-w-0 gap-1 @3xl:order-1">
					<div className="flex items-center justify-between gap-2 border-b border-border">
						<TabsList
							variant="line"
							className="h-9 min-w-0 flex-1 justify-start gap-0 overflow-x-auto p-0 scrollbar-none"
						>
							{tabs.map((spec) => (
								<TabsTrigger key={spec.id} value={spec.id} className="flex-none px-3">
									{spec.label}
									{spec.count !== undefined && (
										<span className="text-xs font-normal text-muted-foreground">{spec.count}</span>
									)}
								</TabsTrigger>
							))}
						</TabsList>
						{active.action && !(active.empty ?? false) && (
							<Action
								icon={active.action.icon}
								label={active.action.label}
								action={active.action.run}
								disabled={blocked}
							/>
						)}
					</div>
					{tabs.map((spec) => (
						<TabsContent key={spec.id} value={spec.id} className="min-w-0 pt-1">
							{spec.body}
						</TabsContent>
					))}
				</Tabs>
				<aside
					aria-label={ct('basic')}
					className="h-fit space-y-2 rounded-lg border border-border bg-card p-3 order-1 @3xl:order-2"
				>
					<div className="flex items-center justify-between gap-2">
						<h3 className="text-xs font-semibold uppercase text-muted-foreground">{ct('basic')}</h3>
						<Action icon="pencil" label={ct('editBasic')} action={() => edit('basic')} disabled={blocked} />
					</div>
					{rows.length ? (
						<dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
							{rows.map(([key, value]) => (
								<div key={key} className="contents">
									<dt className="text-xs leading-5 text-muted-foreground">
										{ct(key === 'region' && isCompany ? 'companyRegion' : key)}
									</dt>
									<dd className="break-words">{Array.isArray(value) ? value.join(' · ') : value}</dd>
								</div>
							))}
						</dl>
					) : (
						<p className="text-xs text-muted-foreground">{ct('noDetails')}</p>
					)}
					{!!f.tags.length && (
						<div className="flex flex-wrap gap-1 border-t border-border pt-2" aria-label={ct('tags')}>
							{f.tags.map((tag) => (
								<Chip key={tag}>{tag}</Chip>
							))}
						</div>
					)}
				</aside>
			</div>
		</article>
	);
}
