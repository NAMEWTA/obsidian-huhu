/** Real command modal and safe service; only native file/clipboard/notice ports and Obsidian DOM helpers are substituted. */
import { registerMessages, setLanguage } from '../../../src/shared/i18n';
import { messages } from '../../../src/modules/safe/i18n';
import { openQuickPick } from '../../../src/modules/safe/ui/quick-pick-dialog';
import { QUICK_PICK_MASTER, quickPickFixture } from '../../../src/modules/safe/ui/quick-pick.test-support';
// Match the production Radix adapter graph, including cmdk's second dependency copy.
import '../../../src/ui/components/command';
import '../../../src/ui/components/select';
import '../../../src/ui/components/dropdown-menu';

const docs = { main: document, other: document.querySelector('iframe')!.contentDocument! };
type Name = keyof typeof docs;
type Fixture = Awaited<ReturnType<typeof quickPickFixture>> & { owner: HTMLElement; close?: () => void; release?: () => void; pending?: Promise<void> };
const fixtures = {} as Record<Name, Fixture>;
const long = ' veryveryveryverylongwordwithoutanyspacesatall 一个非常非常长的中文平台名称用于验证窄容器与英文文本换行';
const tick = (doc: Document) => new Promise<void>(resolve => doc.defaultView!.requestAnimationFrame(() => resolve()));
async function wait(doc: Document, check: () => boolean) {
	for (let n = 0; n < 120; n++) { if (check()) return; await tick(doc); }
	throw new Error('Quick picker fixture did not settle');
}
function fill(doc: Document, input: HTMLInputElement, value: string) {
	const Input = Reflect.get(doc.defaultView!, 'HTMLInputElement') as typeof HTMLInputElement;
	Object.getOwnPropertyDescriptor(Input.prototype, 'value')!.set!.call(input, value);
	const Event = Reflect.get(doc.defaultView!, 'Event') as typeof globalThis.Event;
	input.dispatchEvent(new Event('input', { bubbles: true }));
}
async function scene(name: string, documentName: Name = 'main') {
	const doc = docs[documentName], f = fixtures[documentName];
	f.close?.(); await tick(doc);
	f.release?.(); f.release = undefined; f.io.beforeRead = undefined; await f.pending; f.pending = undefined;
	f.clipboard.fail = false;
	if (name === 'locked') f.service.lock();
	else if (name === 'loading') {
		f.service.lock();
		const blocked = new Promise<void>(resolve => { f.release = resolve; });
		f.io.beforeRead = async () => blocked;
		f.pending = f.service.probe().catch(() => {});
	} else if (f.service.store.getState().status !== 'unlocked') await f.service.unlock(QUICK_PICK_MASTER);
	if (f.service.store.getState().status === 'unlocked') f.service.store.setState(state => ({ entries: state.entries.map((entry, index) => ({ ...entry, title: index === 0 && !entry.title.endsWith(long) ? entry.title + long : entry.title })) }));
	f.close = openQuickPick(f.owner, f.service);
	await wait(doc, () => !!doc.querySelector('[data-safe-quick]'));
	if (['no-results', 'generated'].includes(name)) {
		fill(doc, doc.querySelector('[role=combobox]')!, 'not-a-record');
		await wait(doc, () => !doc.querySelector('[role=option]'));
		if (name === 'generated') {
			doc.querySelector<HTMLButtonElement>('[data-slot=empty-state] button')!.click();
			await wait(doc, () => !!doc.querySelector('[data-safe-quick] input[readonly]'));
		}
	}
	if (name === 'error' || name === 'copied') {
		f.clipboard.fail = name === 'error';
		const Event = Reflect.get(doc.defaultView!, 'KeyboardEvent') as typeof KeyboardEvent;
		doc.querySelector('[role=combobox]')!.dispatchEvent(new Event('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
		await wait(doc, () => name === 'error' ? !!doc.querySelector('[data-safe-quick] [role=alert]') : f.feedback.some(text => text.includes('30')));
	}
	if (name === 'closed') { f.close(); await wait(doc, () => !doc.querySelector('[role=dialog]')); }
}
async function unlock(name: Name) {
	const doc = docs[name], password = doc.querySelector<HTMLInputElement>('[data-safe-quick] input[type=password]')!;
	fill(doc, password, QUICK_PICK_MASTER); password.closest('form')!.requestSubmit();
	await wait(doc, () => !!doc.querySelector('[role=combobox]'));
}
async function initialize() {
	registerMessages(messages);
	for (const name of Object.keys(docs) as Name[]) {
		const doc = docs[name], win = doc.defaultView!;
		const Element = Reflect.get(win, 'HTMLElement') as typeof HTMLElement;
		Element.prototype.createDiv ??= function (options = {}) { const child = this.ownerDocument.createElement('div'); if (typeof options === 'string') child.className = options; else { child.className = options.cls ?? ''; if (options.text) child.textContent = options.text; } this.append(child); return child; };
		const owner = doc.createElement('main'); owner.dataset.review = 'content'; doc.body.append(owner);
		fixtures[name] = { ...await quickPickFixture(win), owner };
	}
	const configure = async (language: 'en' | 'zh', theme: string) => {
		setLanguage(language);
		for (const name of Object.keys(docs) as Name[]) { docs[name].body.className = theme; fixtures[name].feedback.length = 0; await scene('default', name); }
	};
	Object.assign(window, { uiReview: { docs, fixtures, configure, scene, unlock } });
	await configure('en', 'theme-light');
}
void initialize();
