// Real Obsidian + managed native Chromium. Run only against a NEW disposable vault.
// HUHU_OBSIDIAN_EXECUTABLE=... DISPLAY=:99 node scripts/obsidian-acceptance/agent-browser-v2.mjs <new-root> <complete-runtime-bundle>
// The desktop file picker's returned path is supplied by this fixture. The native picker UI is not tested.
// Chromium retains its sandbox. fresh-vault.mjs disables only the Obsidian host sandbox for this test environment.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';
import { connect } from './cdp.mjs';

const root = path.resolve(process.argv[2] ?? ''),
	bundle = path.resolve(process.argv[3] ?? '');
assert.ok(process.argv[2] && process.argv[3], 'Pass a new fixture root and a complete runtime bundle');
if (process.platform === 'linux' && process.getuid?.() === 0) {
	process.setgid(65534);
	process.setuid(65534);
}
const sha = async (file) =>
	createHash('sha256')
		.update(await fs.readFile(file))
		.digest('hex');
const mainHash = await sha(path.join(process.env.HUHU_PLUGIN_SOURCE || process.cwd(), 'main.js'));
if (process.env.HUHU_EXPECTED_MAIN_SHA)
	assert.equal(mainHash, process.env.HUHU_EXPECTED_MAIN_SHA, 'The tested main.js must match the requested build');
const manifest = JSON.parse(await fs.readFile(path.join(bundle, 'manifest.json'), 'utf8'));
const build = {
	main: mainHash,
	styles: await sha(path.join(process.env.HUHU_PLUGIN_SOURCE || process.cwd(), 'styles.css')),
	worker: await sha(path.join(bundle, manifest.worker)),
	runtimeManifest: await sha(path.join(bundle, 'manifest.json')),
	chromium: manifest.chromiumVersion,
	uid: process.getuid?.(),
	nativePicker: 'Fixture supplies picker result; OS dialog UI not tested',
	obsidianSandbox: false,
	chromiumSandbox: true,
};
const requests = [],
	uploads = [];
const fixtureHtml = `<!doctype html><meta charset="utf-8"><title>HUHU 独立浏览器验收</title>
<style>body{margin:0;font-family:Arial,'Noto Sans CJK SC',sans-serif;background:#f7f9fc;color:#13233d;height:1800px}h1{position:absolute;left:32px;top:18px;font-size:28px}p{position:absolute;left:32px;top:72px}input,textarea,button{font:16px Arial,'Noto Sans CJK SC';box-sizing:border-box;border:1px solid #71829b;border-radius:8px;padding:10px;background:white;color:#13233d}input{position:absolute;left:32px;top:126px;width:400px;height:44px}textarea{position:absolute;left:32px;top:190px;width:540px;height:90px}button{position:absolute;top:302px;height:44px}#update{left:32px}#prompt{left:194px}#file{left:32px;top:372px;width:540px}#status{position:absolute;left:32px;top:446px}#dialog-result{position:absolute;left:32px;top:490px}#file-result{position:absolute;left:32px;top:532px}.card{position:absolute;left:640px;top:126px;width:360px;padding:24px;background:#e5edf9;border-radius:16px;line-height:1.8}</style>
<h1>Independent browser · 独立任务页面</h1><p>真实 Chromium · 仅在明确接管后允许人工输入</p>
<input aria-label="Search text" placeholder="搜索内容"><textarea aria-label="Notes" placeholder="中文输入验收"></textarea>
<button id="update" onclick="document.querySelector('#status').textContent='clicked'">Update status</button>
<button id="prompt" onclick="document.querySelector('#dialog-result').textContent=prompt('HUHU test prompt','')??'dismissed'">Open prompt</button>
<input id="file" type="file" aria-label="Upload file" onchange="const file=this.files[0];document.querySelector('#file-result').textContent=file?.name??'no file';if(file)file.text().then(text=>fetch('/uploaded',{method:'POST',body:JSON.stringify({name:file.name,text})}))">
<div id="status" role="status">ready</div><div id="dialog-result">no prompt</div><div id="file-result">no file</div>
<div class="card">独立 Space<br>明确页面目标<br>默认只读观察<br>接管后安全输入<br>Cookie 与文件按作用域隔离</div>`;
const server = createServer((req, res) => {
	const url = new URL(req.url, 'http://fixture');
	requests.push({ path: url.pathname, cookie: req.headers.cookie ?? '' });
	if (url.pathname === '/uploaded') {
		let body = '';
		req.on('data', (chunk) => {
			body += chunk;
			if (body.length > 65536) req.destroy();
		});
		req.on('end', () => {
			uploads.push(JSON.parse(body));
			res.writeHead(204);
			res.end();
		});
		return;
	}
	if (url.pathname === '/auth') {
		res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="HUHU acceptance"', 'Content-Type': 'text/plain' });
		res.end('Authentication denied by browser policy');
		return;
	}
	if (url.pathname === '/download') {
		res.writeHead(200, {
			'Content-Type': 'text/plain',
			'Content-Disposition': 'attachment; filename="fixture-download.txt"',
		});
		res.end('Synthetic browser download');
		return;
	}
	if (url.pathname === '/set-cookie') res.setHeader('Set-Cookie', 'fixture_identity=changed-A; Path=/; SameSite=Lax');
	res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
	res.end(fixtureHtml);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const results = [],
	p = 'app.plugins.plugins.huhu';
let host, heartbeat, popout;
const check = (name, passed, detail) => {
	results.push({ name, passed, ...(detail === undefined ? {} : { detail }) });
	assert.ok(passed, name);
};
const run = (expression) => host.connection.evaluate(expression);
const until = async (expression, label, timeout = 30000, connection = host.connection) => {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (await connection.evaluate(expression)) return;
		await delay(80);
	}
	throw new Error(`Timed out: ${label}`);
};
const rpc = async (connection, method, params = {}) => {
	const response = await fetch(connection.endpoint, {
		method: 'POST',
		headers: { Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			protocolVersion: 2,
			requestId: randomUUID(),
			bootId: connection.bootId,
			method,
			params,
			deadlineAtMs: Date.now() + 25000,
		}),
	});
	return response.json();
};
const scoped = (connection, extra = {}) => ({ runId: connection.runId, capability: connection.capability, ...extra });
const observe = async (connection, pageId) => {
	const value = await rpc(connection, 'observe', scoped(connection, { pageId }));
	assert.ok(value.result, `Observe failed: ${value.error?.code}`);
	return value.result;
};
const operate = async (connection, pageId, command, requestId = randomUUID()) => {
	const ticket = await rpc(connection, 'operation.prepare', scoped(connection, { pageId, requestId, command }));
	assert.ok(ticket.result?.id, `Prepare failed: ${ticket.error?.code}`);
	const result = await rpc(
		connection,
		'operation.execute',
		scoped(connection, { operationId: ticket.result.id, command }),
	);
	return result.result ?? { state: 'transport-rejected', error: result.error?.code };
};
const click = async (selector, label, connection = host.connection) => {
	await connection.send('Page.bringToFront');
	const box = await connection.evaluate(
		`(async()=>{const node=${selector};if(!node)throw Error(${JSON.stringify(`Missing UI: ${label}`)});node.scrollIntoView({block:'center',inline:'center'});await new Promise(resolve=>requestAnimationFrame(resolve));const b=node.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;if(!node.contains(document.elementFromPoint(x,y)))throw Error(${JSON.stringify(`UI is obscured: ${label}`)});return{x,y}})()`,
	);
	for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
		await connection.send('Input.dispatchMouseEvent', {
			type,
			...box,
			...(type === 'mouseMoved' ? {} : { button: 'left', clickCount: 1 }),
		});
};
const button = (label) =>
	`[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===${JSON.stringify(label)})`;
const pick = async (file, expression) =>
	run(
		`(async()=>{const dialog=require('@electron/remote').require('electron').dialog,original=dialog.showOpenDialog;dialog.showOpenDialog=async()=>({canceled:false,filePaths:[${JSON.stringify(file)}]});try{return await (${expression})}finally{dialog.showOpenDialog=original}})()`,
	);
const humanScope = () =>
	run(
		`(()=>{const s=api.getState().spaces.find(s=>s.id===taskA.id),l=s.control.lease;if(s.control.mode!=='human'||!l)throw Error('Human lease missing');return{spaceId:s.id,pageId:taskA.pages[0].id,viewerId:l.viewerId,leaseId:l.leaseId,epoch:l.epoch}})()`,
	);
const humanSnapshot = async () => {
	const scope = await humanScope();
	return run(`api.pageAction({...${JSON.stringify(scope)},command:{kind:'snapshot'}})`);
};
try {
	host = await launchFreshVault({
		root,
		port: 9471,
		settings: {
			version: 1,
			namespaces: {
				app: {
					language: 'zh',
					introSeen: true,
					modules: {
						browser: true,
						agent: false,
						home: false,
						automations: false,
						archives: false,
						notifications: false,
						icons: false,
						comments: false,
						sync: false,
						navigator: false,
					},
				},
			},
		},
		files: { 'Human-note.md': '# Human editing isolation\n\nThis note remains under human control.\n' },
	});
	check(
		'plugin-copy-hash-matches-build',
		(await sha(path.join(host.vault, '.obsidian/plugins/huhu/main.js'))) === mainHash,
	);
	await run(`window.api=${p}.services.peek({owner:'browser',id:'workspace'});true`);
	await until('!!api&&api.getState().ready', 'independent browser service');
	check(
		'browser-is-independent-with-agent-disabled',
		await run(`!!api&&!${p}.services.peek({owner:'agent',id:'sessions'})`),
	);
	await pick(bundle, 'api.installRuntimeBundle()');
	check('managed-bundle-verified-and-ready', await run(`api.getState().availability.state==='ready'`));
	await run('api.consentEphemeral()');
	const seed = JSON.stringify([
		{
			name: 'fixture_identity',
			value: 'seed-A',
			domain: '127.0.0.1',
			hostOnly: true,
			path: '/',
			secure: false,
			httpOnly: true,
			session: true,
			sameSite: 'Lax',
		},
	]);
	const preview = await run(`api.prepareIdentityImport({label:'验收身份种子',text:${JSON.stringify(seed)}})`);
	check(
		'identity-preflight-has-safe-counts-without-cookie-values',
		preview.counts.accepted === 1 &&
			!JSON.stringify(preview).includes('seed-A') &&
			!JSON.stringify(preview).includes('fixture_identity'),
	);
	await run(`api.discardIdentityImport(${JSON.stringify(preview.planId)});true`);
	await run(`${p}.workbench.open({feature:'browser'})`);
	await until(`!!document.querySelector('.huhu-browser-workspace')`, 'standalone browser workspace');
	await click(button('身份种子'), 'identity seeds');
	await click(
		`[...document.querySelectorAll('label')].find(node=>node.textContent.trim()==='身份名称').querySelector('input')`,
		'identity name',
	);
	await host.connection.send('Input.insertText', { text: '验收身份种子' });
	await click(button('粘贴 Cookie 导出内容'), 'paste cookie export');
	await until(`!!document.querySelector('[role="dialog"] textarea')`, 'paste dialog');
	await click(`document.querySelector('[role="dialog"] textarea')`, 'cookie export text');
	await host.connection.send('Input.insertText', { text: seed });
	await click(button('检查导入'), 'preflight cookie import');
	await until(
		`document.querySelector('[role="dialog"]')?.textContent.includes('检查身份导入')`,
		'safe identity review',
	);
	check(
		'native-ui-preflight-does-not-expose-cookie-secrets',
		await run(
			`(()=>{const text=document.querySelector('[role="dialog"]').textContent;return text.includes('127.0.0.1')&&!text.includes('seed-A')&&!text.includes('fixture_identity')&&api.listIdentities().length===0})()`,
		),
	);
	await host.shot('browser-identity-review-zh');
	await click(button('导入所选域名'), 'explicit identity import');
	await until(`api.listIdentities().some(identity=>identity.label==='验收身份种子')`, 'committed identity');
	await run(`window.seed=api.listIdentities().find(identity=>identity.label==='验收身份种子');true`);
	check(
		'identity-seed-is-created-only-after-explicit-ui-commit',
		await run(`seed.cookieCount===1&&!seed.persistent`),
	);
	await run(
		`(async()=>{window.taskA=await api.createSpace({kind:'task',label:'资料研究 A',identityVersionId:seed.id,ephemeral:true,url:${JSON.stringify(url + '/a')}});return true})()`,
	);
	await run(
		`(async()=>{window.taskB=await api.createSpace({kind:'task',label:'独立任务 B',ephemeral:true,url:${JSON.stringify(url + '/b')}});return true})()`,
	);
	const a = await run('({id:taskA.id,pageId:taskA.pages[0].id,runtimeId:taskA.runtimeId})'),
		b = await run('({id:taskB.id,pageId:taskB.pages[0].id})');
	check(
		'seed-restored-before-task-ready',
		requests.some((req) => req.path === '/a' && req.cookie.includes('fixture_identity=seed-A')),
	);
	check(
		'separate-task-has-no-shared-cookie',
		requests.some((req) => req.path === '/b' && !req.cookie),
	);
	const nativeProcesses = [];
	for (const entry of await fs.readdir('/proc')) {
		if (!/^\d+$/.test(entry)) continue;
		const argv = await fs.readFile(`/proc/${entry}/cmdline`).then(
			(bytes) => bytes.toString().split('\0').filter(Boolean),
			() => [],
		);
		if (
			!argv[0]?.startsWith(host.vault) ||
			path.basename(argv[0]) !== 'chrome' ||
			argv.some((arg) => arg.startsWith('--type='))
		)
			continue;
		const stat = await fs.stat(`/proc/${entry}`);
		nativeProcesses.push({
			pid: Number(entry),
			uid: stat.uid,
			privatePipe: argv.includes('--remote-debugging-pipe'),
			sandboxDisabled: argv.includes('--no-sandbox'),
			publicDebugPort: argv.some((arg) => arg.startsWith('--remote-debugging-port')),
			profile: argv.find((arg) => arg.startsWith('--user-data-dir=')),
		});
	}
	check(
		'owned-chromium-processes-have-sandbox-and-private-pipe',
		nativeProcesses.length === 2 &&
			nativeProcesses.every(
				(item) => item.uid === 65534 && item.privatePipe && !item.sandboxDisabled && !item.publicDebugPort,
			) &&
			new Set(nativeProcesses.map((item) => item.profile)).size === 2,
	);
	await fs.writeFile(
		path.join(host.evidence, 'native-processes.json'),
		JSON.stringify(
			nativeProcesses.map(({ profile, ...item }) => item),
			null,
			2,
		),
	);
	await run(
		`(async()=>{window.personal=await api.createSpace({kind:'personal',label:'个人登录',ephemeral:true});return true})()`,
	);
	check(
		'personal-space-refuses-agent-control',
		await run(
			`api.resumeAgent(personal.id).then(()=>false,error=>error.code==='personal_space_forbidden'||error.message==='personal_space_forbidden')`,
		),
	);
	await run('api.stopSpace(personal.id)');
	await run('(async()=>{await api.resumeAgent(taskA.id);await api.resumeAgent(taskB.id);return true})()');
	const connection = async (expression) => {
		const value = await run(expression);
		assert.ok(path.isAbsolute(value), 'Connection is an explicit private descriptor path');
		assert.equal((await fs.stat(value)).mode & 0o777, 0o600, 'Connection descriptor is private');
		return JSON.parse(await fs.readFile(value, 'utf8'));
	};
	const ca = await connection('api.copyAgentConnection(taskA.id)'),
		cb = await connection('api.copyAgentConnection(taskB.id)');
	heartbeat = setInterval(() => {
		void rpc(ca, 'run.heartbeat', scoped(ca));
		void rpc(cb, 'run.heartbeat', scoped(cb));
	}, 20000);
	let snapshot = await observe(ca, a.pageId);
	check(
		'real-semantic-observation',
		snapshot.nodes.some((node) => node.name === 'Update status'),
	);
	const activeBeforeCleanup = await run(
		`(()=>{const s=api.getState().spaces.find(s=>s.id===taskA.id);return{runtimeId:s.runtimeId,pageIds:s.pages.map(p=>p.id),control:s.control}})()`,
	);
	await run('api.retryPendingCleanup()');
	const activeAfterCleanup = await run(
		`(()=>{const s=api.getState().spaces.find(s=>s.id===taskA.id);return{runtimeId:s.runtimeId,pageIds:s.pages.map(p=>p.id),control:s.control}})()`,
	);
	check(
		'retry-cleanup-preserves-active-ephemeral-space-and-lease',
		JSON.stringify(activeBeforeCleanup) === JSON.stringify(activeAfterCleanup) &&
			(await observe(ca, a.pageId)).nodes.some((node) => node.name === 'Update status'),
	);
	check(
		'connection-default-cannot-create-other-spaces',
		(await rpc(ca, 'space.create', { requestId: randomUUID(), ephemeral: true })).error?.code ===
			'workspace_create_grant_required',
	);
	check(
		'agent-protocol-rejects-arbitrary-javascript',
		(
			await rpc(
				ca,
				'operation.prepare',
				scoped(ca, {
					pageId: a.pageId,
					requestId: randomUUID(),
					command: { kind: 'evaluate', code: 'document.cookie' },
				}),
			)
		).error?.code === 'invalid_request',
	);
	// A real Obsidian editor retains focus and text while headless Agent actions run.
	await run(
		`(async()=>{window.humanLeaf=app.workspace.getLeaf('split');await humanLeaf.openFile(app.vault.getAbstractFileByPath('Human-note.md'));window.humanEditor=humanLeaf.view.editor;humanEditor.focus();window.humanActive=document.activeElement;window.humanBefore=humanEditor.getValue();require('@electron/remote').clipboard.writeText('HUHU-host-clipboard-sentinel');return true})()`,
	);
	const input = snapshot.nodes.find((node) => node.name === 'Search text');
	assert.ok(input, 'Native search input ref');
	const filled = await operate(ca, a.pageId, {
		kind: 'fill',
		observationId: snapshot.id,
		ref: input.ref,
		text: 'Agent 不抢焦点',
	});
	check('agent-fills-real-page', filled.state === 'completed', filled.error);
	check(
		'agent-preserves-real-obsidian-editor-focus-and-clipboard',
		await run(
			`document.activeElement===humanActive&&humanEditor.getValue()===humanBefore&&require('@electron/remote').clipboard.readText()==='HUHU-host-clipboard-sentinel'`,
		),
	);
	check(
		'navigate-ledger-completes',
		(await operate(ca, a.pageId, { kind: 'navigate', url: url + '/set-cookie' })).state === 'completed',
	);
	await operate(ca, a.pageId, { kind: 'navigate', url: url + '/a-after' });
	await operate(cb, b.pageId, { kind: 'navigate', url: url + '/b-after' });
	check(
		'task-cookie-mutation-stays-isolated',
		requests.some((req) => req.path === '/a-after' && req.cookie.includes('changed-A')) &&
			requests.some((req) => req.path === '/b-after' && !req.cookie),
	);
	const stale = await operate(ca, a.pageId, { kind: 'click', observationId: snapshot.id, ref: input.ref });
	check('stale-observation-cannot-dispatch', stale.state !== 'completed', stale.error);
	// The seam supplies a user's native picker result; managed copy, grant, RPC and actual Chrome upload stay real.
	const upload = path.join(root, 'fixture-upload.txt');
	await fs.writeFile(upload, 'Synthetic file for scoped native browser upload.');
	const file = await pick(upload, "api.chooseUpload(taskA.id,'agent')");
	assert.ok(file?.id, 'Scoped native file copy');
	check(
		'current-run-file-list-exposes-only-its-grant',
		(await rpc(ca, 'file.list', scoped(ca))).result.some((item) => item.id === file.id) &&
			!(await rpc(cb, 'file.list', scoped(cb))).result.some((item) => item.id === file.id),
	);
	const other = await observe(cb, b.pageId),
		otherRef = other.nodes.find((node) => node.name === 'Upload file');
	assert.ok(otherRef, 'Other Space upload ref');
	const wrong = await operate(cb, b.pageId, {
		kind: 'upload',
		observationId: other.id,
		ref: otherRef.ref,
		fileIds: [file.id],
	});
	check(
		'wrong-run-file-grant-is-denied-before-consumption',
		wrong.state !== 'completed' && wrong.error === 'file_scope_mismatch',
		wrong.error,
	);
	snapshot = await observe(ca, a.pageId);
	const uploadRef = snapshot.nodes.find((node) => node.name === 'Upload file');
	assert.ok(uploadRef, 'Native file input ref');
	const uploaded = await operate(ca, a.pageId, {
		kind: 'upload',
		observationId: snapshot.id,
		ref: uploadRef.ref,
		fileIds: [file.id],
	});
	check('scoped-agent-file-reaches-real-chromium', uploaded.state === 'completed', uploaded.error);
	snapshot = await observe(ca, a.pageId);
	await fs.writeFile(path.join(host.evidence, 'upload-observation.json'), JSON.stringify(snapshot, null, 2));
	check('real-upload-change-is-visible', JSON.stringify(snapshot).includes('fixture-upload.txt'));
	for (let count = 0; count < 30 && !uploads.length; count++) await delay(100);
	check(
		'real-upload-preserves-original-name-and-fixed-bytes',
		uploads.some(
			(item) =>
				item.name === 'fixture-upload.txt' && item.text === 'Synthetic file for scoped native browser upload.',
		),
	);
	await run(`${p}.workbench.open({feature:'browser',resourceId:taskA.id,focusId:taskA.pages[0].id})`);
	await until(`!!document.querySelector('.huhu-browser-viewer canvas')`, 'standalone viewer');
	await until(
		`(()=>{const canvas=document.querySelector('.huhu-browser-viewer canvas');return canvas?.getContext('2d').getImageData(0,0,1,1).data[3]===255})()`,
		'decoded native canvas frame',
	);
	check(
		'opening-viewer-does-not-take-agent-control',
		await run(`api.getState().spaces.find(s=>s.id===taskA.id).control.mode==='agent'`),
	);
	await click(button('接管'), 'take control');
	await until(`api.getState().spaces.find(s=>s.id===taskA.id).control.mode==='human'`, 'human lease');
	clearInterval(heartbeat);
	heartbeat = undefined;
	check(
		'old-run-is-revoked-after-human-takeover',
		(await rpc(ca, 'observe', scoped(ca, { pageId: a.pageId }))).error?.code === 'run_revoked',
	);
	await run(
		`window.latestFrame=undefined;window.frameWatch=api.subscribeFrames({spaceId:taskA.id,pageId:taskA.pages[0].id,viewerId:'acceptance-observer'},frame=>{latestFrame={...frame,data:undefined};frameWatch?.ack(frame.frameId)});true`,
	);
	await until('!!latestFrame', 'current frame metadata');
	let scope = await humanScope();
	const beforeZoom = await run('latestFrame');
	await run(`api.pageAction({...${JSON.stringify(scope)},command:{kind:'zoom',factor:1.25}})`);
	await until(
		`latestFrame.viewportVersion>${beforeZoom.viewportVersion}&&latestFrame.cssWidth===1024`,
		'125% geometry frame',
	);
	check(
		'zoom125-has-real-confirmed-frame-geometry',
		await run('latestFrame.width===1280&&latestFrame.cssWidth===1024'),
	);
	await run(`api.pageAction({...${JSON.stringify(scope)},command:{kind:'zoom',factor:0.8}})`);
	await until('latestFrame.cssWidth===1600', '80% geometry frame');
	check('zoom80-preserves-output-surface', await run('latestFrame.width===1280&&latestFrame.cssWidth===1600'));
	check(
		'old-frame-is-refused-after-geometry-change',
		await run(
			`api.humanInput({...${JSON.stringify(scope)},frameId:${JSON.stringify(beforeZoom.frameId)},inputSequence:100,input:{kind:'click',x:200,y:148}}).then(()=>false,error=>error.code==='frame_stale'||error.message==='frame_stale')`,
		),
	);
	await delay(3500);
	const idleFrame = await run('latestFrame');
	check('static-page-gets-a-real-fresh-frame', Date.now() - idleFrame.capturedAt < 3000);
	// Input coordinates derive from the actual latest CSS frame and the visible canvas content box.
	const point = await run(
		`(()=>{const box=document.querySelector('.huhu-browser-viewer canvas').getBoundingClientRect(),frame=latestFrame;const scale=Math.min(box.width/frame.cssWidth,box.height/frame.cssHeight);return{x:box.x+(box.width-frame.cssWidth*scale)/2+200*scale,y:box.y+(box.height-frame.cssHeight*scale)/2+148*scale}})()`,
	);
	for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased'])
		await host.connection.send('Input.dispatchMouseEvent', {
			type,
			...point,
			...(type === 'mouseMoved' ? {} : { button: 'left', clickCount: 1 }),
		});
	await run(`document.querySelector('.huhu-browser-viewer textarea').focus();true`);
	await host.connection.send('Input.insertText', { text: '中文输入验收' });
	await click(button('插入文本'), 'insert Chinese text');
	await delay(200);
	snapshot = await humanSnapshot();
	check('native-frame-click-and-chinese-text-reach-the-page', JSON.stringify(snapshot).includes('中文输入验收'));
	await run(`document.querySelector('.huhu-browser-viewer canvas').focus();true`);
	await Promise.all(
		['x', 'y', 'z'].flatMap((key) => [
			host.connection.send('Input.dispatchKeyEvent', {
				type: 'keyDown',
				key,
				code: `Key${key.toUpperCase()}`,
				windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0),
				text: key,
			}),
			host.connection.send('Input.dispatchKeyEvent', {
				type: 'keyUp',
				key,
				code: `Key${key.toUpperCase()}`,
				windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0),
			}),
		]),
	);
	snapshot = await humanSnapshot();
	check(
		'rapid-canvas-keyboard-input-keeps-every-character',
		snapshot.nodes.some((node) => node.name === 'Search text' && node.value === '中文输入验收xyz'),
	);
	await host.shot('browser-workspace-zh');
	// A prompt is triggered through a fresh semantic ref. Capture the settled operation result on timeout.
	snapshot = await humanSnapshot();
	const prompt = snapshot.nodes.find((node) => node.name === 'Open prompt');
	assert.ok(prompt, 'Prompt ref');
	await run(
		`window.promptClick=api.pageAction({...${JSON.stringify(scope)},command:${JSON.stringify({ kind: 'click', observationId: snapshot.id, ref: prompt.ref })}}).then(value=>({state:'completed',value}),error=>({state:'failed',code:error.code??error.message}));true`,
	);
	await until(
		`api.getState().requests.some(r=>r.spaceId===taskA.id&&r.kind==='dialog'&&r.epoch===${scope.epoch}&&r.status==='pending')`,
		'prompt request after real click',
	);
	const request = await run(
		`api.getState().requests.find(r=>r.spaceId===taskA.id&&r.kind==='dialog'&&r.status==='pending')`,
	);
	await run(
		`api.pageAction({...${JSON.stringify(scope)},command:{kind:'dialog',requestId:${JSON.stringify(request.id)},revision:${request.revision},accept:true,text:'人工确认'}})`,
	);
	const promptResult = await run('promptClick');
	check('native-prompt-reply-completes', promptResult.state === 'completed', promptResult.code);
	snapshot = await humanSnapshot();
	check('prompt-reply-reaches-real-page', JSON.stringify(snapshot).includes('人工确认'));
	// A genuine native chooser survives lease revocation, but its prior revision cannot answer the renewed request.
	snapshot = await humanSnapshot();
	const chooserRef = snapshot.nodes.find((node) => node.name === 'Upload file');
	assert.ok(chooserRef, 'Human chooser input ref');
	await run(
		`window.chooserClick=api.pageAction({...${JSON.stringify(scope)},command:${JSON.stringify({ kind: 'click', observationId: snapshot.id, ref: chooserRef.ref })}}).then(()=>({state:'completed'}),error=>({state:'failed',code:error.code??error.message}));true`,
	);
	await until(
		`api.getState().requests.some(r=>r.spaceId===taskA.id&&r.kind==='file-chooser'&&r.status==='pending'&&r.epoch===${scope.epoch})`,
		'native chooser request',
	);
	const oldChooser = await run(
		`api.getState().requests.find(r=>r.spaceId===taskA.id&&r.kind==='file-chooser'&&r.status==='pending')`,
	);
	await click(button('释放控制权'), 'release while chooser is pending');
	await until(`api.getState().spaces.find(s=>s.id===taskA.id).control.mode==='paused'`, 'chooser owner released');
	check('pending-native-chooser-does-not-prevent-control-release', true);
	await click(button('接管'), 'renew chooser human authority');
	await until(`api.getState().spaces.find(s=>s.id===taskA.id).control.mode==='human'`, 'renewed human lease');
	scope = await humanScope();
	await until(
		`api.getState().requests.some(r=>r.id===${JSON.stringify(oldChooser.id)}&&r.status==='pending'&&r.epoch===${scope.epoch})`,
		'chooser bound to renewed epoch',
	);
	const renewedChooser = await run(`api.getState().requests.find(r=>r.id===${JSON.stringify(oldChooser.id)})`);
	check(
		'native-request-renews-revision-and-epoch',
		renewedChooser.revision > oldChooser.revision && renewedChooser.epoch === scope.epoch,
	);
	check(
		'stale-native-request-revision-is-rejected',
		await run(
			`api.pageAction({...${JSON.stringify(scope)},command:{kind:'chooser',requestId:${JSON.stringify(oldChooser.id)},revision:${oldChooser.revision},fileIds:[]}}).then(()=>false,error=>['request_expired','browser_stale_request'].includes(error.code??error.message))`,
		),
	);
	const humanFile = await pick(upload, "api.chooseUpload(taskA.id,'human')");
	await run(
		`api.pageAction({...${JSON.stringify(scope)},command:{kind:'chooser',requestId:${JSON.stringify(renewedChooser.id)},revision:${renewedChooser.revision},fileIds:[${JSON.stringify(humanFile.id)}]}})`,
	);
	snapshot = await humanSnapshot();
	check(
		'renewed-native-chooser-accepts-current-human-file-grant',
		JSON.stringify(snapshot).includes('fixture-upload.txt'),
	);
	const selectionPoint = await run(
		`(()=>{const box=document.querySelector('.huhu-browser-viewer canvas').getBoundingClientRect(),f=latestFrame,k=Math.min(box.width/f.cssWidth,box.height/f.cssHeight);return{x:box.x+(box.width-f.cssWidth*k)/2+100*k,y:box.y+(box.height-f.cssHeight*k)/2+52*k}})()`,
	);
	for (const type of ['mousePressed', 'mouseReleased'])
		await host.connection.send('Input.dispatchMouseEvent', {
			type,
			...selectionPoint,
			button: 'left',
			clickCount: 2,
		});
	await delay(120);
	const selected = await run(`api.readSelection(${JSON.stringify(scope)})`);
	check(
		'explicit-selection-reader-has-real-dom-selection',
		selected.text.length > 0 && !selected.text.includes('fixture_identity'),
	);
	await click(button('复制网页选中文字'), 'explicit selection copy');
	await until(
		`require('@electron/remote').clipboard.readText()===${JSON.stringify(selected.text)}`,
		'explicit clipboard copy',
	);
	check('clipboard-changes-only-after-explicit-copy', true);
	await run(
		`api.navigate({...${JSON.stringify(scope)},url:${JSON.stringify(url + '/auth')}}).then(()=>({ok:true}),error=>({code:error.code??error.message}))`,
	);
	await until(
		`api.getState().requests.some(r=>r.spaceId===taskA.id&&r.kind==='http-auth'&&r.status==='denied')`,
		'actual HTTP auth denial',
	);
	check('http-auth-denial-is-visible-without-native-credential-prompt', true);
	await run('frameWatch.dispose();true');
	await run('api.stopSpace(taskA.id)');
	await run('api.startSpace(taskA.id)');
	const reopened = await run('api.getState().spaces.find(s=>s.id===taskA.id)');
	check(
		'stop-reopen-keeps-page-id-and-replaces-runtime',
		reopened.runtimeId !== a.runtimeId && reopened.pages[0].id === a.pageId && reopened.control.mode === 'paused',
	);
	await run(`${p}.workbench.open({feature:'browser',resourceId:taskB.id,focusId:taskB.pages[0].id})`);
	await until(
		`document.querySelector('.huhu-browser-viewer')?.getAttribute('data-page-id')===taskB.pages[0].id`,
		'existing workbench focuses exact Page',
	);
	check('independent-opener-honors-explicit-page-target', true);
	// Move the actual Obsidian leaf to a different Window; viewer identity must be renewed with its ownerDocument.
	await click(button('接管'), 'take over before popout');
	await until(`api.getState().spaces.find(s=>s.id===taskB.id).control.mode==='human'`, 'main-window lease');
	const previousWindowLease = await run(`api.getState().spaces.find(s=>s.id===taskB.id).control.lease`);
	const oldTargets = new Set(
		(await (await fetch(process.env.HUHU_CDP_URL + '/json')).json()).map((target) => target.id),
	);
	await run(
		`window.browserLeaf=app.workspace.getLeavesOfType('huhu-workbench-view').find(leaf=>leaf.view.containerEl.querySelector('.huhu-browser-workspace'));app.workspace.moveLeafToPopout(browserLeaf,{width:1280,height:900});true`,
	);
	await until(`browserLeaf.view.containerEl.win!==window`, 'real browser popout Window');
	const popupTarget = (await (await fetch(process.env.HUHU_CDP_URL + '/json')).json()).find(
		(target) => target.type === 'page' && !oldTargets.has(target.id),
	);
	assert.ok(popupTarget, 'Real Obsidian popout target');
	popout = await connect(popupTarget.url, popupTarget.id);
	await until(`!!document.querySelector('.huhu-browser-viewer canvas')`, 'popout viewer', 30000, popout);
	await until(`api.getState().spaces.find(s=>s.id===taskB.id).control.mode==='paused'`, 'old Window lease released');
	check('popout-adoption-releases-old-window-authority', true);
	await click(button('接管'), 'popout takeover', popout);
	await until(`api.getState().spaces.find(s=>s.id===taskB.id).control.mode==='human'`, 'popout human lease');
	const popupLease = await run(`api.getState().spaces.find(s=>s.id===taskB.id).control.lease`);
	check(
		'popout-gets-its-own-viewer-and-window-lease',
		popupLease.viewerId !== previousWindowLease.viewerId && popupLease.windowId !== previousWindowLease.windowId,
	);
	await until(
		`(()=>{const canvas=document.querySelector('.huhu-browser-viewer canvas');return canvas?.getContext('2d').getImageData(0,0,1,1).data[3]===255})()`,
		'decoded popout canvas frame',
		30000,
		popout,
	);
	const popupScreenshot = await popout.send('Page.captureScreenshot', { format: 'png' });
	await fs.writeFile(path.join(host.evidence, 'browser-popout-zh.png'), Buffer.from(popupScreenshot.data, 'base64'));
	await run(`browserLeaf.detach();true`);
	await until(
		`api.getState().spaces.find(s=>s.id===taskB.id).control.mode==='paused'`,
		'closing view releases human control',
	);
	check(
		'closing-popout-pauses-human-control-but-keeps-space-page',
		await run(
			`(()=>{const s=api.getState().spaces.find(s=>s.id===taskB.id);return s.status==='ready'&&s.pages.some(page=>page.id===taskB.pages[0].id)})()`,
		),
	);
	await run(`${p}.setModuleEnabled('browser',false)`);
	check('module-off-removes-browser-service', await run(`!${p}.services.peek({owner:'browser',id:'workspace'})`));
	let stillOwned = [];
	for (let attempt = 0; attempt < 40; attempt++) {
		stillOwned = [];
		for (const process of nativeProcesses) {
			const line = await fs.readFile(`/proc/${process.pid}/cmdline`).then(
				(bytes) => bytes.toString(),
				() => '',
			);
			if (line.includes(process.profile)) stillOwned.push(process.pid);
		}
		if (!stillOwned.length) break;
		await delay(100);
	}
	check('module-off-terminates-owned-chromium-processes', stillOwned.length === 0, stillOwned);
	check('module-off-leaves-no-guest-webview', await run(`!document.querySelector('webview')`));
	const errors = await run('window.huhuAcceptanceErrors??[]');
	check('no-unhandled-host-errors', errors.length === 0, errors);
	await fs.writeFile(path.join(host.evidence, 'result.json'), JSON.stringify({ build, results }, null, 2));
} catch (error) {
	if (host) {
		await host.shot('failure').catch(() => {});
		const detail = await run(
			`(async()=>({body:document.body.innerText,state:window.api?.getState(),promptClick:window.promptClick?await promptClick:null,errors:window.huhuAcceptanceErrors}))()`,
		).catch(() => undefined);
		await fs.writeFile(
			path.join(host.evidence, 'partial.json'),
			JSON.stringify({ build, results, error: String(error), detail }, null, 2),
		);
	}
	throw error;
} finally {
	clearInterval(heartbeat);
	popout?.close();
	if (host) {
		console.log(
			JSON.stringify({
				evidence: host.evidence,
				checks: results.length,
				passed: results.filter((row) => row.passed).length,
				main: mainHash,
			}),
		);
		await host.stop();
	}
	server.closeAllConnections();
	server.close();
}
