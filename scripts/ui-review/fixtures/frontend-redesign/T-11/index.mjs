import assert from 'node:assert/strict';
import { modalTransforms } from '../../../../radix-owner-document.mjs';
export const adapterCounts = {
	sonner: { 'sonner/dist/index.mjs': 1 },
	radix: Object.fromEntries(Object.keys(modalTransforms).map((key) => [key, 1])),
};
export const startup = 'globalThis.uiReviewStartup';
export const ready = '!!globalThis.uiReview && Object.keys(uiReview.owners).length===2';
export const configure = (sample) => `uiReview.configure(${JSON.stringify(sample)})`;
export const layoutCSS = 'html,body{padding:0;margin:0;height:100%;overflow:hidden}';
const tick = (cdp) => cdp.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))');
async function click(cdp, name, selector) {
 await cdp.evaluate(`Promise.all(uiReview.docs.${name}.getAnimations().filter(animation=>animation.playState==='running'&&Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation=>animation.finished.catch(()=>{})))`);
 await tick(cdp);

	const point = await cdp.evaluate(
		`(()=>{const d=uiReview.docs.${name},n=d.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Missing '+${JSON.stringify(selector)});n.scrollIntoView({block:'center'});const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,hit:n.contains(d.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),target:n.outerHTML,actual:d.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML}})()`,
	);
	assert.equal(point.hit, true, `${name}: trusted hit ${selector} ${JSON.stringify(point)}`);
	for (const type of ['mousePressed', 'mouseReleased'])
		await cdp.send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
	await tick(cdp);
}
async function action(cdp, name, key) {
	await cdp.evaluate(
		`(()=>{const d=uiReview.docs.${name},label=uiReview.text(${JSON.stringify(key)}),n=[...d.querySelectorAll('button,[role=menuitem]')].find(n=>n.textContent.trim()===label||n.getAttribute('aria-label')===label);if(!n)throw Error('Missing action '+label);n.dataset.reviewAction='current'})()`,
	);
	await click(cdp, name, '[data-review-action=current]');
	await cdp.evaluate(
		`uiReview.docs.${name}.querySelector('[data-review-action=current]')?.removeAttribute('data-review-action')`,
	);
}
async function key(cdp, value, code, modifiers = 0) {
	for (const type of ['keyDown', 'keyUp'])
		await cdp.send('Input.dispatchKeyEvent', {
			type,
			key: value,
			code: value,
			windowsVirtualKeyCode: code,
			modifiers,
		});
	await tick(cdp);
}
export async function verify({ cdp, sample, waitFor, capture }) {
	for (const name of ['main', 'second']) {
		await cdp.evaluate(
			`document.querySelector('iframe').style.cssText='position:fixed;top:0;border:0;height:100vh;z-index:100;left:${name === 'second' ? '0' : '-3000px'};width:${sample.cssWidth}px'`,
		);
		for (const state of await cdp.evaluate('uiReview.states')) {
			await cdp.evaluate(`uiReview.show(${JSON.stringify(name)},${JSON.stringify(state)})`);
			await tick(cdp);
			await waitFor(
				() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-review-state=${state}]')`),
				state,
			);
			assert.equal(
				await cdp.evaluate(
					`(()=>{const d=uiReview.docs.${name};return d.documentElement.scrollWidth>d.documentElement.clientWidth+1})()`,
				),
				false,
				`${name}/${state}: horizontal overflow`,
			);
			if (state === 'safe-detail') await click(cdp, name, '[data-safe-entry]');
			if (state === 'safe-new') await action(cdp, name, 'safe.addEntry');
			if (state === 'safe-quick') await action(cdp, name, 'safe.quick.title');
			if (['safe-import', 'safe-restore', 'safe-password'].includes(state)) {
				await action(cdp, name, 'safe.menu');
				await action(
					cdp,
					name,
					state === 'safe-import'
						? 'safe.import.menu'
						: state === 'safe-restore'
							? 'safe.replaceMenu'
							: 'safe.changePassword',
				);
			}
			await capture(`${state}-${name}-${sample.id}`);
			if (state === 'notifications') {
				const before = await cdp.evaluate(`uiReview.owners.${name}.notifications.unread`);
				await click(cdp, name, 'li button');
				await waitFor(
					() => cdp.evaluate(`uiReview.owners.${name}.notifications.unread===${before - 1}`),
					'notification read domain receipt',
				);
				await capture(`notification-detail-${name}-${sample.id}`);
				await key(cdp, 'Escape', 27);
				await action(cdp, name, 'notification.next');
				await click(cdp, name, 'input[type=search]');
				await cdp.send('Input.imeSetComposition', { text: '通知', selectionStart: 2, selectionEnd: 2 });
				await key(cdp, 'Enter', 13);
				assert.equal(await cdp.evaluate(`uiReview.owners.${name}.opened.length`), 0, 'IME does not deep link');
				await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
			}
			if (state === 'safe-unlocked') {
				await click(cdp, name, '[data-safe-entry]');
				await action(cdp, name, 'safe.showPassword');
				assert.equal(
					await cdp.evaluate(`uiReview.docs.${name}.querySelector('[data-safe-detail] input').type`),
					'text',
				);
				await action(cdp, name, 'safe.copyPassword');
				assert.equal(
					await cdp.evaluate(`uiReview.owners.${name}.safe.clipboard.text`),
					'PRIVATE-SECRET-SENTINEL',
				);
				await cdp.evaluate(`uiReview.owners.${name}.safe.service.lock()`);
				await tick(cdp);
				assert.equal(
					await cdp.evaluate(
						`!!uiReview.docs.${name}.querySelector('[data-safe-detail], [data-safe-quick], [data-safe-entries]')`,
					),
					false,
					'lock destroys cleartext subtree and portals',
				);
				assert.equal(
					await cdp.evaluate(`uiReview.docs.${name}.body.innerHTML.includes('PRIVATE-SECRET-SENTINEL')`),
					false,
				);
			}
			if (state === 'safe-import' || state === 'safe-restore') {
				await action(cdp, name, 'safe.chooseBackup');
				await click(cdp, name, '[role=dialog] input[type=password]');
				await cdp.send('Input.insertText', { text: 'a long quick pick master password' });
				await action(cdp, name, 'safe.verifyBackup');
				await waitFor(
					() => cdp.evaluate(`!uiReview.docs.${name}.querySelector('[role=dialog] input[type=password]')`),
					'authenticated encrypted backup preview',
				);
				await capture(`backup-preview-${state}-${name}-${sample.id}`);
			}
			if (state === 'safe-quick') {
				await cdp.evaluate(`uiReview.owners.${name}.safe.clipboard.fail=true`);
				await action(cdp, name, 'safe.copyPassword');
				await waitFor(
					() => cdp.evaluate(`!!uiReview.docs.${name}.querySelector('[data-safe-quick] [role=alert]')`),
					'clipboard failure',
				);
				assert.equal(
					await cdp.evaluate(`uiReview.docs.${name}.body.textContent.includes('PRIVATE-SECRET-SENTINEL')`),
					false,
					'no thrown secret in errors',
				);
				await capture(`quick-clipboard-error-${name}-${sample.id}`);
				await cdp.evaluate(`uiReview.owners.${name}.safe.clipboard.fail=false`);
			}
			if (state === 'health-repair') {
				await action(cdp, name, 'health.page.plan');
				await waitFor(
					() =>
						cdp.evaluate(
							`uiReview.docs.${name}.body.textContent.includes(uiReview.text('health.page.preview'))`,
						),
					'real repair plan',
				);
				assert.equal(await cdp.evaluate(`uiReview.owners.${name}.commits`), 0, 'plan is read only');
				await action(cdp, name, 'health.page.review');
				await key(cdp, 'Escape', 27);
				assert.equal(await cdp.evaluate(`uiReview.owners.${name}.commits`), 0, 'cancel does not commit');
				await action(cdp, name, 'health.page.review');
				await action(cdp, name, 'health.page.confirm');
				await waitFor(() => cdp.evaluate(`uiReview.owners.${name}.commits===2`), 'real partial repair receipt');
				await capture(`health-partial-${name}-${sample.id}`);
				await action(cdp, name, 'health.page.recovery');
				await capture(`health-recovery-${name}-${sample.id}`);
				await action(cdp, name, 'health.page.resume');
			}
			if (state === 'health-scanning') {
				await action(cdp, name, 'health.page.cancelScan');
				await waitFor(() => cdp.evaluate(`!uiReview.owners.${name}.scanner.snapshot.running`), 'scan cancel');
			}
		}
		await cdp.evaluate(`uiReview.owners.${name}.hide(true)`);
		await tick(cdp);
		assert.equal(
			await cdp.evaluate(`uiReview.docs.${name}.querySelectorAll('[role=dialog]').length`),
			0,
			'hide releases overlays',
		);
		await cdp.evaluate(`uiReview.owners.${name}.hide(false)`);
	}
}

export async function exercise({ cdp, result }) {
	await cdp.evaluate('uiReview.dispose()');
	assert.equal(await cdp.evaluate('Object.values(uiReview.docs).every(d => !d.querySelector("[role=dialog],.huhu-portal-root,[data-safe-detail],[data-safe-quick]"))'), true, 'both document owners and portals disposed');
	result.cleanup = 'Both document UI roots, real in-memory Safe/Notification/Health services and owned timers/portals disposed';
}
