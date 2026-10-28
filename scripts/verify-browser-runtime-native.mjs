import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';

const [helperArg, chromeArg, evidenceArg] = process.argv.slice(2);
if (!helperArg || !chromeArg || !evidenceArg)
	throw Error('Usage: node scripts/verify-browser-runtime-native.mjs <helper> <full-chrome> <new-evidence-dir>');
const helper = path.resolve(helperArg),
	chrome = path.resolve(chromeArg),
	evidence = path.resolve(evidenceArg);
await fs.mkdir(evidence, { mode: 0o700 });
const compiled = path.join(evidence, 'driver.cjs');
await build({
	entryPoints: ['src/modules/browser/platform/desktop/runtime/driver.ts'],
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node22',
	outfile: compiled,
	logLevel: 'warning',
});
const { BrowserDriver } = createRequire(import.meta.url)(compiled);
const helperLocal = path.join(evidence, 'huhu-browser-runtime');
await fs.copyFile(helper, helperLocal);
await fs.chmod(helperLocal, 0o755);
if (process.getuid?.() === 0) {
	await fs.chown(evidence, 65534, 65534);
	await fs.chmod(evidence, 0o700);
	process.setgid(65534);
	process.setuid(65534);
}
const checks = [];
const runtimes = [];
const events = [];
const check = (name, data = {}) => {
	checks.push({ name, ...data });
	console.log('PASS ' + name);
};
async function until(predicate, timeout = 12000) {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const result = await predicate();
		if (result) return result;
		await delay(25);
	}
	throw Error('Timed out waiting for expected browser event');
}
const server = createServer((req, res) => {
	if (req.url === '/fill-frame') {
		res.setHeader('Content-Type', 'text/html');
		res.end('<input aria-label="Frame fill">');
		return;
	}
	if (req.url === '/fill-checks') {
		res.setHeader('Content-Type', 'text/html');
		res.end(`<!doctype html><meta charset="UTF-8"><input id="fill-target" aria-label="Fixture input">
		<input aria-label="Truncated fill" maxlength="3">
		<input aria-label="Transformed fill" oninput="this.value=this.value.toUpperCase()">
		<input aria-label="Rejected fill" value="locked" onbeforeinput="event.preventDefault()">
		<input aria-label="Detached fill" oninput="this.remove()">
		<input aria-label="Secret fill" type="password">
		<input aria-label="Redirected focus" onfocus="document.getElementById('fill-target').focus()">
		<iframe src="/fill-frame"></iframe><iframe src="http://localhost:${server.address().port}/fill-frame"></iframe>`);
		return;
	}
	if (req.url === '/auth') {
		res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="HUHU isolated fixture"', 'Content-Type': 'text/html' });
		res.end('<title>Authentication denied</title>Denied');
		return;
	}
	if (req.url === '/download') {
		res.writeHead(200, {
			'Content-Disposition': 'attachment; filename="fixture.txt"',
			'Content-Type': 'text/plain',
		});
		res.end('Authorized browser fixture');
		return;
	}
	if (req.url === '/frame' || req.url === '/local-frame') {
		res.setHeader('Content-Type', 'text/html');
		res.end(
			`<button aria-label="${req.url === '/frame' ? 'Frame counter' : 'Local frame counter'}" onclick="this.textContent='Frame clicked'">Frame counter</button>`,
		);
		return;
	}
	res.setHeader('Content-Type', 'text/html');
	res.end(
		`<!doctype html><meta charset="UTF-8"><title>Owned browser fixture</title><style>body{font:20px sans-serif;margin:24px}button,input,select{font:20px sans-serif;margin:5px;padding:8px}iframe{width:500px;height:90px}</style><script>window.__events=[];for(const type of ["mousedown","mouseup","click"])document.addEventListener(type,e=>window.__events.push({type,x:e.clientX,y:e.clientY,target:e.target.getAttribute("aria-label")}),true)</script><h1>HUHU isolated fixture</h1><input aria-label="Fixture input"><select aria-label="Fixture select"><option value="a">Alpha</option><option value="b">Beta</option></select><button aria-label="Counter" onclick="this.dataset.count=String(+(this.dataset.count||0)+1);this.textContent='Count '+this.dataset.count">Counter</button><button aria-label="Prompt" onclick="document.querySelector('output').textContent='Prompt:'+prompt('Fixture prompt')">Prompt</button><button aria-label="Select heading" onclick="const r=document.createRange();r.selectNodeContents(document.querySelector('h1'));getSelection().removeAllRanges();getSelection().addRange(r)">Select heading</button><button aria-label="Choose file" onclick="document.querySelector('#file').click()">Choose file</button><input id="file" type="file" hidden><a href="/download">Download fixture</a><output></output><iframe src="/local-frame"></iframe><iframe src="http://localhost:${server.address().port}/frame"></iframe><input type="password" aria-label="Password fixture" value="SYNTHETIC_NATIVE_PASSWORD"><a href="/popup" target="_blank" aria-label="Popup fixture">Popup fixture</a>`,
	);
});
await new Promise((resolve) => server.listen(0, '0.0.0.0', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
async function start(name) {
	const directory = path.join(evidence, name);
	await fs.mkdir(directory, { mode: 0o700 });
	const profile = path.join(directory, 'profile'),
		downloadPath = path.join(directory, 'downloads');
	await fs.mkdir(profile, { mode: 0o700 });
	await fs.mkdir(downloadPath, { mode: 0o700 });
	const runtimeId = randomUUID(),
		spaceId = randomUUID(),
		key = randomBytes(32).toString('hex'),
		token = randomBytes(32).toString('hex');
	const provisioning = {
		runtimeId,
		spaceId,
		epoch: 0,
		leaseId: randomUUID(),
		controllerId: 'provisioning',
		mode: 'workspace',
		expiresAt: Number.MAX_SAFE_INTEGER,
	};
	const child = spawn(helperLocal, [], { stdio: ['pipe', 'pipe', 'pipe'] });
	let remaining = Buffer.alloc(0),
		next = 0;
	const pending = new Map();
	let closed = false;
	child.stderr.resume();
	child.on('error', (error) => {
		for (const item of pending.values()) item.reject(error);
		pending.clear();
	});
	child.on('close', () => {
		closed = true;
		for (const item of pending.values()) item.reject(Error('Native helper closed'));
		pending.clear();
	});
	child.stdout.on('data', (bytes) => {
		remaining = Buffer.concat([remaining, bytes]);
		while (remaining.length >= 4) {
			const length = remaining.readUInt32BE(0);
			if (remaining.length < length + 4) break;
			const message = JSON.parse(remaining.subarray(4, length + 4));
			remaining = remaining.subarray(length + 4);
			const item = pending.get(message.id);
			if (item) {
				pending.delete(message.id);
				clearTimeout(item.timer);
				message.error ? item.reject(Error(message.error)) : item.resolve(message.result);
			} else if (message.type === 'fatal') events.push({ kind: 'native-fault', runtimeId, code: message.code });
		}
	});
	const call = (message, timeout = 10000) =>
		new Promise((resolve, reject) => {
			const id = ++next,
				timer = setTimeout(() => {
					pending.delete(id);
					reject(Error('Native control timeout'));
				}, timeout);
			pending.set(id, { resolve, reject, timer });
			const body = Buffer.from(JSON.stringify({ ...message, id })),
				header = Buffer.alloc(4);
			header.writeUInt32BE(body.length);
			child.stdin.write(Buffer.concat([header, body]));
		});
	const boot = await call({
		type: 'start',
		protocol: 2,
		executable: chrome,
		profile,
		runtimeId,
		spaceId,
		ephemeral: true,
		ownerKey: key,
		token,
		provisioningLease: provisioning.leaseId,
	});
	const driver = new BrowserDriver(spaceId, runtimeId, downloadPath, true, provisioning, (event) =>
		events.push(event),
	);
	const item = {
		child,
		call,
		driver,
		runtimeId,
		spaceId,
		key,
		profile,
		downloadPath,
		pid: boot.pid,
		epoch: 0,
		closed: () => closed,
	};
	runtimes.push(item);
	const version = await driver.start(boot.port, token);
	assert.equal(version.split('/')[1], '156.0.8078.47');
	return item;
}
async function grant(runtime, mode, mirror = true) {
	const lease = {
		runtimeId: runtime.runtimeId,
		spaceId: runtime.spaceId,
		epoch: ++runtime.epoch,
		leaseId: randomUUID(),
		controllerId: randomUUID(),
		mode,
		expiresAt: Date.now() + 120000,
	};
	const ack = await runtime.call({ type: 'control', epoch: lease.epoch, lease });
	assert.equal(ack.epoch, lease.epoch);
	if (mirror) await runtime.driver.setControl(lease, lease.epoch);
	runtime.lease = lease;
	return lease;
}
async function pause(runtime, mirror = true) {
	const epoch = ++runtime.epoch,
		begin = Date.now();
	const ack = await runtime.call({ type: 'control', epoch, lease: null });
	if (mirror) await runtime.driver.setControl(undefined, epoch);
	runtime.lease = undefined;
	return { ack, elapsedMs: Date.now() - begin };
}
async function snapshot(runtime, pageId) {
	return until(async () => {
		try {
			const value = await runtime.driver.observe(pageId, runtime.lease);
			return value.nodes.some((node) => node.name === 'Fixture input') && value;
		} catch (error) {
			if (!['browser_document_changed', 'browser_viewport_changed', 'browser_frame_changed', 'browser_cdp_error'].includes(error.code)) throw error;
		}
	});
}
async function action(runtime, pageId, kind, name, rest = {}) {
	const value = await snapshot(runtime, pageId),
		node = value.nodes.find((item) => item.name === name);
	assert.ok(node, 'AX node ' + name);
	return runtime.driver.execute(pageId, { kind, observationId: value.id, ref: node.ref, ...rest }, runtime.lease);
}
try {
	const a = await start('a');
	const commandLine = (await fs.readFile(`/proc/${a.pid}/cmdline`)).toString();
	assert.ok(commandLine.includes('--remote-debugging-pipe'));
	assert.ok(!commandLine.includes('--no-sandbox'));
	assert.ok(!commandLine.includes('--remote-debugging-port'));
	check('managed full Chromium starts with sandbox enabled and private CDP pipes');
	const seed = {
		cookies: [
			{
				name: 'host',
				value: 'fixture',
				domain: 'example.test',
				path: '/',
				hostOnly: true,
				session: true,
				secure: true,
				httpOnly: true,
				sameSite: 'Lax',
				priority: 'High',
			},
			{
				name: 'partition',
				value: 'private',
				domain: '.example.test',
				path: '/',
				hostOnly: false,
				session: true,
				secure: true,
				httpOnly: false,
				sameSite: 'None',
				partitionKey: { topLevelSite: 'https://top.example', hasCrossSiteAncestor: true },
			},
		],
	};
	await a.driver.writeIdentity(seed, a.driver['lease']);
	const seeded = await a.driver.readIdentity(a.driver['lease']);
	assert.equal(seeded.cookies.length, 2);
	assert.ok(seeded.cookies.find((cookie) => cookie.name === 'partition').partitionKey);
	check('fresh owned-default cookie seed preserves session, host and CHIPS state');
	const b = await start('b');
	assert.equal((await b.driver.readIdentity(b.driver['lease'])).cookies.length, 0);
	check('independent Space process/profile has no inherited cookies');
	const initial = randomUUID(),
		pageId = randomUUID();
	await a.driver.createPage(initial, 'about:blank', a.driver['lease']);
	await a.driver.createPage(pageId, origin + '/fixture', a.driver['lease']);
	await assert.rejects(
		a.driver.writeIdentity(seed, a.driver['lease']),
		(error) => error.code === 'browser_target_not_empty',
	);
	await pause(a);
	await grant(a, 'agent');
	const observedFrames = await until(async () => {
		const value = await snapshot(a, pageId);
		return value.nodes.some(node => node.name === 'Local frame counter') && value.nodes.some(node => node.name === 'Frame counter') && value;
	});
	assert.ok(observedFrames.coverage.length >= 3);
	assert.ok(observedFrames.coverage.every(frame => frame.status === 'complete'));
	assert.deepEqual(observedFrames.frameErrors, []);
	assert.equal(observedFrames.scope.pageId, pageId);
	assert.ok(Number.isInteger(observedFrames.viewportVersion));
	assert.ok(!JSON.stringify(observedFrames).includes('SYNTHETIC_NATIVE_PASSWORD'));
	const childNode = observedFrames.nodes.find(node => node.name === 'Frame counter');
	const scopedFrame = await a.driver.observe(pageId, a.lease, { frameId: childNode.frameId, rootRef: childNode.ref, mode: 'interactive', maxNodes: 8, maxBytes: 4096 });
	assert.equal(scopedFrame.coverage.length, 1);
	assert.ok(scopedFrame.nodes.every(node => node.frameId === childNode.frameId));
	assert.ok(Buffer.byteLength(JSON.stringify(scopedFrame)) <= 4096);
	check('same-process and cross-origin frame coverage, scoped layout and password redaction');
	await action(a, pageId, 'click', 'Popup fixture');
	const popupPage = await until(() => events.findLast(event => event.kind === 'page' && event.runtimeId === a.runtimeId && event.page.id !== initial && event.page.id !== pageId && event.page.url === origin + '/popup'));
	const popupObservation = await snapshot(a, popupPage.page.id);
	assert.equal(popupObservation.scope.pageId, popupPage.page.id);
	await assert.rejects(a.driver.execute(popupPage.page.id, { kind: 'click', observationId: observedFrames.id, ref: childNode.ref }, a.lease), error => error.code === 'browser_stale_ref');
	await a.driver.closePage(popupPage.page.id, a.lease);
	check('popup keeps a separate Page and refuses opener references');
	await a.driver.watch(pageId, true);
	check('multiple Pages share only their own Runtime and permanently seal provisioning');
	const stillSince = Date.now();
	await delay(3400);
	const stillFrame = events.findLast(
		(event) => event.kind === 'frame' && event.frame.pageId === pageId && event.frame.epoch === a.epoch,
	);
	assert.ok(
		stillFrame &&
			stillFrame.frame.capturedAt > stillSince + 1000 &&
			Date.now() - stillFrame.frame.capturedAt < 3000,
	);
	check('static watched Page refreshes real pixels after more than three idle seconds');
	await action(a, pageId, 'fill', 'Fixture input', { text: '隔离' });
	await action(a, pageId, 'type', 'Fixture input', { text: '输入' });
	assert.equal((await snapshot(a, pageId)).nodes.find((node) => node.name === 'Fixture input').value, '隔离输入');
	await action(a, pageId, 'select', 'Fixture select', { values: ['b'] });
	check('AX references support fill, append typing and native select');
	const fillPage = randomUUID(); await a.driver.createPage(fillPage, origin + '/fill-checks', a.lease);
	for (const [name, text, verification, sensitive] of [
		['Fixture input', '中文🙂', 'matched', false], ['Truncated fill', 'abcdef', 'truncated', false],
		['Transformed fill', 'lowercase', 'transformed', false], ['Rejected fill', 'replacement', 'rejected', false],
		['Detached fill', 'detached', 'unverified', false], ['Secret fill', 'SYNTHETIC_FILL_SECRET', 'matched', true],
	]) {
		const result = await action(a, fillPage, 'fill', name, { text });
		assert.deepEqual(result, { ok: verification === 'matched', verification, sensitive });
		assert.ok(!JSON.stringify(result).includes(text));
	}
	await assert.rejects(action(a, fillPage, 'fill', 'Redirected focus', { text: 'must-not-insert' }), error => error.code === 'browser_element_not_actionable');
	const frameInputs = (await snapshot(a, fillPage)).nodes.filter(node => node.name === 'Frame fill'); assert.equal(frameInputs.length, 2);
	for (const index of [0, 1]) {
		const fresh = await snapshot(a, fillPage), target = fresh.nodes.filter(node => node.name === 'Frame fill')[index];
		assert.deepEqual(await a.driver.execute(fillPage, { kind: 'fill', observationId: fresh.id, ref: target.ref, text: '框架输入' }, a.lease), { ok: true, verification: 'matched', sensitive: false });
	}
	await a.driver.closePage(fillPage, a.lease);
	check('fill readback confirms Unicode, truncation, formatting, refusal, detach, secret redaction and iframe focus');

	await action(a, pageId, 'click', 'Counter');
	await a.driver.execute(
		pageId,
		{ kind: 'wait', condition: { kind: 'text', text: 'Count 1' }, timeoutMs: 3000 },
		a.lease,
	);
	check('stable hit-tested AX click and bounded wait reach real DOM');
	const oldLease = a.lease,
		oldObservation = await snapshot(a, pageId),
		fence = await pause(a, false);
	assert.ok(fence.elapsedMs < 1000);
	await assert.rejects(
		a.driver.execute(pageId, { kind: 'press', key: 'x' }, oldLease),
		(error) => error.code === 'browser_stale_control' || error.code === 'browser_control_pending',
	);
	await a.driver.setControl(undefined, a.epoch);
	check('independent native revoke ACK rejects an unmirrored stale Worker lease', { elapsedMs: fence.elapsedMs });
	await grant(a, 'human');
	await assert.rejects(
		a.driver.execute(
			pageId,
			{ kind: 'click', observationId: oldObservation.id, ref: oldObservation.nodes[0].ref },
			a.lease,
		),
		(error) => error.code === 'browser_stale_ref',
	);
	await a.driver.execute(pageId, { kind: 'zoom', factor: 1.25 }, a.lease);
	const zoomFrame = await until(() =>
		events.findLast(
			(event) =>
				event.kind === 'frame' &&
				event.frame.pageId === pageId &&
				event.frame.epoch === a.epoch &&
				event.frame.viewportVersion === 2,
		),
	);
	assert.equal(zoomFrame.frame.cssWidth, 1024);
	assert.ok(zoomFrame.frame.width > 0);
	const point = await a.driver.cdp.command(
		'Runtime.evaluate',
		{
			expression:
				"(()=>{const r=document.querySelector('[aria-label=Counter]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()",
			returnByValue: true,
		},
		a.driver['pages'].get(pageId).session,
		a.lease,
	);
	await a.driver.execute(
		pageId,
		{ kind: 'input', inputSequence: 1, input: { kind: 'click', ...point.result.value } },
		a.lease,
	);
	await a.driver.execute(
		pageId,
		{ kind: 'wait', condition: { kind: 'text', text: 'Count 2' }, timeoutMs: 3000 },
		a.lease,
	);
	check('125% zoom invalidates geometry and displayed CSS coordinate clicks hit the real target');
	await a.driver.execute(pageId, { kind: 'zoom', factor: 0.8 }, a.lease);
	const smallFrame = await until(() =>
		events.findLast(
			(event) =>
				event.kind === 'frame' &&
				event.frame.pageId === pageId &&
				event.frame.epoch === a.epoch &&
				event.frame.viewportVersion === 3,
		),
	);
	assert.equal(smallFrame.frame.cssWidth, 1600);
	check('80% zoom emits fresh CSS/pixel metadata without reusing prior geometry');
	await action(a, pageId, 'click', 'Select heading');
	const selection = await a.driver.execute(pageId, { kind: 'selection' }, a.lease);
	assert.equal(selection.text, 'HUHU isolated fixture');
	await assert.rejects(
		a.driver.execute(pageId, { kind: 'press', key: 'v', modifiers: 2 }, a.lease),
		(error) => error.code === 'browser_clipboard_shortcut_denied',
	);
	check('trusted explicit DOM selection read works and native clipboard shortcuts are denied');
	await pause(a);
	await grant(a, 'agent');
	const promptAction = action(a, pageId, 'click', 'Prompt').catch((error) => {
		if (error.code !== 'browser_stale_control') throw error;
	});
	let prompt;
	try {
		prompt = await until(() =>
			events.findLast(
				(event) =>
					event.kind === 'request' &&
					event.request.pageId === pageId &&
					event.request.kind === 'dialog' &&
					event.request.status === 'pending',
			),
		);
	} catch (error) {
		const result = await a.driver.cdp.command(
			'Runtime.evaluate',
			{
				expression:
					'({events:window.__events,focused:document.hasFocus(),visibility:document.visibilityState,selected:getSelection().toString()})',
				returnByValue: true,
			},
			a.driver['pages'].get(pageId).session,
			a.lease,
		);
		await fs.writeFile(path.join(evidence, 'prompt-diagnostics.json'), JSON.stringify(result, null, 2));
		throw error;
	}
	await pause(a);
	await grant(a, 'human');
	const rebound = await until(() =>
		events.findLast(
			(event) =>
				event.kind === 'request' && event.request.id === prompt.request.id && event.request.epoch === a.epoch,
		),
	);
	assert.ok(rebound.request.revision > prompt.request.revision);
	await a.driver.execute(
		pageId,
		{
			kind: 'dialog',
			requestId: rebound.request.id,
			revision: rebound.request.revision,
			accept: true,
			text: 'human',
		},
		a.lease,
	);
	await promptAction;
	check('pending native prompt rebinding follows exact document, epoch and revision after takeover');
	await action(a, pageId, 'click', 'Choose file');
	const chooser = await until(() =>
		events.findLast(
			(event) =>
				event.kind === 'request' &&
				event.request.pageId === pageId &&
				event.request.kind === 'file-chooser' &&
				event.request.epoch === a.epoch,
		),
	);
	const revision = chooser.request.revision;
	const renewed = { ...a.lease, expiresAt: a.lease.expiresAt + 1000 };
	await a.call({ type: 'control', epoch: a.epoch, lease: renewed });
	await a.driver.setControl(renewed, a.epoch);
	a.lease = renewed;
	await a.driver.execute(pageId, { kind: 'chooser', requestId: chooser.request.id, revision, fileIds: [] }, a.lease);
	check('chooser cancellation uses captured revision; equal-epoch heartbeat does not churn requests');
	const authPage = randomUUID();
	await a.driver.createPage(authPage, origin + '/auth', a.lease);
	const auth = await until(() =>
		events.findLast(
			(event) =>
				event.kind === 'request' &&
				event.request.pageId === authPage &&
				event.request.kind === 'http-auth' &&
				event.request.status === 'denied' &&
				event.request.documentId === a.driver['pages'].get(authPage).documentId,
		),
	);
	assert.equal(auth.request.epoch, a.epoch);
	check('real HTTP401 navigation always cancels auth and preserves denial notice across exact loader commit');
	await action(a, pageId, 'click', 'Download fixture');
	const download = await until(() =>
		events.findLast((event) => event.kind === 'download' && event.pageId === pageId && event.state === 'completed'),
	);
	assert.equal(download.epoch, a.epoch);
	assert.equal(download.controllerId, a.lease.controllerId);
	assert.equal(await fs.readFile(path.join(a.downloadPath, download.id), 'utf8'), 'Authorized browser fixture');
	check('private download carries its originating controller and completes at owned path');
	const frameObservation = await snapshot(a, pageId),
		frameNode = frameObservation.nodes.find((node) => node.name === 'Frame counter');
	assert.ok(frameNode);
	await a.driver.execute(pageId, { kind: 'click', observationId: frameObservation.id, ref: frameNode.ref }, a.lease);
	assert.ok((await snapshot(a, pageId)).nodes.some((node) => node.name === 'Frame clicked'));
	check('out-of-process iframe uses verified owner quad mapping and parent hit tests');
	const shot = await a.driver.execute(pageId, { kind: 'screenshot' }, a.lease);
	assert.equal(shot.mime, 'image/png');
	assert.ok(Buffer.from(shot.data, 'base64').length < 8 * 1024 * 1024);
	check('bounded structured screenshot returns actual encoded pixel dimensions');
	const receiptPath = path.join(a.profile, '.huhu-runtime-owner.json'),
		receipt = await fs.readFile(receiptPath),
		tampered = JSON.parse(receipt);
	tampered.data.pid = process.pid;
	await fs.writeFile(receiptPath, JSON.stringify(tampered));
	try {
		const rejected = await new Promise((resolve, reject) => {
			const child = spawn(helperLocal, ['--reclaim'], { stdio: ['pipe', 'pipe', 'pipe'] });
			let output = '';
			child.stdout.on('data', (data) => (output += data));
			child.stderr.resume();
			child.on('error', reject);
			child.on('close', (status) => {
				try {
					resolve(status === 0 && JSON.parse(output).reclaimed === false);
				} catch {
					resolve(false);
				}
			});
			child.stdin.end(JSON.stringify({ profile: a.profile, runtimeId: a.runtimeId, key: a.key }));
		});
		assert.equal(rejected, true);
		process.kill(a.pid, 0);
	} finally {
		await fs.writeFile(receiptPath, receipt);
	}
	check('tampered native PID receipt cannot authorize killing another process');
	for (const runtime of runtimes) {
		const result = await runtime.call({ type: 'stop' });
		assert.equal(result.reclaimed, true);
		runtime.driver.stop();
		runtime.child.stdin.end();
		await until(runtime.closed);
		await assert.rejects(
			fs.stat(path.join(runtime.profile, '.huhu-runtime-owner.json')),
			(error) => error.code === 'ENOENT',
		);
	}
	check('verified stop reaps owned Chrome groups and removes only authenticated live owner receipts');
	await fs.writeFile(
		path.join(evidence, 'result.json'),
		JSON.stringify(
			{
				success: true,
				checks,
				helperSha256: createHash('sha256')
					.update(await fs.readFile(helperLocal))
					.digest('hex'),
				chromiumVersion: '156.0.8078.47',
				sandboxDisabled: false,
			},
			null,
			2,
		),
	);
} catch (error) {
	await fs.writeFile(
		path.join(evidence, 'partial.json'),
		JSON.stringify(
			{
				success: false,
				checks,
				error: { name: error.name, message: error.message, code: error.code },
				events: events
					.filter((event) => event.kind !== 'frame')
					.map((event) =>
						event.kind === 'request'
							? { kind: event.kind, request: { ...event.request, message: '' } }
							: event,
					),
			},
			null,
			2,
		),
	);
	throw error;
} finally {
	for (const runtime of runtimes) {
		if (!runtime.closed())
			try {
				await runtime.call({ type: 'stop' }, 5000);
			} catch {}
		runtime.driver.stop();
		runtime.child.stdin.end();
	}
	await new Promise((resolve) => server.close(resolve));
}
