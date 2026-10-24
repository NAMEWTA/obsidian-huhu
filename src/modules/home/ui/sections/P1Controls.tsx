// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/toolbar-dropdown.ts, src/library-section.ts
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '../../../../ui/components/dropdown-menu';
import { ObsidianIcon } from '../../../../ui/components/huhu/ObsidianIcon';
import type { ComponentProps, KeyboardEventHandler } from 'react';
import { X } from 'lucide-react';
import type { App } from 'obsidian';
import { VaultPathField } from '../../../../ui/components/huhu/VaultPathField';
import type { ToolbarDropdownItem } from '../ui/toolbar-dropdown';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Textarea } from '../../../../ui/components/textarea';
import { Label } from '../../../../ui/components/label';
import { useT } from '../../../../ui/react/hooks';
export function ToolbarDropdown({
	currentKey,
	items,
	pick,
}: {
	currentKey: string;
	items: readonly ToolbarDropdownItem[];
	pick: (key: string) => void;
}) {
	const current = items.find((i) => i.key === currentKey);
	return (
		<IconChoice
			icon={current?.icon ?? 'maximize-2'}
			value={currentKey}
			label={current?.label ?? ''}
			options={items.map((i) => ({ value: i.key, label: i.label }))}
			onChange={pick}
		/>
	);
}
export function Pagination({ page, pages, change }: { page: number; pages: number; change: (page: number) => void }) {
	const t = useT();
	return (
		<div className="flex items-center justify-center gap-2">
			<Button
				variant="ghost"
				size="icon"
				aria-label={t('home.p1.previous')}
				disabled={page <= 1}
				onClick={() => change(page - 1)}
			>
				‹
			</Button>
			<span>
				{page} / {pages}
			</span>
			<Button
				variant="ghost"
				size="icon"
				aria-label={t('home.p1.next')}
				disabled={page >= pages}
				onClick={() => change(page + 1)}
			>
				›
			</Button>
		</div>
	);
}
export function TextField({
	label,
	hint,
	multiline,
	onInput,
	onKeyDown,
	...props
}: Omit<ComponentProps<typeof Input>, 'onInput' | 'onKeyDown'> & {
	label: string;
	hint?: string;
	multiline?: boolean;
	onInput: (value: string) => void;
	onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}) {
	return (
		<Label className="grid gap-2">
			{label}
			{multiline ? (
				<Textarea value={props.value} disabled={props.disabled} onChange={(e) => onInput(e.target.value)} />
			) : (
				<Input {...props} onChange={(e) => onInput(e.target.value)} onKeyDown={onKeyDown} />
			)}{' '}
			{hint && <span className="text-xs text-muted-foreground">{hint}</span>}
		</Label>
	);
}

/** A labelled vault-folder field: fuzzy suggestions from the vault, a folder typed by hand is made when accepted. */
export function FolderField({
	app,
	label,
	hint,
	value,
	onChange,
	create,
}: {
	app: App;
	label: string;
	hint?: string;
	value: string;
	onChange(this: void, path: string): void;
	create?: boolean;
}) {
	return (
		<Label className="grid gap-2">
			{label}
			<VaultPathField app={app} kind="folder" label={label} value={value} onChange={onChange} create={create} />
			{hint && <span className="text-xs text-muted-foreground">{hint}</span>}
		</Label>
	);
}

/** A list of vault folders (or notes): each one a chip that can be removed, and a field to add another. */
export function FolderListField({
	app,
	label,
	folders,
	onChange,
	kind = 'folder',
}: {
	app: App;
	label: string;
	folders: readonly string[];
	kind?: 'file' | 'folder';
	onChange(this: void, folders: string[]): void;
}) {
	const t = useT();
	return (
		<div className="grid min-w-0 gap-2" data-folder-list>
			{folders.length > 0 && (
				<ul className="m-0 flex list-none flex-wrap gap-1 p-0">
					{folders.map((path) => (
						<li
							key={path}
							className="flex max-w-full items-center gap-1 rounded-md bg-muted py-0.5 pr-0.5 pl-2 text-xs"
						>
							<span className="min-w-0 truncate">{path}</span>
							<Button
								variant="ghost"
								size="icon-xs"
								aria-label={`${t('common.delete')} ${path}`}
								onClick={() => onChange(folders.filter((folder) => folder !== path))}
							>
								<X />
							</Button>
						</li>
					))}
				</ul>
			)}
			{/* The field stays empty: a folder chosen here is added to the list. */}
			<VaultPathField
				app={app}
				kind={kind}
				create={false}
				allowCreate={false}
				label={label}
				value=""
				onChange={(path) => {
					if (path && !folders.includes(path)) onChange([...folders, path]);
				}}
			/>
		</div>
	);
}

/** Upstream icon-only dropdown trigger; Radix owns selection and focus. */
export function IconChoice({
	icon,
	label,
	value,
	options,
	onChange,
}: {
	icon: string;
	label: string;
	value: string;
	options: readonly { value: string; label: string }[];
	onChange: (value: string) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon" aria-label={label} title={label}>
					<ObsidianIcon name={icon} className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				{options.map((option) => (
					<DropdownMenuItem
						key={option.value}
						onSelect={() => onChange(option.value)}
						aria-selected={value === option.value}
					>
						{option.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
