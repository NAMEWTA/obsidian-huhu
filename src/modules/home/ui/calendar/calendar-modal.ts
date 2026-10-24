// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/calendar-modal.ts
import { createElement } from 'react';
import { Notice, type App } from 'obsidian';
import type { VaultTask } from '../../platform/calendar/alltasks-scan';
import { homeServices } from '../../services/instances';
import type { CalendarViewContext } from './CalendarPanel';
import { t } from '../../../../shared/i18n';
import { DashboardRenderContext } from '../renderer/render-context';
import { openRecordDialog } from '../dialogs/open-record-dialog';
import { CalendarModalPanel, DayAgendaPanel, type CalendarModalCallbacks } from './CalendarModalPanel';
import { dayLabel } from './calendar-layout';
import { addCalendarTask } from './calendar-add-task';
import { contentFiles } from '../../../../host/obsidian/storage/content-files';
function calendarContext(app: App, root: HTMLElement, cb: CalendarModalCallbacks) {
	const context = new DashboardRenderContext(root);
	context.noteOpener = (file, subpath) => {
		if (cb.onOpenNote) cb.onOpenNote(file);
		else void contentFiles(app).open(file.path + (subpath ?? ''), root.ownerDocument.defaultView ?? undefined);
	};
	return context;
}
export class CalendarMonthModal {
	private cleanup?: () => void;
	private child?: DayAgendaModal;
	constructor(
		private app: App,
		private byDay: Map<string, VaultTask[]>,
		private cb: CalendarModalCallbacks,
		private initialView: 'month' | 'week' = 'month',
		private initialWeekStart?: Date,
		private dashboardFile?: string,
		private doc = app.workspace.containerEl.ownerDocument,
		private position?: CalendarViewContext,
	) {}
	open(): void {
		this.cleanup = openRecordDialog(
			this.doc,
			t('calendar.fullscreen'),
			'dashboard-calendar-fullscreen-modal',
			(close, root) =>
				createElement(CalendarModalPanel, {
					app: this.app,
					context: calendarContext(this.app, root, this.cb),
					actions: this.cb,
					byDay: this.byDay,
					initialView: this.initialView,
					initialWeekStart: this.initialWeekStart,
					initialPosition: this.position,
					boardPath: this.dashboardFile,
					close,
					openDay: (iso, tasks, focus) => {
						this.child?.close();
						this.child = new DayAgendaModal(
							this.app,
							iso,
							tasks,
							this.cb,
							this.dashboardFile,
							focus,
							this.doc,
						);
						this.child.open();
					},
				}),
		);
	}
	close(): void {
		this.child?.close();
		this.cleanup?.();
		this.cleanup = undefined;
	}
}
export class DayAgendaModal {
	private cleanup?: () => void;
	constructor(
		private app: App,
		private iso: string,
		private tasks: VaultTask[],
		private cb: CalendarModalCallbacks,
		private dashboardFile?: string,
		private focusAddInput = false,
		private doc = app.workspace.containerEl.ownerDocument,
	) {}
	open(): void {
		this.cleanup = openRecordDialog(
			this.doc,
			`${dayLabel(this.iso)} · ${t('calendar.dayAgenda')}`,
			'dashboard-day-agenda-modal',
			(close, root) =>
				createElement(DayAgendaPanel, {
					app: this.app,
					context: calendarContext(this.app, root, this.cb),
					actions: this.cb,
					iso: this.iso,
					boardPath: this.dashboardFile,
					tasks: this.tasks,
					focusInput: this.focusAddInput,
					addTask: (title, time) => this.addTask(title, time),
					removeTask: (task) => this.removeTask(task),
					close,
				}),
		);
	}
	private addTask(title: string, time: string): Promise<VaultTask | null> {
		return addCalendarTask(this.app, this.iso, title, time, this.cb.settingsAccess, this.dashboardFile);
	}
	private async removeTask(task: VaultTask): Promise<boolean> {
		try {
			const result = await homeServices.calendar?.removeTask(task);
			if (!result || 'code' in result) { new Notice(t(result && 'code' in result ? `calendarUnified.error.${result.code}` : 'calendarUnified.unavailable')); return false; }
			return true;
		} catch (error) {
			console.error('[Dashboard] remove task failed', error);
			new Notice(t('calendar.taskRemoveFailed'));
			return false;
		}
	}
	close(): void {
		this.cleanup?.();
		this.cleanup = undefined;
	}
}
