//go:build linux

package credentials

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/godbus/dbus/v5"
)

// This client implements the Secret Service wire contract, especially
// Prompt.Completed dismissal, rather than inheriting go-keyring's discarded bool.
// Protocol: https://specifications.freedesktop.org/secret-service/latest/
const secretServiceName = "org.freedesktop.secrets"
const secretServicePath = dbus.ObjectPath("/org/freedesktop/secrets")
const secretServiceInterface = "org.freedesktop.Secret.Service"
const secretCollectionInterface = "org.freedesktop.Secret.Collection"
const secretItemInterface = "org.freedesktop.Secret.Item"
const secretPromptInterface = "org.freedesktop.Secret.Prompt"

var errPromptDismissed = errors.New("PROTECTION_DENIED")
var errCredentialMissing = errors.New("CREDENTIAL_MISSING")
var errNoProtection = errors.New("PROTECTION_UNAVAILABLE")

// The field order is the normative Secret struct (oayays), not a persisted DTO.
type serviceSecret struct {
	Session     dbus.ObjectPath
	Parameters  []byte
	Value       []byte
	ContentType string
}
type secretServiceClient struct {
	conn  *dbus.Conn
	ctx   context.Context
	owner string
}

func (s secretServiceClient) object(path dbus.ObjectPath) dbus.BusObject {
	return s.conn.Object(s.owner, path)
}
func validSecretPath(p dbus.ObjectPath) bool { return p.IsValid() && p != "/" }

func secretServiceCredential(ctx context.Context, op byte, profile, ref string, input []byte) ([]byte, error) {
	conn, err := dbus.ConnectSessionBus(dbus.WithContext(ctx))
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	// This read can activate the registered service. All following calls and
	// prompt signals bind to its unique owner, not a replaceable well-known name.
	var collections dbus.Variant
	if err = conn.Object(secretServiceName, secretServicePath).CallWithContext(ctx, "org.freedesktop.DBus.Properties.Get", 0, secretServiceInterface, "Collections").Store(&collections); err != nil {
		return nil, err
	}
	var owner string
	if err = conn.BusObject().CallWithContext(ctx, "org.freedesktop.DBus.GetNameOwner", 0, secretServiceName).Store(&owner); err != nil {
		return nil, err
	}
	if !strings.HasPrefix(owner, ":") {
		return nil, errProtocol
	}
	s := secretServiceClient{conn, ctx, owner}
	paths, ok := collections.Value().([]dbus.ObjectPath)
	if !ok || len(paths) > 64 {
		return nil, errProtocol
	}
	var collection dbus.ObjectPath
	for _, p := range paths {
		if !validSecretPath(p) {
			return nil, errProtocol
		}
		if p == "/org/freedesktop/secrets/collection/login" {
			collection = p
		}
	}
	if collection == "" {
		if err = s.object(secretServicePath).CallWithContext(ctx, secretServiceInterface+".ReadAlias", 0, "default").Store(&collection); err != nil {
			return nil, err
		}
		if collection == "/" {
			return nil, errNoProtection
		}
	}
	if !validSecretPath(collection) {
		return nil, errProtocol
	}
	if err = s.unlock(collection); err != nil {
		return nil, err
	}
	service, user := namespace(profile, ref)
	attributes := map[string]string{"service": service, "username": user}
	if op == 1 {
		session, err := s.openSession()
		if err != nil {
			return nil, err
		}
		defer s.closeSession(session)
		properties := map[string]dbus.Variant{secretItemInterface + ".Label": dbus.MakeVariant("HUHU Bot credential"), secretItemInterface + ".Attributes": dbus.MakeVariant(attributes)}
		var item, prompt dbus.ObjectPath
		wire := serviceSecret{session, []byte{}, input, "application/octet-stream"}
		if err = s.object(collection).CallWithContext(ctx, secretCollectionInterface+".CreateItem", 0, properties, wire, true).Store(&item, &prompt); err != nil {
			return nil, err
		}
		if prompt != "/" {
			result, e := s.prompt(prompt)
			if e != nil {
				return nil, e
			}
			item, ok = result.Value().(dbus.ObjectPath)
			if !ok {
				return nil, errProtocol
			}
		}
		if !validSecretPath(item) {
			return nil, errProtocol
		}
		return nil, nil
	}
	var items []dbus.ObjectPath
	if err = s.object(collection).CallWithContext(ctx, secretCollectionInterface+".SearchItems", 0, attributes).Store(&items); err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, errCredentialMissing
	}
	if len(items) != 1 || !validSecretPath(items[0]) {
		return nil, errProtocol
	}
	item := items[0]
	if err = s.unlock(item); err != nil {
		return nil, err
	}
	if op == 2 {
		var prompt dbus.ObjectPath
		if err = s.object(item).CallWithContext(ctx, secretItemInterface+".Delete", 0).Store(&prompt); err != nil {
			return nil, err
		}
		if _, err = s.prompt(prompt); err != nil {
			return nil, err
		}
		return nil, nil
	}
	if op != 3 {
		return nil, errProtocol
	}
	session, err := s.openSession()
	if err != nil {
		return nil, err
	}
	defer s.closeSession(session)
	var wire serviceSecret
	if err = s.object(item).CallWithContext(ctx, secretItemInterface+".GetSecret", 0, session).Store(&wire); err != nil {
		return nil, err
	}
	if wire.Session != session || len(wire.Parameters) != 0 || len(wire.Value) == 0 || len(wire.Value) > MaxSecretBytes {
		wipe(wire.Value)
		return nil, errProtocol
	}
	return wire.Value, nil
}
func (s secretServiceClient) openSession() (dbus.ObjectPath, error) {
	var output dbus.Variant
	var session dbus.ObjectPath
	err := s.object(secretServicePath).CallWithContext(s.ctx, secretServiceInterface+".OpenSession", 0, "plain", dbus.MakeVariant("")).Store(&output, &session)
	if err != nil {
		return "", err
	}
	if !validSecretPath(session) {
		return "", errProtocol
	}
	return session, nil
}
func (s secretServiceClient) closeSession(session dbus.ObjectPath) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(s.ctx), 50*time.Millisecond)
	defer cancel()
	_ = s.object(session).CallWithContext(ctx, "org.freedesktop.Secret.Session.Close", 0).Err
}
func (s secretServiceClient) unlock(path dbus.ObjectPath) error {
	var unlocked []dbus.ObjectPath
	var prompt dbus.ObjectPath
	if err := s.object(secretServicePath).CallWithContext(s.ctx, secretServiceInterface+".Unlock", 0, []dbus.ObjectPath{path}).Store(&unlocked, &prompt); err != nil {
		return err
	}
	if prompt != "/" {
		result, err := s.prompt(prompt)
		if err != nil {
			return err
		}
		paths, ok := result.Value().([]dbus.ObjectPath)
		if !ok || len(paths) > 64 {
			return errProtocol
		}
		unlocked = append(unlocked, paths...)
	}
	if len(unlocked) > 64 {
		return errProtocol
	}
	for _, p := range unlocked {
		if p == path {
			return nil
		}
	}
	return &dbus.Error{Name: "org.freedesktop.Secret.Error.IsLocked"}
}
func (s secretServiceClient) prompt(path dbus.ObjectPath) (dbus.Variant, error) {
	if path == "/" {
		return dbus.MakeVariant(""), nil
	}
	if !validSecretPath(path) {
		return dbus.Variant{}, errProtocol
	}
	signals := make(chan *dbus.Signal, 8)
	s.conn.Signal(signals)
	defer s.conn.RemoveSignal(signals)
	match := []dbus.MatchOption{dbus.WithMatchSender(s.owner), dbus.WithMatchObjectPath(path), dbus.WithMatchInterface(secretPromptInterface), dbus.WithMatchMember("Completed")}
	if err := s.conn.AddMatchSignalContext(s.ctx, match...); err != nil {
		return dbus.Variant{}, err
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.WithoutCancel(s.ctx), 50*time.Millisecond)
		defer cancel()
		_ = s.conn.RemoveMatchSignalContext(ctx, match...)
	}()
	if err := s.object(path).CallWithContext(s.ctx, secretPromptInterface+".Prompt", 0, "").Err; err != nil {
		return dbus.Variant{}, err
	}
	for {
		select {
		case <-s.ctx.Done():
			return dbus.Variant{}, s.ctx.Err()
		case signal, ok := <-signals:
			if !ok {
				return dbus.Variant{}, &dbus.Error{Name: "org.freedesktop.DBus.Error.Disconnected"}
			}
			if signal == nil || signal.Sender != s.owner || signal.Path != path || signal.Name != secretPromptInterface+".Completed" {
				continue
			}
			if len(signal.Body) != 2 {
				return dbus.Variant{}, errProtocol
			}
			dismissed, ok := signal.Body[0].(bool)
			if !ok {
				return dbus.Variant{}, errProtocol
			}
			result, ok := signal.Body[1].(dbus.Variant)
			if !ok {
				return dbus.Variant{}, errProtocol
			}
			if dismissed {
				return dbus.Variant{}, errPromptDismissed
			}
			return result, nil
		}
	}
}
