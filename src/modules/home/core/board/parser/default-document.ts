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
	const todoName = t('renderer.typeTodo');
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
				name: todoName,
				color: '#6366f1',
				sectionType: 'todo',
				cards: [
					{
						id: 'demo-todo-1',
						title: t('default.todoTitle1'),
						type: 'task',
						column: todoName,
						body: '',
						tasks: [
							{ text: t('default.todo1'), checked: false },
							{ text: t('default.todo2'), checked: false },
							{ text: t('default.todo3'), checked: false },
							{ text: t('default.todo4'), checked: false },
						],
						docs: [],
						url: '',
						wikiLink: '',
						progress: -1,
						streak: 0,
						dueDate: '',
						blockquote: '',
						color: '',
						coverImage: '',
						width: 0,
						size: 'M',
						gridCols: 0,
						gridRows: 0,
						gridCol: 0,
						gridRow: 0,
					},
					{
						id: 'demo-todo-2',
						title: t('default.todoTitle2'),
						type: 'task',
						column: todoName,
						body: '',
						tasks: [
							{ text: t('default.guide1'), checked: false },
							{ text: t('default.guide2'), checked: false },
							{ text: t('default.guide3'), checked: false },
							{ text: t('default.guide4'), checked: false },
						],
						docs: [],
						url: '',
						wikiLink: '',
						progress: -1,
						streak: 0,
						dueDate: '',
						blockquote: '',
						color: '',
						coverImage: '',
						width: 0,
						size: 'M',
						gridCols: 0,
						gridRows: 0,
						gridCol: 0,
						gridRow: 0,
					},
				],
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
