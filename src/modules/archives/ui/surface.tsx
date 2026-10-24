// Layout adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/settings/SettingsFormControls.tsx
import { Button } from '../../../ui/components/button';
import { useRef, useState } from 'react';
import { useT } from '../../../ui/react/hooks';
import { Input } from '../../../ui/components/input';
import type { ArchiveRecord } from '../core/model';
import { ct } from './labels';
import type { ContactsPanelHost } from './panel-contract';
import { Action, Chip, Icon, Monogram, Pager } from './ContactsPrimitives';
import { ArchiveCardGrid } from './ArchiveCardGrid';
import { RecordDetail } from './RecordDetail';

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
function SearchField({ label, value, onSearch }: { label: string; value: string; onSearch: (value: string) => void }) {
	const composing = useRef(false);
	const [draft, setDraft] = useState(value),
		[previous, setPrevious] = useState(value);
	if (value !== previous) {
		setPrevious(value);
		setDraft(value);
	}
	return (
		<div className="relative min-w-48 flex-1">
			<Icon name="search" className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
			<Input
				className="pl-8"
				type="search"
				aria-label={label}
				placeholder={label}
				value={draft}
				onCompositionStart={() => {
					composing.current = true;
				}}
				onCompositionEnd={(event) => {
					composing.current = false;
					setDraft(event.currentTarget.value);
					onSearch(event.currentTarget.value);
				}}
				onChange={(event) => {
					setDraft(event.currentTarget.value);
					if (composing.current) return;
					onSearch(event.currentTarget.value);
				}}
			/>
		</div>
	);
}
function copyText(value: string, owner: Window): void {
	const clipboard = owner.navigator.clipboard;
	if (clipboard) void clipboard.writeText(value);
}
/** A company's notes section is titled "special notes"; the hit label says the same. */
function hitSource(record: ArchiveRecord, source: string): string {
	return record.kind === 'company' && source === 'notes' ? ct('companyNotes') : ct(`hit.${source}`);
}
function HitLine({ view, record, plain = false }: { view: ContactsPanelHost; record: ArchiveRecord; plain?: boolean }) {
	const { search, scope } = view.state.query;
	const hit = search.trim() ? view.controller?.index.hit(record, search, scope) : undefined;
	if (!hit) return null;
	const label = `${ct('hit', { source: hitSource(record, hit.source) })} ${hit.snippet}`;
	return plain ? (
		<span className="h-auto whitespace-normal text-left text-xs text-muted-foreground">{label}</span>
	) : (
		<Button
			variant="ghost"
			type="button"
			className="h-auto whitespace-normal text-left text-xs text-muted-foreground"
			onClick={() => view.select(record.path, hit.source)}
		>
			{label}
		</Button>
	);
}
function RecordRow({ view, record }: { view: ContactsPanelHost; record: ArchiveRecord }) {
	const person = record.kind === 'person';
	const email = person ? record.fields.emails[0] : '';
	const extra = person ? Math.max(0, record.fields.emails.length - 1) : 0;
	const phone = person ? record.fields.mobiles[0] || record.fields.phones[0] || '' : '';
	const jobs = person ? currentJobs(view, record) : '';
	const indexed = person
		? ''
		: ct('indexed', { count: view.controller?.index.members(record.id, 'current').length ?? 0 });
	const org = person ? jobs : record.fields.website;
	const emailText = email ? (extra > 0 ? `${email} +${extra}` : email) : '';
	const secondary = [org, record.fields.region].filter(Boolean).join(' · ');
	const cell = 'min-w-0 truncate text-xs text-muted-foreground';
	return (
		<div className="border-b border-border last:border-b-0" role="listitem" data-path={record.path}>
			<div className="flex items-center gap-1 pr-1">
				<Button
					variant="ghost"
					type="button"
					className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-none px-3 py-1.5 text-left font-normal"
					title={record.fields.name}
					onClick={() => view.select(record.path)}
				>
					<Monogram name={record.fields.name} size="sm" decorative />
					<span className="grid min-w-0 flex-1 items-center gap-x-3 @3xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
						<span className="flex min-w-0 flex-col">
							<span className="truncate text-sm font-medium">{record.fields.name}</span>
							<span className={`${cell} @3xl:hidden`}>{secondary || '—'}</span>
						</span>
						<span className={`${cell} hidden @3xl:block`}>{org || '—'}</span>
						<span className={`${cell} hidden @3xl:block`}>
							{person ? phone || '—' : record.fields.region || '—'}
						</span>
						<span className={`${cell} hidden @3xl:block`} title={emailText || undefined}>
							{person ? emailText || '—' : indexed}
						</span>
						<span className="hidden min-w-0 gap-1 overflow-hidden @3xl:flex">
							{record.fields.tags.map((tag) => (
								<Chip key={tag} title={tag}>
									{tag}
								</Chip>
							))}
						</span>
					</span>
				</Button>
				{email ? (
					<Button
						variant="ghost"
						type="button"
						size="icon"
						title={ct('copyEmail')}
						aria-label={ct('copyEmail')}
						onClick={(e) => copyText(email, e.currentTarget.ownerDocument.defaultView!)}
					>
						<Icon name="mail" />
					</Button>
				) : (
					<span className="size-9 shrink-0" aria-hidden="true" />
				)}
				{!!view.controller?.index.issues(record).length && <Chip>{ct('problem')}</Chip>}
			</div>
			<HitLineWrap view={view} record={record} />
		</div>
	);
}
function HitLineWrap({ view, record }: { view: ContactsPanelHost; record: ArchiveRecord }) {
	return (
		<div className="px-3 pb-1 empty:hidden">
			<HitLine view={view} record={record} />
		</div>
	);
}
export function ContactsSurface({ view }: { view: ContactsPanelHost }) {
	useT();
	const controller = view.controller;
	if (!view.enabled || !controller)
		return (
			<div className="flex min-h-40 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
				<Icon name="contact-round" className="size-8" />
				{ct('disabled')}
			</div>
		);
	const { query, selectedPath } = view.state;
	const candidate = selectedPath ? controller.index.byPath.get(selectedPath) : undefined;
	const record =
		candidate && (!view.state.selectedId || candidate.id === view.state.selectedId) ? candidate : undefined;
	const records = selectedPath ? [] : controller.index.query(query);
	const outsideFilter = record && !controller.index.query(query).some((value) => value.id === record.id);
	const pages = Math.max(1, Math.ceil(records.length / 60)),
		page = Math.min(view.state.page, pages - 1);
	const hasFilter = [query.current, query.past, query.regions, query.tags, query.relations].some(
		(values) => values.length,
	);
	return (
		<div className="@container mx-auto w-full max-w-[1712px] space-y-3 p-3 @xl:p-4">
			{selectedPath ? (
				<header className="flex items-center gap-2">
					<Action icon="arrow-left" label={ct('back')} action={() => view.back()} />
				</header>
			) : (
				<header className="flex flex-wrap items-center gap-2">
					<SearchField
						label={ct(query.kind === 'person' ? 'searchPeople' : 'searchCompanies')}
						value={query.search}
						onSearch={(value) => view.search(value)}
					/>
					<div className="ml-auto flex flex-wrap items-center justify-end gap-1">
						<div
							className="flex items-center gap-1 rounded-md border border-border p-0.5"
							role="group"
							aria-label={ct('layout')}
						>
							{(['list', 'card'] as const).map((mode) => (
								<Button
									variant="ghost"
									size="sm"
									key={mode}
									type="button"
									aria-pressed={view.state.layout[query.kind] === mode}
									className={view.state.layout[query.kind] === mode ? 'bg-accent' : ''}
									onClick={() => view.layout(mode)}
								>
									{ct(mode)}
								</Button>
							))}
						</div>
						<Button
							variant="ghost"
							size="sm"
							type="button"
							className="text-xs"
							aria-pressed={query.scope === 'fields'}
							onClick={() => view.setScope(query.scope === 'fields' ? 'record' : 'fields')}
						>
							{ct(query.scope === 'fields' ? 'scopeFields' : 'scopeRecord')}
						</Button>
						<Action icon="list-filter" label={ct('filter')} action={() => view.filters()} />
						<Action
							icon="arrow-down-wide-narrow"
							label={ct(query.sort === 'name' ? 'byName' : 'byModified')}
							action={() => view.sort()}
						/>
						<Action icon="plus" label={ct('add')} action={() => view.add(query.kind)} primary />
					</div>
				</header>
			)}
			{outsideFilter && <p role="status" className="text-sm text-muted-foreground">{ct('outsideFilter')}</p>}
			{controller.error && (
				<div
					role="alert"
					className="text-destructive flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
				>
					<Icon name="alert-triangle" className="size-4 shrink-0" />
					<span>{ct(controller.error)} </span>
					<Button variant="ghost" className="" onClick={() => void controller.reload()}>
						{ct('retry')}
					</Button>
				</div>
			)}
			{controller.loading && (
				<p role="status" className="text-xs text-muted-foreground py-4 text-sm">
					{ct('loading')}
				</p>
			)}
			{selectedPath ? (
				record ? (
					<RecordDetail key={record.id} view={view} record={record} />
				) : (
					!controller.loading && <p className="py-4 text-sm">{ct('missing')}</p>
				)
			) : (
				<>
					{hasFilter && (
						<Button variant="ghost" className="" onClick={() => view.clearFilters()}>
							<Icon name="x" />
							{ct('clear')}
						</Button>
					)}
					{view.state.layout[query.kind] === 'list' ? (
						<div
							className="mx-auto max-w-6xl overflow-hidden rounded-lg border border-border bg-card"
							role="list"
						>
							{records.slice(page * 60, page * 60 + 60).map((r) => (
								<RecordRow key={r.path} view={view} record={r} />
							))}
						</div>
					) : (
						<ArchiveCardGrid columns={view.columns}>
							{records.slice(page * 60, page * 60 + 60).map((r) => {
								const person = r.kind === 'person';
								const phone = person ? r.fields.mobiles[0] || r.fields.phones[0] || '' : '';
								const subtitle = person
									? currentJobs(view, r)
									: ct('employees', { count: controller.index.members(r.id, 'current').length });
								const meta = [phone, r.fields.region].filter(Boolean).join(' · ');
								return (
									<Button
										variant="ghost"
										className="h-auto min-w-0 flex-col items-stretch justify-start gap-1.5 whitespace-normal rounded-lg border border-border bg-card p-3 text-left font-normal [overflow-wrap:anywhere]"
										key={r.path}
										data-path={r.path}
										onClick={() =>
											view.select(
												r.path,
												view.controller?.index.hit(r, query.search, query.scope)?.source,
											)
										}
									>
										<span className="flex items-center gap-2.5">
											<Monogram name={r.fields.name} decorative />
											<span className="flex min-w-0 flex-col">
												<strong className="truncate text-sm">{r.fields.name}</strong>
												<span className="truncate text-xs text-muted-foreground">
													{subtitle || ct('noDetails')}
												</span>
											</span>
										</span>
										{meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
										{!!r.fields.tags.length && (
											<span className="flex flex-wrap gap-1">
												{r.fields.tags.slice(0, 4).map((tag) => (
													<Chip key={tag}>{tag}</Chip>
												))}
											</span>
										)}
										{!!controller.index.issues(r).length && (
											<Chip>
												<Icon name="alert-triangle" className="mr-1 size-3" />
												{ct('problem')}
											</Chip>
										)}
										<HitLine view={view} record={r} plain />
									</Button>
								);
							})}
						</ArchiveCardGrid>
					)}
					{!records.length && !controller.loading && (
						<div className="flex min-h-40 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
							<Icon
								name={
									query.search || hasFilter
										? 'search-x'
										: query.kind === 'company'
											? 'building-2'
											: 'contact-round'
								}
								className="size-8"
							/>
							<p>{ct(query.search || hasFilter ? 'noResults' : 'empty')}</p>
							<Button variant="ghost" className="" onClick={() => view.add(query.kind)}>
								{ct('add')}
							</Button>
						</div>
					)}
					{records.length > 60 && (
						<Pager
							page={page}
							pages={pages}
							count={records.length}
							go={(value) => view.page(value)}
							live
							footer
						/>
					)}
				</>
			)}
		</div>
	);
}
