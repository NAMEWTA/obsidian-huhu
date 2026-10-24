import { useRef, useState } from 'react';
import { CalendarPlus, Plus } from 'lucide-react';
import { t } from '../../../../shared/i18n';
import { Input } from '../../input';
import { Button } from '../../button';
export function TaskComposer({
	add,
	options,
}: {
	add(this: void, text: string): Promise<boolean>;
	options?(this: void, text: string, saved: () => void): void;
}) {
	const [text, setText] = useState(''),
		[pending, setPending] = useState(false),
		[error, setError] = useState('');
	const busy = useRef(false);
	const submit = async () => {
		if (busy.current || !text.trim()) return;
		busy.current = true;
		setPending(true);
		setError('');
		try {
			if (await add(text.trim())) setText('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : t('calendarUnified.error.write-failed'));
		} finally {
			busy.current = false;
			setPending(false);
		}
	};
	return (
		<form
			data-task-composer
			className="mt-auto shrink-0 border-t border-border/50 pb-2 pt-3"
			onKeyDown={(event) => {
				if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') {
					event.preventDefault();
					if (!event.nativeEvent.isComposing) void submit();
				}
			}}
			onSubmit={(event) => {
				event.preventDefault();
				void submit();
			}}
		>
			<div className="flex items-center gap-1">
				<Input
					className="min-w-0 flex-1"
					value={text}
					placeholder={t('calendarUnified.add')}
					aria-label={t('calendarUnified.taskTitle')}
					onChange={(event) => setText(event.currentTarget.value)}
					disabled={pending}
				/>
				{options && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={t('tasks.schedule')}
						disabled={pending}
						onClick={() => options(text, () => setText(''))}
					>
						<CalendarPlus />
					</Button>
				)}
				<Button
					type="submit"
					variant="ghost"
					size="icon"
					aria-label={t('calendarUnified.add')}
					disabled={pending || !text.trim()}
				>
					<Plus />
				</Button>
			</div>
			{error && (
				<p role="alert" className="mb-0 mt-2 text-sm text-destructive">
					{error}
				</p>
			)}
		</form>
	);
}
