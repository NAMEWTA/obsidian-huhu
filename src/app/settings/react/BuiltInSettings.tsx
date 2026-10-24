import type { ComponentType } from 'react';
import {
	Archive,
	Bot,
	CalendarClock,
	ExternalLink,
	FileText,
	FolderTree,
	Globe,
	GitBranch,
	LayoutDashboard,
	MessageSquareText,
	Palette,
	Shapes,
	Star,
} from 'lucide-react';
import { useT } from '../../../ui/react/hooks';
import { Button } from '../../../ui/components/button';
import { Badge } from '../../../ui/components/badge';
import { Separator } from '../../../ui/components/separator';

const REPO = 'https://github.com/NAMEWTA/obsidian-huhu';
type Icon = ComponentType<{ className?: string }>;

const FEATURES: ReadonlyArray<{ key: string; icon: Icon }> = [
	{ key: 'dashboard', icon: LayoutDashboard },
	{ key: 'navigator', icon: FolderTree },
	{ key: 'agents', icon: Bot },
	{ key: 'browser', icon: Globe },
	{ key: 'archives', icon: Archive },
	{ key: 'automations', icon: CalendarClock },
	{ key: 'sync', icon: GitBranch },
	{ key: 'comments', icon: MessageSquareText },
	{ key: 'icons', icon: Shapes },
	{ key: 'appearance', icon: Palette },
];

function ExternalButton({ href, icon: Glyph, label, primary }: { href: string; icon: Icon; label: string; primary?: boolean }) {
	return (
		<Button asChild variant={primary ? 'default' : 'outline'} size="sm">
			<a href={href} target="_blank" rel="noopener noreferrer" className="no-underline hover:no-underline">
				<Glyph className="size-4" />
				{label}
			</a>
		</Button>
	);
}

/** The About page: a README-style document, not a settings form. */
export function AboutSettings({ version }: { version: string }) {
	const t = useT();
	return (
		<article className="huhu-about mx-auto flex w-full max-w-[720px] flex-col gap-8 text-sm leading-relaxed">
			<header className="flex flex-col gap-4">
				<div className="flex items-center gap-3">
					<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-hidden="true">
						<Shapes className="size-6" />
					</div>
					<div className="min-w-0">
						<h1 className="m-0 text-2xl font-semibold leading-tight tracking-tight">HUHU</h1>
						<p className="m-0 text-muted-foreground">{t('about.tagline')}</p>
					</div>
				</div>
				<p className="m-0">{t('about.lead')}</p>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="secondary">{t('about.version', { version })}</Badge>
					<Badge variant="outline">{t('about.license')}</Badge>
					<Badge variant="outline">{t('about.author')}</Badge>
				</div>
				<div className="flex flex-wrap gap-2">
					<ExternalButton primary href={REPO} icon={Star} label={t('about.star')} />
					<ExternalButton href={`${REPO}/issues`} icon={MessageSquareText} label={t('about.issues')} />
					<ExternalButton href={`${REPO}/releases`} icon={ExternalLink} label={t('about.changelog')} />
				</div>
			</header>
			<Separator />
			<section aria-labelledby="huhu-about-features" className="flex flex-col gap-4">
				<h2 id="huhu-about-features" className="m-0 text-lg font-semibold">
					{t('about.featuresTitle')}
				</h2>
				<ul className="m-0 grid list-none p-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
					{FEATURES.map(({ key, icon: Glyph }) => (
						<li key={key} className="m-0 flex min-w-0 gap-3">
							<Glyph className="mt-0.5 size-4 shrink-0 text-primary" />
							<div className="min-w-0">
								<h3 className="m-0 text-sm font-medium leading-snug">{t(`about.f.${key}`)}</h3>
								<p className="m-0 mt-0.5 text-muted-foreground">{t(`about.f.${key}Desc`)}</p>
							</div>
						</li>
					))}
				</ul>
			</section>
			<Separator />
			<section aria-labelledby="huhu-about-data" className="flex flex-col gap-3">
				<h2 id="huhu-about-data" className="m-0 text-lg font-semibold">
					{t('about.dataTitle')}
				</h2>
				<ul className="m-0 list-disc pl-5">
					<li className="m-0 mt-1.5 first:mt-0">{t('about.dataContent')}</li>
					<li className="m-0 mt-1.5 first:mt-0">{t('about.dataConfig')}</li>
					<li className="m-0 mt-1.5 first:mt-0">{t('about.dataLocal')}</li>
				</ul>
			</section>
			<Separator />
			<section aria-labelledby="huhu-about-credits" className="flex flex-col gap-3">
				<h2 id="huhu-about-credits" className="m-0 text-lg font-semibold">
					{t('about.creditsTitle')}
				</h2>
				<p className="m-0">{t('about.creditsBody')}</p>
				<div className="flex flex-wrap gap-2">
					<ExternalButton href={`${REPO}/blob/main/NOTICE`} icon={FileText} label={t('about.notice')} />
					<ExternalButton href={`${REPO}/blob/main/THIRD-PARTY-NOTICES.md`} icon={FileText} label={t('about.thirdParty')} />
					<ExternalButton href={`${REPO}/blob/main/LICENSE`} icon={FileText} label={t('about.licenseFile')} />
				</div>
			</section>
		</article>
	);
}
