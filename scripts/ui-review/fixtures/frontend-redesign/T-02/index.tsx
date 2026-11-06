import { forwardRef, useEffect, useState, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus } from 'lucide-react';
import { readyDocuments } from '../shared/ready-documents';
import { HuhuProviders } from '../../../../../src/ui/react/providers';
import { useOwnerDocument } from '../../../../../src/ui/react/contexts';
import { useT } from '../../../../../src/ui/react/hooks';
import { registerMessages, setLanguage, getLanguage, t } from '../../../../../src/shared/i18n';
import { messages } from '../../../../../src/shared/i18n/lazy/ui';
import { applyInterfaceTheme } from '../../../../../src/theme/runtime';
import { themeSettings } from '../../../../../src/theme/settings';
import { Button } from '../../../../../src/ui/components/button';
import { ToggleGroup, ToggleGroupItem } from '../../../../../src/ui/components/toggle-group';
import { ScrollArea } from '../../../../../src/ui/components/scroll-area';
import { Calendar, DateField } from '../../../../../src/ui/components/huhu/date';
import { Input } from '../../../../../src/ui/components/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../../src/ui/components/select';
import { Textarea } from '../../../../../src/ui/components/textarea';
import { Checkbox } from '../../../../../src/ui/components/checkbox';
import { Switch } from '../../../../../src/ui/components/switch';
import { SegmentedControl } from '../../../../../src/ui/components/huhu/SegmentedControl';
import { FormField } from '../../../../../src/ui/components/huhu/FormField';
import { Notice } from '../../../../../src/ui/components/huhu/Notice';
import { TaskContent } from '../../../../../src/ui/components/huhu/TaskContent';
import { EmptyState } from '../../../../../src/ui/components/huhu/EmptyState';
import { Toaster, toast } from '../../../../../src/ui/components/sonner';
import { DetailPane } from '../../../../../src/ui/components/huhu/DetailPane';
import { SettingsRow } from '../../../../../src/ui/components/huhu/SettingsRow';
import { SettingsSwitchRow } from '../../../../../src/ui/components/huhu/SettingsSwitchRow';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../src/ui/components/card';
import { Badge } from '../../../../../src/ui/components/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../../src/ui/components/tabs';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../../../../src/ui/components/table';
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from '../../../../../src/ui/components/dialog';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetClose } from '../../../../../src/ui/components/sheet';
import { CommandDialog, CommandInput, CommandList, CommandItem } from '../../../../../src/ui/components/command';
import { ConfirmDialog } from '../../../../../src/ui/components/huhu/ConfirmDialog';
import { Popover, PopoverTrigger, PopoverContent } from '../../../../../src/ui/components/popover';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '../../../../../src/ui/components/dropdown-menu';
import {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
} from '../../../../../src/ui/components/context-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../../../../src/ui/components/tooltip';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../../../../../src/ui/components/hover-card';
import { Tree } from '../../../../../src/ui/components/tree';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../../../../../src/ui/components/resizable';
registerMessages(messages);
const resetTrees: Record<string, () => void> = {};
const pending: Record<string, { resolve: () => void; reject: (error: Error) => void }> = {};
const state: Record<
	string,
	{
		segment: string;
		confirmations: number;
		layout: Record<string, number>;
		busyClicks: number;
		submits: number;
		dirtyMode: boolean;
		expanded: string[];
		hitClicks: number;
		neighborHits: number;
		detailMounts: number;
		detailUnmounts: number;
	}
> = {};
function stateFor(name: string) {
	const record = state[name];
	if (!record) throw new Error(`Unknown fixture document: ${name}`);
	return record;
}
const ForwardingButton = forwardRef<HTMLButtonElement, ComponentProps<'button'>>((props, ref) => (
	<button {...props} ref={ref} />
));
const lifecycleRoots: Record<string, { root: ReturnType<typeof createRoot>; host: HTMLElement }> = {};
function LifecycleDialog() {
	const t = useT();
	const [trigger, setTrigger] = useState(true);
	return (
		<Dialog>
			<Button data-review="lifecycle-fallback">{t('ui.sample')}</Button>
			{trigger && (
				<DialogTrigger asChild>
					<Button data-review="lifecycle-trigger" onClick={() => setTrigger(false)}>
						{t('ui.open')}
					</Button>
				</DialogTrigger>
			)}
			<DialogContent aria-describedby={undefined}>
				<DialogTitle>{t('ui.sample')}</DialogTitle>
				<Input aria-label={t('ui.name')} />
			</DialogContent>
		</Dialog>
	);
}
function DetailEditor({ name }: { name: string }) {
	const t = useT();
	const [draft, setDraft] = useState(t('ui.sample'));
	useEffect(() => {
		stateFor(name).detailMounts++;
		return () => {
			stateFor(name).detailUnmounts++;
		};
	}, [name]);
	return (
		<>
			<Input
				data-review="detail-draft"
				aria-label={t('ui.name')}
				value={draft}
				onChange={(event) => setDraft(event.currentTarget.value)}
			/>
			<Input data-review="detail-uncontrolled" aria-label={t('ui.text')} defaultValue={t('ui.sample')} />
			<div style={{ height: 1800 }}>
				<TaskContent title={t('ui.sample')} description={t('ui.sampleDescription')} />
			</div>
		</>
	);
}
type JoinedValue = string | number;
const joinedClicks: Record<string, Array<{ trusted: boolean; group: string; index: number }>> = {};
const joined: Record<
	string,
	Record<string, { value: JoinedValue; calls: JoinedValue[]; reset: (value: JoinedValue) => void }>
> = {};
function JoinedSample({
	name,
	id,
	count,
	icons = false,
	wrap = false,
	width,
	typed = false,
}: {
	name: string;
	id: string;
	count: number;
	icons?: boolean;
	wrap?: boolean;
	width?: number;
	typed?: boolean;
}) {
	const t = useT();
	const [value, setValue] = useState<JoinedValue>(typed ? '' : 'a');
	const samples = joined[name] ?? (joined[name] = {});
	const record = samples[id] ?? (samples[id] = { value, calls: [], reset: () => {} });
	record.value = value;
	record.reset = (next) => {
		record.calls = [];
		setValue(next);
	};
	const change = (next: JoinedValue) => {
		record.calls.push(next);
		setValue(next);
	};
	const values = typed ? ['', 1, '1', 'disabled', 'tail'] : ['a', 'b', 'c'].slice(0, count);
	const options = values.map((next, index) => ({
		value: next,
		label: typed
			? `${typeof next}:${String(next) || 'empty'}`
			: id === 'long'
				? `${t('ui.sample')} ${t(index === 0 ? 'ui.optionA' : 'ui.optionB')}`
				: ['年', '月', '日'][index],
		disabled: typed && next === 'disabled',
	}));
	return (
		<section data-joined={id} style={{ width: width ?? '100%', maxWidth: '100%', minWidth: 0, marginBlock: 24 }}>
			<h3>{t('ui.sample')}</h3>
			{icons ? (
				<ToggleGroup
					type="single"
					size="sm"
					value={String(value)}
					onValueChange={change}
					aria-label={t('ui.layout')}
				>
					{values.map((next, index) => (
						<ToggleGroupItem
							key={String(next)}
							value={String(next)}
							aria-label={`${t('ui.sample')} ${index + 1}`}
						>
							<Plus />
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			) : (
				<SegmentedControl
					value={value}
					onChange={change}
					ariaLabel={t('ui.layout')}
					wrap={wrap || typed}
					options={options}
				/>
			)}
		</section>
	);
}
function JoinedProbe({ name }: { name: string }) {
	return (
		<section data-review="joined-specimens" style={{ minWidth: 0, maxWidth: '100%', paddingBlock: 16 }}>
			<JoinedSample name={name} id="icons2" count={2} icons />
			<JoinedSample name={name} id="icons3" count={3} icons />
			<JoinedSample name={name} id="short2" count={2} />
			<JoinedSample name={name} id="short3" count={3} />
			<JoinedSample name={name} id="long" count={2} />
			<JoinedSample name={name} id="wrap84" count={3} wrap width={84} />
			<JoinedSample name={name} id="wrap100" count={3} wrap width={100} />
			<JoinedSample name={name} id="typed" count={5} typed />
		</section>
	);
}
function Probe({ name }: { name: string }) {
	const doc = useOwnerDocument();
	const [leafWidth, setLeafWidth] = useState(() => doc.documentElement.clientWidth);
	useEffect(() => {
		const measure = () => setLeafWidth(doc.documentElement.clientWidth);
		const observer = new doc.defaultView!.ResizeObserver(measure);
		observer.observe(doc.documentElement);
		measure();
		return () => observer.disconnect();
	}, [doc]);
	const t = useT();
	const [segment, setSegment] = useState('list');
	const [checked, setChecked] = useState(false);
	const [command, setCommand] = useState(false);
	const [dirty, setDirty] = useState(true);
	const [sheetDirty, setSheetDirty] = useState(true);
	const [detail, setDetail] = useState(false);
	const [selected, setSelected] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	resetTrees[name] = () => setSelected(null);
	useEffect(() => {
		stateFor(name).segment = segment;
	}, [name, segment]);
	return (
		<>
			<div style={{ display: 'flex', gap: 32, padding: 16 }}>
				<Button
					size="icon-sm"
					data-review="hit-probe"
					aria-label={t('ui.create')}
					onClick={() => stateFor(name).hitClicks++}
				>
					<Plus />
				</Button>
				<Button
					size="icon-sm"
					data-review="hit-neighbor"
					aria-label={t('ui.close')}
					onClick={() => stateFor(name).neighborHits++}
				>
					<Plus />
				</Button>
			</div>
			<header>
				<h1>HUHU</h1>
				<p>{t('ui.galleryDescription')}</p>
			</header>
			<div className="probe-grid">
				<section>
					<h2>{t('ui.buttons')}</h2>
					<div className="probe-row">
						{(['primary', 'secondary', 'ghost', 'danger', 'danger-ghost'] as const).map((variant) => (
							<Button key={variant} variant={variant} data-review={`button-${variant}`}>
								{t('ui.save')}
							</Button>
						))}
					</div>
					<div className="probe-row">
						<Button size="sm" data-review="size-sm">
							{t('ui.save')}
						</Button>
						<Button size="md" data-review="size-md">
							{t('ui.save')}
						</Button>
						<Button size="lg" data-review="size-lg">
							{t('ui.save')}
						</Button>
						<Tooltip delayDuration={0}>
							<TooltipTrigger asChild>
								<Button data-review="tooltip-trigger" size="icon-sm" aria-label={t('ui.create')}>
									<Plus />
								</Button>
							</TooltipTrigger>
							<TooltipContent>{t('ui.create')}</TooltipContent>
						</Tooltip>
						<Button disabled>{t('ui.disabled')}</Button>
						<Button data-review="busy-baseline">{t('ui.saving')}</Button>
						<Button data-review="busy" busy onClick={() => stateFor(name).busyClicks++}>
							{t('ui.saving')}
						</Button>
						<Button asChild busy>
							<ForwardingButton data-review="slot-busy">{t('ui.saving')}</ForwardingButton>
						</Button>
					</div>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							stateFor(name).submits++;
						}}
					>
						<Button asChild type="button">
							<button data-review="slot-type">{t('ui.save')}</button>
						</Button>
						<Button asChild disabled type="button">
							<ForwardingButton data-review="slot-disabled" onClick={() => stateFor(name).busyClicks++}>
								{t('ui.disabled')}
							</ForwardingButton>
						</Button>
					</form>
					<FormField label={t('ui.name')} description={t('ui.sampleDescription')} error={t('ui.renderError')}>
						<Input data-review="error-field" defaultValue={t('ui.sample')} />
					</FormField>
					<Textarea aria-label={t('ui.text')} defaultValue={t('ui.sampleDescription')} />

					<section data-review="default-focus-specimens">
						<article className="relative rounded-lg border border-[var(--hu-line)]/50 bg-[var(--hu-raised)] p-3">
							<button type="button" data-review="unstyled-agent" className="flex w-full flex-col gap-2 text-left">
								<span className="flex w-full items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{t('ui.sample')}</span></span>
								<span className="line-clamp-2 text-xs text-[var(--hu-fg-2)]">{t('ui.sampleDescription')}</span>
								<span className="block w-full truncate text-sm text-[var(--hu-fg-2)]">{t('ui.details')}</span>
							</button>
						</article>
						<button type="button" data-review="unstyled-button">{t('ui.sample')}</button>
						<button type="button" data-review="author-none" className="outline-none">{t('ui.sample')}</button>
						<button type="button" data-review="author-inset" className="outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--hu-accent)]">{t('ui.sample')}</button>
						<button type="button" data-review="author-ring" className="outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--hu-accent-soft)]">{t('ui.sample')}</button>
					</section>
					<section data-review="focus-specimens">
						<ScrollArea style={{ height: 72 }} viewportTabIndex={0}>
							<div style={{ height: 180 }}>{t('ui.sample')}</div>
						</ScrollArea>
						<DateField value="2026-11-05" onChange={() => {}} aria-label={t('ui.date.date')} />
						<div style={{ maxWidth: '100%', overflowX: 'auto', padding: 4 }}>
							<Calendar value="2026-11-05" today="2026-11-05" onChange={() => {}} />
						</div>
					</section>
					<Select defaultValue="a">
						<SelectTrigger data-review="select-trigger" aria-label={t('ui.sample')}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="a">{t('ui.optionA')}</SelectItem>
							<SelectItem data-review="select-second" value="b">
								{t('ui.optionB')}
							</SelectItem>
						</SelectContent>
					</Select>
				</section>
				<section>
					<h2>{t('ui.inputs')}</h2>
					<div className="probe-row">
						<Checkbox checked="indeterminate" aria-label={t('ui.sample')} data-review="mixed" />
						<Switch checked={checked} onCheckedChange={setChecked} aria-label={t('ui.enabled')} />
					</div>
					<div data-review="segment">
						<SegmentedControl
							value={segment}
							onChange={setSegment}
							ariaLabel={t('ui.layout')}
							options={[
								{ value: 'list', label: t('ui.optionA') },
								{ value: 'calendar', label: t('ui.optionB') },
							]}
						/>
					</div>
					<SettingsRow
						label={t('ui.name')}
						description={t('ui.sampleDescription')}
						control={<Input aria-label={t('ui.name')} />}
					/>
					<SettingsSwitchRow label={t('ui.sample')} checked busy onChange={() => {}} />
					<Tabs defaultValue="a">
						<TabsList>
							<TabsTrigger value="a">{t('ui.optionA')}</TabsTrigger>
							<TabsTrigger value="b">{t('ui.optionB')}</TabsTrigger>
						</TabsList>
						<TabsContent value="a">{t('ui.sample')}</TabsContent>
						<TabsContent value="b">{t('ui.details')}</TabsContent>
					</Tabs>
				</section>
				<Card>
					<CardHeader>
						<CardTitle>{t('ui.sample')}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="probe-row">
							{(['neutral', 'accent', 'success', 'warning', 'error'] as const).map((variant) => (
								<Badge variant={variant} key={variant}>
									{t('ui.sample')}
								</Badge>
							))}
						</div>
						<TaskContent
							title={t('ui.sample')}
							description={t('ui.sampleDescription')}
							completed
							metadata={<span data-review="task-metadata">2026-11-05</span>}
						/>
						<Notice
							tone="error"
							title={t('ui.renderError')}
							action={<Button variant="secondary">{t('ui.retry')}</Button>}
						>
							{t('ui.renderErrorDescription')}
						</Notice>
					</CardContent>
				</Card>
				<section>
					<h2>{t('ui.layout')}</h2>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t('ui.name')}</TableHead>
								<TableHead>{t('ui.number')}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<TableRow>
								<TableCell>{t('ui.sample')}</TableCell>
								<TableCell>42</TableCell>
							</TableRow>
						</TableBody>
					</Table>
					<Input
						data-review="tree-search"
						aria-label={t('ui.search')}
						value={search}
						onChange={(event) => setSearch(event.currentTarget.value)}
					/>
					<div style={{ height: 180 }}>
						<Tree
							search={search}
							onExpandedChange={(ids) => {
								stateFor(name).expanded = ids;
							}}
							ariaLabel={t('ui.layout')}
							selectedId={selected}
							onSelect={setSelected}
							defaultExpandedIds={['folder']}
							nodes={[
								{
									id: 'folder',
									label: t('ui.name'),
									actions: (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon-sm"
													aria-label={t('ui.open')}
													data-review="tree-menu-trigger"
												>
													<Plus />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent>
												<DropdownMenuItem data-review="tree-menu-item">
													{t('ui.open')}
												</DropdownMenuItem>
												<DropdownMenuItem>{t('ui.retry')}</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									),
									children: Array.from({ length: 160 }, (_, index) => ({
										id: `row-${index}`,
										label: `${t('ui.sample')} ${index}`,
									})),
								},
							]}
							virtualizeAfter={20}
						/>
					</div>
					<div style={{ height: 100 }}>
						<ResizablePanelGroup
							orientation="horizontal"
							onLayoutChange={(layout) => {
								stateFor(name).layout = layout;
							}}
						>
							<ResizablePanel id="left" defaultSize="50%" minSize="20%">
								{t('ui.optionA')}
							</ResizablePanel>
							<ResizableHandle aria-label={t('ui.resize')} />
							<ResizablePanel id="right" defaultSize="50%" minSize="20%">
								{t('ui.optionB')}
							</ResizablePanel>
						</ResizablePanelGroup>
					</div>
				</section>
			</div>
			<section className="probe-row">
				<h2>{t('ui.overlays')}</h2>
				<Dialog dirty={dirty} onDiscard={() => setDirty(false)}>
					<DialogTrigger asChild>
						<Button data-review="dirty-trigger" onClick={() => setDirty(stateFor(name).dirtyMode)}>
							{t('ui.open')}
						</Button>
					</DialogTrigger>
					<DialogContent aria-describedby={undefined}>
						<DialogTitle>{t('ui.sample')}</DialogTitle>
						<DialogDescription>{t('ui.sampleDescription')}</DialogDescription>
						<div hidden>
							<Button data-review="hidden-focus">{t('ui.save')}</Button>
						</div>
						<Input data-review="draft" aria-label={t('ui.name')} defaultValue={t('ui.sample')} />
						<Popover>
							<PopoverTrigger asChild>
								<Button data-review="nested-popover">{t('ui.details')}</Button>
							</PopoverTrigger>
							<PopoverContent>
								<Input data-review="popover-input" aria-label={t('ui.search')} />
							</PopoverContent>
						</Popover>
						<Dialog>
							<DialogTrigger asChild>
								<Button data-review="ordinary-nested-trigger">{t('ui.open')}</Button>
							</DialogTrigger>
							<DialogContent data-review="ordinary-nested-content" aria-describedby={undefined}>
								<DialogTitle>{t('ui.details')}</DialogTitle>
								<Input aria-label={t('ui.search')} />
							</DialogContent>
						</Dialog>
						<DialogClose asChild>
							<Button variant="secondary" data-review="dirty-cancel">
								{t('ui.cancel')}
							</Button>
						</DialogClose>
					</DialogContent>
				</Dialog>
				<Sheet dirty={sheetDirty} onDiscard={() => setSheetDirty(false)}>
					<SheetTrigger asChild>
						<Button data-review="sheet-trigger" onClick={() => setSheetDirty(true)}>
							{t('ui.details')}
						</Button>
					</SheetTrigger>
					<SheetContent aria-describedby={undefined}>
						<SheetTitle>{t('ui.sample')}</SheetTitle>
						<Input aria-label={t('ui.name')} />
						<SheetClose asChild>
							<Button data-review="sheet-cancel" variant="secondary">
								{t('ui.cancel')}
							</Button>
						</SheetClose>
					</SheetContent>
				</Sheet>
				<Button data-review="command-trigger" onClick={() => setCommand(true)}>
					{t('ui.commandTitle')}
				</Button>
				<CommandDialog open={command} onOpenChange={setCommand}>
					<CommandInput aria-label={t('ui.search')} />
					<CommandList>
						<CommandItem>{t('ui.sample')}</CommandItem>
					</CommandList>
					<ConfirmDialog
						title={t('ui.discardTitle')}
						description={t('ui.discardDescription')}
						onConfirm={() => {
							stateFor(name).confirmations++;
							return new Promise<void>((resolve, reject) => {
								pending[name] = { resolve, reject };
							});
						}}
					>
						<Button data-review="command-confirm">{t('ui.confirm')}</Button>
					</ConfirmDialog>
				</CommandDialog>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button data-review="menu-trigger">{t('ui.open')}</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem>{t('ui.sample')}</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<ContextMenu>
					<ContextMenuTrigger data-review="context-trigger">{t('ui.sample')}</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuItem>{t('ui.sample')}</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
				<HoverCard openDelay={0} closeDelay={0}>
					<HoverCardTrigger asChild>
						<Button data-review="hover-trigger" variant="ghost">
							{t('ui.details')}
						</Button>
					</HoverCardTrigger>
					<HoverCardContent>{t('ui.sampleDescription')}</HoverCardContent>
				</HoverCard>
				<Button
					data-review="toast-trigger"
					onClick={() => toast(t('ui.save'), { toasterId: name, duration: Infinity })}
				>
					{t('ui.save')}
				</Button>
				<Toaster id={name} />
				<Button data-review="detail-trigger" onClick={() => setDetail(true)}>
					{t('ui.details')}
				</Button>
			</section>
			<section data-review="detail-main" style={{ display: 'flex', height: 320, width: '100%' }}>
				<DetailPane leafWidth={leafWidth} open={detail} dirty onOpenChange={setDetail} title={t('ui.details')}>
					<DetailEditor name={name} />
				</DetailPane>
			</section>
			<JoinedProbe name={name} />
			<EmptyState
				icon={<Plus />}
				title={t('ui.sample')}
				description={t('ui.sampleDescription')}
				action={<Button variant="secondary">{t('ui.create')}</Button>}
			/>
			<section></section>
		</>
	);
}
async function bootstrap() {
	const docs = await readyDocuments(document);
	for (const [name, doc] of Object.entries(docs)) {
		joinedClicks[name] = [];
		doc.addEventListener('click', (event) => {
			const target = event.target;
			if (!(target instanceof doc.defaultView!.Element)) return;
			const item = target.closest<HTMLElement>('[data-joined] [data-slot="toggle-group-item"]');
			const group = item?.closest<HTMLElement>('[data-joined]');
			if (item && group)
				joinedClicks[name]!.push({
					trusted: event.isTrusted,
					group: group.dataset.joined!,
					index: [...group.querySelectorAll('[data-slot="toggle-group-item"]')].indexOf(item),
				});
		});
		Object.defineProperty(doc.body, 'createDiv', {
			configurable: true,
			value: (options?: { cls?: string }) => {
				const node = doc.createElement('div');
				node.className = options?.cls ?? '';
				doc.body.append(node);
				return node;
			},
		});
		const main = doc.createElement('main');
		main.className = 'huhu-ui';
		doc.body.append(main);
		state[name] = {
			segment: 'list',
			confirmations: 0,
			layout: {},
			busyClicks: 0,
			submits: 0,
			dirtyMode: false,
			expanded: [],
			hitClicks: 0,
			neighborHits: 0,
			detailMounts: 0,
			detailUnmounts: 0,
		};
		createRoot(main).render(
			<HuhuProviders ownerDocument={doc}>
				<Probe name={name} />
			</HuhuProviders>,
		);
	}
	Object.assign(globalThis, {
		uiReview: {
			docs,
			joined,
			joinedClicks,
			mountLifecycle(name: string) {
				const doc = docs[name as keyof typeof docs];
				if (!doc) throw new Error('Unknown document');
				const host = doc.createElement('div');
				host.className = 'huhu-ui';
				doc.body.append(host);
				const root = createRoot(host);
				lifecycleRoots[name] = { root, host };
				root.render(
					<HuhuProviders ownerDocument={doc}>
						<LifecycleDialog />
					</HuhuProviders>,
				);
			},
			unmountLifecycle(name: string) {
				const scope = lifecycleRoots[name];
				if (!scope) throw new Error('Unknown lifecycle root');
				scope.root.unmount();
				scope.host.remove();
				delete lifecycleRoots[name];
			},
			state,
			getLanguage,
			resetTree(name: string) {
				resetTrees[name]?.();
			},
			showToast(name: string) {
				toast(t('ui.save'), { toasterId: name, duration: Infinity });
			},
			dismissToasts() {
				toast.dismiss();
			},
			finishConfirmation(name: string, success: boolean) {
				const operation = pending[name];
				delete pending[name];
				if (!operation) throw new Error(`No pending confirmation: ${name}`);
				if (success) operation.resolve();
				else operation.reject(new Error(t('ui.renderError')));
			},
			configure(sample: Record<string, unknown>) {
				setLanguage(sample.language === 'zh' ? 'zh' : 'en');
				for (const doc of Object.values(docs)) {
					doc.documentElement.lang = String(sample.language);
					doc.body.className = sample.theme === 'ink' ? 'theme-dark' : 'theme-light';
					doc.body.style.cssText = '';
					if (sample.source === 'obsidian') {
						const dark = sample.theme === 'ink';
						const surface = dark ? '#1d1c19' : '#ffffff';
						const colors = {
							'background-primary': surface,
							'background-secondary': surface,
							'background-secondary-alt': surface,
							'text-normal': dark ? '#eeeeee' : '#111111',
							'text-muted': dark ? '#cccccc' : '#444444',
							'interactive-accent': dark ? '#6fb4af' : '#24575a',
							'text-on-accent': dark ? '#0f1f1e' : '#ffffff',
							'text-accent':
								sample.hostMode === 'unsafe'
									? dark
										? surface
										: '#767676'
									: dark
										? '#eeeeee'
										: '#111111',
						};
						for (const [key, value] of Object.entries(colors))
							doc.body.style.setProperty(`--${key}`, value);
					}
					const settings = themeSettings.normalize({
						preset: sample.theme,
						accent: sample.accent,
						source: sample.source,
						density: sample.density,
						uiSize: sample.uiSize,
						motion: sample.motion ?? 'system',
					});
					doc.querySelectorAll<HTMLElement>('.huhu-ui').forEach((root) =>
						applyInterfaceTheme(root, settings),
					);
				}
			},
		},
	});
}
Object.assign(globalThis, { uiReviewStartup: bootstrap() });
