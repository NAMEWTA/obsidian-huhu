import { t } from '../../../shared/i18n';
export const ct = (key: string, params?: Record<string, string | number>): string => t('contacts.' + key, params);
