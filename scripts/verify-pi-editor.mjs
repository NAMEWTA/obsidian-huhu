#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

// Real official CLI + original Host/helper/app boundary. Models are deterministic loopback SSE only.
const args = process.argv.slice(2);
const option = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : undefined; };
const output = option('--output'), artifact = option('--artifact'), binary = option('--helper');
if (!output || !artifact || !binary) throw Error('Usage: node scripts/verify-pi-editor.mjs --output <new-tmp-directory> --artifact <official-package> --helper <immutable-huhu-pty>');
const root = path.resolve(output), repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const utc = () => new Date().toISOString();
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const json = (file, value) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
const append = (file, value) => fs.appendFileSync(path.join(root, file), JSON.stringify({ utc: utc(), ...value }) + '\n', { mode: 0o600 });
if (!args.includes('--isolated')) {
 await fsp.mkdir(root, { mode: 0o700 });
 for (const directory of ['home', 'tmp', 'xdg-config', 'xdg-cache', 'xdg-data', 'agent', 'cwd', 'sessions', 'build'])
  await fsp.mkdir(path.join(root, directory), { mode: 0o700 });
 const env = { PATH: path.dirname(process.execPath) + ':/usr/bin:/bin', HOME: path.join(root, 'home'), TMPDIR: path.join(root, 'tmp'),
  XDG_CONFIG_HOME: path.join(root, 'xdg-config'), XDG_CACHE_HOME: path.join(root, 'xdg-cache'), XDG_DATA_HOME: path.join(root, 'xdg-data'),
  LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', TZ: 'UTC', SHELL: '/bin/sh', PI_OFFLINE: '1', PI_SKIP_VERSION_CHECK: '1', JITI_FS_CACHE: 'false', NODE_DISABLE_COMPILE_CACHE: '1' };
 const argv = [fileURLToPath(import.meta.url), ...args, '--isolated'];
 json('driver-launch.json', { utc: utc(), file: process.execPath, argv, cwd: repo, env, note: 'Isolated driver; helper captures this whitelist. No loader injection or PTY wrapper.' });
 const log = fs.openSync(path.join(root, 'driver.raw.log'), 'wx', 0o600);
 const child = spawn(process.execPath, argv, { cwd: repo, env, stdio: ['ignore', log, log] });
 fs.closeSync(log); json('driver-process.json',{utc:utc(),pid:child.pid});
 const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
 process.stdout.write(fs.readFileSync(path.join(root, 'driver.raw.log')));
 process.exitCode = typeof code === 'number' ? code : 1;
} else {
 const { build, version: esbuildVersion } = await import('esbuild');
 const source = [
  `export {PI_EXTENSION,piEditorArgumentGate} from ${JSON.stringify(path.join(repo,'src/modules/agent/platform/desktop/hooks/native-extensions.ts'))};`,
  `export {HookSpool} from ${JSON.stringify(path.join(repo,'src/modules/agent/platform/desktop/hooks/hook-spool.ts'))};`,
  `export {NativeHost} from ${JSON.stringify(path.join(repo,'src/host/desktop/native/host.ts'))};`,
  `export {PtyHelper} from ${JSON.stringify(path.join(repo,'src/host/desktop/native/helper.ts'))};`,
  `export {verifyPiArtifact} from ${JSON.stringify(path.join(repo,'src/modules/agent/platform/desktop/agents/program-identity.ts'))};`,
 ].join('\n');
 const entryFile = path.join(root,'build/entry.mjs');await fsp.writeFile(entryFile,source,{mode:0o600});
 const inputs = new Map();await fsp.mkdir(path.join(root,'build/objects'),{mode:0o700});
 const built = await build({entryPoints:[entryFile],outfile:path.join(root,'build/production.mjs'),metafile:true,
  bundle:true,platform:'node',format:'esm',legalComments:'inline',logLevel:'silent',plugins:[{name:'freeze-actual-fixture-inputs',setup(build){
   build.onLoad({filter:/\.(ts|tsx|mjs|js|json)$/},async input=>{
    const bytes=await fsp.readFile(input.path),sha256=digest(bytes),snapshot=path.join(root,'build/objects',sha256+'.raw');
    if(!fs.existsSync(snapshot))await fsp.writeFile(snapshot,bytes,{mode:0o600,flag:'wx'});
    inputs.set(input.path,{path:input.path,bytes:bytes.byteLength,sha256,snapshot});
    return {contents:bytes,loader:input.path.endsWith('.json')?'json':input.path.endsWith('.tsx')?'tsx':input.path.endsWith('.ts')?'ts':'js',resolveDir:path.dirname(input.path)};
   });
  }}]});
 json('build/metafile.json',built.metafile);
 json('build/input-manifest.json',{utc:utc(),inputs:[...inputs.values()],bundle:{path:path.join(root,'build/production.mjs'),sha256:digest(fs.readFileSync(path.join(root,'build/production.mjs')))},
  tools:{node:{path:process.execPath,sha256:digest(fs.readFileSync(process.execPath))},esbuild:{version:esbuildVersion,path:fileURLToPath(import.meta.resolve('esbuild')),sha256:digest(fs.readFileSync(fileURLToPath(import.meta.resolve('esbuild'))))},helper:{path:path.resolve(binary),sha256:digest(fs.readFileSync(binary))}}});
 const api = await import(pathToFileURL(path.join(root,'build/production.mjs')).href);
 const hooks = [], editorEvents = [], requests = [], failures = [], checks = {}, hookListeners = new Set(), cleanups = new Set();
 let host, lease, helper, hookScope, server, releaseFirst;
 const firstReleased = new Promise(resolve => { releaseFirst = resolve; });
 const started = utc();
 const until = async (predicate, label, ms = 10000) => {
  const end = performance.now() + ms;
  while (!predicate()) { if (performance.now() >= end) throw Error('Expected ' + label); await new Promise(resolve => setTimeout(resolve, 10)); }
 };
 const answer1 = '第一份原生回答：开头\n首轮结束。', answer2 = '第二份原生回答：已消费 steer 中文多行。';
 const first='你好，正常输入\n第二行保留中文',second='正在工作时的新输入\n仍走原生 steer';
 const verifyResults=async()=>{
  assert.equal(requests.length,2);assert.deepEqual(requests[1].body.messages.filter(message=>message.role==='user').map(message=>message.content.map(block=>block.text).join('\n')),[first,second]);
  assert.equal(hooks.filter(event=>event.event==='UserPromptSubmit').length,1);
  assert.equal(hooks.find(event=>event.event==='Stop').data.last_assistant_message,answer2);
  const transcript=hooks.find(event=>event.event==='SessionStart').data.transcript_path;
  const nativeRows=(await fsp.readFile(transcript,'utf8')).trim().split('\n').map(line=>JSON.parse(line));
  assert.deepEqual(nativeRows.filter(row=>row.type==='message'&&row.message.role==='assistant').map(row=>row.message.content.filter(block=>block.type==='text').map(block=>block.text).join('\n')),[answer1,answer2]);
  checks.actualModelConversation=true;checks.nativeFullAnswer=true;
 };
 try {
  let count = 0;
  server = http.createServer(async (req, res) => {
   try {
    const chunks = []; let bytes = 0;
    for await (const chunk of req) { bytes += chunk.length; if (bytes > 262144) throw Error('request-capacity'); chunks.push(Buffer.from(chunk)); }
    const raw = Buffer.concat(chunks, bytes), body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)), n = ++count;
    const captured = { n, method: req.method, url: req.url, body, firstReleased: checks.firstReleased === true };
    requests.push(captured); append('requests.jsonl', {...captured,headers:req.headers});
    assert.equal(req.method, 'POST'); assert.equal(req.url, '/v1/chat/completions'); assert.equal(body.stream, true); assert.ok(n <= 2);
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }); res.flushHeaders();
    const send = (delta, finish = null, usage) => {
     const wire = 'data: ' + JSON.stringify({ id: 'huhu-pi-fixture-' + n, object: 'chat.completion.chunk', created: 1792990000,
      model: 'huhu-controlled', choices: [{ index: 0, delta, finish_reason: finish }], ...(usage ? { usage } : {}) }) + '\n\n';
     append('responses.jsonl', { n, wire }); res.write(wire);
    };
    send({ role: 'assistant' });
    if (n === 1) { send({ content: '第一份原生回答：开头\n' }); checks.firstStreamOpen = utc(); await firstReleased; send({ content: '首轮结束。' }); }
    else send({ content: answer2 });
    send({}, 'stop', { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 }); append('responses.jsonl', { n, wire: 'data: [DONE]\n\n' }); res.end('data: [DONE]\n\n');
   } catch (error) { failures.push(String(error)); append('service-errors.jsonl', { message: String(error) }); if (!res.headersSent) res.writeHead(500); res.end(); }
  });
  await new Promise((resolve,reject) => { server.once('error',reject);server.listen(0,'127.0.0.1',resolve); });
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const agentDir = path.join(root,'agent'), extension = path.join(agentDir,'extensions/huhu-status.ts');
  await fsp.mkdir(path.dirname(extension), { mode: 0o700 });
  const baseline = option('--baseline-extension');
  const extensionText = baseline ? fs.readFileSync(path.resolve(baseline),'utf8') : api.PI_EXTENSION;
  await fsp.writeFile(extension, extensionText, { mode: 0o600 });
  if(option('--scenario')==='keybinding-overlap')await fsp.writeFile(path.join(agentDir,'keybindings.json'),JSON.stringify({'app.clipboard.pasteImage':['enter']}),{mode:0o600});
  await fsp.writeFile(path.join(agentDir,'settings.json'),JSON.stringify({quietStartup:true, compaction:{enabled:false}, retry:{enabled:false}}),{mode:0o600});
  await fsp.writeFile(path.join(agentDir,'models.json'),JSON.stringify({providers:{'huhu-loopback':{baseUrl:'http://127.0.0.1:'+address.port+'/v1',api:'openai-completions',apiKey:'huhu-fixture-only',models:[{id:'huhu-controlled',reasoning:false,input:['text'],contextWindow:32768,maxTokens:512,cost:{input:0,output:0,cacheRead:0,cacheWrite:0}}]}}}),{mode:0o600});
  const spoolRoot = path.join(root,'hook-spool'); await fsp.mkdir(spoolRoot,{mode:0o700});
  const pool = await api.HookSpool.open(fsp,path,spoolRoot,fs);
  hookScope = await pool.prepare(event => { if(hooks.length>=64)throw Error('fixture-hook-capacity');hooks.push(event); append('hooks.jsonl',{event});for(const listener of hookListeners)listener(event); }, reason => { failures.push(reason); append('hook-errors.jsonl',{reason}); });
  const env = {...hookScope.env, PI_CODING_AGENT_DIR:agentDir, PI_OFFLINE:'1', PI_SKIP_VERSION_CHECK:'1', JITI_FS_CACHE:'false', NODE_DISABLE_COMPILE_CACHE:'1', TERM:'xterm-256color',COLORTERM:'truecolor'};
  if(['clipboard','external'].includes(option('--scenario'))){
   const name=option('--scenario'),tool=path.join(root,'agent',name==='clipboard'?'termux-clipboard-get':'controlled-editor');
   const toolSource='#!'+process.execPath+'\n'+`const fs=require('node:fs');fs.writeFileSync(${JSON.stringify(path.join(root,'tool-started'))},'');const timer=setInterval(()=>{if(fs.existsSync(${JSON.stringify(path.join(root,'tool-release'))})){clearInterval(timer);fs.writeFileSync(${JSON.stringify(path.join(root,'tool-finished'))},'');${name==='clipboard'?"process.stdout.write('fixture clipboard text');":''}}},5);`;
   await fsp.writeFile(tool,toolSource,{mode:0o700});json('controlled-public-tool.json',{name,path:tool,sha256:digest(toolSource)});
   if(name==='clipboard'){env.TERMUX_VERSION='huhu-fixture';env.PATH=path.dirname(tool)+':'+process.env.PATH;assert.equal(process.env.DISPLAY,undefined);assert.equal(process.env.WAYLAND_DISPLAY,undefined);}
   else{env.EDITOR=tool;env.VISUAL=tool;}
  }
  const entry = path.join(path.resolve(artifact),'dist/bundle/cli.js');
  const cliArgs = [entry,'--offline','-ne','-e',extension,'-ns','-np','--no-themes','-nc','-nt','--provider','huhu-loopback','--model','huhu-controlled','--thinking','off','--session-dir',path.join(root,'sessions'),'--tui-mode','regular'];
  const business=option('--business-module');
  if(business){
   if(!path.isAbsolute(business)||!business.endsWith('.mjs'))throw Error('Business fixture must be an explicit local absolute .mjs');
   const info=await fsp.lstat(business);if(!info.isFile()||info.isSymbolicLink()||info.size>1048576)throw Error('Invalid bounded local business fixture');
   const modulePath=await fsp.realpath(business),bytes=await fsp.readFile(modulePath);json('business-fixture.json',{path:modulePath,sha256:digest(bytes),bytes:bytes.length});
   const fixture=await import(pathToFileURL(modulePath).href);if(typeof fixture.run!=='function')throw Error('Business fixture must export run(context)');
   const cliBinary=option('--cli')?await fsp.realpath(option('--cli')):undefined;
   if(cliBinary)json('business-cli.json',{path:cliBinary,sha256:digest(fs.readFileSync(cliBinary))});
   const context=Object.freeze({root,repo,artifact:path.resolve(artifact),helperBinary:path.resolve(binary),cliBinary,api,
    launchHint:Object.freeze({file:process.execPath,args:Object.freeze([...cliArgs]),cwd:path.join(root,'cwd'),env:Object.freeze({...env})}),
    messages:Object.freeze({normal:first,streaming:second}),
    onHook(listener){if(hookListeners.size>=1)throw Error('One business hook consumer only');hookListeners.add(listener);return()=>hookListeners.delete(listener);},
    waitForFirstStream:()=>until(()=>checks.firstStreamOpen,'first real streaming response'),
    releaseFirst(){if(!checks.firstReleased){checks.firstReleased=true;checks.firstReleaseAt=utc();releaseFirst();}},
    registerCleanup(cleanup){if(cleanups.size>=8)throw Error('Fixture cleanup capacity');cleanups.add(cleanup);return()=>cleanups.delete(cleanup);},
   });
   await fixture.run(context);await until(()=>hooks.some(event=>event.event==='Stop'),'business native final answer');await verifyResults();
   await until(()=>hooks.some(event=>event.event==='AdapterClose'),'business native adapter close');assert.equal(failures.length,0);checks.businessPath=true;checks.passed=true;
  }else{
  host = new api.NativeHost(async events => (helper = await api.PtyHelper.start(path.resolve(binary), events, globalThis, {})));
  lease = await host.acquire('pty', { editor: message => { editorEvents.push(message); append('editor-events.jsonl',{message}); },
   output: (sid,data) => { fs.appendFileSync(path.join(root,'pty.raw.log'),data,{mode:0o600}); lease.value.acknowledge(sid,data.byteLength); },
   exit: (sid,code,signal) => { checks.rootExit = { sid,code,signal,utc:utc() }; append('native-exit.jsonl',{sid,code,signal}); },
   closed: reason => append('native-closed.jsonl',{reason}),
  });
  json('helper-process.json',{utc:utc(),pid:helper.pid});
  assert.equal(lease.value.editorTransactions,1,'Native must actually negotiate editor transactions');
  const sid = lease.allocateSessionId();
  const snapshot = lease.value.spawnEnvironment(env);
  assert.equal(snapshot.values.LD_PRELOAD,undefined);assert.equal(snapshot.values.NODE_OPTIONS,undefined);
  assert.equal(api.piEditorArgumentGate(cliArgs.slice(1),extension,path.join(root,'cwd'),path),true);
  const verification = await api.verifyPiArtifact({file:process.execPath,args:cliArgs,env:snapshot.values,cwd:path.join(root,'cwd'),deadline:performance.now()+15000});
  assert.equal(verification.status,'supported',JSON.stringify(verification));
  const enrollment = {identity:{runtimeId:'pi-editor-fixture'},provider:'pi',recipe:verification.recipe};
  json('launch.json',{utc:utc(),sid,file:process.execPath,args:cliArgs,cwd:path.join(root,'cwd'),env:snapshot.values,environmentCompleteness:snapshot.completeness,enrollment,helper:{path:path.resolve(binary),sha256:digest(fs.readFileSync(binary))},extension:{path:extension,bytes:Buffer.byteLength(extensionText),sha256:digest(extensionText),baseline:baseline??null}});
  const pid = await lease.value.spawnSession(sid,{file:process.execPath,args:cliArgs,env,cwd:path.join(root,'cwd'),cols:100,rows:32,editor:enrollment});
  checks.rootPid=pid;
  if (pid && process.platform==='linux') json('root-process.json',{utc:utc(),pid,exe:await fsp.realpath('/proc/'+pid+'/exe'),stat:await fsp.readFile('/proc/'+pid+'/stat','utf8'),cmdline:(await fsp.readFile('/proc/'+pid+'/cmdline')).toString('utf8'),note:'Direct Node PTY root, not strace. Pi may set process.title=pi.'});
  const binding = lease.value.editorBinding(sid);assert.ok(binding);
  let readyTimer;
  const registration = await Promise.race([binding.ready,new Promise((_,reject)=>{readyTimer=setTimeout(()=>reject(Error('Official editor authentication not observed within 5 seconds')),5000);})]).finally(()=>clearTimeout(readyTimer));json('registration.json',registration);
  await until(()=>hooks.some(event=>event.event==='AdapterStart'),'native source registration');
  assert.equal(registration.sourceInstance,hooks.find(event=>event.event==='AdapterStart').source.instance);
  const submit = async (label,text,expected='adapter-applied') => {
   const op=binding.submit(text,{sourceInstance:registration.sourceInstance,remainingMs:10000});
   const queued=await op.queued,finished=await op.finished;await op.settled;
   append('submissions.jsonl',{label,text,op:op.op,queued,finished,stats:helper.streamStats});assert.equal(finished.state,expected);return finished;
  };
  const rawConsumed=async(text)=>{
   assert.equal((await lease.value.submitInput(sid,text).finished).state,'written');
   const tty=await fsp.readlink('/proc/'+pid+'/fd/0');
   const queue=()=>new Promise((resolve,reject)=>{let stdout='',stderr='';const probe=spawn('/usr/bin/python3',['-c',
    'import os,fcntl,termios,array,sys;fd=os.open(sys.argv[1],os.O_RDONLY|os.O_NOCTTY|os.O_NONBLOCK);n=array.array("i",[0]);fcntl.ioctl(fd,termios.FIONREAD,n,True);os.close(fd);print(n[0])',tty],{stdio:['ignore','pipe','pipe']});
    const timer=setTimeout(()=>{probe.kill();reject(Error('TTY queue probe exceeded 1 second'));},1000);
    probe.stdout.on('data',data=>{stdout+=data;});probe.stderr.on('data',data=>{stderr+=data;});probe.once('error',reject);probe.once('exit',code=>{clearTimeout(timer);if(code!==0)reject(Error(stderr));else resolve(Number(stdout.trim()));});});
   const deadline=performance.now()+2000;let unread;
   do{unread=await queue();append('tty-input-queue.jsonl',{tty,unread,note:'Read-only FIONREAD; no bytes read or terminal settings changed.'});if(unread===0)break;if(performance.now()>=deadline)throw Error('Official CLI did not consume delivered partial paste');}while(true);
  };
  const noInput=async(label,text,reason)=>{const before=requests.length,agents=hooks.filter(event=>event.event==='UserPromptSubmit').length;
   const result=await submit(label,text,'none');if(reason)assert.equal(result.reason,reason);assert.equal(requests.length,before);assert.equal(hooks.filter(event=>event.event==='UserPromptSubmit').length,agents);return result;};
  if(['partial-paste','split-marker'].includes(option('--scenario'))){
   assert.equal(process.platform,'linux');const human='human-paste-buffer';if(option('--scenario')==='split-marker'){await rawConsumed('\x1b[20');await noInput('partial-marker-prefix','must-not-submit-with-partial-marker','not-ready');await rawConsumed('0~'+human);}else await rawConsumed('\x1b[200~'+human);
   await noInput('partial-paste-refusal','must-not-submit-during-partial-paste','not-ready');checks.partialPasteRefused=true;
   await rawConsumed('\x1b[201~'+'\x7f'.repeat(human.length));
  }
  if(option('--scenario')==='split-utf8'){
   await rawConsumed(new Uint8Array([0xe4]));await rawConsumed(new Uint8Array([0xb8,0xad]));
   await noInput('completed-split-utf8-draft','must-not-erase-completed-human-character','draft-present');await rawConsumed('\x7f');checks.completedSplitUtf8Refused=true;
  }
  if(option('--scenario')==='receipt-pressure'){
   await noInput('maximum-invalid-body',' '.repeat(262144),'invalid');await noInput('oversized-local-body',' '.repeat(262145),'capacity');
   for(let n=0;n<64;n++){await noInput('serial-receipt-'+n,' ','invalid');assert.equal(helper.streamStats.editorOperations,0);assert.equal(helper.streamStats.operationBytes,0);}
   checks.serialReceiptsAndBodyBound=true;
  }
  if(option('--scenario')==='gates'){
   await noInput('blank-invalid','   ','invalid');await noInput('trailing-backslash-invalid','no-submit\\','invalid');await noInput('control-invalid','no\x1bsubmit','invalid');
   await rawConsumed(' ');await noInput('whitespace-draft','must-not-replace-human-draft','draft-present');await rawConsumed('\x7f');
   for(const command of ['/login','/settings']){
    const offset=fs.statSync(path.join(root,'pty.raw.log')).size;await rawConsumed(command+'\r');
    await until(()=>fs.statSync(path.join(root,'pty.raw.log')).size>offset,'official selector render');
    const result=await noInput(command+'-selector','must-not-submit-to-selector');assert.ok(['focus-changed','blocked','not-ready'].includes(result.reason));
    append('selector-screen.jsonl',{command,output:fs.readFileSync(path.join(root,'pty.raw.log')).subarray(offset).toString('utf8'),result});
    await rawConsumed('\x1b');
   }
   checks.realGateRefusals=true;
  }
  if(option('--scenario')==='keybinding-overlap'){await noInput('overlapping-enter-binding','must-not-invoke-clipboard','unsupported');checks.enterOverlapRefused=true;}else{
  await submit('normal',first);await until(()=>checks.firstStreamOpen,'first real streaming response');
  assert.equal(requests.length,1);checks.secondSubmitAt=utc();await submit('streaming-steer',second);assert.equal(requests.length,1);
  checks.firstReleased=true;checks.firstReleaseAt=utc();releaseFirst();
  await until(()=>hooks.some(event=>event.event==='Stop'),'complete native final answer');
  await verifyResults();checks.normalAndStreamingThroughAuthenticatedEditor=true;
  }
  if(option('--scenario')==='reload'){
   await rawConsumed('/reload\r');let timer;
   await Promise.race([binding.closed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('reload did not revoke old authenticated app')),3000);})]).finally(()=>clearTimeout(timer));
   assert.equal(binding.active,false);await noInput('reload-old-binding','must-not-submit-with-old-source','closed');checks.reloadRevokedWithoutReauth=true;
  }
  if(['jump','history','tab'].includes(option('--scenario'))){
   const key={jump:'\x1d',history:'\x1b[A',tab:'\t'}[option('--scenario')];await rawConsumed(key);await noInput('known-'+option('--scenario')+'-state','must-not-submit-after-unproven-editor-state','not-ready');await rawConsumed('\x03');checks.knownEditorStateRefused=option('--scenario');
  }
  if(['clipboard','external'].includes(option('--scenario'))){
   const name=option('--scenario');await rawConsumed(name==='clipboard'?'\x16':'\x07');await until(()=>fs.existsSync(path.join(root,'tool-started')),'controlled '+name+' tool started');
   const blocked=await noInput('pending-'+name,'must-not-submit-with-asynchronous-human-input');assert.ok(['not-ready','foreground-changed'].includes(blocked.reason));
   await fsp.writeFile(path.join(root,'tool-release'),'');await until(()=>fs.existsSync(path.join(root,'tool-finished')),'controlled tool released');
   await rawConsumed('\x03');await noInput('latched-'+name,'must-not-guess-asynchronous-state-cleared','not-ready');checks.knownEditorStateRefused=name;
  }
  const quit=lease.value.submitInput(sid,option('--scenario')==='keybinding-overlap'||checks.knownEditorStateRefused?'\x04':'/quit\r');await quit.finished;await until(()=>checks.rootExit,'normal official /quit');assert.equal(checks.rootExit.code,0);
  assert.equal((await binding.submit('must-not-submit-after-numeric-exit',{sourceInstance:registration.sourceInstance,remainingMs:1000}).finished).reason,'closed');checks.staleHandleRevoked=true;
  await until(()=>hooks.some(event=>event.event==='AdapterClose'),'native adapter close');
  await lease.release();lease=undefined;await host.dispose();host=undefined;
  assert.equal(failures.length,0);checks.passed=true;
  }
 } catch(error) { failures.push(error.stack??String(error)); }
 finally {
  releaseFirst?.();
  if(['clipboard','external'].includes(option('--scenario')))await fsp.writeFile(path.join(root,'tool-release'),'');
  for(const cleanup of [...cleanups].reverse()){try{await cleanup();}catch(error){failures.push('business cleanup: '+String(error));}}
  hookListeners.clear();
  if (lease) { try { await lease.release(); } catch(error) { failures.push('cleanup lease: '+String(error)); } }
  if (host) { try { await host.dispose(); } catch(error) { failures.push('cleanup host: '+String(error)); } }
  if (hookScope) { try { await hookScope.close(); } catch(error) { failures.push('cleanup hooks: '+String(error)); } }
  if (server) { server.closeAllConnections();await new Promise(resolve=>server.close(resolve)); }
  json('summary.json',{started,finished:utc(),checks,failures,scope:'Official full CLI main + production Host/helper/authenticated editor against controlled loopback SSE. No real Provider/Obsidian/five-platform claim.'});
  console.log(JSON.stringify({root,checks,failures},null,2));
  if(failures.length)process.exitCode=1;
 }
}
