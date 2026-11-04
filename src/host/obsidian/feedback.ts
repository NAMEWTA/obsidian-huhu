import { Notice } from 'obsidian';
import { t } from '../../shared/i18n';
import { createFeedback, type FeedbackInput, type FeedbackResult, type FeedbackView } from '../../shared/feedback';

export type WindowFeedbackUpdate = Omit<FeedbackInput, 'target'> & FeedbackResult;

export interface FeedbackRenderer {
	present(view: FeedbackView): void;
	remove(id: string): void;
	dispose(): void;
}
export interface FeedbackHostOptions {
	/** The app supplies the lazy UI adapter; host never imports React or sonner. */
	mount(container: HTMLElement, toasterId: string): Promise<FeedbackRenderer>;
	notice?: (text: string) => Pick<Notice, 'containerEl' | 'setMessage' | 'hide'>;
}

type WindowFeedback = {
	id: string;
	win: Window;
	closed: boolean;
	views: Map<string, FeedbackView>;
	notices: Map<string, Pick<Notice, 'containerEl' | 'setMessage' | 'hide'>>;
	container?: HTMLElement;
	nativeContainer?: HTMLElement;
	renderer?: FeedbackRenderer;
	loading?: Promise<void>;
	failedUI?: boolean;
	unload(this: void): void;
};

const owners = new WeakMap<Window, FeedbackHost>();

/** App-bound, window-local entry point; closed/unbound windows ignore late results. */
export function publishFeedback(win: Window, input: WindowFeedbackUpdate): void {
	owners.get(win)?.publish(win, input);
}

/** Reports fixed, localizable failure text, never exception messages or input values. */
export function reportOperationFailure(win: Window, source: string, messageKey: string): void {
	publishFeedback(win, {
		operationId: crypto.randomUUID(), source, message: { key: messageKey }, outcome: 'failed',
	});
}

/** One plugin-owned runtime, independent of the notifications module and its settings. */
export class FeedbackHost {
	private readonly targets = new Map<string, WindowFeedback>();
	private readonly windows = new Map<Window, WindowFeedback>();
	private readonly instanceId = crypto.randomUUID();
	private sequence = 0;
	private disposed = false;
	private readonly feedback;

	constructor(private readonly options: FeedbackHostOptions) {
		this.feedback = createFeedback({
			translate: t,
			now: Date.now,
			timers: {
				set: (target, callback, ms) => this.targets.get(target)!.win.setTimeout(callback, ms),
				clear: (target, id) => this.targets.get(target)?.win.clearTimeout(id),
			},
			present: view => this.present(view),
			remove: (id, target) => {
				const state = this.targets.get(target);
				state?.views.delete(id);
				state?.renderer?.remove(id);
				state?.notices.get(id)?.hide();
				state?.notices.delete(id);
			},
		});
	}

	bind(win: Window): void {
		if (this.disposed || this.windows.has(win) || win.closed) return;
		const state: WindowFeedback = {
			id: `${this.instanceId}-${++this.sequence}`, win, closed: false,
			views: new Map(), notices: new Map(), unload: () => this.close(win),
		};
		this.windows.set(win, state);
		this.targets.set(state.id, state);
		owners.set(win, this);
		win.addEventListener('unload', state.unload);
	}

	publish(win: Window, input: WindowFeedbackUpdate): void {
		const state = this.windows.get(win);
		if (!state || state.closed || this.disposed) return;
		this.feedback.publish({ ...input, target: state.id });
	}

	private present(view: FeedbackView): void {
		const state = this.targets.get(view.target);
		if (!state || state.closed) return;
		state.views.set(view.id, view);
		const inWorkbench = !!state.win.document.querySelector('.huhu-workbench-view');
		if (!inWorkbench || state.failedUI || state.notices.has(view.id)) {
			this.presentNotice(state, view);
			return;
		}
		if (state.renderer) {
			state.renderer.present(view);
			return;
		}
		if (state.loading) return;
		const container = state.win.document.body.createDiv({ cls: 'huhu-ui huhu-portal-root huhu-feedback-root' });
		state.container = container;
		state.loading = Promise.resolve().then(() => this.options.mount(container, state.id)).then(renderer => {
			if (state.closed) { renderer.dispose(); return; }
			state.renderer = renderer;
			for (const current of state.views.values()) if (!state.notices.has(current.id)) renderer.present(current);
		}).catch(() => {
			state.failedUI = true;
			container.remove();
			if (!state.closed) for (const current of state.views.values()) this.presentNotice(state, current);
		});
	}

	private presentNotice(state: WindowFeedback, view: FeedbackView): void {
		state.renderer?.remove(view.id);
		const doc = state.win.document;
		let notice = state.notices.get(view.id);
		if (!notice) {
			notice = this.options.notice?.(view.text) ?? new Notice(view.text, 0);
			let parent = doc.querySelector<HTMLElement>('.notices-container');
			if (!parent) parent = state.nativeContainer ??= doc.body.createDiv({ cls: 'notices-container' });
			parent.appendChild(notice.containerEl);
			state.notices.set(view.id, notice);
		}
		const body = doc.createDocumentFragment();
		body.append(view.text);
		if (view.progress) {
			const progress = doc.createElement('progress');
			body.append(progress);
			progress.setAttribute('aria-label', view.text);
			if (view.progress.total !== undefined && view.progress.total > 0) {
				progress.max = view.progress.total;
				progress.value = Math.max(0, Math.min(view.progress.completed, view.progress.total));
			}
		}
		for (const action of view.actions) {
			const button = doc.createElement('button');
			button.textContent = action.label;
			body.append(button);
			button.onclick = () => {
				void Promise.resolve().then(() => action.run()).catch(() => {
					// Keep the original result visible; the action owner reports its own failure.
				});
			};
		}
		if (view.outcome) notice.containerEl.dataset.feedbackOutcome = view.outcome;
		else delete notice.containerEl.dataset.feedbackOutcome;
		notice.setMessage(body);
	}

	close(win: Window): void {
		const state = this.windows.get(win);
		if (!state) return;
		state.closed = true;
		state.renderer?.dispose();
		state.renderer = undefined;
		this.feedback.closeTarget(state.id);
		win.removeEventListener('unload', state.unload);
		state.container?.remove();
		if (state.nativeContainer?.childElementCount === 0) state.nativeContainer.remove();
		this.windows.delete(win);
		this.targets.delete(state.id);
		if (owners.get(win) === this) owners.delete(win);
	}

	dispose(): void {
		this.disposed = true;
		for (const win of this.windows.keys()) this.close(win);
		this.feedback.dispose();
	}
}
