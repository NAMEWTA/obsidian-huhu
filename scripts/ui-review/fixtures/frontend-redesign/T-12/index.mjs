import assert from 'node:assert/strict';
import { modalTransforms } from '../../../../radix-owner-document.mjs';
import { diffsTransforms } from '../../../../diffs-owner-document.mjs';
export const adapterCounts = {
	sonner: { 'sonner/dist/index.mjs': 1 },
	radix: Object.fromEntries(Object.keys(modalTransforms).map((key) => [key, 1])),
	diffs: Object.fromEntries(Object.keys(diffsTransforms).map((key) => [key, 1])),
};
export const startup = 'globalThis.uiReviewStartup';
export const ready = '!!globalThis.uiReview && Object.keys(uiReview.owners).length===2';
export const configure = (sample) => `uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS = 'html,body{padding:0;margin:0;min-height:100%;overflow:auto}main{width:100%;min-width:0}';
async function clickAction(cdp, name, key, role = 'button') {
	const point = await cdp.evaluate(
		`(async()=>{const d=uiReview.docs.${name},label=uiReview.text(${JSON.stringify(key)}),n=[...d.querySelectorAll(${JSON.stringify(role === 'button' ? 'button' : '[role=' + role + ']')})].find(n=>n.getAttribute('aria-label')===label||n.textContent.trim()===label);if(!n)throw Error('Missing '+label);n.scrollIntoView({block:'center'});await new Promise(resolve=>d.defaultView.requestAnimationFrame(resolve));const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,hit:n.contains(d.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})()`,
	);
	assert.equal(point.hit, true, `${name}: ${key} is hittable`);
	for (const type of ['mousePressed', 'mouseReleased'])
		await cdp.send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
}
export async function verify({ cdp, sample, waitFor, capture }) {
	const states = await cdp.evaluate('uiReview.states');
	for (const name of ['main', 'second']) {
		await cdp.evaluate(
			`(()=>{const f=document.querySelector('iframe');f.style.left=${JSON.stringify(name === 'second' ? '0' : '-2000px')};f.style.top='0';f.style.width=${sample.cssWidth}+'px';f.style.height=innerHeight+'px';f.style.zIndex='100'})()`,
		);
		for (const state of states) {
			await cdp.evaluate(`uiReview.show(${JSON.stringify(name)},${JSON.stringify(state)})`);
			await waitFor(
				() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review-state=${state}]')`),
				state,
			);
			await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
			const outcome = await cdp.evaluate(
				`(()=>{const d=uiReview.docs.${name};return{colorTargets:[...d.querySelectorAll('input[type=color]')].map(n=>{const r=n.getBoundingClientRect();return{width:r.width,height:r.height}}),overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth+1,nativeDates:d.querySelectorAll('input[type=date],input[type=datetime-local]').length,errors:[...d.querySelectorAll('[role=alert]')].map(n=>n.textContent)}})()`,
			);
			if (sample.pointer === 'coarse')
				for (const target of outcome.colorTargets) {
					assert.ok(
						target.width >= 44 && target.height >= 44,
						`${name}/${state}: native color hit ${JSON.stringify(target)}`,
					);
				}
			assert.deepEqual(outcome.errors, [], `${name}/${state}: no unexpected error boundary`);
			assert.equal(outcome.nativeDates, 0, `${name}/${state}: native dates`);
			assert.equal(outcome.overflow, false, `${name}/${state}: horizontal overflow`);
			sample.assertions.push(
				`${name}/${state}: production settings/icon surface, no page overflow or native dates`,
			);
			if ([1440, 390, 320].includes(sample.cssWidth))
				await capture(`settings-${name}-${state}-${sample.id}`.toLowerCase().replaceAll(/[^a-z0-9-]/g, '-'));
		}
		await cdp.evaluate(`uiReview.show(${JSON.stringify(name)},'appearance')`);
		const oldMotion = await cdp.evaluate(`uiReview.owners.${name}.theme.get().motion`);
		const beforeWrite = await cdp.evaluate(`({saved:uiReview.owners.${name}.themeIO.saved,attempts:uiReview.owners.${name}.themeIO.attempts})`);
		await cdp.evaluate(`uiReview.owners.${name}.fail()`);
		await clickAction(cdp, name, 'appearance.reduceMotion', 'switch');
		await waitFor(
			() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[role=alert]')`),
			`${name}: persistent save failure`,
		);
		assert.notEqual(await cdp.evaluate(`uiReview.owners.${name}.theme.get().motion`), oldMotion);
  const failedWrite=await cdp.evaluate(`({status:uiReview.owners.${name}.store.status,saved:uiReview.owners.${name}.themeIO.saved,attempts:uiReview.owners.${name}.themeIO.attempts,oneHandle:uiReview.owners.${name}.theme===uiReview.owners.${name}.plugin.theme&&uiReview.owners.main.theme===uiReview.owners.second.theme&&uiReview.owners.main.store===uiReview.owners.second.store,motion:uiReview.owners.${name}.theme.get().motion,roots:[...uiReview.docs.${name}.querySelectorAll('.huhu-ui')].map(e=>e.dataset.motion)})`);
  assert.equal(failedWrite.status,'error');assert.equal(failedWrite.saved,beforeWrite.saved);assert.ok(failedWrite.attempts>beforeWrite.attempts);assert.equal(failedWrite.oneHandle,true);assert.ok(failedWrite.roots.every(motion=>motion===failedWrite.motion));
		await clickAction(cdp, name, 'workbench.retry');
		await waitFor(
			() =>
				cdp.evaluate(
					`!uiReview.docs.${name}.querySelector('[role=alert]') && uiReview.owners.${name}.store.status==='idle' && uiReview.owners.${name}.themeIO.saved>${beforeWrite.saved} && uiReview.owners.${name}.themeIO.savedMotion===uiReview.owners.${name}.theme.get().motion`,
				),
			`${name}: explicit retry persisted`,
		);
		await clickAction(cdp, name, 'appearance.previewAction');
		await waitFor(
			() =>
				cdp.evaluate(
					`!!uiReview.docs.${name}.querySelector('[data-interface-preview] .huhu-portal-root [role=dialog]')`,
				),
			`${name}: owned preview popover`,
		);
		sample.actions.push(
			`${name}: trusted toggle, failed write retains latest draft, explicit retry, owned preview popover`,
		);
	}
}
export async function exercise({ cdp, result }) {
	await cdp.evaluate('uiReview.dispose()');
	assert.equal(
		await cdp.evaluate(
			'Object.values(uiReview.docs).every(doc => !doc.querySelector("[data-review-state],.huhu-portal-root"))',
		),
		true,
	);
	result.cleanup = 'Both production roots, RuleManager timers, SettingsStores and document portals disposed';
}
