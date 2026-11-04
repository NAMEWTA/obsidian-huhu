import assert from 'node:assert/strict';
export const ready =
	'!!window.uiReview && Object.values(uiReview.docs).every(d=>d.querySelector("[data-person-id] nav"))';
export const layoutCSS = '[data-review=person]{width:100%;min-width:0}';
export const settle = 'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))';
export function configure({ language, theme }) {
	return `uiReview.configure(${JSON.stringify(language)},${JSON.stringify(`theme-${theme.endsWith('dark') ? 'dark' : 'light'}${theme.startsWith('user-') ? ' huhu-themed huhu-theme--pearl' : ''}`)})`;
}
const both = (cdp, code) => cdp.evaluate(`Object.values(uiReview.docs).map(d=>{${code}})`);
// CDP evaluation can finish before React commits the view created by the previous action.
export async function click(cdp, key, waitFor) {
	await waitFor(
		async () =>
			(
				await both(
					cdp,
					`const button=[...d.querySelectorAll('button')].find(e=>e.textContent===uiReview.t(${JSON.stringify(key)}));return !!button && !button.matches(':disabled') && button.getClientRects().length>0;`,
				)
			).every(Boolean),
		`ready button in both documents: ${key}`,
	);
	await both(
		cdp,
		`[...d.querySelectorAll('button')].find(e=>e.textContent===uiReview.t(${JSON.stringify(key)})).click();`,
	);
}
const has = (cdp, selector) =>
	cdp.evaluate(`Object.values(uiReview.docs).every(d=>d.querySelector(${JSON.stringify(selector)}))`);
// Use the same browser measurement in matrix assertions and focused regressions.
export function measureDocument(d) {
	const visible = (e) => {
		if (e.closest('[hidden],[inert]')) return false;
		const details = e.closest('details:not([open])');
		if (details && !details.querySelector('summary')?.contains(e)) return false;
		const rect = e.getBoundingClientRect();
		if (!e.getClientRects().length || rect.width <= 0 || rect.height <= 0) return false;
		for (let node = e; node; node = node.parentElement) {
			const style = d.defaultView.getComputedStyle(node);
			if (
				style.display === 'none' ||
				style.visibility === 'hidden' ||
				style.visibility === 'collapse' ||
				style.opacity === '0' ||
				style.clipPath === 'inset(50%)' ||
				(style.clip !== 'auto' && style.clip !== '')
			)
				return false;
		}
		return true;
	};
	const r = d.querySelector('[data-person-id]');
	const textTypes = new Set([
		'text',
		'search',
		'date',
		'number',
		'tel',
		'email',
		'url',
		'time',
		'datetime-local',
		'month',
		'week',
		'password',
	]);
	return {
		overflow: r.scrollWidth - r.clientWidth,
		views: r.querySelectorAll('nav button').length,
		controls: [...r.querySelectorAll('button,input,textarea,summary')].filter(visible).map((e) => ({
			name:
				e.getAttribute('aria-label') ||
				e.textContent ||
				e.closest('label')?.textContent ||
				[...d.querySelectorAll('label')].find((l) => l.htmlFor === e.id)?.textContent,
			height: e.getBoundingClientRect().height,
		})),
		fields: [...r.querySelectorAll('input,textarea')]
			.filter((e) => visible(e) && (e.tagName === 'TEXTAREA' || textTypes.has(e.type)))
			.map((e) => {
				const style = d.defaultView.getComputedStyle(e);
				return {
					type: e.type,
					contentWidth: e.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
				};
			}),
	};
}
async function measure(cdp) {
	return cdp.evaluate(
		`Object.fromEntries(Object.entries(uiReview.docs).map(([name,d])=>[name,(${measureDocument.toString()})(d)]))`,
	);
}

function assertLayout(values) {
	for (const [name, value] of Object.entries(values)) {
		assert(value.overflow <= 1, `${name}: no horizontal overflow`);
		assert.equal(value.views, 4);
		for (const control of value.controls)
			assert(control.name && control.height >= 43.9, `${name}: labelled 44px control ${JSON.stringify(control)}`);
		for (const field of value.fields)
			assert(field.contentWidth >= 100, `${name}: usable input content width ${field.contentWidth}`);
	}
}
export async function verify({ cdp, sample, waitFor }) {
	await waitFor(() => has(cdp, '[data-person-id] nav'), 'person reading entry');
	assert(await has(cdp, '[data-person-recent]'), 'recent journal overview');
	assert(await has(cdp, '[data-person-relations-summary]'), 'independent relationship overview');
	sample.measurements = await measure(cdp);
	assertLayout(sample.measurements);
	await click(cdp, 'archives.person.profile', waitFor);
	await waitFor(
		() =>
			cdp.evaluate(
				'Object.values(uiReview.docs).every(d=>d.querySelector("[data-person-id] nav button[aria-pressed=true]")?.textContent===uiReview.t("archives.person.profile"))',
			),
		'profile',
	);
	assertLayout(await measure(cdp));
	if (sample.zoom === 1) {
		await both(cdp, `d.querySelector('[data-person-id] details').open=true;`);
		await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(resolve))');
		const resources = await measure(cdp);
		assertLayout(resources);
		assert(
			Object.values(resources).every(
				(value) => value.fields.length > 0 && value.fields.every((field) => field.type !== 'file'),
			),
			'opened resources measure visible text fields, never hidden uploads',
		);
		await both(cdp, `d.querySelector('[data-person-id] details').open=false;`);
	}
	await click(cdp, 'archives.person.relations', waitFor);
	await waitFor(
		() =>
			cdp.evaluate(
				'Object.values(uiReview.docs).every(d=>d.querySelector("[data-person-id] nav button[aria-pressed=true]")?.textContent===uiReview.t("archives.person.relations"))',
			),
		'relations',
	);
	await click(cdp, 'archives.person.journal', waitFor);
	await waitFor(() => has(cdp, '[data-journal-row]'), 'journal');
	assertLayout(await measure(cdp));
	await click(cdp, 'archives.person.add', waitFor);
	await waitFor(() => has(cdp, '[data-person-id] form'), 'journal editor');
	sample.writing = await measure(cdp);
	assertLayout(sample.writing);
	sample.assertions.push(
		'PERSON-READING',
		'four-person-views',
		'long-text-wrap',
		'journal-editor',
		'44px-targets',
		'usable-field-width',
	);
}
export async function exercise({ cdp, result, waitFor, capture }) {
	result.interactions = [];
	await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	await waitFor(() => has(cdp, '[data-person-id] nav'), 'reset');
	await capture('default');
	await click(cdp, 'archives.person.profile', waitFor);
	await capture('profile');
	await click(cdp, 'archives.person.relations', waitFor);
	await capture('relations');
	await cdp.evaluate(
		`uiReview.docs.other.querySelector('[data-person-id] nav button:last-child').click();document.querySelector('[data-person-id] nav button:last-child').focus();`,
	);
	await cdp.send('Input.dispatchKeyEvent', {
		type: 'keyDown',
		key: 'Enter',
		code: 'Enter',
		windowsVirtualKeyCode: 13,
		text: '\r',
		unmodifiedText: '\r',
	});
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
	await waitFor(() => has(cdp, '[data-journal-row]'), 'keyboard journal');
	await capture('journal');
	await click(cdp, 'archives.person.add', waitFor);
	await waitFor(() => has(cdp, 'form'), 'editor');
	await capture('journal-edit');
	// Reset the mounted route to abandon this fixture draft before testing existing-row conflicts.
	await cdp.evaluate('uiReview.configure("en","theme-light")');
	await waitFor(() => has(cdp, '[data-person-id] nav'), 'reset');
	await click(cdp, 'archives.person.journal', waitFor);
	await waitFor(() => has(cdp, '[data-journal-row]'), 'journal');
	await both(cdp, `d.querySelector('[data-journal-row] button[data-variant=outline]').click();`);
	await waitFor(() => has(cdp, 'form'), 'edit existing');
	await cdp.evaluate('uiReview.external()');
	await click(cdp, 'contacts.save', waitFor);
	await waitFor(
		() =>
			cdp.evaluate(
				'Object.values(uiReview.docs).every(d=>d.querySelector("[role=alert]")?.textContent.includes("changed elsewhere"))',
			),
		'conflict retains input',
	);
	await capture('conflict');
	await click(cdp, 'contacts.cancel', waitFor);
	await waitFor(() => has(cdp, '[role=dialog]'), 'discard confirmation');
	await click(cdp, 'archives.person.discard', waitFor);
	await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector("form"))'), 'discarded');
	await click(cdp, 'archives.person.delete', waitFor);
	await waitFor(() => has(cdp, '[role=dialog]'), 'delete confirmation');
	await capture('journal-delete');
	await cdp.evaluate('uiReview.select("review-person-b")');
	await waitFor(
		() =>
			cdp.evaluate(
				'Object.values(uiReview.docs).every(d=>d.querySelector("[data-person-id=review-person-b]")&&!d.querySelector("[role=dialog]"))',
			),
		'pending delete cancels on navigation',
	);
	assert(
		await cdp.evaluate(
			'Promise.all(uiReview.mounts.map(async m=>Array.isArray((await m.application.query.entity("review-person-a")).values.journal)&&(await m.application.query.entity("review-person-a")).values.journal.length===1)).then(v=>v.every(Boolean))',
		),
		'departed person journal remains untouched',
	);
	await cdp.evaluate('uiReview.select("review-person-a")');
	await waitFor(() => has(cdp, '[data-person-id=review-person-a]'), 'return to owner');
	await click(cdp, 'archives.person.journal', waitFor);
	await waitFor(() => has(cdp, '[data-journal-row]'), 'journal before explicit delete');
	await click(cdp, 'archives.person.delete', waitFor);
	await waitFor(() => has(cdp, '[role=dialog]'), 'new delete confirmation');
	await both(cdp, `d.querySelector('[role=dialog] button:last-child').click();`);
	await waitFor(
		() => cdp.evaluate('Object.values(uiReview.docs).every(d=>!d.querySelector("[data-journal-row]"))'),
		'empty journal',
	);
	await capture('empty');
	await cdp.evaluate('uiReview.select("review-person-b")');
	await waitFor(() => has(cdp, '[data-person-id=review-person-b]'), 'same-name person ID');
	await capture('same-name');
	await cdp.evaluate('uiReview.select("review-company")');
	await waitFor(
		() =>
			cdp.evaluate(
				'Object.values(uiReview.docs).every(d=>!d.querySelector("[data-person-id]")&&d.body.textContent.includes("Company"))',
			),
		'generic company',
	);
	await capture('generic');
	await cdp.evaluate('uiReview.select("review-person-a")');
	await waitFor(() => has(cdp, '[data-person-id=review-person-a]'), 'back to person');
	await click(cdp, 'archives.person.journal', waitFor);
	await click(cdp, 'archives.person.add', waitFor);
	await waitFor(() => has(cdp, 'form'), 'draft before reload');
	await both(
		cdp,
		`const i=[...d.querySelectorAll('form input')].find(e=>e.type==='text');Object.getOwnPropertyDescriptor(d.defaultView.HTMLInputElement.prototype,'value').set.call(i,'Retained through reload');i.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));`,
	);
	await cdp.evaluate('uiReview.refresh("loading")');
	await waitFor(() => has(cdp, '[data-person-id][aria-busy=true]'), 'loading keeps person');
	const retained = () =>
		cdp.evaluate(
			'Object.values(uiReview.docs).every(d=>[...d.querySelectorAll("form input")].some(i=>i.value==="Retained through reload"))',
		);
	assert(await retained(), 'loading retains unsaved journal');
	await capture('loading');
	await cdp.evaluate('uiReview.refresh("default")');
	assert(await retained(), 'successful reload retains draft and view');
	await cdp.evaluate('uiReview.refresh("error")');
	assert(await retained(), 'failed reload retains draft');
	await waitFor(
		() =>
			cdp.evaluate(
				'Object.values(uiReview.docs).every(d=>d.querySelector("form button[type=submit]")?.matches(":disabled"))',
			),
		'failed reload prevents writes',
	);
	await cdp.evaluate('uiReview.refresh("default")');
	assert(await retained(), 'recovery retains draft');
	await both(
		cdp,
		`const i=[...d.querySelectorAll('form input')].find(e=>e.type==='text');Object.getOwnPropertyDescriptor(d.defaultView.HTMLInputElement.prototype,'value').set.call(i,'Retained on failure');i.dispatchEvent(new d.defaultView.Event('input',{bubbles:true}));`,
	);
	await cdp.evaluate('uiReview.failNextSave()');
	await click(cdp, 'contacts.save', waitFor);
	await waitFor(
		() =>
			cdp.evaluate(
				'Object.values(uiReview.docs).every(d=>d.querySelector("[role=alert]")?.textContent.includes("Could not save"))',
			),
		'write failure retains input',
	);
	assert(
		await cdp.evaluate(
			'Object.values(uiReview.docs).every(d=>[...d.querySelectorAll("form input")].some(i=>i.value==="Retained on failure"))',
		),
		'failure preserves journal draft',
	);
	await capture('error');
	result.interactions.push(
		'keyboard-reduced-motion',
		'profile-relations-journal',
		'journal-edit-delete-empty',
		'conflict-retained',
		'same-name-id',
		'generic-company',
		'loading-error',
		'pending-delete-navigation-cancel',
		'reload-failure-recovery-retains-draft',
		'overview-sections-and-resources-inputs',
	);
	await cdp.evaluate('uiReview.unmount()');
}
