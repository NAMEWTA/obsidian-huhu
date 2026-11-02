import { t } from '../../../../../shared/i18n/index';
import { serialize } from './parse';
import { defaultCanvas } from '../canvas';
import { DEFAULT_DASHBOARD_SETTINGS, type DashboardData, type DashboardSettings } from '../types/model';
import { legacyWeatherLocation } from '../weather-locations';

export function generateDefaultMarkdown(
	settings: Pick<
		DashboardSettings,
		'widgetWeatherCity' | 'widgetWeatherLat' | 'widgetWeatherLon'
	> = DEFAULT_DASHBOARD_SETTINGS,
): string {
	const memoName = t('renderer.typeMemo');
	const projectsName = t('default.projectsName');

	const board: DashboardData = {
		quickActions: [],
		columns: [
			{
				name: memoName,
				color: '#f59e0b',
				sectionType: 'memo',
				cards: [],
			},
			{
				name: projectsName,
				color: '#10b981',
				sectionType: 'projects',
				cards: [],
			},
		],
	};
	const canvas = defaultCanvas(board);
	for (const member of canvas.widgets ?? []) {
		if (member.provider === 'home' && member.kind === 'clock') member.weather = legacyWeatherLocation(settings);
	}
	return serialize(canvas);
}
