package api

import "context"

// These ports carry secrets only on the private in-process provider boundary.
// They are never part of HAP or a persisted command receipt.
type CredentialStatus struct {
	Mode   string `json:"mode"`
	State  string `json:"state"`
	Reason string `json:"reason,omitempty"`
}
type CredentialMetadata struct {
	ProfileID, CredentialRef string
	Status                   CredentialStatus
}
type CredentialProvider interface {
	Put(context.Context, string, string, string, []byte) (CredentialStatus, error)
	Resolve(context.Context, string, string) ([]byte, CredentialStatus, error)
	Delete(context.Context, string, string) (CredentialStatus, error)
	Status(context.Context, string, string) (CredentialStatus, error)
	Close() error
}
type CredentialCatalog interface {
	Reserve(context.Context, string, string, string) error
	Lookup(context.Context, string, string) (CredentialMetadata, error)
	Update(context.Context, string, string, CredentialStatus) error
	BeginDelete(context.Context, string, string) (CredentialMetadata, error)
	FinishDelete(context.Context, string, string, CredentialStatus) error
}
type CredentialRegistration interface {
	Register(context.Context, string, string, string, []byte) (CredentialStatus, error)
	Delete(context.Context, string, string) (CredentialStatus, error)
	Status(context.Context, string, string) (CredentialStatus, error)
}
