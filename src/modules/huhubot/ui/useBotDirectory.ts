import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { useOwnerWindow } from '../../../ui/react/hooks';
import type { BotClient } from '../api';
import { WorkbenchClient } from '../services/workbench/workbench-client';
export type BotClientSource = BotClient | (() => BotClient | undefined);

/** A restored connection must load its own directory before an old editor can become actionable again. */
export function useBotDirectory(source: BotClientSource, shared?: WorkbenchClient) {
	const win = useOwnerWindow();
	const getClient = useMemo(
		() => () => {
			const client = typeof source === 'function' ? source() : source;
			return client?.state === 'closed' ? undefined : client;
		},
		[source],
	);
	const [workspace] = useState(
		() =>
			shared ??
			new WorkbenchClient(
				{ client: getClient },
				{
					after: (ms, action) => {
						const timer = win.setTimeout(action, ms);
						return () => win.clearTimeout(timer);
					},
				},
			),
	);
	const view = useStore(workspace.store),
		client = getClient();
	const [readyClient, setReadyClient] = useState<BotClient>();
	const [connection, setConnection] = useState({ client, version: 0 });
	if (connection.client !== client) setConnection({ client, version: connection.version + 1 });
	const refresh = useCallback(async () => {
		const current = getClient();
		if (!current) return;
		await workspace.refreshDirectory();
		const latest = workspace.getSnapshot();
		if (getClient() === current && !latest.loading && !latest.error) setReadyClient(current);
	}, [getClient, workspace]);
	useEffect(() => {
		if (!client) return;
		let observing = false,
			active = true;
		const inspect = () => {
			const latest = workspace.getSnapshot();
			if (active && observing && getClient() === client && latest.loaded && !latest.loading && !latest.error)
				setReadyClient((previous) => (previous === client ? previous : client));
		};
		const off = workspace.subscribe(inspect);
		const pending = workspace.refreshDirectory();
		observing = true;
		void pending.then(inspect).catch(() => undefined);
		return () => {
			active = false;
			off();
		};
	}, [client, getClient, workspace]);
	useEffect(
		() => () => {
			if (!shared) workspace.dispose();
		},
		[shared, workspace],
	);
	return {
		workspace,
		view,
		client,
		getClient,
		refresh,
		ready: !!client && readyClient === client,
		connectionKey: connection.version,
	};
}
