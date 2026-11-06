import { DateField, parseDate } from '../../../../ui/components/huhu/date';
// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/expense-backfill-modal.ts
import { useState } from 'react';
import { Input } from '../../../../ui/components/input';
import { Label } from '../../../../ui/components/label';
import { Button } from '../../../../ui/components/button';
import { ToggleGroup, ToggleGroupItem } from '../../../../ui/components/toggle-group';
import { Choice } from '../board/controls';
import { useT } from '../../../../ui/react/hooks';
import {
	expenseToday,
	sanitizeAmountInput,
	EXPENSE_MAX_NOTE_LENGTH,
	type ExpenseRecord,
	type ExpenseType,
} from '../../core/expense/model';
import type { ExpenseService } from '../../platform/expense/expense-service';
import { categoryLabel } from './expense-label';
export interface ExpenseEntry {
	type: ExpenseType;
	amount: number;
	category: string;
	note: string;
	date: string;
}
export function ExpenseEntryPanel({
	service,
	initial,
	onSave,
	close,
}: {
	service: ExpenseService;
	initial?: ExpenseRecord;
	onSave(this: void, input: ExpenseEntry): boolean;
	close(this: void): void;
}) {
	const t = useT(),
		[date, setDate] = useState(initial?.date ?? expenseToday()),
		[dateDraft, setDateDraft] = useState(initial?.date ?? expenseToday()),
		[type, setType] = useState<ExpenseType>(initial?.type ?? 'expense'),
		[amount, setAmount] = useState(initial ? String(initial.amount) : ''),
		[category, setCategory] = useState(initial?.category ?? service.getOrderedCategories('expense')[0] ?? ''),
		[note, setNote] = useState(initial?.note ?? ''),
		[error, setError] = useState('');
	const save = () => {
		if (dateDraft > expenseToday()) {
			setError(t('expense.futureDate'));
			return;
		}
		if (!parseDate(dateDraft)) return;
		if (!onSave({ type, amount: Number(amount), category, note, date: dateDraft })) {
			setError(t('expense.invalidAmount'));
			return;
		}
		close();
	};
	return (
		<form
			data-expense-entry
			className="grid gap-4 p-5"
			onSubmit={(e) => {
				e.preventDefault();
				save();
			}}
			onKeyDown={(e) => {
				if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault();
			}}
		>
			<h2 className="m-0 text-base font-semibold">
				{t(initial ? 'expense.editTitle' : 'expense.backfillTitle')}
			</h2>
			<DateField
				label={t('expense.dateLabel')}
				onDraftChange={setDateDraft}
				max={parseDate(expenseToday()) ?? undefined}
				value={parseDate(date)}
				onChange={(day) => {
					setDate(day ?? '');
					setDateDraft(day ?? '');
				}}
			/>
			<ToggleGroup
				type="single"
				variant="segmented"
				className="w-full"
				value={type}
				onValueChange={(value) => {
					if (value !== 'expense' && value !== 'income') return;
					setType(value);
					setCategory(service.getOrderedCategories(value)[0] ?? '');
				}}
			>
				{(['expense', 'income'] as const).map((value) => (
					<ToggleGroupItem key={value} value={value} className="flex-1">
						{t(value === 'expense' ? 'expense.typeExpense' : 'expense.typeIncome')}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<div className="flex items-center gap-2">
				<span className="text-sm text-muted-foreground">{service.getCurrency()}</span>
				<Input
					autoFocus
					className="min-w-0 flex-1"
					aria-label={t('expense.colAmount')}
					inputMode="decimal"
					value={amount}
					placeholder="0.00"
					onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
				/>
				<Choice
					className="w-44 min-w-0 data-[size=sm]:h-[var(--hu-ctl-h)]"
					label={t('expense.colCategory')}
					value={category}
					onChange={setCategory}
					options={service
						.getOrderedCategories(type)
						.map((value) => ({ value, label: categoryLabel(value) }))}
				/>
			</div>
			<Label className="grid gap-2">
				{t('expense.colNote')}
				<Input
					value={note}
					maxLength={EXPENSE_MAX_NOTE_LENGTH}
					placeholder={t('expense.notePlaceholder')}
					onChange={(e) => setNote(e.target.value)}
				/>
			</Label>
			{error && (
				<p role="alert" className="m-0 text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex justify-end gap-2">
				<Button type="button" variant="secondary" onClick={close}>
					{t('common.cancel')}
				</Button>
				<Button type="submit">{t('common.save')}</Button>
			</div>
		</form>
	);
}
