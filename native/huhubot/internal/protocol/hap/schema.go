package hap

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"errors"
	"strings"
	"sync"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

//go:embed schema_generated.json
var methodSchemaJSON []byte

const schemaURL = "https://huhu.local/contracts/hap/v0.1/schema.json"

var compileOnce sync.Once
var compileErr error
var envelopeSchema *jsonschema.Schema
var methodSchemas map[string]*jsonschema.Schema

func compileSchemas() {
	document, err := jsonschema.UnmarshalJSON(bytes.NewReader(methodSchemaJSON))
	if err != nil {
		compileErr = errors.New("HAP embedded schema invalid")
		return
	}
	compiler := jsonschema.NewCompiler()
	compiler.DefaultDraft(jsonschema.Draft2020)
	compiler.AssertFormat()
	// Only the embedded resource and bundled metaschemas are accepted: no network
	// or filesystem resolution can be induced by an incoming payload.
	compiler.UseLoader(jsonschema.SchemeURLLoader{})
	if err = compiler.AddResource(schemaURL, document); err != nil {
		compileErr = errors.New("HAP schema resource invalid")
		return
	}
	envelopeSchema, err = compiler.Compile(schemaURL)
	if err != nil {
		compileErr = errors.New("HAP envelope schema compilation failed")
		return
	}
	var catalog struct {
		Definitions map[string]json.RawMessage `json:"$defs"`
	}
	if json.Unmarshal(methodSchemaJSON, &catalog) != nil {
		compileErr = errors.New("HAP method catalog invalid")
		return
	}
	methodSchemas = make(map[string]*jsonschema.Schema)
	for name := range catalog.Definitions {
		if !strings.HasSuffix(name, ".params") && !strings.HasSuffix(name, ".result") {
			continue
		}
		compiled, err := compiler.Compile(schemaURL + "#/$defs/" + name)
		if err != nil {
			compileErr = errors.New("HAP method schema compilation failed")
			return
		}
		methodSchemas[name] = compiled
	}
}
func validate(schema *jsonschema.Schema, payload json.RawMessage) error {
	if schema == nil {
		return errors.New("HAP method not in contract")
	}
	value, err := jsonschema.UnmarshalJSON(bytes.NewReader(payload))
	if err != nil {
		return errors.New("HAP payload invalid")
	}
	// Validation errors contain rejected instance values; never expose their text.
	if schema.Validate(value) != nil {
		return errors.New("HAP payload does not match contract")
	}
	return nil
}
func ValidateEnvelope(payload json.RawMessage) error {
	compileOnce.Do(compileSchemas)
	if compileErr != nil {
		return compileErr
	}
	return validate(envelopeSchema, payload)
}

// ValidateMethod validates exact JSON keys, required fields, nested types, enums,
// decimal strings and UTC/date-time constraints before a DTO is decoded or used.
func ValidateMethod(method, part string, payload json.RawMessage) error {
	compileOnce.Do(compileSchemas)
	if compileErr != nil {
		return compileErr
	}
	if part != "params" && part != "result" {
		return errors.New("HAP schema part invalid")
	}
	return validate(methodSchemas[method+"."+part], payload)
}
