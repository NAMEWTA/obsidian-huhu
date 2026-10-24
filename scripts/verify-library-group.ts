// Retained baseline logic assertions; renderer behavior is verified against the current React components.
import { strict as assert } from 'node:assert';
import { runHomeReactChecks } from './run-home-react-checks';
import { parse, serialize } from '../src/modules/home/core/board/parser';
// ---------- 1. Parser round-trip ----------

interface RoundTripOutcome {
	mode: string | undefined;
	by: string | undefined;
	serialized: string;
}

const roundTrip = (libraryLines: string[]): RoundTripOutcome => {
	const dash = parse(
		[
			'---',
			'columns:',
			'  - name: C1',
			'    type: folder',
			'    library:',
			...libraryLines,
			'---',
			'',
			'## C1',
		].join('\n'),
	);
	const lc = dash.columns[0]!.libraryConfig!;
	return {
		mode: lc.viewGroupMode,
		by: lc.viewGroupBy,
		serialized: serialize(dash),
	};
};

const folderCase = roundTrip(['      viewGroupMode: folder']);
assert.equal(folderCase.mode, 'folder', 'folder mode parses');
assert.equal(folderCase.by, undefined, 'folder mode carries no property key');
assert.match(folderCase.serialized, /viewGroupMode: folder/, 'folder mode persists');
assert.doesNotMatch(folderCase.serialized, /viewGroupBy/, 'folder mode writes no viewGroupBy');

const propCase = roundTrip(['      viewGroupMode: property', '      viewGroupBy: "status"']);
assert.equal(propCase.mode, 'property', 'property mode parses');
assert.equal(propCase.by, 'status', 'property key parses');
assert.match(propCase.serialized, /viewGroupMode: property/, 'property mode persists');
assert.match(propCase.serialized, /viewGroupBy: "status"/, 'property key persists');

const noneCase = roundTrip(['      viewGroupMode: none']);
assert.equal(noneCase.mode, 'none', "'none' parses as explicit off");
assert.match(noneCase.serialized, /viewGroupMode: none/, 'explicit default is preserved');

const absentCase = roundTrip(['      viewMode: grid']);
assert.equal(absentCase.mode, undefined, 'absent mode parses to undefined');
assert.doesNotMatch(absentCase.serialized, /viewGroup/, 'absent mode writes nothing');

const garbageCase = roundTrip(['      viewGroupMode: sideways']);
assert.equal(garbageCase.mode, undefined, 'garbage mode dropped');
assert.match(garbageCase.serialized, /viewGroupMode: sideways/, 'unknown author value is preserved');

const strayByKey = roundTrip(['      viewGroupBy: "status"']);
assert.equal(strayByKey.by, undefined, 'viewGroupBy without property mode is ignored');
assert.match(strayByKey.serialized, /viewGroupBy/, 'unused author property is preserved');

const folderByKey = roundTrip(['      viewGroupMode: folder', '      viewGroupBy: "status"']);
assert.equal(folderByKey.by, undefined, 'viewGroupBy under folder mode is ignored');

console.log('viewGroup parser round-trip: PASS');

runHomeReactChecks(['ui/sections/library.dom.test.tsx']);
