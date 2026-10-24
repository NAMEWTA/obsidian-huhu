import { useSyncExternalStore } from 'react';
import { getLanguage, onLanguageChanged, t } from '../../shared/i18n';
import { useOwnerDocument } from './contexts';

export function useLanguage() {
	return useSyncExternalStore(onLanguageChanged, getLanguage, getLanguage);
}
export function useT(): typeof t {
	useLanguage();
	return t;
}
export function useOwnerWindow(): Window {
	const win = useOwnerDocument().defaultView;
	if (!win) throw new Error('HUHU owner window is closed');
	return win;
}
