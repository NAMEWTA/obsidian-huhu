import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../../../ui/components/button';
import { DesignScope } from '../../../../ui/react/design-scope';
import { VisibilityContext, useVisible } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import type { DiarySearch, DiarySearchEntry } from '../../services/diary-search';
import type { DiaryWriting } from '../../services/diary-writing';
import { DiaryReader } from './DiaryReader';
import { SearchWritePanel } from './SearchWritePanel';
import type { DiaryPagePort } from './types';

export function DiaryWorkspace({ port, initialDate, onDateChange, registerNavigation, search, writing }: { port: DiaryPagePort; search: DiarySearch; writing: DiaryWriting; initialDate?: string; onDateChange?: (date: string) => void; registerNavigation?: (handler: (date: string, signal?: AbortSignal) => Promise<boolean>) => () => void }) {
	const t = useT(), visible = useVisible();
	const today = new Date();
	const [date, setDate] = useState(initialDate ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
	const [tools, setTools] = useState(false), [bookKey, setBookKey] = useState(0);
	const [loaded, setLoaded] = useState<DiarySearchEntry[]>([]);
	const guard = useRef<(() => Promise<boolean>) | undefined>(undefined);
	const registerGuard = useCallback((next: () => Promise<boolean>) => { guard.current = next; return () => { if (guard.current === next) guard.current = undefined; }; }, []);
	const changed = useCallback((next: string) => { setDate(next); onDateChange?.(next); }, [onDateChange]);
	useEffect(() => registerNavigation?.(async (next, signal) => {
		if (signal?.aborted) return false;
		if (guard.current && !await guard.current()) return false;
		if (signal?.aborted) return false;
		changed(next); setBookKey(value => value + 1); setTools(false); return true;
	}), [registerNavigation, changed]);

	return <>
		<div hidden={tools} inert={tools || undefined}><VisibilityContext.Provider value={visible && !tools}><DiaryReader key={bookKey} port={port} initialDate={date} onDateChange={changed} onLoaded={setLoaded} actions={<Button className="min-h-[var(--hu-hit)] min-w-[var(--hu-hit)]" variant="secondary" onClick={() => { search.loaded('', loaded); setTools(true); }}>{t('navigator.diary.tools.open')}</Button>} /></VisibilityContext.Provider></div>
		{tools && <DesignScope className="h-full min-w-0 overflow-auto bg-[var(--hu-canvas)] text-[var(--hu-fg)]"><SearchWritePanel search={search} writing={writing} port={port} date={date} loaded={loaded} registerGuard={registerGuard} onBack={() => { setBookKey(value => value + 1); setTools(false); }} onSaved={changed} onSelect={next => { changed(next); setBookKey(value => value + 1); setTools(false); }} /></DesignScope>}
	</>;
}
