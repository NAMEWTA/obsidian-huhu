import { expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { managedRunnerEnvironment, DesktopHapTransport } from './managed';

it('passes only the managed platform environment and refuses PATH execution', async () => {
	expect(
		managedRunnerEnvironment({
			HOME: '/home/test',
			XDG_STATE_HOME: '/state',
			OPENAI_API_KEY: 'secret',
			ANTHROPIC_API_KEY: 'secret',
			AWS_PROFILE: 'secret',
			PATH: '/unsafe',
			NODE_OPTIONS: '--inspect',
			LANG: 'zh_TW.UTF-8',
			DBUS_SESSION_BUS_ADDRESS: 'unix:path=/run/user/1000/bus',
			XDG_RUNTIME_DIR: '/run/user/1000',
			DBUS_STARTER_BUS_TYPE: 'unsafe',
		}),
	).toEqual({ HOME: '/home/test', XDG_STATE_HOME: '/state', LANG: 'zh_TW.UTF-8',
		DBUS_SESSION_BUS_ADDRESS: 'unix:path=/run/user/1000/bus', XDG_RUNTIME_DIR: '/run/user/1000' });
	await expect(
		DesktopHapTransport.launch({ binary: 'huhubot', profileDir: '/tmp/test', cwd: '/tmp' }),
	).rejects.toThrow('ABSOLUTE_PATH_REQUIRED');
});

it('refuses credential pipes on ordinary connections before spawning', async () => {
	await expect(DesktopHapTransport.launch({ binary: '/does-not-exist', profileDir: '/tmp/test', cwd: '/tmp',
		managed: false, credentialChannel: true })).rejects.toThrow('CREDENTIAL_MANAGED_OWNER_REQUIRED');
});

// The executable shebang fixture targets Linux; other OS process semantics need target-OS evidence.
it.skipIf(process.platform !== 'linux')('retains a real child beyond the former four-second kill deadline until cleanup is released', async () => {
 const root = await mkdtemp(join(tmpdir(), 'huhu-managed-close-'));
 const profileDir = join(root, 'profile'), binary = join(root, 'controlled-child');
 let transport: DesktopHapTransport | undefined;
 let exited = false;
 try {
  await mkdir(profileDir, { mode: 0o700 });
  await writeFile(binary, `#!${process.execPath}
const {writeFileSync,existsSync}=require('node:fs');
const dir=process.argv[process.argv.indexOf('--profile')+1];
process.stdin.resume();
process.stdin.on('end',()=>writeFileSync(dir+'/eof','1'));
process.on('SIGTERM',()=>writeFileSync(dir+'/term','1'));
setInterval(()=>{if(existsSync(dir+'/release'))process.exit(0)},20);
writeFileSync(dir+'/ready','1');
`, { mode: 0o700 });
  transport = await DesktopHapTransport.launch({ binary, profileDir, cwd: root, environment: { HOME: root } });
  await expect.poll(async () => readFile(join(profileDir, 'ready'), 'utf8')).toBe('1');
  void transport.exited.then(() => { exited = true; });
  transport.close(); transport.close();
  await expect.poll(async () => readFile(join(profileDir, 'eof'), 'utf8')).toBe('1');
  await new Promise(resolve => setTimeout(resolve, 4200));
  expect(exited).toBe(false);
  await expect(readFile(join(profileDir, 'term'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  await writeFile(join(profileDir, 'release'), '1');
  await expect(transport.exit).resolves.toEqual({ code: 0, signal: null, forced: false });
 } finally {
  if (!exited) transport?.forceTerminate();
  await transport?.exited;
  await rm(root, { recursive: true, force: true });
 }
}, 10_000);

it.skipIf(process.platform !== 'linux')('records explicit force as recovery rather than successful persistence', async () => {
 const root = await mkdtemp(join(tmpdir(), 'huhu-managed-force-')), binary = join(root, 'child');
 let transport: DesktopHapTransport | undefined;
 try {
  await writeFile(binary, `#!${process.execPath}\nprocess.stdin.resume();setInterval(()=>{},1000);`, { mode: 0o700 });
  transport = await DesktopHapTransport.launch({ binary, profileDir: root, cwd: root });
  transport.forceTerminate();
  await expect(transport.exit).resolves.toMatchObject({ forced: true, signal: 'SIGKILL' });
 } finally { transport?.forceTerminate(); await transport?.exited; await rm(root, { recursive: true, force: true }); }
});
