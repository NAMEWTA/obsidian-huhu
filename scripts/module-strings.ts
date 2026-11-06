import { messages as nativeStrings } from '../src/shared/i18n/lazy/native';
// Tests and verify scripts render module code without loading module entries; give them every module's
// strings and the dictionaries modules share (in the plugin each module registers them when it loads).
import { messages as uiStrings } from '../src/shared/i18n/lazy/ui';
import { registerMessages } from '../src/shared/i18n/runtime';
import { messages as agent } from '../src/modules/agent/i18n';
import { messages as archives } from '../src/modules/archives/i18n';
import { messages as automations } from '../src/modules/automations/i18n';
import { messages as comments } from '../src/modules/comments/i18n';
import { messages as home } from '../src/modules/home/i18n';
import { messages as health } from '../src/modules/health/i18n';
import { messages as icons } from '../src/modules/icons/i18n';
import { messages as navigator } from '../src/modules/navigator/i18n';
import { messages as notifications } from '../src/modules/notifications/i18n';
import { messages as sync } from '../src/modules/versioning/i18n';
import { messages as safe } from '../src/modules/safe/i18n';
import { messages as taskMessages } from '../src/modules/task/i18n';
import { messages as automationStrings } from '../src/shared/i18n/lazy/automation';
import { messages as commonStrings } from '../src/shared/i18n/lazy/common';
import { messages as calendarStrings } from '../src/shared/i18n/lazy/calendar';
import { messages as appearanceStrings } from '../src/shared/i18n/lazy/appearance';

for (const messages of [
	uiStrings,
	calendarStrings,
	automationStrings,
	commonStrings,
	appearanceStrings,
	agent,
	archives,
	automations,
	comments,
	home,
	health,
	icons,
	navigator,
	notifications,
	sync,
	safe,
	taskMessages,
])
	registerMessages(messages);

registerMessages(nativeStrings);

import { messages as aboutUI } from '../src/shared/i18n/lazy/huhu-ui';
registerMessages(aboutUI);
import { messages as agentUI } from '../src/modules/agent/ui/i18n';
registerMessages(agentUI);
import { messages as navigatorUI } from '../src/modules/navigator/ui/i18n';
registerMessages(navigatorUI);
import { messages as taskUI } from '../src/modules/task/ui/i18n';
registerMessages(taskUI);
import { messages as versioningUI } from '../src/modules/versioning/ui/i18n';
registerMessages(versioningUI);

// Pure UI dictionaries are preloaded here only for ordinary tests.
import '../src/modules/notifications/ui/i18n';
import '../src/modules/safe/ui/i18n';
import '../src/modules/health/ui/i18n';
import '../src/modules/home/ui/i18n';
