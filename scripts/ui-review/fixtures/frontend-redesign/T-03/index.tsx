import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { readyDocuments } from '../shared/ready-documents';
import { ContainerProviders, HuhuProviders } from '../../../../../src/ui/react/providers';
import { useOwnerDocument } from '../../../../../src/ui/react/contexts';
import { useT } from '../../../../../src/ui/react/hooks';
import { setLanguage, t } from '../../../../../src/shared/i18n';
import { applyInterfaceTheme } from '../../../../../src/theme/runtime';
import { themeSettings } from '../../../../../src/theme/settings';
import {
	Calendar,
	DateField,
	DateRangeField,
	DateTimeField,
	type DateRangeValue,
	type DateTimeValue,
} from '../../../../../src/ui/components/huhu/date';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from '../../../../../src/ui/components/dialog';
import { Button } from '../../../../../src/ui/components/button';

type State = {
	date: string | null;
	range: DateRangeValue;
	dateTime: DateTimeValue | null;
	calendar: string | null;
	calls: unknown[];
	trusted: { day: string | null; trusted: boolean }[];
};
const state: Record<string, State> = {};
let lifecycle: { root: ReturnType<typeof createRoot>; host: HTMLElement } | null = null;
const lifecycleCommits: (string | null)[] = [];
const api: Record<
	string,
	{
		date: (value: string | null) => void;
		range: (value: DateRangeValue) => void;
		dateTime: (value: DateTimeValue | null) => void;
		calendar: (value: string | null) => void;
		saturday: (value: boolean) => void;
	}
> = {};
function Probe({ name }: { name: string }) {
	const t = useT();
	const doc = useOwnerDocument();
	const [date, setDate] = useState<string | null>('2026-11-20'),
		[range, setRange] = useState<DateRangeValue>({ from: '2026-11-10', to: '2026-11-20' });
	const [dateTime, setDateTime] = useState<DateTimeValue | null>({
		date: '2026-11-20',
		time: '09:30',
		timeZone: 'Asia/Shanghai',
	});
	const [calendar, setCalendar] = useState<string | null>('2026-11-20'),
		[saturday, setSaturday] = useState(true);
	const record = state[name]!;
	record.date = date;
	record.range = range;
	record.dateTime = dateTime;
	record.calendar = calendar;
	api[name] = { date: setDate, range: setRange, dateTime: setDateTime, calendar: setCalendar, saturday: setSaturday };
	const common = { today: '2026-11-05', weekStartsOn: saturday ? (6 as const) : (1 as const) };
	return (
		<div className="date-probes">
			<section data-review="calendar">
				<Calendar
					{...common}
					value={calendar}
					onChange={(value) => {
						setCalendar(value);
						record.calls.push({ kind: 'calendar', value });
					}}
				/>
			</section>
			<section data-review="date">
				<DateField
					{...common}
					label={t('ui.date.date')}
					value={date}
					onChange={(value) => {
						setDate(value);
						record.calls.push({ kind: 'date', value });
					}}
				/>
			</section>
			<section data-review="range">
				<DateRangeField
					{...common}
					label={t('ui.date.range')}
					value={range}
					onChange={(value) => {
						setRange(value);
						record.calls.push({ kind: 'range', value });
					}}
				/>
			</section>
			<section data-review="datetime">
				<DateTimeField
					{...common}
					label={t('ui.date.date')}
					value={dateTime}
					initialTimeZone="Asia/Shanghai"
					validateValue={() => null}
					onChange={(value) => {
						setDateTime(value);
						record.calls.push({ kind: 'datetime', value });
					}}
				/>
			</section>
			<section data-review="disabled">
				<DateField
					label={t('ui.disabled')}
					value="2026-11-20"
					onChange={() => {
						throw new Error('Disabled date changed');
					}}
					disabled
				/>
			</section>
			<section data-review="readonly">
				<DateField
					label={t('ui.name')}
					value="2026-11-20"
					onChange={() => {
						throw new Error('Readonly date changed');
					}}
					readOnly
				/>
			</section>
			<Dialog>
				<DialogTrigger asChild>
					<Button type="button" data-review="dialog-trigger">
						{t('ui.open')}
					</Button>
				</DialogTrigger>
				<DialogContent data-review="dialog">
					<DialogTitle>{t('ui.date.date')}</DialogTitle>
					<DialogDescription>{t('ui.sampleDescription')}</DialogDescription>
					<DateField
						{...common}
						collisionBoundary={doc.querySelector('[data-huhu-leaf]')}
						label={t('ui.date.date')}
						value={date}
						onChange={setDate}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}
async function bootstrap() {
	const docs = await readyDocuments(document);
	for (const [name, doc] of Object.entries(docs)) {
		// Obsidian supplies this Node extension; the isolated browser loads host CSS only.
		Object.defineProperty(doc.defaultView!.Node.prototype, 'instanceOf', {
			configurable: true,
			value(this: Node, type: typeof HTMLElement) {
				return this instanceof type;
			},
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
		main.setAttribute('data-huhu-leaf', '');
		doc.body.append(main);
		state[name] = {
			date: null,
			range: { from: null, to: null },
			dateTime: null,
			calendar: null,
			calls: [],
			trusted: [],
		};
		doc.addEventListener(
			'click',
			(event) => {
				const target = event.target;
				if (target instanceof doc.defaultView!.Element && target.closest('[data-day]'))
					state[name]!.trusted.push({
						day: target.closest('[data-day]')!.getAttribute('data-day'),
						trusted: event.isTrusted,
					});
			},
			true,
		);
		createRoot(main).render(
			<HuhuProviders ownerDocument={doc}>
				<Probe name={name} />
			</HuhuProviders>,
		);
	}
	Object.assign(globalThis, {
		uiReview: {
			docs,
			state,
			api,
			lifecycleCommits,
			mountLifecycle() {
				if (lifecycle) throw new Error('Lifecycle already mounted');
				const host = docs.main.createElement('div'),
					original = docs.main.querySelector('main')!;
				host.className = 'huhu-ui';
				host.dataset.review = 'lifecycle';
				host.setAttribute('data-huhu-leaf', '');
				for (const attribute of Array.from(original.attributes))
					if (attribute.name.startsWith('data-') || attribute.name === 'style')
						host.setAttribute(attribute.name, attribute.value);
				original.prepend(host);
				const root = createRoot(host);
				lifecycle = { root, host };
				root.render(
					<ContainerProviders container={host}>
						<DateField
							label={t('ui.date.date')}
							value="2026-11-20"
							onChange={(value) => lifecycleCommits.push(value)}
							today="2026-11-05"
						/>
					</ContainerProviders>,
				);
			},
			adoptLifecycle() {
				if (!lifecycle) throw new Error('Lifecycle not mounted');
				docs.second.querySelector('main')!.prepend(docs.second.adoptNode(lifecycle.host));
			},
			unmountLifecycle() {
				if (!lifecycle) throw new Error('Lifecycle not mounted');
				lifecycle.root.unmount();
				lifecycle.host.remove();
				lifecycle = null;
			},

			configure(sample: Record<string, unknown>) {
				setLanguage(sample.language === 'zh' ? 'zh' : 'en');
				const frame = document.querySelector('iframe')!;
				frame.style.width = `${sample.cssWidth ?? sample.width}px`;
				for (const doc of Object.values(docs)) {
					doc.documentElement.lang = String(sample.language);
					doc.body.className = sample.theme === 'ink' ? 'theme-dark' : 'theme-light';
					doc.body.style.cssText = '';
					if (sample.source === 'obsidian') {
						const dark = sample.theme === 'ink',
							surface = dark ? '#1d1c19' : '#ffffff';
						const colors = {
							'background-primary': surface,
							'background-secondary': surface,
							'background-secondary-alt': surface,
							'text-normal': dark ? '#eeeeee' : '#111111',
							'text-muted': dark ? '#cccccc' : '#444444',
							'interactive-accent': dark ? '#6fb4af' : '#24575a',
							'text-on-accent': dark ? '#0f1f1e' : '#ffffff',
							'text-accent': sample.hostMode === 'unsafe' ? surface : dark ? '#eeeeee' : '#111111',
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
