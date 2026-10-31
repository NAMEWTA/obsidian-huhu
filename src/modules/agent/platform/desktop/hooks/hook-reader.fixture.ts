import { createRequire } from 'node:module';
import { hookSpool } from './hook-spool';

const win = { require: createRequire(import.meta.url) } as unknown as Window;
const pool = await hookSpool(win, process.argv[2]!);
const scope = await pool.prepare(() => {}, () => {});
process.on('message', () => {
	void scope.close().then(() => process.disconnect(), error => {
		process.stderr.write(String(error));
		process.exitCode = 1;
		process.disconnect();
	});
});
process.send!(scope.env);
