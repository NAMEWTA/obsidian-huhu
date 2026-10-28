import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal, type ILink, type ITheme } from '@xterm/xterm';
import { Notice, Platform, TFile, type App } from 'obsidian';
import { t } from '../../../../shared/i18n/index';
import { workspaceShortcut } from '../../core/workspace/shortcuts';
import { encodeKey, type KeyDescription } from '../../core/terminal/keyboard';
import { findFileReferences } from '../../core/terminal/links';
import { droppedPaths } from '../../core/terminal/paste';
import type { TerminalSettings } from '../../core/terminal/settings';
import { droppedFilePath, openPath, resolveReference, vaultFilePath } from '../../platform/desktop/files';
import type { TerminalSession } from '../../services/terminal/session';
import type { HiddenRendererRetention } from './hidden-renderer-retention';
import { StableTerminalFit } from './stable-terminal-fit';
import { TerminalPresentation } from './terminal-presentation';
import { XtermScreenTarget } from './terminal-screen-xterm';
import type { ScreenMark, ScreenViewLease } from '../../core/terminal/frames-screen';
import type { ActivityMark } from '../../core/workspace/managed-runtime';

export interface TerminalViewHost {
	app: App;
	settings(): TerminalSettings;
	retention: HiddenRendererRetention;
	vaultPath(): string | undefined;
	focused(view: TerminalView): void;
	menu?(view: TerminalView, event: MouseEvent): void;
	openLink?(url: string, event: MouseEvent): void;
	/** Renderer receipt only; installed is the pre-refresh baseline, not a contentSequence acknowledgment.
	 * The host must recheck its leaf/pane before acknowledging the captured activity mark.
	 */
	presented?(view: TerminalView, receipt: Readonly<{ at: ActivityMark; installed: ScreenMark }>): void;
}

export interface SearchOptions {
	caseSensitive: boolean;
	regex: boolean;
}
let viewId = 0;

function cssVar(el: HTMLElement, name: string): string {
	return el.win.getComputedStyle(el).getPropertyValue(name).trim();
}

/** Device-query sequences only the session model answers; a view must not answer them too. */
function swallowQueries(term: Terminal): void {
	const parser = term.parser;
	const swallow = () => true;
	for (const prefix of ['', '>', '='])
		parser.registerCsiHandler(prefix ? { prefix, final: 'c' } : { final: 'c' }, swallow);
	parser.registerCsiHandler({ final: 'n' }, swallow);
	parser.registerCsiHandler({ prefix: '?', final: 'n' }, swallow);
	parser.registerCsiHandler({ intermediates: '$', final: 'p' }, swallow);
	parser.registerCsiHandler({ prefix: '?', intermediates: '$', final: 'p' }, swallow);
	parser.registerCsiHandler({ prefix: '>', final: 'q' }, swallow);
	parser.registerCsiHandler({ prefix: '?', final: 'u' }, swallow);
	parser.registerDcsHandler({ intermediates: '$', final: 'q' }, swallow);
	for (const ident of [10, 11, 12]) parser.registerOscHandler(ident, (data) => data === '?');
}

/** One visible terminal bound to a session. Closing the view never ends the session. */
export class TerminalView {
	readonly el: HTMLElement;
	private term?: Terminal;
	private fit?: FitAddon;
	private searchAddon?: SearchAddon;
	private webgl?: WebglAddon;
	private presentation?: TerminalPresentation;
	private fitter?: StableTerminalFit;
	private target?: XtermScreenTarget;
	private lease?: ScreenViewLease;
	private focused = false;
	private focusGeneration = 0;
	private readonly statusEl: HTMLElement;
	private screenStatus = '';
	private observer?: ResizeObserver;
	private visible = false;
	private disposed = false;
	private fontDelta = 0;
	private activityReady = false;
	private activityIntersecting = false;
	private activityWindowFocused = false;
	private activityGeneration = 0;
	private activityRenderDepth = 0;
	private activityDispatchScheduled = false;
	private activityDispatch?: { generation: number; doc: Document; term: Terminal };
	private activityObserver?: IntersectionObserver;
	private activityPending?: ActivityMark;
	private activityLast?: ActivityMark;
	private activityRender?: {
		at: ActivityMark;
		installed: ScreenMark;
		generation: number;
		covered: Uint8Array;
		remaining: number;
	};
	private readonly cleanups: Array<() => void> = [];

	constructor(
		parent: HTMLElement,
		readonly session: TerminalSession,
		private readonly host: TerminalViewHost,
	) {
		this.el = parent.createDiv({ cls: 'huhu-terminal-view' });
		this.el.dataset.session = session.id;
		this.statusEl = this.el.createDiv({
			cls: 'pointer-events-none absolute inset-x-0 bottom-0 z-[var(--layer-popover)] bg-card p-1 text-xs text-muted-foreground',
		});
		this.statusEl.setAttribute('role', 'status');
		this.statusEl.setAttribute('aria-live', 'polite');
		this.statusEl.hidden = true;
		this.cleanups.push(session.onChange(() => this.showStatus()));
	}
	private showStatus(message = this.screenStatus): void {
		this.screenStatus = message;
		const text = [
			message,
			this.session.inputDiagnostic?.message,
			this.session.resizeDiagnostic?.message,
			this.session.replyDiagnostic?.message,
		]
			.filter(Boolean)
			.join(' ');
		this.statusEl.textContent = text;
		this.statusEl.hidden = !text;
	}

	private theme(): ITheme {
		const settings = this.host.settings();
		const el = this.el;
		const background = settings.useObsidianTheme
			? cssVar(el, '--background-primary')
			: settings.background || cssVar(el, '--background-primary');
		const foreground = settings.useObsidianTheme
			? cssVar(el, '--text-normal')
			: settings.foreground || cssVar(el, '--text-normal');
		el.style.setProperty('--huhu-terminal-background', background);
		return {
			background,
			foreground,
			cursor: foreground,
			cursorAccent: background,
			selectionBackground: cssVar(el, '--text-selection') || 'rgba(128,128,128,0.35)',
		};
	}

	private fontFamily(): string {
		const configured = this.host.settings().fontFamily.trim();
		return configured || cssVar(this.el, '--font-monospace') || 'Menlo, Consolas, "DejaVu Sans Mono", monospace';
	}

	/** Create the xterm presentation (first time the view is shown). */
	private mount(): void {
		if (this.term || this.disposed) return;
		try {
			this.lease = this.session.registerView(`terminal-view-${++viewId}`);
		} catch (error) {
			this.showStatus(t('agent.screen.unavailable'));
			console.error('[HUHU terminal]', error);
			return;
		}
		const cleanupStart = this.cleanups.length;
		try {
			const settings = this.host.settings();
			const term = new Terminal({
				allowProposedApi: true,
				cols: this.session.cols,
				rows: this.session.rows,
				scrollback: Math.min(settings.scrollback, this.session.getScreenProfile().maxScrollback),
				fontFamily: this.fontFamily(),
				fontSize: settings.fontSize + this.fontDelta,
				lineHeight: settings.lineHeight,
				cursorStyle: settings.cursorStyle,
				cursorBlink: settings.cursorBlink,
				theme: this.theme(),
				macOptionIsMeta: false,
				rightClickSelectsWord: false,
				windowsPty: Platform.isWin ? { backend: 'conpty' } : undefined,
			});
			this.term = term;
			this.fit = new FitAddon();
			this.searchAddon = new SearchAddon();
			term.loadAddon(this.fit);
			term.loadAddon(this.searchAddon);
			term.loadAddon(
				new WebLinksAddon((event, uri) => {
					event.preventDefault();
					if (this.host.openLink) this.host.openLink(uri, event);
					else this.el.ownerDocument.defaultView?.open(uri);
				}),
			);
			swallowQueries(term);
			term.open(this.el);
			this.loadRenderer();
			term.registerLinkProvider({ provideLinks: (line, callback) => callback(this.fileLinks(line)) });
			term.onData((data) => this.session.input(data));
			term.onBinary((data) => this.session.input(Uint8Array.from(data, (char) => char.charCodeAt(0) & 0xff)));
			term.attachCustomKeyEventHandler((event) => this.key(event));
			if (term.textarea) {
				this.listen(term.textarea, 'focus', () => {
					this.setFocused(true);
					this.host.focused(this);
				});
				this.listen(term.textarea, 'blur', () => this.setFocused(false));
			}
			this.listen(
				this.el,
				'paste',
				(event: ClipboardEvent) => {
					event.preventDefault();
					event.stopPropagation();
					const text = event.clipboardData?.getData('text/plain') ?? '';
					if (text) this.session.paste(text);
				},
				true,
			);
			if (this.host.menu)
				this.listen(this.el, 'contextmenu', (event: MouseEvent) => {
					event.preventDefault();
					this.host.menu?.(this, event);
				});
			this.listen(this.el, 'dragover', (event: DragEvent) => {
				event.preventDefault();
				if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
			});
			this.listen(this.el, 'drop', (event: DragEvent) => this.drop(event));
			this.target = new XtermScreenTarget(term, this.searchAddon, this.session.getScreenProfile());
			const target = this.target;
			this.observeActivity(term);
			this.presentation = new TerminalPresentation(
				{
					open: (options, sink) => this.session.openScreen(options, sink),
					installSnapshot: (snapshot) => target.installSnapshot(snapshot),
					applyPatch: (patch) => target.applyPatch(patch),
					status: (status) => {
						this.activityReady = status === 'ready';
						if (!this.activityReady) this.pauseActivity();
						this.showStatus(
							status === 'ready'
								? ''
								: t(
										status === 'resource-limit' &&
											this.session.getScreenUsage().status === 'resource-limit'
											? 'agent.screen.resourceLimit'
											: status === 'resync'
												? 'agent.screen.resync'
												: 'agent.screen.unavailable',
									),
						);
						this.refreshActivity();
					},
					error: (error) => console.error('[HUHU terminal]', error),
				},
				this.session.getScreenProfile(),
			);
			this.fitter = new StableTerminalFit({
				propose: () => {
					const grid = this.fit?.proposeDimensions();
					return grid && Number.isFinite(grid.cols) && Number.isFinite(grid.rows)
						? { cols: grid.cols, rows: grid.rows }
						: undefined;
				},
				current: () => ({ cols: term.cols, rows: term.rows }),
				measurable: () =>
					this.visible &&
					this.focused &&
					!!this.lease &&
					this.el.isConnected &&
					this.el.clientWidth > 0 &&
					this.el.clientHeight > 0,
				apply: (grid) => {
					const lease = this.lease,
						generation = this.focusGeneration;
					if (!lease || !this.visible || !this.focused || this.disposed) return;
					void this.session
						.requestViewSize(lease, grid)
						.then((result) => {
							if (this.disposed || generation !== this.focusGeneration || !this.visible || !this.focused)
								return;
							if (result.status === 'rejected' && result.reason !== 'not-owner')
								this.showStatus(t('agent.screen.sizeRejected'));
						})
						.catch((error) => {
							if (!this.disposed && generation === this.focusGeneration) {
								this.showStatus(t('agent.screen.sizeRejected'));
								console.error('[HUHU terminal]', error);
							}
						});
				},
				error: (error) => console.error('[HUHU terminal]', error),
			});
			const observer = new (this.el.win as Window & { ResizeObserver: typeof ResizeObserver }).ResizeObserver(
				() => this.fitter?.request(this.el.win),
			);
			this.observer = observer;
			observer.observe(this.el);
		} catch (error) {
			this.releaseMount(cleanupStart);
			this.showStatus(t('agent.screen.unavailable'));
			console.error('[HUHU terminal]', error);
		}
	}

	/** Complete every owned cleanup before returning the view reservation, even after a failure. */
	private releaseMount(cleanupStart: number, removeView = false): void {
		const lease = this.lease,
			presentation = this.presentation,
			fitter = this.fitter,
			observer = this.observer,
			webgl = this.webgl,
			target = this.target,
			term = this.term;
		this.pauseActivity();
		this.activityReady = false;
		this.activityObserver?.disconnect();
		this.activityObserver = undefined;
		this.activityIntersecting = false;
		this.focusGeneration++;
		this.focused = false;
		this.lease = undefined;
		this.presentation = undefined;
		this.fitter = undefined;
		this.observer = undefined;
		this.webgl = undefined;
		this.target = undefined;
		this.term = undefined;
		this.fit = undefined;
		this.searchAddon = undefined;
		const release = [
			() => presentation?.dispose(),
			() => fitter?.cancel(),
			() => observer?.disconnect(),
			...this.cleanups.splice(cleanupStart),
			() => webgl?.dispose(),
			() => target?.dispose(),
			() => term?.dispose(),
			() => this.el.querySelector('.xterm')?.remove(),
			...(removeView ? [() => this.host.retention.release(this), () => this.el.remove()] : []),
			() => {
				if (lease) this.session.unregisterView(lease);
			},
		];
		for (const run of release) {
			try {
				run();
			} catch (error) {
				console.error('[HUHU terminal cleanup]', error);
			}
		}
	}

	/** Capture a committed activity mark. At most one refresh and one latest pending mark are retained. */
	presentActivity(mark: ActivityMark | undefined): void {
		if (this.disposed) return;
		if (
			!mark ||
			mark.runtimeId !== this.session.id ||
			!Number.isSafeInteger(mark.activitySequence) ||
			mark.activitySequence < 0
		) {
			this.activityGeneration++;
			this.activityDispatch = undefined;
			this.activityPending = this.activityRender = this.activityLast = undefined;
			return;
		}
		const same = (other?: ActivityMark) =>
			other?.runtimeId === mark.runtimeId && other.activitySequence === mark.activitySequence;
		if (same(this.activityLast) || same(this.activityRender?.at) || same(this.activityPending)) return;
		this.activityPending = { ...mark };
		this.refreshActivity();
	}

	private activityVisible(): boolean {
		const doc = this.el.ownerDocument,
			rect = this.el.getBoundingClientRect();
		return (
			!this.disposed &&
			this.visible &&
			this.activityIntersecting &&
			this.activityWindowFocused &&
			doc.visibilityState === 'visible' &&
			doc.hasFocus() &&
			this.el.isConnected &&
			!this.el.closest('[hidden], [inert]') &&
			rect.width > 0 &&
			rect.height > 0
		);
	}

	private pauseActivity(): void {
		this.activityGeneration++;
		this.activityDispatch = undefined;
		this.activityPending ??= this.activityRender?.at ?? this.activityLast;
		this.activityRender = undefined;
		this.activityLast = undefined;
	}

	private refreshActivity(): void {
		const term = this.term,
			installed = this.target?.watermark,
			at = this.activityPending;
		if (
			!this.host.presented ||
			this.activityRender ||
			!at ||
			!term ||
			!installed ||
			!this.activityReady ||
			installed.runtimeId !== at.runtimeId ||
			!this.activityVisible()
		)
			return;
		if (this.activityRenderDepth) {
			const doc = this.el.ownerDocument,
				win = doc.defaultView;
			if (!win) return;
			this.activityDispatch = { generation: this.activityGeneration, doc, term };
			if (!this.activityDispatchScheduled) {
				this.activityDispatchScheduled = true;
				// xterm restores its redraw flag after public onRender returns; rearm outside that stack.
				win.queueMicrotask(() => {
					this.activityDispatchScheduled = false;
					const dispatch = this.activityDispatch;
					this.activityDispatch = undefined;
					if (
						!dispatch ||
						dispatch.generation !== this.activityGeneration ||
						dispatch.doc !== this.el.ownerDocument ||
						dispatch.term !== this.term
					)
						return;
					this.refreshActivity();
				});
			}
			return;
		}
		this.activityPending = undefined;
		this.activityRender = {
			at,
			installed: { ...installed },
			generation: this.activityGeneration,
			covered: new Uint8Array(term.rows),
			remaining: term.rows,
		};
		term.refresh(0, term.rows - 1);
	}

	private observeActivity(term: Terminal): void {
		if (!this.host.presented) return;
		const doc = this.el.ownerDocument,
			win = doc.defaultView;
		if (!win) return;
		this.activityWindowFocused = doc.hasFocus();
		const changed = () => {
			if (!this.activityVisible()) this.pauseActivity();
			else this.refreshActivity();
		};
		const focus = () => {
			this.activityWindowFocused = doc.hasFocus();
			changed();
		};
		const blur = () => {
			this.activityWindowFocused = false;
			this.pauseActivity();
		};
		doc.addEventListener('visibilitychange', changed);
		win.addEventListener('focus', focus);
		win.addEventListener('blur', blur);
		this.cleanups.push(() => {
			doc.removeEventListener('visibilitychange', changed);
			win.removeEventListener('focus', focus);
			win.removeEventListener('blur', blur);
		});
		const Observer = (win as Window & { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver;
		if (Observer) {
			this.activityObserver = new Observer((entries) => {
				for (const entry of entries)
					if (entry.target === this.el)
						this.activityIntersecting = entry.isIntersecting && entry.intersectionRatio > 0;
				changed();
			});
			this.activityObserver.observe(this.el);
		}
		const rendered = term.onRender(({ start, end }) => {
			this.activityRenderDepth++;
			try {
				const frame = this.activityRender;
				if (!frame) return;
				if (
					frame.generation !== this.activityGeneration ||
					!this.activityReady ||
					frame.covered.length !== term.rows ||
					!this.activityVisible()
				) {
					this.pauseActivity();
					this.refreshActivity();
					return;
				}
				for (let row = Math.max(0, start); row <= Math.min(end, term.rows - 1); row++) {
					if (!frame.covered[row]) {
						frame.covered[row] = 1;
						frame.remaining--;
					}
				}
				if (frame.remaining) return;
				this.activityRender = undefined;
				this.activityLast = frame.at;
				this.host.presented?.(this, { at: frame.at, installed: frame.installed });
				this.refreshActivity();
			} finally {
				this.activityRenderDepth--;
			}
		});
		this.cleanups.push(() => rendered.dispose());
	}

	private listen<K extends keyof HTMLElementEventMap>(
		el: HTMLElement,
		type: K,
		handler: (event: HTMLElementEventMap[K]) => void,
		capture = false,
	): void {
		el.addEventListener(type, handler, capture);
		this.cleanups.push(() => el.removeEventListener(type, handler, capture));
	}

	private loadRenderer(): void {
		if (!this.term || this.webgl || this.host.settings().renderer !== 'webgl') return;
		try {
			const webgl = new WebglAddon();
			webgl.onContextLoss(() => {
				webgl.dispose();
				if (this.webgl === webgl) this.webgl = undefined;
			});
			this.term.loadAddon(webgl);
			this.webgl = webgl;
		} catch {
			// The DOM renderer stays in use.
		}
	}

	private releaseRenderer(): void {
		this.webgl?.dispose();
		this.webgl = undefined;
	}

	private key(event: KeyboardEvent): boolean {
		const term = this.term;
		if (!term) return true;
		if (workspaceShortcut(event)) return false;
		const mod = Platform.isMacOS ? event.metaKey : event.ctrlKey;
		if (event.type === 'keydown') {
			// Copy with a selection (Ctrl+C without one interrupts; Ctrl+Shift+C always copies).
			if (
				event.key.toLowerCase() === 'c' &&
				((mod && term.hasSelection()) || (event.ctrlKey && event.shiftKey))
			) {
				void this.copy();
				event.preventDefault();
				return false;
			}
			// Paste goes through the DOM paste event (sanitized there).
			if (event.key.toLowerCase() === 'v' && (mod || (event.ctrlKey && event.shiftKey))) return false;
		}
		const composing = event.isComposing || event.key === 'Process';
		const description: KeyDescription = {
			type: event.type === 'keyup' ? 'keyup' : 'keydown',
			key: event.key,
			code: event.code,
			shift: event.shiftKey,
			alt: event.altKey,
			ctrl: event.ctrlKey,
			meta: event.metaKey,
			repeat: event.repeat,
			capsLock: event.getModifierState?.('CapsLock') ?? false,
		};
		const modes = this.session.keyboard;
		if (event.type === 'keypress') return !modes.win32;
		const encoded = encodeKey(description, modes, composing);
		if (encoded === undefined) return event.type === 'keydown' || !modes.win32;
		event.preventDefault();
		this.session.input(encoded);
		return false;
	}

	private fileLinks(line: number): ILink[] {
		const term = this.term;
		const text = term?.buffer.active.getLine(line - 1)?.translateToString(true) ?? '';
		return findFileReferences(text).map((ref) => ({
			range: { start: { x: ref.start + 1, y: line }, end: { x: ref.end, y: line } },
			text: text.slice(ref.start, ref.end),
			activate: () => void this.openReference(ref.path, ref.line),
		}));
	}

	private async openReference(reference: string, line?: number): Promise<void> {
		const target = await resolveReference(reference, this.session.cwd, this.host.vaultPath(), this.session.home);
		if (target?.kind === 'vault') {
			const file = this.host.app.vault.getAbstractFileByPath(target.path);
			if (file instanceof TFile) {
				await this.host.app.workspace
					.getLeaf('tab')
					.openFile(file, line ? { eState: { line: Math.max(0, line - 1) } } : undefined);
				return;
			}
		} else if (target?.kind === 'external') {
			await openPath(target.path);
			return;
		}
		new Notice(t('agent.referenceMissing'));
	}

	private drop(event: DragEvent): void {
		event.preventDefault();
		const vault = this.host.vaultPath();
		const paths: string[] = [];
		const dragged = (
			this.host.app as unknown as {
				dragManager?: { draggable?: { file?: { path: string }; files?: Array<{ path: string }> } };
			}
		).dragManager?.draggable;
		const files = dragged?.files ?? (dragged?.file ? [dragged.file] : []);
		if (vault && files.length) {
			for (const file of files) paths.push(vaultFilePath(vault, file.path));
		} else {
			for (const file of Array.from(event.dataTransfer?.files ?? [])) {
				const local = droppedFilePath(file);
				if (local) paths.push(local);
			}
		}
		if (paths.length) {
			this.session.input(droppedPaths(paths, Platform.isWin ? 'win32' : 'posix'));
			return;
		}
		const text = event.dataTransfer?.getData('text/plain');
		if (text) this.session.paste(text);
		else new Notice(t('agent.dropEmpty'));
	}

	setVisible(visible: boolean): void {
		if (this.disposed) return;
		if (visible) this.mount();
		if (visible === this.visible) {
			if (visible) this.fitter?.request(this.el.win);
			return;
		}
		this.visible = visible;
		if (this.lease) this.session.setViewVisible(this.lease, visible);
		this.el.toggleClass('is-hidden', !visible);
		if (visible) {
			this.host.retention.release(this);
			this.loadRenderer();
			this.fitter?.request(this.el.win);
		} else {
			this.pauseActivity();
			this.setFocused(false);
			this.fitter?.cancel();
			if (this.webgl) this.host.retention.retain(this, () => this.releaseRenderer());
		}
		this.presentation?.setVisible(visible);
	}

	/** Visibility and measurement never confer ownership; explicit pane/DOM focus does. */
	setFocused(focused: boolean): void {
		if (this.disposed) return;
		const eligible = focused && this.visible && !!this.lease;
		this.focusGeneration++;
		this.focused = eligible && !!this.lease && this.session.setViewFocused(this.lease, true);
		if (!eligible && this.lease) this.session.setViewFocused(this.lease, false);
		if (this.focused) this.fitter?.request(this.el.win);
		else this.fitter?.cancel();
	}

	/** Settings changed: font, cursor, theme and renderer follow immediately. */
	applySettings(): void {
		const term = this.term;
		if (!term) return;
		const settings = this.host.settings();
		term.options.fontFamily = this.fontFamily();
		term.options.fontSize = settings.fontSize + this.fontDelta;
		term.options.lineHeight = settings.lineHeight;
		term.options.cursorStyle = settings.cursorStyle;
		term.options.cursorBlink = settings.cursorBlink;
		// Session.setScrollback publishes the ordered structural change; a local trim would lose rows early.
		term.options.theme = this.theme();
		this.target?.updateAppearance();
		if (settings.renderer !== 'webgl') this.releaseRenderer();
		else if (this.visible) this.loadRenderer();
		this.fitter?.request(this.el.win);
	}

	/** A successful renderer still holds its original screen reservation. Constructor-only and
	 * failed mounts have no renderer and cannot back an additional Host subscription.
	 */
	get hasRenderer(): boolean {
		const textarea = this.term?.textarea;
		return !this.disposed && !!this.lease && !!textarea && this.el.contains(textarea);
	}

	/** The presenter gets this View's actual textarea and a single synchronous focus capability.
	 * No caller can substitute a DOM target or retain a usable callback beyond this stack.
	 */
	presentFocus(present: (textarea: HTMLTextAreaElement, focus: () => void) => boolean): boolean {
		const term = this.term,
			lease = this.lease,
			textarea = term?.textarea,
			doc = this.el.ownerDocument;
		const current = () =>
			!this.disposed &&
			this.visible &&
			this.term === term &&
			this.lease === lease &&
			this.el.ownerDocument === doc &&
			this.el.isConnected &&
			!!textarea &&
			textarea.isConnected &&
			textarea.ownerDocument === doc &&
			this.el.contains(textarea);
		if (!term || !lease || !textarea || !current()) return false;
		let available = true;
		try {
			return present(textarea, () => {
				if (!available || !current()) return;
				available = false;
				this.setFocused(true);
				term.focus();
			});
		} finally {
			available = false;
		}
	}

	focus(): void {
		this.term?.focus();
	}

	get hasSelection(): boolean {
		return !!this.term?.hasSelection();
	}

	async copy(plain = false): Promise<void> {
		const selection = this.term?.getSelection() ?? '';
		if (!selection) return;
		await this.el.win.navigator.clipboard.writeText(plain ? selection.replace(/[ \t]+$/gm, '') : selection);
	}

	async paste(): Promise<void> {
		const text = await this.el.win.navigator.clipboard.readText();
		if (text) this.session.paste(text);
	}

	selectAll(): void {
		this.term?.selectAll();
	}

	selectLine(): void {
		const term = this.term;
		if (!term) return;
		const row = term.buffer.active.baseY + term.buffer.active.cursorY;
		term.selectLines(row, row);
	}

	reset(): void {
		this.session.reset();
	}

	async copyContext(): Promise<void> {
		await this.el.win.navigator.clipboard.writeText(this.session.text(200));
	}

	clear(): void {
		this.session.clearScrollback();
	}

	clearScrollback(): void {
		this.session.clearScrollback();
	}

	zoom(step: -1 | 0 | 1): void {
		this.fontDelta = step === 0 ? 0 : Math.max(-6, Math.min(16, this.fontDelta + step));
		this.applySettings();
	}

	find(query: string, direction: 'next' | 'previous', options: SearchOptions): boolean {
		if (!this.searchAddon || !query) return false;
		const search = { caseSensitive: options.caseSensitive, regex: options.regex, incremental: false };
		return direction === 'next'
			? this.searchAddon.findNext(query, search)
			: this.searchAddon.findPrevious(query, search);
	}

	clearSearch(): void {
		this.searchAddon?.clearDecorations();
		this.term?.clearSelection();
	}

	/** Scroll to the previous/next prompt or the last failed command (shell integration marks). */
	jump(kind: 'previous' | 'next' | 'failed'): void {
		const term = this.term;
		if (!term) return;
		const prompts = this.session.prompts();
		if (!prompts.lines.length) {
			new Notice(t('agent.noPrompts'));
			return;
		}
		const from = term.buffer.active.viewportY;
		const line =
			kind === 'failed'
				? prompts.lastFailed()
				: kind === 'previous'
					? prompts.previous(from)
					: prompts.next(from);
		if (line === undefined) {
			if (kind === 'failed') new Notice(t('agent.noFailed'));
			return;
		}
		term.scrollToLine(line);
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.releaseMount(0, true);
	}
}
