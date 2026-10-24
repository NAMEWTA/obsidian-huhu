import {
	lazy,
	Suspense,
	useEffect,
	useState,
	type ComponentType,
} from 'react';
import type DashboardPlugin from '../../main';
import type { SettingsPageHost } from '../../contracts/module';
import type { WorkbenchTarget } from '../../contracts/workbench';
import { t } from '../../../shared/i18n';
import { SettingsSection } from '../../../ui/components/huhu/SettingsSection';
import { PRODUCT_MODULES } from '../nav';
import { AboutSettings } from './BuiltInSettings';
import { AppearanceSettings } from './appearance/AppearanceSettings';
import { GeneralSettings } from './GeneralSettings';
const ComponentGallery = lazy(() => import('../../../ui/react/gallery').then((m) => ({ default: m.ComponentGallery })));
export function ModuleSettings({
	plugin,
	category,
	resourceId,
}: {
	plugin: DashboardPlugin;
	category: string;
	resourceId?: string;
}) {
	const [loaded, setLoaded] = useState<{
		loader?: () => Promise<ComponentType<SettingsPageHost>>;
		Component?: ComponentType<SettingsPageHost>;
		error?: string;
	}>({});
	const module = PRODUCT_MODULES[category as keyof typeof PRODUCT_MODULES];
	const load = module ? plugin.moduleInstance(module)?.settingsPage : undefined;
	// An on-demand module (the safe) is not running until something needs it; opening its settings does.
	useEffect(() => {
		if (module && !load) void plugin.activateModule(module).catch(() => undefined);
	}, [plugin, module, load]);
	useEffect(() => {
		let alive = true;
		if (load)
			void load().then(
				(value) => {
					if (alive) setLoaded({ loader: load, Component: value });
				},
				(error: unknown) => {
					if (alive)
						setLoaded({ loader: load, error: error instanceof Error ? error.message : String(error) });
				},
			);
		return () => {
			alive = false;
		};
	}, [load]);
	if (loaded.loader === load && loaded.error)
		return (
			<p role="alert" data-settings-results="true" className="text-destructive">
				{loaded.error}
			</p>
		);
	if (loaded.loader === load && loaded.Component)
		return <loaded.Component key={resourceId} resourceId={resourceId} />;
	return (
		<p role="status" data-settings-pending className="text-xs text-muted-foreground">
			{t('workbench.loading')}
		</p>
	);
}

/** One settings category: the built-in pages, the component gallery or a module's own settings page. */
export function CategoryContent({
	plugin,
	section,
	resourceId,
	navigate,
}: {
	plugin: DashboardPlugin;
	section: { id: string; label: string };
	resourceId?: string;
	navigate: (target: WorkbenchTarget) => void;
}) {
	if (section.id === 'general') return <GeneralSettings plugin={plugin} navigate={navigate} />;
	if (section.id === 'about') return <AboutSettings version={plugin.manifest.version} />;
	return (
		<SettingsSection title={section.label}>
			{section.id === 'components' ? (
				<Suspense fallback={<p>{t('workbench.loading')}</p>}>
					<ComponentGallery />
				</Suspense>
			) : section.id === 'appearance' ? (
				<AppearanceSettings plugin={plugin} />
			) : (
				<ModuleSettings plugin={plugin} category={section.id} resourceId={resourceId} />
			)}
		</SettingsSection>
	);
}
