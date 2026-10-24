import { READING_ROOT } from '../../../../shared/storage/vault-layout';
import { requireFields, requireDailyRecords } from '../../../../shared/storage/document-validation';
import {
	collectionDocument as doc,
	documentName,
	type DocumentCollectionCodec,
	documentProperties,
	recordRows,
} from '../../../../shared/storage/document-collection';
import type { BookInfo, ReadingData, ReadingRecord } from './application';

const root = READING_ROOT;
export const readingDocuments: DocumentCollectionCodec<ReadingData> = {
	root,
	empty: () => ({ activeBooks: [], sessions: [] }),
	encode: (data) => [
		...data.activeBooks.map((book) => {
			if (!book.id) throw new Error('Book requires a stable id');
			return doc(book.id, `${root}/${documentName(book.title)}-${book.id.slice(-8)}/书籍.md`, 'book', {
				...book,
			});
		}),
		...data.sessions.map((day) =>
			doc(
				`reading:${day.date}`,
				`${root}/记录/${day.date.slice(0, 4)}/${day.date}.md`,
				'reading-records',
				{ date: day.date },
				day.records.map((record) => ({ id: record.timestamp, ...record })),
			),
		),
	],
	decode: (documents) => {
		for (const d of documents) {
			if (d.properties['huhu-type'] === 'book')
				requireFields(
					d.properties,
					['title', 'author', 'coverUrl', 'isbn', 'source'],
					['currentPage', 'totalPages'],
					d.path,
				);
			if (d.properties['huhu-type'] === 'reading-records')
				requireDailyRecords(d, ['timestamp', 'bookTitle'], ['durationSeconds', 'startPage', 'endPage']);
		}
		return {
			activeBooks: documents
				.filter((d) => d.properties['huhu-type'] === 'book')
				.map((d) => ({ ...documentProperties(d), id: d.id }) as unknown as BookInfo),
			sessions: documents
				.filter((d) => d.properties['huhu-type'] === 'reading-records')
				.map((d) => ({
					date: String(d.properties.date),
					records: recordRows<ReadingRecord>(d, ['id']),
				})),
		};
	},
};
