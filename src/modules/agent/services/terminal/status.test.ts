import { expect, test } from 'vitest';
import { TerminalSession } from './session';
import { sessionState } from './status';

test('T06 native loss/stop wins over old activity; Agent exit zero is not turn completion', async () => {
	const s = new TerminalSession({
		id: 'status',
		sid: 1,
		kind: 'agent',
		agentId: 'pi',
		title: 'Pi',
		cwd: '/fixture',
		cols: 20,
		rows: 4,
		scrollback: 100,
		platform: process.platform,
		colors: () => ({ foreground: '#fff', background: '#000', cursor: '#fff' }),
	});
	try {
		s.attach({ input() {}, resize() {}, acknowledge() {}, end() {} }, 42);
		const source = s
			.bindActivityRuntime()
			.bindSource({
				provider: 'pi',
				kind: 'native-hook',
				adapterRevision: '1',
				lifetime: { kind: 'registration', sourceInstance: 'p' },
			})!;
		source.observe({ deliveryId: '1', sourceSequence: 1, event: 'agent_start', state: 'working' });
		expect(sessionState(s)).toBe('working');
		s.closeInput();
		expect(sessionState(s)).toBe('unknown');
		s.exit(0, null);
		await s.whenParsed();
		expect(sessionState(s)).not.toBe('done');
		expect(s.getActivitySnapshot().completion).toBeUndefined();
	} finally {
		s.dispose();
	}
});
