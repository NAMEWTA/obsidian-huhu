import { useT } from '../../../../ui/react/hooks';
import { Field, SearchChoice } from '../parts';
import type { AutomationViewHost } from '../panel-contract';

/** The folder of the vault a terminal action runs in. */
export function WorkingDirectory({
	cwd,
	host,
	onChange,
}: {
	cwd: string;
	host: AutomationViewHost;
	onChange: (cwd: string) => void;
}) {
	const t = useT();
	return (
		<Field label={t('automation.cwd')}>
			{(id) => (
				<SearchChoice
					id={id}
					label={t('automation.cwd')}
					value={cwd}
					options={host
						.paths()
						.filter((item) => item.kind === 'folder')
						.map((item) => ({
							value: item.path === '/' ? (host.cwd ?? '') : `${host.cwd}/${item.path}`,
							label: item.path,
						}))}
					onChange={onChange}
				/>
			)}
		</Field>
	);
}
