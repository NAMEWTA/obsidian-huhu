package effect

import (
	"strconv"
	"unicode/utf8"
)

type Target struct{ WorkspaceID, ResourceID, Operation, BaseRevision string }
type Call struct {
	ID, Name, Content string
	Target            Target
}

func Validate(c Call) bool {
	n, e := strconv.ParseInt(c.Target.BaseRevision, 10, 64)
	return c.ID != "" && len(c.ID) <= 128 && utf8.ValidString(c.ID) && c.Name == "note.write" && c.Target.WorkspaceID != "" && len(c.Target.WorkspaceID) <= 128 && c.Target.ResourceID != "" && len(c.Target.ResourceID) <= 128 && (c.Target.Operation == "create" || c.Target.Operation == "update") && e == nil && n >= 0 && strconv.FormatInt(n, 10) == c.Target.BaseRevision && utf8.ValidString(c.Content) && len(c.Content) <= 131072
}
