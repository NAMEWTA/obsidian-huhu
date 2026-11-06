import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { test } from 'vitest';

function calendarInputs(source: string, filename = 'control.tsx'): string[] {
 const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 const inputs = new Set(['input']);
 const modules = new Map([
  [path.resolve('src/ui/components/input'), 'Input'],
  // DateInput transparently forwards props through InputControl; inspect its callers too.
  [path.resolve('src/ui/components/huhu/date/field-parts'), 'DateInput'],
 ]);
 for (const node of file.statements) {
  if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || !node.moduleSpecifier.text.startsWith('.')) continue;
  const imported = path.resolve(path.dirname(filename), node.moduleSpecifier.text);
  const exported = modules.get(imported.replace(/\.tsx$/, ''));
  if (!exported) continue;
  const bindings = node.importClause?.namedBindings;
  if (bindings && ts.isNamedImports(bindings)) for (const item of bindings.elements) if ((item.propertyName ?? item.name).text === exported) inputs.add(item.name.text);
 }
 const found: string[] = [];
 const visit = (node: ts.Node) => {
  if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && inputs.has(node.tagName.getText(file))) {
   for (const attr of node.attributes.properties) {
    if (ts.isJsxSpreadAttribute(attr)) { found.push(`spread:${node.getText(file)}`); continue; }
    if (!ts.isJsxAttribute(attr) || attr.name.getText(file) !== 'type') continue;
    const value = attr.initializer;
    const literal = value && (ts.isStringLiteral(value) ? value : ts.isJsxExpression(value) && value.expression && ts.isStringLiteral(value.expression) ? value.expression : undefined);
    if (literal && ['date', 'datetime-local'].includes(literal.text)) found.push(node.getText(file));
    if (value && !literal) found.push(`dynamic:${node.getText(file)}`);
   }
  }
  ts.forEachChild(node, visit);
 };
 visit(file); return found;
}
// Four existing adapters forward HTML attributes. The fifth, DateInput, is a transparent
// wrapper whose real imports/callers are checked above. Calendar literals remain forbidden
// even here; new adapters and other dynamic expressions fail closed for review.
function reviewedDateTimeCommon(hit: string, source: string): boolean {
 if (!hit.startsWith('spread:<DateInput')) return false;
 const call = ts.createSourceFile('call.tsx', `const input = ${hit.slice('spread:'.length)};`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 const statement = call.statements[0];
 const input = statement && ts.isVariableStatement(statement) ? statement.declarationList.declarations[0]?.initializer : undefined;
 if (!input || !ts.isJsxSelfClosingElement(input)) return false;
 const spreads = input.attributes.properties.filter(ts.isJsxSpreadAttribute);
 if (spreads.length !== 1 || spreads[0]?.expression.getText(call) !== 'common') return false;
 const file = ts.createSourceFile('DateTimeField.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 const keys = ['disabled', 'readOnly', 'required', 'aria-describedby', 'onCompositionStart', 'onCompositionEnd'];
 let declarations = 0, forwards = 0, safe = true;
 const visit = (node: ts.Node) => {
  if (ts.isIdentifier(node) && node.text === 'common') {
   const scope = ts.findAncestor(node, ts.isFunctionLike);
   safe &&= !!scope && ts.isFunctionDeclaration(scope) && scope.name?.text === 'DateTimeField';
   const parent = node.parent;
   if (ts.isVariableDeclaration(parent) && parent.name === node) {
    declarations++;
    const value = parent.initializer;
    safe &&= ts.isVariableDeclarationList(parent.parent) && !!(parent.parent.flags & ts.NodeFlags.Const) &&
     !!value && ts.isObjectLiteralExpression(value) && value.properties.length === keys.length &&
     value.properties.every((property, index) => !ts.isSpreadAssignment(property) && !!property.name &&
      !ts.isComputedPropertyName(property.name) && property.name.getText(file).replace(/^['"]|['"]$/g, '') === keys[index]);
   } else if (ts.isJsxSpreadAttribute(parent) && parent.expression === node) {
    forwards++;
    safe &&= (ts.isJsxOpeningElement(parent.parent.parent) || ts.isJsxSelfClosingElement(parent.parent.parent)) &&
     parent.parent.parent.tagName.getText(file) === 'DateInput';
   } else if (ts.isElementAccessExpression(parent) && parent.expression === node) {
    safe &&= ts.isStringLiteral(parent.argumentExpression) && parent.argumentExpression.text === 'aria-describedby' &&
     ts.isJsxExpression(parent.parent);
   } else safe = false;
  }
  ts.forEachChild(node, visit);
 };
 visit(file);
 return safe && declarations === 1 && forwards === 2;
}
function reviewedForwarder(item: string, hit: string, source: string): boolean {
 item = item.replaceAll(String.fromCharCode(92), "/");
 // DateTimeField's local object is closed to six known non-type keys and read-only uses.
 if (item === 'src/ui/components/huhu/date/DateTimeField.tsx' && reviewedDateTimeCommon(hit, source)) return true;
 if (!/^(?:dynamic|spread):<Input(?:\s|>)/.test(hit)) return false;
 switch (item) {
  case 'src/ui/components/huhu/date/field-parts.tsx':
   // Only InputControl's existing props/className forwarding. DateInput's public callers
   // (including aliases) are inspected, rather than trusting its broad ComponentProps type.
   const file = ts.createSourceFile('forwarder.tsx', `const input = ${hit.slice('spread:'.length)};`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
   const statement = file.statements[0];
   const node = statement && ts.isVariableStatement(statement) ? statement.declarationList.declarations[0]?.initializer : undefined;
   if (!node || !ts.isJsxSelfClosingElement(node)) return false;
   const [props, className] = node.attributes.properties;
   return node.attributes.properties.length === 2 && !!props && ts.isJsxSpreadAttribute(props) &&
    ts.isIdentifier(props.expression) && props.expression.text === 'props' &&
    !!className && ts.isJsxAttribute(className) && className.name.getText(file) === 'className' &&
    !!className.initializer && ts.isJsxExpression(className.initializer) &&
    !!className.initializer.expression && ts.isCallExpression(className.initializer.expression) &&
    className.initializer.expression.expression.getText(file) === 'cn';
  case 'src/modules/home/ui/sections/P1Controls.tsx':
   return hit.startsWith('spread:<Input {...props}') && source.includes("if (props.type === 'date')") && source.includes('<DateField');
  case 'src/modules/home/ui/skills/PromptField.tsx':
   return hit.startsWith('dynamic:') && /type=\{type\}/.test(hit) && source.includes("if (type === 'date')") && source.includes('<DateField');
  case 'src/modules/icons/ui/SuggestInput.tsx':
   // Text suggestion combobox forwards native attributes; its callers supply text/search values.
   return hit.startsWith('spread:') && hit.includes('{...props}') && hit.includes('role="combobox"');
  case 'src/modules/safe/ui/SafeDialogs.tsx':
   // SecretInput callers select password/text visibility; the default stays password.
   return hit.includes("type={props.type ?? 'password'}") && (hit.startsWith('dynamic:') || hit.includes('{...props}'));
  default: return false;
 }
}
function files(dir: string): string[] {
 return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => { const item = path.join(dir, entry.name); return entry.isDirectory() ? files(item) : [item]; });
}
test('AST guard follows native inputs and real Input import aliases', () => {
 assert.equal(calendarInputs(`import { Input as Field } from '../ui/components/input'; const x = <><input type="date"/><Field type={'datetime-local'}/></>;`, 'src/modules/control.tsx').length, 2);
 assert.equal(calendarInputs(`import { Input } from '../ui/components/input'; const x = <><Input type="time"/><TextField type="date"/><DateField/><Other type="date"/></>; const token = {type:'date'};`, 'src/modules/control.tsx').length, 0);
 for (const [filename, specifier] of [
  ['src/ui/components/huhu/InlineRename.tsx', '../input'],
  ['src/ui/components/huhu/date/field-parts.tsx', '../../input'],
  ['src/modules/control.tsx', '../ui/components/input'],
  ['src/ui/components/huhu/control.tsx', '../input.tsx'],
 ]) {
  assert.equal(calendarInputs(`import { Input as Field } from '${specifier}'; const x = <Field type="date"/>;`, filename).length, 1);
  assert.equal(calendarInputs(`import { Input as Field } from '${specifier}'; const x = <Field type={'datetime-local'}/>;`, filename).length, 1);
  assert.equal(calendarInputs(`import { Input as Field } from '${specifier}'; const x = <Field type={kind}/>;`, filename).length, 1);
  assert.equal(calendarInputs(`import { Input as Field } from '${specifier}'; const x = <Field {...props}/>;`, filename).length, 1);
  assert.equal(calendarInputs(`import { Input as Field } from '${specifier}'; const x = <><Field type="time"/><TextField type="date"/><DateField/></>; const token = {type:'date'};`, filename).length, 0);
 }
 assert.equal(calendarInputs(`import { Input as Field } from '../input'; const x = <Field type="date"/>;`, 'src/modules/control.tsx').length, 0);
 assert.equal(calendarInputs(`import { Input } from '../other/components/input'; const x = <Input type="date"/>;`, 'src/modules/control.tsx').length, 0);
 for (const tag of ['DateInput', 'Field']) {
  const binding = tag === 'DateInput' ? tag : `DateInput as ${tag}`;
  const parse = (jsx: string) => calendarInputs(`import { ${binding} } from './field-parts'; const x = ${jsx};`, 'src/ui/components/huhu/date/control.tsx');
  assert.equal(parse(`<${tag} type="date"/>`).length, 1);
  assert.equal(parse(`<${tag} type={'datetime-local'}/>`).length, 1);
  assert.equal(parse(`<${tag} type={kind}/>`).length, 1);
  assert.equal(parse(`<${tag} {...props}/>`).length, 1);
  assert.equal(parse(`<><${tag}/><${tag} type="text"/><${tag} type="time"/></>`).length, 0);
 }
 assert.equal(calendarInputs(`import { DateInput } from './other/field-parts'; const x = <DateInput type="date"/>;`, 'src/ui/components/huhu/date/control.tsx').length, 0);
 assert.equal(reviewedForwarder('src/ui/components/huhu/date/field-parts.tsx', 'spread:<Input {...props} className={cn(className)}/>', ''), true);
 assert.equal(reviewedForwarder('src/ui/components/huhu/date/field-parts.tsx', 'spread:<Input {...props} type="date"/>', ''), false);
 assert.equal(reviewedForwarder('src/ui/components/huhu/date/field-parts.tsx', 'spread:<Input {...other} className={cn(className)}/>', ''), false);
 assert.equal(reviewedForwarder('src/ui/components/huhu/date/field-parts.tsx', 'dynamic:<Input type={kind}/>', ''), false);
 assert.equal(reviewedForwarder('src/ui/components/huhu/date/field-parts.tsx', 'spread:<Input {...props} className={cn(className)} {...later}/>', ''), false);
 const dateTimeSource = fs.readFileSync('src/ui/components/huhu/date/DateTimeField.tsx', 'utf8');
 const dateTimeHits = calendarInputs(dateTimeSource, 'src/ui/components/huhu/date/DateTimeField.tsx');
 assert.equal(dateTimeHits.length, 2);
 assert.ok(dateTimeHits.every(hit => reviewedDateTimeCommon(hit, dateTimeSource)));
 assert.equal(reviewedDateTimeCommon('spread:<DateInput {...props}/>', dateTimeSource), false);
 assert.equal(reviewedDateTimeCommon('spread:<DateInput {...common} {...props}/>', dateTimeSource), false);
 assert.equal(reviewedDateTimeCommon(dateTimeHits[0]!, dateTimeSource.replace('const common = {', `const common = { type: 'date',`)), false);
 assert.equal(reviewedDateTimeCommon(dateTimeHits[0]!, dateTimeSource.replace('const common = {', 'const common = { ...props,')), false);
 assert.equal(reviewedDateTimeCommon(dateTimeHits[0]!, `${dateTimeSource}; Object.assign(common, extra);`), false);
 assert.equal(reviewedDateTimeCommon(dateTimeHits[0]!, dateTimeSource.replace('export function DateTimeField', 'export function Other')), false);
 assert.equal(calendarInputs('const x = <input type={kind}/>;').length, 1);
 assert.equal(reviewedForwarder('new.tsx', 'dynamic:<Input type={kind}/>', ''), false);
 assert.equal(reviewedForwarder('new.tsx', 'spread:<Input {...props}/>', ''), false);
 assert.equal(reviewedForwarder('src/modules/home/ui/sections/P1Controls.tsx', 'spread:<Input {...props}/>', "if (props.type === 'date') return <DateField />"), true);
 assert.equal(reviewedForwarder('src/modules/home/ui/skills/PromptField.tsx', 'dynamic:<Input type={type}/>', "if (type === 'date') return <DateField />"), true);
 assert.equal(reviewedForwarder('src/modules/home/ui/skills/PromptField.tsx', 'dynamic:<input type={type}/>', "if (type === 'date') return <DateField />"), false);
 assert.equal(reviewedForwarder('src/modules/icons/ui/SuggestInput.tsx', 'spread:<Input {...props} role="combobox"/>', ''), true);
 assert.equal(reviewedForwarder('src/modules/safe/ui/SafeDialogs.tsx', "dynamic:<Input type={props.type ?? 'password'}/>", ''), true);
 assert.equal(reviewedForwarder('src/modules/safe/ui/SafeDialogs.tsx', '<Input type="date"/>', ''), false);
 assert.equal(calendarInputs("const x = <input {...{type:'date'}}/>;").length, 1);
});
test('production excludes removed entry points and native calendar controls', () => {
 const violations: string[] = [];
 for (const item of files('src').filter(item => /\.(?:ts|tsx|css)$/.test(item) && !/\.(?:test|dom\.test)\./.test(item))) {
  const source = fs.readFileSync(item, 'utf8');
  if (/iconSettingsTarget|--nd-hit-size|@codemirror\/merge/.test(source)) violations.push(item);
  if (item.endsWith('.tsx') && item !== 'src/ui/components/input.tsx') {
   for (const hit of calendarInputs(source, item)) {
    if (reviewedForwarder(item, hit, source)) continue;
    violations.push(`${item}: ${hit}`);
   }
  }
 }
 const contract = fs.readFileSync('src/app/contracts/workbench.ts', 'utf8');
 assert.doesNotMatch(/WORKBENCH_FEATURES\s*=\s*\[([\s\S]*?)\]/.exec(contract)?.[1] ?? '', /['"]icons['"]/);
 assert.doesNotMatch(contract, /aliases\?:/);
 assert.deepEqual(violations, []);
 assert.match(fs.readFileSync('src/ui/styles/tokens.css', 'utf8'), /--nd-font-sans:var\(--hu-font-ui\)/);
 assert.match(fs.readFileSync('src/ui/styles/base.css', 'utf8'), /input\[type="time"\]/);
});
