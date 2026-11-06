import type { App } from 'obsidian';
import { WidgetBackgroundEditor } from '../settings/WidgetBackgroundEditor';
import { DateField, parseDate } from '../../../../ui/components/huhu/date';
// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/anniversary-settings-modal.ts
import { useState } from 'react';
import type { AnniversaryConfig } from '../../core/board/types';
import { formatElapsed, parseAnniversaryDate } from '../../core/anniversaries/calendar';
import { replaceCivilDate } from '../../core/anniversaries/civil-date';
import type { LunarLookup } from '../../core/anniversaries/lunar-map';
import { useLunarLookup } from './use-record-lunar';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { Switch } from '../../../../ui/components/switch';
import { Button } from '../../../../ui/components/button';
import { Choice } from '../board/controls';
import { useT } from '../../../../ui/react/hooks';
function LunarInput({
	lookup,
	start,
	onChange,
}: {
	lookup: LunarLookup;
	start: string;
	onChange(this: void, start: string, valid: boolean): void;
}) {
	const t = useT(),
		[parts, setParts] = useState(() => {
			try {
				return lookup.toLunar(start.split('T')[0]!);
			} catch {
				return { year: new Date().getFullYear(), month: 1, day: 1, leap: false };
			}
		}),
		[invalid, setInvalid] = useState(false);
	const change = (patch: Partial<typeof parts>) => {
		const next = { ...parts, ...patch };
		setParts(next);
		try {
			const solar = lookup.toSolar(next.year, next.month, next.leap, next.day);
			onChange(replaceCivilDate(start, solar), true);
			setInvalid(false);
		} catch {
			onChange(start, false);
			setInvalid(true);
		}
	};
	return (
		<>
			<div className="grid grid-cols-3 gap-2">
				{(['year', 'month', 'day'] as const).map((key) => (
					<Label className="grid gap-2" key={key}>
						{t(`anniversary.lunar${key[0]!.toUpperCase() + key.slice(1)}`)}
						<Input
							type="number"
							value={parts[key] || ''}
							onChange={(e) => change({ [key]: Number(e.target.value) })}
						/>
					</Label>
				))}
			</div>
			<Label>
				<Switch checked={parts.leap} onCheckedChange={(leap) => change({ leap })} />
				{t('anniversary.leapMonth')}
			</Label>
			<p className="text-xs text-muted-foreground">{t('anniversary.lunarPolicy')}</p>
			<p role="status" className={invalid ? 'text-destructive' : 'text-xs'}>
				{invalid
					? t('anniversary.invalidLunarDate')
					: t('anniversary.solarEquivalent', { date: start.split('T')[0]! })}
			</p>
		</>
	);
}
export function AnniversaryEditor({
	initial,
	app,
	onSave,
	onDelete,
	onClose,
	embedded = false,
}: {
	initial: AnniversaryConfig;
	app?: App;
	embedded?: boolean;
	onSave(this: void, value: AnniversaryConfig): void | Promise<void>;
	onDelete?(this: void): void;
	onClose(this: void): void;
}) {
	const [draft, setDraft] = useState(initial),
		[solarRaw, setSolarRaw] = useState(initial.startDate.split('T')[0] ?? ''),
		[valid, setValid] = useState(!!parseAnniversaryDate(initial.startDate)),
		t = useT(),
		lunar = draft.calendar === 'lunar',
		{ lookup, failed } = useLunarLookup(lunar);
	return (
		<DashboardDialog
			embedded={embedded}
			title={t('anniversary.editTitle')}
			onClose={onClose}
			disabled={!valid || (lunar && !lookup)}
			onSave={() => {
				if (!valid || (lunar && !lookup)) return;
				if (!lunar && !parseDate(solarRaw)) return;
				return onSave(lunar ? draft : { ...draft, startDate: replaceCivilDate(draft.startDate, solarRaw) });
			}}
		>
			<Label className="grid gap-2">
				{t('anniversary.label')}
				<Input
					value={draft.label}
					onChange={(e) => setDraft({ ...draft, label: e.target.value, defaultLabel: false })}
				/>
			</Label>
			<Choice
				label={t('anniversary.calendar')}
				value={draft.calendar ?? 'solar'}
				options={['solar', 'lunar'].map((value) => ({ value, label: t(`anniversary.${value}`) }))}
				onChange={(value) => {
					if (!valid) return;
					const startDate = lunar ? draft.startDate : replaceCivilDate(draft.startDate, solarRaw);
					setDraft({ ...draft, startDate, calendar: value as 'solar' | 'lunar' });
				}}
			/>
			{lunar ? (
				lookup ? (
					<LunarInput
						lookup={lookup}
						start={draft.startDate}
						onChange={(startDate, valid) => {
							setValid(valid);
							if (valid) setSolarRaw(startDate.split('T')[0] ?? '');
							setDraft({ ...draft, startDate });
						}}
					/>
				) : (
					<p role="status">{t(failed ? 'anniversary.conversionError' : 'anniversary.loading')}</p>
				)
			) : (
				<DateField
					label={t('anniversary.startDate')}
					required
					draftValue={solarRaw}
					onDraftChange={(value) => {
						setSolarRaw(value);
						setValid(!!parseDate(value));
					}}

					value={parseDate(draft.startDate.split('T')[0] ?? '')}
					onChange={(day) => {
						setSolarRaw(day ?? '');
						const startDate = replaceCivilDate(draft.startDate, day ?? '');
						setDraft({ ...draft, startDate });
						setValid(!!parseAnniversaryDate(startDate));
					}}
				/>
			)}
			<Choice
				label={t('anniversary.precision')}
				value={draft.precision}
				options={[
					{ value: 'ymd', label: t('anniversary.precisionYmd') },
					{ value: 'days', label: t('anniversary.precisionDays') },
					{ value: 'hours', label: t('anniversary.precisionHours') },
				]}
				onChange={(value) => setDraft({ ...draft, precision: value as AnniversaryConfig['precision'] })}
			/>
			<Label>
				<Switch
					checked={draft.annualReminder}
					onCheckedChange={(annualReminder) => setDraft({ ...draft, annualReminder })}
				/>
				{t('anniversary.annualReminder')}
			</Label>
			<WidgetBackgroundEditor
				app={app}
				value={draft.background}
				onChange={(background) => setDraft({ ...draft, background })}
			/>
			<p>
				{t('anniversary.preview')}:{' '}
				{valid ? formatElapsed(parseAnniversaryDate(draft.startDate)!, new Date(), draft.precision) : '--'}
			</p>
			{onDelete && (
				<Button variant="danger" onClick={onDelete}>
					{t('common.delete')}
				</Button>
			)}
		</DashboardDialog>
	);
}
