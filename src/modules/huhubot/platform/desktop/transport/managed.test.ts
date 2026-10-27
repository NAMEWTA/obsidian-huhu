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

// The executable shebang fixture targets Linux; real Windows/macOS termination remains a target-OS check.
it.skipIf(process.platform !== 'linux')('waits for a real child close and terminates a producer that ignores EOF and TERM', async () => {
	const root = await mkdtemp(join(tmpdir(), 'huhu-managed-close-'));
	const profileDir = join(root, 'profile'), binary = join(root, 'controlled-child');
	let transport: DesktopHapTransport | undefined;
	try {
		await mkdir(profileDir, { mode: 0o700 });
		await writeFile(binary, `#!${process.execPath}
const {writeFileSync}=require('node:fs');
const dir=process.argv[process.argv.indexOf('--profile')+1];
process.stdin.resume();
process.stdin.on('end',()=>writeFileSync(dir+'/eof','1'));
process.on('SIGTERM',()=>writeFileSync(dir+'/term','1'));
setInterval(()=>{},1000);
setTimeout(()=>{writeFileSync(dir+'/failsafe','1');process.exit(99)},5000);
writeFileSync(dir+'/ready','1');
`, { mode: 0o700 });
		transport = await DesktopHapTransport.launch({ binary, profileDir, cwd: root, environment: { HOME: root }, shutdownGraceMs: 20 });
		await expect.poll(async () => readFile(join(profileDir, 'ready'), 'utf8')).toBe('1');
		let exited = false; void transport.exited.then(() => { exited = true; });
		expect(transport.close()).toBeUndefined(); expect(exited).toBe(false);
		await transport.exited;
		expect(await readFile(join(profileDir, 'eof'), 'utf8')).toBe('1');
		expect(await readFile(join(profileDir, 'term'), 'utf8')).toBe('1');
		await expect(readFile(join(profileDir, 'failsafe'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
		expect(transport.diagnostics).toEqual({ stderrBytes: 0, stderr: '' });
	} finally { transport?.close(); await transport?.exited; await rm(root, { recursive: true, force: true }); }
}, 10_000);
