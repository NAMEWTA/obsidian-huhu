// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/view.ts
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'obsidian';
import { useStore } from 'zustand';
import type { NativeSurfaceContext } from '../../../ui/native-surface';
import { useVisible } from '../../../ui/react/contexts';
import { useT } from '../../../ui/react/hooks';
import type { GridBreakpoint } from '../core/board/grid';
import type { BoardStore } from '../services/board-store';
import { ThemeBridge } from './theme/ThemeBridge';
import { BoardCanvas } from './canvas/BoardCanvas';
import { ReadingMini } from './widgets/ReadingMini';
import { PomodoroMini } from './widgets/PomodoroMini';
import { BoardDnd } from './board/dnd';
/** The board page: one grid of widgets. Below 600px the same grid is a single column (the canvas reports its breakpoint). */
export function DashboardPage({ store, context }: { store: BoardStore; context: NativeSurfaceContext }) {
	const data = useStore(store.state, (s) => s.data),
		generation = useStore(store.state, (s) => s.generation),
		visible = useVisible(),
		[narrow, setNarrow] = useState(false),
		t = useT();
	const follow = useCallback((breakpoint: GridBreakpoint) => setNarrow(breakpoint === 'sm'), []);
	useEffect(() => {
		store.setVisible(visible);
		if (!visible) store.setDialog(null);
	}, [visible, store]);
	const mobile = Platform.isPhone || narrow;
	return (
		<div className="h-full min-h-0" aria-label={t('workbench.home')}>
			{data ? (
				// One generation per board shown: switching replaces the whole tree and hands it a store view of that generation.
				<ThemeBridge key={generation} store={store.view(generation)} layout={mobile ? 'mobile' : 'canvas'}>
					<BoardDnd store={store.view(generation)}>
						<BoardCanvas store={store} context={context} onBreakpoint={follow} />
					</BoardDnd>
					<PomodoroMini store={store.view(generation)} />
					<ReadingMini store={store.view(generation)} />
				</ThemeBridge>
			) : (
				<div role="status">{t('home.dashboard.loading')}</div>
			)}
		</div>
	);
}
