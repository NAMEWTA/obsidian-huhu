export { displayLabel, displayRelationLabel, customLabel } from '../../core/schema/labels';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Notice } from '../../../../ui/components/huhu/Notice';
import { Checkbox } from '../../../../ui/components/checkbox';
import { FormField } from '../../../../ui/components/huhu/FormField';
import { t } from '../../../../shared/i18n';
import { ArchiveError } from '../../core/schema/model';
import { Button } from '../../../../ui/components/button';
import { Input } from '../../../../ui/components/input';
import { Textarea } from '../../../../ui/components/textarea';
import { Choice } from '../../../../ui/components/huhu/Choice';
import { useVisible } from '../../../../ui/react/contexts';
import { openReactDialog } from '../../../../ui/react/dialog';
export { Button, Input, Textarea, Choice };
export const at = (key: string) => t(`archives.${key}`);
export const ct = (key: string) => t(`contacts.${key}`);
export function failure(error: unknown): string {
	return `${at('failure')} ${error instanceof ArchiveError ? [error.code, error.detail, ...error.fields].filter(Boolean).join(' · ') : error instanceof Error ? error.message : String(error)}`;
}
export function ErrorBox({ error }: { error: unknown }) {
	return error ? (
		<Notice tone="error" title={at('failure')}>
			{failure(error)}
		</Notice>
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
		<FormField label={label}>
			{multiline ? (
				<Textarea id={id} value={value} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} />
			) : (
				<Input id={id} value={value} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} />
			)}
		</FormField>
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
			<Checkbox
				id={id}
				checked={checked}
				disabled={disabled}
				onCheckedChange={(value) => onChange(value === true)}
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
		<section className="@container space-y-4 rounded-[var(--hu-radius-lg)] border border-border bg-card p-[var(--hu-card-pad)] shadow-[var(--hu-shadow-card)]">
			<h3 className="font-semibold">{title}</h3>
			{children}
		</section>
	);
}
export function confirmAt(owner: HTMLElement, message: string, accept: string, signal?: AbortSignal): Promise<boolean> {
	if (signal?.aborted) return Promise.resolve(false);
	return new Promise((resolve) => {
		let accepted = false;
		const abort = () => {
			dialog.close();
			resolve(false);
		};
		const dialog = openReactDialog(owner, {
			title: accept,
			description: message,
			content: (close) => (
				<div className="flex flex-wrap justify-end gap-2">
					<Button variant="secondary" onClick={close}>
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
			onClose: () => {
				signal?.removeEventListener('abort', abort);
				resolve(accepted);
			},
		});
		signal?.addEventListener('abort', abort, { once: true });
		if (signal?.aborted) abort();
	});
}
/** A confirmation belongs to the visible editor instance, not merely its still-connected leaf. */
export function useArchiveConfirm(owner: HTMLElement, identity?: string) {
	const visible = useVisible(),
		controller = useRef<AbortController | null>(null),
		pending = useRef<Promise<boolean> | null>(null);
	useEffect(() => {
		const lifetime = new AbortController();
		controller.current = lifetime;
		if (!visible) lifetime.abort();
		return () => {
			lifetime.abort();
			pending.current = null;
			if (controller.current === lifetime) controller.current = null;
		};
	}, [owner, identity, visible]);
	return useCallback(
		(message: string, accept: string) => {
			const lifetime = controller.current;
			if (!visible || !lifetime || lifetime.signal.aborted) return Promise.resolve(false);
			if (pending.current) return pending.current;
			const result = confirmAt(owner, message, accept, lifetime.signal);
			pending.current = result;
			void result.then(
				() => {
					if (pending.current === result) pending.current = null;
				},
				() => {
					if (pending.current === result) pending.current = null;
				},
			);
			return result;
		},
		[owner, visible],
	);
}
/** Advanced data editing is opt-in; changes stay staged until applied and validated by the domain. */
export function JsonDraft({ value, apply }: { value: unknown; apply: (value: unknown) => void }) {
	const [text, setText] = useState(() => JSON.stringify(value, null, 2)),
		[error, setError] = useState<unknown>();
	return (
		<details className="rounded-md border p-3">
			<summary className="flex min-h-[var(--hu-hit)] cursor-pointer items-center text-sm">{at('json')}</summary>
			<TextField label={at('json')} value={text} onChange={setText} multiline />
			<ErrorBox error={error} />
			<Button
				className="mt-2"
				variant="secondary"
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
			<Button size="sm" variant="secondary" disabled={!index} onClick={() => move(index - 1)}>
				{at('up')}
			</Button>
			<Button size="sm" variant="secondary" disabled={index === length - 1} onClick={() => move(index + 1)}>
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
