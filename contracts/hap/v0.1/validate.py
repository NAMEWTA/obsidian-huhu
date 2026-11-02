"""Independent JSON Schema 2020-12 checks (tooling: jsonschema==4.25.1, rfc3339-validator==0.1.4).

Run: python contracts/hap/v0.1/validate.py
The Python validator is a verification tool, not a Runner dependency.
"""
import copy
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

root = Path(__file__).resolve().parent
schema = json.loads((root / 'schema.json').read_text())
Draft202012Validator.check_schema(schema)
if 'date-time' not in FormatChecker.checkers:
    raise RuntimeError('Install pinned rfc3339-validator==0.1.4; date-time must assert, not annotate')
validator = Draft202012Validator(schema, format_checker=FormatChecker())
fixtures = json.loads((root / 'fixtures' / 'golden.json').read_text())
for case in fixtures['valid']:
    validator.validate(case['payload'])

method_cases = json.loads((root / 'fixtures' / 'methods.json').read_text())['cases']
positive_samples = {}
for case in method_cases:
    name = case['method'] + '.' + case['part']
    if case['valid'] and case['name'] == name + '.valid':
        if name in positive_samples:
            raise AssertionError(('duplicate positive method fixture', name))
        positive_samples[name] = case['value']
method_definitions = {name for name in schema['$defs'] if name.endswith(('.params', '.result'))}
if set(positive_samples) != method_definitions:
    raise AssertionError(('positive method fixture coverage', sorted(method_definitions - set(positive_samples)), sorted(set(positive_samples) - method_definitions)))

# Reuse canonical positive values rather than inventing combinations of every
# optional property. Cross-field constraints can make such combinations invalid.
count = 0
for name in sorted(method_definitions):
    validator.evolve(schema=schema['$defs'][name]).validate(positive_samples[name])
    count += 1

# These negative values catch precision-damaging numbers and malformed decimal
# strings on names which TypeScript erases to the primitive string type.
cases = [
    ('protocol.hello.result', ['profile', 'commandEpoch']),
    ('agents.get.result', ['personaRevision']),
    ('agents.get.result', ['modelBindingRevision']),
    ('runs.start.params', ['hostLeaseEpoch']),
    ('runs.subscribe.result', ['nextSeq']),
]
negative = 0
for definition_name, fields in cases:
    definition = schema['$defs'][definition_name]
    original = positive_samples[definition_name]
    for value in [9007199254740993, '-1', '1.0', '01', 'not-decimal']:
        payload = copy.deepcopy(original)
        target = payload
        for field in fields[:-1]:
            target = target[field]
        target[fields[-1]] = value
        if not list(validator.evolve(schema=definition).iter_errors(payload)):
            raise AssertionError((definition_name, fields, value))
        negative += 1
print(json.dumps({'method_shapes': count, 'golden_frames': len(fixtures['valid']), 'decimal_negative_cases': negative, 'schema': '2020-12'}))

for case in method_cases:
    definition = schema['$defs'][case['method'] + '.' + case['part']]
    actual = not list(validator.evolve(schema=definition).iter_errors(case['value']))
    if actual != case['valid']:
        raise AssertionError((case['name'], case['valid'], actual))
print(json.dumps({'shared_method_cases': len(method_cases)}))
