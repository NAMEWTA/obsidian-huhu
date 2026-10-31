// User-run whole-product acceptance for a NEW disposable Vault/Profile.
// `--check` is safe in CI and only verifies the acceptance entry is wired; a
// live run requires HUHU_OBSIDIAN_EXECUTABLE and never touches an existing root.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchFreshVault } from './fresh-vault.mjs';

const sourceRoot = process.env.HUHU_PLUGIN_SOURCE || process.cwd();
const required = [
	'src/modules/huhubot/module.ts',
	'src/modules/huhubot/ui/workbench-page.ts',
	'src/modules/huhubot/ui/data/workbench-page.ts',
	'native/huhubot/cmd/huhubot/main.go',
];

async function checkBundle() {
	const contents = await Promise.all(required.map(async file => [file, await fs.readFile(path.join(sourceRoot, file), 'utf8')]));
	for (const [file, text] of contents) assert.ok(text.includes('huhubot') || text.includes('Huhubot') || text.includes('NewOwnerWithPortable'), `missing HUHU Bot seam in ${file}`);
	const moduleText = contents.find(([file]) => file.endsWith('/module.ts'))?.[1] || '';
	for (const page of ['chat', 'agents', 'groups', 'memory', 'tasks', 'access', 'approvals', 'data']) assert.ok(moduleText.includes(`${page}:`), `missing ${page} page factory`);
	return { mode: 'bundle-check', required, liveRun: false };
}

async function sha256(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}

if (process.argv[2] === '--check') {
	console.log(JSON.stringify(await checkBundle(), null, 2));
} else {
	const root = process.argv[2];
	assert.ok(root && path.isAbsolute(root), 'Pass an absolute NEW fixture root, or --check');
	const binaryPath = process.env.HUHU_BOT_BINARY;
	assert.ok(binaryPath && path.isAbsolute(binaryPath), 'HUHU_BOT_BINARY must point to a locally built Runner');
	await fs.access(binaryPath);
	const isolatedEnvironment={XDG_STATE_HOME:path.join(root,'state'),LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roaming')};
	const previousEnvironment=Object.fromEntries(Object.keys(isolatedEnvironment).map(key=>[key,process.env[key]]));
	Object.assign(process.env,isolatedEnvironment);
	try {
	const runtime = await launchFreshVault({
		root,
		port: 9300,
		files: {
			'Bot acceptance.md': '# Bot acceptance\n\nDisposable fixture only.\n',
			'Notes/Source.md': 'source sentinel\n',
		},
		// Vault settings contain only the versioned non-device language preference. Runner override is entered through the real settings form below.
		settings: { version:1,namespaces:{app:{language:'en',introSeen:true}} },
	});
	const c = runtime.connection;
	const results = [], errors = [];
	let artifacts;
	const waitFor = async (predicate, label, timeout = 20000) => {
		const deadline = Date.now() + timeout;
		while (Date.now() < deadline) {
			if (await predicate()) return;
			await delay(100);
		}
		throw Error(`Timed out waiting for ${label}`);
	};
	const evaluate = expression => c.evaluate(expression);
	const visiblePage = `[...document.querySelectorAll('.huhu-workbench-page')].find(e => !e.hidden && e.getClientRects().length)`;
	const onPage = expression => evaluate(`(() => {const page = ${visiblePage};return !!page && (${expression});})()`);
	const observePage = () => evaluate(`(() => {
		const page=${visiblePage},rect=page.getBoundingClientRect();
		const contentOverflow=[...page.querySelectorAll('div,section,footer,main,article,fieldset,[data-slot="bot-draft-status"],[data-slot="empty-state"] *')].filter(element=>element.getClientRects().length&&element.clientWidth>0&&element.scrollWidth-element.clientWidth>2&&!element.classList.contains('truncate')).map(element=>({tag:element.tagName,slot:element.getAttribute('data-slot'),className:element.className,overflow:element.scrollWidth-element.clientWidth}));
		const checkboxes=[...page.querySelectorAll('[role="checkbox"]')].map(element=>{const box=element.getBoundingClientRect(),style=getComputedStyle(element);return {checked:element.getAttribute('aria-checked'),width:box.width,height:box.height,border:parseFloat(style.borderTopWidth),indicator:!!element.querySelector('[data-slot="checkbox-indicator"] svg')};});
		const radios=[...page.querySelectorAll('[role="radio"]')].map(element=>{const box=element.getBoundingClientRect(),style=getComputedStyle(element);return {checked:element.getAttribute('aria-checked'),width:box.width,height:box.height,background:style.backgroundColor};});
		return {text:page.innerText.slice(0,1000),width:rect.width,height:rect.height,overflow:page.scrollWidth-page.clientWidth,contentOverflow,checkboxes,radios,alerts:[...page.querySelectorAll('[role="alert"]')].map(e=>e.innerText),untranslatedKeys:/huhubot\\.[a-z]/.test(page.innerText)};
	})()`);
	const assertRendered = (observed,page,width) => {
		assert.ok(observed.width>0&&observed.height>0,`${page} was not rendered`);
		assert.ok(observed.overflow<=2,`${page} horizontal overflow at ${width}: ${observed.overflow}`);
		assert.deepEqual(observed.contentOverflow,[],`${page} inner content clipping at ${width}`);
		assert.equal(observed.untranslatedKeys,false,`Unregistered dictionary in ${page}`);
		assert.deepEqual(observed.alerts,[],`Unexpected error view in ${page}`);
		for(const checkbox of observed.checkboxes){assert.ok(checkbox.width>=12&&checkbox.height>=12&&checkbox.border>=1,`${page} checkbox is not painted`);if(checkbox.checked==='true')assert.ok(checkbox.indicator,`${page} checked indicator is missing`);}
		for(const radio of observed.radios){assert.ok(radio.width>=20&&radio.height>=20,`${page} history choice is not visible`);if(radio.checked==='true')assert.ok(radio.background!=='rgba(0, 0, 0, 0)'&&radio.background!=='transparent',`${page} selected history choice is not painted`);}
	};
	const botClient = `app.plugins.plugins.huhu.services.peek({owner:'huhubot',id:'runtime'})?.client`;
	const open = async (section, feature = 'huhubot') => {
		await evaluate(`app.plugins.plugins.huhu.workbench.open(${JSON.stringify({ feature, section })},window,{}).then(()=>true)`);
	};
	const setInput = async (selector, value) => {
		await evaluate(`(() => {const page=${visiblePage};const input=page?.querySelector(${JSON.stringify(selector)});if(!input)throw Error('Missing input: '+${JSON.stringify(selector)});input.focus();input.select();return true;})()`);
		await c.send('Input.insertText', { text: value });
		await delay(40);
	};
	const click = async (selector, text) => {
		await evaluate(`(() => {const page=${visiblePage};const candidates=[...page?.querySelectorAll(${JSON.stringify(selector)})??[]];const button=candidates.find(e=>${text === undefined ? 'true' : `e.textContent.trim()===${JSON.stringify(text)}`});if(!button||button.disabled)throw Error('Missing or disabled action '+${JSON.stringify(text ?? selector)});button.click();return true;})()`);
	};
	c.on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails));
	await c.send('Runtime.enable');
	try {
		const installed=path.join(runtime.vault,'.obsidian','plugins','huhu');
		artifacts={mainSha256:await sha256(path.join(installed,'main.js')),stylesSha256:await sha256(path.join(installed,'styles.css')),runnerSha256:await sha256(binaryPath)};
		await c.send('Emulation.setDeviceMetricsOverride', { width:1440,height:1000,deviceScaleFactor:1,mobile:false });
		await evaluate(`app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();true`);
		const initial = await evaluate(`({moduleState:app.plugins.plugins.huhu.moduleState('huhubot'),hasWorkbench:!!app.plugins.plugins.huhu.workbench})`);
		assert.equal(initial.hasWorkbench, true);
		// Opening settings must work before there is a configured/started Bot process.
		await open('huhubot', 'settings');
		await waitFor(() => onPage(`page.innerText.includes('Managed Runner')`), 'Bot setup settings');
		const setup = await evaluate(`({moduleState:app.plugins.plugins.huhu.moduleState('huhubot'),clientStarted:!!(${botClient})})`);
		assert.equal(setup.moduleState, 'active');
		assert.equal(setup.clientStarted, false, 'Opening setup must not start the Runner');
		await runtime.shot('bot-settings-before-start');
		results.push({ kind: 'setup-before-start', initial, setup });
		await setInput('input[aria-label="Runner binary"]',binaryPath);
		await waitFor(()=>onPage(`page.querySelector('input[aria-label="Runner binary"]')?.value===${JSON.stringify(binaryPath)}`),'Saved device-scoped Runner path');

		await open('agents');
		await waitFor(() => onPage(`!!page.querySelector('.huhu-bot-agent-editor input[aria-label="Name"]')`), 'Agent editor');
		await waitFor(() => evaluate(`(${botClient})?.state==='ready'`), 'Real Runner handshake and Host attachment');
		const names = ['Acceptance Bot A', 'Acceptance Bot B'];
		for (const name of names) {
			await click('aside button', 'Create persistent Bot');
			await waitFor(() => onPage(`page.querySelector('.huhu-bot-agent-editor input[aria-label="Name"]')?.value===''`), 'fresh Bot draft');
			for (const [label, value] of Object.entries({ Name: name, Description: 'Disposable acceptance fixture', Persona: 'Use explicitly authorized sources.', Provider: 'acceptance-fixture', Model: 'acceptance-model', Endpoint: 'https://acceptance.invalid/v1' })) {
				await setInput(`.huhu-bot-agent-editor [aria-label="${label}"]`, value);
			}
			await click('.huhu-bot-agent-editor button', 'Save Bot');
			await waitFor(() => evaluate(`(async()=>{const client=${botClient};return (await client.agents.list({profileId:client.hello.profile.profileId})).items.some(agent=>agent.name===${JSON.stringify(name)});})()`), `durably saved ${name}`);
			await waitFor(()=>onPage(`page.querySelector('.huhu-bot-agent-editor input[aria-label="Name"]')?.value===${JSON.stringify(name)}&&[...page.querySelectorAll('.huhu-bot-agent-editor button')].some(button=>button.textContent.trim()==='Save Bot'&&!button.disabled)`),'settled saved Bot editor');
		}
		results.push({kind:'bot-creation',names, realProvider:false});

		await open('chat');
		await waitFor(() => onPage(`!!page.querySelector('button[aria-label="Acceptance Bot A"]')`), 'Roster loaded from SQLite');
		await click('button[aria-label="Acceptance Bot A"]');
		await waitFor(() => onPage(`!!page.querySelector('textarea')`), 'Direct conversation');
		await setInput('textarea', 'Draft for Bot A');
		await click('button[aria-label="Acceptance Bot B"]');
		await waitFor(() => onPage(`page.querySelector('main')?.getAttribute('aria-label')==='Acceptance Bot B'`), 'Bot B conversation');
		await setInput('textarea', 'Draft for Bot B');
		await click('button[aria-label="Acceptance Bot A"]');
		await waitFor(() => onPage(`page.querySelector('textarea')?.value==='Draft for Bot A'`), 'Bot A draft restored');
		results.push({kind:'conversation-draft-isolation',passed:true});
		await click('button','Attach note or selection');
		await waitFor(()=>evaluate(`!!document.querySelector('.prompt input')`),'Native source picker');
		await evaluate(`(()=>{const input=document.querySelector('.prompt input');input.focus();input.select();return true;})()`);
		await c.send('Input.insertText',{text:'Notes/Source.md'});
		await waitFor(()=>evaluate(`!![...document.querySelectorAll('.suggestion-item')].find(e=>e.textContent.includes('Notes/Source.md'))`),'Source note suggestion');
		await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
		await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
		await waitFor(()=>onPage(`!!page.querySelector('button[aria-label="Remove attached source"]')&&page.querySelector('footer')?.innerText.includes('Source')`),'Selected source attachment chip');
		results.push({kind:'native-source-picker',path:'Notes/Source.md',sentToModel:false});

		await open('groups');
		await waitFor(() => onPage(`!!page.querySelector('input[aria-label="Group name"]')`), 'Group editor');
		await setInput('input[aria-label="Group name"]', 'Acceptance research group');
		for (const name of names) await click(`[role="checkbox"][aria-label="${name}"]`);
		await click('button', 'Save group');
		await waitFor(() => evaluate(`(async()=>{const client=${botClient};return (await client.sessions.list({profileId:client.hello.profile.profileId})).items.some(session=>session.kind==='group'&&session.title==='Acceptance research group'&&session.memberIds.length===2);})()`), 'durably saved group');
		results.push({kind:'group-creation',memberCount:2});
		await open('chat');
		const menuTrigger=await evaluate(`(() => {const page=${visiblePage};const button=[...page.querySelectorAll('button')].find(e=>e.textContent.trim()==='Manage');const rect=button?.getBoundingClientRect();if(!rect||!rect.width)throw Error('Bot management menu is not visible');return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};})()`);
		await c.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...menuTrigger});
		await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...menuTrigger});
		await waitFor(()=>evaluate(`!![...document.querySelectorAll('[role="menuitem"]')].find(e=>e.textContent.trim()==='Memory')`),'Bot management menu');
		await evaluate(`(()=>{[...document.querySelectorAll('[role="menuitem"]')].find(e=>e.textContent.trim()==='Memory').click();return true;})()`);
		await waitFor(()=>onPage(`!!page.querySelector('select')&&page.innerText.includes('Memory scope')`),'Memory through the management menu');
		await click('button','Bot chat');
		await waitFor(()=>onPage(`!!page.querySelector('textarea')`),'Return to chat');
		results.push({kind:'user-navigation-menu-and-return',passed:true});
		await evaluate(`(()=>{window.huhuProbePreviousClient=${botClient};huhuProbePreviousClient.close();return true;})()`);
		await waitFor(()=>evaluate(`!(${botClient})||(${botClient})?.state==='closed'`),'closed owned fixture connection');
		await open('huhubot','settings');
		await waitFor(()=>onPage(`!![...page.querySelectorAll('button')].find(button=>button.textContent.trim()==='Connect Runner'&&!button.disabled)`),'Runner reconnect settings action');
		await click('button','Connect Runner');
		await waitFor(()=>evaluate(`(${botClient})?.state==='ready'&&(${botClient})!==huhuProbePreviousClient`),'new real Runner connection');
		for(const section of ['agents','groups']){
			await open(section);
			await waitFor(()=>onPage(section==='agents'?`!!page.querySelector('.huhu-bot-agent-editor input[aria-label="Name"]')`:`!!page.querySelector('input[aria-label="Group name"]')`),`${section} editor after reconnect`);
		}
		results.push({kind:'real-runner-disconnect-and-ui-reconnect',passed:true});
		await open('memory');
		await waitFor(()=>onPage(`!!page.querySelector('header select')&&!page.querySelector('[role="alert"]')&&page.innerText.includes('Propose global memory')`),'Global memory catalog from real Runner');
		const privateAgent=await evaluate(`(async()=>{const client=${botClient};return (await client.agents.list({profileId:client.hello.profile.profileId})).items.find(agent=>agent.name==='Acceptance Bot A').id;})()`);
		await evaluate(`(()=>{const page=${visiblePage};const select=page.querySelector('header select');select.value=${JSON.stringify('agent:')}+${JSON.stringify(privateAgent)};select.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
		await waitFor(()=>onPage(`!!page.querySelector('select[id$="-context-scope"]')&&!page.querySelector('[role="alert"]')`),'Private memory catalog from real Runner');
		await evaluate(`(()=>{const page=${visiblePage};const select=page.querySelector('select[id$="-context-scope"]');const option=[...select.options].find(option=>option.textContent==='Acceptance Bot A');if(!option)throw Error('Missing authorized context conversation');select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
		await waitFor(()=>onPage(`!!page.querySelector('select[id$="-context-scope"]')?.value&&!page.querySelector('[role="alert"]')`),'Scoped context catalog from real Runner');
		results.push({kind:'private-memory-and-scoped-context-read',passed:true,realProvider:false});

		const labels = { chat: 'Bot chat', agents: 'Edit Bot', groups: 'Edit group', memory: 'Memory', tasks: 'Tasks', access: 'Access', approvals: 'Approvals', data: 'Bot data' };
		for (const theme of ['theme-light', 'theme-dark']) for (const width of [1440, 800, 390]) {
			await c.send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
			await evaluate(`document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(${JSON.stringify(theme)});true`);
			for (const [page, label] of Object.entries(labels)) {
				await open(page);
				await waitFor(() => onPage(`page.innerText.includes(${JSON.stringify(label)})`), `${page} page navigation`);
				await evaluate(`(()=>{const page=${visiblePage};page.scrollTop=0;for(const element of page.querySelectorAll('*'))if(element.scrollTop)element.scrollTop=0;return true;})()`);
				await delay(100);
				const observed = await observePage();
				assertRendered(observed,page,width);
				const screenshot = `bot-${page}-${width}-${theme}`;
				await runtime.shot(screenshot);
				results.push({kind:'rendered-page',page,theme,viewportWidth:width,screenshot:`${screenshot}.png`,...observed});
			}
			await open('huhubot','settings');
			await waitFor(()=>onPage(`!!page.querySelector('[role="checkbox"]')&&page.innerText.includes('Managed Runner')`),'Connected Bot settings and budget checkbox');
			await evaluate(`(()=>{const page=${visiblePage};page.scrollTop=0;for(const element of page.querySelectorAll('*'))if(element.scrollTop)element.scrollTop=0;return true;})()`);
			await delay(100);
			const observed=await observePage();
			assertRendered(observed,'settings',width);
			const screenshot=`bot-settings-${width}-${theme}`;
			await runtime.shot(screenshot);
			results.push({kind:'rendered-settings',page:'settings',theme,viewportWidth:width,screenshot:`${screenshot}.png`,...observed});
			await evaluate(`(()=>{const page=${visiblePage};page.querySelector('[role="checkbox"]').scrollIntoView({block:'center'});return true;})()`);
			await delay(100);
			const budgetObserved=await observePage();
			assertRendered(budgetObserved,'settings-budget',width);
			const budgetScreenshot=`bot-settings-budget-${width}-${theme}`;
			await runtime.shot(budgetScreenshot);
			results.push({kind:'rendered-settings-budget',page:'settings-budget',theme,viewportWidth:width,screenshot:`${budgetScreenshot}.png`,...budgetObserved});
		}
		const hookErrors = await evaluate('window.huhuAcceptanceErrors??[]');
		assert.deepEqual([...errors, ...hookErrors], [], 'Obsidian produced unexpected runtime/console errors');
		await fs.writeFile(path.join(runtime.evidence, 'huhu-bot-integration.json'), JSON.stringify({ mode:'real-obsidian-and-runner',passed:true,artifacts,results,errors,hookErrors,realProvider:false,unverified:['Real provider model execution and streaming','OS file picker import/export interactions','User-owned notes write approval and unknown-effect recovery','Real mobile platform'],note:'No real credentials or provider calls. Native Runner and SQLite are real; screenshots cover desktop narrow containers, not mobile support.' },null,2));
		console.log(JSON.stringify({mode:'host-probe',passed:true,evidence:runtime.evidence,renderedScenarios:results.filter(r=>r.kind==='rendered-page').length,realProvider:false},null,2));
	} catch (error) {
		const failure = await evaluate(`({body:document.body.innerText,errors:window.huhuAcceptanceErrors??[]})`).catch(()=>({}));
		await fs.writeFile(path.join(runtime.evidence,'huhu-bot-failure.json'),JSON.stringify({message:String(error),artifacts,results,errors,...failure},null,2));
		await runtime.shot('bot-failure').catch(()=>undefined);
		throw error;
	} finally {
		await runtime.stop();
	}
	} finally {
		for(const [key,value] of Object.entries(previousEnvironment)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
	}
}
