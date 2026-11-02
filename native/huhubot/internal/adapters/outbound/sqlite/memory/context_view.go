package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reflect"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/execution"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/sqlite/grants"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	selection "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/memory/context"
)

type storedContextEntry struct {
	View       api.ExecutionContextEntryView
	Short      *api.ShortTermEntry
	Ref        *api.DerivedInput
	Attachment *api.RunAccessInput
}

func renderSpans(original, representation string, spans []api.ContextTextSpan) (string, error) {
	if !utf8.ValidString(original) {
		return "", inputInvalid()
	}
	if representation == "intent_alias" {
		return "", nil
	}
	parts := []string{}
	for i, span := range spans {
		if span.Start < 0 || span.End < span.Start || span.End > len(original) || i > 0 && spans[i-1].End >= span.Start || !utf8.ValidString(original[:span.Start]) || !utf8.ValidString(original[:span.End]) {
			return "", inputInvalid()
		}
		parts = append(parts, original[span.Start:span.End])
	}
	return strings.Join(parts, api.ShortTermOmission), nil
}
func storeContextEntry(ctx context.Context, tx *sql.Tx, run string, ordinal int, origin, id, revision, sourceHash string, entry storedContextEntry, refs []api.DerivedInput) error {
	if entry.View.Text != nil || entry.Short != nil && entry.Short.Text != "" {
		return inputInvalid()
	}
	_, err := tx.ExecContext(ctx, "INSERT INTO memory_context_entries(entry_id,run_id,ordinal,kind,origin_kind,origin_id,body_revision,source_hash,representation,spans_json,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)", entry.View.ID, run, ordinal, entry.View.Kind, origin, id, revision, sourceHash, entry.View.Representation, encode(entry.View.SourceSpans), encode(entry))
	if err != nil {
		return err
	}
	return insertDependencies(ctx, tx, "context_entry", entry.View.ID, "effective", refs)
}
func readContextEntries(ctx context.Context, tx *sql.Tx, run string) ([]storedContextEntry, error) {
	rows, err := tx.QueryContext(ctx, "SELECT entry_id,kind,origin_kind,origin_id,body_revision,source_hash,representation,spans_json,metadata_json FROM memory_context_entries WHERE run_id=? ORDER BY ordinal", run)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []storedContextEntry{}
	for rows.Next() {
		var id, kind, origin, originID, revision, hash, representation, spans, raw string
		if err = rows.Scan(&id, &kind, &origin, &originID, &revision, &hash, &representation, &spans, &raw); err != nil {
			return nil, err
		}
		var entry storedContextEntry
		var sourceSpans []api.ContextTextSpan
		// The optional View omits empty spans; the separate SQL array retains [].
		// Compare their elements while preserving strict ShortTerm binding checks.
		if json.Unmarshal([]byte(raw), &entry) != nil || json.Unmarshal([]byte(spans), &sourceSpans) != nil || entry.View.ID != id || entry.View.Kind != kind || entry.View.Representation != representation || entry.View.Revision != "1" || entry.View.Text != nil || !slices.Equal(entry.View.SourceSpans, sourceSpans) {
			return nil, inputInvalid()
		}
		if entry.Ref != nil && (entry.Ref.ID != originID || entry.Ref.Revision != revision || entry.Ref.Hash != hash) {
			return nil, inputInvalid()
		}
		if entry.Short != nil && (entry.Short.Text != "" || entry.Short.ID != id || entry.Short.OriginKind != origin || entry.Ref == nil || entry.Short.Ref != *entry.Ref) {
			return nil, inputInvalid()
		}
		out = append(out, entry)
	}
	return out, rows.Err()
}

func (s *Store) sealEntries(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, r runContext, plan execution.InitialContextPlan) error {
	ordinal := 0
	for _, sources := range []struct {
		Refs   []api.SourceSnapshot
		Scopes []api.SourceScope
	}{{r.ExplicitSources, r.ExplicitScopes}} {
		if len(sources.Refs)+len(sources.Scopes) > 0 {
			access := r.Access
			access.Sources = append([]api.SourceSnapshot{}, sources.Refs...)
			access.Scopes = append([]api.SourceScope{}, sources.Scopes...)
			view := api.ExecutionContextEntryView{ID: api.NewID("context-entry:"), Kind: "attachment", Representation: "metadata", State: "readable", SourceRefs: access.Sources, Revision: "1", CreatorKind: "user", PreparationKind: "explicit", Scope: runScope(r)}
			if err := storeContextEntry(ctx, tx, r.Run.ID, ordinal, "attachment", r.Run.ID, "1", digest(encode(access)), storedContextEntry{View: view, Attachment: &access}, nil); err != nil {
				return err
			}
			ordinal++
		}
	}
	if plan.ShortTerm != nil {
		for _, selected := range plan.ShortTerm.Entries {
			entry := selected
			entry.Text = ""
			creator := "agent"
			if entry.Role == "user" {
				creator = "user"
			} else if r.Namespace.Public.Kind == "temporary" {
				creator = "temporary"
			}
			preparation := "selected"
			if entry.Use == "working_summary" {
				preparation = "automatic_extractive"
			}
			ref := entry.Ref
			view := api.ExecutionContextEntryView{ID: entry.ID, Kind: entry.Use, Representation: entry.Representation, State: "readable", Source: &ref, Revision: "1", ContentHash: entry.TextHash, SourceSpans: entry.Spans, CreatorKind: creator, PreparationKind: preparation, Scope: runScope(r), Partial: entry.Partial}
			graph, err := loadGraph(ctx, tx, []ownerKey{{"message", ref.ID}})
			if err != nil {
				return err
			}
			refs, err := closure(graph, ownerKey{"message", ref.ID})
			if err != nil {
				return err
			}
			refs, err = mergeRefs(refs, []api.DerivedInput{ref})
			if err != nil {
				return err
			}
			if err = storeContextEntry(ctx, tx, r.Run.ID, ordinal, entry.OriginKind, ref.ID, ref.Revision, ref.Hash, storedContextEntry{View: view, Short: &entry, Ref: &ref}, refs); err != nil {
				return err
			}
			ordinal++
		}
	}
	if plan.Memory != nil {
		for _, input := range plan.Memory.Entries {
			ref := input.Ref
			scope := runScope(r)
			creator, provenance := r.Namespace.Public.Kind, ""
			refs := []api.DerivedInput{ref}
			origin := "conversation_message"
			if ref.Kind == "memory_revision" {
				origin = "memory_revision"
				var rawScope string
				var m api.MemoryItem
				err := tx.QueryRowContext(ctx, "SELECT i.scope_kind,i.scope_id FROM memory_revisions r JOIN memory_items i ON i.item_id=r.item_id WHERE r.revision_id=?", ref.ID).Scan(&rawScope, &m.Scope.ID)
				if err != nil {
					return err
				}
				scope = api.MemoryScope{Kind: rawScope, ID: m.Scope.ID}
				body, err := revisionBody(ctx, tx, ref.ID)
				if err != nil {
					return err
				}
				creator, provenance = body.CreatorKind, body.Provenance
				refs, err = mergeRefs(refs, body.Derived)
				if err != nil {
					return err
				}
			} else {
				actual, err := sourceMetadata(ctx, tx, id, r.Namespace.Profile, []api.DerivedInput{ref})
				if err != nil {
					return err
				}
				source, ok := actual[refKey(ref)]
				if !ok {
					return inputInvalid()
				}
				origin = source.OriginKind
				if source.Role == "user" {
					creator = "user"
				}
				graph, err := loadGraph(ctx, tx, []ownerKey{dependencyOwner(ref)})
				if err != nil {
					return err
				}
				more, err := closure(graph, dependencyOwner(ref))
				if err != nil {
					return err
				}
				refs, err = mergeRefs(refs, more)
				if err != nil {
					return err
				}
			}
			view := api.ExecutionContextEntryView{ID: api.NewID("context-entry:"), Kind: "memory_recall", Representation: "full", State: "readable", Source: &ref, Revision: "1", ContentHash: digest(input.Text), SourceSpans: []api.ContextTextSpan{{Start: 0, End: len(input.Text)}}, CreatorKind: creator, PreparationKind: "memory_recall", Provenance: provenance, Scope: scope}
			if err := storeContextEntry(ctx, tx, r.Run.ID, ordinal, origin, ref.ID, ref.Revision, ref.Hash, storedContextEntry{View: view, Ref: &ref}, refs); err != nil {
				return err
			}
			ordinal++
		}
	}
	creator := "user"
	if plan.Memory != nil && plan.Memory.Mode == "maintenance" {
		creator = "agent"
	}
	view := api.ExecutionContextEntryView{ID: api.NewID("context-entry:"), Kind: "intent", Representation: "full", State: "readable", Revision: "1", ContentHash: digest(r.Intent), SourceSpans: []api.ContextTextSpan{{Start: 0, End: len(r.Intent)}}, CreatorKind: creator, PreparationKind: "explicit", Scope: runScope(r)}
	return storeContextEntry(ctx, tx, r.Run.ID, ordinal, "run_intent", r.Run.ID, "1", digest(r.Intent), storedContextEntry{View: view}, nil)
}

type contextCursor struct {
	Profile, Principal, Namespace, Run, Manifest, Watermark string
	Ordinal, Part                                           int
}

func (s *Store) contextView(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, n namespace, q api.MemoryGet) (api.ExecutionContextView, error) {
	r, err := s.runContext(ctx, tx, id, q.ID)
	out := api.ExecutionContextView{RunID: q.ID, Namespace: n.Public, Entries: []api.ExecutionContextEntryView{}}
	if err != nil {
		return out, err
	}
	if r.Namespace.Public != n.Public || r.Namespace.Principal != n.Principal || r.Run.Role == "orchestration" {
		return out, api.Denied("MEMORY_NAMESPACE_DENIED")
	}
	out.RunRevision = r.Run.Revision
	out.Scope = runScope(r)
	var revision, shortJSON string
	err = tx.QueryRowContext(ctx, "SELECT CAST(manifest_revision AS TEXT),short_term_json FROM memory_run_contexts WHERE run_id=?", r.Run.ID).Scan(&revision, &shortJSON)
	if errors.Is(err, sql.ErrNoRows) {
		out.State = "pending"
		out.Reason = "CONTEXT_NOT_PREPARED"
		if r.Policy == "" {
			out.State = "legacy_untracked"
			out.Reason = "CONTEXT_LEGACY_UNTRACKED"
		}
		if q.Cursor != "" {
			return out, fault("CURSOR_EXPIRED", "CONTEXT_CHANGED")
		}
		return out, nil
	}
	if err != nil {
		return out, err
	}
	out.ManifestRevision = revision
	out.State = "sealed"
	if shortJSON != "" {
		var v api.ShortTermInput
		if json.Unmarshal([]byte(shortJSON), &v) != nil {
			return out, inputInvalid()
		}
		out.Usage = &v.Usage
	}
	entries, err := readContextEntries(ctx, tx, r.Run.ID)
	if err != nil {
		return out, err
	}
	// Watermark is about these actual entries and their current requirements,
	// not every Memory namespace or every newer message in the Profile.
	states := []string{r.Run.Revision, revision}
	rendered := make([][]api.ExecutionContextEntryView, len(entries))
	for i, entry := range entries {
		parts, token, e := s.renderContextEntry(ctx, tx, id, r, entry)
		if e != nil {
			return out, e
		}
		rendered[i] = parts
		states = append(states, entry.View.ID, token)
		if len(parts) == 1 && parts[0].State == "redacted" {
			out.State = "redacted"
		}
	}
	watermark := digest(encode(states))
	current := contextCursor{Profile: n.Profile, Principal: n.Principal, Namespace: n.Public.Kind + ":" + n.Public.ID, Run: r.Run.ID, Manifest: revision, Watermark: watermark}
	if q.Cursor != "" {
		var supplied contextCursor
		if err = cursorDecode(q.Cursor, &supplied); err != nil {
			return out, err
		}
		ordinal, part := supplied.Ordinal, supplied.Part
		supplied.Ordinal, supplied.Part = 0, 0
		if supplied != current || ordinal < 0 || ordinal >= len(entries) || part < 0 || part >= len(rendered[ordinal]) {
			return out, fault("CURSOR_EXPIRED", "CONTEXT_CHANGED")
		}
		current.Ordinal, current.Part = ordinal, part
	}
	for current.Ordinal < len(rendered) {
		parts := rendered[current.Ordinal]
		for current.Part < len(parts) {
			candidate := out
			candidate.Entries = append(append([]api.ExecutionContextEntryView{}, out.Entries...), parts[current.Part])
			next := current
			next.Part++
			if next.Part == len(parts) {
				next.Ordinal++
				next.Part = 0
			}
			if next.Ordinal < len(rendered) {
				candidate.NextCursor = cursorEncode(next)
			}
			if len(candidate.Entries) > pageLimit(q.Limit) || api.ValidateMemoryResult("memory.get", api.MemoryObject{Kind: "context", Context: &candidate}) != nil {
				if len(out.Entries) == 0 {
					return out, fault("RESOURCE_LIMIT", "MEMORY_PAGE_LIMIT")
				}
				out.NextCursor = cursorEncode(current)
				return out, nil
			}
			out = candidate
			current = next
			if current.Ordinal >= len(rendered) || current.Part == 0 {
				break
			}
		}
	}
	out.NextCursor = ""
	return out, nil
}

func (s *Store) renderContextEntry(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, r runContext, stored storedContextEntry) ([]api.ExecutionContextEntryView, string, error) {
	view := stored.View
	subject := grants.MemorySubject{Kind: "context_entry", ID: view.ID}
	facts, err := s.ReadFactsInTx(ctx, tx, id, r.Namespace.Profile, []grants.MemorySubject{subject})
	if err == nil {
		for _, req := range facts.Requirements {
			if _, err = s.access.CheckMemoryInTx(ctx, tx, id, r.Namespace.Profile, "", req, []string{"read"}); err != nil {
				break
			}
		}
	}
	if err != nil {
		if !safeUnavailable(err) {
			return nil, "", err
		}
		reason := "MEMORY_REVISION_INACTIVE"
		var f *api.Fault
		if errors.As(err, &f) {
			reason = f.Reason
		}
		redacted := api.ExecutionContextEntryView{ID: view.ID, Kind: view.Kind, Representation: view.Representation, State: "redacted", Revision: view.Revision, Reason: reason, Scope: view.Scope}
		return []api.ExecutionContextEntryView{redacted}, digest(encode(redacted)), nil
	}
	if view.Kind == "attachment" {
		return []api.ExecutionContextEntryView{view}, facts.Watermark, nil
	}
	original := ""
	if view.Kind == "intent" {
		original = r.Intent
	} else if stored.Ref == nil {
		return nil, "", inputInvalid()
	} else if stored.Ref.Kind == "memory_revision" {
		body, e := revisionBody(ctx, tx, stored.Ref.ID)
		if e != nil {
			return nil, "", e
		}
		original = body.Text
	} else {
		sources, e := sourceRecords(ctx, tx, id, r.Namespace.Profile, []api.DerivedInput{*stored.Ref})
		if e != nil {
			return nil, "", e
		}
		source, ok := sources[refKey(*stored.Ref)]
		if !ok || !sourceMatches(*stored.Ref, source) {
			return nil, "", inputInvalid()
		}
		original = source.Text
	}
	text, err := renderSpans(original, view.Representation, view.SourceSpans)
	if err != nil {
		return nil, "", err
	}
	if digest(text) != view.ContentHash {
		return nil, "", inputInvalid()
	}
	if stored.Short != nil {
		entry := *stored.Short
		entry.Text = text
		if api.ValidateShortTermOriginal(entry, original, r.Intent) != nil {
			return nil, "", inputInvalid()
		}
	}
	spans := selection.Fragments(text)
	out := make([]api.ExecutionContextEntryView, 0, len(spans))
	for i, span := range spans {
		part := view
		value := text[span.Start:span.End]
		part.Text = &value
		part.DisplaySlice = &api.ContextTextSpan{Start: span.Start, End: span.End}
		part.PartIndex = i
		part.PartCount = len(spans)
		out = append(out, part)
	}
	return out, digest(facts.Watermark + view.ContentHash), nil
}

func (s *Store) listContexts(ctx context.Context, tx *sql.Tx, id api.RequestIdentity, n namespace, q api.MemoryQuery, out *api.MemoryPage) error {
	if q.Scope == nil || q.Scope.Kind == "profile" {
		return api.Invalid("INVALID_MEMORY_PARAMS")
	}
	if err := s.scope(ctx, tx, n, *q.Scope); err != nil {
		return err
	}
	current := pageCursor{Profile: n.Profile, Principal: n.Principal, Namespace: n.Public.Kind + ":" + n.Public.ID, Kind: "context", Query: digest(""), Catalog: decimal(n.Catalog), Suppression: decimal(n.Suppression), Scope: q.Scope}
	if q.Cursor != "" {
		var supplied pageCursor
		if err := cursorDecode(q.Cursor, &supplied); err != nil {
			return err
		}
		after := supplied.After
		supplied.After = ""
		if !reflect.DeepEqual(supplied, current) {
			return fault("CURSOR_EXPIRED", "CONTEXT_CHANGED")
		}
		current.After = after
	}
	column := "r.session_id"
	if q.Scope.Kind == "work_thread" {
		column = "r.work_thread_id"
	}
	rows, err := tx.QueryContext(ctx, "SELECT r.run_id,r.status,CAST(r.revision AS TEXT),r.context_policy_version,COALESCE(CAST(c.manifest_revision AS TEXT),''),COALESCE(c.short_term_json,'') FROM execution_runs r JOIN conversation_sessions s ON s.session_id=r.session_id LEFT JOIN memory_run_contexts c ON c.run_id=r.run_id WHERE s.profile_id=? AND r.principal_id=? AND r.agent_id=? AND r.execution_role!='orchestration' AND "+column+"=? AND r.run_id>? ORDER BY r.run_id LIMIT ?", n.Profile, n.Principal, n.Public.ID, q.Scope.ID, current.After, pageLimit(q.Limit)+1)
	if err != nil {
		return err
	}
	views := []api.ExecutionContextView{}
	for rows.Next() {
		v := api.ExecutionContextView{Namespace: n.Public, Scope: *q.Scope, Entries: []api.ExecutionContextEntryView{}}
		var status, policy, short string
		if err = rows.Scan(&v.RunID, &status, &v.RunRevision, &policy, &v.ManifestRevision, &short); err != nil {
			rows.Close()
			return err
		}
		v.State = "sealed"
		if v.ManifestRevision == "" {
			v.State = "pending"
			v.Reason = "CONTEXT_NOT_PREPARED"
			if policy == "" {
				v.State = "legacy_untracked"
				v.Reason = "CONTEXT_LEGACY_UNTRACKED"
			}
		}
		if short != "" {
			var input api.ShortTermInput
			if json.Unmarshal([]byte(short), &input) != nil {
				rows.Close()
				return inputInvalid()
			}
			v.Usage = &input.Usage
		}
		views = append(views, v)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	more := len(views) > pageLimit(q.Limit)
	if more {
		views = views[:pageLimit(q.Limit)]
	}
	for _, view := range views {
		out.Items = append(out.Items, api.MemoryObject{Kind: "context", Context: &view})
		current.After = view.RunID
	}
	if more {
		out.NextCursor = cursorEncode(current)
	}
	if api.ValidateMemoryResult("memory.list", *out) != nil {
		return fault("RESOURCE_LIMIT", "MEMORY_PAGE_LIMIT")
	}
	return nil
}
