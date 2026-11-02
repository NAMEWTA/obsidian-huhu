import { useState } from 'react';
import { Link2, X } from 'lucide-react';
import { Button } from '../../../ui/components/button';
import { Input } from '../../../ui/components/input';
import { ActionButton } from '../../../ui/components/huhu/ActionButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/components/select';
import { useT } from '../../../ui/react/hooks';
import { credentialLabel, entryLabel, MAX_RELATIONS, relationKey, type AccountRelation, type CredentialInput, type SafeEntry } from '../core/model';

type RelationEntry = Pick<SafeEntry, 'id' | 'title' | 'url' | 'deletedAt'> & { credentials: CredentialInput[] };

export function AccountRelations({ entries, currentEntry, credential, disabled, onChange }: {
	entries: readonly RelationEntry[]; currentEntry: string; credential: CredentialInput;
	disabled: boolean; onChange: (relations: AccountRelation[]) => void;
}) {
	const t = useT();
	const [adding, setAdding] = useState(false);
	const [query, setQuery] = useState('');
	const label = (entry: RelationEntry, account: CredentialInput) => `${entryLabel(entry) || t('safe.unnamedEntry')} · ${credentialLabel(account) || t('safe.accountN', { n: entry.credentials.findIndex(item => item.id === account.id) + 1 })}`;
	const available = entries.filter(entry => entry.deletedAt === null).flatMap(entry => entry.credentials.map(account => ({ entry, account })))
		.filter(({ entry, account }) => !(entry.id === currentEntry && account.id === credential.id)
			&& !credential.relations.some(relation => relation.entryId === entry.id && relation.credentialId === account.id)
			&& label(entry, account).toLowerCase().includes(query.trim().toLowerCase()));
	const incoming = entries.filter(entry => entry.deletedAt === null).flatMap(entry => entry.credentials
		.filter(account => account.relations.some(relation => relation.entryId === currentEntry && relation.credentialId === credential.id))
		.map(account => label(entry, account)));
	return <div className="grid min-w-0 gap-1 text-xs" role="group" aria-label={t('safe.relations')}>
		{credential.relations.map(relation => {
			const target = entries.find(entry => entry.id === relation.entryId && entry.deletedAt === null);
			const account = target?.credentials.find(item => item.id === relation.credentialId);
			const text = target && account ? label(target, account) : t('safe.relationUnavailable');
			return <div key={relationKey(relation)} className="flex min-w-0 flex-wrap items-center gap-1 rounded-md bg-muted/50 px-1">
				<Link2 className="size-3.5 shrink-0" aria-hidden />
				<span className="min-w-0 flex-1 break-words">{text}</span>
				<Select value={relation.kind} disabled={disabled} onValueChange={kind => {
					if (kind === 'login' || kind === 'related') onChange(credential.relations.map(item => item === relation ? { ...item, kind } : item));
				}}><SelectTrigger size="sm" aria-label={t('safe.relationKind')}><SelectValue /></SelectTrigger><SelectContent>
					<SelectItem value="related">{t('safe.relationRelated')}</SelectItem><SelectItem value="login">{t('safe.relationLogin')}</SelectItem>
				</SelectContent></Select>
				<ActionButton type="button" size="icon-sm" label={t('safe.removeRelation', { target: text })} disabled={disabled} onClick={() => onChange(credential.relations.filter(item => item !== relation))}><X /></ActionButton>
			</div>;
		})}
		{incoming.length > 0 && <p className="m-0 break-words text-muted-foreground">{t('safe.relationIncoming')}: {incoming.join('；')}</p>}
		<Button type="button" size="sm" variant="ghost" className="justify-self-start" disabled={disabled || credential.relations.length >= MAX_RELATIONS} aria-expanded={adding} onClick={() => setAdding(value => !value)}><Link2 />{t('safe.addRelation')}</Button>
		{adding && <div className="grid gap-1 rounded-md border border-border p-1.5">
			<Input className="h-8" aria-label={t('safe.searchAccounts')} placeholder={t('safe.searchAccounts')} value={query} onChange={event => setQuery(event.currentTarget.value)} disabled={disabled} />
			<div className="grid max-h-40 gap-1 overflow-y-auto scrollbar-sleek">
				{available.length === 0 && <span className="text-muted-foreground">{t('safe.noAccounts')}</span>}
				{available.map(({ entry, account }) => <Button key={`${entry.id}/${account.id}`} type="button" size="sm" variant="ghost" className="h-auto min-h-8 justify-start whitespace-normal break-words text-left" disabled={disabled} onClick={() => {
					onChange([...credential.relations, { entryId: entry.id, credentialId: account.id, kind: 'related' }]); setAdding(false); setQuery('');
				}}>{label(entry, account)}</Button>)}
			</div>
		</div>}
	</div>;
}
