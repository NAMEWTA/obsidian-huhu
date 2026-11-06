/** Independent production-component review. No Obsidian process or production build is started. */
import fs from 'node:fs/promises';
import { boundedStartup, FixtureStartupTimeout } from './bounded-startup.mjs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { sonnerStyles, createSonnerStyles } from '../sonner-styles.mjs';
import { radixOwnerDocument, createRadixOwnerDocument } from '../radix-owner-document.mjs';
import { createDiffsOwnerDocument, diffsTransforms } from '../diffs-owner-document.mjs';
import { createDiffsLanguages } from '../diffs-languages.mjs';
import { versioningWorkerSource } from '../versioning-worker.mjs';
import { connect } from '../obsidian-acceptance/cdp.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i++) {
	const key = args[i];
	if (key === '--check') { options.check = true; continue; }
	if (!['--suite', '--ticket', '--matrix', '--out'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--') || options[key]) throw Error(`Invalid argument: ${key}`);
	options[key] = args[++i];
}
const ticket = options['--ticket'];
const suite = options['--suite'] ?? 'legacy';
const redesign = suite === 'frontend-redesign';
const agentFixture = redesign && ticket === 'T-09';
if (!['legacy', 'frontend-redesign'].includes(suite) || !/^T-\d+$/.test(ticket ?? '') || options['--matrix'] !== (redesign ? 'redesign' : 'standard') || !options['--out']) throw Error('Usage: node scripts/ui-review/run.mjs --ticket T-23 --matrix standard --out <directory> [--check]');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function waitFor(check, label) {
	const deadline = Date.now() + 10000;
	while (Date.now() < deadline) { if (await check()) return; await delay(25); }
	throw Error(`Timed out: ${label}`);
}
if (redesign && ticket === 'T-14') {
 const { runIntegration } = await import('./fixtures/frontend-redesign/integration/index.mjs');
 await runIntegration({root, output:path.resolve(options['--out']), check:!!options.check});
} else {
const fixtureBase = redesign ? (ticket === 'T-01' ? 'frontend-redesign/shared/theme' : `frontend-redesign/${ticket}/index`) : ticket;
const output = path.resolve(options['--out']);
await fs.mkdir(output, { recursive: true });
const result = { ticket, suite, matrix: options['--matrix'], status: 'unverified', startedAt: new Date().toISOString(), inputs: [], cases: [], errors: [], boundaries: ['Real React/Radix/HUHU components and generated styles.css', 'Host app.css read from ASAR without launching Obsidian', 'Obsidian createDiv DOM extension supplied by fixture; no vault or external service', 'Second document is a same-origin iframe, not an Obsidian popout'] };
/** Desktop-only modules reachable from a page's import graph (never called in the fixture) resolve node: builtins to an empty module. */
const nodeBuiltinStubs = { name: 'node-builtin-stubs', setup(b) { b.onResolve({ filter: /^node:/ }, a => ({ path: a.path, namespace: 'node-stub' })); b.onLoad({ filter: /.*/, namespace: 'node-stub' }, () => ({ contents: 'module.exports = {};', loader: 'js' })); } };
let work, chrome, cdp;

try {
	const fixture = await import(`./fixtures/${fixtureBase}.mjs`);
	result.plannedCases = matrixCases();
	work = await fs.mkdtemp(path.join(os.tmpdir(), 'huhu-ui-review-'));
	const asarPath = process.env.HUHU_OBSIDIAN_ASAR ?? '/opt/Obsidian/resources/obsidian.asar';
	const asar = await fs.readFile(asarPath);
	const header = JSON.parse(asar.subarray(16, 16 + asar.readUInt32LE(12)).toString());
	const entry = header.files['app.css'];
	const offset = 8 + asar.readUInt32LE(4) + Number(entry.offset);
	const hostCSS = asar.subarray(offset, offset + entry.size);
	await fs.writeFile(path.join(work, 'app.css'), hostCSS);
	const compiled = await build({ absWorkingDir: root, entryPoints: [`scripts/ui-review/fixtures/${fixtureBase}.tsx`], outfile: path.join(work, 'fixture.js'), bundle: true, metafile: true, jsx: 'automatic', jsxImportSource: 'react', platform: 'browser', format: 'iife', loader: { '.md': 'text' }, external: agentFixture ? [] : ['electron'], alias: { obsidian: path.join(root, 'scripts/obsidian-stub.ts'), ...(agentFixture ? { electron: path.join(root, 'scripts/ui-review/fixtures/frontend-redesign/T-09/electron-stub.ts') } : {}) }, plugins: [fixture.adapterCounts ? createSonnerStyles(fixture.adapterCounts.sonner) : sonnerStyles, fixture.adapterCounts ? createRadixOwnerDocument(fixture.adapterCounts.radix) : radixOwnerDocument, createDiffsOwnerDocument(fixture.adapterCounts?.diffs ?? Object.fromEntries(Object.keys(diffsTransforms).map(key => [key, 0]))), createDiffsLanguages(), versioningWorkerSource, nodeBuiltinStubs], define: { 'process.env.NODE_ENV': '"production"' } });
	if (agentFixture) result.boundaries.push('Electron APIs are unavailable in the browser-only T-09 fixture; every system call throws');
	const files = [...new Set([...Object.keys(compiled.metafile.inputs).filter(file => !file.includes(':')), 'styles.css', 'scripts/ui-review/run.mjs', 'scripts/ui-review/bounded-startup.mjs', `scripts/ui-review/fixtures/${fixtureBase}.mjs`])].sort();
	for (const file of files) result.inputs.push({ path: file, sha256: createHash('sha256').update(await fs.readFile(path.resolve(root, file))).digest('hex') });
	result.inputs.push({ path: `${asarPath}:app.css`, sha256: createHash('sha256').update(hostCSS).digest('hex') });
	result.inputDigest = createHash('sha256').update(JSON.stringify(result.inputs)).digest('hex');
	if (options.check) { result.status = 'preflight'; }
	else {
		const executable = process.env.HUHU_CHROME_EXECUTABLE ?? 'google-chrome';
		result.browser = execFileSync(executable, ['--version'], { encoding: 'utf8' }).trim();
		const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${pathToFileURL(path.join(work, 'app.css'))}"><link rel="stylesheet" href="${pathToFileURL(path.join(root, 'styles.css'))}"><style>html,body{height:auto;min-height:100%;overflow:visible;contain:none}body{margin:0;padding:16px}main{min-width:0}${fixture.layoutCSS ?? ''}iframe{position:fixed;left:-2000px;width:600px;height:900px;border:0}</style>`;
		await fs.writeFile(path.join(work, 'fixture.html'), `<!doctype html>${head}<iframe srcdoc="${head.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></iframe><script src="fixture.js"></script>`);
		chrome = spawn(executable, ['--headless=new', '--allow-file-access-from-files', '--remote-debugging-port=0', `--user-data-dir=${path.join(work, 'profile')}`, 'about:blank'], { stdio: 'ignore' });
		let spawnError;
		chrome.on('error', error => { spawnError = error; });
		await waitFor(async () => { if (spawnError) throw spawnError; try { const port = (await fs.readFile(path.join(work, 'profile/DevToolsActivePort'), 'utf8')).split('\n')[0]; process.env.HUHU_CDP_URL = `http://127.0.0.1:${port}`; cdp = await connect('about:blank'); return true; } catch { return false; } }, 'Chrome CDP');
		cdp.on('Runtime.exceptionThrown', error => result.errors.push(error));
		await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
		await cdp.send('Page.navigate', { url: pathToFileURL(path.join(work, 'fixture.html')).href });
		if (fixture.startup) {
			await boundedStartup((async () => {
				await waitFor(() => cdp.evaluate('!!globalThis.uiReviewStartup'), 'fixture startup promise');
				await cdp.evaluate(fixture.startup);
			})());
		}
		await waitFor(() => cdp.evaluate(fixture.ready), 'fixture ready');
		await waitFor(() => cdp.evaluate('Object.values(uiReview.docs).every(d=>d.readyState === "complete")'), 'both documents and styles loaded');
		await cdp.evaluate('Promise.all(Object.values(uiReview.docs).map(d=>d.fonts.ready))');
		const capture = async name => {
			if (!/^[a-z0-9-]+$/.test(name)) throw Error('Invalid screenshot name');
			const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
			await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(shot.data, 'base64'));
			return `${name}.png`;
		};
		for (const planned of result.plannedCases) {
			const sample = { ...planned, assertions: [], actions: [] };
			const {width, language, theme, zoom} = sample;
			const name = `${width}-${language}-${theme}-${sample.accent ?? 'default'}-${sample.source ?? 'host'}-${sample.hostMode ?? 'none'}-${sample.density ?? 'default'}-${sample.uiSize ?? 'default'}-${sample.mobile ? 'mobile' : 'desktop'}-${zoom}x.png`;
			sample.id = name.slice(0, -4);
			result.cases.push(sample);
			await cdp.send('Emulation.setDeviceMetricsOverride', { width: sample.cssWidth, height: 1000 / zoom, deviceScaleFactor: zoom, mobile: sample.mobile });
			await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: sample.pointer === 'coarse' });
			await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: sample.reducedMotion ? 'reduce' : 'no-preference' }] });
			sample.actualMedia = await cdp.evaluate(`({pointerFine:matchMedia('(pointer: fine)').matches,pointerCoarse:matchMedia('(pointer: coarse)').matches,pointerNone:matchMedia('(pointer: none)').matches,hover:matchMedia('(hover: hover)').matches,hoverNone:matchMedia('(hover: none)').matches})`);
			await cdp.evaluate(fixture.configure(sample));
			await cdp.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
			if (fixture.settle) await cdp.evaluate(fixture.settle);
			let failure;
			try { await fixture.verify({ cdp, sample, waitFor, capture }); }
			catch (error) { failure = error; sample.failure = String(error); }
			const { cssContentSize } = await cdp.send('Page.getLayoutMetrics');
			sample.contentSize = cssContentSize;
			const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: sample.cssWidth, height: Math.ceil(cssContentSize.height), scale: 1 } });
			await fs.writeFile(path.join(output, name), Buffer.from(shot.data, 'base64')); sample.screenshot = name;
			if (failure) throw failure;
		}
		await fixture.exercise({ cdp, result, waitFor, capture });
		if (result.errors.length) throw Error('Browser runtime errors were recorded');
		result.status = 'passed';
	}
} catch (error) {
	result.errors.push({ message: String(error), stack: error.stack });
	result.status = 'failed'; process.exitCode = 1;
	if (cdp && !(error instanceof FixtureStartupTimeout)) {
		try {
			const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
			await fs.writeFile(path.join(output, 'failure.png'), Buffer.from(shot.data, 'base64'));
			result.failureScreenshot = 'failure.png';
		} catch (captureError) { result.errors.push({ message: `Failure capture: ${captureError}` }); }
	}
} finally {
	// Persist test evidence before cleanup, so a filesystem cleanup failure cannot erase the run.
	await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
	if (chrome && chrome.exitCode === null && chrome.pid) {
		const exited = once(chrome, 'exit');
		const fallback = setTimeout(() => chrome.kill('SIGTERM'), 3000);
		try { if (cdp) await Promise.race([cdp.send('Browser.close'), exited]); else chrome.kill('SIGTERM'); }
		catch { chrome.kill('SIGTERM'); }
		await exited; clearTimeout(fallback);
	}
	cdp?.close();
	try { if (work) await fs.rm(work, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
	catch (error) { result.errors.push({ message: `Cleanup failed: ${error}`, retainedPath: work }); result.status = 'failed'; process.exitCode = 1; }
	result.finishedAt = new Date().toISOString();
	await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
	console.log(`${ticket}: ${result.status}; ${result.cases.length} matrix cases; ${output}/result.json`);
}

}

function matrixCases() {
 const cases = [];
 const add = sample => cases.push({ cssWidth: sample.width / sample.zoom, mobile: false, pointer: 'fine', reducedMotion: false, ...sample });
 if (!redesign) {
  for (const width of [420,600,1440]) for (const language of ['en','zh']) for (const theme of ['light','dark','user-light','user-dark']) for (const zoom of [1,2]) add({width,language,theme,zoom,pointer:zoom===2?'coarse':'fine',reducedMotion:zoom===2});
 } else {
  // Narrow leaves stay desktop leaves. Mobile capability is an independent sample.
  for (const width of [320,390,600,820,960,1100,1440]) for (const language of ['en','zh']) for (const theme of ['paper','ink']) add({width,language,theme,zoom:1,accent:'teal',source:'huhu',density:'compact',uiSize:'14'});
  for (const theme of ['paper','ink']) for (const accent of ['teal','indigo','pine','ochre','plum','graphite']) for (const source of ['huhu','obsidian']) for (const hostMode of source === 'obsidian' ? ['safe','unsafe'] : ['none']) add({width:960,language:'zh',theme,accent,source,hostMode,zoom:1,density:'comfortable',uiSize:'15'});
  add({width:640,language:'zh',theme:'ink',accent:'plum',source:'huhu',zoom:2,density:'compact',uiSize:'13',motion:'reduce',reducedMotion:false});
  add({width:390,language:'zh',theme:'paper',accent:'teal',source:'huhu',zoom:1,density:'compact',uiSize:'14',motion:'system',pointer:'coarse',mobile:true,reducedMotion:true});
 }
 return cases;
}
