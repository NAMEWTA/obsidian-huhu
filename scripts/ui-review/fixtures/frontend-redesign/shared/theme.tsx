import { readyDocuments } from './ready-documents';
import { createRoot } from 'react-dom/client';
import { applyInterfaceTheme } from '../../../../../src/theme/runtime';
import { themeSettings } from '../../../../../src/theme/settings';
import { Button } from '../../../../../src/ui/components/button';
import { Input } from '../../../../../src/ui/components/input';
import { Command, CommandInput, CommandList, CommandItem } from '../../../../../src/ui/components/command';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '../../../../../src/ui/components/dropdown-menu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../../src/ui/components/select';
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogTitle,
	DialogDescription,
} from '../../../../../src/ui/components/dialog';
import { Toaster } from '../../../../../src/ui/components/sonner';
import { OwnerDocumentContext, PortalContainerContext } from '../../../../../src/ui/react/contexts';
import { useT } from '../../../../../src/ui/react/hooks';
import { registerMessages, setLanguage, getLanguage } from '../../../../../src/shared/i18n';
import { messages } from '../../../../../src/shared/i18n/lazy/ui';
registerMessages(messages);
function Probe({ doc, portal }: { doc: Document; portal: HTMLElement }) {
	const t = useT();
	return (
		<OwnerDocumentContext.Provider value={doc}>
			<PortalContainerContext.Provider value={portal}>
				<section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hu-space-4)', minWidth: 0 }}>
					<h1 style={{ fontSize: 'var(--hu-text-lg)' }}>HUHU</h1>
					<p data-review="description" style={{ color: 'var(--hu-fg-3)' }}>
						{t('ui.sampleDescription')}
					</p>
					<Button data-review="save">{t('ui.save')}</Button>
					<Input aria-label={t('ui.rename')} placeholder={t('ui.pathPlaceholder')} />
					<Select defaultValue="paper">
						<SelectTrigger aria-label={t('ui.sample')}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="paper">{t('ui.sample')}</SelectItem>
						</SelectContent>
					</Select>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button>{t('ui.overlays')}</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem>{t('ui.sample')}</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<Dialog>
						<DialogTrigger asChild>
							<Button data-review="overlay">{t('ui.overlays')}</Button>
						</DialogTrigger>
						<DialogContent data-review="dialog">
							<DialogTitle>{t('ui.overlays')}</DialogTitle>
							<DialogDescription>{t('ui.sampleDescription')}</DialogDescription>
							<Input data-review="overlay-input" aria-label={t('ui.rename')} />
							<div
								data-review="overlay-selection"
								style={{ background: 'var(--hu-accent-soft)', color: 'var(--hu-accent-text)' }}
							>
								{t('ui.sample')}
							</div>
							<Button data-review="overlay-primary">{t('ui.confirm')}</Button>
						</DialogContent>
					</Dialog>
					<Command>
						<CommandInput aria-label={t('ui.search')} />
						<CommandList>
							<CommandItem>{t('ui.sample')}</CommandItem>
						</CommandList>
					</Command>
					<div role="status" style={{ color: 'var(--hu-success)', background: 'var(--hu-success-soft)' }}>
						{t('ui.completed')}
					</div>
					<div data-review="motion" aria-hidden="true" />
				</section>
				<Toaster container={portal} />
			</PortalContainerContext.Provider>
		</OwnerDocumentContext.Provider>
	);
}
async function bootstrap() {
	const docs = await readyDocuments(document);
	for (const doc of Object.values(docs)) {
		const main = doc.createElement('main');
		main.className = 'huhu-ui';
		main.dataset.review = 'motion-root';
		main.style.cssText =
			'padding:var(--hu-card-pad);background:var(--hu-surface);color:var(--hu-fg);max-width:100%';
		doc.body.append(main);
		const portal = doc.createElement('div');
		portal.className = 'huhu-ui huhu-portal-root';
		doc.body.append(portal);
		createRoot(main).render(<Probe doc={doc} portal={portal} />);
	}
	Object.assign(globalThis, {
		uiReview: {
			docs,
			getLanguage,
			configure(sample: Record<string, unknown>) {
				setLanguage(sample.language === 'zh' ? 'zh' : 'en');
				for (const doc of Object.values(docs)) {
					doc.documentElement.lang = String(sample.language);
					doc.body.className = sample.theme === 'ink' ? 'theme-dark' : 'theme-light';
					const dark = sample.theme === 'ink';
					const host = doc.body.style;
					host.cssText = '';
					if (sample.source === 'obsidian') {
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
						for (const [name, value] of Object.entries(colors)) host.setProperty(`--${name}`, value);
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
