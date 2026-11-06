/** Current shared date/month picker and countdown civil-time save regressions. */
import { runHomeReactChecks } from './run-home-react-checks';
runHomeReactChecks([
	'ui/widgets/countdown-editor.dom.test.tsx',
	'ui/widgets/local-date-time.dom.test.tsx',
	'../../ui/components/huhu/date/Calendar.dom.test.tsx',
	'../../ui/components/huhu/date/MonthField.dom.test.tsx',
]);
