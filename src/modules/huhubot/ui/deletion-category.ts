import { t } from '../../../shared/i18n';

/** Wire category identifiers stay stable; user-facing names follow the current language. */
export function deletionCategoryLabel(kind: string): string {
	switch (kind) {
		case 'profile':
			return t('huhubot.data.categoryProfile');
		case 'session-body':
			return t('huhubot.data.categorySession');
		case 'session-cleanup':
			return t('huhubot.data.categoryCleanup');
		case 'unknown-effects':
			return t('huhubot.data.categoryUnknownEffects');
		default:
			return kind.startsWith('memory:')
				? t('huhubot.data.categoryMemory', { id: kind.slice(7) })
				: t('huhubot.data.categoryOther', { kind });
	}
}
