/**
 * Real agent terminal-pane lifecycle components (ManagedLifecyclePanel, useLifecycleAction, DesignScope).
 * Only the workspace service is stubbed, and the xterm renderer is replaced by a counted textarea: the question
 * under test is whether the status block recreates the sibling terminal host, not xterm itself.
 */
import { useEffect, useId, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { registerMessages, setLanguage, t } from '../../../src/shared/i18n';
import { messages as agentMessages } from '../../../src/modules/agent/i18n';
import { HuhuProviders } from '../../../src/ui/react/providers';
import { DesignScope } from '../../../src/ui/react/design-scope';
import { ManagedLifecyclePanel, ManagedStatusRegion, useLifecycleAction } from '../../../src/modules/agent/ui/sidebar/managed-lifecycle';
import type { ManagedSessionSummary, StopResult } from '../../../src/modules/agent/core/workspace/managed-runtime';
import type { WorkspaceService } from '../../../src/modules/agent/services/workspace-service';
import type { TerminationEvidence } from '../../../src/shared/native/host';

// The owner-document plugin requires every Radix copy in the production bundle: import the same set the workspace pulls in.
import '../../../src/ui/components/command';
import '../../../src/ui/components/select';
import '../../../src/ui/components/dropdown-menu';
import '../../../src/ui/components/context-menu';
import '../../../src/ui/components/alert-dialog';
import '../../../src/ui/components/dialog';
import '../../../src/ui/components/popover';
import '../../../src/ui/components/tabs';
import '../../../src/ui/components/hover-card';
import '../../../src/ui/components/toggle-group';
import '../../../src/ui/components/sheet';
registerMessages(agentMessages);
const docs = { main: document, other: document.querySelector('iframe')!.contentDocument! };
const copied: string[] = [];
function extensions(doc: Document) {
	const proto = (doc.defaultView as Window & typeof globalThis).HTMLElement.prototype;
	const define = (name: string, descriptor: PropertyDescriptor) => {
		if (!Object.getOwnPropertyDescriptor(proto, name)) Object.defineProperty(proto, name, { configurable: true, ...descriptor });
	};
	define('win', { get(this: HTMLElement) { return this.ownerDocument.defaultView; } });
	define('doc', { get(this: HTMLElement) { return this.ownerDocument; } });
	define('addClass', { value(this: HTMLElement, ...names: string[]) { this.classList.add(...names); } });
	define('removeClass', { value(this: HTMLElement, ...names: string[]) { this.classList.remove(...names); } });
	define('empty', { value(this: HTMLElement) { this.replaceChildren(); } });
	define('onWindowMigrated', { value: () => () => {} });
	define('createEl', { value(this: HTMLElement, tag: string, options?: { cls?: string; text?: string }) {
		const el = this.ownerDocument.createElement(tag);
		if (options?.cls) el.className = options.cls;
		if (options?.text) el.textContent = options.text;
		this.append(el);
		return el;
	} });
	define('createDiv', { value(this: HTMLElement, options?: { cls?: string; text?: string }) { return this.createEl('div', options); } });
}
for (const doc of Object.values(docs)) extensions(doc);
for (const doc of Object.values(docs)) {
	extensions(doc);
	Object.defineProperty(doc.defaultView!.navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { copied.push(text); }, readText: async () => '' } });
}

const longTitle = '深度排查-很长的会话名称-A-very-long-session-title-without-any-natural-break-points-for-narrow-containers';
const termination = (cleanup: 'confirmed' | 'partial' | 'unknown', root: 'running' | 'exited' = 'exited'): TerminationEvidence => ({
	root: root === 'running' ? { state: 'running' } : { state: 'exited', code: 0, signal: null },
	cleanup: cleanup === 'confirmed'
		? { state: 'confirmed', scope: 'unix-session', remainingKnown: 0 }
		: cleanup === 'partial'
			? { state: 'partial', scope: 'unix-session', remainingKnown: 2, reason: 'residuals-present' }
			: { state: 'unknown', scope: 'unix-session', remainingKnown: null, reason: 'transport-lost' },
	output: cleanup === 'confirmed' ? 'drained' : cleanup === 'partial' ? 'truncated' : 'unknown',
} as TerminationEvidence);
const base = (extra: Partial<NonNullable<ManagedSessionSummary['runtime']>> = {}): ManagedSessionSummary => ({
	spaceId: 'space-with-a-rather-long-identifier-0123456789abcdef',
	sessionId: 'session-0123456789abcdef-0123456789abcdef',
	title: longTitle, kind: 'shell', createdAt: 1, viewState: 'attached',
	runtime: { runtimeId: 'runtime-0123456789abcdef-0123456789abcdef', phase: 'connected', activity: 'idle', inputReady: true, ...extra },
});
const stop = (phase: 'stop-requested' | 'settled', outcome?: 'confirmed' | 'partial' | 'unknown') => ({ requestId: 'req', requestedAt: 1, force: false, phase, outcome });
export type Scenario = 'normal' | 'stopping' | 'unconfirmed' | 'partial' | 'confirmed' | 'exited' | 'restored-unconfirmed';
const scenarios: Record<Scenario, () => ManagedSessionSummary> = {
	normal: () => base(),
	stopping: () => base({ stop: stop('stop-requested') }),
	unconfirmed: () => base({ phase: 'disconnected', stop: stop('settled', 'unknown'), termination: termination('unknown') }),
	partial: () => base({ phase: 'exited', stop: stop('settled', 'partial'), termination: termination('partial') }),
	confirmed: () => base({ phase: 'exited', stop: stop('settled', 'confirmed'), termination: termination('confirmed') }),
	exited: () => base({ phase: 'exited', termination: termination('confirmed') }),
	'restored-unconfirmed': () => ({ ...base(), viewState: 'restored', runtime: undefined, restore: { state: 'unconfirmed', canRequestContinue: false } }),
};

type Mode = 'confirmed' | 'pending' | 'unknown' | 'fail';
function createControl() {
	const listeners = new Set<() => void>();
	const ctl = {
		scenario: 'unconfirmed' as Scenario, snapshot: scenarios.unconfirmed(), mode: 'pending' as Mode,
		calls: [] as Array<{ op: string; force?: boolean }>, hostMounts: 0, hostUnmounts: 0, confirm: async () => true,
		subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
		get: () => ctl.snapshot,
		set(name: Scenario) { ctl.scenario = name; ctl.snapshot = scenarios[name](); for (const fn of listeners) fn(); },
		workspace: undefined as unknown as WorkspaceService,
	};
	const result = (target: StopResult['target']): StopResult => {
		const failed = ctl.mode === 'fail';
		return {
			target, status: ctl.mode === 'confirmed' ? 'stopped' : failed ? 'failed' : 'pending',
			effect: ctl.mode === 'confirmed' ? 'applied' : 'unknown', termination: termination(ctl.mode === 'confirmed' ? 'confirmed' : ctl.mode === 'unknown' ? 'unknown' : 'partial'),
			persisted: ctl.mode === 'confirmed',
			...(failed ? { error: { code: 'PERSISTENCE_FAILED', reason: 'save-failed', messageKey: 'agent.spaces.error.save', nextAction: 'retry-explicitly', details: {} } } : {}),
		} as StopResult;
	};
	ctl.workspace = {
		stopManaged: async (target: StopResult['target'], options?: { force?: boolean }) => { ctl.calls.push({ op: 'stop', force: options?.force }); const r = result(target); if (r.status === 'stopped') ctl.set('confirmed'); return r; },
		waitManagedStop: async (target: StopResult['target']) => { ctl.calls.push({ op: 'check' }); const r = result(target); if (r.status === 'stopped') ctl.set('confirmed'); return r; },
	} as unknown as WorkspaceService;
	return ctl;
}
type Control = ReturnType<typeof createControl>;

function TerminalStandIn({ ctl }: { ctl: Control }) {
	useEffect(() => { ctl.hostMounts++; return () => { ctl.hostUnmounts++; }; }, [ctl]);
	return <textarea data-terminal-standin="" aria-label="Terminal input (stand-in)" className="min-h-0 w-full flex-1 resize-none border-0 bg-background p-2 font-mono text-xs text-foreground" defaultValue="" />;
}
function Pane({ ctl }: { ctl: Control }) {
	const heading = useId();
	const session = useSyncExternalStore(ctl.subscribe, ctl.get);
	const lifecycle = useLifecycleAction(ctl.workspace, ctl.confirm);
	return <DesignScope className="flex h-full min-h-0 flex-col">
		<section aria-labelledby={heading} className="flex min-h-0 flex-1 flex-col">
			<h2 id={heading} className="m-0 shrink-0 break-words px-2 py-1 text-sm font-medium">{session.title}</h2>
			<ManagedStatusRegion><ManagedLifecyclePanel session={session} lifecycle={lifecycle} /></ManagedStatusRegion>
			<TerminalStandIn ctl={ctl} />
		</section>
	</DesignScope>;
}

function mount(doc: Document) {
	const ctl = createControl();
	const container = doc.createElement('div');
	container.dataset.review = 'pane';
	container.style.cssText = 'height:460px;margin-bottom:16px;border:1px solid var(--background-modifier-border)';
	doc.body.append(container);
	const root: Root = createRoot(container);
	root.render(<HuhuProviders ownerDocument={doc}><Pane ctl={ctl} /></HuhuProviders>);
	return { container, ctl, dispose: () => { root.unmount(); container.remove(); } };
}

const mounts = { main: mount(docs.main), other: mount(docs.other) };
Object.assign(window, {
	uiReview: {
		docs, mounts, copied, t, longTitle,
		configure(language: 'en' | 'zh', theme: string) {
			setLanguage(language);
			for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; }
		},
		unmount() { for (const m of Object.values(mounts)) m.dispose(); },
	},
});
