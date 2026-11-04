/** Real SafePage/service/crypto; native file, clipboard and notice ports are provided by the safe fixture. */
import { createRoot, type Root } from 'react-dom/client';
import { registerMessages, setLanguage } from '../../../src/shared/i18n';
import { messages } from '../../../src/modules/safe/i18n';
import { SafePage } from '../../../src/modules/safe/ui/SafePage';
import { QUICK_PICK_MASTER, QUICK_PICK_ENTRIES, quickPickFixture } from '../../../src/modules/safe/ui/quick-pick.test-support';
import { SafeError } from '../../../src/modules/safe/core/model';
import { HuhuProviders } from '../../../src/ui/react/providers';
import type { SafePreferences, SafeViewMode } from '../../../src/modules/safe/services/preferences';
// Keep the same Radix/cmdk owner-document adapter graph as production.
import '../../../src/ui/components/command';

const docs = { main: document, other: document.querySelector('iframe')!.contentDocument! };
type Name = keyof typeof docs;
type Fixture = Awaited<ReturnType<typeof quickPickFixture>> & { owner: HTMLElement; root: Root; preferences: SafePreferences; revision: number };
const fixtures = {} as Record<Name, Fixture>;
const first = QUICK_PICK_ENTRIES[0]!, second = QUICK_PICK_ENTRIES[1]!;
const long = ' ContinuousPlatformWithoutSpaces'.repeat(5) + '中文长标题'.repeat(8);
const fourthId = 'c0000005-1111-4111-8111-111111111111';
const workspaceAccounts = [...first.credentials, { ...first.credentials[0]!, id: 'c0000004-1111-4111-8111-111111111111', username: 'third-account' }, { ...first.credentials[0]!, id: fourthId, username: 'fourth-account' }];
const entries = [
	{ ...first, title: first.title + long, notes: 'Platform note 平台备注\n'.repeat(100), credentials: workspaceAccounts.map((account, i) => ({ ...account, phone: '+886 900 000 001', email: 'contact@example.test', notes: 'Long readable account note 长备注\n'.repeat(160), relations: i === 0 ? [{ entryId: second.id, credentialId: second.credentials[0]!.id, kind: 'login' as const }, { entryId: 'missing', credentialId: 'missing-account', kind: 'related' as const }] : [] })) },
	second,
];
const tick = (doc: Document) => new Promise<void>(resolve => doc.defaultView!.requestAnimationFrame(() => resolve()));
async function wait(doc: Document, check: () => boolean) { for (let i = 0; i < 180; i++) { if (check()) return; await tick(doc); } throw new Error('Safe workspace fixture did not settle'); }
async function scene(name: string, documentName: Name = 'main') {
	const f = fixtures[documentName], doc = docs[documentName];
	if (f.service.store.getState().status !== 'unlocked') { await f.service.probe(); await f.service.unlock(QUICK_PICK_MASTER); }
	f.service.store.setState({ status: 'unlocked', entries: name === 'empty' ? [] : structuredClone(entries), error: name === 'error' ? new SafeError('io') : null, busy: false });
	if (name === 'locked') f.service.lock();
	if (name === 'loading') f.service.store.setState({ status: 'loading', entries: [], generation: f.service.store.getState().generation + 1 });
	f.root.render(<HuhuProviders ownerDocument={doc}><SafePage key={++f.revision} service={f.service} preferences={f.preferences} /></HuhuProviders>);
	await wait(doc, () => !!doc.querySelector('.huhu-design section[aria-label]'));
	await tick(doc); await tick(doc);
	if (['detail', 'relations', 'invalid-relation'].includes(name)) {
		doc.querySelector<HTMLButtonElement>(`[data-safe-entry="${first.id}"]`)!.click();
		await wait(doc, () => !!doc.querySelector('[data-safe-detail]'));
	}
}
async function initialize() {
	registerMessages(messages);
	for (const name of Object.keys(docs) as Name[]) {
		const doc = docs[name], win = doc.defaultView!;
		const Element = Reflect.get(win, 'HTMLElement') as typeof HTMLElement;
		Element.prototype.createDiv ??= function (options = {}) { const child = this.ownerDocument.createElement('div'); if (typeof options === 'string') child.className = options; else { child.className = options.cls ?? ''; if (options.text) child.textContent = options.text; } this.append(child); return child; };
		const owner = doc.createElement('main'); owner.dataset.review = 'safe'; doc.body.append(owner);
		let mode: SafeViewMode = 'list';
		const listeners = new Set<() => void>();
		const preferences: SafePreferences = { viewMode: () => mode, setViewMode: value => { mode = value; listeners.forEach(run => run()); }, subscribe: run => { listeners.add(run); return () => listeners.delete(run); } };
		fixtures[name] = { ...await quickPickFixture(win), owner, root: createRoot(owner), preferences, revision: 0 };
	}
	const configure = async (language: 'en' | 'zh', theme: string) => { setLanguage(language); for (const name of Object.keys(docs) as Name[]) { docs[name].body.className = theme; await scene('default', name); } };
	Object.assign(window, { uiReview: { docs, fixtures, configure, scene, ids: { first: first.id, second: second.id, sourceAccount: first.credentials[0]!.id, targetAccount: second.credentials[0]!.id, fourthAccount: fourthId } } });
	await configure('en', 'theme-light');
}
void initialize();
