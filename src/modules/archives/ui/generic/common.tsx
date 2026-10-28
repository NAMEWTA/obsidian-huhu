import { useId, useState, type ReactNode } from 'react';
import { t } from '../../../../shared/i18n';
import { ArchiveError } from '../../core/schema/model';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Textarea } from '../../../../ui/components/textarea';
import { Choice } from '../../../../ui/components/huhu/Choice';
import { openReactDialog } from '../../../../ui/react/dialog';
export { Button, Input, Textarea, Choice };
export const at = (key: string) => t(`archives.${key}`);
export const ct = (key: string) => t(`contacts.${key}`);
export function failure(error: unknown): string {
	return `${at('failure')} ${error instanceof ArchiveError ? [error.code, error.detail, ...error.fields].filter(Boolean).join(' · ') : error instanceof Error ? error.message : String(error)}`;
}
export function ErrorBox({ error }: { error: unknown }) {
	return error ? (
		<div
			role="alert"
			className="rounded-md border border-destructive/40 p-3 text-sm text-destructive whitespace-pre-wrap"
		>
			{failure(error)}
		</div>
	) : null;
}
export function TextField({
	label,
	value,
	onChange,
	readOnly = false,
	multiline = false,
}: {
	label: string;
	value: string;
	onChange?: (value: string) => void;
	readOnly?: boolean;
	multiline?: boolean;
}) {
	const id = useId();
	return (
		<div className="space-y-1">
			<label htmlFor={id} className="text-sm font-medium">
				{label}
			</label>
			{multiline ? (
				<Textarea id={id} value={value} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} />
			) : (
				<Input id={id} value={value} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} />
			)}
		</div>
	);
}
export function Check({
	label,
	checked,
	onChange,
	disabled,
}: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
}) {
	const id = useId();
	return (
		<label htmlFor={id} className="flex min-h-8 items-center gap-2 text-sm">
			<input
				id={id}
				type="checkbox"
				checked={checked}
				disabled={disabled}
				onChange={(e) => onChange(e.target.checked)}
			/>
			{label}
		</label>
	);
}
export function Select({
	label,
	value,
	options,
	onChange,
	disabled,
}: {
	label: string;
	value: string;
	options: readonly (readonly [string, string])[];
	onChange: (value: string) => void;
	disabled?: boolean;
}) {
	return (
		<div className="space-y-1">
			<div className="text-sm font-medium">{label}</div>
			<Choice
				label={label}
				value={value}
				options={options.map((option) => [option[0], option[1]])}
				onChange={onChange}
				disabled={disabled}
			/>
		</div>
	);
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="space-y-3 rounded-lg border bg-card p-4">
			<h3 className="font-semibold">{title}</h3>
			{children}
		</section>
	);
}
export function confirmAt(owner: HTMLElement, message: string, accept: string): Promise<boolean> {
	return new Promise((resolve) => {
		let accepted = false;
		openReactDialog(owner, {
			title: accept,
			description: message,
			content: (close) => (
				<div className="flex flex-wrap justify-end gap-2">
					<Button variant="outline" onClick={close}>
						{ct('cancel')}
					</Button>
					<Button
						onClick={() => {
							accepted = true;
							close();
						}}
					>
						{accept}
					</Button>
				</div>
			),
			onClose: () => resolve(accepted),
		});
	});
}
/** Advanced data editing is opt-in; changes stay staged until applied and validated by the domain. */
export function JsonDraft({ value, apply }: { value: unknown; apply: (value: unknown) => void }) {
	const [text, setText] = useState(() => JSON.stringify(value, null, 2)),
		[error, setError] = useState<unknown>();
	return (
		<details className="rounded-md border p-3">
			<summary className="cursor-pointer text-sm">{at('json')}</summary>
			<TextField label={at('json')} value={text} onChange={setText} multiline />
			<ErrorBox error={error} />
			<Button
				className="mt-2"
				variant="outline"
				onClick={() => {
					try {
						const parsed: unknown = JSON.parse(text);
						apply(parsed);
						setError(undefined);
					} catch (error) {
						setError(error);
					}
				}}
			>
				{at('applyJson')}
			</Button>
		</details>
	);
}
export function Reorder({ index, length, move }: { index: number; length: number; move: (to: number) => void }) {
	return (
		<div className="flex gap-1">
			<Button size="sm" variant="outline" disabled={!index} onClick={() => move(index - 1)}>
				{at('up')}
			</Button>
			<Button size="sm" variant="outline" disabled={index === length - 1} onClick={() => move(index + 1)}>
				{at('down')}
			</Button>
		</div>
	);
}
export function reordered<T>(values: readonly T[], from: number, to: number): T[] {
	const next = [...values],
		[item] = next.splice(from, 1);
	if (item !== undefined) next.splice(to, 0, item);
	return next;
}
