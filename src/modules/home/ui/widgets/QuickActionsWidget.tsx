import { useRef, useState } from 'react';
import { useStore } from 'zustand';
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { Textarea } from '../../../../ui/components/textarea';
import { Choice } from '../../../../ui/components/huhu/Choice';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../../../../ui/components/dropdown-menu';
import { ObsidianIcon } from '../../../../ui/components/huhu/ObsidianIcon';
import { useT } from '../../../../ui/react/hooks';
import type { BoardStore } from '../../services/board-store';
import type { QuickAction } from '../../core/board/types/model';
import { actionKey, buildOrderedActions, type OrderedAction } from '../../core/board/quick-actions';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { DashboardIconPicker } from '../quickbar/DashboardIconPicker';
import { IconButton } from '../board/controls';
import { WidgetActions } from '../canvas/widget-frame';
const types: QuickAction['type'][] = ['file', 'url', 'command', 'quick', 'action', 'agent', 'note'];
export function QuickActionsWidget({ store }: { store: BoardStore }) {
	const { data } = useStore(store.state),
		t = useT();
	const [editing, setEditing] = useState<QuickAction>(),
		[index, setIndex] = useState(-1),
		[menu, setMenu] = useState(''),
		[busy, setBusy] = useState(false),
		[error, setError] = useState('');
	const running = useRef(new Set<string>()),
		[active, setActive] = useState<ReadonlySet<string>>(new Set());
	const grid = useRef<HTMLDivElement>(null);
	const actions = buildOrderedActions(data!.quickActions, data!.quickActionOrder, data!.hiddenPresets);
	const report = (cause: unknown) => toast.error(cause instanceof Error ? cause.message : String(cause));
	const edit = (item?: OrderedAction) => {
		setIndex(
			item && !item.isPreset
				? data!.quickActions.findIndex((action) => actionKey(action, false) === item.key)
				: -1,
		);
		setEditing(item ? { ...item.action } : { name: '', type: 'file', icon: 'file-text', target: '' });
		setError('');
	};
	const move = (item: OrderedAction, delta: number) => {
		const old = actions.indexOf(item),
			next = Math.max(0, Math.min(actions.length - 1, old + delta)),
			order = actions.map((entry) => entry.key);
		order.splice(old, 1);
		order.splice(next, 0, item.key);
		void store.sync.reorderQuickActions(order).catch(report);
	};
	const execute = async (item: OrderedAction) => {
		if (running.current.has(item.key)) return;
		running.current.add(item.key);
		setActive(new Set(running.current));
		try {
			await store.action(item.action);
		} catch (cause) {
			report(cause);
		} finally {
			running.current.delete(item.key);
			setActive(new Set(running.current));
		}
	};
	const save = async () => {
		if (!editing?.name.trim() || busy) return;
		if (editing.type !== 'note' && !(editing.type === 'agent' ? editing.agentId : editing.target)?.trim()) {
			setError(t('quickActions.targetRequired'));
			return;
		}
		if (editing.type === 'url') {
			try {
				if (!['http:', 'https:'].includes(new URL(editing.target).protocol)) throw new Error();
			} catch {
				setError(t('shortcuts.invalidUrl'));
				return;
			}
		}
		setBusy(true);
		setError('');
		try {
			if (index < 0) await store.sync.addQuickAction(editing);
			else await store.sync.updateQuickAction(index, editing);
			setEditing(undefined);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setBusy(false);
		}
	};
	const targets =
		editing?.type === 'file'
			? store.state.getState().files.map((file) => ({ id: file.path, name: file.basename }))
			: editing?.type === 'command'
				? store.commands()
				: editing?.type === 'action'
					? (store.host.automationHost?.actions?.() ?? [])
					: editing?.type === 'quick'
						? (store.widgets
								.quickCommands?.()
								?.list()
								.map((item) => ({ id: item.id, name: item.name })) ?? [])
						: editing?.type === 'agent'
							? (store.widgets.agents?.().map((item) => ({ id: item.id, name: item.title })) ?? [])
							: [];
	return (
		<>
			<WidgetActions>
				<IconButton label={t('common.add')} onClick={() => edit()}>
					<Plus />
				</IconButton>
			</WidgetActions>
			<div
				ref={grid}
				className="grid h-full min-h-0 grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] content-start gap-2 overflow-y-auto"
				data-quick-actions
			>
				{actions.map((item) => (
					<div
						key={item.key}
						data-quick-action={item.action.id ?? item.key}
						className="flex min-w-0 items-center rounded-md bg-muted/50"
						onContextMenu={(event) => {
							event.preventDefault();
							setMenu(item.key);
						}}
					>
						<Button
							variant="ghost"
							className="h-10 min-w-0 flex-1 justify-start gap-2 px-2.5 font-normal"
							disabled={active.has(item.key)}
							onClick={() => {
								void execute(item);
							}}
							onKeyDown={(event) => {
								if (
									!event.altKey ||
									!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
								)
									return;
								event.preventDefault();
								const columns = grid.current
									? (grid.current.ownerDocument.defaultView
											?.getComputedStyle(grid.current)
											.gridTemplateColumns.split(' ').length ?? 1)
									: 1;
								move(
									item,
									event.key === 'ArrowUp'
										? -columns
										: event.key === 'ArrowDown'
											? columns
											: event.key === 'ArrowLeft'
												? -1
												: 1,
								);
							}}
						>
							<ObsidianIcon name={item.action.icon} className="size-4 shrink-0" />
							<span className="min-w-0 truncate">
								{item.isPreset
									? t(
											item.action.target === 'daily-notes'
												? 'home.dashboard.today'
												: 'home.dashboard.newNote',
										)
									: item.action.name}
							</span>
						</Button>
						<DropdownMenu open={menu === item.key} onOpenChange={(open) => setMenu(open ? item.key : '')}>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon-sm"
									className="shrink-0 text-muted-foreground"
									aria-label={t('quickActions.more', { name: item.action.name })}
								>
									<MoreHorizontal className="size-3.5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{!item.isPreset && (
									<DropdownMenuItem onSelect={() => edit(item)}>
										<Pencil />
										{t('common.edit')}
									</DropdownMenuItem>
								)}
								<DropdownMenuItem disabled={actions[0] === item} onSelect={() => move(item, -1)}>
									<ArrowUp />
									{t('home.p2.moveUp')}
								</DropdownMenuItem>
								<DropdownMenuItem disabled={actions.at(-1) === item} onSelect={() => move(item, 1)}>
									<ArrowDown />
									{t('home.p2.moveDown')}
								</DropdownMenuItem>
								<DropdownMenuItem
									className="text-destructive"
									onSelect={() => {
										void store.sync.removeQuickActionByKey(item.key).catch(report);
									}}
								>
									<Trash2 />
									{t('common.delete')}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				))}
			</div>
			{editing && (
				<DashboardDialog
					title={t('home.dashboard.widget.quickActions')}
					onClose={() => {
						if (!busy) setEditing(undefined);
					}}
					onSave={() => {
						void save();
					}}
					busy={busy}
				>
					<div className="flex gap-2">
						<DashboardIconPicker
							value={editing.icon}
							onChange={(icon) => setEditing({ ...editing, icon })}
						/>
						<Input
							aria-label={t('home.dashboard.name')}
							value={editing.name}
							onChange={(event) => setEditing({ ...editing, name: event.currentTarget.value })}
						/>
					</div>
					<Choice
						label={t('quickActions.kind')}
						value={editing.type}
						options={types.map((type) => [type, t(`quickActions.type.${type}`)] as const)}
						onChange={(type) =>
							setEditing({
								...editing,
								type: type as QuickAction['type'],
								target: '',
								preset:
									type === 'note'
										? {
												id: editing.id ?? crypto.randomUUID(),
												label: editing.name,
												icon: editing.icon,
												folder: '',
												templatePath: '',
												filename: '',
											}
										: undefined,
							})
						}
					/>
					{editing.type === 'note' ? (
						<>
							{(['folder', 'templatePath', 'filename'] as const).map((key) => (
								<Label key={key} className="grid gap-2">
									{t(`quickActions.${key}`)}
									<Input
										value={editing.preset?.[key] ?? ''}
										onChange={(event) =>
											setEditing({
												...editing,
												preset: {
													id: editing.id ?? '',
													label: editing.name,
													icon: editing.icon,
													folder: '',
													templatePath: '',
													filename: '',
													...editing.preset,
													[key]: event.currentTarget.value,
												},
											})
										}
									/>
								</Label>
							))}
						</>
					) : (
						<Label className="grid gap-2">
							{t('quickActions.target')}
							<Input
								value={editing.type === 'agent' ? (editing.agentId ?? '') : editing.target}
								onChange={(event) =>
									setEditing(
										editing.type === 'agent'
											? { ...editing, agentId: event.currentTarget.value }
											: { ...editing, target: event.currentTarget.value },
									)
								}
							/>
						</Label>
					)}
					{targets.length > 0 && (
						<div className="max-h-40 overflow-y-auto">
							{targets
								.filter((item) =>
									`${item.name} ${item.id}`
										.toLowerCase()
										.includes((editing.target || '').toLowerCase()),
								)
								.slice(0, 40)
								.map((item) => (
									<Button
										key={item.id}
										variant="ghost"
										className="w-full justify-start truncate"
										onClick={() =>
											setEditing({
												...editing,
												target: item.id,
												agentId: editing.type === 'agent' ? item.id : editing.agentId,
												name: editing.name || item.name,
											})
										}
									>
										{item.name}
									</Button>
								))}
						</div>
					)}
					{editing.type === 'agent' && (
						<Label className="grid gap-2">
							{t('quickActions.prompt')}
							<Textarea
								value={editing.prompt ?? ''}
								onChange={(event) => setEditing({ ...editing, prompt: event.currentTarget.value })}
							/>
						</Label>
					)}
					{editing.type === 'url' && (
						<Choice
							label={t('home.dashboard.openIn')}
							value={editing.openIn ?? 'tab'}
							options={['tab', 'system'].map((key) => [key, t(`quickActions.open.${key}`)] as const)}
							onChange={(value) => setEditing({ ...editing, openIn: value as 'tab' | 'system' })}
						/>
					)}
					{error && (
						<p role="alert" className="m-0 text-sm text-destructive">
							{error}
						</p>
					)}
				</DashboardDialog>
			)}
		</>
	);
}
