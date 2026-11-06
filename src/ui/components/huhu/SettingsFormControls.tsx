// Adapted from stablyai/orca 464bd5a54b3364021c5cc0319859616e5ec41bbf (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/settings/SettingsFormControls.tsx
import type React from 'react';
import { ToggleGroup, ToggleGroupItem } from '../toggle-group';
import { useContext, useId, useRef, useState } from 'react';
import { SettingsSearchContext, SearchHighlight, matchesSettingsSearch } from '../../react/settings-search';
import { Input } from '../input';
import { Badge } from '../badge';
import { Label } from '../label';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { Switch } from '../switch';
import { SettingsDisabledControlTooltip } from './SettingsDisabledControlTooltip';
import { useT } from '../../react/hooks';
const normalizeColor = (value: string, fallback: string): string => (/^#[0-9a-f]{6}$/i.test(value) ? value : fallback);
import { cn } from '../../lib/utils';

type SettingsSwitchProps = {
	checked: boolean;
	onChange: () => void;
	ariaLabel?: string;
	ariaLabelledBy?: string;
	ariaDescribedBy?: string;
	disabled?: boolean;
	busy?: boolean;
};

export function SettingsSwitch({
	checked,
	onChange,
	ariaLabel,
	ariaLabelledBy,
	ariaDescribedBy,
	disabled,
	busy,
}: SettingsSwitchProps): React.JSX.Element {
	return (
		<Switch
			checked={checked}
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledBy}
			aria-describedby={ariaDescribedBy}
			disabled={disabled}
			busy={busy}
			onCheckedChange={onChange}
		/>
	);
}

type SettingsRowProps = {
	label: React.ReactNode;
	description?: React.ReactNode;
	control: React.ReactNode;
	className?: string;
	/** Optional id applied to the label so the control can reference it via aria-labelledby. */
	labelId?: string;
	/** When true, top-align label/description and control. Useful for tall control columns. */
	alignTop?: boolean;
};

/** Two-column row grammar: left min-w-0 label+description, right shrink-0 control. */
export function SettingsRow({
	label,
	description,
	control,
	className,
	labelId,
	alignTop,
}: SettingsRowProps): React.JSX.Element {
	const query = useContext(SettingsSearchContext);
	if (
		typeof label === 'string' &&
		!matchesSettingsSearch(query, {
			title: label,
			description: typeof description === 'string' ? description : undefined,
		})
	)
		return <></>;
	return (
		<div
			data-slot="settings-row"
			data-searchable-setting
			className={cn(
				'flex flex-wrap gap-4',
				description ? 'py-3' : 'py-2',
				alignTop ? 'items-start' : 'items-center justify-between',
				className,
			)}
		>
			<div className={cn('min-w-0 flex-[1_1_240px]', description ? 'space-y-1' : 'space-y-0.5')}>
				<Label id={labelId} className="select-text">
					{typeof label === 'string' ? <SearchHighlight text={label} /> : label}
				</Label>
				{description ? <p className="select-text text-xs text-muted-foreground">{description}</p> : null}
			</div>
			<div className="min-w-0 max-w-full shrink-0">{control}</div>
		</div>
	);
}

type SettingsSwitchRowProps = {
	label: React.ReactNode;
	description?: React.ReactNode;
	checked: boolean;
	onChange: () => void;
	className?: string;
	ariaLabel?: string;
	disabled?: boolean;
	busy?: boolean;
};

export function SettingsSwitchRow({
	label,
	description,
	checked,
	onChange,
	className,
	ariaLabel,
	disabled,
	busy = false,
}: SettingsSwitchRowProps): React.JSX.Element {
	const t = useT();
	const labelId = useId();
	return (
		<SettingsRow
			label={label}
			labelId={labelId}
			description={description}
			className={className}
			control={
				<div className="flex items-center gap-2">
					<span role={busy ? 'status' : undefined} className="text-xs text-[var(--hu-fg-3)]">
						{busy ? t('ui.saving') : t(checked ? 'ui.enabled' : 'ui.disabled')}
					</span>
					<SettingsSwitch
						checked={checked}
						busy={busy}
						ariaLabelledBy={ariaLabel ? undefined : labelId}
						onChange={onChange}
						disabled={disabled}
						ariaLabel={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
					/>
				</div>
			}
		/>
	);
}

type SegmentedOption<T extends string | number> = {
	value: T;
	label: React.ReactNode;
	disabled?: boolean;
	ariaLabel?: string;
	/** Optional hover label describing what the option does. */
	tooltip?: React.ReactNode;
};

type SegmentedControlProps<T extends string | number> = {
	value: T;
	onChange: (value: T) => void;
	options: readonly SegmentedOption<T>[];
	ariaLabel?: string;
	size?: 'sm' | 'md';
	equalWidth?: boolean;
	wrap?: boolean;
};

const segmentKey = (value: string | number): string => `${typeof value}:${value}`;

/** Canonical segmented control for theme/ligatures/cursor/shell/etc. */
export function SegmentedControl<T extends string | number>({
	value,
	onChange,
	options,
	ariaLabel,
	size = 'md',
	equalWidth = false,
	wrap = false,
}: SegmentedControlProps<T>): React.JSX.Element {
	// ToggleGroup moves focus; only keyboard movement selects here, so pointer focus cannot dispatch twice.
	const selectOnFocus = useRef(false);
	return (
		<ToggleGroup
			type="single"
			variant="segmented"
			size={size}
			value={segmentKey(value)}
			onValueChange={(next) => {
				const option = options.find((opt) => segmentKey(opt.value) === next);
				if (option) onChange(option.value);
			}}
			aria-label={ariaLabel}
			onKeyDownCapture={(event) => {
				selectOnFocus.current = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
					event.key,
				);
			}}
			onPointerDownCapture={() => {
				selectOnFocus.current = false;
			}}
			data-slot="segmented-control"
			className={cn('inline-flex', wrap && 'flex-wrap', equalWidth && 'w-full')}
		>
			{options.map((opt) => {
				const button = (
					<ToggleGroupItem
						key={segmentKey(opt.value)}
						value={segmentKey(opt.value)}
						data-hit-control
						aria-label={opt.ariaLabel}
						disabled={opt.disabled}
						onFocus={() => {
							if (!selectOnFocus.current) return;
							selectOnFocus.current = false;
							if (!opt.disabled && opt.value !== value) onChange(opt.value);
						}}
						className={equalWidth ? 'flex-1' : undefined}
					>
						{opt.label}
					</ToggleGroupItem>
				);
				return opt.tooltip == null ? (
					button
				) : (
					<Tooltip key={segmentKey(opt.value)}>
						<TooltipTrigger asChild>{button}</TooltipTrigger>
						<TooltipContent>{opt.tooltip}</TooltipContent>
					</Tooltip>
				);
			})}
		</ToggleGroup>
	);
}

type SettingsBadgeProps = {
	tone?: 'neutral' | 'accent' | 'muted';
	children: React.ReactNode;
	className?: string;
};

/** Tokenized badge for status pills inside settings (e.g. Detected, Not installed). */
export function SettingsBadge({ tone = 'neutral', children, className }: SettingsBadgeProps): React.JSX.Element {
	return (
		<Badge
			variant={tone === 'accent' ? 'accent' : 'neutral'}
			className={cn(tone === 'muted' && 'text-[var(--hu-fg-3)]', className)}
		>
			{children}
		</Badge>
	);
}

type SettingsSubsectionHeaderProps = {
	title: React.ReactNode;
	description?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
};

/** Consistent subsection header: h3 text-sm font-semibold + optional muted description. */
export function SettingsSubsectionHeader({
	title,
	description,
	action,
	className,
}: SettingsSubsectionHeaderProps): React.JSX.Element {
	return (
		<div className={cn('flex items-start justify-between gap-3', className)}>
			<div className="space-y-1">
				<h3 className="text-sm font-semibold">{title}</h3>
				{description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</div>
	);
}

type ColorFieldProps = {
	label: string;
	description: string;
	value: string;
	fallback: string;
	onChange: (value: string) => void;
};

type NumberFieldProps = {
	label: string;
	description: string;
	/** undefined renders the field empty — pair it with `placeholder` and `onClear` for an unset state. */
	value: number | undefined;
	defaultValue?: number;
	min: number;
	max?: number;
	step?: number;
	integer?: boolean;
	onChange: (value: number) => void;
	/** When set, emptying the field clears the setting instead of snapping back to the current value. */
	onClear?: () => void;
	placeholder?: string;
	suffix?: string;
	className?: string;
	disabled?: boolean;
	/** Hover explanation shown only while the field is disabled. */
	disabledReason?: string;
};

export function ColorField({ label, description, value, fallback, onChange }: ColorFieldProps): React.JSX.Element {
	const normalized = normalizeColor(value, fallback);

	return (
		<SettingsRow
			label={label}
			description={description}
			control={
				<div className="flex items-center gap-2">
					<input
						type="color"
						aria-label={label}
						value={normalized}
						onChange={(e) => onChange(e.target.value)}
						className="h-8 min-h-[var(--hu-hit)] w-10 min-w-[var(--hu-hit)] rounded-md border border-input bg-transparent p-1"
					/>
					<Input
						aria-label={label}
						value={value}
						onChange={(e) => onChange(e.target.value)}
						placeholder={fallback}
						className="w-32 text-xs"
					/>
				</div>
			}
		/>
	);
}

export function NumberField({
	label,
	description,
	value,
	defaultValue,
	min,
	max,
	step = 1,
	integer = false,
	onChange,
	onClear,
	placeholder,
	suffix,
	className,
	disabled = false,
	disabledReason,
}: NumberFieldProps): React.JSX.Element {
	const t = useT();
	const [draft, setDraft] = useState(Number.isFinite(value) ? String(value) : '');
	const [prevValue, setPrevValue] = useState(value);

	// Sync draft when the external value changes (e.g. from another source)
	if (value !== prevValue) {
		setPrevValue(value);
		setDraft(Number.isFinite(value) ? String(value) : '');
	}

	const commit = (): void => {
		if (disabled) {
			return;
		}
		const trimmed = draft.trim();
		if (trimmed === '') {
			if (onClear) {
				// Clearable fields treat empty as "unset" so the caller can fall back to its automatic value.
				onClear();
				return;
			}
			// Empty input — reset to current value rather than committing 0
			setDraft(Number.isFinite(value) ? String(value) : '');
			return;
		}
		const next = Number(trimmed);
		if (Number.isFinite(next) && (!integer || Number.isSafeInteger(next))) {
			const clamped = max === undefined ? Math.max(min, next) : Math.min(max, Math.max(min, next));
			onChange(clamped);
			setDraft(String(clamped));
		} else {
			// Reset to current value if input is invalid
			setDraft(Number.isFinite(value) ? String(value) : '');
		}
	};

	return (
		<SettingsRow
			className={className}
			label={label}
			description={
				<>
					{description}
					{defaultValue !== undefined ? (
						<span className="ml-1 text-muted-foreground">
							{t('ui.defaultValue')} {defaultValue}
						</span>
					) : null}
				</>
			}
			control={
				<div className="flex items-center gap-2">
					<SettingsDisabledControlTooltip reason={disabled ? disabledReason : undefined}>
						<Input
							type="number"
							disabled={disabled}
							min={min}
							max={max}
							step={step}
							aria-label={label}
							placeholder={placeholder}
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							onBlur={commit}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									commit();
								}
							}}
							className="number-input-clean w-24 tabular-nums"
						/>
					</SettingsDisabledControlTooltip>
					{suffix ? <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span> : null}
				</div>
			}
		/>
	);
}
