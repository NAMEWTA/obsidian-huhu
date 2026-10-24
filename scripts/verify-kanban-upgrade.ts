// Retained baseline logic assertions; renderer behavior is verified against the current React components.
import { strict as assert } from 'node:assert';
import { runHomeReactChecks } from './run-home-react-checks';
import { parse, serialize } from '../src/modules/home/core/board/parser';
// ---------- kanbanShowCovers round-trip ----------

const md = (libraryBlock: string): string =>
	[
		'---',
		'columns:',
		'  - name: 书库',
		"    color: '#6366f1'",
		'    type: library',
		'    library:',
		'      viewMode: kanban',
		'      sortBy: modified',
		'      sortDesc: true',
		libraryBlock,
		'---',
		'',
		'## 书库',
	].join('\n');

// Round-trip: toggle survives serialize → parse → serialize.
const parsedOn = parse(md('      kanbanShowCovers: true'));
assert.equal(parsedOn.columns[0]!.libraryConfig!.kanbanShowCovers, true, 'toggle parses from markdown');
assert.equal(
	parse(serialize(parsedOn)).columns[0]!.libraryConfig!.kanbanShowCovers,
	true,
	'toggle survives serialize -> parse round-trip',
);

// Absent stays undefined and never serializes a value.
const parsedOff = parse(md(''));
assert.equal(parsedOff.columns[0]!.libraryConfig!.kanbanShowCovers, undefined, 'absent toggle stays undefined');
const reserialized = serialize(parsedOff);
assert.ok(!reserialized.includes('kanbanShowCovers'), 'absent toggle must not serialize');

console.log('kanbanShowCovers round-trip: PASS');

runHomeReactChecks(['ui/sections/library.dom.test.tsx']);
