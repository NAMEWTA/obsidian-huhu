import { openNoteAt } from '../../../host/obsidian/open-note';
import { TFile, TFolder, type App } from 'obsidian';
import type { ArchiveResources } from '../../archives/api';
import type { NavigatorPanel } from '../../navigator/api';
import type { TaskResources, TaskResource, TaskResourceResolution } from '../api';
import { normalizeResources, validResourcePath } from '../core/resources';
import { TaskError } from '../core/model';
export function createTaskResources(
	app: App,
	archives: () => ArchiveResources | undefined,
	navigator: () => NavigatorPanel | undefined,
	available: () => boolean,
): TaskResources {
	const assertAvailable = () => {
		if (!available()) throw new TaskError('unavailable');
	};
	const resolve = async (resource: TaskResource): Promise<TaskResourceResolution> => {
		assertAvailable();
		normalizeResources([resource]);
		if (resource.kind === 'archive') {
			const provider = archives();
			if (!provider) return { resource, label: resource.id, status: 'unavailable' };
			try {
				const record = await provider.get(resource.id);
				return {
					resource,
					label: record?.label ?? resource.id,
					path: record?.path,
					status: record ? 'available' : 'missing',
				};
			} catch {
				return { resource, label: resource.id, status: 'unavailable' };
			}
		}
		const file = app.vault.getAbstractFileByPath(resource.path);
		const exists = resource.kind === 'folder' ? file instanceof TFolder : file instanceof TFile;
		return {
			resource,
			label: file?.name ?? resource.path,
			path: resource.path,
			status: exists ? 'available' : 'missing',
		};
	};
	return {
		resolve,
		async search(text, kind) {
			assertAvailable();
			const needle = text.trim().toLocaleLowerCase();
			const matches: TaskResourceResolution[] = [];
			if (kind !== 'archive')
				for (const file of app.vault.getAllLoadedFiles()) {
					if (!validResourcePath(file.path) || (needle && !file.path.toLocaleLowerCase().includes(needle)))
						continue;
					const fileKind = file instanceof TFolder ? 'folder' : 'file';
					if (kind && kind !== fileKind) continue;
					matches.push({
						resource: { kind: fileKind, path: file.path },
						label: file.name,
						path: file.path,
						status: 'available',
					});
					if (matches.length >= 100) break;
				}
			if ((!kind || kind === 'archive') && archives())
				for (const record of await archives()!.list(text))
					matches.push({
						resource: { kind: 'archive', id: record.id },
						label: record.label,
						path: record.path,
						status: 'available',
					});
			return matches.slice(0, 100);
		},
		async open(resource, owner) {
			const resolution = await resolve(resource);
			assertAvailable();
			if (resolution.status !== 'available') throw new TaskError('not-found');
			if (resource.kind === 'archive') {
				await archives()!.open(resource.id, owner);
				return;
			}
			if (resource.kind === 'folder') {
				const panel = navigator();
				if (!panel) throw new TaskError('unavailable');
				panel.reveal(resource.path);
				return;
			}
			const file = app.vault.getFileByPath(resource.path);
			if (!file) throw new TaskError('not-found');
			await openNoteAt(app, file, { owner });
		},
	};
}
