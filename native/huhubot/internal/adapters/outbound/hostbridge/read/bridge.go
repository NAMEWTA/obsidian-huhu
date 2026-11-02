package read

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"unicode/utf16"
	"unicode/utf8"

	access "github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/access/context"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

type Bridge struct{ host api.HostReadAPI }

func New(host api.HostReadAPI) *Bridge { return &Bridge{host} }
func changed() error                   { return &api.Fault{Kind: "SOURCE_CHANGED", Reason: "SOURCE_SNAPSHOT_CHANGED"} }
func (b *Bridge) CurrentLease(ctx context.Context) (api.HostLease, error) {
	return b.host.CurrentLease(ctx)
}
func (b *Bridge) Read(ctx context.Context, r api.HostReadRequest) (api.HostReadResult, error) {
	if !access.ValidSource(r.Source) || r.MaxBytes < 1 || r.MaxBytes > 65536 || r.LeaseID != r.Source.HostLeaseID || r.HostConnectionID != r.Source.HostConnectionID || r.LeaseEpoch != r.Source.HostLeaseEpoch || r.WorkspaceID != r.Source.WorkspaceID {
		return api.HostReadResult{}, api.Invalid("INVALID_SOURCE_READ")
	}
	out, e := b.host.Read(ctx, r)
	if e != nil {
		return api.HostReadResult{}, e
	}
	if !access.EqualSource(r.Source, out.Source) || out.Format != "text/markdown" || !utf8.ValidString(out.Text) {
		return api.HostReadResult{}, changed()
	}
	if out.Truncated || len(out.Text) > r.MaxBytes {
		return api.HostReadResult{}, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "SOURCE_TOO_LARGE"}
	}
	sum := sha256.Sum256([]byte(out.Text))
	if out.Source.Hash != "sha256:"+hex.EncodeToString(sum[:]) {
		return api.HostReadResult{}, changed()
	}
	if span := out.Source.Range; span != nil && span.End-span.Start != len(utf16.Encode([]rune(out.Text))) {
		return api.HostReadResult{}, changed()
	}
	return out, nil
}
func (b *Bridge) Search(ctx context.Context, r api.HostSearchRequest) (api.HostSearchResult, error) {
	out, e := b.host.Search(ctx, r)
	if e != nil {
		return api.HostSearchResult{}, e
	}
	if len(out.Matches) > r.Limit || len(out.NextCursor) > 512 || out.Truncated != (out.NextCursor != "") {
		return api.HostSearchResult{}, changed()
	}
	total := 0
	for _, m := range out.Matches {
		if !access.ValidSource(m.Source) || !utf8.ValidString(m.Text) || m.Range.Start < 0 || m.Range.End <= m.Range.Start {
			return api.HostSearchResult{}, changed()
		}
		if m.Range.End-m.Range.Start != len(utf16.Encode([]rune(m.Text))) {
			return api.HostSearchResult{}, changed()
		}
		if m.Source.WorkspaceID != r.WorkspaceID || m.Source.HostLeaseID != r.LeaseID || m.Source.HostConnectionID != r.HostConnectionID || m.Source.HostLeaseEpoch != r.LeaseEpoch {
			return api.HostSearchResult{}, changed()
		}
		included := false
		for _, source := range r.Sources {
			if access.EqualSource(source, m.Source) {
				included = true
			}
		}
		for _, scope := range r.Scopes {
			if access.ScopeIncludes(scope, m.Source) {
				included = true
			}
		}
		if !included {
			return api.HostSearchResult{}, api.Denied("SOURCE_NOT_GRANTED")
		}
		if m.Source.Range != nil && (m.Range.Start < m.Source.Range.Start || m.Range.End > m.Source.Range.End) {
			return api.HostSearchResult{}, changed()
		}
		total += len(m.Text)
		if total > r.MaxBytes {
			return api.HostSearchResult{}, &api.Fault{Kind: "RESOURCE_LIMIT", Reason: "SEARCH_TOO_LARGE"}
		}
	}
	return out, nil
}
