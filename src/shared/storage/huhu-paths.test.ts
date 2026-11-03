import { expect, test } from 'vitest';
import { huhuPath, validateHuhuPath } from './huhu-paths';

test('all HUHU locations resolve under the vault-relative root and retain Unicode names', () => {
	expect(huhuPath('dashboards', '档案/团队+甲.md')).toBe('.huhu/dashboards/档案/团队+甲.md');
	expect(validateHuhuPath('.huhu\\cache\\device\\profile')).toBe('.huhu/cache/device/profile');
	expect(huhuPath()).toBe('.huhu');
});
test.each(['../outside', '/tmp/outside', 'C:/outside', 'C:outside', '\\\\server\\share', 'config/../../outside', 'config/CON.json', 'config/a:stream', 'config/a.', 'config/a ', 'config/./a', 'config//a', 'config/\0a'])('rejects escaping or aliased location %j', path => {
	expect(() => huhuPath(path)).toThrow('invalid-path');
});
