
import { categoriesFor } from '../../core/expense/model';
import { t } from '../../../../shared/i18n/index';

const PRESET_KEYS = new Set<string>([...categoriesFor('expense'), ...categoriesFor('income')]);

/** Display label for a category key: preset keys localize through i18n;
 *  custom names and dirty keys show as-is. */
export function categoryLabel(key: string): string {
	return PRESET_KEYS.has(key) ? t(`expense.cat.${key}`) : key;
}
