/** Thin composition of DayPicker v10 public API (MIT).
 * https://daypicker.dev/guides/custom-components
 * Product layouts and date-picker skins supply their own presentation; the library owns dates and keyboard focus.
 */
import { DayPicker, type DayPickerProps } from '@daypicker/react';
import { enUS } from '@daypicker/react/locale/en-US';
import { zhCN } from '@daypicker/react/locale/zh-CN';
import { useLanguage } from '../../../react/hooks';

export function CalendarBackend(props: DayPickerProps) {
	const language = useLanguage();
	return (
		<DayPicker
			locale={language === 'zh' ? zhCN : enUS}
			lang={language === 'zh' ? 'zh-CN' : 'en-US'}
			timeZone="UTC"
			{...props}
		/>
	);
}
export {
	Day,
	DayButton,
	Month,
	MonthGrid,
	Week,
	WeekNumber,
	useDayPicker,
	type DayPickerProps,
	type DayProps,
	type DayButtonProps,
	type MonthProps,
	type MonthGridProps,
	type WeekProps,
	type WeekNumberProps,
} from '@daypicker/react';
