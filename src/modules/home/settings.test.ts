import { expect, test } from 'vitest';
import { homeSettings } from './settings';

test('home workspace registry is canonical, normalized and persists without flat adapters', () => {
	const value = homeSettings.normalize({
		workspaces: { files: ['.huhu/dashboards/One', '.huhu/dashboards/Two.md'], names: ['First', 'Second'], active: 1 },
		workspaceFiles: ['obsolete'],
		dashboardFile: 'obsolete',
	});
	expect(value.workspaces).toEqual({
		files: ['.huhu/dashboards/One', '.huhu/dashboards/Two'],
		names: ['First', 'Second'],
		active: 1,
	});
	expect(value.dashboardFile).toBe('.huhu/dashboards/Two');
	const saved = homeSettings.pick(value, 'vault');
	expect(saved).not.toHaveProperty('dashboardFile');
	expect(saved).not.toHaveProperty('workspaceFiles');
	expect(saved).toMatchObject({ workspaces: value.workspaces });
	expect(homeSettings.normalize(saved).workspaces).toEqual(value.workspaces);
	expect(homeSettings.normalize({ workspaceFiles: ['Old'] }).workspaces.files).toEqual(['.huhu/dashboards/dashboard']);
});
