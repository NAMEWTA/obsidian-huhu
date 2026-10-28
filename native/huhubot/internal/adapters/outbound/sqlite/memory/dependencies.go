package memory

import (
	"context"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/execution/commands"
)

type ownerKey struct{ Kind, ID string }

func refKey(r api.DerivedInput) ownerKey { return ownerKey{r.Kind, r.ID} }
func dependencyOwner(r api.DerivedInput) ownerKey {
	if r.Kind == "task_result" {
		return ownerKey{"private_result", r.ID}
	}
	return refKey(r)
}
func validRef(r api.DerivedInput) bool {
	if r.Kind != "message" && r.Kind != "task_result" && r.Kind != "memory_revision" || r.ID == "" || len(r.ID) > 512 || !commands.Positive(r.Revision) || r.Namespace == "" || r.WorkThreadID == "" || len(r.Hash) != 71 || !strings.HasPrefix(r.Hash, "sha256:") {
		return false
	}
	b, err := hex.DecodeString(r.Hash[7:])
	return err == nil && len(b) == 32 && strings.ToLower(r.Hash) == r.Hash
}
func mergeRefs(a, b []api.DerivedInput) ([]api.DerivedInput, error) {
	byKey := map[ownerKey]api.DerivedInput{}
	for _, refs := range [][]api.DerivedInput{a, b} {
		for _, ref := range refs {
			if !validRef(ref) {
				return nil, invalidState()
			}
			if old, ok := byKey[refKey(ref)]; ok && old != ref {
				return nil, invalidState()
			}
			byKey[refKey(ref)] = ref
		}
	}
	if len(byKey) > 128 {
		return nil, fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
	}
	out := make([]api.DerivedInput, 0, len(byKey))
	for _, ref := range byKey {
		out = append(out, ref)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Kind+"\x00"+out[i].ID < out[j].Kind+"\x00"+out[j].ID })
	return out, nil
}

// A traversal accumulates identities once and sorts only its completed result.
// Rebuilding and sorting the entire prefix for every row makes a dense,
// otherwise bounded history graph expensive while its SQL transaction is held.
type refSet map[ownerKey]api.DerivedInput

func (s refSet) add(refs []api.DerivedInput) error {
	for _, ref := range refs {
		if !validRef(ref) {
			return invalidState()
		}
		key := refKey(ref)
		if old, ok := s[key]; ok && old != ref {
			return invalidState()
		}
		s[key] = ref
	}
	if len(s) > 128 {
		return fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
	}
	return nil
}
func (s refSet) sorted() []api.DerivedInput {
	out := make([]api.DerivedInput, 0, len(s))
	for _, ref := range s {
		out = append(out, ref)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Kind != out[j].Kind {
			return out[i].Kind < out[j].Kind
		}
		return out[i].ID < out[j].ID
	})
	return out
}

func union[T any](a, b []T) []T {
	seen := map[string]bool{}
	out := []T{}
	for _, values := range [][]T{a, b} {
		for _, value := range values {
			key := encode(value)
			if !seen[key] {
				seen[key] = true
				out = append(out, value)
			}
		}
	}
	return out
}
func mergeBodies(body, inherited api.MemoryBody) (api.MemoryBody, error) {
	body.SourceRefs = union(body.SourceRefs, inherited.SourceRefs)
	body.SourceScopes = union(body.SourceScopes, inherited.SourceScopes)
	var err error
	body.Derived, err = mergeRefs(body.Derived, inherited.Derived)
	if err != nil {
		return body, err
	}
	if len(body.SourceRefs)+len(body.SourceScopes) > 32 {
		return body, fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
	}
	return body, nil
}

// loadGraph batches every frontier across the whole request. It never follows
// audit supersedes and never turns a repeated/cyclic origin into a truncated
// success. Each caller then verifies its own <=128-reference closure.
func loadGraph(ctx context.Context, tx *sql.Tx, roots []ownerKey) (map[ownerKey][]api.DerivedInput, error) {
	graph := map[ownerKey][]api.DerivedInput{}
	sets := map[ownerKey]refSet{}
	frontier := append([]ownerKey{}, roots...)
	seen := map[ownerKey]bool{}
	for len(frontier) > 0 {
		pending := []ownerKey{}
		for _, key := range frontier {
			if !seen[key] {
				seen[key] = true
				pending = append(pending, key)
				sets[key] = refSet{}
			}
		}
		if len(seen) > len(roots)*129 {
			return nil, fault("RESOURCE_LIMIT", "MEMORY_PROVENANCE_LIMIT")
		}
		frontier = nil
		for start := 0; start < len(pending); start += 128 {
			end := min(start+128, len(pending))
			predicates := []string{}
			args := []any{}
			for _, key := range pending[start:end] {
				predicates = append(predicates, "(owner_kind=? AND owner_id=?)")
				args = append(args, key.Kind, key.ID)
			}
			rows, err := tx.QueryContext(ctx, "SELECT owner_kind,owner_id,ancestor_kind,ancestor_id,ancestor_revision,content_hash,namespace,work_thread_id FROM memory_dependencies WHERE relation!='audit' AND ("+strings.Join(predicates, " OR ")+") ORDER BY owner_kind,owner_id,ancestor_kind,ancestor_id", args...)
			if err != nil {
				return nil, err
			}
			for rows.Next() {
				var key ownerKey
				var ref api.DerivedInput
				if err = rows.Scan(&key.Kind, &key.ID, &ref.Kind, &ref.ID, &ref.Revision, &ref.Hash, &ref.Namespace, &ref.WorkThreadID); err != nil {
					rows.Close()
					return nil, err
				}
				err = sets[key].add([]api.DerivedInput{ref})
				if err != nil {
					rows.Close()
					return nil, err
				}
				frontier = append(frontier, dependencyOwner(ref))
			}
			err = rows.Err()
			rows.Close()
			if err != nil {
				return nil, err
			}
		}
	}
	for key, refs := range sets {
		graph[key] = refs.sorted()
	}
	return graph, nil
}
func closure(graph map[ownerKey][]api.DerivedInput, root ownerKey) ([]api.DerivedInput, error) {
	color := map[ownerKey]int{}
	out := refSet{}
	var visit func(ownerKey) error
	visit = func(key ownerKey) error {
		if color[key] == 1 {
			return invalidState()
		}
		if color[key] == 2 {
			return nil
		}
		color[key] = 1
		if err := out.add(graph[key]); err != nil {
			return err
		}
		for _, ref := range graph[key] {
			if err := visit(dependencyOwner(ref)); err != nil {
				return err
			}
		}
		color[key] = 2
		return nil
	}
	if err := visit(root); err != nil {
		return nil, err
	}
	return out.sorted(), nil
}

func protect(ctx context.Context, tx *sql.Tx, n namespace, old api.MemoryItem, rule, receipt string) error {
	graph, err := loadGraph(ctx, tx, []ownerKey{{"memory_revision", old.RevisionID}})
	if err != nil {
		return err
	}
	refs, err := closure(graph, ownerKey{"memory_revision", old.RevisionID})
	if err != nil {
		return err
	}
	// The owner is not an extra ancestor in the public 128-reference closure.
	refs = append(refs, revisionRef(n, old))
	origins := []ownerKey{{"user_intent", old.ID}}
	for _, ref := range refs {
		origins = append(origins, refKey(ref))
	}
	for _, origin := range origins {
		if err := changed(tx.ExecContext(ctx, "INSERT INTO memory_suppressions(namespace_id,origin_kind,origin_stable_id,rule_kind,generation,receipt_key,protected_item_id) VALUES(?,?,?,?,1,?,?) ON CONFLICT(namespace_id,origin_kind,origin_stable_id,rule_kind) DO UPDATE SET generation=generation+1,receipt_key=excluded.receipt_key,protected_item_id=excluded.protected_item_id WHERE generation<9223372036854775807", n.ID, origin.Kind, origin.ID, rule, receipt, old.ID)); err != nil {
			return err
		}
	}
	predicates, args := []string{}, []any{n.ID}
	for _, ref := range refs {
		predicates = append(predicates, "(d.ancestor_kind=? AND d.ancestor_id=?)")
		args = append(args, ref.Kind, ref.ID)
	}
	where := "namespace_id=? AND commit_state='pending' AND job_id IN(SELECT d.owner_id FROM memory_dependencies d WHERE d.owner_kind='job' AND d.relation!='audit' AND (" + strings.Join(predicates, " OR ") + "))"
	var count, exhausted int
	if err := tx.QueryRowContext(ctx, "SELECT count(*),COALESCE(sum(generation=9223372036854775807 OR revision=9223372036854775807),0) FROM memory_jobs WHERE "+where, args...).Scan(&count, &exhausted); err != nil {
		return err
	}
	if exhausted > 0 {
		return fault("RESOURCE_LIMIT", "REVISION_EXHAUSTED")
	}
	reason := "MEMORY_REVISION_INACTIVE"
	if rule == "deny_automatic" {
		reason = "MEMORY_FORGOTTEN"
	}
	result, err := tx.ExecContext(ctx, "UPDATE memory_jobs SET generation=generation+1,revision=revision+1,reason=?,admission=CASE WHEN run_id IS NULL THEN 'blocked' ELSE admission END,commit_state=CASE WHEN run_id IS NULL THEN commit_state ELSE 'discarded' END WHERE "+where, append([]any{reason}, args...)...)
	if err != nil {
		return err
	}
	actual, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if actual != int64(count) {
		return invalidState()
	}
	return nil
}

func decodeRefs(raw string) ([]api.DerivedInput, error) {
	var refs []api.DerivedInput
	if json.Unmarshal([]byte(raw), &refs) != nil || refs == nil {
		return nil, invalidState()
	}
	return mergeRefs(nil, refs)
}
