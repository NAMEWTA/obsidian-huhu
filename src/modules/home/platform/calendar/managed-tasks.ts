import { parse } from '../../core/board/parser/parse';
import { canReceiveTask } from '../../core/board/card-kind';
/** Only tasks inside registered task cards qualify without a huhu-task identity. */
export function boardTaskLines(raw: string): Set<number> {
	const columns = parse(raw).columns;
	const lines = new Set<number>();
	let column = -1,
		card = -1;
	raw.split('\n').forEach((line, index) => {
		if (line.startsWith('## ')) {
			column++;
			card = -1;
		} else if (line.startsWith('### ')) card++;
		else if (/^\s*- \[[ xX]\]/.test(line)) {
			const col = columns[column],
				item = col?.cards[card];
			if (col && item && canReceiveTask(col, item)) lines.add(index);
		}
	});
	return lines;
}
