// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/pm-model.ts, src/pm-board-modal.ts
import { t } from '../../../shared/i18n';
import { createStore } from 'zustand/vanilla';
import { TFile, type App, type EventRef } from 'obsidian';
import type { PmConfig } from '../core/board/types/model';
import { parseProjectBody, projectBodyTemplate, insertProjectTask, removeProjectTask } from '../core/pm/body';
import { pipelineFrontmatter, patchPipelineFields } from '../platform/pipeline/vault';
import { togglePipelineTask, withinPipeline } from '../core/pipeline/rules';
import type { PipelineTask } from '../core/pipeline/model';
import { cleanVaultFolder, createVaultNote, safeFileName, vaultFileAt } from '../platform/vault/vault-notes';
import { ensureFolder } from '../platform/calendar/daily-notes';

/*
 * Projects are ordinary notes under a visible vault folder (`项目管理` unless the section says otherwise), each one a
 * note with `type: project` in its frontmatter. Everything here goes through Obsidian's own vault API.
 */
export interface Project {
	path: string;
	title: string;
	raw: string;
	fields: Record<string, unknown>;
	body: ReturnType<typeof parseProjectBody>;
}
export class ProjectStore {
	readonly state = createStore(() => ({ projects: [] as Project[], error: '', loading: true }));
	private generation = 0;
	private closed = false;
	private refs: EventRef[] = [];
	constructor(
		private app: App,
		private config: PmConfig,
	) {}
	private inScope(path: string): boolean {
		return (
			withinPipeline(this.config.rootFolder, path) ||
			(!!this.config.archiveFolder && withinPipeline(this.config.archiveFolder, path))
		);
	}
	connect(): () => void {
		this.closed = false;
		const changed = (file: { path: string }) => {
			if (file.path.endsWith('.md') && this.inScope(file.path)) void this.load();
		};
		const vault = this.app.vault;
		this.refs = [
			vault.on('create', changed),
			vault.on('modify', changed),
			vault.on('delete', changed),
			vault.on('rename', (file, oldPath) => {
				if (this.inScope(file.path) || this.inScope(oldPath)) void this.load();
			}),
		];
		void this.load();
		return () => {
			this.closed = true;
			this.generation++;
			for (const ref of this.refs) vault.offref(ref);
			this.refs = [];
		};
	}
	async load(): Promise<void> {
		const version = ++this.generation;
		try {
			const result = await Promise.all(
				this.app.vault
					.getMarkdownFiles()
					.filter((f) => this.inScope(f.path))
					.filter((f) => !this.config.excludeFolders?.some((folder) => withinPipeline(folder, f.path)))
					.map(async (f) => {
						const raw = await this.app.vault.cachedRead(f),
							fields = pipelineFrontmatter(raw);
						return { path: f.path, title: f.basename, raw, fields, body: parseProjectBody(raw) };
					}),
			);
			if (!this.closed && version === this.generation)
				this.state.setState({
					projects: result.filter((p) => String(p.fields.type).toLowerCase() === 'project'),
					loading: false,
					error: '',
				});
		} catch (error) {
			if (!this.closed) this.state.setState({ error: String(error), loading: false });
		}
	}
	private file(path: string): TFile | null {
		const file = this.app.vault.getFileByPath(path);
		return file instanceof TFile ? file : null;
	}
	async mutate(path: string, update: (raw: string) => string): Promise<void> {
		const file = this.file(path);
		if (!file) throw new Error(t('pm.fileMissing'));
		await this.app.vault.process(file, update);
		await this.load();
	}
	fields(path: string, fields: Record<string, unknown>): Promise<void> {
		return this.mutate(path, (raw) => patchPipelineFields(raw, fields));
	}
	toggle(path: string, task: PipelineTask, checked: boolean): Promise<void> {
		return this.mutate(path, (raw) => togglePipelineTask(raw, task, checked));
	}
	addTask(path: string, section: 'milestone' | 'todo', text: string): Promise<void> {
		return this.mutate(path, (raw) => insertProjectTask(raw, section, text));
	}
	removeTask(path: string, task: PipelineTask): Promise<void> {
		return this.mutate(path, (raw) =>
			raw.split('\n')[task.line] === task.originalLine ? removeProjectTask(raw, task.line) : raw,
		);
	}
	/** A dated note in the project's own folder (`<root>/<project>/YYYY-MM-DD.md`), made from the template when one is set. */
	async workNote(project: Project): Promise<string> {
		const folder = `${cleanVaultFolder(this.config.rootFolder)}/${safeFileName(project.title)}`,
			template = this.config.workNoteTemplate ? vaultFileAt(this.app, this.config.workNoteTemplate) : null,
			body = template ? await this.app.vault.cachedRead(template) : `# ${project.title}\n\n`;
		return (await createVaultNote(this.app, folder, new Date().toLocaleDateString('sv-SE'), body)).path;
	}
	async trash(path: string): Promise<void> {
		const file = this.file(path);
		if (file) await this.app.fileManager.trashFile(file);
		await this.load();
	}
	async create(name: string): Promise<void> {
		await createVaultNote(
			this.app,
			this.config.rootFolder,
			safeFileName(name),
			`---\ntype: project\nstage: ${JSON.stringify(this.config.stages?.[0]?.label ?? '')}\n---\n\n${projectBodyTemplate(this.config.stages.map((s) => s.label))}\n`,
		);
		await this.load();
	}
	async archive(project: Project, archived: boolean): Promise<void> {
		await this.fields(project.path, { archived });
		if (archived && this.config.archiveFolder) {
			const file = this.file(project.path);
			if (file) {
				const folder = cleanVaultFolder(this.config.archiveFolder);
				await ensureFolder(this.app, folder);
				await this.app.fileManager.renameFile(file, `${folder}/${project.title}.md`);
			}
		}
		await this.load();
	}
}
